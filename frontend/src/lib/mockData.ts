// Mock data for the Safe Route Navigation App

export interface PoliceStation {
  id: string;
  name: string;
  address: string;
  phone: string;
  lat: number;
  lng: number;
  jurisdiction?: string;
  distance?: string;
}

export interface Incident {
  id: string;
  type: "harassment" | "stalking" | "assault" | "theft" | "unsafe_area";
  description: string;
  lat: number;
  lng: number;
  timestamp: string;
  anonymous: boolean;
  severity: 1 | 2 | 3;
  areaRating?: number;
  imageUrl?: string;
  locationText?: string;
  pointsAwarded?: number;
}

export interface RouteCheckpoint {
  name: string;
  type: "police" | "hospital" | "commercial" | "landmark";
  lat: number;
  lng: number;
  eta: string;       // estimated time to reach, e.g. "3 min"
  passed: boolean;   // whether user has passed this checkpoint
}

export interface RouteOption {
  id: string;
  name: string;
  type: "safest" | "moderate" | "fastest";
  rsi: number; // Road Safety Index 0-100
  duration: string;
  distance: string;
  color: string;
  coordinates: [number, number][];
  reasons?: string[];
  steps?: Array<{ instruction: string; distance: number; duration: number; location: [number, number] }>;
  checkpoints?: RouteCheckpoint[];
}

export interface TrustedContact {
  id: string;
  name: string;
  phone: string;
  relation: string;
}

export interface DemoLocation {
  name: string;
  lat: number;
  lng: number;
}

// Pune, India mock data
export const PUNE_CENTER: [number, number] = [73.8567, 18.5204];

export const demoLocations: DemoLocation[] = [
  { name: "Pune Station", lat: 18.5286, lng: 73.8746 },
  { name: "FC Road", lat: 18.5206, lng: 73.8410 },
  { name: "Shivajinagar", lat: 18.5308, lng: 73.8475 },
  { name: "Deccan Gymkhana", lat: 18.5179, lng: 73.8417 },
  { name: "Swargate", lat: 18.5018, lng: 73.8636 },
  { name: "Kothrud", lat: 18.5074, lng: 73.8077 },
  { name: "Hadapsar", lat: 18.5089, lng: 73.9260 },
  { name: "Koregaon Park", lat: 18.5362, lng: 73.8930 },
  { name: "Viman Nagar", lat: 18.5679, lng: 73.9143 },
  { name: "Aundh", lat: 18.5590, lng: 73.8077 },
  { name: "Lonavala", lat: 18.7546, lng: 73.4062 },
  { name: "Baner", lat: 18.5591, lng: 73.7868 },
  { name: "Wakad", lat: 18.5987, lng: 73.7601 },
  { name: "Hinjewadi", lat: 18.5912, lng: 73.7389 },
  { name: "Pimpri", lat: 18.6230, lng: 73.7998 },
  { name: "Chinchwad", lat: 18.6440, lng: 73.7969 },
  { name: "Vishrantwadi", lat: 18.5833, lng: 73.9005 },
  { name: "Yerawada", lat: 18.5509, lng: 73.8954 },
  { name: "Kalyani Nagar", lat: 18.5494, lng: 73.9044 },
  { name: "Wanowrie", lat: 18.4883, lng: 73.8926 },
  { name: "Katraj", lat: 18.4531, lng: 73.8626 },
  { name: "Bibwewadi", lat: 18.4786, lng: 73.8647 },
  { name: "Saswad", lat: 18.3450, lng: 74.0170 },
  { name: "Pimpale Saudagar", lat: 18.6020, lng: 73.7999 },
  { name: "Balewadi", lat: 18.5657, lng: 73.7794 },
  { name: "Sus Road", lat: 18.5433, lng: 73.7632 },
  { name: "Magarpatta City", lat: 18.5130, lng: 73.9293 },
  { name: "Camp Area", lat: 18.5112, lng: 73.8882 },
  { name: "MG Road Pune", lat: 18.5204, lng: 73.8567 },
  { name: "JM Road", lat: 18.5184, lng: 73.8396 },
  { name: "Karve Road", lat: 18.5049, lng: 73.8223 },
  { name: "Parvati Hill", lat: 18.4940, lng: 73.8530 },
  { name: "Wada", lat: 18.5430, lng: 73.8310 },
  { name: "Dhankawdi", lat: 18.4699, lng: 73.8598 },
  { name: "Kondhwa", lat: 18.4700, lng: 73.8941 },
  { name: "Undri", lat: 18.4576, lng: 73.9112 },
  { name: "Kharadi", lat: 18.5526, lng: 73.9430 },
  { name: "Wagholi", lat: 18.5672, lng: 73.9762 },
  { name: "Mundhwa", lat: 18.5219, lng: 73.9219 },
  { name: "Lohegaon", lat: 18.5861, lng: 73.9107 },
  { name: "Dhanori", lat: 18.5900, lng: 73.9019 },
  { name: "Chakan", lat: 18.7602, lng: 73.8649 },
  { name: "Talegaon", lat: 18.7274, lng: 73.6736 },
  { name: "Alandi", lat: 18.6748, lng: 73.8978 },
  { name: "Dehu Road", lat: 18.6720, lng: 73.7512 },
  { name: "Ambegaon", lat: 18.5230, lng: 73.8060 },
  { name: "Nanded City", lat: 18.4586, lng: 73.8196 },
  { name: "Warje", lat: 18.4894, lng: 73.8098 },
  { name: "Bavdhan", lat: 18.5154, lng: 73.7823 },
  { name: "Pashan", lat: 18.5323, lng: 73.8011 },
  { name: "Model Colony", lat: 18.5280, lng: 73.8388 },
  { name: "Pune University", lat: 18.5590, lng: 73.8124 },
  { name: "Nashik Road", lat: 18.5781, lng: 73.8571 },
  { name: "Vanaz", lat: 18.5062, lng: 73.7929 },
];

