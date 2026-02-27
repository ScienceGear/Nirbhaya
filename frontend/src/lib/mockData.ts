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
  { id: "ps1", name: "Shivajinagar Police Station", address: "FC Road, Shivajinagar, Pune", phone: "020-25501234", lat: 18.5314, lng: 73.8446, jurisdiction: "Shivajinagar", distance: "1.2 km" },
  { id: "ps2", name: "Deccan Police Station", address: "JM Road, Deccan Gymkhana, Pune", phone: "020-25652345", lat: 18.5167, lng: 73.8413, jurisdiction: "Deccan", distance: "2.1 km" },
  { id: "ps3", name: "Kothrud Police Station", address: "Karve Road, Kothrud, Pune", phone: "020-25383456", lat: 18.5074, lng: 73.8077, jurisdiction: "Kothrud", distance: "3.5 km" },
  { id: "ps4", name: "Swargate Police Station", address: "Swargate, Pune", phone: "020-24444567", lat: 18.5018, lng: 73.8636, jurisdiction: "Swargate", distance: "2.8 km" },
  { id: "ps5", name: "Koregaon Park Police Station", address: "North Main Rd, Koregaon Park", phone: "020-26155678", lat: 18.5362, lng: 73.8930, jurisdiction: "Koregaon Park", distance: "4.2 km" },
  { id: "ps6", name: "Hadapsar Police Station", address: "Hadapsar, Pune", phone: "020-26876789", lat: 18.5089, lng: 73.9260, jurisdiction: "Hadapsar", distance: "6.1 km" },
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
