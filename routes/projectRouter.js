const express = require('express');
const mongoose = require('mongoose');

const Project = require('../models/Project');
const User = require('../models/User');
const Task = require('../models/Task');
const router = express.Router();
const moment = require('moment');

const notificationsSystem = require('../config/notificationsSystem');
const ProjectMiddleware = require('../config/ProjectMiddleware');
router.use(require('../config/Auth').ensureLoggedIn);
router.get('/create', (req,res)=>{
    res.render('project/create');
});
router.post('/', (req, res)=>{
    const {title, description} = req.body;
    const {id} = req.user;

    const errors = [];

    if(title.length < 6 || title.length > 30) errors.push("Project's title should be between 6 and 30 characters")
    if(description.length < 10 || description.length > 255) errors.push("Project's description should be between 10 and 255 characters");

    if(errors.length > 0){
        res.render('project/create', {title, description, errors});
         return;
    }

    new Project({
        user: mongoose.Types.ObjectId(id),
        title: title,
        description: description,
        creation_date: Date.now(),
        last_date: Date.now(),
        status: "active",
        members: []
    }).save((err, project)=>{
        if(err) console.log(err);
        else res.redirect('/project/'+project.id);
    });
})
router.get('/', (req,res)=>{
    let skip = 0;
    if(typeof req.query.page != 'undefined'){
        if(!isNaN(parseInt(req.query.page)))
        skip = (parseInt(req.query.page)-1) * 10;
    }
    Project.find({user:req.user.id}).sort({last_date: -1}).limit(10).skip(skip).populate({path:'members', populate:{path:'user'}}).exec((err, projects)=>{
        projects = projects.map(project=>{
            project.moreMembers = Math.max(project.members.length, 0);
            project.members = project.members.slice(0,2);
            return project;
        });
        res.render('project/index', {projects});
    });
})
router.get('/:id', ProjectMiddleware.PopulateProject ,(req,res)=>{
    try{
        Project.findOne({_id:new mongoose.Types.ObjectId(req.project._id)}).populate('members.user').populate({path:'tasks', options:{sort:{last_date: 1}}}).exec((err, project)=>{
            project.moreMembers = Math.max(project.members.length, 0);
            //console.log(project.members);
            project.members = project.members.slice(0,2);
            res.render('project/show', {project});
        });
    }catch(ex){
        return res.status(404).render('404');
    }
});
router.get('/:id/members', ProjectMiddleware.PopulateProject,(req,res)=>{
    
    try{
        Project.findOne({_id:new  mongoose.Types.ObjectId(req.params.id)}).populate('members.user').exec((err,project)=>{
            res.render('project/member/index', {members:project.members, project:project});
        });
    }catch(ex){
        return res.status(404).render('404');
    }
})
router.post('/:id/invite', (req,res)=>{
    Project.findOne({_id:req.params.id}).then(project=>{
        if(!project){
            return res.sendStatus(404);
        }
        User.findOne({_id:req.body.user_id}).then(user=>{
            if(!user){
                return res.sendStatus(404);
            }
            if(req.body._method == "DELETE"){
                //delete invite
                project.userInvites = project.userInvites.filter((invite)=>{
                    return invite.user.toString() != user._id.toString();
                });
                user.projectInvites = user.projectInvites.filter((invite)=>{
                    return invite.project.toString() != project._id.toString();
                });
                project.save().then(()=>{
                    user.save().then(()=>{
                        res.sendStatus(201);
                    });
                });
            }else{
                //send invite
                project.userInvites.push({user:req.body.user_id});
                project.save();
                user.projectInvites.push({project:project._id});
                user.notifications.push({
                    sender_id: mongoose.Types.ObjectId(req.user.id),
                    sender_username: req.user.username,
                    sender_picture: req.user.picture,
                    message: (req.user.username + " invited you to project: " + project.title),
                    date: Date.now(),
                    object_type: 'project_invite',
                    activity_type: 'sent',
                    object_id: project.id,
                    url: '/project/'.concat(project.id),
                    isUnread:true
                });
                user.save().then(()=>{
                    notificationsSystem.notificationEmitter.emit('notification', {id:user.id})
                });
                res.sendStatus(201);
            }

        });

    });
});
router.post('/:id/invite/accept', ProjectMiddleware.PopulateProject,(req,res)=>{
    if(req.project.userInvites.some(invite=>invite.user.toString() == req.user.id.toString())){
        //was invited
        req.project.members.push({user:req.user.id, permission: 'member', inclusion_date:Date()});
        req.project.userInvites = req.project.userInvites.filter(invite=>invite.user.toString() != req.user.id.toString());
        req.user.projectInvites = req.user.projectInvites.filter(invite=>invite.project.toString() != req.project.id.toString());
        req.project.save();
        req.user.save();
    }
    return res.redirect(req.header('referer') || '/');
});
router.post('/:id/invite/decline', ProjectMiddleware.PopulateProject,(req,res)=>{
    if(req.project.userInvites.some(invite=>invite.user.toString() == req.user.id.toString())){
        //was invited
        req.project.userInvites = req.project.userInvites.filter(invite=>invite.user.toString() != req.user.id.toString());
        req.user.projectInvites = req.user.projectInvites.filter(invite=>invite.project.toString() != req.project.id.toString());
        req.project.save();
        req.user.save();
    }
    return res.redirect(req.header('referer') || '/');
});
router.post('/:id/member/:userid', ProjectMiddleware.PopulateProject,(req,res)=>{
    if(req.user.permission != "owner") return res.redirect(req.header('referer') || '/');
        req.project.members = req.project.members.filter(member=>member.user.toString() != req.params.userid);
        req.project.save().then(()=>{
            res.redirect(req.header('referer') || '/');
        });

})
router.post('/:id/task', ProjectMiddleware.PopulateProject, async (req,res)=>{
    if(req.user.permission != "admin" && req.user.permission != "owner"){
        return res.sendStatus(401);
    }
    const {title, description} = req.body;
    let errors = [];

    if(!title || title.length < 5 || title.length > 30) errors.push("Title should be 5 to 30 characters long");
    if(!description || description.length < 5 || description.length > 255) errors.push("Description should be 5 to 255 characters long");

    if(errors.length > 0){
        return res.status(400).json(errors);
    }
    // let count = await Task.countDocuments({project:req.project.id, status:"todo"})
    let task = new Task({
        project: req.project.id,
        title: title,
        description: description,
        status: "todo",
        created_by: req.user.id,
        finished_by: null,
        creation_date: Date(),
        last_date: Date(),
        completion_date: null,
    }).save((err, task)=>{
        if(err){
            return res.sendStatus(500);
        }
        req.project.tasks.push(task._id);
        req.project.save().then(()=>{
            // task.creation_date = moment(task.creation_date).format('MMMM do YYYY, h:mm:ss a')
            let newTask = {
                _id: task.id,
                title: task.title,
                description: task.description,
                creation_date: moment(task.creation_date).format('MMMM do YYYY, h:mm:ss a'),
                last_date: moment(task.last_date).format('MMMM do YYYY, h:mm:ss a')
            }
            res.status(201).json(newTask);
        });
    });
})
router.post("/:id/task/:task_id", ProjectMiddleware.PopulateProject, (req,res)=>{
    if(req.user.permission != "owner" && req.user.permission != "admin"){
        return res.sendStatus(401);
    }
    if(req.body._method == "DELETE"){
        req.project.tasks = req.project.tasks.filter(t=>t._id != req.params.task_id);
        req.project.save().then(()=>{
            res.sendStatus(201);
        });
    }
})
router.post("/:id/task/:task_id/status", ProjectMiddleware.PopulateProject, (req,res)=>{
    if(req.user.permission != "owner" && req.user.permission != "admin" && req.user.permission != "member"){
        return res.sendStatus(401);
    }
    switch(req.body.status){
        case "todo":
            req.task.status = "todo";
            req.task.last_date = Date();
            req.task.save().then(()=>{
                res.status(201).json({task:req.task, permission: req.user.permission, last_date: moment(req.task.last_date).format('MMMM do YYYY, h:mm:ss a')});
            });
            break;
        case "doing":
            req.task.status = "doing";
            req.task.last_date = Date();
            req.task.save().then(()=>{
                res.status(201).json({task:req.task, permission: req.user.permission, last_date: moment(req.task.last_date).format('MMMM do YYYY, h:mm:ss a')});
            });
            break;
        case "done":
            req.task.status = "done";
            req.task.last_date = Date();
            req.task.save().then(()=>{
                res.status(201).json({task:req.task, permission: req.user.permission, last_date: moment(req.task.last_date).format('MMMM do YYYY, h:mm:ss a')});
            });
            break;
        default:
            res.sendStatus(403);
    }


});
module.exports = router;