export const policeStations: PoliceStation[] = [
  { id: "ps-a3", name: "Hadapsar Police Station", address: "Sholapur Rd, Gadital, Hadapsar, Pune 411028", phone: "020-26870101", lat: 18.5004347, lng: 73.9395879, jurisdiction: "Hadapsar" },
  { id: "ps-a4", name: "Police Station, Undri", address: "Hadapsar Rd, Tarawade Vasti, Undri, Pune 411028", phone: "020-26870102", lat: 18.4752589, lng: 73.924989, jurisdiction: "Undri" },
  { id: "ps-a5", name: "Bibwewadi Police Station", address: "Swami Vivekanand Rd, Upper Indira Nagar, Bibvewadi, Pune 411037", phone: "020-24211037", lat: 18.4672524, lng: 73.8641823, jurisdiction: "Bibwewadi" },
  { id: "ps-a6", name: "Centre of Police Research", address: "Pashan Rd, Pashan, Pune 411008", phone: "020-25870303", lat: 18.54072, lng: 73.822497, jurisdiction: "Pashan" },
  { id: "ps-a7", name: "Katraj Police Chowki", address: "Katraj Chowk, Santosh Nagar, Pune 411038", phone: "020-24370104", lat: 18.4467405, lng: 73.8585979, jurisdiction: "Katraj" },
  { id: "ps-a8", name: "Warje Malwadi Police Chowki", address: "Giridhar Nagar, Warje, Pune 411058", phone: "020-25230105", lat: 18.4804818, lng: 73.8009341, jurisdiction: "Warje" },
  { id: "ps-a9", name: "Prabhat Police Chowky", address: "Prabhat Rd, Deccan, Erandwana, Pune 411004", phone: "020-25670106", lat: 18.5144406, lng: 73.8332788, jurisdiction: "Deccan" },
  { id: "ps-aa", name: "Balgandharva Police Chowky", address: "Jangali Maharaj Rd, Shivajinagar, Pune 411004", phone: "020-25530107", lat: 18.5219448, lng: 73.8475182, jurisdiction: "Shivajinagar" },
  { id: "ps-ab", name: "Sahakar Nagar Police Station", address: "Near Padmavati Temple, Parvati, Pune 411048", phone: "020-24220108", lat: 18.4645115, lng: 73.8872252, jurisdiction: "Sahakar Nagar" },
  { id: "ps-ac", name: "Sinhgad Road Police Station", address: "Sun City Rd, Daulat Nagar, Pune 411051", phone: "020-24350109", lat: 18.473053, lng: 73.8142409, jurisdiction: "Sinhgad Road" },
  { id: "ps-ad", name: "Ramoshi Gate Police Station", address: "Jawaharlal Nehru Rd, Bhawani Peth, Pune", phone: "020-26130110", lat: 18.5109077, lng: 73.8682398, jurisdiction: "Bhawani Peth" },
  { id: "ps-ae", name: "Mangaldas Police Station", address: "Bund Garden Rd, Sangamvadi, Pune 411001", phone: "020-26120111", lat: 18.5340392, lng: 73.8789242, jurisdiction: "Sangamvadi" },
  { id: "ps-af", name: "Tadiwala Police Station", address: "Lumbini Nagar, Sangamvadi, Pune 411001", phone: "020-26120112", lat: 18.537371, lng: 73.873285, jurisdiction: "Sangamvadi" },
  { id: "ps-b0", name: "Chaturshringi Police Station", address: "Pashan Rd, NCL Colony, Pashan, Pune 411008", phone: "020-25880113", lat: 18.5427018, lng: 73.8287244, jurisdiction: "Pashan" },
  { id: "ps-b1", name: "Padamjee Police Chowki", address: "Waghmare Guruji Path, Bhawani Peth, Pune 411001", phone: "020-26130114", lat: 18.5106336, lng: 73.8720847, jurisdiction: "Bhawani Peth" },
  { id: "ps-b2", name: "Mundhawa Police Thane", address: "Mundhwa Rd, Magarpatta City, Mundhwa, Pune 411036", phone: "020-26870115", lat: 18.5343871, lng: 73.9276151, jurisdiction: "Mundhwa" },
  { id: "ps-b3", name: "Kothrud Police Station", address: "Paud Rd, Navbhumi, Shastri Nagar, Kothrud, Pune 411038", phone: "020-25380116", lat: 18.5065927, lng: 73.8024563, jurisdiction: "Kothrud" },
  { id: "ps-b4", name: "Lashkar Police Station", address: "Hulshur, Camp, Pune 411001", phone: "020-26330117", lat: 18.5136943, lng: 73.8807204, jurisdiction: "Camp" },
  { id: "ps-b5", name: "Perugate Police Chowky", address: "Karandiikar Rd, Perugate, Sadashiv Peth, Pune 411030", phone: "020-24470118", lat: 18.5114354, lng: 73.8487609, jurisdiction: "Sadashiv Peth" },
  { id: "ps-b6", name: "Senadatta Police Chowky", address: "Lal Bahadur Shastri Rd, Sadashiv Peth, Pune 411030", phone: "020-24470119", lat: 18.5051906, lng: 73.8446065, jurisdiction: "Sadashiv Peth" },
  { id: "ps-b7", name: "Chaturshrungi Police Station", address: "Vidyapeeth Road, Ganeshkhind, Pune 411007", phone: "020-25880120", lat: 18.5465749, lng: 73.8258359, jurisdiction: "Ganeshkhind" },
  { id: "ps-b8", name: "Kasba Peth Police Station", address: "Shnivarwada, Shivaji Rd, Kasba Peth, Pune 411011", phone: "020-24470121", lat: 18.520495, lng: 73.8559879, jurisdiction: "Kasba Peth" },
  { id: "ps-b9", name: "Narhe Police Station", address: "Wadgaon Budruk, Narhe, Pune 411041", phone: "020-24350122", lat: 18.4568042, lng: 73.8243712, jurisdiction: "Narhe" },
  { id: "ps-ba", name: "Kondhwa Police Station", address: "Kondhwa Road, Kondhwa, Pune 411048", phone: "020-26890123", lat: 18.4660622, lng: 73.8906096, jurisdiction: "Kondhwa" },
  { id: "ps-bb", name: "Samarth Police Station", address: "Somwar Peth, Pune 411011", phone: "020-24440124", lat: 18.5202459, lng: 73.869658, jurisdiction: "Somwar Peth" },
  { id: "ps-bc", name: "Alankar Police Station", address: "Alankar Pool Rd, Erandwane, Pune 411052", phone: "020-25430125", lat: 18.498391, lng: 73.826179, jurisdiction: "Erandwane" },
  { id: "ps-bd", name: "Aundh Police Station", address: "Ward No. 8, Aundh Gaon, Aundh, Pune 411027", phone: "020-27280126", lat: 18.5616086, lng: 73.8136243, jurisdiction: "Aundh" },
  { id: "ps-be", name: "Sahakar Nagar Police Chowky", address: "Walvekar Nagar, Parvati Paytha, Pune 411009", phone: "020-24220127", lat: 18.4783181, lng: 73.8515392, jurisdiction: "Parvati" },
  { id: "ps-bf", name: "CID Office", address: "Shivaji Nagar, Near Sangam Bridge, Pune 411001", phone: "020-25500128", lat: 18.5291703, lng: 73.8590245, jurisdiction: "Shivajinagar" },
  { id: "ps-c0", name: "Police Wireless & Spl", address: "Chandan Nagar, Pashan Road, Pashan, Pune 411008", phone: "020-25870129", lat: 18.5390577, lng: 73.8094622, jurisdiction: "Pashan" },
  { id: "ps-c1", name: "Police Wireless M S & Spl I G P", address: "Pashan, Pune 411021", phone: "020-25870130", lat: 18.5352778, lng: 73.7827778, jurisdiction: "Pashan" },
  { id: "ps-c2", name: "Nana Peth Police Chowky", address: "Vednath S Marg, Rasta Peth, Pune", phone: "020-26130131", lat: 18.5158349, lng: 73.8646487, jurisdiction: "Rasta Peth" },
  { id: "ps-c3", name: "Khadi Machine Police Chowki", address: "Katraj–Kondhwa Rd, Kondhwa Budruk, Pune 411048", phone: "020-26890132", lat: 18.4530801, lng: 73.8836263, jurisdiction: "Kondhwa" },
  { id: "ps-c4", name: "Narpatgiri Police Chowki", address: "Jawaharlal Nehru Rd, Mangalwar Peth, Pune", phone: "020-24440133", lat: 18.522685, lng: 73.8673704, jurisdiction: "Mangalwar Peth" },
  { id: "ps-c5", name: "Karve Nagar Police Station", address: "Warje Malwadi Rd, Karve Nagar, Pune 411052", phone: "020-25430134", lat: 18.4907586, lng: 73.8153671, jurisdiction: "Karve Nagar" },
  { id: "ps-c6", name: "Vimantal Police Station", address: "Pune-Ahmednagar Hwy, Viman Nagar, Pune 411014", phone: "020-26630135", lat: 18.5659195, lng: 73.9149293, jurisdiction: "Viman Nagar" },
  { id: "ps-c7", name: "Vishrantwadi Police Station", address: "Mental Corner, Yerawada, Alandi Rd, Pune 411006", phone: "020-27050136", lat: 18.5648596, lng: 73.8777822, jurisdiction: "Vishrantwadi" },
  { id: "ps-c8", name: "Koregaon Park Police Station", address: "Lane No. 4-A, Pune 411001", phone: "020-26150137", lat: 18.533497, lng: 73.8856255, jurisdiction: "Koregaon Park" },
  { id: "ps-c9", name: "Parnakuti Police Chowkey", address: "Nawanagar, Sangamvadi, Pune 411006", phone: "020-26120138", lat: 18.5446855, lng: 73.884393, jurisdiction: "Sangamvadi" },
  { id: "ps-ca", name: "Magarpatta Police Station", address: "Magarpatta Police Station Rd, Hadapsar, Pune", phone: "020-26870139", lat: 18.5201846, lng: 73.9311821, jurisdiction: "Hadapsar" },
  { id: "ps-cb", name: "Bundgarden Police Station", address: "Moledina Road, near Collector Office, Somwar Peth, Pune", phone: "020-26120140", lat: 18.5239477, lng: 73.8705049, jurisdiction: "Bund Garden" },
  { id: "ps-cc", name: "Camp Police Station", address: "Church Path, Agarkar Nagar, Pune 411001", phone: "020-26330141", lat: 18.5222714, lng: 73.875458, jurisdiction: "Camp" },
  { id: "ps-cd", name: "Haveli Police Station", address: "Sinhagad Rd, Wadgaon Budruk, Narhe, Pune 411041", phone: "020-24350142", lat: 18.4660485, lng: 73.8165252, jurisdiction: "Haveli" },
  { id: "ps-ce", name: "Bavdhan Police Station", address: "Pashan Rd, Ram Nagar, Bavdhan, Pune 411021", phone: "020-22950143", lat: 18.522595, lng: 73.7798764, jurisdiction: "Bavdhan" },
  { id: "ps-cf", name: "Chandan Nagar Police Station", address: "Old Mundhwa Road, Chandan Nagar, Pune", phone: "020-27050144", lat: 18.5572314, lng: 73.9290673, jurisdiction: "Chandan Nagar" },
  { id: "ps-d0", name: "Police Station, Koregaon Park", address: "N Main Rd, Meera Nagar, Koregaon Park", phone: "020-26150145", lat: 18.5394402, lng: 73.8998047, jurisdiction: "Koregaon Park" },
  { id: "ps-d1", name: "Deccan Police Station", address: "759/5, Prabhat Road, Deccan Gymkhana, Pune 411004", phone: "020-25670146", lat: 18.5142766, lng: 73.8401408, jurisdiction: "Deccan" },
  { id: "ps-d2", name: "Dattawadi Police Station", address: "Shahu College Rd, Parvati Paytha, Pune 411009", phone: "020-24220147", lat: 18.4927624, lng: 73.8482885, jurisdiction: "Dattawadi" },
  { id: "ps-d3", name: "Kothrud Police Station (Paud Rd)", address: "Paud Rd, Gokhalenagar, Pune 411038", phone: "020-25380148", lat: 18.5063372, lng: 73.8248365, jurisdiction: "Kothrud" },
  { id: "ps-d4", name: "Khadak Police Station", address: "Shivaji Rd, Shukrawar Peth, Pune 411002", phone: "020-24470149", lat: 18.5075017, lng: 73.8581684, jurisdiction: "Shukrawar Peth" },
  { id: "ps-d5", name: "Swargate Police Station", address: "Police Colony, Swargate, Pune 411042", phone: "020-24440150", lat: 18.5006875, lng: 73.8595987, jurisdiction: "Swargate" },
  { id: "ps-d6", name: "Shivajinagar Police Station", address: "Opp. S.S.C-H.S.C. Board, Shivajinagar, Pune 411005", phone: "020-25500151", lat: 18.5300524, lng: 73.850092, jurisdiction: "Shivajinagar" },
  { id: "ps-d7", name: "Police Station, Guruwar Peth", address: "Guruwar Peth, Pune 411042", phone: "020-24440152", lat: 18.5040991, lng: 73.8627441, jurisdiction: "Guruwar Peth" },
  { id: "ps-d8", name: "Bharati Vidyapeeth Police Station", address: "NH 4, Dhankawadi, Pune 411043", phone: "020-24370153", lat: 18.458988, lng: 73.8577343, jurisdiction: "Dhankawadi" },
  { id: "ps-d9", name: "Wanawadi Police Station", address: "Hadapsar Industrial Estate, Hadapsar, Pune", phone: "020-26870154", lat: 18.5071596, lng: 73.9177621, jurisdiction: "Wanawadi" },
  { id: "ps-da", name: "Yerwada Police Station", address: "Loop Road, Shastrinagar, Yerawada, Pune 411006", phone: "020-26680155", lat: 18.5525753, lng: 73.8960144, jurisdiction: "Yerawada" },
  { id: "ps-db", name: "Narayan Peth Police Station", address: "Narayan Peth, Pune 411030", phone: "020-24470156", lat: 18.5162231, lng: 73.8479023, jurisdiction: "Narayan Peth" },
  { id: "ps-dc", name: "Police Station, Warje", address: "Warje Malwadi Rd, Giridhar Nagar, Warje, Pune 411058", phone: "020-25230157", lat: 18.4814154, lng: 73.8019738, jurisdiction: "Warje" },
];

