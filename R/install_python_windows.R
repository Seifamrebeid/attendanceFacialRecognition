# install_python_windows.R
# Script to install Python and required packages on Windows

cat("=========================================\n")
cat("Python Installation for R Face Recognition\n")
cat("=========================================\n\n")

# Function to check if command exists
command_exists <- function(cmd) {
  result <- suppressWarnings(system2("where", cmd, stdout = TRUE, stderr = TRUE))
  !any(grepl("Could not find", result))
}

# Check if Python is already installed
cat("1. Checking for existing Python installation...\n")
if (command_exists("python")) {
  python_version <- system2("python", "--version", stdout = TRUE)
  cat("✓ Python found:", python_version, "\n")
  python_installed <- TRUE
} else {
  cat("✗ Python not found\n")
  python_installed <- FALSE
}

# Check if pip is available
if (python_installed && command_exists("pip")) {
  pip_version <- system2("pip", "--version", stdout = TRUE)
  cat("✓ pip found:", strsplit(pip_version, "\\s+")[[1]][2], "\n")
  pip_available <- TRUE
} else {
  cat("✗ pip not found\n")
  pip_available <- FALSE
}

# Install Python if needed
if (!python_installed) {
  cat("\n2. Installing Python...\n")
  cat("Trying different installation methods...\n")
  
  # Method 1: Try winget with different package names
  winget_packages <- c(
    "Python.Python.3.11",
    "Python.Python.3", 
    "Python.Python.3.12",
    "Python.Python.3.10"
  )
  
  python_installed <- FALSE
  for (pkg in winget_packages) {
    cat("Trying:", pkg, "...\n")
    result <- system2("winget", c("install", "-e", "--id", pkg), 
                     stdout = TRUE, stderr = TRUE)
    if (!any(grepl("No package found", result))) {
      cat("✓ Python installation initiated with", pkg, "\n")
      Sys.sleep(5)  # Wait for installation
      if (command_exists("python")) {
        python_installed <- TRUE
        break
      }
    }
  }
  
  # Method 2: Chocolatey
  if (!python_installed && command_exists("choco")) {
    cat("Trying Chocolatey...\n")
    system2("choco", c("install", "python", "-y"))
    Sys.sleep(5)
    python_installed <- command_exists("python")
  }
  
  # Method 3: Direct download instruction
  if (!python_installed) {
    cat("\n❌ Automatic installation failed.\n")
    cat("Please install Python manually:\n")
    cat("1. Go to: https://www.python.org/downloads/\n")
    cat("2. Download and install the latest Python version\n")
    cat("3. Make sure to check 'Add Python to PATH' during installation\n")
    cat("4. Restart this script after installation\n")
    stop("Python installation required")
  }
}

# Install required Python packages
if (python_installed || command_exists("pip")) {
  cat("\n3. Installing required Python packages...\n")
  
  packages <- c(
    "opencv-python",
    "numpy", 
    "torch",
    "torchvision",
    "facenet-pytorch",
    "Pillow",
    "scikit-learn"
  )
  
  for (pkg in packages) {
    cat("Installing", pkg, "...\n")
    result <- system2("pip", c("install", pkg), stdout = TRUE, stderr = TRUE)
    if (any(grepl("Successfully installed", result)) || any(grepl("already satisfied", result))) {
      cat("✓", pkg, "installed successfully\n")
    } else {
      cat("⚠", pkg, "installation may have issues\n")
    }
  }
}

# Test installation
cat("\n4. Testing Python environment...\n")
library(reticulate)

tryCatch({
  # Use system Python
  use_python("python")
  
  # Test imports
  cv2 <- import("cv2")
  cat("✓ OpenCV imported successfully\n")
  
  np <- import("numpy")
  cat("✓ NumPy imported successfully\n")
  
  torch <- import("torch")
  cat("✓ PyTorch imported successfully\n")
  
  PIL <- import("PIL")
  cat("✓ Pillow imported successfully\n")
  
  facenet <- import("facenet_pytorch")
  cat("✓ FaceNet imported successfully\n")
  
  # Test device
  device <- if (torch$cuda$is_available()) "cuda" else "cpu"
  cat("✓ Using device:", device, "\n")
  
  cat("\n=========================================\n")
  cat("✅ Installation completed successfully!\n")
  cat("=========================================\n")
  cat("You can now run:\n")
  cat("1. Rscript encode_dataset.R\n")
  cat("2. Rscript recognize_webcam.R\n\n")
  
}, error = function(e) {
  cat("\n❌ Installation test failed:\n")
  cat(e$message, "\n")
  cat("\nPlease try manual installation:\n")
  cat("pip install opencv-python numpy torch torchvision facenet-pytorch Pillow scikit-learn\n")
})