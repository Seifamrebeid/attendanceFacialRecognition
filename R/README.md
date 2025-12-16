# Facial Recognition Attendance System - R Implementation

## Quick Start Guide (Step-by-Step)

### Step 1: Prerequisites
- **R** (version 4.0+)
- **Conda** (Anaconda or Miniconda)
- **Webcam**
- **Firebase** service.json credentials file

### Step 2: Setup Conda Environment
```bash
# Create conda environment
conda create -n faceenv python=3.9 -y
conda activate faceenv

# Install Python packages
pip install opencv-python numpy torch torchvision facenet-pytorch Pillow pandas firebase-admin
```

### Step 3: Add Face Images
Add face images to `R/dataset/` folder:
```
dataset/
├── john_doe.jpg      # Name = "john_doe"
├── jane_smith.png    # Name = "jane_smith"
└── bob_jones.jpeg    # Name = "bob_jones"
```
**Image requirements:** Clear, front-facing photos with good lighting.

### Step 4: Encode Faces (One-Time)
```bash
cd R/
Rscript setup/quick_setup.R
```
This creates `face_encodings.pkl` with encoded face data.

### Step 5: Run the Attendance System
```bash
Rscript main.R
```

**New Features:**
1. **Course Selection** - Choose from Firestore courses list
2. **Login** - Enter lecturer username/password
3. **Week Selection** - Select week number (1-16)
4. **Real-time Attendance** - Records saved immediately to Firestore

---

## 🌐 React Integration (REST API)

For React websites, use the **API Server** instead of the desktop app.

### Start the API Server
```bash
# Install R package
install.packages("plumber")

# Run API server
Rscript api_server.R
```

The API will start on `http://localhost:8000`

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/ready` | System readiness |
| GET | `/api/courses` | List all courses |
| GET | `/api/courses/<id>` | Get course by ID |
| POST | `/api/auth/login` | Validate credentials |
| GET | `/api/attendance` | Get attendance records |
| POST | `/api/attendance` | Record attendance |
| POST | `/api/recognition/start` | Start recognition session |
| POST | `/api/recognition/frame` | Process webcam frame |
| GET | `/api/recognition/known-faces` | List enrolled students |
| GET | `/api/reports/weekly` | Weekly attendance report |
| GET | `/api/reports/semester` | Semester attendance summary |

### React Usage Example

```javascript
// 1. Login
const login = async (courseId, username, password) => {
  const response = await fetch('http://localhost:8000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ courseId, username, password })
  });
  return response.json();
};

// 2. Get courses
const getCourses = async () => {
  const response = await fetch('http://localhost:8000/api/courses');
  return response.json();
};

// 3. Process webcam frame for face recognition
const recognizeFace = async (base64Image) => {
  const response = await fetch('http://localhost:8000/api/recognition/frame', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64Image })
  });
  return response.json();
  // Returns: { faces: [{ name: "John", similarity: 0.87, recognized: true }] }
};

// 4. Record attendance
const recordAttendance = async (data) => {
  const response = await fetch('http://localhost:8000/api/attendance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      studentName: data.name,
      courseId: data.courseId,
      courseCode: data.courseCode,
      courseName: data.courseName,
      weekNumber: data.weekNumber,
      action: 'JOIN',
      similarity: data.similarity
    })
  });
  return response.json();
};

// 5. Get weekly report
const getWeeklyReport = async (courseCode, weekNumber) => {
  const response = await fetch(
    `http://localhost:8000/api/reports/weekly?courseCode=${courseCode}&weekNumber=${weekNumber}`
  );
  return response.json();
};
```

### React Webcam Integration

```javascript
import Webcam from 'react-webcam';

