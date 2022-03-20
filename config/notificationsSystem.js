// let notificationRequests = {};
const events = require('events');
const User = require('../models/User');
const mongoose = require('mongoose');
let notificationEmitter = new events.EventEmitter();

notificationEmitter.on('notification', function(data){
    if(notificationsSystem.notificationRequests[data.id]){
        let req = notificationsSystem.notificationRequests[data.id].req;
        let res = notificationsSystem.notificationRequests[data.id].res;
        User.findOne({_id:req.user.id}).then(userFound=>{
            if(!userFound) return;
            console.log(userFound.notifications)
            let notifications = userFound.notifications.filter(n=> n.isUnread == true);
            if(notifications.length > 0){
                res.json(JSON.stringify(notifications));
                userFound.notifications.map(n=>{
                    n.isUnread = false;
                    return n;
                })
                userFound.update();
                User.findOneAndUpdate({_id:mongoose.Types.ObjectId(userFound.id)}, {notifications:notifications}, {upsert:true}, (err, doc)=>{
                    if(err)console.log(err)
                    else console.log('updated')
                })
            }
            delete notificationsSystem.notificationRequests[data.id]
        })
        
    }
})
const notificationsSystem = {
    notificationRequests: {},
    notificationEmitter
};
module.exports = notificationsSystem;