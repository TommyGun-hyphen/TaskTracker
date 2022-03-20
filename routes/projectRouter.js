const express = require('express');
const mongoose = require('mongoose');

const Project = require('../models/Project');
const router = express.Router();
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
    Project.find({user:req.user.id}).sort({last_date: -1}).limit(10).skip(skip).then(projects=>{
        res.render('project/index', {projects});
    });
})
router.get('/:id', (req,res)=>{
    var id;
    try{
        id = mongoose.Types.ObjectId(req.params.id);
    }catch{
        return res.status(404).render('404');
    }

    try{
        Project.findOne({id:id}).then(project=>{
            if(project) res.render('project/show', {project});
            else res.status(404).render('404');
        });
    }catch(ex){
        console.log(ex)
        res.sendStatus(500);
    }
});
router.get('/:id/members', (req,res)=>{
    var id;
    try{
        id = mongoose.Types.ObjectId(req.params.id);
    }catch{
        return res.status(404).render('404');
    }
    try{
        Project.findOne({id:id}).populate('members.user').exec((err,story)=>{
            res.render('project/member/index', {members:story.members});
        });
    }catch(ex){
        console.log(ex)
        res.sendStatus(500);
    }
})



module.exports = router;