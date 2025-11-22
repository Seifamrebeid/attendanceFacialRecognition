# README.md

# Facial Recognition Attendance System - R Implementation

This R implementation provides facial recognition attendance functionality using a hybrid approach that combines R workflow management with Python deep learning libraries.

## Features

- **Face Encoding**: Automatically creates facial encodings from dataset images
- **Real-time Recognition**: Recognizes faces from webcam feed in real-time
- **Attendance Logging**: Automatic attendance logging with timestamps
- **High Accuracy**: Uses FaceNet (InceptionResnetV1) for robust face recognition
- **Easy Setup**: Single-script setup and execution

## Files Structure

```
R/
├── quick_setup.R           # Creates face encodings from dataset
├── working_recognition.R   # Main face recognition system
├── face_encodings.pkl      # Generated face encodings (Python pickle format)
├── face_recognition.py     # Generated Python recognition script
├── dataset/               # Directory for face images
├── attendance_*.csv        # Generated attendance logs
└── README.md              # This file
```

## Complete Setup Guide - Zero to Done

### Step 1: Prerequisites Check

Before starting, ensure you have:

- **R installed** (version 4.0+)
- **Python installed** (3.8+)
- **Working webcam**
- **PowerShell** (Windows) or terminal access

### Step 2: Navigate to Project

Open PowerShell and navigate to the R folder:

```powershell
cd "e:\attendanceFacialRecognition\R"
```

### Step 3: Create Virtual Environment

Create a Python virtual environment inside the R folder:

```powershell
python -m venv venv
```

Expected output:

```
PS E:\attendanceFacialRecognition\R>
```

### Step 4: Activate Virtual Environment

Activate the virtual environment:

```powershell
& ".\venv\Scripts\Activate.ps1"
```

You should see `(venv)` prefix in your prompt:

```
(venv) PS E:\attendanceFacialRecognition\R>
```

### Step 5: Install Python Packages

Install all required packages:

```powershell
pip install opencv-python numpy torch torchvision facenet-pytorch Pillow pandas
```

Expected output (truncated):

```
Collecting opencv-python
  Using cached opencv_python-4.12.0.88-cp37-abi3-win_amd64.whl
...
Successfully installed MarkupSafe-3.0.3 Pillow-12.0.0 ... facenet-pytorch-2.5.3 ...
```

### Step 6: Prepare Your Dataset

1. **Add face images** to the `dataset/` folder:

   ```
   dataset/
   ├── john_doe.jpg      # Name files as: firstname_lastname.jpg
   ├── jane_smith.png    # Or: firstname.jpg
   ├── alice_wilson.jpeg # Supports: .jpg, .jpeg, .png
   └── bob_jones.jpg
   ```

2. **Image requirements:**
   - Clear, front-facing photos
   - Good lighting
   - Single person per image
   - Recommended size: 200x200px or larger

### Step 7: Create Face Encodings (One-Time Setup)

Run the encoding setup:

```powershell
Rscript quick_setup.R
```

Expected output:

```
🎯 R Facial Recognition - Quick Setup
=====================================

📄 Created encode_faces.py
🔄 Running face encoding...
Starting face encoding...
Using device: cpu
Processing abdullah.jpeg...
  ✓ Encoded abdullah.jpeg
Processing john.jpeg...
  ✓ Encoded john.jpeg
Processing salma.JPG...
  ✓ Encoded salma.JPG
Processing seif.jpeg...
  ✓ Encoded seif.jpeg

✅ Saved 4 face encodings!
People encoded: abdullah, john, salma, seif
✅ Face encodings created successfully!
```

**Files created:**

- `face_encodings.pkl` - Contains the encoded face data
- `encode_faces.py` - Generated Python script

### Step 8: Run Face Recognition

Start the facial recognition system:

```powershell
Rscript working_recognition.R
```

Expected output:

```
🎯 Facial Recognition Attendance System
=======================================

✅ Face encodings found!
📄 Created face_recognition.py
🚀 Starting face recognition...
   (This will open a camera window)

Loading face recognition system...
Loaded 4 face encodings
Known people: abdullah, john, salma, seif
Using device: cpu

Initializing camera...

🎥 Face Recognition Started!
Controls:
- Press SPACE to capture and match faces
- Press Q to quit
- Press A to add to attendance log
```

### Step 9: Using the Camera Interface

When the camera window opens:

1. **Position yourself** in front of the camera
2. **Press SPACE** to capture and analyze your face
3. **View results** in the terminal:
   ```
   📸 Capturing and processing faces...
   🔍 Detected 1 face(s)
   👤 Face 1: seif (0.87)
   ```
4. **Press A** to view attendance log:
   ```
   📝 Current attendance log:
     2025-11-22 23:39:53 - seif (0.87)
   ```
5. **Press Q** to quit the system

### Step 10: Check Results

After quitting, the system will save:

```
💾 Attendance log saved to attendance_20251122_233953.csv
Total entries: 4

✅ Face recognition session ended
✅ Face recognition completed!
```

**Generated files:**

- `attendance_YYYYMMDD_HHMMSS.csv` - Attendance records
- `face_recognition.py` - Generated recognition script

## Expected File Structure After Setup

```
R/
├── venv/                    # Virtual environment
│   ├── Scripts/
│   │   ├── python.exe      # Python interpreter
│   │   └── pip.exe         # Package manager
│   └── Lib/                # Installed packages
├── dataset/                 # Your face images
│   ├── person1.jpg
│   └── person2.jpg
├── quick_setup.R           # Encoding setup script
├── working_recognition.R   # Main recognition script
├── face_encodings.pkl      # Generated: Face data
├── face_recognition.py     # Generated: Recognition script
├── encode_faces.py         # Generated: Encoding script
├── attendance_*.csv        # Generated: Attendance logs
└── README.md              # This file
```

