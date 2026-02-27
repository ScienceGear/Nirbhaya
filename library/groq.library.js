import dotenv from "dotenv";
dotenv.config();


import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.AI_API_KEY});

export async function getSafeWaypoint(start, end) {
    const prompt = `
You are a smart routing assistant that generates safe waypoints for travel. 
Given a starting location and an ending location, your task is to generate coordinates 
(lat, lng) for 1 or more intermediate "safe" points such that the route goes through 
areas that are generally safe, avoid high-risk zones, and remain practical for driving/walking.

Rules:
1. Return waypoints as an array of coordinates in [latitude, longitude] format.
2. Ensure waypoints create a reasonable path from start to end.
3. Do not return unsafe or restricted zones (high crime areas, construction zones, flood zones, etc.).
4. Output ONLY the array of coordinates, no extra text.
5. mention specific name of the actual shops, landmarks, or areas that make the waypoint safe and why it is safe in the reason key of the output.
Example Input:
Start: [18.458419, 73.850483]
End: [18.498677, 73.857842]
Your Output (example format):
{
data: [
{
waypoint: [18.465123, 73.851456],
reason: "This area is a well-lit commercial zone with low crime rates, making it a safer route option compared to the more isolated paths."
}, {waypoint: [18.475789, 73.853210],
reason: "This waypoint passes through a popular park that is frequented by families and has good visibility, reducing the risk of unsafe encounters."}],
score : 80 // A safety score from 0-100, with 10 being the safest route
},
actual Input:
Start: ${JSON.stringify(start)}
End: ${JSON.stringify(end)}
`;

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "user", content: prompt }
            ],
            model: "openai/gpt-oss-20b",
        });
        const parsed = JSON.parse(chatCompletion.choices[0]?.message?.content || "{}");
        const waypoint = parsed.data;
        console.log("Extracted waypoint from AI response:", waypoint);
        if (!waypoint) throw new Error("No waypoint returned from AI");
        
        const waypoints = waypoint.map(wp => wp.waypoint); 
        if (
            Array.isArray(waypoints) &&
            waypoints.every(wp => Array.isArray(wp) && wp.length === 2)
        ) {
            console.log("Parsed waypoints from AI:", waypoints);
            return waypoints;
        } else {
            throw new Error("AI returned invalid waypoint format");
        }
    } catch (err) {
        console.error("Error generating safe waypoints:", err);
        return null;
    }
}