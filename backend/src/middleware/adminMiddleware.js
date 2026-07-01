const {getAdminEmail}=require("../config/admin");

const adminMiddleware=(req,res,next)=>{
    const adminEmail=getAdminEmail();

    if(!req.user?.email||req.user.email.toLowerCase()!==adminEmail.toLowerCase()){
        return res.status(403).json({
            success:false,
            message:"Admin access required",
        });
    }

    next();
};

module.exports=adminMiddleware;
