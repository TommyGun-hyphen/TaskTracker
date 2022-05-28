const mongoose = require('mongoose');

module.exports = mongoose.model('Project', {
    user: {type: mongoose.Schema.Types.ObjectId, ref:'User'},
    title: String,
    description: String,
    creation_date: Date,
    last_date: Date,
    status: String,
    userInvites:[{_id:false, user:{type: mongoose.Schema.Types.ObjectId, ref:'User'}, invitation_date: Date }],
    members: [{
        user: {type:mongoose.Schema.Types.ObjectId, ref:'User'},
        permission: String,
        inclusion_date: Date
    }],
    tasks: [{type: mongoose.Schema.Types.ObjectId, ref:'Task'}]
});