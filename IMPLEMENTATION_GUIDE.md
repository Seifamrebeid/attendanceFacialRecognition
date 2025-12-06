# Admin Module - Complete Implementation Guide

## 📋 Overview

This is a complete **React + Firebase** admin module for an automatic attendance tracking system using facial recognition. The system includes:

- ✅ Admin authentication
- ✅ Courses CRUD operations
- ✅ Students management with search/filtering
- ✅ Attendance tracking with date range filtering
- ✅ Automatic warnings after 3 absences
- ✅ Email notifications via Cloud Functions
- ✅ Smart late threshold detection (Mean+SD, Percentile, Fixed)
- ✅ Predictive analytics for absence risk

---

## 🏗️ Architecture

### Frontend (React + Material-UI)
- **Authentication**: Firebase Auth with email/password
- **State Management**: React hooks (useState, useEffect, useContext)
- **Routing**: React Router v6
- **UI Components**: Material-UI (MUI)
- **Charts**: Recharts

### Backend (Firebase)
- **Authentication**: Firebase Authentication
- **Database**: Cloud Firestore (NoSQL)
- **Functions**: Firebase Cloud Functions (Node.js)
- **Email**: Nodemailer

---

## 📦 Installation Steps

### 1. Install Dependencies

```bash
npm install
```

If you encounter issues with the gitignore blocking package.json, manually install:

```bash
npm install react react-dom react-router-dom
npm install firebase
npm install @mui/material @mui/icons-material @emotion/react @emotion/styled
npm install recharts date-fns
npm install -D vite @vitejs/plugin-react
```

### 2. Firebase Setup

