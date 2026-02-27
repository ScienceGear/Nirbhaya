import jwt from "jsonwebtoken"
export const generateToken = async (userId,res)=>{
    const token = jwt.sign(userId,process.env.JWTSECRET,{
                           expiresIn: `100Days`
                        });
    res.cookie("jwt",token,{
  maxAge: 100 * 24 * 60 * 60 * 1000,
  path: "/"    })
    return token;
}