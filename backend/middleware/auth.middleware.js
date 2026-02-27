import jwt from "jsonwebtoken"
import User from "../model/user.model.js";
export const protectedRoute = async (req,res,next)=>{
   try{
    console.log("Cookies object:", req.cookies);
console.log("JWT:", req.cookies?.jwt);

   const token = req.cookies.jwt;

   if(!token){
    return res.status(400).json({message:"token required"})
   }
   const validate = jwt.verify(token,process.env.JWTSECRET);
        const user = await User.findById(validate.userId).select("-password");
        if(!user){
           return res.status(401).json({message:"user not found"})
        }
        req.user= user;
        next();
  }catch(err){
    console.log(`error in auth middleware ${err}`)
    return res.status(400).json({message:"unauthorized access"})
  }
}