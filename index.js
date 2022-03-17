const express = require('express');
const session = require('express-session');
const app = express();
const passport = require('./config/configPassport');
require('dotenv').config();
const User = require('./models/User');
const flash = require('connect-flash');
const mongoStore = require('connect-mongo');
//public folder
app.use(express.static('public'));
//body parser
app.use(require('body-parser').urlencoded({extended:false}));
//ejs
app.set('view engine', 'ejs');
//ejs layouts
app.use(require('express-ejs-layouts'));
app.set('layout', 'layouts/layout')
//session
app.use(session({
    secret: process.env.sessionSecret,
    resave: false,
    saveUninitialized: true,
    cookie:{maxAge:60*60*1000}, //1hour
    store: mongoStore.create({mongoUrl:process.env.mongodb})
}))

//flash
app.use(flash())
//passport
app.use(passport.initialize());
app.use(passport.session());
//port
const port = process.env.port || 3000;
//locals

app.use((req,res,next)=>{
    res.locals.isAuthenticated = req.isAuthenticated;
    if(req.user) res.locals.user = req.user;
    next();
});
//routers
app.use(require('./routes/indexRouter'));
app.use('/user', require('./routes/userRouter'));
app.use('/project', require('./routes/projectRouter'));




app.listen(port, ()=>{
    console.log('listening to port ' + port);
})