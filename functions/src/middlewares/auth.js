const admin = require('firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');

function getCookie(req, name) {
    const cookies = req.headers.cookie ? req.headers.cookie.split(';') : [];
    for (const cookie of cookies) {
        const [cookieName, cookieValue] = cookie.split('=');
        if (cookieName.trim() === name) {
            return decodeURIComponent(cookieValue);
        }
    }
    return null;
}

exports.loginCheckMiddleware = async (req, res, next) => {
    try {
        const sessionId = getCookie(req, 'sessionId');
        if (!sessionId) {
            return res.redirect('/')
        }

        const db = admin.firestore();
        const sessionDoc = await db.collection('sessions').doc(sessionId).get();
        if (!sessionDoc.exists) {
            return res.redirect('/')
        }

        const { _seconds: lastActiveSeconds, _nanoseconds: lastActiveNanoseconds } = sessionDoc.data().lastActive;
        const lastActiveTimestamp = new Date(lastActiveSeconds * 1000 + lastActiveNanoseconds / 1000000); // 마지막 활동 시간
        const currentTime = new Date();
        const sessionExpiration = 3600000; // 1hour

        if (currentTime - lastActiveTimestamp > sessionExpiration) {
            return res.redirect('/')
        }

        await sessionDoc.ref.update({ lastActive: FieldValue.serverTimestamp() });

        // Add information to request object
        req.userEmail = sessionDoc.data().email;
        req.userNickname = sessionDoc.data().nickname;

        return next();
    } catch (error) {
        console.error('Error verifying session:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};


exports.loginCheckAndGoMiddleware = async (req, res, next) => {
    try {
        const sessionId = getCookie(req, 'sessionId');
        if (!sessionId) {
            return next()
        }

        const db = admin.firestore();
        const sessionDoc = await db.collection('sessions').doc(sessionId).get();
        if (!sessionDoc.exists) {
            return next();
        }

        const { _seconds: lastActiveSeconds, _nanoseconds: lastActiveNanoseconds } = sessionDoc.data().lastActive;
        const lastActiveTimestamp = new Date(lastActiveSeconds * 1000 + lastActiveNanoseconds / 1000000); // 마지막 활동 시간
        const currentTime = new Date();
        const sessionExpiration = 3600000; // 1hour

        if (currentTime - lastActiveTimestamp > sessionExpiration) {
            return next();
        }

        await sessionDoc.ref.update({ lastActive: FieldValue.serverTimestamp() });

        // Add information to request object
        req.userEmail = sessionDoc.data().email;
        req.userNickname = sessionDoc.data().nickname;

        const date = new Date();
        const formattedDate = `${String(date.getDate()).padStart(2, '0')}${String(date.getMonth() + 1).padStart(2, '0')}${date.getFullYear()}`;
        return res.redirect(`/daily_recorder/${formattedDate}`)
    } catch (error) {
        console.error('Error verifying session:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};