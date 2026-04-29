# CareBinder

A caregiver-focused medical organizer that simplifies managing family health data. CareBinder helps you manage medication schedules, track doses, securely store health records, and organize care team information all in an offline-capable, privacy-first application.

## 🚀 Key Features

- **Multi-Profile Support**: Manage care for yourself, children, parents, or others from a single app.
- **Medication Management**: Add medications with complex schedules (e.g., daily, specific days) or as-needed (PRN). 
- **Dose Tracking & Adherence**: Log when doses are taken, skipped, or snoozed. Visualize 7-day and 30-day adherence.
- **Secure Local Records**: Upload and store health documents securely. All records are encrypted at rest using WebCrypto AES-GCM and stored locally in your browser.
- **Care Team Sharing**: Manage a care team with role-based access control (Manager, Contributor, Viewer) via simulated secure invites.
- **Offline-First PWA**: Built as a Progressive Web App (PWA). It works without an internet connection and can be installed on your desktop or mobile home screen.
- **Emergency Card**: An offline-accessible emergency medical profile with allergies, conditions, and contacts.

## 🛠️ Technology Stack

- **Frontend Framework**: React 19
- **Build Tool**: Vite
- **Styling**: Tailwind CSS v4 & Lucide React icons
- **Local Database**: Dexie.js (IndexedDB wrapper)
- **Validation**: Zod
- **Testing**: Vitest
- **PWA Integration**: vite-plugin-pwa

## 💻 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/knarayanareddy/CareBinder.git
   cd CareBinder
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running Locally

Start the development server with hot module replacement (HMR):

```bash
npm run dev
```

The app will typically be available at `http://localhost:5173/` or `http://localhost:5175/`.

### Building for Production

To create an optimized production build (includes PWA service worker generation):

```bash
npm run build
```

You can preview the production build locally using:

```bash
npm run preview
```

### Running Tests

Run the Vitest unit and contract test suite:

```bash
npm run test
```

## 🔒 Privacy & Security Note

This application is designed as a **client-side only** prototype.
- **No Backend Server**: There is no remote database or server storing your health data.
- **Local Storage**: All data, including encrypted documents, is stored entirely locally on your device within the browser's IndexedDB.
- **Demo Constraints**: While encryption is implemented locally for demonstration, true HIPAA compliance and production security would require a robust backend architecture, server-side key management, and professional security auditing.
