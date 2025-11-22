# INSTALLATION_GUIDE.md

# Installation Guide for R Facial Recognition System

## Quick Setup Instructions

### Step 1: Install Python

Since automatic Python installation failed, please install Python manually:

1. **Download Python:**

   - Go to: https://www.python.org/downloads/
   - Download Python 3.11 or 3.12 (recommended)

2. **Install Python:**

   - Run the installer
   - **IMPORTANT**: Check "Add Python to PATH" during installation
   - Choose "Install for all users" if prompted

3. **Verify Installation:**
   ```powershell
   python --version
   pip --version
   ```

### Step 2: Install Required Python Packages

Open PowerShell and run:

```powershell
pip install opencv-python numpy torch torchvision facenet-pytorch Pillow scikit-learn
```

### Step 3: Test the System

1. **Create face encodings:**

   ```powershell
   cd e:\attendanceFacialRecognition\R
   Rscript encode_dataset.R
   ```

2. **Start face recognition:**
   ```powershell
   Rscript recognize_webcam.R
   ```

## Alternative: Use Python from existing environment

If you have Python in your virtual environment, activate it first:

```powershell
# Activate the venv
& e:\attendanceFacialRecognition\venv\Scripts\Activate.ps1

# Install packages in the venv
pip install opencv-python numpy torch torchvision facenet-pytorch Pillow scikit-learn

# Run R scripts
Rscript encode_dataset.R
Rscript recognize_webcam.R
```

## Troubleshooting

### Problem: "python not found"

- Restart your PowerShell/Command Prompt after Python installation
- Check if Python is in PATH: `where python`
- Try using full path: `C:\Users\[username]\AppData\Local\Programs\Python\Python311\python.exe`

### Problem: "No module named 'cv2'"

- Install OpenCV: `pip install opencv-python`
- If still fails, try: `pip install --upgrade opencv-python`

### Problem: "Could not find a Python environment"

- Make sure Python is installed and in PATH
- Try running: `python -c "import sys; print(sys.executable)"`
- Use the output path in R: `use_python("path/from/above")`

### Problem: Camera access

- Make sure no other application is using the camera
- Try different camera index (0, 1, 2) in the script
- Run as administrator if needed

## Manual Python Setup in R

If automatic detection fails, you can manually set Python path in R:

```r
library(reticulate)
# Replace with your actual Python path
use_python("C:\\Users\\[username]\\AppData\\Local\\Programs\\Python\\Python311\\python.exe")

# Test imports
cv2 <- import("cv2")
```

## Project Structure

```
R/
├── encode_dataset.R              # Create face encodings from dataset
├── recognize_webcam.R           # Real-time face recognition
├── recognize_webcam_simple.R    # Simplified version
├── install_python_windows.R     # Python installation script
├── setup_environment.R         # Environment checker
├── attendance_logger.R          # Attendance logging functions
├── dataset/                     # Face images folder
│   ├── person1.jpg
│   ├── person2.jpg
│   └── ...
└── INSTALLATION_GUIDE.md       # This file
```

## Usage

1. **Prepare dataset**: Add face images to `dataset/` folder
2. **Create encodings**: Run `Rscript encode_dataset.R`
3. **Start recognition**: Run `Rscript recognize_webcam.R`

### Controls:

- Press 'c' to capture and match faces
- Press 'q' to quit
- Press 'a' to add to attendance log

## System Requirements

- **R**: Version 4.0+
- **Python**: 3.8+ (3.11 recommended)
- **Camera**: USB/built-in webcam
- **RAM**: 4GB minimum (8GB recommended for GPU)
- **Storage**: 2GB free space for models

## Dependencies

### R Packages:

- reticulate (Python interface)
- magrittr (pipe operators)
- here (path management)
- FNN (nearest neighbors)

### Python Packages:

- opencv-python (computer vision)
- numpy (numerical computing)
- torch + torchvision (deep learning)
- facenet-pytorch (face recognition models)
- Pillow (image processing)
- scikit-learn (machine learning utilities)

## Contact

For issues or questions:

1. Check this guide for common problems
2. Verify all dependencies are installed
3. Test with simple Python imports first
4. Check camera access and permissions
