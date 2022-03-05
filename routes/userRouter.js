const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const {v4:uuidv4} = require('uuid');
const bcrypt = require('bcrypt');
const fs = require('fs');
const stream = require('stream');
const path = require('path');
const passport = require('../config/configPassport');
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
            res.render('register', {username, email, password, password_confirm, errors});
            //return res.redirect('/register');
        }
        //check if exists
        User.findOne({email:email}).then(user=>{
            if(user){
                errors.push("email already in use")
                res.render('register', {username, email, password, password_confirm, errors});
            }else{
                User.findOne({$or:[{username:username}, {email:email}]}).then(user =>{
                    if(user){
                        if(user.username == username){
                            errors.push("username already in use");
                        }
                        if(user.email == email){
                            errors.push("email already in use");
                        }
                        res.render('register', {username, email, password, password_confirm, errors});
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
router.get('/:id', (req,res)=>{

    try{
        User.findOne({id:mongoose.Types.ObjectId(req.params.id)}).then(user=>{
            if(user) res.render('user/show', {user})
            else res.status(404).render('404');
        });
    }catch{
        res.status(404).render('404');
    }
})
router.get('/:id/projects', (req, res)=>{
    try{
        User.findOne({id:mongoose.Types.ObjectId(req.params.id)}).then(user=>{
            if(user) res.render('user/show', {user})
            else res.status(404).render('404');
        });
    }catch{
        res.status(404).render('404');
    }
})
module.exports = router;