export const incidents: Incident[] = [
  { id: "i1", type: "harassment", description: "Eve-teasing reported near bus stop", lat: 18.5250, lng: 73.8500, timestamp: "2024-01-15T22:30:00", anonymous: true, severity: 2 },
  { id: "i2", type: "stalking", description: "Woman followed from market area", lat: 18.5100, lng: 73.8700, timestamp: "2024-01-14T20:15:00", anonymous: true, severity: 3 },
  { id: "i3", type: "unsafe_area", description: "Poorly lit street, no CCTV", lat: 18.5350, lng: 73.8300, timestamp: "2024-01-13T23:00:00", anonymous: false, severity: 2 },
  { id: "i4", type: "theft", description: "Phone snatching incident", lat: 18.5200, lng: 73.8900, timestamp: "2024-01-12T21:45:00", anonymous: true, severity: 2 },
  { id: "i5", type: "assault", description: "Physical assault reported", lat: 18.5000, lng: 73.8400, timestamp: "2024-01-11T01:30:00", anonymous: true, severity: 3 },
  { id: "i6", type: "harassment", description: "Catcalling near college", lat: 18.5280, lng: 73.8550, timestamp: "2024-01-10T18:00:00", anonymous: false, severity: 1 },
  { id: "i7", type: "unsafe_area", description: "Deserted area after dark", lat: 18.5150, lng: 73.8150, timestamp: "2024-01-09T22:00:00", anonymous: true, severity: 2 },
  { id: "i8", type: "stalking", description: "Suspicious vehicle following", lat: 18.5400, lng: 73.8800, timestamp: "2024-01-08T19:30:00", anonymous: true, severity: 3 },
];

