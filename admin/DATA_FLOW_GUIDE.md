# Data Flow: From CSV to Attendance Display

## 📊 Complete Data Flow Diagram

```
public/datasdt.csv
    ↓
CSV Parser (studentsService.js)
    ↓
Student Objects:
{
  id: "231014822"
  name: "Mohamed Belal Soliman"
  photoUrl: "https://drive.google.com/uc?export=view&id=..."
}
    ↓
React State (students)
    ↓
Attendance Records from Firebase
    ↓
getStudentInfo() Lookup
    ↓
Display in Table:
[Photo] [Name] [Course] [Date] [Time] [Status] [Confidence]
```

## 1️⃣ CSV File Structure

**File:** `admin/public/datasdt.csv`

```csv
"Enter Your Name in English (First, Second and Last Names)",Enter Your ID,Upload Your Personal Photo (Please JPG format),,,,
Mohamed Belal Soliman,231014822,https://drive.google.com/open?id=199OY3NUcmSxWX8tEjpJvz2qYyMrTa2oy,,,,
Jack Ashraf TADROS,231006166,https://drive.google.com/open?id=1a8CJ-saPVA7JnaZj3AUve07p-2OLvIGD,,,,
```

**Columns:**
- Col 1: Student Name
- Col 2: Student ID
- Col 3: Google Drive Photo URL
- Col 4-6: Extra fields (ignored)

## 2️⃣ CSV Parsing Process

**File:** `studentsService.js` → `parseCSV()`

### What Happens:
1. Reads CSV text line by line
2. Skips header row (line 1)
3. Parses each data row:
   - Extracts student name (col 1)
   - Extracts student ID (col 2)
   - Searches for email in col 3+ (if has @)
   - Extracts Google Drive file ID from col 3
4. Converts Google Drive URL to direct image URL
5. Creates student object with all fields

### Input → Output:
```
INPUT (CSV Row):
Mohamed Belal Soliman,231014822,https://drive.google.com/open?id=199OY3NUcmSxWX8tEjpJvz2qYyMrTa2oy

PARSING:
- Extract name: "Mohamed Belal Soliman"
- Extract ID: "231014822"
- Find Google Drive ID: "199OY3NUcmSxWX8tEjpJvz2qYyMrTa2oy"
- Create image URL: "https://drive.google.com/uc?export=view&id=199OY3NUcmSxWX8tEjpJvz2qYyMrTa2oy"

OUTPUT (Student Object):
{
  id: "231014822",
  studentNumber: "231014822",
  name: "Mohamed Belal Soliman",
  email: "231014822@student.university.edu",
  photoDriveId: "199OY3NUcmSxWX8tEjpJvz2qYyMrTa2oy",
  photoUrl: "https://drive.google.com/uc?export=view&id=199OY3NUcmSxWX8tEjpJvz2qYyMrTa2oy",
  source: "local_csv"
}
```

## 3️⃣ Student Data in React

**File:** `AttendancePage.jsx`

### Loading:
```javascript
// In useEffect:
const data = await getAllStudents()
// Returns array of student objects
console.log(`✅ Loaded ${data.length} students`)
```

### State Storage:
```javascript
const [students, setStudents] = useState([])
// students = [
//   { id: "231014822", name: "Mohamed Belal Soliman", photoUrl: "..." },
//   { id: "231006166", name: "Jack Ashraf TADROS", photoUrl: "..." },
//   ...
// ]
```

## 4️⃣ Attendance Records from Firebase

**Collection:** `attendance`

```json
{
  "id": "doc-xyz123",
  "name": "Mohamed Belal Soliman",
  "action": "JOIN",
  "created_at": "2025-11-24T16:02:48.474937",
  "date": "2025-11-24",
  "session_id": 231014822,
  "similarity": 0.7699999809265137,
  "time": "16:02:42",
  "timestamp": "2025-11-24 16:02:42"
}
```

## 5️⃣ Student Lookup Process

**File:** `AttendancePage.jsx` → `getStudentInfo(record)`

### Process Flow:
```
Input: Attendance Record
  ↓
Check record.studentId → Match with students.id or students.studentNumber
  ↓ (if not found)
Check record.session_id → Convert to string and match students.studentNumber
  ↓ (if not found)
Check record.name → Case-insensitive match with students.name
  ↓ (if not found)
Use record.name as fallback, or "Unknown"
```

### Example Lookup:

