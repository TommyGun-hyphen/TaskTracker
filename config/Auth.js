module.exports = {
    ensureLoggedIn: (req, res, next)=>{
        if(req.user) next();
        else{
            res.redirect('/login');
        }
    },
    ensureLoggedOut: (req,res,next)=>{
        if(!req.user) next();
        else{
            res.redirect('/');
        }
    }
}