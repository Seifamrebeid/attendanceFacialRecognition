# Student Admin Portal

A professional React-based admin portal for managing attendance with Firebase integration.

## Features

- **React Router** - Client-side routing for seamless navigation
- **Firebase Firestore** - Real-time attendance data integration
- **Professional Dashboard** - Overview with statistics
- **Attendance Management** - View and filter attendance records from Firebase
- **Student Management** - Manage student information
- **Reports** - Generate and download attendance reports
- **Settings** - System configuration and preferences
- **Responsive Design** - Works on desktop and mobile devices
- **Modern UI** - Purple/blue gradient theme with smooth animations

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Firebase

Create a `.env.local` file with your Firebase credentials:

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

See `.env.example` for reference.

### 3. Start Development Server

```bash
npm run dev
```

The app will run at `http://localhost:5174/`

## Project Structure

```
src/
├── components/
│   ├── Layout.jsx       - Main layout wrapper
│   ├── Sidebar.jsx      - Navigation sidebar
│   └── TopBar.jsx       - Header component
├── pages/
│   ├── Dashboard.jsx    - Dashboard overview
│   ├── Students.jsx     - Student management
│   ├── Attendance.jsx   - Attendance records (Firebase)
│   ├── Reports.jsx      - Reports & analytics
│   └── Settings.jsx     - System settings
├── config/
│   └── firebase.js      - Firebase configuration
├── App.jsx              - Main app with routing
├── main.jsx             - Entry point with Router
└── index.css            - Global styles
```

## Available Scripts

```bash
# Development
npm run dev

# Build for production
npm run build

# Preview production build
npm preview

# Run linter
npm lint
```

## Firebase Integration

The Attendance page fetches data from your Firestore `attendance` collection:

**Expected Data Structure:**
```javascript
{
  action: "JOIN",           // or "LATE" for late, null for absent
  created_at: "2025-11-24T16:02:48.474937",
  date: "2025-11-24",       // REQUIRED for date filtering
  name: "Student Name",
  session_id: 1,
  similarity: 0.95,         // Facial recognition confidence
  time: "16:02:42"
}
```

For detailed Firebase setup, see `FIREBASE_SETUP.md`.

## Technology Stack

- **React 19** - UI framework
- **React Router 6** - Client-side routing
- **Firebase** - Backend & database
- **Vite** - Build tool
- **CSS3** - Styling with gradients and animations

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Create a feature branch
2. Make your changes
3. Test locally with `npm run dev`
4. Submit a pull request

## License

MIT

