import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    emergencyContacts: [
        {
            name: { type: String, required: true },
            phone: { type: String, required: true },
            email: { type: String, required: true }
        }
    ],
    emergencyLogs:[
        {
            timestamp: { type: Date, default: Date.now },
            location: { type: String, required: true }
        }
    ]
});

const User = mongoose.model("User", userSchema);

export default User;