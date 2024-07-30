const admin = require('firebase-admin');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { FieldValue, FieldPath } = require('firebase-admin/firestore');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const {
    log,
    info,
    debug,
    warn,
    error,
    write,
} = require("firebase-functions/logger");

exports.home = async (req, res) => {
    return res.render('home', {
        pageTitle: 'Home',
        siteTitle: 'My Diary App'
    });
};

exports.renderSignup = async (req, res) => {
    return res.render("signup", { pageTitle: "Sign Up" });
};

exports.signup = async (req, res) => {
    const { email, nickname, password, 'confirm-password': confirmPassword } = req.body;

    // Regular expression for password validation
    const passwordPattern = /^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#$%^&()_+\-=\[\]{};':"\\|,.<>/?]).{6,}$/;

    try {
        // Check if passwords match
        if (password !== confirmPassword) {
            return res.status(400).send('Password and confirm password do not match.');
        }

        // Validate password format
        if (!passwordPattern.test(password)) {
            return res.status(400).send('Password must be at least 6 characters long and include letters, numbers, and special characters.');
        }

        // Create user in Firebase Auth
        const userRecord = await admin.auth().createUser({
            email,
            password,
            displayName: nickname,
        });

        // Save user info in Firestore
        const db = admin.firestore();
        await db.collection('users').doc(userRecord.uid).set({
            email,
            nickname,
        });

        // Redirect to home page
        res.redirect('/');
    } catch (e) {
        error('Error signing up:', e);
        res.status(500).send('Error signing up. Please try again later.');
    }
};


exports.renderLogin = async (req, res) => {
    return res.render("login", { pageTitle: "Log In" });
};

exports.login = async (req, res) => {
    const { idToken } = req.body;

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userId = decodedToken.uid;

        const db = admin.firestore();
        const user = await db.collection('users').doc(userId).get();
        if (!user.exists) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const { email, nickname } = user.data();

        const sessionId = generateRandomString();

        await db.collection('sessions').doc(sessionId).set({
            userId,
            email,
            nickname,
            createdAt: FieldValue.serverTimestamp(),
            lastActive: FieldValue.serverTimestamp()
        });

        // 세션 ID를 포함하는 쿠키 반환
        res.cookie('__session', sessionId, {
            httpOnly: true,
            secure: true,
            sameSite: 'None',
        });
        return res.json({ success: true });
    } catch (e) {
        error('Error verifying ID token:', e);
        return res.status(401).json({ success: false, message: 'Invalid ID token' });
    }
};

function generateRandomString(length = 32) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

exports.logout = async (req, res) => {
    const sessionId = req.cookies.sessionId;

    if (sessionId) {
        try {
            const db = admin.firestore();
            await db.collection('sessions').doc(sessionId).delete();
        } catch (e) {
            error('Error deleting session:', e);
        }
    }

    res.clearCookie('sessionId');

    res.redirect('/');
};

exports.renderRecorder = async (req, res) => {
    const datePattern = /^[0-3][0-9][0-1][0-9]\d{4}$/;
    const { date } = req.params;

    if (!datePattern.test(date)) {
        return res.status(400).send('Invalid date format. Use DDMMYYYY.');
    }

    try {
        const db = admin.firestore();

        const email = req.userEmail;
        const nickname = req.userNickname;
        const currentDate = new Date();
        const dateString = `${String(currentDate.getDate()).padStart(2, '0')}${String(currentDate.getMonth() + 1).padStart(2, '0')}${currentDate.getFullYear()}`;
        const documentId = crypto.createHash('sha256').update(`${dateString}_${email}_${nickname}`).digest('hex');

        const userRecordsDoc = db.collection('daily_records').doc(documentId);
        const userRecordsSnapshot = await userRecordsDoc.get();
        let conversations = [];
        if (userRecordsSnapshot.exists) {
            conversations = userRecordsSnapshot.data().conversations || [];
        } else {
            const BASIC_PROMPT_KEY = 'BASIC_PROMPT'
            const basicPromptDoc = db.collection('daily_records').doc(BASIC_PROMPT_KEY);
            const basicPromptDocSnapshot = await basicPromptDoc.get();

            conversations.push({
                message: basicPromptDocSnapshot.data().conversations[0].message,
                response: basicPromptDocSnapshot.data().conversations[0].response
            });

            await db.collection('daily_records').doc(documentId).set({
                email: email,
                nickname: nickname,
                chatCount: 0,
                conversations: conversations
            }, { merge: true });
        }

        delete conversations[0].message;

        return res.render("dailyRecorder", {
            pageTitle: "Daily Recorder",
            conversations: JSON.stringify(conversations)
        });
    } catch (e) {
        error('Error accessing protected route:', e);
        res.status(500).send('Error accessing page. Please try again later.');
    }
};

