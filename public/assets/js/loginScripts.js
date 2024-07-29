import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js';
import { getAuth, signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js';

const firebaseConfig = {
    apiKey: "AIzaSyB2MbmkrVUzHAB1xxEZubZ79XsvxcLglEs",
    authDomain: "my-life-recorder.firebaseapp.com",
    projectId: "my-life-recorder",
    storageBucket: "my-life-recorder.appspot.com",
    messagingSenderId: "888265691116",
    appId: "1:888265691116:web:329a199ec2410670223ac9",
    measurementId: "G-VYT9RVR6N4"
};

const app = initializeApp(firebaseConfig);

// Get a reference to the auth service
const auth = getAuth(); // Firebase Authentication 가져오기

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                const idToken = await user.getIdToken();

                const response = await fetch('/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ idToken })
                });

                const data = await response.json();
                if (data.success) {
                    const date = new Date();
                    const formattedDate = `${String(date.getDate()).padStart(2, '0')}${String(date.getMonth() + 1).padStart(2, '0')}${date.getFullYear()}`;
                    window.location.href = `/daily_recorder/${formattedDate}`;
                } else {
                    alert('로그인 실패');
                }
            } catch (error) {
                console.error('로그인 오류:', error);
                alert('로그인 중 오류가 발생했습니다. 다시 시도해주세요.');
            }
        });
    }
});

// for signup
document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.querySelector('.signup-form');

    if (signupForm) {
        signupForm.addEventListener('submit', (event) => {
            const passwordInput = document.getElementById('password');
            const confirmPasswordInput = document.getElementById('confirm-password');
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            // 유효성 검사
            const passwordPattern = /^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#$%^&()_+\-=\[\]{};':"\\|,.<>/?]).{6,}$/;

            if (!passwordPattern.test(password)) {
                alert('Password must be at least 6 characters long and include letters, numbers, and special characters.');
                event.preventDefault();
            }

            if (password !== confirmPassword) {
                alert('Passwords do not match.');
                event.preventDefault();
            }
        });
    }
});


