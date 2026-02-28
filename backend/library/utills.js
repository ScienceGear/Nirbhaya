import jwt from "jsonwebtoken"
export const generateToken = (payload,res)=>{
    const token = jwt.sign(payload,process.env.JWTSECRET,{
                           expiresIn: `100Days`
                        });
    const isProd = process.env.NODE_ENV === "production";
    res.cookie("jwt",token,{
  maxAge: 100 * 24 * 60 * 60 * 1000,
  path: "/",
  httpOnly: true,
  sameSite: isProd ? "none" : "lax",
  secure: isProd
    })
    return token;
}