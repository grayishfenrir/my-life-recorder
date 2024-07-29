const { getRandomQuote } = require('../utils/quotes');

exports.localsMiddleware = (req, res, next) => {
    res.locals.siteTitle = 'My Life Recorder';
    res.locals.getRandomQuote = getRandomQuote;
    next();
};
