
import { generateToken } from "../library/utills.js"
import User from "../model/user.model.js"
import fs from "node:fs"
import bcrypt, { genSalt } from "bcrypt"

export const signup = async (req,res)=>{
 
    const {username,email,password} = req.body

    try{
        if(!username||!email||!password){
            return res.status(400).json({message:"All fields are required"})
        }
        if(password.length<6){ 
            return res.status(400).json({message:"Password must of atleast 6 digit"})
        }
        const prevUser = await User.findOne({email});
        if(prevUser){
            return res.status(400).json({message:"Email already registered"});
        }
        const salt = await genSalt(10)
        const encryptedPassword = await bcrypt.hash(password,salt);
        const newUser = new User({username:username,email:email,password:encryptedPassword})
        if(newUser){
            const token = await generateToken({userId:newUser._id},res);
            await newUser.save();
            return await res.status(201).json({message:"signup successful",username:username,email:email,password:encryptedPassword,token})
        }else{
            return await res.status(400).json({message:"Invalid user details"})
        }
    }catch(err){
        console.log(`Error in signup ${err}`)
        res.status(500).json({message:"Internal server error"})
    }

}

export const login = async (req,res)=>{
 const {email,password} = req.body
 try{
   if(!email||!password){
    return res.status(400).json({message:"All fields are required"})
   }
   const user = await User.findOne({email})
   if(user){
    const match = await bcrypt.compare(password,user.password)
    if(match){
        const token = await generateToken({userId : user._id},res)
        return res.status(200).json({message:"login successful",user,token:token})
    }else{
        return res.status(401).json({message:"Invalid Password"})
    }
   }else{
    return res.status(401).json({message:"Email not found"})
   }
 }catch(err){
    console.log(`Error in login : ${err}`)
    res.status(500).json({message:"Internal server error"})
 }
}

export const logout = (req,res)=>{
  try{
   res.cookie("jwt"," ",{
    maxAge:1,
   })
   res.status(200).json({message:"Logout successful"})
  }catch(err){
     console.log(`Error in logout controller : ${err}`)
    res.status(500).json({message:"Internal server error"})
  }
}

export const checkAuth = (req,res)=>{
    res.status(200).json({message:"user authorized",user:req.user})
}