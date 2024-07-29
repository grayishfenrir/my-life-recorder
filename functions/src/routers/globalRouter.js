const express = require('express');
const { loginCheckMiddleware, loginCheckAndGoMiddleware } = require('../middlewares/auth');
const { home, signup, renderSignup, renderLogin, login, logout, renderRecorder, sendMessage, saveDiary, renderHistories, renderAutobiography, createAutobiography } = require('../controllers/globalController');

const globalRouter = express.Router();

// without session
globalRouter.get('/', loginCheckAndGoMiddleware, home);
globalRouter.route('/signup').all(loginCheckAndGoMiddleware).get(renderSignup).post(signup);
globalRouter.route('/login').all(loginCheckAndGoMiddleware).get(renderLogin).post(login);
globalRouter.post('/logout', logout);

// in session
globalRouter.get('/daily_recorder/:date(\\d{8})', loginCheckMiddleware, renderRecorder);
globalRouter.post('/send_message', loginCheckMiddleware, sendMessage);
globalRouter.post('/save_diary', loginCheckMiddleware, saveDiary);
globalRouter.post('/create_autobiography', loginCheckMiddleware, createAutobiography);
globalRouter.get('/histories', loginCheckMiddleware, renderHistories);
globalRouter.get('/my_autobiography', loginCheckMiddleware, renderAutobiography);


module.exports = globalRouter;
