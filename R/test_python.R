# test_python.R
# Simple test to verify Python environment

library(reticulate)

cat("Testing Python environment...\n")

# Clear environment
Sys.unsetenv("RETICULATE_PYTHON")

# Set specific Python path
python_path <- "E:/attendanceFacialRecognition/r_python_env/Scripts/python.exe"
cat("Using Python at:", python_path, "\n")

if (!file.exists(python_path)) {
  stop("Python executable not found at:", python_path)
}

# Force use of this Python
Sys.setenv(RETICULATE_PYTHON = python_path)
use_python(python_path, required = TRUE)

cat("Python configuration:\n")
print(py_config())

cat("\nTesting imports...\n")
tryCatch({
  cv2 <- import("cv2")
  cat("✓ OpenCV imported\n")
  
  np <- import("numpy")
  cat("✓ NumPy imported\n")
  
  torch <- import("torch")
  cat("✓ PyTorch imported\n")
  
  cat("✅ All imports successful!\n")
}, error = function(e) {
  cat("❌ Import failed:\n")
  cat(e$message, "\n")
})

cat("Test completed.\n")