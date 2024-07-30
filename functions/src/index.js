const { initializeApp } = require("firebase-admin/app");
const { onRequest } = require("firebase-functions/v2/https");
const app = require('./configs/server.js');

initializeApp();

exports.app = onRequest(app);