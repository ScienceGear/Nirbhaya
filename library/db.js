import mongoose from "mongoose"
import dotenv from "dotenv";
dotenv.config();

export const connectdb = async ()=>{

    try{
      console.log("Connecting to MongoDB... : ", process.env.MONGODB_URL);
       const conn = await mongoose.connect(process.env.MONGODB_URL)
      await console.log(`Mongodb connected : ${conn.connection.host}`);
    }catch(err){
       console.log(`error while connecting db ${err}`)
    }
}
