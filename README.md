# Nirbhaya - Safety & Emergency Response Platform

A comprehensive safety and emergency response application designed to help users feel secure and get immediate assistance when needed. Nirbhaya (meaning "fearless" in Sanskrit) provides real-time location tracking, emergency alerts, police contacts, and incident reporting capabilities.

![Nirbhaya](https://img.shields.io/badge/Nirbhaya-Safety%20Platform-green)
![React](https://img.shields.io/badge/React-18.3-blue)
![Express](https://img.shields.io/badge/Express-5.2-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)
![License](https://img.shields.io/badge/License-ISC-yellow)

## 🚨 Features

### Core Features
- **SOS Emergency Button** - One-tap emergency alert to send location and distress signal to emergency contacts
- **Real-time Location Tracking** - Track user location using H3 spatial indexing and Socket.io
- **Police Contacts** - Quick access to police stations and emergency services with nearby location
- **Incident Reporting** - File detailed reports with location, description, and evidence
- **Safety Dashboard** - Real-time safety metrics, alerts, and geographic insights
- **User Authentication** - Secure JWT-based authentication system

### Advanced Features
- **Hexagonal Geofencing** - H3-based spatial indexing for location services
- **Live Notifications** - Real-time alerts via Socket.io
- **Dark/Light Theme** - Customizable UI themes
- **Multi-language Support** - Internationalization support
- **Privacy & Terms** - Comprehensive privacy controls

## 🏗️ Architecture

This is a **monorepo** project using npm workspaces with two main applications:

```
nirbhaya/
├── frontend/          # React + Vite + TypeScript application
│   ├── src/
│   │   ├── components/   # UI components (shadcn/ui)
│   │   ├── pages/        # Page components
│   │   ├── hooks/        # Custom React hooks
│   │   └── lib/          # Utilities, API, auth
│   └── package.json
├── backend/           # Express + Socket.io API
│   ├── controller/    # Route handlers
│   ├── routes/        # API routes
│   ├── model/         # MongoDB models
│   ├── middleware/   # Auth middleware
│   ├── library/      # Utilities
│   └── package.json
└── package.json      # Root workspace config
```

## 🛠️ Tech Stack

### Frontend
- **Vite** - Fast build tool and development server
- **React 18** - UI library
- **TypeScript** - Type-safe JavaScript
- **shadcn/ui** - Beautiful and accessible components
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **React Leaflet** - Interactive maps
- **Recharts** - Data visualization
- **Socket.io Client** - Real-time communication
- **TanStack Query** - Data fetching

### Backend
- **Express** - Web framework
- **Socket.io** - Real-time bidirectional communication
- **MongoDB + Mongoose** - Database
- **JWT** - Authentication
- **Bcrypt** - Password hashing
- **Groq SDK** - AI integration
- **H3-js** - Spatial indexing

## 📋 Prerequisites

- Node.js 18+ installed
- MongoDB (local or Atlas)
- npm or yarn

## 🚀 Getting Started

### Installation

```bash
# Clone the repository
git clone https://github.com/ScienceGear/Nirbhaya.git


# Install all dependencies (monorepo)
npm install

# Or install individually
npm installcd Nirbhaya --workspace frontend
npm install --workspace backend
```

### Configuration

Create a `.env` file in the `backend/` directory:

```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/nirbhaya
JWT_SECRET=your-secret-key
GROQ_API_KEY=your-groq-api-key
```

### Development

```bash
# Run both frontend and backend concurrently
npm run dev

# Or run individually
npm run dev:frontend  # Runs on http://localhost:5173
npm run dev:backend  # Runs on http://localhost:3000
```

### Production Build

```bash
# Build frontend
npm run build

# Preview production build
npm run preview
```

## 📱 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Tracker
- `POST /api/tracker/update` - Update location
- `GET /api/tracker/:userId` - Get user location

### Reports
- `POST /api/report/create` - Create incident report
- `GET /api/report/user/:userId` - Get user reports
- `GET /api/report/hex/:h3Index` - Get reports in hex area

### Hex
- `GET /api/hex/:h3Index` - Get hex information
- `GET /api/hex/safety/:h3Index` - Get safety metrics

### Navigation
- `GET /api/navigation/safe-route` - Calculate safe route
- `GET /api/navigation/nearby-police` - Find nearby police

## 🔐 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Cookie-based session management
- CORS configuration
- Input validation
- Secure API routes

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 🙏 Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for the beautiful component library
- [H3](https://h3geo.org/) for spatial indexing
- [Socket.io](https://socket.io/) for real-time capabilities

---

<p align="center">Made with ❤️ for safer communities</p>
