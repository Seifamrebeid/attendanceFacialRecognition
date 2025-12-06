# Quick Test Checklist - Student Names & Photos

## ✅ Pre-Test Setup

- [ ] `public/datasdt.csv` exists with student data
- [ ] At least 1 student in CSV with valid ID and name
- [ ] At least 1 attendance record in Firebase with matching date
- [ ] Firebase credentials in `.env` are correct
- [ ] Admin app is running (`npm run dev`)
- [ ] Browser console is open (F12)

## 🚀 Quick Test Steps

### 1. Load the App
```
Open: http://localhost:5173/ (or your admin URL)
Navigate to: Attendance page
```

### 2. Check Console Logs
```
Look for:
✅ Loaded X students
Student fields: {id: "...", name: "...", photoUrl: "..."}
```

**If you don't see this:**
- ❌ Students not loading from CSV
- ✅ Solution: Check if `public/datasdt.csv` exists and is formatted correctly

### 3. Load Attendance Records
```
1. Select date range (default: last 30 days)
2. Click "Load Records" button
3. Check console
```

**Expected console output:**
```
Fetching attendance from 2025-11-03 to 2025-12-03
Fetched X attendance records
```

**If you don't see this:**
- ❌ No attendance records in Firebase
- ✅ Solution: Check if date range is correct, verify Firebase has data

### 4. Check Student Lookup
```
In console, look for logs like:
Looking up student for record: {...}
✅ Found student by studentId: Mohamed Belal Soliman
```

**If you see "No student found":**
- ❌ Student IDs don't match between CSV and Firebase
- ✅ Solution: Verify student IDs in both sources

### 5. Verify Display
```
Table should show:
[Photo/Initials] [Student Name] [Course] [Date] [Time] [Status] [Confidence]
```

**If name shows "Unknown":**
- ❌ Student lookup failed
- ✅ Check console logs in step 4

**If photo shows only initials:**
- ✅ This is normal if Google Drive photos aren't public
- ℹ️ Initials are a proper fallback

## 🔍 Quick Debug Commands

Copy-paste these in browser console while on Attendance page:

**Check if students loaded:**
```javascript
console.log('Students:', window.students?.length, 'students loaded')
console.log('First student:', window.students?.[0])
```

**Check first student's photo URL:**
```javascript
console.log('Photo URL:', window.students?.[0]?.photoUrl)
```

**Test student name matching:**
```javascript
const testName = "Mohamed Belal Soliman"
const found = window.students?.find(s => s.name.toLowerCase() === testName.toLowerCase())
console.log('Name match result:', found)
```

**Check attendance data:**
```javascript
console.log('Attendance records:', window.attendance?.length)
console.log('First record:', window.attendance?.[0])
```

## 📊 Expected Results

### ✅ Success Indicators:
- [ ] Console shows "Loaded X students"
- [ ] Console shows "Fetched X attendance records"
- [ ] Console shows "✅ Found student by..."
- [ ] Table displays student names (not "Unknown")
- [ ] Avatar shows either photo or initials
- [ ] Date, time, status all display correctly

### ❌ Problem Indicators:
- [ ] "Loaded 0 students" → CSV not found or empty
- [ ] "Fetched 0 records" → No Firebase data in date range
- [ ] "No student found" → ID mismatch between CSV and Firebase
- [ ] Table shows "Unknown" → Student lookup failed
- [ ] Avatar blank or broken → Photo URL issue

## 🛠️ Quick Fixes

| Problem | Solution |
|---------|----------|
| No students loaded | Check `public/datasdt.csv` exists and has data |
| No attendance records | Verify Firebase connection and date range |
| Student name "Unknown" | Check student ID format in both sources |
| Photo not showing | Normal if images are private; shows initials as fallback |
| Firebase connection error | Verify `.env` credentials |

## 📝 CSV Format Check

Open `public/datasdt.csv` and verify:

```
Column 1: Student Name (e.g., "Mohamed Belal Soliman")
Column 2: Student ID (e.g., "231014822")
Column 3: Google Drive URL (e.g., "https://drive.google.com/open?id=...")

✅ First row should be headers
✅ Each data row should have at least columns 1 & 2
✅ Names and IDs should not be empty
```

## 🎯 Success Test Cases

### Test Case 1: Basic Display
```
Given: 1 student in CSV, 1 attendance record in Firebase
When: Click "Load Records"
Then: Table shows student name + photo/initials
```

### Test Case 2: Name Matching
```
Given: Record has session_id, CSV has same student ID
When: Component looks up student
Then: Console shows "✅ Found student by..."
```

### Test Case 3: Fallback
```
Given: No matching student found
When: Table renders row
Then: Shows record.name or "Unknown"
```

### Test Case 4: Photo Loading
```
Given: Student has photoUrl
When: StudentPhotoAvatar loads
Then: Shows either image or initials (if image fails)
```

## 📞 Still Having Issues?

1. **Check Console Logs First**
   - Most issues are logged with ✅ or ❌ prefix

2. **Verify Data Sources**
   - CSV file exists and has content
   - Firebase has attendance records

3. **Test ID Matching**
   - Make sure CSV student IDs match Firebase record IDs

4. **Check File Paths**
   - CSV should be at: `public/datasdt.csv`
   - Config should be at: `src/config/firebase.js`

5. **Clear Cache**
   - Hard refresh: Ctrl+Shift+R
   - Clear browser cache

---

**Last Updated:** December 3, 2025  
**Status:** ✅ Ready for Testing
