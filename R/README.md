# README.md

# Facial Recognition Attendance System - R Implementation

This R implementation provides the same facial recognition attendance functionality as the Python version, using R's interface to Python deep learning libraries.

## Features

- **Face Encoding**: Create facial encodings from a dataset of face images
- **Real-time Recognition**: Recognize faces from webcam feed in real-time
- **Attendance Logging**: Automatic attendance logging with timestamps
- **Reporting**: Generate daily, monthly, and summary attendance reports
- **Duplicate Prevention**: Prevents logging the same person multiple times within 30 seconds

## Files Structure

```
R/
├── install_packages.R      # Install required R packages
├── setup_environment.R     # Environment setup and verification
├── encode_dataset.R        # Create face encodings from dataset images
├── recognize_webcam.R      # Real-time face recognition from webcam
├── attendance_logger.R     # Enhanced attendance logging functions
├── dataset/               # Directory for face images (create this)
└── README.md              # This file
```

## Setup Instructions

### 1. Install R Packages

```r
source("install_packages.R")
```

This installs all required R packages including:

- `reticulate` (Python interface)
- `torch` (Deep learning)
- `opencv`, `magick` (Image processing)
- `FNN` (Nearest neighbors)
- `dplyr`, `lubridate` (Data manipulation)

### 2. Setup Environment

```r
source("setup_environment.R")
```

This script will:

- Check all package installations
- Verify Python environment setup
- Check dataset directory
- Provide setup guidance

### 3. Prepare Dataset

1. Create a `dataset` folder in the R directory
2. Add face images with clear naming:
   - `john_doe.jpg`
   - `jane_smith.png`
   - `person_name.jpeg`
3. Use clear, front-facing photos for best results

### 4. Create Face Encodings

```r
source("encode_dataset.R")
```

This will:

- Process all images in the dataset folder
- Create face encodings using FaceNet
- Save encodings to `encodings.rds` and `names.rds`

### 5. Start Face Recognition

```r
source("recognize_webcam.R")
```

**Controls:**

- Press `'c'` to capture and match faces
- Press `'q'` to quit
- Press `'a'` to add to attendance log (future feature)

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

### Dependencies

**R Packages:**

- `reticulate`: Interface with Python libraries
- `torch`: Deep learning framework
- `opencv`/`magick`: Image processing
- `FNN`: K-nearest neighbors
- `dplyr`/`lubridate`: Data manipulation

**Python Libraries (via reticulate):**

- `facenet-pytorch`: Face detection and encoding
- `opencv-python`: Computer vision
- `numpy`: Numerical computing
- `torch`: Deep learning backend
- `PIL`: Image processing

### Face Recognition Pipeline

1. **Face Detection**: Uses MTCNN (Multi-task CNN) to detect faces in images
2. **Face Encoding**: Uses InceptionResnetV1 (FaceNet) to generate 512-dimensional face embeddings
3. **Face Matching**: Uses cosine similarity to match faces against known encodings
4. **Threshold**: Similarity threshold of 0.45 (configurable)

### File Formats

- **Encodings**: Saved as R RDS files (`encodings.rds`, `names.rds`)
- **Attendance Logs**: CSV format with timestamps, names, and similarity scores
- **Reports**: CSV format for easy analysis in R or Excel

## Configuration

Key parameters you can adjust:

- **Similarity Threshold**: Change `similarity_threshold` in `recognize_webcam.R`
- **Duplicate Prevention**: Modify time window in `attendance_logger.R`
- **Device**: Automatically uses CUDA if available, otherwise CPU

## Troubleshooting

### Python Environment Issues

If you encounter Python package issues:

```r
# Check Python configuration
reticulate::py_config()

# Install Python packages manually
system("pip install opencv-python numpy pillow torch torchvision facenet-pytorch")
```

### Camera Issues

If camera doesn't open:

- Check if other applications are using the camera
- Try different camera indices (change `0L` to `1L`, `2L`, etc. in `recognize_webcam.R`)
- Ensure OpenCV is properly installed

### Low Recognition Accuracy

- Use higher quality, well-lit face images in dataset
- Ensure faces are front-facing and clearly visible
- Add multiple images per person to the dataset
- Adjust similarity threshold

## Performance Notes

- **GPU Acceleration**: Automatically uses CUDA if available
- **Processing Speed**: Real-time processing depends on hardware
- **Memory Usage**: Scales with dataset size

## Integration with Python Version

This R implementation can work alongside the Python version:

- Shares the same dataset folder
- Compatible with Python-generated encodings (with conversion)
- Can process the same image dataset

## Future Enhancements

- [ ] Real-time attendance logging integration
- [ ] Web interface using Shiny
- [ ] Advanced reporting and analytics
- [ ] Integration with external attendance systems
- [ ] Face anti-spoofing measures
