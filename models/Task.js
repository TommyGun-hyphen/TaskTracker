const mongoose = require('mongoose');

module.exports = mongoose.model('Task', {
    project: {type:mongoose.Schema.Types.ObjectId, ref:'Project'},
    title: String,
    description: String,
    status: String,
    created_by:{type:mongoose.Schema.Types.ObjectId, ref:'User'},
    finished_by: {type:mongoose.Schema.Types.ObjectId, ref:'User'},
    creation_date: Date,
    completion_date: Date,
});