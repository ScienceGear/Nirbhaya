// Mock data for the Safe Route Navigation App

export interface PoliceStation {
  id: string;
  name: string;
  address: string;
  phone: string;
  lat: number;
  lng: number;
  jurisdiction: string;
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
}

export interface TrustedContact {
  id: string;
  name: string;
  phone: string;
  relation: string;
}

// Pune, India mock data
export const PUNE_CENTER: [number, number] = [73.8567, 18.5204];

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

export const heatmapData = [
  { lat: 18.5250, lng: 73.8500, weight: 0.8 },
  { lat: 18.5100, lng: 73.8700, weight: 0.9 },
  { lat: 18.5350, lng: 73.8300, weight: 0.6 },
  { lat: 18.5200, lng: 73.8900, weight: 0.7 },
  { lat: 18.5000, lng: 73.8400, weight: 0.95 },
  { lat: 18.5280, lng: 73.8550, weight: 0.5 },
  { lat: 18.5150, lng: 73.8150, weight: 0.65 },
  { lat: 18.5400, lng: 73.8800, weight: 0.85 },
  { lat: 18.5180, lng: 73.8620, weight: 0.4 },
  { lat: 18.5320, lng: 73.8380, weight: 0.55 },
];

export const incidentTypes = [
  { value: "harassment", label: "Harassment" },
  { value: "stalking", label: "Stalking" },
  { value: "assault", label: "Assault" },
  { value: "theft", label: "Theft / Snatching" },
  { value: "unsafe_area", label: "Unsafe Area" },
];
