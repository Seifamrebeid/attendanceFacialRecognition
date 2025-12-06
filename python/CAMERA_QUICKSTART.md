# 🎥 Camera Attendance System - Quick Start Guide

## 📋 Overview
This facial recognition attendance system uses your webcam to identify students and record their attendance in real-time.

## 🚀 Quick Start

### Step 1: Install Dependencies
```powershell
cd "d:\New folder\attendanceFacialRecognition\python"
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### Step 2: Prepare Student Dataset
1. **Add student photos** to the `dataset` folder
2. Organize them in subfolders by student name:
   ```
   dataset/
   ├── John_Doe/
   │   ├── photo1.jpg
   │   ├── photo2.jpg
   │   └── photo3.jpg
   ├── Jane_Smith/
   │   ├── photo1.jpg
   │   └── photo2.jpg
   ```

### Step 3: Encode Faces
Run this to create facial encodings from your dataset:
```powershell
python encode_dataset.py
```

This creates two files:
- `encodings.npy` - Face embeddings
- `names.npy` - Student names

### Step 4: Run Camera Attendance
```powershell
python recognize_webcam.py
```

## 🎮 Controls

When the camera window opens:
- **Press 'c'** - Capture and match face
- **Press 'q'** - Quit

## 📊 How It Works

1. **Camera opens** - Shows live webcam feed
2. **Press 'c'** - Captures current frame
3. **Face detection** - Finds faces in the frame
4. **Recognition** - Matches against known students
5. **Display result** - Shows name + confidence score
   - Green box = Recognized student
   - "Unknown" = No match found (below threshold)

## ⚙️ Configuration

Edit `recognize_webcam.py` to adjust:
- **Line 88**: `threshold = 0.45` - Recognition sensitivity
  - Higher (e.g., 0.6) = More strict matching
  - Lower (e.g., 0.3) = More lenient matching

## 🔧 Troubleshooting

### Camera Not Opening
- Check if another app is using the webcam
- Try changing `cv2.VideoCapture(0)` to `cv2.VideoCapture(1)` in line 24

### No Faces Detected
- Ensure good lighting
- Face the camera directly
- Move closer to the camera

### Low Recognition Accuracy
- Add more photos per student (5-10 recommended)
- Use photos with different angles/lighting
- Retrain: Delete `encodings.npy` and run `encode_dataset.py` again

## 📝 Next Steps

To integrate with Firebase/Admin Panel:
1. Edit `write_firestore.py` to save attendance records
2. Connect to your Firebase project
3. Run it alongside `recognize_webcam.py`

## 🎯 Current Status
- ✅ Dependencies: Installing...
- ⏳ Dataset: Needs student photos
- ⏳ Encodings: Run `encode_dataset.py` after adding photos
- ⏳ Camera: Ready to run after encodings are created
