const mongoose = require('mongoose');
const Project = require('../models/Project');
const User = require('../models/User');
const Task = require('../models/Task');
module.exports = {
    PopulateProject(req, res, next){
        if(req.params.id){
            try{
                Project.findOne({_id:new mongoose.Types.ObjectId(req.params.id)}).then((project)=>{
                    if(project) {
                        req.project = project;
                        if(req.user){
                            let isMember = project.members.some(member=>member.user.toString() == req.user.id.toString() );
                            if(isMember){
                                let member = project.members.filter(member=>member.user.toString() == req.user.id.toString())[0];
                                req.user.permission = member.permission;
                            }else{
                                if(project.user.toString() == req.user.id.toString()){
                                    req.user.permission = "owner";
                                }
                            }

                            req.user.isInvited = project.userInvites.some(invite=>invite.user.toString() == req.user.id.toString() );
                        }
                        if(req.params.task_id){
                            Task.findOne({_id:new mongoose.Types.ObjectId(req.params.task_id)}).then(task=>{
                                if(!task) return res.sendStatus(404);
                                req.task = task;
                                next();
                            })
                        }else{
                            next();
                        }
                    }
                    else {
                        console.log("not found")
                        res.status(404).render('404');
                    }
                });
            }catch(ex){
                console.log(ex);
                return res.status(404).render('404');
            }
        }else{
            next();
        }
    },
}