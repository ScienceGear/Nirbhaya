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
    },
    incidentType: {
        type: String,
        default: "unsafe_area"
    },
    locationText: {
        type: String,
        default: ""
    },
    anonymous: {
        type: Boolean,
        default: true
    },
    areaRating: {
        type: Number,
        min: 1,
        max: 5,
        default: 3
    },
    imageUrl: {
        type: String,
        default: ""
    },
    pointsAwarded: {
        type: Number,
        default: 0
    },
    reporterKey: {
        type: String,
        default: "guest"
    }

});

const Report = mongoose.model("Report", ReportSchema, "reports");
export default Report;