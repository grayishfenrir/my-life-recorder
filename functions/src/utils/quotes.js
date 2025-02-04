const quotes = [
    "Believe you can and you're halfway there.",
    "The future belongs to those who believe in the beauty of their dreams.",
    "Every day is a new opportunity to change your life.",
    "Don't be afraid to be yourself.",
    "You are capable of amazing things.",
    "Keep going.  You're almost there!",
    "Never give up on your dreams.",
    "You are stronger than you think.",
    "The best is yet to come.",
    "Be the change you wish to see in the world.",
    "The journey of a thousand miles begins with one step.",
    "Write it on your heart that every day is the best day in the year.",
    "Life is what happens to us while we are making other plans.",
    "You only live once, but if you do it right, once is enough.",
    "The purpose of our lives is to be happy.",
    "Life is a collection of moments; capture them all.",
    "Your life is a story; make it a bestseller.",
    "Every day is a page in your autobiography.",
    "Memories fade, but written words last forever.",
    "Record today, treasure tomorrow.",
    "Life moves fast; don't forget to press pause and reflect.",
    "Your journal is the book of your life; write it well.",
    "Capture the small moments; they become the big memories.",
    "Today's entry is tomorrow's nostalgia.",
    "Write your own history, one day at a time.",
    "In the story of your life, you are both the author and the main character.",
    "Life is a journey; document every step.",
    "Your experiences are unique; preserve them.",
    "The pen is mightier than memory.",
    "Record your life, inspire others.",
    "Every day is a new chapter; what will you write?",
    "Your life recorder is your time machine to the past.",
    "Cherish yesterday, live today, record for tomorrow.",
    "Your words today are memories for your future self.",
    "Life is fleeting; your records are permanent.",
    "Write it down, make it real.",
    "Your journal is your legacy.",
    "Capture the moment, it only happens once.",
    "Today's entry is a gift to your future self.",
    "Life is art; your journal is the canvas.",
    "Record the ordinary; it becomes extraordinary in retrospect.",
    "Your life story is worth recording.",
    "Write your life, read your growth.",
    "Each entry is a stepping stone in your life's path.",
    "Your recorder is your confidant, your time capsule, your legacy.",
];

const getRandomQuote = () => {
    const randomIndex = Math.floor(Math.random() * quotes.length);
    return quotes[randomIndex];
};

module.exports = { getRandomQuote };