function AttendanceScanner() {
  const webcamRef = useRef(null);
  
  const captureAndRecognize = async () => {
    const imageSrc = webcamRef.current.getScreenshot();
    const result = await recognizeFace(imageSrc);
    
    if (result.data.faces.length > 0) {
      const face = result.data.faces[0];
      if (face.recognized) {
        console.log(`Recognized: ${face.name} (${face.similarity})`);
        // Record attendance
        await recordAttendance({
          name: face.name,
          similarity: face.similarity,
          // ... course info
        });
      }
    }
  };
  
  return (
    <div>
      <Webcam ref={webcamRef} screenshotFormat="image/jpeg" />
      <button onClick={captureAndRecognize}>Scan Face</button>
    </div>
  );
}
```

---

## File Structure - What Each File Does

```
R/
├── main.R                        # ENTRY POINT - Desktop app
├── api_server.R                  # REST API for React integration
├── utils.R                       # Helper functions
│
├── setup/                        # Setup and configuration files
│   ├── config.R                  # Settings (camera size, thresholds)
│   ├── environment_setup.R       # Python environment checks
│   └── quick_setup.R             # SETUP - Run once to encode faces
│
├── generators/                   # Python code generators
│   ├── firebase.R                # Generates Firebase code
│   ├── course_selection.R        # Generates course/login UI code
│   ├── detection.R               # Generates face detection code
│   ├── ui.R                      # Generates UI code
│   └── main_loop.R               # Generates main loop code
│
├── generated/                    # Auto-generated Python files
│   └── face_recognition.py       # Generated: main Python script
│
├── dataset/                      # YOUR FACE IMAGES GO HERE
├── face_encodings.pkl            # Generated: encoded face data
│
├── README.md                     # This documentation
└── ENHANCED_FEATURES.md          # Feature documentation
```

---

## Firestore Data Structure

### Courses Collection
```
courses/
└── {courseId}
    ├── courseCode: "EBA3201"
    ├── courseName: "Advanced Statistics"
    ├── lecturerName: "Mohamed Fathy"
    ├── lecturerUsername: "fathy"
    ├── lecturerPassword: "12345"
    ├── department: "Ai"
    ├── semester: "Fall 2025"
    └── schedule: "Sunday 10:30"
```

### Attendance Records (Real-time)
```
attendance/
└── {recordId}
    ├── studentName: "John Doe"
    ├── action: "JOIN" | "LEFT" | "RETURNED"
    ├── similarity: 0.87
    ├── timestamp: "2025-11-30T10:30:45.123Z"
    ├── date: "2025-11-30"
    ├── time: "10:30:45"
    ├── dayOfWeek: "Sunday"
    ├── courseId: "abc123"
    ├── courseCode: "EBA3201"
    ├── courseName: "Advanced Statistics"
    ├── department: "Ai"
    ├── semester: "Fall 2025"
    ├── weekNumber: 5
    ├── lecturerName: "Mohamed Fathy"
    └── createdAt: "2025-11-30T10:30:45.123Z"
```

---

## Configuration (setup/config.R)

```r
FACE_ENCODINGS_FILE <- "face_encodings.pkl"
CAMERA_WIDTH <- 1280
CAMERA_HEIGHT <- 720
STABILITY_DURATION <- 2.0         # Seconds to hold face for capture
SIMILARITY_THRESHOLD <- 0.45      # Match sensitivity (0-1)
```

---

## Troubleshooting

### "Face encodings not found"
Run `Rscript setup/quick_setup.R` first.

### "Conda environment not found"
Create conda environment: `conda create -n faceenv python=3.9`

### "No courses found"
Check your Firestore "courses" collection exists and has data.

### "Login failed"
Ensure you enter the correct lecturerUsername and lecturerPassword for the selected course.

### "API server not starting"
Install plumber: `install.packages("plumber")`

### "CORS error in React"
The API server includes CORS headers. Make sure you're running the latest `api_server.R`.

---

## Summary

**Desktop App (main.R):**
1. `conda create -n faceenv python=3.9` + install packages
2. Add images to `dataset/`
3. `Rscript setup/quick_setup.R` (once)
4. `Rscript main.R` (to run)

**React Integration (api_server.R):**
1. Same setup as above
2. `install.packages("plumber")` in R
3. `Rscript api_server.R` (starts API on port 8000)
4. Connect React to `http://localhost:8000/api/*`
