# install_packages.R
# Install required packages for facial recognition attendance system

# Install packages from CRAN
install.packages(c(
  "opencv",      # For computer vision operations
  "imager",      # For image processing
  "reticulate",  # To interface with Python libraries
  "FNN",         # For k-nearest neighbors
  "magrittr",    # For pipe operators
  "jsonlite",    # For JSON operations
  "here"         # For path management
))

# Install torch for R (deep learning)
if (!require("torch")) {
  install.packages("torch")
}

# Install additional image processing packages
if (!require("magick")) {
  install.packages("magick")
}

# Verify installation
cat("Checking installed packages...\n")
required_packages <- c("opencv", "imager", "reticulate", "FNN", "magrittr", "torch", "magick")
for (pkg in required_packages) {
  if (require(pkg, character.only = TRUE)) {
    cat(paste("✓", pkg, "installed successfully\n"))
  } else {
    cat(paste("✗", pkg, "installation failed\n"))
  }
}

cat("\nPackage installation completed!\n")
cat("Note: You may need to install Python packages for reticulate:\n")
cat("- pip install opencv-python numpy pillow torch torchvision facenet-pytorch\n")