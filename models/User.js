const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

const userSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String,
    picture: String,
    friends: [{id: {type: mongoose.Schema.Types.ObjectId, ref:'User'}, friendship_date: Date}],
    requests: [{id: {type: mongoose.Schema.Types.ObjectId, ref:'User'}, request_date: Date}],
    blocked:[{id: {type: mongoose.Schema.Types.ObjectId, ref:'User'}}]
});
userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', userSchema);