const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const {v4:uuidv4} = require('uuid');
const bcrypt = require('bcrypt');
const fs = require('fs');
const stream = require('stream');
const path = require('path');
const passport = require('../config/configPassport');
const auth = require('../config/Auth');
//connecting to mongodb
mongoose.connect(process.env.mongodb);
//models
const User = require('../models/User');
const Project = require('../models/Project');
//file upload
const busboy = require('connect-busboy');

const notificationsSystem = require('../config/notificationsSystem');
// const { createVerify } = require('crypto');

router.post('/register', busboy(),(req, res)=>{
    //validate
    let username, email, password, password_confirm;
    let picture = {imgPath:null, savePath: null, file:null};
    req.busboy.on('field', (fieldName, val)=>{
        switch(fieldName){
            case 'username':
                username = val;
                break;
            case 'email':
                email = val;
                break;
            case 'password':
                password = val;
                break;
            case 'password_confirm':
                password_confirm = val;
                break;
        }
    });
    req.busboy.on('file', (fieldName, file, fileName)=>{
        // file.resume();
        // return;
        let imgPath = path.join('img', 'profile', uuidv4()+'.'+fileName.filename.split('.').pop());
        let savePath = path.join(__dirname,'..','public',imgPath);
        if(fieldName == 'picture' && fileName.filename){
            picture.imgPath = imgPath;
            picture.savePath = savePath;
            file.on('data', (data)=>{
                if(picture.file === null){
                    picture.file = data;
                }else{
                    picture.file = Buffer.concat([picture.file, data]);
                }
            });
        }else{
            file.resume();
        }
    })
    req.busboy.on('finish', ()=>{
        let errors = [];
        if((!username.length>6) || (!username.match(/^\w{6,}$/))){
            errors.push("username should be at least 6 characters long and should only contain non special characters");
        }
        if(!email.match(
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        )){
            errors.push("email not valid");
        }
        
        if(password.length < 6) errors.push("password should be at least 6 characters long");
        if(password != password_confirm) errors.push("passwords do not match")

        if(errors.length > 0){
            res.render('register', {username, email, password, password_confirm, errors, layout:'layouts/guest'});
            return
            //return res.redirect('/register');
        }
        //check if exists
        
        User.findOne({$or:[{username:username}, {email:email}]}).then(user =>{
            if(user){
                if(user.username == username){
                    errors.push("username already in use");
                }
                if(user.email == email){
                    errors.push("email already in use");
                }
                res.render('register', {username, email, password, password_confirm, errors, layout:'layouts/guest'});
                return;
            }else{
                if(picture.file){
                    var out = fs.createWriteStream(picture.savePath);
                    var bufferStream = new stream.PassThrough();
                    bufferStream.end(picture.file);
                    bufferStream.pipe(out);
                }
                new User({
                    username: username,
                    email: email,
                    password: bcrypt.hashSync(password, 10),
                    picture: picture.imgPath
                }).save();
                res.redirect('/login');
            }
        })
    });
    req.pipe(req.busboy);
    
})
router.post('/login', passport.authenticate('local', {
    failureRedirect:'/login',
    failureFlash:true
    }),(req,res)=>{
    res.redirect('/');
})
router.get('/logout', (req,res)=>{
    req.logout();
    res.redirect('/login');
})
router.get('/friends', auth.ensureLoggedIn, async (req,res)=>{
    
        
        User.findOne({_id:req.user.id}).populate('friends').exec((err, user)=>{
            let skip = 0;
            if(typeof req.query.page != 'undefined'){
                if(!isNaN(parseInt(req.query.page)))
                skip = (parseInt(req.query.page)-1) * 10;
            }
            let project;
            
            let regex = [];
            let mongooseQuery = User.find({_id:{$in:user.friends.map(f=>f._id)}});
            if(req.query.q){
                let keywords = req.query.q.split(" ");
                regex = [];
                keywords.forEach(k=>{
                    regex.push(new RegExp(k, "i"));
                })
                mongooseQuery.where({username:{"$in":regex}});
            }
            mongooseQuery.limit(10).skip(skip).then(async friends=>{
                if(req.get('content-type') === "application/json"){
                    if(req.query.project)
                        project = await Project.findOne({_id:new mongoose.Types.ObjectId(req.query.project)});
                    return res.json(friends.filter(f => !project.members.some(m => m.user._id.toString() == f.id)).map(f=>{
                        let newF = {};
                        newF.username = f.username;
                        newF.email = f.email;
                        newF.picture = f.picture;
                        newF.id = f.id;
                        if (project)
                            newF.isInvited = project.userInvites.some(invite=>invite.user.toString() == f._id.toString());
                        return newF;
                    }));
                    
                }
                res.render('user/friends', {friends});

            })
        })
    //building the view
});
router.get('/:id', auth.ensureLoggedIn, (req,res)=>{
    try{
        User.findOne({_id:new mongoose.Types.ObjectId(req.params.id)}).then(userFound=>{
            if(userFound){
                let blockedBy = userFound.blocked.some(blocked=>{
                    return blocked._id.toString() == req.user.id
                });
                if(blockedBy)
                    res.status(401).render('user/showBlocked', {userFound});
                else{
                    userFound.isBlocked = req.user.blocked.some(blocked=>{
                        return blocked._id.toString() == userFound.id;
                    })
                    userFound.isFriend = userFound.friends.some(friend=>{
                        return friend._id.toString() == req.user.id
                    })
                    userFound.isRequested = userFound.requests.some(request=>{
                        return request._id.toString() == req.user.id
                    })
                    userFound.requestedBy = req.user.requests.some(request=>{
                        return request._id.toString() == userFound.id;
                    })
                    res.render('user/show', {userFound});
                }
                    
            }
            else res.status(404).render('404');
        });
    }catch{
        res.status(404).render('404');
    }
})
router.post('/:id/block', auth.ensureLoggedIn, (req,res)=>{
    try{
        User.findOne({_id:new mongoose.Types.ObjectId(req.params.id)}).then(userFound=>{
            if(userFound){
                if( userFound.id == req.user.id){
                    res.sendStatus(400);
                }else{
                    req.user.blocked.push(userFound.id);
                    req.user.save();
                    res.redirect(req.header('referer') || '/');
                }
            }
            else res.status(404).render('404');
        });
    }catch{
        res.status(404).render('404');
    }
})
router.post('/:id/unblock', (req,res)=>{
    try{
        User.findOne({_id:new mongoose.Types.ObjectId(req.params.id)}).then(userFound=>{
            if(userFound){
                req.user.blocked = req.user.blocked.filter(blocked=>{
                    return blocked.id == userFound.id;
                });
                // remove friendship
                req.user.friends = req.user.friends.filter(friend=>{
                    friend._id.toString() != userFound.id;
                });
                userFound.friends = userFound.friends.filter(friend=>{
                    friend._id.toString() != req.user.id;
                });

                req.user.save();
                        
                userFound.save();
                res.redirect(req.header('referer') || '/');
            }
            else res.status(404).render('404');
        });
    }catch{
        res.status(404).render('404');
    }
})
router.post('/:id/friend', auth.ensureLoggedIn, (req,res)=>{
    User.findOne({_id:mongoose.Types.ObjectId(req.params.id)}).then(userFound=>{
        if(userFound){
            let blockedBy = userFound.blocked.some(blocked=>{
                return blocked._id.toString() == req.user.id
            })
            let isFriend = userFound.friends.some(friend=>{
                return friend._id.toString() == req.user.id
            })
            let isRequested = userFound.requests.some(request=>{
                return request._id.toString() == req.user.id
            })
            let requestedBy = req.user.requests.some(request=>{
                return request._id.toString() == userFound.id
            })
            if(blockedBy)
                res.sendStatus(401);
            // else if (isFriend)
            //     res.redirect(req.header('referer') || '/');
            else{
                //test if method == DELETE or post
                if(req.body._method == "DELETE"){
                    
                    if(isRequested){
                        //* DELETE request
                        userFound.requests = userFound.requests.filter(request=>request._id.toString() != req.user.id);
                        userFound.notifications = userFound.notifications.filter(notification=>{
                            return (notification.sender_id != req.user.is && notification.object_type != "friend_request")
                        })
                        userFound.save();
                    }else if(isFriend){
                        //* DELETE friend
                        req.user.friends = req.user.friends.filter(friend=>{
                            friend._id.toString() != userFound.id;
                        });
                        userFound.friends = userFound.friends.filter(friend=>{
                            friend._id.toString() != req.user.id;
                        });
                        req.user.save();
                        
                        userFound.save();
                        
                    }
                }else if(req.body._method == "PUT" && requestedBy){
                    //* accept request
                    req.user.friends.push({_id:userFound.id, friendship_date:Date.now()});
                    userFound.friends.push({_id:req.user.id, friendship_date:Date.now()});
                    req.user.requests = req.user.requests.filter(request=>{
                        request._id.toString() != userFound.id;
                    });
                    req.user.save();
                    userFound.notifications.push({
                        sender_id: mongoose.Types.ObjectId(req.user.id),
                        sender_username: req.user.username,
                        sender_picture: req.user.picture,
                        date: Date.now(),
                        object_type: 'friend_request',
                        activity_type: 'accepted',
                        object_id: null,
                        url: '/user/'.concat(req.user.id),
                        isUnread:true
                    });
                    userFound.save().then(()=>{
                        notificationsSystem.notificationEmitter.emit('notification', {id:userFound.id})
                    });
                    
                }else{
                    userFound.requests.push(req.user.id);
                    userFound.notifications.push({
                        sender_id: mongoose.Types.ObjectId(req.user.id),
                        sender_username: req.user.username,
                        sender_picture: req.user.picture,
                        date: Date.now(),
                        object_type: 'friend_request',
                        activity_type: 'sent',
                        object_id: null,
                        url: '/user/'.concat(req.user.id),
                        isUnread:true
                    });
                    userFound.save().then(()=>{
                        notificationsSystem.notificationEmitter.emit('notification', {id:userFound.id});
                    });
                
                }
                    

                
                res.redirect(req.header('referer') || '/');
            }
            
        }else{
            res.sendStatus(404);
        }
    })
    
})



module.exports = router;