const express = require('express')
const app = express()
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken');
const session = require("express-session");
const path = require('path');
const port = 3000
require('dotenv').config();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

//Connecting with mongodb
mongoose.connect(process.env.MONGODB,)
.then(() => {
    console.log("Database connected");
});

//Creating mongoose schema
const Schema = mongoose.Schema;
const userDataSchema = new Schema({
    name: String,
    instaId: String,
    date: { type: Date, default: Date.now() },
    selected: { type: Boolean, default: false }
});
const UserData = mongoose.model('UserData', userDataSchema);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: 'mysitesessionsecret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 86400000 }
}))

//Authentication middleware
const checkAuth = async (req, res, next) => {
    if (req.session.jwt) {
        await jwt.verify(req.session.jwt, 'secret-key', (err, decoded) => {
            if (err) {
                req.session = null;
                return res.redirect('/login');
            }
            req.user = decoded;
            next();
        });
    } else {
        res.redirect('/login');
    }
};

//Rendering user page
app.get('/', async (req, res) => {
    try {
        const totalDatas = await UserData.find();
        const winnerData = await UserData.findOne({ selected: true });
        const totalUsers = totalDatas.length;
        res.render('index', {
            winnerData: winnerData,
            totalUsers: totalUsers ?? 0
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
})

//Recieving user data
app.post('/submit', async (req, res) => {
    try {
        const { name, id } = req.body;
        const existId = await UserData.findOne({ instaId: id.trim() })
        if (existId) {
            res.json({ success: false, message: 'It seems like this id already registered in giveaway with the provided information!.' });
        } else {
            const userData = new UserData({
                name: name,
                instaId: id,
            });
            const savedData = await userData.save()
            if (savedData) {
                res.json({ success: true, message: 'Details saved' })
            }
        }
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Internal server error', message: '🛠️ Server Connection Problem 🚧, check your internet connection!.' });
    }
});

app.get('/admin', checkAuth, async (req, res) => {
    try {
        const totalDatas = await UserData.find();
        const userDatas = await UserData.find().sort({ date: -1 }).limit(10);
        const totalUsers = totalDatas.length;
        const winnerData = await UserData.findOne({ selected: true });
        res.render('admin', { totalUsers: totalUsers, userDatas: userDatas, winnerData: winnerData })
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
})

app.get('/login', (req, res) => {
    res.render('login')
})

app.post('/login', (req, res) => {
    try {
        const { name, password } = req.body
        if (name == 'alpha' && password == 'alpha@123') {
            const token = jwt.sign({ name }, 'secret-key', { expiresIn: '7d' });

            req.session.jwt = token;
            res.json({ success: true })
        } else {
            res.json({ message: 'Invalid username or password', success: false })
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
})

app.get('/findUser', async (req, res) => {
    try {
        const randomNumber = Math.floor(Math.random() * 10) + 1;
        await UserData.updateMany({}, { $set: { selected: false } })
        const user = await UserData.findOne().skip(randomNumber - 1);
        if (user) {
            await UserData.updateOne({ _id: user._id }, { $set: { selected: true } })
            res.json(user);
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


app.listen(port, () => {
    console.log('server running');
})