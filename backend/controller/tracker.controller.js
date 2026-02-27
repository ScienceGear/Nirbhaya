import  {getSafeWaypoint}  from "../library/groq.library.js";
import PoliceStation from "../model/policestations.model.js";
export const searchLocation = async (req,res)=>{
      const query = req.body.query;
      if(query.length === 0) return res.status(400).json({message: "Query is required"});
      try{

const response = await fetch(
  `https://nominatim.openstreetmap.org/search?format=json&q=${query}`
);        const data = await response.json();
        console.log(data);
        return res.status(200).json({message: "Search location endpoint", data});
      } catch (error) {
        return res.status(500).json({message: "Error fetching location data"});
      }
}


export const SafePath = async (req, res) => {
  try {
    const { start, end } = req.body;
    console.log("Received start and end:", start, end);
    if (!start || !end) {
      return res.status(400).json({ message: "Start and End required" });
    }

    const [startLat, startLng] = start; 
    const [endLat, endLng] = end;
    const waypoint = await getSafeWaypoint(start, end);
    console.log("Safe waypoint from AI:", waypoint);
    const allCoords = [
      [startLng, startLat],
        ...waypoint.map(wp => [wp[1], wp[0]]),
      [endLng, endLat]
    ];
    const coordsString = allCoords.map(c => c.join(",")).join(";");

const url = `https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`;


    const response = await fetch(url);
    const data = await response.json();

    const coords = data.routes[0].geometry.coordinates;

    const route = coords.map(c => [c[1], c[0]]);

    res.json({
      message: "Safe path generated",
      data: route,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error generating path" });
  }
};

export const showPoliceStations = async (req,res)=>{
    try{
        const stations = await PoliceStation.find({});
        console.log(stations);
        res.json({message: "Police stations fetched", data: stations});
    }catch(err){
        console.error(err);
        res.status(500).json({message: "Error fetching police stations"});
    }
}