import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const MONGO_URL =
  process.env.MONGODB_URL ||
  "mongodb+srv://selida2652_db_user:tqnJt2uaMdp0k4pd@cluster0.d7zfty5.mongodb.net/nirbhaya?appName=Cluster0";

const hospitals = [
  { cityName:"Pune", wardNo:6, wardName:"Kothrud-Bawdhan", name:"Late. Jayabai Nanasaheb Sutar Maternity Home", facilityType:"Government hospital(PMC)", lat:18.503652, lng:73.807762 },
  { cityName:"Pune", wardNo:6, wardName:"Kothrud-Bawdhan", name:"Late. Sundarabai Ganpatrao Raut Dawakhana", facilityType:"Government hospital(PMC)", lat:18.511578, lng:73.820137 },
  { cityName:"Pune", wardNo:4, wardName:"Aundh-Baner", name:"Sanjay Gandhi Maternity Home", facilityType:"Government hospital(PMC)", lat:18.571104, lng:73.838294 },
  { cityName:"Pune", wardNo:4, wardName:"Aundh-Baner", name:"Late. Sahadev Eknath Nimhan Maternity Home", facilityType:"Government hospital(PMC)", lat:18.537722, lng:73.795979 },
  { cityName:"Pune", wardNo:4, wardName:"Aundh-Baner", name:"Aundh Kuti Maternity Home", facilityType:"Government hospital(PMC)", lat:18.562805, lng:73.810015 },
  { cityName:"Pune", wardNo:4, wardName:"Aundh-Baner", name:"Late. Baburao Genba Shevale Dawakhana", facilityType:"Government hospital(PMC)", lat:18.562739, lng:73.832653 },
  { cityName:"Pune", wardNo:15, wardName:"Bibwewadi", name:"Late. Indumati Manilal Khanna Dawakhana", facilityType:"Government hospital(PMC)", lat:18.492471, lng:73.866599 },
  { cityName:"Pune", wardNo:15, wardName:"Bibwewadi", name:"Bharatratna Dr. Babasaheb Ambedkar Dawakhana", facilityType:"Government hospital(PMC)", lat:18.496225, lng:73.870225 },
  { cityName:"Pune", wardNo:15, wardName:"Bibwewadi", name:"Yugpurush Raja Shiv Chatrapati Bibvewadi (Appar) Pune manapa", facilityType:"Government hospital(PMC)", lat:18.461404, lng:73.868892 },
  { cityName:"Pune", wardNo:3, wardName:"Dhole Patil", name:"Rajeshree Shahu Maharaj Dawakhana", facilityType:"Government hospital(PMC)", lat:18.527713, lng:73.907674 },
  { cityName:"Pune", wardNo:3, wardName:"Dhole Patil", name:"Late. Bapusaheb Genuji Kawade Patil Dawakhana", facilityType:"Government hospital(PMC)", lat:18.537819, lng:73.898493 },
  { cityName:"Pune", wardNo:3, wardName:"Dhole Patil", name:"Dr. Naidu Hospital", facilityType:"Government hospital(PMC)", lat:18.53139, lng:73.869151 },
  { cityName:"Pune", wardNo:1, wardName:"Nagar Road-Wadgaonsheri", name:"Late. Damodar Ravji Galande Patil Dawakhana", facilityType:"Government hospital(PMC)", lat:18.551841, lng:73.896929 },
  { cityName:"Pune", wardNo:1, wardName:"Nagar Road-Wadgaonsheri", name:"Khrist. Rok Edward Poul Dawakhana", facilityType:"Government hospital(PMC)", lat:18.577003, lng:73.899032 },
  { cityName:"Pune", wardNo:1, wardName:"Nagar Road-Wadgaonsheri", name:"Late. Lokshahir Annabhau Sathe Dawakhana", facilityType:"Government hospital(PMC)", lat:18.549598, lng:73.890645 },
  { cityName:"Pune", wardNo:2, wardName:"Yerwada-Kalas-Dhanori", name:"Bharat Ratna Late. Rajiv Gandhi Maternity Home", facilityType:"Government hospital(PMC)", lat:18.545626, lng:73.883893 },
  { cityName:"Pune", wardNo:2, wardName:"Yerwada-Kalas-Dhanori", name:"Late. Genba Tukaram Mhaske Dawakhana", facilityType:"Government hospital(PMC)", lat:18.578015, lng:73.874962 },
  { cityName:"Pune", wardNo:2, wardName:"Yerwada-Kalas-Dhanori", name:"Siddharth Dawakhana, Vishrantwadi", facilityType:"Government hospital(PMC)", lat:18.572164, lng:73.878738 },
  { cityName:"Pune", wardNo:10, wardName:"Hadapsar-Mundhawa", name:"Late. Annasaheb Magar Maternity Home", facilityType:"Government hospital(PMC)", lat:18.503093, lng:73.92653 },
  { cityName:"Pune", wardNo:10, wardName:"Hadapsar-Mundhawa", name:"Late. Sakharam Kundlik Kodre Maternity Home", facilityType:"Government hospital(PMC)", lat:18.53391, lng:73.927257 },
  { cityName:"Pune", wardNo:11, wardName:"Wanawadi-Ramtekdi", name:"Late. Namdevrao Shivarkar Maternity Home", facilityType:"Government hospital(PMC)", lat:18.497237, lng:73.89985 },
  { cityName:"Pune", wardNo:11, wardName:"Wanawadi-Ramtekdi", name:"Late. Minatai Thakare Maternity Home", facilityType:"Government hospital(PMC)", lat:18.475892, lng:73.889505 },
  { cityName:"Pune", wardNo:11, wardName:"Wanawadi-Ramtekdi", name:"PMC Dawakhana, Pune", facilityType:"Government hospital(PMC)", lat:18.485521, lng:73.899035 },
  { cityName:"Pune", wardNo:7, wardName:"Dhankawadi-Sahakarnagar", name:"Late. Shivshankar Pote Dawakhana", facilityType:"Government hospital(PMC)", lat:18.4765, lng:73.856033 },
  { cityName:"Pune", wardNo:13, wardName:"Kasba-Vishrambagwada", name:"Late. Matoshri Ramabai Ambedkar Maternity Home", facilityType:"Government hospital(PMC)", lat:18.50291, lng:73.850023 },
  { cityName:"Pune", wardNo:13, wardName:"Kasba-Vishrambagwada", name:"Rajamata Jijau Maternity Home", facilityType:"Government hospital(PMC)", lat:18.4972131, lng:73.8550317 },
  { cityName:"Pune", wardNo:13, wardName:"Kasba-Vishrambagwada", name:"Janta Vasahat Dawakhana", facilityType:"Government hospital(PMC)", lat:18.5041367, lng:73.85130454 },
  { cityName:"Pune", wardNo:13, wardName:"Kasba-Vishrambagwada", name:"Kamala Nehru Hospital (General Hospital)", facilityType:"Government hospital(PMC)", lat:18.52283, lng:73.86199 },
  { cityName:"Pune", wardNo:13, wardName:"Kasba-Vishrambagwada", name:"Late. Anandibai Narhar Gadgil Dawakhana", facilityType:"Government hospital(PMC)", lat:18.502322, lng:73.838387 },
  { cityName:"Pune", wardNo:13, wardName:"Kasba-Vishrambagwada", name:"Hindu Ruday Samrat, Shivsena Pramukh, Balasheb Thakre Dawakhana", facilityType:"Government hospital(PMC)", lat:18.497456, lng:73.853928 },
  { cityName:"Pune", wardNo:13, wardName:"Kasba-Vishrambagwada", name:"Late. Dadasaheb Gaikwad Dawakhana", facilityType:"Government hospital(PMC)", lat:18.524737, lng:73.865131 },
  { cityName:"Pune", wardNo:13, wardName:"Kasba-Vishrambagwada", name:"Late. Kalavatibai Mavale Dawakhana", facilityType:"Government hospital(PMC)", lat:18.514826, lng:73.84675 },
  { cityName:"Pune", wardNo:13, wardName:"Kasba-Vishrambagwada", name:"Late. Mukundrao Lele Dawakhana", facilityType:"Government hospital(PMC)", lat:18.519752, lng:73.854411 },
  { cityName:"Pune", wardNo:14, wardName:"Bhawani Peth", name:"Bai Bhikayji Pestanji Bammanji Dawakhana", facilityType:"Government hospital(PMC)", lat:18.511186, lng:73.870064 },
  { cityName:"Pune", wardNo:14, wardName:"Bhawani Peth", name:"Late. Chandu Mama Sonawane Maternity Home", facilityType:"Government hospital(PMC)", lat:18.505713, lng:73.868817 },
  { cityName:"Pune", wardNo:14, wardName:"Bhawani Peth", name:"Late. Savitribai Phule Maternity Home", facilityType:"Government hospital(PMC)", lat:18.504876, lng:73.86102 },
  { cityName:"Pune", wardNo:14, wardName:"Bhawani Peth", name:"Late. Malti Kachi Maternity Home", facilityType:"Government hospital(PMC)", lat:18.5121324, lng:73.85800581 },
  { cityName:"Pune", wardNo:14, wardName:"Bhawani Peth", name:"Late. Rohidas Kirad Dawakhana", facilityType:"Government hospital(PMC)", lat:18.511242, lng:73.868669 },
  { cityName:"Pune", wardNo:14, wardName:"Bhawani Peth", name:"Late. Kotnis Aarogya Kendra", facilityType:"Government hospital(PMC)", lat:18.511875, lng:73.857932 },
  { cityName:"Pune", wardNo:14, wardName:"Bhawani Peth", name:"Late. Balaji Rakhmaji Gaikwad Dawakhana", facilityType:"Government hospital(PMC)", lat:18.509032, lng:73.86526 },
  { cityName:"Pune", wardNo:14, wardName:"Bhawani Peth", name:"Late. Mamasaheb Badade Dawakhana", facilityType:"Government hospital(PMC)", lat:18.515515, lng:73.867725 },
  { cityName:"Pune", wardNo:14, wardName:"Bhawani Peth", name:"Hutatma Babu Genu Dawakhana", facilityType:"Government hospital(PMC)", lat:18.515805, lng:73.859786 },
  { cityName:"Pune", wardNo:5, wardName:"Shivajinagar-Ghole Road", name:"Dr. Dalvi Maternity Hospital", facilityType:"Government hospital(PMC)", lat:18.533046, lng:73.84891 },
  { cityName:"Pune", wardNo:5, wardName:"Shivajinagar-Ghole Road", name:"Dr. Homi J. Bhabha Maternity Home", facilityType:"Government hospital(PMC)", lat:18.529152, lng:73.833361 },
  { cityName:"Pune", wardNo:5, wardName:"Shivajinagar-Ghole Road", name:"Late. Jangalrao Kondiba Amrale Dawakhana", facilityType:"Government hospital(PMC)", lat:18.522728, lng:73.852555 },
  { cityName:"Pune", wardNo:9, wardName:"Warje-Karvenagar", name:"Bindu Madhav Thakare Dawakhana", facilityType:"Government hospital(PMC)", lat:18.496497, lng:73.816307 },
  { cityName:"Pune", wardNo:9, wardName:"Warje-Karvenagar", name:"Late. Arvind Ganpat Bartakke Dawakhana", facilityType:"Government hospital(PMC)", lat:18.488853, lng:73.795542 },
  { cityName:"Pune", wardNo:9, wardName:"Warje-Karvenagar", name:"Late. Prathak Barate Dawakhana, Warje Malwadi", facilityType:"Government hospital(PMC)", lat:18.4835225, lng:73.79259612 },
  { cityName:"Pune", wardNo:9, wardName:"Warje-Karvenagar", name:"Late. Tharkude Dawakhana, Erandwana", facilityType:"Government hospital(PMC)", lat:18.5066, lng:73.832811 },
  { cityName:"Pune", wardNo:9, wardName:"Warje-Karvenagar", name:"Late. Vijayabai Shirke Aarogya Kendra", facilityType:"Government hospital(PMC)", lat:18.487103, lng:73.815248 },
];

async function seedHospitals() {
  await mongoose.connect(MONGO_URL);
  console.log("Connected to MongoDB for hospital seeding...");

  const { default: Hospital } = await import("./model/hospital.model.js");

  // Drop existing data and re-seed
  await Hospital.deleteMany({});
  console.log("Cleared existing hospital data.");

  const docs = hospitals.map((h) => ({
    cityName: h.cityName,
    wardNo: h.wardNo,
    wardName: h.wardName,
    name: h.name,
    facilityType: h.facilityType,
    location: {
      type: "Point",
      coordinates: [h.lng, h.lat],
    },
  }));

  await Hospital.insertMany(docs);
  console.log(`Seeded ${docs.length} hospitals successfully.`);

  // Ensure 2dsphere index
  await Hospital.collection.createIndex({ location: "2dsphere" });
  console.log("2dsphere index ensured.");

  await mongoose.disconnect();
  console.log("Done.");
}

seedHospitals().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
