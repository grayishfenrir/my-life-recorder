const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const cors = require('cors');

// routers
const globalRouter = require('../routers/globalRouter');

// middlewares
const { localsMiddleware } = require('../middlewares/localsMiddleware');

const app = express();

app.use(cookieParser());
app.use(cors({
    origin: 'https://my-life-recorder.web.app',
    credentials: true
}));

// set view engine
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, '..', 'views'));

// middlewares
app.use(localsMiddleware);

// static
app.use(express.static(path.join(__dirname, '..', '..', 'public')));

// routers
app.use("/", globalRouter);

module.exports = app;