# Nirbhaya F - Safety & SOS Application

A comprehensive safety and emergency response application designed to help users feel secure and get immediate assistance when needed.

## Features

- **SOS Emergency Button**: One-tap emergency alert to send location and distress signal
- **Police Contacts**: Quick access to police stations and emergency services
- **Report Incident**: File reports with detailed information
- **Dashboard**: Real-time safety metrics and alerts
- **Settings**: Customize your safety preferences

## Tech Stack

- **Vite** - Fast build tool and development server
- **TypeScript** - Type-safe JavaScript
- **React** - UI library
- **shadcn/ui** - Beautiful and accessible components
- **Tailwind CSS** - Utility-first CSS framework

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:8080`

### Build for Production

```bash
npm run build
```

The production-ready files will be in the `dist` folder.

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
src/
├── components/     # React components
│   ├── ui/        # shadcn/ui components
│   └── ...
├── pages/         # Page components
├── hooks/         # Custom React hooks
├── lib/           # Utilities and helpers
└── App.tsx        # Main app component
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run test` - Run tests