export const mockRoutes: RouteOption[] = [
  {
    id: "r1",
    name: "Via FC Road & University",
    type: "safest",
    rsi: 92,
    duration: "28 min",
    distance: "8.2 km",
    color: "#22c55e",
    coordinates: [
      [73.8567, 18.5204], [73.8500, 18.5250], [73.8446, 18.5314],
      [73.8413, 18.5350], [73.8380, 18.5400], [73.8350, 18.5450],
    ],
  },
  {
    id: "r2",
    name: "Via JM Road",
    type: "moderate",
    rsi: 74,
    duration: "22 min",
    distance: "6.8 km",
    color: "#f59e0b",
    coordinates: [
      [73.8567, 18.5204], [73.8520, 18.5180], [73.8460, 18.5167],
      [73.8413, 18.5200], [73.8380, 18.5300], [73.8350, 18.5450],
    ],
  },
  {
    id: "r3",
    name: "Via Swargate Direct",
    type: "fastest",
    rsi: 51,
    duration: "16 min",
    distance: "5.1 km",
    color: "#ef4444",
    coordinates: [
      [73.8567, 18.5204], [73.8600, 18.5150], [73.8636, 18.5018],
      [73.8550, 18.5100], [73.8450, 18.5300], [73.8350, 18.5450],
    ],
  },
];

