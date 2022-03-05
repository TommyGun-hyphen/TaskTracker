const User = require('../models/User');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
passport.use(new LocalStrategy((username, password, done)=>{
    User.findOne({username:username}, async (err,user)=>{
        if(err) return done(err);
        if(!user) return done(null, false, {message: 'user not found.'});
        result = await bcrypt.compare(password, user.password);
        if( result ){
            return done(null, user);
        }else{
            return done(null, false, {message: 'invalid password'});
        }
    });
}));
//serialize deserialize
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

module.exports = passport;
