@echo off
echo ========================================
echo Camera Attendance System Launcher
echo ========================================
echo.

REM Check if we're in the right directory
if not exist "recognize_webcam.py" (
    echo ERROR: Please run this from the python folder
    echo Current directory: %CD%
    pause
    exit /b 1
)

echo Checking for Python...
python --version
echo.

echo Checking for required files...
if not exist "encodings.npy" (
    echo ERROR: encodings.npy not found!
    echo Please run: python encode_dataset.py
    pause
    exit /b 1
)

if not exist "names.npy" (
    echo ERROR: names.npy not found!
    echo Please run: python encode_dataset.py
    pause
    exit /b 1
)

echo Encodings found: encodings.npy
echo Names found: names.npy
echo.

echo Attempting to run camera attendance system...
echo.
echo Controls:
echo   Press 'c' to capture and identify face
echo   Press 'q' to quit
echo.
echo ========================================

python recognize_webcam.py

if errorlevel 1 (
    echo.
    echo ========================================
    echo ERROR: Failed to run the camera system
    echo ========================================
    echo.
    echo This is likely due to missing Python packages.
    echo.
    echo SOLUTION:
    echo 1. Install Python 3.11 or 3.12 from python.org
    echo 2. Run: py -3.11 -m pip install numpy opencv-python pillow torch torchvision facenet-pytorch scikit-learn
    echo 3. Run this script again
    echo.
    pause
)
