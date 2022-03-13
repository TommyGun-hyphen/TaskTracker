const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
mongoose.connect(process.env.mongodb);
//models
const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
//middlewares
const ensureLoggedIn = require('../config/Auth').ensureLoggedIn;
const ensureLoggedOut = require('../config/Auth').ensureLoggedOut;
router.get('/', ensureLoggedIn,(req,res)=>{
    res.render('dashboard/index', {user:req.user, layout:'layouts/admin'})
});

router.get('/login', ensureLoggedOut, (req,res)=>{
    let msg = req.flash('error')[0]
    res.render('login', {message:msg});
});
router.get('/logout', (req,res)=>{
    req.logout();
    res.redirect('/login');
})
router.get('/register', ensureLoggedOut,(req,res)=>{
    res.render('register');
});



module.exports = router;