const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

exports.sendMessage = async (req, res) => {
    const { message } = req.body;

    const maxWords = 20;

    const words = message.split(' ');
    if (words.length > maxWords) {
        return res.status(400).send('질문이 너무 깁니다. 20단어 이내로 줄여주세요.');
    }

    const email = req.userEmail;
    const nickname = req.userNickname;

    try {
        const currentDate = new Date();
        const dateString = `${String(currentDate.getDate()).padStart(2, '0')}${String(currentDate.getMonth() + 1).padStart(2, '0')}${currentDate.getFullYear()}`;

        const documentId = crypto.createHash('sha256').update(`${dateString}_${email}_${nickname}`).digest('hex');

        const db = admin.firestore();
        const dailyRecordDoc = db.collection('daily_records').doc(dateString);
        const dailyRecordSnapshot = await dailyRecordDoc.get();
        // TODO: Solve the timing issue.
        let dailyCount = 0;
        if (dailyRecordSnapshot.exists) {
            dailyCount = dailyRecordSnapshot.data().chatCount || 0;
        }

        // TODO: make length limitation.

        if (dailyCount >= 50) {
            // TODO: show message to user.
            return res.status(403).send('Chat limit reached for today');
        }

        await db.collection('daily_records').doc(dateString).set({
            chatCount: dailyCount + 1,
        }, { merge: true });


        const userRecordsDoc = db.collection('daily_records').doc(documentId);
        const userRecordsSnapshot = await userRecordsDoc.get();

        let chatCount = 0;
        let conversations = [];

        if (userRecordsSnapshot.exists) {
            chatCount = userRecordsSnapshot.data().chatCount || 0;
            conversations = userRecordsSnapshot.data().conversations || [];
        }

        if (chatCount >= 50) {
            // TODO: show message to user.
            return res.status(403).send('Chat limit reached for today');
        }

        const newPrompt = `These are our conversation histories.\n${conversations.map(conversation => {
            return (conversation.message ? 'message: ' + conversation.message + '\n' : '') +
                (conversation.response ? 'response: ' + conversation.response + '\n' : '');
        }).join('\n')}\nAnd here is my new question.\nmessage: ${message}`;

        const result = await model.generateContent(newPrompt);
        const geminiReply = await result.response;
        const text = await geminiReply.text();

        conversations.push({
            message: message,
            response: text
        });

        await db.collection('daily_records').doc(documentId).set({
            email: email,
            nickname: nickname,
            chatCount: chatCount + 1,
            conversations: conversations
        }, { merge: true });

        res.status(200).json({ success: true, response: text });
    } catch (e) {
        error('Error processing message:', e);
        res.status(500).send('Error processing message.');
    }
};

