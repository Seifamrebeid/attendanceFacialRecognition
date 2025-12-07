# Doctor Dashboard - Lecturer Attendance Management

A real-time attendance monitoring dashboard for lecturers to track student attendance using facial recognition data.

## Features

- **Course Login**: Lecturers select their course and authenticate with username/password
- **Real-time Monitoring**: Live updates of student attendance via Firestore onSnapshot
- **Student List**: View all students with current status (Present/Left/Returned/Absent)
- **Weekly Statistics**: Analyze attendance trends with charts and tables
- **Action Tracking**: Monitor JOIN/LEFT/RETURNED events for each student

## Setup

### 1. Install Dependencies
```bash
cd doctor
npm install
```

### 2. Configure Firebase
Create a `.env` file in the `doctor/` directory:
```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 3. Add Student CSV
Place the `datasdt.csv` file in the `public/` folder with student data:
```
Name,StudentID,Email,PhotoURL/PhotoID
John Doe,12345,john@example.com,googleDriveId
```

### 4. Run Development Server
```bash
npm run dev
```

## Data Structure

### Courses Collection
- `courseCode`, `courseName`
- `lecturerUsername`, `lecturerPassword`, `lecturerName`
- `department`, `semester`, `schedule`
- `maxStudents`, `credits`, `description`

### Attendance Collection
- `studentName`, `courseId`, `weekNumber`
- `action` (JOIN/LEFT/RETURNED)
- `timestamp`, `date`, `time`, `dayOfWeek`
- `similarity`, `courseCode`, `courseName`

## Pages

- **Login**: Course selection and lecturer authentication
- **Overview**: Course info and recent activity feed
- **Students**: Real-time student presence tracking
- **Weekly Stats**: Attendance rate trends and analytics

## Technologies

- React 19 + Vite
- Firebase/Firestore (real-time database)
- React Router (navigation)
- Recharts (data visualization)
- CSS (custom styling)
