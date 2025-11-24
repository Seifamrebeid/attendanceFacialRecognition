# Quick Reference - Firebase Attendance Integration

## 🚀 Getting Started

```bash
cd student-admin
npm install    # Already done
npm run dev    # Server runs at http://localhost:5174/
```

## 🎯 Attendance Page

Navigate to `/attendance` to see real-time attendance data from Firebase.

### How It Works

```
Date Picker → Firestore Query → Status Mapping → Display
```

1. **Select Date** → Changes the date filter
2. **Firebase Fetches** → Queries `attendance` collection where `date` equals selected date
3. **Status Mapping**:
   - `action: "JOIN"` = "Present" (Green) ✓
   - `action: "LATE"` = "Late" (Yellow) ⏱️
   - `action: null/other` = "Absent" (Red) ✗
4. **Display Table** with records sorted by time

## 📊 Table Columns

| Column | Source Field | Format |
|--------|--------------|--------|
| Name | `name` | String |
| Session ID | `session_id` | Number |
| Status | `action` field mapping | Enum |
| Time | `time` | HH:MM:SS |
| Similarity | `similarity` | Percentage (0-100%) |

## 🔑 Environment Variables

File: `.env.local`

```
VITE_FIREBASE_API_KEY=AIzaSyA1mIzLvQy8c4x7zXlN2vF9pVqR3wK5xL8
VITE_FIREBASE_AUTH_DOMAIN=seifs-digital-portfolio.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seifs-digital-portfolio
VITE_FIREBASE_STORAGE_BUCKET=seifs-digital-portfolio.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=753486258963
VITE_FIREBASE_APP_ID=1:753486258963:web:8f9c5d7e4b2a1c9d0e5f6g
```

## 📝 Sample Firebase Document

```json
{
  "id": "doc-id-auto-generated",
  "action": "JOIN",
  "created_at": "2025-11-24T16:02:48.474937",
  "date": "2025-11-24",
  "duration_minutes": null,
  "name": "seif",
  "session_id": 2,
  "similarity": 0.7699999809265137,
  "time": "16:02:42",
  "timestamp": "2025-11-24 16:02:42"
}
```

## 🔗 Important Files

| File | Purpose |
|------|---------|
| `src/config/firebase.js` | Firebase initialization |
| `src/pages/Attendance.jsx` | Attendance page with Firebase queries |
| `.env.local` | Firebase credentials |
| `FIREBASE_SETUP.md` | Detailed setup guide |

## ⚡ Key Features

✅ **Real-time Data** - Fetches from Firestore in real-time
✅ **Date Filtering** - Select any date to view records
✅ **Status Badges** - Color-coded status display
✅ **Loading State** - Spinner while fetching
✅ **Error Handling** - User-friendly error messages
✅ **Responsive** - Works on all devices
✅ **Sorted** - Records sorted by time automatically

## 🐛 Debugging

**Check Console**:
```javascript
// If you see errors, check:
1. Firebase credentials in .env.local
2. Collection name is exactly "attendance"
3. Data has "date" field in YYYY-MM-DD format
4. Browser console (F12) for detailed errors
```

**Test Data Insertion**:
```javascript
// Add to Firestore:
{
  action: "JOIN",
  date: "2025-11-24",
  name: "Test Student",
  session_id: 1,
  time: "08:00:00",
  similarity: 0.95,
  timestamp: "2025-11-24 08:00:00"
}
```

## 📱 UI States

1. **Loading**: Spinner shown while fetching
2. **Error**: Red alert box with message
3. **Empty**: Message when no records found
4. **Loaded**: Table with records

## 🎨 Color Scheme

- **Present (Green)**: #28a745
- **Absent (Red)**: #dc3545
- **Late (Yellow)**: #ffc107
- **Primary (Purple)**: #667eea

## 🔐 Firestore Rules Needed

```javascript
match /attendance/{document=**} {
  allow read: if true;
  allow write: if request.auth != null && request.auth.token.admin == true;
}
```

## 📚 Related Documentation

- `FIREBASE_SETUP.md` - Complete Firebase integration guide
- `FIREBASE_INTEGRATION_SUMMARY.md` - Summary of changes
- `README.md` - Project overview
- `ADMIN_SETUP.md` - Admin portal setup

---

**Status**: ✅ All Firebase integration complete and ready to use!
