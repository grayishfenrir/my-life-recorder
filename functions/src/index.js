require('dotenv').config();
const { onRequest } = require("firebase-functions/v2/https");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const app = require('./configs/server.js');
const { initializeApp } = require("firebase/app");
const { getAnalytics } = require("firebase/analytics");
const serviceAccount = require(process.env.KEY_PATH);
var admin = require("firebase-admin");

// The Cloud Functions for Firebase SDK to create Cloud Functions and triggers.
const { logger } = require("firebase-functions");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");

// The Firebase Admin SDK to access Firestore.
const { getFirestore } = require("firebase-admin/firestore");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const genAI = new GoogleGenerativeAI(process.env.API_KEY);

// Cloud Function으로 Express 앱 노출
exports.api = onRequest(app);