# config.R
# Configuration file with all constants for the Smart Attendance System
#
# This module contains all configurable parameters and constants used
# throughout the application.

#' @title Face Encodings File Path
#' @description Path to the pickle file containing face encodings
FACE_ENCODINGS_FILE <- "face_encodings.pkl"

#' @title Camera Resolution Width
#' @description Width of the camera capture resolution in pixels
CAMERA_WIDTH <- 1280

#' @title Camera Resolution Height
#' @description Height of the camera capture resolution in pixels
CAMERA_HEIGHT <- 720

#' @title Stability Duration
#' @description Seconds required to hold face stable for auto-capture
STABILITY_DURATION <- 2.0

#' @title Similarity Threshold
#' @description Minimum cosine similarity score to consider a face match
SIMILARITY_THRESHOLD <- 0.45

#' @title Auto Capture Message Duration
#' @description Duration in seconds to display auto-capture message
AUTO_CAPTURE_MESSAGE_DURATION <- 3

#' @title Firebase Service File
#' @description Path to Firebase service account credentials
FIREBASE_SERVICE_FILE <- "service.json"

#' @title Conda Environment Name
#' @description Name of the conda environment for Python execution
CONDA_ENV_NAME <- "faceenv"

#' @title Python Script Output File
#' @description Name of the generated Python script file (in generated/ folder)
PYTHON_SCRIPT_FILE <- "generated/face_recognition.py"

#' @title Frame Skip Rate
#' @description Process every Nth frame for face detection (performance optimization)
FRAME_SKIP_RATE <- 1

#' @title Max Position History
#' @description Maximum number of face positions to track for stability
MAX_POSITION_HISTORY <- 10

#' @title Recent Departure Window
#' @description Time in seconds (10 minutes) to consider someone as "returned"
RECENT_DEPARTURE_WINDOW <- 600

#' @title Duplicate Detection Window
#' @description Time in seconds to prevent duplicate detections for same person
DUPLICATE_DETECTION_WINDOW <- 5

#' @title Full HD Canvas Dimensions
#' @description Dimensions for the unified fullscreen interface
CANVAS_WIDTH <- 1920
CANVAS_HEIGHT <- 1080

#' @title Optimal Zone Percentage
#' @description Percentage of frame that defines the optimal capture zone
OPTIMAL_ZONE_PERCENT <- 0.4

#' @title Minimum Face Area
#' @description Minimum face area in pixels for detection
MIN_FACE_AREA <- 8000

#' @title Maximum Face Area
#' @description Maximum face area in pixels for detection
MAX_FACE_AREA <- 50000

#' @title Face Recognition Low Threshold
#' @description Lower threshold for continuous face recognition display
FACE_RECOGNITION_LOW_THRESHOLD <- 0.35

#' Print Configuration Summary
#'
#' @description Prints a summary of the current configuration settings
#' @return NULL (prints to console)
#' @export
print_config <- function() {
  cat("\n=== Configuration Summary ===\n")
  cat(sprintf("Face encodings file: %s\n", FACE_ENCODINGS_FILE))
  cat(sprintf("Camera resolution: %dx%d\n", CAMERA_WIDTH, CAMERA_HEIGHT))
  cat(sprintf("Stability duration: %.1f seconds\n", STABILITY_DURATION))
  cat(sprintf("Similarity threshold: %.2f\n", SIMILARITY_THRESHOLD))
  cat(sprintf("Conda environment: %s\n", CONDA_ENV_NAME))
  cat("=============================\n")
}
