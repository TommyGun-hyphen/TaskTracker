const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

const userSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String,
    picture: String,
    friends: [{id: {type: mongoose.Schema.Types.ObjectId, ref:'User'}, friendship_date: Date}],
    requests: [{id: {type: mongoose.Schema.Types.ObjectId, ref:'User'}, request_date: Date}],
    blocked:[{id: {type: mongoose.Schema.Types.ObjectId, ref:'User'}}],
    notifications:[{
        sender_id: {type: mongoose.Schema.Types.ObjectId, ref:'User'},
        sender_username: String,
        sender_picture: String,
        date: Date,
        object_type: String, // request, invite, task...
        activity_type: String, // sent, acceoted, received, done...
        object_id: mongoose.Schema.Types.ObjectId,
        url: String,
        isUnread: Boolean
    }]
});
userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', userSchema);