export const defaultContacts: TrustedContact[] = [
  { id: "c1", name: "Mom", phone: "+91 98765 43210", relation: "Mother" },
  { id: "c2", name: "Best Friend", phone: "+91 98765 43211", relation: "Friend" },
];

// ── Safety infrastructure ──────────────────────────────────────────────────────
export type SafeZoneType = "police" | "hospital" | "commercial";

export interface SafeZone {
  lat: number;
  lng: number;
  type: SafeZoneType;
  name: string;
  safety: number; // 0-100
}

export interface CrimeHotspot {
  lat: number;
  lng: number;
  name: string;
  danger: number; // 0-100
  incidents: number;
  issues: string[];
}

export const safeZones: SafeZone[] = [
  // Police Stations
  { lat: 18.5204, lng: 73.8567, type: "police", name: "Shivajinagar Police Station", safety: 95 },
  { lat: 18.4899, lng: 73.8056, type: "police", name: "Pune Cantonment Police", safety: 93 },
  { lat: 18.5640, lng: 73.7802, type: "police", name: "Vishrantwadi Police Station", safety: 92 },
  { lat: 18.4574, lng: 73.8077, type: "police", name: "Koregaon Park Police Station", safety: 94 },
  { lat: 18.5089, lng: 73.8553, type: "police", name: "Camp Police Station", safety: 91 },
  { lat: 18.5018, lng: 73.8636, type: "police", name: "Swargate Police Station", safety: 90 },
  // Hospitals
  { lat: 18.5104, lng: 73.8467, type: "hospital", name: "KEM Hospital", safety: 90 },
  { lat: 18.5304, lng: 73.8367, type: "hospital", name: "Ruby Hall Clinic", safety: 88 },
  { lat: 18.4532, lng: 73.8677, type: "hospital", name: "Sassoon Hospital", safety: 87 },
  { lat: 18.5608, lng: 73.7728, type: "hospital", name: "Aditya Birla Memorial Hospital", safety: 89 },
  { lat: 18.4988, lng: 73.8213, type: "hospital", name: "Deenanath Mangeshkar Hospital", safety: 86 },
  { lat: 18.5590, lng: 73.9143, type: "hospital", name: "Columbia Asia Hospital", safety: 85 },
  // Safe Commercial / IT Areas
  { lat: 18.5404, lng: 73.8767, type: "commercial", name: "Phoenix MarketCity", safety: 85 },
  { lat: 18.5604, lng: 73.7767, type: "commercial", name: "Amanora Mall", safety: 82 },
  { lat: 18.5200, lng: 73.8500, type: "commercial", name: "Camp Area Shopping", safety: 80 },
  { lat: 18.4700, lng: 73.8300, type: "commercial", name: "MG Road Commercial", safety: 83 },
  { lat: 18.5300, lng: 73.8400, type: "commercial", name: "JM Road Commercial", safety: 81 },
  { lat: 18.5679, lng: 73.9143, type: "commercial", name: "Viman Nagar IT Hub", safety: 84 },
  { lat: 18.5912, lng: 73.7389, type: "commercial", name: "Hinjewadi IT Park", safety: 83 },
];

