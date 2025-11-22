# setup_environment.R
# Setup script for the R facial recognition attendance system

# Function to check if Python package is installed
check_python_package <- function(package_name) {
  tryCatch({
    reticulate::import(package_name)
    return(TRUE)
  }, error = function(e) {
    return(FALSE)
  })
}

# Setup function
setup_attendance_system <- function() {
  cat("========================================\n")
  cat("Facial Recognition Attendance System\n")
  cat("R Implementation Setup\n")
  cat("========================================\n\n")
  
  # Check R packages
  cat("1. Checking R packages...\n")
  required_r_packages <- c("reticulate", "FNN", "magrittr", "here", "torch")
  missing_packages <- c()
  
  for (pkg in required_r_packages) {
    if (!require(pkg, character.only = TRUE, quietly = TRUE)) {
      missing_packages <- c(missing_packages, pkg)
    } else {
      cat("  ✓", pkg, "\n")
    }
  }
  
  if (length(missing_packages) > 0) {
    cat("  Missing packages:", paste(missing_packages, collapse = ", "), "\n")
    cat("  Installing missing packages...\n")
    install.packages(missing_packages)
  }
  
  # Load reticulate for Python checks
  library(reticulate)
  
  # Check Python environment
  cat("\n2. Checking Python environment...\n")
  python_path <- here::here("..", "python", ".conda", "python.exe")
  if (file.exists(python_path)) {
    use_python(python_path)
    cat("  ✓ Using conda environment from python folder\n")
  } else {
    cat("  ⚠ Using system Python\n")
    cat("    Make sure to install required packages:\n")
    cat("    pip install opencv-python numpy pillow torch torchvision facenet-pytorch\n")
  }
  
  # Check Python packages
  cat("\n3. Checking Python packages...\n")
  python_packages <- c("cv2", "numpy", "torch", "PIL", "facenet_pytorch")
  
  for (pkg in python_packages) {
    if (check_python_package(pkg)) {
      cat("  ✓", pkg, "\n")
    } else {
      cat("  ✗", pkg, "- Not found\n")
    }
  }
  
  # Check dataset directory
  cat("\n4. Checking dataset setup...\n")
  if (dir.exists("dataset")) {
    image_files <- list.files("dataset", pattern = "\\.(jpg|jpeg|png)$", ignore.case = TRUE)
    if (length(image_files) > 0) {
      cat("  ✓ Dataset directory found with", length(image_files), "images\n")
      cat("    Images:", paste(image_files, collapse = ", "), "\n")
    } else {
      cat("  ⚠ Dataset directory is empty\n")
      cat("    Add face images to the dataset folder\n")
    }
  } else {
    cat("  ✗ Dataset directory not found\n")
    cat("    Creating dataset directory...\n")
    dir.create("dataset")
    cat("    Please add face images to the dataset folder\n")
  }
  
  # Check for existing encodings
  cat("\n5. Checking existing encodings...\n")
  if (file.exists("encodings.rds") && file.exists("names.rds")) {
    names_list <- readRDS("names.rds")
    cat("  ✓ Found existing encodings for:", paste(names_list, collapse = ", "), "\n")
  } else {
    cat("  ⚠ No existing encodings found\n")
    cat("    Run encode_dataset.R to create face encodings\n")
  }
  
  cat("\n========================================\n")
  cat("Setup Summary:\n")
  cat("========================================\n")
  cat("To use the attendance system:\n\n")
  cat("1. Add face images to the 'dataset' folder\n")
  cat("   - Name files as 'person_name.jpg'\n")
  cat("   - Use clear, front-facing photos\n\n")
  cat("2. Run: source('encode_dataset.R')\n")
  cat("   - This creates face encodings\n\n")
  cat("3. Run: source('recognize_webcam.R')\n")
  cat("   - This starts the recognition system\n\n")
  cat("Files in this directory:\n")
  cat("  - install_packages.R: Install required packages\n")
  cat("  - setup_environment.R: This setup script\n")
  cat("  - encode_dataset.R: Create face encodings from dataset\n")
  cat("  - recognize_webcam.R: Real-time face recognition\n")
  cat("  - dataset/: Folder for face images\n")
  cat("========================================\n")
}

# Run setup
setup_attendance_system()