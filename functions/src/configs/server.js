const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');

// routers
const globalRouter = require('../routers/globalRouter');

// middlewares
const { localsMiddleware } = require('../middlewares/localsMiddleware');

const app = express();

app.use(cookieParser())

// set view engine
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, '..', 'views'));

// middlewares
app.use(localsMiddleware);

// public 폴더를 정적 파일 서버로 사용
app.use(express.static(path.join(__dirname, '..', '..', 'public')));

// routers
app.use("/", globalRouter);

module.exports = app;