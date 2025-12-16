# React + Firebase Admin Module

## Environment Variables Setup

Create a `.env` file in the root directory with your Firebase configuration:

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## Installation

```bash
npm install
```

## Required Dependencies

```bash
npm install react react-dom react-router-dom
npm install firebase
npm install @mui/material @mui/icons-material @emotion/react @emotion/styled
npm install recharts date-fns
npm install -D vite @vitejs/plugin-react
```

## Run Development Server

```bash
npm run dev
```

## Build for Production

```bash
npm run build
```

## Project Structure

```
src/
├── components/
│   ├── Navbar.jsx
│   └── ProtectedRoute.jsx
├── context/
│   └── AuthContext.jsx
├── firebase/
│   └── firebaseConfig.js
├── pages/
│   ├── LoginPage.jsx
│   ├── AdminDashboard.jsx
│   ├── CoursesPage.jsx
│   ├── StudentsPage.jsx
│   ├── AttendancePage.jsx
│   ├── WarningsPage.jsx
│   ├── LateAnalyticsPage.jsx
│   └── AbsencePredictionPage.jsx
├── services/
│   ├── coursesService.js
│   ├── studentsService.js
│   ├── attendanceService.js
│   ├── warningsService.js
│   ├── analyticsService.js
│   └── predictionService.js
├── App.jsx
└── main.jsx

functions/
├── index.js
└── package.json (separate for Cloud Functions)
```

## Features

1. **Authentication** - Admin login with Firebase Auth
2. **Courses CRUD** - Create, read, update, delete courses
3. **Students Management** - View and search students
4. **Attendance Tracking** - View attendance with date range filtering
5. **Warnings System** - Automatic warnings after 3 absences with email notifications
6. **Smart Late Detection** - Dynamic threshold calculation (mean+SD, percentile, or fixed)
7. **Predictive Analytics** - Absence probability prediction for next week
