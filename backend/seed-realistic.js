/**
 * seed-realistic.js
 * Inserts ~300 realistic, fully-enriched SafeCity-style incidents
 * spread across Pune, based on documented incident types & locations.
 * Uses scId range 900000-999999 to avoid clashing with real scraped data.
 * Run: node seed-realistic.js
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

await mongoose.connect(process.env.MONGODB_URL);
const { default: SC } = await import("./model/safecityIncident.model.js");

// ── Pune localities with realistic lat/lng ─────────────────────────────────
const ZONES = [
  // Central Pune
  { area: "Shivajinagar",            city: "Pune", lat: 18.5308, lng: 73.8474 },
  { area: "Deccan Gymkhana",         city: "Pune", lat: 18.5163, lng: 73.8417 },
  { area: "FC Road (Fergusson Col)", city: "Pune", lat: 18.5185, lng: 73.8395 },
  { area: "Pune Railway Station",    city: "Pune", lat: 18.5284, lng: 73.8742 },
  { area: "Pune Bus Stand (Swargate)",city:"Pune", lat: 18.5017, lng: 73.8617 },
  { area: "Laxmi Road",              city: "Pune", lat: 18.5157, lng: 73.8572 },
  { area: "Budhwar Peth",            city: "Pune", lat: 18.5097, lng: 73.8611 },
  { area: "Kasba Peth",              city: "Pune", lat: 18.5148, lng: 73.8625 },
  { area: "Narayan Peth",            city: "Pune", lat: 18.5120, lng: 73.8520 },
  { area: "Sadashiv Peth",           city: "Pune", lat: 18.5090, lng: 73.8465 },
  // West Pune
  { area: "Kothrud",                 city: "Pune", lat: 18.5074, lng: 73.8077 },
  { area: "Karve Road",              city: "Pune", lat: 18.5005, lng: 73.8240 },
  { area: "Warje",                   city: "Pune", lat: 18.4824, lng: 73.7981 },
  { area: "Bavdhan",                 city: "Pune", lat: 18.5205, lng: 73.7712 },
  { area: "Pashan",                  city: "Pune", lat: 18.5383, lng: 73.8005 },
  { area: "Sus Gaon",                city: "Pune", lat: 18.5458, lng: 73.7620 },
  { area: "Baner",                   city: "Pune", lat: 18.5590, lng: 73.7868 },
  { area: "Balewadi",                city: "Pune", lat: 18.5768, lng: 73.7818 },
  { area: "Hinjewadi Phase 1",       city: "Pune", lat: 18.5908, lng: 73.7379 },
  { area: "Hinjewadi Phase 2",       city: "Pune", lat: 18.5988, lng: 73.7238 },
  { area: "Wakad",                   city: "Pune", lat: 18.6008, lng: 73.7617 },
  { area: "Pimple Saudagar",         city: "Pune", lat: 18.6091, lng: 73.7997 },
  { area: "Pimple Nilakh",           city: "Pune", lat: 18.6055, lng: 73.8097 },
  // North Pune / Pimpri-Chinchwad
  { area: "Aundh",                   city: "Pune", lat: 18.5579, lng: 73.8082 },
  { area: "Bopodi",                  city: "Pune", lat: 18.5585, lng: 73.8432 },
  { area: "Pimpri",                  city: "Pimpri-Chinchwad", lat: 18.6180, lng: 73.7998 },
  { area: "Chinchwad",               city: "Pimpri-Chinchwad", lat: 18.6298, lng: 73.8121 },
  { area: "Nigdi",                   city: "Pimpri-Chinchwad", lat: 18.6490, lng: 73.7743 },
  { area: "Bhosari",                 city: "Pimpri-Chinchwad", lat: 18.6338, lng: 73.8463 },
  { area: "Dehu Road",               city: "Pimpri-Chinchwad", lat: 18.6828, lng: 73.7512 },
  // East Pune
  { area: "Koregaon Park",           city: "Pune", lat: 18.5362, lng: 73.8907 },
  { area: "Kalyani Nagar",           city: "Pune", lat: 18.5462, lng: 73.9012 },
  { area: "Viman Nagar",             city: "Pune", lat: 18.5654, lng: 73.9129 },
  { area: "Kharadi",                 city: "Pune", lat: 18.5516, lng: 73.9461 },
  { area: "Wagholi",                 city: "Pune", lat: 18.5794, lng: 73.9806 },
  { area: "Yerawada",                city: "Pune", lat: 18.5553, lng: 73.8977 },
  { area: "Hadapsar",                city: "Pune", lat: 18.5018, lng: 73.9358 },
  { area: "Magarpatta",              city: "Pune", lat: 18.5128, lng: 73.9253 },
  { area: "Mundhwa",                 city: "Pune", lat: 18.5262, lng: 73.9117 },
  { area: "Nagar Road",              city: "Pune", lat: 18.5474, lng: 73.9188 },
  // South Pune
  { area: "Swargate",                city: "Pune", lat: 18.5017, lng: 73.8617 },
  { area: "Bibvewadi",               city: "Pune", lat: 18.4875, lng: 73.8617 },
  { area: "Kondhwa",                 city: "Pune", lat: 18.4688, lng: 73.8862 },
  { area: "Wanowrie",                city: "Pune", lat: 18.4875, lng: 73.8944 },
  { area: "Undri",                   city: "Pune", lat: 18.4603, lng: 73.9043 },
  { area: "Katraj",                  city: "Pune", lat: 18.4514, lng: 73.8684 },
  { area: "Ambegaon Budruk",         city: "Pune", lat: 18.4470, lng: 73.8586 },
  { area: "Dhankawadi",              city: "Pune", lat: 18.4708, lng: 73.8557 },
  { area: "Salisbury Park",          city: "Pune", lat: 18.4854, lng: 73.8761 },
  { area: "NIBM Road",               city: "Pune", lat: 18.4773, lng: 73.9013 },
];

// ── Incident templates (realistic, documented patterns) ────────────────────
const TEMPLATES = [
  // Public transport
  {
    cat: "Eve Teasing", severity: 2, gender: "Female",
    descs: [
      "Was waiting at the PMPML bus stop when a group of men started making loud comments about my appearance and followed me to the next stop. This happens regularly near this area.",
      "On the bus from Swargate, a man kept pressing against me despite the bus not being crowded. When I moved, he followed. The conductor ignored my complaint.",
      "At the auto-rickshaw stand a driver refused to go unless I sat in front with him. Multiple drivers watched and laughed.",
    ]
  },
  {
    cat: "Inappropriate Touch", severity: 3, gender: "Female",
    descs: [
      "In a crowded PMPML bus, a man deliberately touched me inappropriately. When I confronted him he denied it and other passengers told me to 'adjust'.",
      "While boarding an auto a man standing nearby grabbed my dupatta and then pretended it was an accident. bystanders did nothing.",
      "In the local market a shopkeeper touched my hand unnecessarily while giving change. When I objected he became aggressive.",
    ]
  },
  {
    cat: "Stalking", severity: 3, gender: "Female",
    descs: [
      "A man on a black Pulsar bike has been following me on my way to college for the past two weeks. He waits outside my building gate every morning.",
      "After my evening walk in the garden, a man followed me home on foot. He has been doing this every alternate day for a month.",
      "A co-worker has been following me after office hours and photographing me without consent. HR was unhelpful.",
    ]
  },
  {
    cat: "Sexual Harassment at Workplace", severity: 3, gender: "Female",
    descs: [
      "My supervisor in the IT company regularly makes comments about my clothes and has asked me out multiple times after I said no. The HR department has not taken action.",
      "A senior colleague forwarded explicit messages in the team WhatsApp group and laughed it off as a joke. Management is aware and has done nothing.",
      "During a late-night work shift my team lead repeatedly commented on my appearance and stood uncomfortably close. I felt unsafe commuting home.",
    ]
  },
  {
    cat: "Catcalling", severity: 1, gender: "Female",
    descs: [
      "Walking back from the coaching class at 8 PM, a group of boys on bikes drove past and shouted vulgar comments. This stretch of road is poorly lit.",
      "Men sitting outside a paan shop make comments every time women pass by on this road. The police chowk nearby never intervenes.",
      "Every evening on my walk near the lake, groups of young men gather and pass lewd comments at women. Security is absent.",
    ]
  },
  {
    cat: "Voyeurism", severity: 3, gender: "Female",
    descs: [
      "A man was recording women on his phone through gaps in the trial room curtain at a garment shop. Reported to shop staff who dismissed it.",
      "In the ladies' hostel washroom, a phone was found hidden in a shelf. Management tried to hush it up. Police complaint was necessary.",
      "A man in the building opposite has been filming through his window at women in the opposite flats in the evenings.",
    ]
  },
  {
    cat: "Domestic Violence", severity: 3, gender: "Female",
    descs: [
      "My neighbour is beaten by her husband regularly. We can hear it through the walls but when we tried to help she was threatened. Police were slow to respond.",
      "I was assaulted by my husband after asking about household finances. The local police station was dismissive when I complained.",
    ]
  },
  {
    cat: "Online Harassment", severity: 2, gender: "Female",
    descs: [
      "A man from college has been creating fake Instagram accounts to send me abusive messages after I rejected him online.",
      "Multiple accounts morphed my photo and posted on Facebook. Despite reporting nothing was taken down for two weeks.",
    ]
  },
  {
    cat: "Unsafe Area / No Lighting", severity: 1, gender: "Female",
    descs: [
      "The underpass near the station has no lights after 9 PM. Women are regularly harassed there. PMC has been petitioned multiple times with no action.",
      "The lane behind the college campus is extremely dark and isolated. Multiple incidents of snatch-and-run have been reported but it remains unlit.",
      "The stretch from the metro stop to the society gate has no streetlights. Locals have complained several times to the municipal ward office.",
    ]
  },
  {
    cat: "Chain Snatching", severity: 2, gender: "Female",
    descs: [
      "Two men on a motorcycle snatched my gold chain while I was walking on the footpath near the market. They fled towards the highway.",
      "My mangalsutra was snatched near the bus stop by a man who then ran into the lane. The incident happened in broad daylight.",
    ]
  },
  {
    cat: "Rape", severity: 3, gender: "Female",
    descs: [
      "Reporting on behalf of a neighbour who was assaulted by a known acquaintance. The survivor needs support services and the process has been extremely difficult.",
    ]
  },
  {
    cat: "Eve Teasing", severity: 2, gender: "Female",
    descs: [
      "Near the college gate in the evening groups of boys make comments and block the path of women students. Campus security does not patrol this area.",
      "Men regularly park their bikes outside the ladies hostel and harass students entering and leaving. Complained to warden multiple times.",
    ]
  },
  {
    cat: "Inappropriate Touch", severity: 3, gender: "Female",
    descs: [
      "During the Ganesh festival procession, deliberately groped in the crowd. The chaos was used as cover. Hard to identify the perpetrators.",
      "At a crowded ATM, a man stood very close and pressed against me. When I stepped away he followed. I had to leave without completing my transaction.",
    ]
  },
  {
    cat: "Stalking", severity: 2, gender: "Female",
    descs: [
      "A delivery executive has been showing up at my building outside his delivery hours and asking neighbours about me.",
      "An auto-driver asks my neighbours for my schedule and waits for me. He has my number from a previous ride-share and keeps calling.",
    ]
  },
  {
    cat: "Catcalling", severity: 1, gender: "Female",
    descs: [
      "The street-side dhaba near the office lane is a hotspot for whistling and commenting at women in office wear. It is the only route to the metro.",
      "Night-shift cab drivers waiting outside the tech park make inappropriate comments at women waiting for their cabs.",
    ]
  },
  {
    cat: "Unsafe Area / No Lighting", severity: 1, gender: "Female",
    descs: [
      "The parking lot below the mall is poorly monitored at night. Multiple women have reported being followed to their cars.",
      "The footpath on the service road alongside the expressway is extremely unsafe at night. No CCTV, no lighting, and heavy truck traffic.",
    ]
  },
];

// ── Date helpers ───────────────────────────────────────────────────────────
function randomDate(from, to) {
  return new Date(from + Math.random() * (to - from));
}
const FROM = new Date("2019-01-01").getTime();
const TO   = new Date("2026-02-01").getTime();

function fmtDate(d) {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}
function fmtTime(h, m) {
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:00`;
}

const AGE_BANDS = ["18","19","20","21","22","23","24","25","26","27","28","30","32","35","38","42","45"];

// ── Build incidents ────────────────────────────────────────────────────────
const incidents = [];
let scIdCounter = 900100;

// We want ~300 nicely distributed across all zones
const TARGET = 300;
let idx = 0;

while (incidents.length < TARGET) {
  const zone = ZONES[idx % ZONES.length];
  idx++;

  // Jitter lat/lng a little so markers don't stack
  const lat = zone.lat + (Math.random() - 0.5) * 0.012;
  const lng = zone.lng + (Math.random() - 0.5) * 0.012;

  const tmpl = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];
  const desc = tmpl.descs[Math.floor(Math.random() * tmpl.descs.length)];

  const d = randomDate(FROM, TO);
  // Incidents cluster in evening/night: 18-23h or early morning commute 7-9h
  const hourPool = [7,8,9,18,19,20,21,22,23,0,1];
  const h = hourPool[Math.floor(Math.random() * hourPool.length)];
  const m = Math.floor(Math.random() * 60);

  const age = AGE_BANDS[Math.floor(Math.random() * AGE_BANDS.length)];

  incidents.push({
    scId: String(scIdCounter++),
    categories: tmpl.cat,
    description: desc,
    location: { type: "Point", coordinates: [lng, lat] },
    locationText: `${zone.area}, ${zone.city}, Maharashtra`,
    dateText: fmtDate(d),
    timeText: `${fmtTime(h, m)} - ${fmtTime((h+1)%24, m)}`,
    age,
    gender: Math.random() < 0.93 ? "Female" : "Male",
    severity: tmpl.severity,
    timestamp: d,
    scrapedAt: new Date(),
    raw: {
      id: String(scIdCounter - 1),
      area: zone.area,
      city: zone.city,
      state: "Maharashtra",
      description: desc,
      categories: tmpl.cat,
      age,
      incident_date: d.toISOString().slice(0, 10),
      time_from: fmtTime(h, m),
      time_to: fmtTime((h+1)%24, m),
      _seeded: true,
    },
  });
}

// ── Upsert ─────────────────────────────────────────────────────────────────
const ops = incidents.map(doc => ({
  updateOne: {
    filter: { scId: doc.scId },
    update: { $set: doc },
    upsert: true,
  },
}));

const result = await SC.bulkWrite(ops, { ordered: false });
console.log(`\n✅ Seeded ${result.upsertedCount} new + ${result.modifiedCount} updated realistic incidents`);

const total     = await SC.countDocuments();
const enriched  = await SC.countDocuments({ categories: { $ne: "" } });
const bare      = total - enriched;
console.log(`📊 DB now: ${total} total | ${enriched} enriched | ${bare} bare`);

await mongoose.disconnect();
