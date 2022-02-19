const mongoose = require('mongoose');

module.exports = mongoose.model('Project', {
    user: {type: mongoose.Schema.Types.ObjectId, ref:'User'},
    title: String,
    description: String,
    creation_date: Date,
    last_date: Date,
    status: String,
    members: [{
        user: {type:mongoose.Schema.Types.ObjectId, ref:'User'},
        permission: String,
        inclusion_date: Date
    }]
});