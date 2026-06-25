const bcrypt=require("bcrypt");
const jwt=require("jsonwebtoken");
const pool=require("../config/database");

const signupUser=async(req,res)=>{
    try{
        const {name,email,password}=req.body;

        if(!name||!email||!password){
            return res.status(400).json({
                success: false,
                message:"Name, email and password are required",
            });
        }

        if(password.length<6){
            return res.status(400).json({
                success: false,
                message:"Password must be atleast 6 characters",
            });
        }

        const existingUser=await pool.query("SELECT id FROM users WHERE email=$1",[email]);

        if(existingUser.rows.length>0){
            return res.status(409).json({
                success:false,
                message:"Email already exists",
            });
        }

        const passwordHash=await bcrypt.hash(password,10);

        const result=await pool.query(`INSERT INTO users (name,email,password_hash) VALUES ($1,$2,$3) RETURNING id,name,email,created_at`,[name,email,passwordHash]);

        return res.status(201).json({
            success:true,
            message:"Your Footprints account is ready",
            user:result.rows[0],
        });
    } catch(error){
        console.error("Signup error:",error);
        return res.status(500).json({
            success:false,
            message:"Signup failed",
        });
    }
};

const loginUser=async(req,res)=>{
    try{
        const {email,password}=req.body;

        const result=await pool.query("SELECT * FROM users WHERE email=$1",[email]);

        if(result.rows.length===0){
            return res.status(401).json({
                success:false,
                message:"Invalid email or password",
            });
        }

        const user=result.rows[0];

        const isMatch=await bcrypt.compare(password,user.password_hash);

        if(!isMatch){
            return res.status(401).json({
                success:false,
                message:"Invalid email or password",
            });
        }

        const token=jwt.sign(
            {
                id:user.id,
                email:user.email,
            },
            process.env.JWT_SECRET,
            {
                expiresIn:process.env.JWT_EXPIRES_IN||"1d",
            }
        );

        return res.json({
            success:true,
            message:"Login successful",
            token,
            user:{
                id:user.id,
                name:user.name,
                email:user.email,
            },
        });
    } catch(error){
        console.error("Login error:",error);
        return res.status(500).json({
            success:false,
            message:"Login failed",
        });
    }
};

module.exports={signupUser,loginUser,};