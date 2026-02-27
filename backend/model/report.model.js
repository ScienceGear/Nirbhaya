import mongoose from "mongoose";

const ReportSchema = new mongoose.Schema({
    userID:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",

    },
    description: String,
    latitude: Number,
    longitude: Number,
    timestamp: {
        type: Date,
        default: Date.now
    },
    severity: {
        type: String,
        enum: ["Low", "Medium", "High"],
        default: "Low"
    }

});

const Report = mongoose.model("Report", ReportSchema, "reports");
export default Report;