# Doctor App - Admin Portal Mobile App

This is the mobile version of the admin attendance management system, built with React Native and Expo.

## Features

✅ **Authentication** - Firebase Auth with email/password
✅ **Dashboard** - Overview statistics and quick actions
✅ **Courses Management** - Create, edit, and delete courses
✅ **Students Management** - View student list with photos
✅ **Attendance Tracking** - Record and view attendance
✅ **Warnings System** - Create and manage student warnings
✅ **Analytics** - Late arrival analytics with charts
✅ **Predictions** - ML-based absence predictions
✅ **Reports** - Generate various reports

## Setup Instructions

### 1. Install Dependencies

```bash
cd doctorApp
npm install
```

### 2. Configure Firebase

Edit `config/firebase.js` and replace with your Firebase credentials:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};
```

You can find these credentials in your Firebase Console:

1. Go to https://console.firebase.google.com
2. Select your project
3. Go to Project Settings > General
4. Scroll down to "Your apps" section
5. Copy the configuration

### 3. Enable Firebase Services

Make sure the following are enabled in your Firebase project:

- **Authentication**: Enable Email/Password sign-in method
- **Firestore Database**: Create database in production mode
- **Collections needed**:
  - `courses`
  - `students`
  - `attendance`
  - `warnings`
  - `predictions`

### 4. Run the App

```bash
npm start
```

Then:

- Press `a` for Android
- Press `i` for iOS
- Press `w` for web
- Scan QR code with Expo Go app on your phone

## Project Structure

```
doctorApp/
├── App.js                 # Main app entry point
├── config/
│   └── firebase.js        # Firebase configuration
├── context/
│   └── AuthContext.js     # Authentication context
├── navigation/
│   └── AppNavigator.js    # Navigation setup
├── screens/
│   ├── LoginScreen.js
│   ├── DashboardScreen.js
│   ├── CoursesScreen.js
│   ├── StudentsScreen.js
│   ├── AttendanceScreen.js
│   ├── WarningsScreen.js
│   ├── AnalyticsScreen.js
│   ├── PredictionsScreen.js
│   └── ReportsScreen.js
└── services/
    ├── coursesService.js
    ├── studentsService.js
    ├── attendanceService.js
    ├── warningsService.js
    ├── analyticsService.js
    └── predictionService.js
```

## Technologies Used

- **React Native** - Mobile framework
- **Expo** - Development platform
- **Firebase** - Backend (Auth + Firestore)
- **React Navigation** - Navigation library
- **React Native Paper** - UI components
- **React Native Chart Kit** - Data visualization
- **date-fns** - Date formatting

## Usage

### Login

Use your Firebase authentication credentials to log in.

### Dashboard

View overview statistics:

- Total courses
- Total students
- Total warnings
- High-risk students

### Managing Courses

- Add new courses with details
- Edit existing courses
- Delete courses
- View course schedules

### Recording Attendance

1. Select a course
2. Mark students as Present (P), Late (L), or Absent (A)
3. Submit attendance

### Analytics

- View arrival time patterns
- See statistics (mean, standard deviation)
- Analyze late arrival trends

### Predictions

- View absence probability for students
- Risk levels: High, Medium, Low
- Based on historical attendance data

## Troubleshooting

### Firebase Connection Issues

- Verify Firebase credentials in `config/firebase.js`
- Check Firebase project settings
- Ensure Firestore rules allow read/write

### App Won't Start

```bash
# Clear cache
npm start -- --clear

# Reinstall dependencies
rm -rf node_modules
npm install
```

### iOS Issues

```bash
cd ios
pod install
cd ..
```

## Next Steps

1. **Configure Firebase** with your credentials
2. **Test Authentication** by creating a user in Firebase Console
3. **Add Sample Data** to Firestore collections
4. **Test Features** on your device or emulator

## Support

For issues or questions, refer to:

- [Expo Documentation](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/)
- [Firebase Documentation](https://firebase.google.com/docs)
