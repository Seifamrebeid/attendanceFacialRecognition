# Attendance Display Troubleshooting Guide

## ✅ Fixed Issues

The following fixes have been applied to make the attendance display work correctly:

### 1. **Firebase Config Path**
- ✅ Updated import path from `firebase/firebaseConfig` to `config/firebase`
- ✅ Created proper Firebase configuration file at `src/config/firebase.js`
- ✅ Uses environment variables from `.env` file

### 2. **Attendance Service Updates**
- ✅ Improved date filtering (handles both string and Timestamp formats)
- ✅ Better error handling with detailed logging
- ✅ Flexible field mapping (handles different Firebase data structures)
- ✅ Client-side date filtering for reliability

### 3. **Attendance Page Enhancements**
- ✅ Better field mapping for different Firebase schemas
- ✅ Flexible student and course lookups
- ✅ Handles multiple date/time field formats
- ✅ Supports both `action` field (JOIN/LATE) and `status` field
- ✅ Added console logging for debugging
- ✅ Improved error messages

## 🔍 How to Debug

### Step 1: Check Firebase Configuration
1. Open browser DevTools (F12)
2. Go to Console tab
3. You should see logs like:
   ```
   Fetching attendance from 2025-11-03 to 2025-12-03
   Fetched X attendance records
   Sample record: {...}
   ```

### Step 2: Verify Firebase Connection
Check if Firebase is initialized correctly:
```javascript
// In console:
import { db } from '/admin/src/config/firebase.js'
console.log(db)  // Should show Firestore instance
```

### Step 3: Check Attendance Collection
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Firestore Database
4. Check if `attendance` collection exists
5. Verify document structure matches one of these formats:

**Format 1 (Current R-based):**
```json
{
  "action": "JOIN",
  "created_at": "2025-11-24T16:02:48.474937",
  "date": "2025-11-24",
  "name": "Student Name",
  "session_id": 1,
  "similarity": 0.77,
  "time": "16:02:42"
}
```

**Format 2 (Alternative):**
```json
{
  "status": "present",
  "date": Timestamp,
  "studentId": "STU001",
  "courseId": "COURSE001",
  "arrivalTime": "16:02:42",
  "confidenceScore": 0.95
}
```

### Step 4: Check Date Range
- Default range is last 30 days
- Make sure your attendance records are within the selected date range
- Try selecting a wider date range (e.g., entire current month)

### Step 5: Load Records
1. Select a course (or leave as "All Courses")
2. Click the "Load Records" button (blue refresh icon)
3. Check Console for logs

## 📊 Expected Behavior

When working correctly:

1. **On page load:**
   - Date range defaults to last 30 days
   - Console shows: "Fetching attendance from YYYY-MM-DD to YYYY-MM-DD"

2. **After clicking "Load Records":**
   - Console shows: "Fetched X attendance records"
   - Sample record is logged with all fields
   - Table populates with attendance data

3. **If no records found:**
   - Table shows "No attendance records found" message
   - Console shows: "Fetched 0 attendance records"

## 🛠️ Common Issues & Fixes

### Issue: "No records found" with correct dates
**Solution:**
- Check if date format in Firebase matches (string vs Timestamp)
- Try expanding date range
- Verify records exist in Firebase console

### Issue: Field names don't match
**Solution:**
- The service now maps multiple field names automatically
- If custom fields are used, update the mapping in `attendanceService.js`

### Issue: Can't connect to Firebase
**Solution:**
- Check `.env` file has correct Firebase credentials
- Verify Firebase project ID matches in console
- Clear browser cache and reload

### Issue: "Failed to load attendance records"
**Solution:**
- Check browser console for detailed error message
- Verify Firestore security rules allow reads
- Check if `attendance` collection exists in Firestore

## 🔧 Field Mapping

The service automatically handles these field variations:

| Field Purpose | Expected Variations |
|---|---|
| Student Name | `name`, `studentName` |
| Student ID | `studentId`, `session_id` |
| Date | `date` (string), `date` (Timestamp), `created_at` |
| Time | `arrivalTime`, `time` |
| Status | `status`, `action` |
| Confidence | `confidenceScore`, `similarity` |
| Course | `courseId`, `course_name` |

## 📝 Notes

- The component uses **client-side filtering** for dates (more reliable)
- Date formatting uses `date-fns` library
- Console logs are available for debugging
- Avatar images support student photos if available

## ✅ Testing Checklist

- [ ] Firebase credentials in `.env` are correct
- [ ] `attendance` collection exists in Firestore
- [ ] At least one attendance record exists with current date
- [ ] Browser console shows no errors
- [ ] Date range includes current/test records
- [ ] Logs show "Fetched X records" (X > 0)
- [ ] Table displays records correctly

## 🚀 Next Steps

If attendance still doesn't display after these fixes:

1. **Create test data** in Firebase console
2. **Verify field names** match your actual data
3. **Check Firestore rules** allow reading
4. **Test with wider date range** (e.g., last 90 days)
5. **Clear cache** and do hard refresh (Ctrl+Shift+R)

---

**Last Updated:** December 3, 2025