export const crimeHotspots: CrimeHotspot[] = [
  { lat: 18.5004, lng: 73.8667, name: "Industrial Area – Poorly Lit", danger: 85, incidents: 12, issues: ["Poor lighting", "Isolated area", "Limited police patrol"] },
  { lat: 18.4704, lng: 73.8567, name: "Under Construction Zone – Hadapsar", danger: 78, incidents: 8, issues: ["Construction barriers", "Unlit roads", "Fewer people"] },
  { lat: 18.5804, lng: 73.8467, name: "Remote Area – Kharadi", danger: 82, incidents: 15, issues: ["Remote location", "Limited CCTV", "Dark alleys"] },
  { lat: 18.4404, lng: 73.8200, name: "Highway Stretch – Kondhwa", danger: 88, incidents: 20, issues: ["Isolated highway", "Limited help", "Poor street lighting"] },
  { lat: 18.5500, lng: 73.7900, name: "Underpass – Aundh", danger: 92, incidents: 25, issues: ["Dark underpass", "Echo chamber", "Limited visibility"] },
  { lat: 18.4800, lng: 73.8800, name: "Old Pune Area – Narrow Lanes", danger: 95, incidents: 30, issues: ["Narrow lanes", "Old buildings", "Poor lighting"] },
  { lat: 18.5150, lng: 73.9050, name: "Deserted Stretch – Wadgaon", danger: 75, incidents: 10, issues: ["No CCTV", "Deserted at night", "Far from police"] },
  { lat: 18.5700, lng: 73.8600, name: "Dark Road – Dhanori", danger: 80, incidents: 14, issues: ["Broken streetlights", "No pedestrian path", "Night crimes reported"] },
];

export const incidentTypes = [
  { value: "harassment", label: "Harassment" },
  { value: "stalking", label: "Stalking" },
  { value: "assault", label: "Assault" },
  { value: "theft", label: "Theft / Snatching" },
  { value: "unsafe_area", label: "Unsafe Area" },
];
