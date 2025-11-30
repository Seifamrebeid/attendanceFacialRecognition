# Facial Recognition Attendance System - R Implementation

## Quick Start Guide (Step-by-Step)

### Step 1: Prerequisites
- **R** (version 4.0+)
- **Conda** (Anaconda or Miniconda)
- **Webcam**

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
Rscript quick_setup.R
```
This creates `face_encodings.pkl` with encoded face data.

### Step 5: Run the Attendance System
```bash
Rscript main.R
```
This launches the camera and starts face recognition.

---

## File Structure - What Each File Does

```
R/
├── main.R                        # ENTRY POINT - Run this to start the app
├── quick_setup.R                 # SETUP - Run once to encode faces
│
├── config.R                      # Settings (camera size, thresholds)
├── utils.R                       # Helper functions
├── environment_setup.R           # Checks Python environment
│
├── python_generator_firebase.R   # Generates Firebase code
├── python_generator_detection.R  # Generates face detection code
├── python_generator_ui.R         # Generates UI code
├── python_generator_main.R       # Generates main loop code
│
├── dataset/                      # YOUR FACE IMAGES GO HERE
├── face_encodings.pkl            # Generated: encoded face data
├── face_recognition.py           # Generated: Python script
│
├── README.md                     # This documentation
└── ENHANCED_FEATURES.md          # Feature documentation
```

---

## Used Files vs Unused Files

### ✅ USED FILES (Required for the app to work)

| File | Purpose | When Used |
|------|---------|-----------|
| `main.R` | Main entry point | Every time you run the app |
| `config.R` | Configuration settings | Sourced by main.R |
| `utils.R` | Helper functions | Sourced by main.R |
| `environment_setup.R` | Environment checks | Sourced by main.R |
| `python_generator_firebase.R` | Firebase code generation | Sourced by main.R |
| `python_generator_detection.R` | Detection code generation | Sourced by main.R |
| `python_generator_ui.R` | UI code generation | Sourced by main.R |
| `python_generator_main.R` | Main loop code generation | Sourced by main.R |
| `quick_setup.R` | Face encoding | Run once at setup |
| `dataset/` | Face images folder | Used by quick_setup.R |

### 📁 GENERATED FILES (Created automatically)

| File | Created By | Purpose |
|------|------------|---------|
| `face_encodings.pkl` | quick_setup.R | Stores face encodings |
| `face_recognition.py` | main.R | Python script to run recognition |
| `encode_faces.py` | quick_setup.R | Python script to encode faces |
| `attendance_*.csv` | main.R | Attendance logs |

### 📄 DOCUMENTATION FILES

| File | Purpose |
|------|---------|
| `README.md` | This documentation |
| `ENHANCED_FEATURES.md` | Feature documentation |

---

## Configuration (config.R)

```r
FACE_ENCODINGS_FILE <- "face_encodings.pkl"   # Face data file
CAMERA_WIDTH <- 1280                          # Camera resolution
CAMERA_HEIGHT <- 720
STABILITY_DURATION <- 2.0                     # Seconds to hold face
SIMILARITY_THRESHOLD <- 0.45                  # Match sensitivity (0-1)
```

---

## Troubleshooting

### "Face encodings not found"
Run `Rscript quick_setup.R` first.

### "Conda environment not found"
Create conda environment: `conda create -n faceenv python=3.9`

### "No faces detected"
- Check lighting
- Position face clearly in camera
- Add higher quality images to dataset

### "Low recognition accuracy"
- Lower `SIMILARITY_THRESHOLD` in config.R (e.g., 0.40)
- Add more/better images per person

---

## Summary

**To start from zero:**
1. `conda create -n faceenv python=3.9` + install packages
2. Add images to `dataset/`
3. `Rscript quick_setup.R` (once)
4. `Rscript main.R` (to run)
