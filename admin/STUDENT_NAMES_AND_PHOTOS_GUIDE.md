# Student Names and Photos - Display Troubleshooting

## ✅ What Was Fixed

### 1. **Student Lookup Logic**
- ✅ Added multiple matching strategies (ID, session_id, name)
- ✅ Improved student information retrieval
- ✅ Better fallback handling

### 2. **Photo Display**
- ✅ Integrated `StudentPhotoAvatar` component for better image loading
- ✅ Handles Google Drive images with fallback to initials
- ✅ Shows loading state while fetching images

### 3. **Student Name Display**
- ✅ Now shows student name prominently in attendance table
- ✅ Uses multiple data sources (Firebase record name, matched student name, ID)
- ✅ Better UI with formatted typography

## 🔍 How Student Names Are Retrieved

The system now tries multiple methods to find and display student names:

1. **Firebase Record Name** - Uses `record.name` directly from attendance
2. **Student ID Match** - Looks up by `studentId` or `session_id`
3. **Name Match** - Searches for exact name match in students list
4. **Fallback** - Shows "Unknown" if all methods fail

## 🔍 How Photos Are Retrieved

1. **Student Lookup** - Finds student record from CSV data
2. **Google Drive URL** - Uses student's `photoUrl` if available
3. **Image Loading** - `StudentPhotoAvatar` handles CORS and fallback
4. **Initials Fallback** - Shows student's first letter if image fails

## 🛠️ Debugging Steps

### Step 1: Open Browser Console (F12)
Look for logs like:
```
✅ Loaded 45 students
Student fields: {
  id: "231014822",
  studentNumber: "231014822",
  name: "Mohamed Belal Soliman",
  email: "231014822@student.university.edu",
  photoUrl: "https://drive.google.com/uc?export=view&id=..."
}
```

### Step 2: Load Attendance Records
Click "Load Records" and check console for:
```
Looking up student for record: {
  studentId: "231014822",
  session_id: null,
  name: "Mohamed Belal Soliman"
}
✅ Found student by studentId: Mohamed Belal Soliman
```

### Step 3: Verify Student Data
Check if students are loaded:
```javascript
// In console:
window.students  // Should show array of student objects
```

### Step 4: Check Attendance Data Structure
Look for logs showing attendance record structure:
```
Sample record: {
  id: "doc123",
  name: "Mohamed Belal Soliman",
  action: "JOIN",
  date: "2025-11-24",
  time: "16:02:42",
  similarity: 0.77
}
```

## 📋 Expected Student Object Structure

From CSV data:
```javascript
{
  id: "231014822",                    // Student ID (from CSV column 2)
  studentNumber: "231014822",
  name: "Mohamed Belal Soliman",       // From CSV column 1
  email: "231014822@student.university.edu",
  enrolledCourses: [],
  photoDriveId: "199OY3NUcmSxWX8tEjpJvz2qYyMrTa2oy",  // Extracted from URL
  photoUrl: "https://drive.google.com/uc?export=view&id=199OY3NUcmSxWX8tEjpJvz2qYyMrTa2oy",
  source: "local_csv"
}
```

## 📋 Expected Attendance Record Structure

From Firebase:
```javascript
{
  id: "doc-id",
  name: "Mohamed Belal Soliman",      // ✅ Used for display
  action: "JOIN",                      // JOIN = present, LATE = late, null = absent
  created_at: "2025-11-24T16:02:48",
  date: "2025-11-24",                 // ✅ Used for date filtering
  duration_minutes: null,
  session_id: 231014822,              // ✅ Can be used to match student
  similarity: 0.77,                   // ✅ Shown as confidence %
  time: "16:02:42",                   // ✅ Shown as arrival time
  timestamp: "2025-11-24 16:02:42"
}
```

## ❌ Common Issues & Solutions

### Issue: "Unknown" shows instead of student name

**Solution 1: Check CSV Data**
- Verify `datasdt.csv` exists in `public/` folder
- Ensure column 1 has student names, column 2 has student IDs
- Check for empty rows or malformed data

**Solution 2: Check Field Mapping**
- Student ID in attendance should match CSV student ID
- Check console for which lookup method succeeded/failed

**Example CSV format:**
```
"Enter Your Name...", "Student ID", "Photo URL"
"Mohamed Belal Soliman", "231014822", "https://drive.google.com/open?id=..."
"Jack Ashraf TADROS", "231006166", "https://drive.google.com/open?id=..."
```

### Issue: Photos not showing (only initials)

**Solution 1: Check Google Drive Access**
- Photos should be shared publicly or via service account
- Console should show image loading attempts

**Solution 2: Check photoUrl Format**
```javascript
// Should be: https://drive.google.com/uc?export=view&id=FILE_ID
// Check in console: students[0].photoUrl
```

**Solution 3: Clear Browser Cache**
- Hard refresh: `Ctrl + Shift + R`
- Clear cookies/cache for the domain

### Issue: Attendance records loaded but names are "Unknown"

**Root Cause:** Student records are not being matched with attendance records.

**Solutions:**
1. **Check Student ID Format**
   ```javascript
   // In console:
   students[0].id  // Should be string like "231014822"
   attendance[0].session_id  // Should match or be convertible
   ```

2. **Check Name Matching**
   - Names should match exactly (case-insensitive)
   - Remove extra spaces if present

3. **Enable Debug Logging**
   - Check console for "Looking up student" logs
   - See which lookup method succeeds

## 📊 Console Logs to Look For

✅ **Success Indicators:**
```
✅ Loaded 45 students
Student fields: {...}
✅ Fetched X attendance records
Looking up student for record: {...}
✅ Found student by studentId: Mohamed Belal Soliman
```

❌ **Error Indicators:**
```
❌ No student found for: [name/id]
Fetched 0 attendance records
Failed to load attendance records
```

## 🔧 Testing Checklist

- [ ] CSV file exists at `public/datasdt.csv`
- [ ] CSV has at least 2 columns (name, ID)
- [ ] Student photos column has Google Drive URLs (optional)
- [ ] Firebase has attendance records
- [ ] Attendance records have `name` or `session_id` field
- [ ] Browser console shows successful student loading
- [ ] Console shows "Found student by" logs
- [ ] Student names display in table
- [ ] Photos load or show initials as fallback

## 🚀 Next Steps if Still Not Working

1. **Manually Test Student Lookup**
   ```javascript
   // In console:
   console.log('Students:', window.students || 'Not loaded')
   console.log('First student:', window.students?.[0])
   ```

2. **Check Attendance Data**
   ```javascript
   // In console:
   console.log('Attendance:', window.attendance || 'Not loaded')
   console.log('First record:', window.attendance?.[0])
   ```

3. **Test Name Matching**
   ```javascript
   // In console:
   const name = "Mohamed Belal Soliman"
   const match = window.students?.find(s => 
     s.name?.toLowerCase() === name.toLowerCase()
   )
   console.log('Match found:', match)
   ```

4. **Verify Photo URLs**
   ```javascript
   // In console:
   window.students?.[0]?.photoUrl
   // Should be like: https://drive.google.com/uc?export=view&id=...
   ```

## 📝 Notes

- Student data loads from local CSV (`public/datasdt.csv`)
- Attendance data loads from Firebase
- Photos use Google Drive URLs from CSV
- Multiple fallback strategies ensure names display
- Logging helps identify matching issues

---

**Last Updated:** December 3, 2025
**Status:** ✅ Student names and photos should now display correctly
