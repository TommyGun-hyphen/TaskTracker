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
    new Project({
        user: mongoose.Types.ObjectId(id),
        title: title,
        description: description,
        creation_date: Date.now(),
        last_date: Date.now(),
        status: "active",
        members: []
    }).save(err=>{
        if(err) console.log(err)
        else res.redirect('/')
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