## Common Terminal Commands

```powershell
# Navigate to project
cd "e:\attendanceFacialRecognition\R"

# Activate environment (if not active)
& ".\venv\Scripts\Activate.ps1"

# Create new encodings (after adding new people)
Rscript quick_setup.R

# Run recognition system
Rscript working_recognition.R

# View attendance files
Get-ChildItem -Name "attendance_*.csv"

# Check Python packages
pip list
```

## Success Indicators

✅ **Virtual environment created** - See `(venv)` in prompt  
✅ **Packages installed** - No error messages during pip install  
✅ **Face encodings created** - See "✅ Saved X face encodings!" message  
✅ **Camera opens** - Window appears with camera feed  
✅ **Recognition works** - See confidence scores like "seif (0.87)"  
✅ **Attendance logged** - CSV file created with timestamp

## Attendance Logging

Load the attendance logging functions:

```r
source("attendance_logger.R")
```

**Available Functions:**

- `log_attendance(name, similarity)` - Log attendance entry
- `generate_daily_report(date)` - Generate daily attendance report
- `get_attendance_summary()` - Get overall attendance summary
- `export_monthly_report(year, month)` - Export monthly report

**Example Usage:**

```r
# Generate today's report
generate_daily_report()

# Get overall summary
get_attendance_summary()

# Export current month report
export_monthly_report()
```

## Technical Details

### Architecture

This system uses a **hybrid approach**:

- **R scripts** manage the workflow, user interface, and file operations
- **Python scripts** (generated by R) handle the deep learning computations
- **Virtual environment** (`r_python_env`) contains all Python dependencies

### Dependencies

**R Packages:**

- `reticulate`: Interface with Python (for system calls, not direct integration)

**Python Libraries:**

- `facenet-pytorch`: Face detection (MTCNN) and encoding (InceptionResnetV1)
- `opencv-python`: Computer vision and camera operations
- `torch`: Deep learning framework
- `numpy`: Numerical computing
- `PIL`: Image processing
- `pandas`: Data manipulation for attendance logs

### Face Recognition Pipeline

1. **Face Detection**: Uses MTCNN (Multi-task CNN) to detect faces in images
2. **Face Encoding**: Uses InceptionResnetV1 (FaceNet) to generate 512-dimensional face embeddings
3. **Face Matching**: Uses cosine similarity to match faces against known encodings
4. **Threshold**: Similarity threshold of 0.45 (configurable)

### File Formats

- **Face Encodings**: Saved as Python pickle file (`face_encodings.pkl`)
- **Attendance Logs**: CSV format with columns: name, timestamp, date, time, similarity_score
- **Generated Scripts**: Python files created by R for execution

## Configuration

Key parameters you can adjust in `working_recognition.R`:

- **Similarity Threshold**: Currently set to 0.45 (higher = more strict matching)
- **Camera Index**: Change camera source if multiple cameras available

## Troubleshooting Common Issues

### Issue 1: "Python not found" or "Access denied"

**Problem:** Windows Store Python restrictions or wrong Python path
**Solution:** Create virtual environment as shown in Step 3-5 above

### Issue 2: "No module named 'cv2'" or similar

**Problem:** Missing Python packages
**Solution:**

```powershell
# Activate venv first
& ".\venv\Scripts\Activate.ps1"
# Then reinstall packages
pip install opencv-python numpy torch torchvision facenet-pytorch Pillow pandas
```

### Issue 3: Camera not opening

**Problem:** Camera in use by another application or permissions
**Solution:**

- Close Skype, Teams, or other camera apps
- Check Windows Camera privacy settings
- Try running PowerShell as Administrator

### Issue 4: "No faces detected" repeatedly

**Problem:** Poor lighting or camera positioning
**Solution:**

- Ensure good lighting on your face
- Position face clearly in camera view
- Check if camera is working in other apps first

### Issue 5: Low recognition accuracy

**Problem:** Poor quality dataset images or wrong threshold
**Solution:**

- Use high-quality, well-lit photos in dataset
- Add multiple images per person
- Ensure faces are front-facing and clear

### Issue 6: R script errors

**Problem:** Syntax or path issues
**Solution:**

```powershell
# Check current directory
pwd
# Should be in: E:\attendanceFacialRecognition\R

# Check files exist
ls working_recognition.R
ls quick_setup.R
```

### Issue 7: Virtual environment activation fails

**Problem:** PowerShell execution policy
**Solution:**

```powershell
# Set execution policy for current session
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
# Then try activation again
& ".\venv\Scripts\Activate.ps1"
```

## Performance Notes

- **Processing Speed**: Real-time on most modern hardware
- **Memory Usage**: Scales with dataset size (~512 numbers per face)
- **GPU Support**: Automatically detects and uses CUDA if available

## Example Usage

### First Time Setup

```r
# 1. Add face images to dataset/ folder
# 2. Run encoding setup
Rscript quick_setup.R
```

Output:

```
🎯 R Facial Recognition - Quick Setup
✅ Saved 4 face encodings!
People encoded: abdullah, john, salma, seif
```

### Running Recognition

```r
Rscript working_recognition.R
```

Output:

```
🎯 Facial Recognition Attendance System
✅ Face encodings found!
🎥 Face Recognition Started!

# During recognition:
👤 Face 1: seif (0.87)
👤 Face 2: Unknown (0.23)

💾 Attendance log saved to attendance_20251122_225934.csv
```

## System Benefits

- ✅ **No complex R-Python integration issues**
- ✅ **Works with Windows Store Python or any Python installation**
- ✅ **Easy to understand and modify**
- ✅ **Reliable attendance logging**
- ✅ **High accuracy face recognition**
- ✅ **Real-time performance**
