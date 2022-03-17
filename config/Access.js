const mongoose = require('mongoose');
const Project = require('../models/Project');
module.exports = {
    ensureProjectMember(req, res, next){
        try{
            let id = mongoose.Types.ObjectId(req.params.id);
        }catch{
            
        }
        Project.findOne({id:mongoose.Types.ObjectId(id)});


    }
}