exports.saveDiary = async (req, res) => {
    try {
        const db = admin.firestore();

        const email = req.userEmail;
        const nickname = req.userNickname;
        const currentDate = new Date();
        const dateString = `${String(currentDate.getDate()).padStart(2, '0')}${String(currentDate.getMonth() + 1).padStart(2, '0')}${currentDate.getFullYear()}`;
        const documentId = crypto.createHash('sha256').update(`${dateString}_${email}_${nickname}`).digest('hex');

        const key = `${email}_${dateString}`
        const docRef = db.collection('daily_record_history').doc(key);

        const doc = await docRef.get();

        // TODO: ask override existing diary

        const userRecordsDoc = db.collection('daily_records').doc(documentId);
        const userRecordsSnapshot = await userRecordsDoc.get();

        let savedCount = 0;
        let conversations = [];

        if (userRecordsSnapshot.exists) {
            savedCount = userRecordsSnapshot.data().savedCount || 0;
            conversations = userRecordsSnapshot.data().conversations || [];
        }

        if (savedCount >= 50) {
            // TODO: show message to user.
            return res.status(403).send('Save limit reached for today');
        }

        const message = '일기부분만 적어줘. 시작과 끝부분에 따옴표는 빼줘. 일기 내용이 잘 전달되었는지 등 추가적인 물음은 빼줘. 단지 일기 부분만 전달해줘.'

        const newPrompt = `These are our conversation histories.\n${conversations.map(conversation => {
            return (conversation.message ? 'message: ' + conversation.message + '\n' : '') +
                (conversation.response ? 'response: ' + conversation.response + '\n' : '');
        }).join('\n')}\nAnd here is my new question.\nmessage: ${message}`;

        const result = await model.generateContent(newPrompt);

        const geminiReply = await result.response;
        const text = await geminiReply.text();

        await db.collection('daily_record_history').doc(key).set({
            diary: text
        }, { merge: true });

        await db.collection('daily_records').doc(documentId).update({
            savedCount: savedCount + 1
        });

        res.status(200).json({ message: 'Diary saved successfully' });
    } catch (e) {
        error('Error saving diary:', e);
        res.status(500).json({ error: 'Failed to save diary' });
    }
};

exports.renderHistories = async (req, res) => {
    const email = req.userEmail;

    try {
        const db = admin.firestore();
        const startKey = `${email}_`;
        const endKey = startKey + '\uf8ff';

        const snapshot = await db.collection('daily_record_history')
            .where(FieldPath.documentId(), '>=', startKey)
            .where(FieldPath.documentId(), '<', endKey)
            .get();

        if (snapshot.empty) {
            return res.render('histories', {
                pageTitle: 'History',
                records: []
            });
        }

        const records = snapshot.docs.map(doc => ({
            date: doc.id.split('_')[1],
            diary: doc.data().diary || ''
        }));

        res.render('histories', {
            pageTitle: 'History',
            records: records
        });
    } catch (e) {
        error('Error fetching history:', e);
        res.status(500).send('Failed to fetch history');
    }
};


exports.renderAutobiography = async (req, res) => {
    const email = req.userEmail; // 사용자 이메일 가져오기

    try {
        const db = admin.firestore();
        const snapshot = await db.collection('autobiographies')
            .where(FieldPath.documentId(), '==', email)
            .get();

        if (snapshot.empty) {
            return res.render('myAutobiography', {
                pageTitle: 'My Autobiography',
                introduction: '',
                earlyLife: '',
                formativeExperiences: '',
                education: '',
                career: '',
                challenges: '',
                relationships: '',
                majorEvents: '',
                reflections: '',
                aspirations: '',
                conclusion: ''
            });
        }

        const doc = snapshot.docs[0].data();
        const autography = {
            introduction: doc.introduction || '',
            earlyLife: doc.earlyLife || '',
            formativeExperiences: doc.formativeExperiences || '',
            education: doc.education || '',
            career: doc.career || '',
            challenges: doc.challenges || '',
            relationships: doc.relationships || '',
            majorEvents: doc.majorEvents || '',
            reflections: doc.reflections || '',
            aspirations: doc.aspirations || '',
            conclusion: doc.conclusion || ''
        };

        res.render('myAutobiography', {
            pageTitle: 'My Autobiography',
            ...autography
        });
    } catch (e) {
        error('Error fetching autobiography:', e);
        res.status(500).send('Failed to fetch autobiography');
    }
};

