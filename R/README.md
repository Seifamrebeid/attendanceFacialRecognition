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

## File Structure - What Each File Does

```
R/
├── main.R                        # ENTRY POINT - Run this to start the app
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

---

## Summary

**To start from zero:**
1. `conda create -n faceenv python=3.9` + install packages
2. Add images to `dataset/`
3. `Rscript setup/quick_setup.R` (once)
4. `Rscript main.R` (to run)

**New Flow:**
1. Select course from dropdown
2. Select week (1-16)
3. Enter lecturer credentials
4. Click "Start Attendance"
5. Attendance records saved in real-time to Firestore