1. Create a Firebase project at https://console.firebase.google.com
2. Enable **Authentication** → Email/Password provider
3. Create a **Firestore Database** (start in test mode, we'll add rules later)
4. Copy your Firebase config

### 3. Environment Configuration

Create a `.env` file in the root directory:

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 4. Deploy Firestore Security Rules

```bash
firebase deploy --only firestore:rules
```

Or manually copy the rules from `firestore.rules` to Firebase Console.

### 5. Deploy Cloud Functions

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

**IMPORTANT**: Before deploying, configure email credentials in `functions/index.js`:

```javascript
const emailConfig = {
  service: 'gmail',
  auth: {
    user: 'your-email@gmail.com',
    pass: 'your-app-password' // Generate from Google Account settings
  }
};
```

For Gmail:
1. Enable 2-factor authentication
2. Go to Google Account → Security → App Passwords
3. Generate a new app password
4. Use that password in the config

### 6. Create Admin User

In Firebase Console → Authentication → Add User:
- Email: admin@example.com
- Password: (your secure password)

### 7. Run Development Server

```bash
npm run dev
```

The app will open at http://localhost:3000

---

## 🗄️ Data Model

### Collections in Firestore

#### `courses`
```javascript
{
  id: "auto-generated",
  name: "Introduction to Computer Science",
  code: "CS101",
  instructorName: "Dr. Smith",
  schedule: "Mon/Wed 10:00-12:00",
  startTime: "10:00",
  createdAt: "2024-01-15T10:00:00Z"
}
```

#### `students`
```javascript
{
  id: "auto-generated",
  name: "John Doe",
  email: "john.doe@university.edu",
  studentNumber: "2024001",
  enrolledCourses: ["courseId1", "courseId2"]
}
```

#### `attendance`
```javascript
{
  id: "auto-generated",
  studentId: "studentId",
  courseId: "courseId",
  date: Timestamp,
  arrivalTime: Timestamp,
  status: "present" | "late" | "absent",
  confidenceScore: 0.95 // 0-1 from facial recognition
}
```

#### `warnings`
```javascript
{
  id: "auto-generated",
  studentId: "studentId",
  courseId: "courseId",
  absenceCount: 3,
  lastAbsenceDate: Timestamp,
  emailSent: true,
  emailSentAt: Timestamp,
  createdAt: Timestamp
}
```

#### `predictions`
```javascript
{
  id: "auto-generated",
  studentId: "studentId",
  studentName: "John Doe",
  courseId: "courseId",
  absenceProbability: 0.75, // 0-1
  riskLevel: "high",
  generatedAt: Timestamp
}
```

---

## 🎯 Features Explained

### 1. Courses CRUD
- **Location**: `/admin/courses`
- **Features**: Create, edit, delete courses with validation
- **Service**: `src/services/coursesService.js`

### 2. Students Management
- **Location**: `/admin/students`
- **Features**: View all students, search by name/email, filter by course
- **Service**: `src/services/studentsService.js`

### 3. Attendance Tracking
- **Location**: `/admin/attendance`
- **Features**: View attendance by course and date range
- **Service**: `src/services/attendanceService.js`

### 4. Warnings System
- **Location**: `/admin/warnings`
- **Features**: 
  - Automatically creates warning when student reaches 3 absences
  - Displays all warnings with email status
  - Cloud Function sends email automatically
- **Services**: `src/services/warningsService.js`, `functions/index.js`

### 5. Smart Late Threshold Detection
- **Location**: `/admin/analytics`
- **Features**:
  - **Fixed Method**: Set minutes after start time (e.g., 10 minutes)
  - **Mean + SD Method**: Average arrival time + 1 standard deviation
  - **Percentile Method**: Use 75th percentile (configurable)
  - Visualizations: Arrival time distribution, weekly late trend
- **Service**: `src/services/analyticsService.js`

**How it works**:
```javascript
// Example: Mean + SD calculation
const arrivalTimes = [600, 605, 610, 615, 620]; // minutes since midnight
const mean = 610; // 10:10 AM
const stdDev = 7.07;
const threshold = mean + stdDev = 617.07; // ~10:17 AM
// Anyone arriving after 10:17 is marked "late"
```

### 6. Predictive Analytics
- **Location**: `/admin/predictions`
- **Features**:
  - Predicts absence probability for next week
  - Uses 4 weighted features:
    - Attendance Rate (40%)
    - Recent Trend (30%)
    - Late Frequency (20%)
    - Confidence Score Trend (10%)
  - Visual risk indicators
- **Service**: `src/services/predictionService.js`

**How the model works**:
```javascript
// Example calculation
const attendanceRate = 0.75; // 75% attendance
const attendanceScore = 1 - 0.75 = 0.25;

const recentAbsenceRate = 0.4; // 40% absent in last 4 weeks
const previousAbsenceRate = 0.2; // 20% absent in previous 4 weeks
const trendScore = 0.4 - 0.2 = 0.2;

const lateFrequency = 0.3; // 30% of attended classes were late
const lateScore = 0.3;

const confidenceScore = 0.05; // Slight decline in confidence

// Weighted combination
const probability = (0.25 * 0.4) + (0.2 * 0.3) + (0.3 * 0.2) + (0.05 * 0.1)
                  = 0.1 + 0.06 + 0.06 + 0.005
                  = 0.225 (22.5% chance of absence)
```

---

## 📧 Email Configuration

### Gmail Setup (Recommended for Testing)

1. Enable 2-factor authentication on your Google account
2. Go to: https://myaccount.google.com/security
3. Click "App passwords"
4. Generate a new app password for "Mail"
5. Copy the 16-character password
6. Update `functions/index.js`:

```javascript
const emailConfig = {
  service: 'gmail',
  auth: {
    user: 'your-email@gmail.com',
    pass: 'xxxx xxxx xxxx xxxx' // Your app password
  }
};
```

7. Uncomment the email sending line in the Cloud Function:

```javascript
await sendWarningEmail(
  studentData.email,
  studentData.name,
  courseData.name,
  warningData.absenceCount
);
```

### Other SMTP Providers

For SendGrid, Mailgun, or custom SMTP:

```javascript
const emailConfig = {
  host: 'smtp.sendgrid.net',
  port: 587,
  secure: false,
  auth: {
    user: 'apikey',
    pass: 'your-sendgrid-api-key'
  }
};
```

---

## 🧪 Testing the System

### 1. Create Test Data

Use Firebase Console to manually add test data:

**Add a Course**:
```json
{
  "name": "Data Structures",
  "code": "CS201",
  "instructorName": "Prof. Johnson",
  "schedule": "Tue/Thu 14:00-16:00",
  "startTime": "14:00"
}
```

**Add a Student**:
```json
{
  "name": "Alice Smith",
  "email": "alice@university.edu",
  "studentNumber": "2024001",
  "enrolledCourses": ["<courseId>"]
}
```

**Add Attendance Records** (3 absences to trigger warning):
```json
{
  "studentId": "<studentId>",
  "courseId": "<courseId>",
  "date": "2024-01-15T10:00:00Z",
  "status": "absent"
}
```

### 2. Test Workflow

1. **Login**: Use your admin credentials
2. **Create Course**: Go to Courses → Add Course
3. **View Students**: Check Students page
4. **Add Attendance**: Use Firebase Console (or integrate with facial recognition system)
5. **Check Warnings**: After 3 absences, warning should appear
6. **View Analytics**: Select course and calculate late threshold
7. **Generate Predictions**: Select course and generate absence predictions

---

## 🔄 How to Retrain/Update the Prediction Model

The prediction model is **heuristic-based**, so it automatically uses all available data. To update:

1. **Automatic Update**: Just call `predictForCourse(courseId)` again
   - The model recalculates using all historical attendance data
   - No separate training step needed

2. **Adjust Weights**: Edit `src/services/predictionService.js`:
```javascript
const probability = (
  attendanceScore * 0.40 +  // Change these weights
  trendScore * 0.30 +
  lateScore * 0.20 +
  confidenceScore * 0.10
);
```

3. **Add New Features**: Modify `calculateAbsenceProbability()` to include:
   - Time of day patterns
   - Day of week patterns
   - Exam schedule proximity
   - etc.

4. **For Production**: Consider implementing:
   - Logistic regression with labeled data
   - TensorFlow.js for browser-based ML
   - Server-side ML with Python (Cloud Functions can call external APIs)

---

## 🚀 Deployment

### Deploy to Firebase Hosting

1. Build the production app:
```bash
npm run build
```

2. Initialize Firebase Hosting:
```bash
firebase init hosting
```

3. Deploy:
```bash
firebase deploy
```

Your app will be live at: `https://your-project-id.web.app`

---

## 🎓 University Project Presentation Tips

### Key Points to Highlight:

1. **Smart Late Detection**: Explain how dynamic thresholds adapt to each class's patterns
2. **Predictive Model**: Walk through the 4-feature heuristic model
3. **Automation**: Demonstrate automatic email sending after 3 absences
4. **Real-time Data**: Show how Firestore updates reflect immediately in the UI
5. **Security**: Explain authentication and Firestore rules

### Demo Flow:

1. Show login page
2. Navigate through dashboard
3. Create a new course
4. Show attendance records
5. Demonstrate late threshold calculation with charts
6. Generate absence predictions
7. Show warnings and email system

---

## 📝 Code Structure Summary

```
src/
├── components/
│   ├── Navbar.jsx              # Navigation bar
│   └── ProtectedRoute.jsx      # Route protection
├── context/
│   └── AuthContext.jsx         # Authentication state
├── firebase/
│   └── firebaseConfig.js       # Firebase initialization
├── pages/
│   ├── LoginPage.jsx           # Login form
│   ├── AdminDashboard.jsx      # Dashboard with stats
│   ├── CoursesPage.jsx         # Courses CRUD
│   ├── StudentsPage.jsx        # Students list
│   ├── AttendancePage.jsx      # Attendance viewer
│   ├── WarningsPage.jsx        # Warnings display
│   ├── LateAnalyticsPage.jsx   # Late threshold analytics
│   └── AbsencePredictionPage.jsx # Predictive model
├── services/
│   ├── coursesService.js       # Courses Firestore ops
│   ├── studentsService.js      # Students Firestore ops
│   ├── attendanceService.js    # Attendance Firestore ops
│   ├── warningsService.js      # Warnings logic
│   ├── analyticsService.js     # Late threshold calculations
│   └── predictionService.js    # Prediction model
├── App.jsx                     # Main app with routing
└── main.jsx                    # Entry point

functions/
└── index.js                    # Cloud Functions (email)

firestore.rules                 # Security rules
```

---

## 🐛 Troubleshooting

### Issue: "Firebase not initialized"
- Check `.env` file exists and has correct values
- Restart dev server after creating `.env`

### Issue: "Permission denied" in Firestore
- Deploy security rules: `firebase deploy --only firestore:rules`
- Make sure user is authenticated

### Issue: Emails not sending
- Check email configuration in `functions/index.js`
- Verify app password is correct (not regular password)
- Check Cloud Functions logs: `firebase functions:log`

### Issue: Charts not displaying
- Check if data exists in Firestore
- Verify date formats are correct (Timestamps)
- Check browser console for errors

---

## 📚 Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [React Router Documentation](https://reactrouter.com)
- [Material-UI Documentation](https://mui.com)
- [Recharts Documentation](https://recharts.org)

---

## ✅ Checklist for Graduation Project

- [ ] Firebase project created and configured
- [ ] Admin user created in Firebase Auth
- [ ] Sample courses added to Firestore
- [ ] Sample students added to Firestore
- [ ] Sample attendance records added
- [ ] Email configuration completed and tested
- [ ] Late threshold analytics tested with real data
- [ ] Predictions generated and verified
- [ ] Presentation slides prepared
- [ ] Demo video recorded (optional)
- [ ] Code comments reviewed for clarity

---

**Good luck with your university project! 🎓**