exports.createAutobiography = async (req, res) => {
    try {
        const db = admin.firestore();

        const email = req.userEmail;
        const startKey = `${email}_`;
        const endKey = startKey + '\uf8ff';

        const dailyRecordsSnapshot = await db.collection('daily_record_history')
            .where(FieldPath.documentId(), '>=', startKey)
            .where(FieldPath.documentId(), '<', endKey)
            .get();

        const myHistories = dailyRecordsSnapshot.docs.map(doc => ({
            date: doc.id.split('_')[1],
            diary: doc.data().diary || ''
        }));

        const myHistoriesString = myHistories.map(entry => `**${entry.date}**: "${entry.diary}"`).join('\n');

        let autobiographiesSnapshot = await db.collection('autobiographies').doc(email).get();

        if (!autobiographiesSnapshot.exists) {
            await db.collection('autobiographies').doc(email).set({}, { merge: true });
            autobiographiesSnapshot = await db.collection('autobiographies').doc(email).get();
        }


        let savedCount = 0;
        savedCount = autobiographiesSnapshot.data().savedCount || 0;

        if (savedCount >= 5) {
            return res.status(200).json({ message: 'Save limit reached. Just to go History page.' });
        }

        let isDoing = false;
        isDoing = autobiographiesSnapshot.data().isDoing || false;

        if (isDoing) {
            return res.status(200).json({ message: 'Prev excution is doing.' });
        }

        await db.collection('autobiographies').doc(email).update({
            isDoing: true
        });

        const sections = ['introduction', 'earlyLife', 'formativeExperiences', 'education', 'career', 'challenges', 'relationships', 'majorEvents', 'reflections', 'aspirations', 'conclusion'];

        for (const section of sections) {
            if (!autobiographiesSnapshot.data()[section]) {
                let promptFunction;
                switch (section) {
                    case 'introduction':
                        promptFunction = generatePrompts.generateIntroduction;
                        break;
                    case 'earlyLife':
                        promptFunction = generatePrompts.generateEarlyLife;
                        break;
                    case 'formativeExperiences':
                        promptFunction = generatePrompts.generateFormativeExperiences;
                        break;
                    case 'education':
                        promptFunction = generatePrompts.generateEducation;
                        break;
                    case 'career':
                        promptFunction = generatePrompts.generateCareer;
                        break;
                    case 'challenges':
                        promptFunction = generatePrompts.generateChallenges;
                        break;
                    case 'relationships':
                        promptFunction = generatePrompts.generateRelationships;
                        break;
                    case 'majorEvents':
                        promptFunction = generatePrompts.generateMajorEvents;
                        break;
                    case 'reflections':
                        promptFunction = generatePrompts.generateReflections;
                        break;
                    case 'aspirations':
                        promptFunction = generatePrompts.generateAspirations;
                        break;
                    case 'conclusion':
                        promptFunction = generatePrompts.generateConclusion;
                        break;
                }

                const prompt = promptFunction(myHistoriesString);
                const result = await model.generateContent(prompt);
                const reply = await result.response;
                const text = await reply.text();

                await db.collection('autobiographies').doc(email).update({
                    [section]: text
                });
            }
        }

        await db.collection('autobiographies').doc(email).update({
            savedCount: savedCount + 1,
            isDoing: false
        });

        res.status(200).json({ message: 'Autobiography created successfully' });
    } catch (e) {
        error('Error creating autobiography:', e);
        res.status(500).json({ error: 'Failed to create autobiography' });
    }
};

