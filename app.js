const express = require('express');
const session = require('express-session');
const passport = require('passport');
const authRoutes = require('./routes/auth-routes');
const profileRoutes = require('./routes/profile-routes');
const passportSetup = require('./config/passport-setup');
const Poll = require('./models/poll-model');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// Use express-session middleware
app.use(session({
    secret: 'fee-secret-key',
    resave: true,
    saveUninitialized: true
}));

// Initialize Passport and restore authentication state if any
app.use(passport.initialize());
app.use(passport.session());

//connecting to db
mongoose.connect('mongodb://127.0.0.1:27017')
    .then(() => {
        console.log('connected to auth-db');
    })
    .catch((err) => {
        console.error('Error connecting to auth-db:', err.message);
    });

// set up view engine
app.set('view engine','ejs');

// setting routes
app.use('/auth',authRoutes)
app.use('/profile', profileRoutes);

// hone route
app.get('/', async (req, res) => {
    try {
        const polls = await Poll.find();
        res.render('home', { user: req.user, polls: polls });
    } catch (err) {
        console.error('Error fetching polls:', err.message);
        res.render('home', { user: req.user, polls: [] });
    }
});

app.get('/api/polls', async (req, res) => {
    try {
        const polls = await Poll.find();
        res.json(polls);
    } catch (err) {
        console.error('Error fetching polls:', err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/polls', async (req, res) => {
    try {
        const { question, options } = req.body;
        const newPoll = new Poll({
            question: question,
            options: options
        });
        const savedPoll = await newPoll.save();
        res.json(savedPoll);
    } catch (err) {
        console.error('Error saving poll to the database:', err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Add a new POST route to handle voting
app.post('/api/polls/:pollId/vote/:optionId', async (req, res) => {
    try {
        const { pollId, optionId } = req.params;
        
        // Find the poll in the database and update the vote count
        const poll = await Poll.findById(pollId);
        if (!poll) {
            return res.status(404).json({ error: 'Poll not found' });
        }

        const option = poll.options.id(optionId);
        if (!option) {
            return res.status(404).json({ error: 'Option not found' });
        }

        // Increase the vote count
        option.votes += 1;

        // Save the updated poll to the database
        const updatedPoll = await poll.save();

        res.json(updatedPoll);
    } catch (err) {
        console.error('Error updating vote count:', err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


app.listen(4000, () => {
    console.log("listening at port 4000")
})