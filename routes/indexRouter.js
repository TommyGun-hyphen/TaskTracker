const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
mongoose.connect(process.env.mongodb);
//models
const User = require('../models/User');
// const Project = require('../models/Project');
// const Task = require('../models/Task');
//middlewares
const ensureLoggedIn = require('../config/Auth').ensureLoggedIn;
const ensureLoggedOut = require('../config/Auth').ensureLoggedOut;
router.get('/', ensureLoggedIn,(req,res)=>{
    res.render('dashboard/indextw')
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
        users = users.map(userFound=>{
            userFound.isFriend = userFound.friends.some(friend=>{
                return friend._id.toString() == req.user.id
            })
            return userFound;
        })
        if(req.get('content-type') === "application/json"){
            
            res.json(users);
        }else{
            res.render('search', {users});
        }
    })
})
//! events test
// let notificationRequests = {};
// const events = require('events');
// let notificationEmitter = new events.EventEmitter();

// notificationEmitter.on('notification', function(data){
//     if(notificationRequests[data.id]){
//         let notifications = data.req.user.notifications.filter(n=> n.isUnread == true);
//         if(notifications.length > 0){
//             res.json(JSON.stringify(notifications));
//             req.user.notifications.map(n=>{
//                 n.isUnread = false;
//                 return n;
//             })
//             data.req.user.save();
//         }
//         notificationRequests[data.req.user.id].res.json(JSON.stringify(notifications));
//         delete notificationRequests[data.id]
//     }
// })

//! end events test

const notificationsSystem = require('../config/notificationsSystem');

router.get('/notifications', ensureLoggedIn, async (req, res)=>{
    let notifications = req.user.notifications.filter(n=> n.isUnread == true);
    if(notifications.length > 0){
        res.json(JSON.stringify(notifications));
        req.user.notifications.map(n=>{
            n.isUnread = false;
            return n;
        })
        req.user.save();
    }else{
        notificationsSystem.notificationRequests[req.user.id] = {req,res};
    }
})


module.exports = router;