**Scenario 1: Record has studentId**
```javascript
record: { studentId: "231014822", name: "Mohamed Belal Soliman", ... }
students: [{ id: "231014822", name: "Mohamed Belal Soliman", photoUrl: "..." }]
Result: ✅ MATCH → Use student object, get photo
```

**Scenario 2: Record has session_id**
```javascript
record: { session_id: 231014822, name: "Mohamed Belal Soliman", ... }
students: [{ studentNumber: "231014822", name: "Mohamed Belal Soliman", ... }]
Result: ✅ MATCH → Use student object, get photo
```

**Scenario 3: Record only has name**
```javascript
record: { name: "Mohamed Belal Soliman", ... }
students: [{ name: "Mohamed Belal Soliman", photoUrl: "..." }]
Result: ✅ MATCH → Use student object, get photo
```

**Scenario 4: No match found**
```javascript
record: { name: "Unknown Person", session_id: 999, ... }
students: [...]  // No matching student
Result: ❌ NO MATCH → Use record.name or "Unknown", no photo
```

## 6️⃣ Display in Table

**File:** `AttendancePage.jsx` → Table rendering

### Component Hierarchy:
```jsx
<TableRow>
  <TableCell>
    <Box display="flex" gap={2}>
      ← StudentPhotoAvatar
      ← Typography (Student Name)
    </Box>
  </TableCell>
  ← Course Name
  ← Date
  ← Arrival Time
  ← Status Chip
  ← Confidence Score
</TableRow>
```

### What Each Column Shows:

| Column | Source | Priority |
|--------|--------|----------|
| **Photo** | `studentInfo.photoUrl` | Student DB → Initials fallback |
| **Name** | `record.name` → `student.name` | Firebase → CSV match → ID |
| **Course** | `record.courseId` | Firebase (optional) |
| **Date** | `record.date` or `record.created_at` | Firebase |
| **Time** | `record.time` or `record.arrivalTime` | Firebase |
| **Status** | `record.status` or `record.action` | Firebase (JOIN→present, LATE→late, null→absent) |
| **Confidence** | `record.similarity` or `record.confidenceScore` | Firebase (as %) |

## 🔄 Complete Example

### Start: CSV File
```csv
Mohamed Belal Soliman,231014822,https://drive.google.com/open?id=abc123
```

### Step 1: CSV Parsing
```javascript
// studentsService.js
{
  id: "231014822",
  name: "Mohamed Belal Soliman",
  photoUrl: "https://drive.google.com/uc?export=view&id=abc123"
}
```

### Step 2: React State
```javascript
// AttendancePage.jsx
students = [
  { id: "231014822", name: "Mohamed Belal Soliman", photoUrl: "..." },
  ...
]
```

### Step 3: Firebase Record
```json
{
  "name": "Mohamed Belal Soliman",
  "session_id": 231014822,
  "date": "2025-11-24",
  "time": "16:02:42",
  "action": "JOIN",
  "similarity": 0.77
}
```

### Step 4: Lookup
```javascript
// getStudentInfo() matches record.session_id (231014822) 
// with students[0].studentNumber ("231014822")
// Returns: {
//   name: "Mohamed Belal Soliman",
//   photoUrl: "https://drive.google.com/uc?export=view&id=abc123"
// }
```

### Step 5: Display
```
┌─────────────────────────────────────────────────────────────────┐
│ [Avatar] Mohamed Belal Soliman │ ... │ 2025-11-24 │ 16:02 │ ✅ │ 77% │
└─────────────────────────────────────────────────────────────────┘
```

## 🐛 Common Data Flow Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Name shows "Unknown" | No student match | Check ID format matches |
| Photo shows initials | studentInfo.photoUrl is null | Check photoUrl generated correctly |
| Attendance empty | No Firebase records | Check date range |
| Wrong student matched | ID mismatch | Verify CSV IDs vs Firebase IDs |
| Confidence shows N/A | similarity/confidenceScore missing | Ensure Firebase has data |

## 📝 Environment Dependencies

```
CSV File: public/datasdt.csv
├─ Loaded by: getAllStudents()
├─ Parsed by: parseCSV()
└─ Used for: Student names and photos

Firebase Collection: attendance
├─ Queried by: getAttendanceByDateRange()
├─ Contains: Attendance records with dates, times, names
└─ Matched with: CSV students by ID or name

React Component: AttendancePage.jsx
├─ Loads: Both students and attendance
├─ Performs: getStudentInfo() lookup
└─ Displays: Combined data in table
```

---

**Last Updated:** December 3, 2025
