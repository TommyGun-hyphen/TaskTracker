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

router.post('/register', busboy(),(req, res)=>{
    //validate
    //console.log(req.body);
    //let {username, email, password, password_confirm} = req.body;
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
            // file.on('end', ()=>{
            //     console.log('got file');
            // });
            //!
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
            //return res.redirect('/register');
        }
        //check if exists
        User.findOne({email:email}).then(user=>{
            if(user){
                errors.push("email already in use")
                res.render('register', {username, email, password, password_confirm, errors, layout:'layouts/guest'});
            }else{
                User.findOne({$or:[{username:username}, {email:email}]}).then(user =>{
                    if(user){
                        if(user.username == username){
                            errors.push("username already in use");
                        }
                        if(user.email == email){
                            errors.push("email already in use");
                        }
                        res.render('register', {username, email, password, password_confirm, errors, layout:'layouts/guest'});
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
            }
        });
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
router.get('/:id', auth.ensureLoggedIn, (req,res)=>{
    try{
        User.findOne({_id:new mongoose.Types.ObjectId(req.params.id)}).then(userFound=>{
            if(userFound){
                let blockedBy = userFound.blocked.some(blocked=>{
                    return blocked._id.toString() == req.user.id
                });
                if(blockedBy)
                    res.status(401).render('user/showBlocked');
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
                req.user.blocked.push(userFound.id);
                req.user.save();
                res.redirect(req.header('referer') || '/');
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
                req.user.save();
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

            if(blockedBy)
                res.sendStatus(401);
            else if (isFriend)
                res.redirect(req.header('referer') || '/');
            else{
                //test if method == DELETE or post
                if(req.body._method == "DELETE" && isRequested){
                    userFound.requests = userFound.requests.filter(request=>request._id.toString() != req.user.id);
                }else
                    userFound.requests.push(req.user.id);

                
                userFound.save();
                res.redirect(req.header('referer') || '/');
            }
            
        }else{
            res.sendStatus(404);
        }
    })
})
module.exports = router;