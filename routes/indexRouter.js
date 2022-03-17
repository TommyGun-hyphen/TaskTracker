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
    res.render('dashboard/index')
});

router.get('/login', ensureLoggedOut, (req,res)=>{
    let msg = req.flash('error')[0]
    res.render('login', {message:msg, layout:"layouts/guest"});
});

router.get('/register', ensureLoggedOut,(req,res)=>{
    res.render('register', {layout:"layouts/guest"});
});

router.get('/search', ensureLoggedIn, (req,res)=>{
    let keywords = req.query.q.split(" ");
    let regex = [];
    keywords.forEach(k=>{
        regex.push(new RegExp(k, "i"));
    })
    User.find({username:{"$in":regex}}).then(users=>{
        if(req.get('content-type') === "application/json"){
            
            res.json(users);
        }else{
            res.render('search', {users});
        }
    })

    
})



module.exports = router;