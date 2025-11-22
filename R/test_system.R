# test_system.R
# Test script for the R facial recognition attendance system

cat("=========================================\n")
cat("Facial Recognition Attendance System\n") 
cat("R Implementation - Test Script\n")
cat("=========================================\n\n")

# Test 1: Check if required packages are available
cat("Test 1: Checking R packages...\n")
required_packages <- c("reticulate", "FNN", "magrittr", "here", "torch", "dplyr", "lubridate")
all_packages_ok <- TRUE

for (pkg in required_packages) {
  if (require(pkg, character.only = TRUE, quietly = TRUE)) {
    cat("  ✓", pkg, "\n")
  } else {
    cat("  ✗", pkg, "- Missing\n")
    all_packages_ok <- FALSE
  }
}

if (!all_packages_ok) {
  cat("\nSome packages are missing. Run: source('install_packages.R')\n")
  stop("Required packages missing")
}

# Test 2: Check Python environment
cat("\nTest 2: Checking Python environment...\n")
library(reticulate)

python_path <- here::here("..", "python", ".conda", "python.exe")
if (file.exists(python_path)) {
  use_python(python_path)
  cat("  ✓ Using conda environment\n")
} else {
  cat("  ⚠ Using system Python\n")
}

# Test 3: Check Python packages
cat("\nTest 3: Checking Python packages...\n")
python_packages <- list(
  "cv2" = "opencv-python",
  "numpy" = "numpy", 
  "torch" = "torch",
  "PIL" = "Pillow",
  "facenet_pytorch" = "facenet-pytorch"
)

python_ok <- TRUE
for (pkg_name in names(python_packages)) {
  tryCatch({
    import(pkg_name)
    cat("  ✓", pkg_name, "\n")
  }, error = function(e) {
    cat("  ✗", pkg_name, "- Install with: pip install", python_packages[[pkg_name]], "\n")
    python_ok <- FALSE
  })
}

# Test 4: Check dataset
cat("\nTest 4: Checking dataset...\n")
if (dir.exists("dataset")) {
  images <- list.files("dataset", pattern = "\\.(jpg|jpeg|png)$", ignore.case = TRUE)
  if (length(images) > 0) {
    cat("  ✓ Dataset found with", length(images), "images\n")
    for (img in images) {
      cat("    -", img, "\n")
    }
  } else {
    cat("  ✗ Dataset folder is empty\n")
  }
} else {
  cat("  ✗ Dataset folder not found\n")
}

# Test 5: Check if encodings exist
cat("\nTest 5: Checking encodings...\n")
if (file.exists("encodings.rds") && file.exists("names.rds")) {
  encodings <- readRDS("encodings.rds")
  names_list <- readRDS("names.rds")
  cat("  ✓ Found encodings for", length(names_list), "people:", paste(names_list, collapse = ", "), "\n")
  cat("  ✓ Encoding dimensions:", paste(dim(encodings), collapse = " x "), "\n")
} else {
  cat("  ⚠ No encodings found - run encode_dataset.R first\n")
}

# Test 6: Quick functionality test (if Python packages are available)
if (python_ok) {
  cat("\nTest 6: Quick functionality test...\n")
  
  tryCatch({
    # Test model initialization
    torch <- import("torch")
    facenet <- import("facenet_pytorch")
    
    device <- if (torch$cuda$is_available()) "cuda" else "cpu"
    cat("  ✓ Using device:", device, "\n")
    
    # Initialize models (this will download pretrained weights if first run)
    cat("  ⌛ Initializing models...\n")
    mtcnn <- facenet$MTCNN(keep_all = FALSE, device = device)
    resnet <- facenet$InceptionResnetV1(pretrained = 'vggface2')$eval()$to(device)
    cat("  ✓ Models initialized successfully\n")
    
    # Test with first dataset image if available
    if (exists("images") && length(images) > 0) {
      cat("  ⌛ Testing with", images[1], "...\n")
      
      PIL <- import("PIL")
      img_path <- file.path("dataset", images[1])
      img <- PIL$Image$open(img_path)$convert('RGB')
      
      face_tensor <- mtcnn(img)
      if (!is.null(face_tensor)) {
        cat("  ✓ Face detection successful\n")
        
        # Test encoding
        face_tensor <- face_tensor$unsqueeze(0L)$to(device)
        with(torch$no_grad(), {
          emb <- resnet(face_tensor)
        })
        emb_array <- as.array(emb$squeeze(0L)$cpu()$numpy())
        cat("  ✓ Face encoding successful - dimension:", length(emb_array), "\n")
      } else {
        cat("  ⚠ No face detected in test image\n")
      }
    }
    
  }, error = function(e) {
    cat("  ✗ Functionality test failed:", e$message, "\n")
  })
}

# Test summary
cat("\n=========================================\n")
cat("Test Summary\n")
cat("=========================================\n")

if (all_packages_ok && python_ok) {
  cat("✅ System is ready!\n\n")
  cat("Next steps:\n")
  cat("1. If no encodings exist: source('encode_dataset.R')\n")
  cat("2. Start recognition: source('recognize_webcam.R')\n")
  cat("3. For attendance logging: source('attendance_logger.R')\n")
} else {
  cat("❌ System setup incomplete\n\n")
  if (!all_packages_ok) {
    cat("- Install R packages: source('install_packages.R')\n")
  }
  if (!python_ok) {
    cat("- Install Python packages: pip install opencv-python numpy torch torchvision facenet-pytorch pillow\n")
  }
}

cat("\nFor full setup guidance: source('setup_environment.R')\n")
cat("=========================================\n")