const generatePrompts = {
    generateIntroduction: (entriesString) => {
        return `
        ### Introduction

        Based on the following diary entries from my daily records, please generate an engaging and comprehensive introduction for my autobiography. The introduction should provide a brief overview of who I am, my background, and any significant experiences or themes that emerge from the diary entries. Feel free to creatively enhance the content if needed to provide a compelling narrative.

        Diary Entries:
        ${entriesString}

        Please ensure that the introduction sets the stage for the rest of the autobiography and captures the essence of my experiences and reflections shared in the diary entries.

        그리고 한국어로 적어줘
        `;
    },
    generateEarlyLife: (entriesString) => {
        return `
        ### Early Life

        Based on the following diary entries, please create a section on my early life. Describe my upbringing, family background, and significant events from my early years. Highlight any formative experiences or influences that shaped my early life.

        Diary Entries:
        ${entriesString}

        Please ensure that this section captures the essence of my early life and sets the context for my subsequent experiences.

        그리고 한국어로 적어줘
        `;
    },
    generateFormativeExperiences: (entriesString) => {
        return `
        ### Formative Experiences

        Using the diary entries below, write about significant formative experiences in my life. Include any key events or influences that helped shape who I am today.

        Diary Entries:
        ${entriesString}

        Please ensure that this section highlights the key formative experiences that have had a profound impact on my life.

        그리고 한국어로 적어줘
        `;
    },
    generateEducation: (entriesString) => {
        return `
        ### Education

        Based on the following diary entries, create a section on my educational background. Detail my academic experiences, achievements, and any notable events related to my education.

        Diary Entries:
        ${entriesString}

        Please ensure that this section provides a comprehensive view of my educational journey and its impact on my life.

        그리고 한국어로 적어줘
        `;
    },
    generateCareer: (entriesString) => {
        return `
        ### Career

        Using the diary entries below, create a section on my career. Include key milestones, achievements, and challenges faced throughout my professional journey.

        Diary Entries:
        ${entriesString}

        Please ensure that this section reflects the significant aspects of my career and its evolution.

        그리고 한국어로 적어줘
        `;
    },
    generateChallenges: (entriesString) => {
        return `
        ### Challenges

        Based on the following diary entries, write about significant challenges I have faced. Describe the difficulties and obstacles, and how they have impacted my life.

        Diary Entries:
        ${entriesString}

        Please ensure that this section outlines the major challenges and their effects on my personal growth.

        그리고 한국어로 적어줘
        `;
    },
    generateRelationships: (entriesString) => {
        return `
        ### Relationships

        Using the diary entries below, create a section about important relationships in my life. Include details about family, friends, and other significant relationships.

        Diary Entries:
        ${entriesString}

        Please ensure that this section provides insight into the key relationships that have influenced my life.

        그리고 한국어로 적어줘
        `;
    },
    generateMajorEvents: (entriesString) => {
        return `
        ### Major Events

        Based on the following diary entries, write about major events and milestones in my life. Focus on significant achievements, challenges, and turning points.

        Diary Entries:
        ${entriesString}

        Please ensure that this section highlights the major events and their impact on my life story.

        그리고 한국어로 적어줘
        `;
    },
    generateReflections: (entriesString) => {
        return `
        ### Reflections

        Using the diary entries below, create a section reflecting on key insights and personal growth. Discuss what I have learned and how these reflections have shaped my life.

        Diary Entries:
        ${entriesString}

        Please ensure that this section captures my reflections and personal growth throughout my life.

        그리고 한국어로 적어줘
        `;
    },
    generateAspirations: (entriesString) => {
        return `
        ### Aspirations

        Based on the following diary entries, write about my future aspirations and goals. Include any dreams, ambitions, and what I hope to achieve in the future.

        Diary Entries:
        ${entriesString}

        Please ensure that this section outlines my future aspirations and the goals I am striving to achieve.

        그리고 한국어로 적어줘
        `;
    },
    generateConclusion: (entriesString) => {
        return `
        ### Conclusion

        Using the diary entries below, generate a conclusion for my autobiography. Summarize the key themes and insights from my life experiences, and provide a reflective closing that encapsulates my journey.

        Diary Entries:
        ${entriesString}

        Please ensure that this section provides a thoughtful conclusion that ties together the themes of my autobiography.

        그리고 한국어로 적어줘
        `;
    }
};
