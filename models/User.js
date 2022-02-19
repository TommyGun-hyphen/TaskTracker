const mongoose = require('mongoose');

module.exports = mongoose.model('User', {
    username: String,
    email: String,
    password: String,
    picture: String,
    friends: [{id: {type:mongoose.Schema.Types.ObjectId, ref:'User'}, friendship_date: Date}]
});