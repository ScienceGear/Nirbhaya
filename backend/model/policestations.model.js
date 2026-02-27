import mongoose from "mongoose";

const PoliceStationSchema = new mongoose.Schema({
    cityName: String,
    policeStationName: String,
    address: String,
    latitude: Number,
    longitude: Number
});

const PoliceStation = mongoose.model("PoliceStation", PoliceStationSchema, "policestation_pune");
export default PoliceStation;