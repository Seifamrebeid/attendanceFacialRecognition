# recognize_webcam.R
# Real-time face recognition from webcam for attendance system

# Load required libraries
library(reticulate)
library(FNN)
library(magrittr)
library(here)

# Configure Python environment
cat("Configuring Python environment...\n")

# Clear any existing Python configuration
Sys.unsetenv("RETICULATE_PYTHON")

# Try to find a suitable Python environment
base_dir <- here()  # We're already in the project root
python_paths <- c(
  file.path(base_dir, "r_python_env", "Scripts", "python.exe"),  # Our virtual environment
  file.path(base_dir, "venv", "Scripts", "python.exe"),          # Original venv
  file.path(base_dir, "python", ".conda", "python.exe")          # Conda environment
)

cat("Base directory:", base_dir, "\n")
python_found <- FALSE
for (path in python_paths) {
  cat("Checking:", path, "\n")
  if (file.exists(path)) {
    cat("Found Python at:", path, "\n")
    tryCatch({
      # Force reticulate to use this specific Python
      Sys.setenv(RETICULATE_PYTHON = path)
      use_python(path, required = TRUE)
      
      # Verify it's working by testing an import
      py_config()
      python_found <- TRUE
      cat("✓ Successfully configured Python environment\n")
      break
    }, error = function(e) {
      cat("✗ Failed to use Python at", path, ":", e$message, "\n")
      Sys.unsetenv("RETICULATE_PYTHON")
    })
  }
}

if (!python_found) {
  cat("\n❌ No accessible Python installation found!\n")
  cat("Please ensure the virtual environment exists and is working:\n")
  cat("1. cd", base_dir, "\n") 
  cat("2. r_python_env\\Scripts\\Activate.ps1\n")
  cat("3. python -c \"import cv2; print('OpenCV works')\"\n")
  cat("4. If that fails, recreate the environment\n")
  stop("Python environment not configured properly.")
}

# Import Python libraries
cv2 <- import("cv2")
np <- import("numpy")
torch <- import("torch")
PIL <- import("PIL")
facenet <- import("facenet_pytorch")

# Configuration
enc_file <- "encodings.rds"
names_file <- "names.rds"
similarity_threshold <- 0.45  # Cosine similarity threshold

# Load encodings
if (!file.exists(enc_file) || !file.exists(names_file)) {
  stop("Encoding files not found. Please run encode_dataset.R first.")
}

cat("Loading face encodings...\n")
known_encodings <- readRDS(enc_file)
known_names <- readRDS(names_file)

cat("Loaded", nrow(known_encodings), "face encodings for:", paste(known_names, collapse = ", "), "\n")

# Initialize models
cat("Initializing face recognition models...\n")
device <- if (torch$cuda$is_available()) "cuda" else "cpu"
cat("Using device:", device, "\n")

mtcnn <- facenet$MTCNN(keep_all = TRUE, device = device)
resnet <- facenet$InceptionResnetV1(pretrained = 'vggface2')$eval()$to(device)

# Function to calculate cosine similarity
cosine_similarity <- function(a, b) {
  sum(a * b) / (norm(a, type = "F") * norm(b, type = "F"))
}

# Function to find best match
find_best_match <- function(face_encoding, known_encodings, known_names, threshold = 0.45) {
  if (nrow(known_encodings) == 0) {
    return(list(name = "Unknown", similarity = 0))
  }
  
  similarities <- apply(known_encodings, 1, function(known_enc) {
    cosine_similarity(face_encoding, known_enc)
  })
  
  best_idx <- which.max(similarities)
  best_similarity <- similarities[best_idx]
  
  if (best_similarity >= threshold) {
    return(list(name = known_names[best_idx], similarity = best_similarity))
  } else {
    return(list(name = "Unknown", similarity = best_similarity))
  }
}

# Initialize camera
cat("Initializing camera...\n")
cap <- cv2$VideoCapture(0L)
if (!cap$isOpened()) {
  stop("Cannot open camera")
}

cat("\nFace Recognition Started!\n")
cat("Controls:\n")
cat("- Press 'c' to capture and match faces\n")
cat("- Press 'q' to quit\n")
cat("- Press 'a' to add current capture to attendance log\n\n")

# Attendance log
attendance_log <- data.frame(
  name = character(),
  timestamp = character(),
  similarity = numeric(),
  stringsAsFactors = FALSE
)

# Main loop
while (TRUE) {
  # Capture frame
  ret_cap <- cap$read()
  ret <- ret_cap[[1]]
  frame <- ret_cap[[2]]
  
  if (!ret) {
    cat("Failed to capture frame\n")
    break
  }
  
  # Display frame
  cv2$imshow("Attendance System - Press 'c' to capture, 'q' to quit", frame)
  
  # Wait for key press
  key <- cv2$waitKey(1L) %% 256L
  
  if (key == 113L) {  # 'q' key
    cat("Quitting...\n")
    break
  }
  
  if (key == 99L) {  # 'c' key
    cat("Capturing and processing faces...\n")
    
    # Convert BGR to RGB
    rgb_frame <- cv2$cvtColor(frame, cv2$COLOR_BGR2RGB)
    
    # Detect faces
    detect_result <- mtcnn$detect(rgb_frame)
    boxes <- detect_result[[1]]
    
    if (is.null(boxes)) {
      cat("No faces detected in frame\n")
      next
    }
    
    cat("Detected", nrow(boxes), "face(s)\n")
    
    # Process each detected face
    for (face_idx in seq_len(nrow(boxes))) {
      box <- boxes[face_idx, ]
      x1 <- max(1, floor(box[1]))
      y1 <- max(1, floor(box[2])) 
      x2 <- min(ncol(rgb_frame), ceiling(box[3]))
      y2 <- min(nrow(rgb_frame), ceiling(box[4]))
      
      if (x2 <= x1 || y2 <= y1) {
        cat("Invalid bounding box, skipping\n")
        next
      }
      
      # Crop face
      face_crop <- rgb_frame[y1:y2, x1:x2, ]
      face_img <- PIL$Image$fromarray(r_to_py(face_crop, convert = TRUE))
      
      tryCatch({
        # Get face tensor
        face_tensor <- mtcnn(face_img)
        
        if (is.null(face_tensor)) {
          cat("Could not process face crop\n")
          next
        }
        
        # Ensure correct dimensions
        if (length(dim(face_tensor)) == 3) {
          face_tensor <- face_tensor$unsqueeze(0L)
        }
        face_tensor <- face_tensor$to(device)
        
        # Generate embedding
        with(torch$no_grad(), {
          emb_tensor <- resnet(face_tensor)
        })
        
        # Convert to R and normalize
        emb <- as.array(emb_tensor$squeeze(0L)$cpu()$numpy())
        emb_norm <- emb / (norm(emb, type = "F") + 1e-10)
        
        # Find match
        match_result <- find_best_match(emb_norm, known_encodings, known_names, similarity_threshold)
        
        # Display results
        label_text <- sprintf("%s (%.2f)", match_result$name, match_result$similarity)
        cat("Face", face_idx, ":", label_text, "\n")
        
        # Draw bounding box and label on frame
        cv2$rectangle(frame, tuple(c(x1-1, y1-1)), tuple(c(x2-1, y2-1)), tuple(c(0L, 255L, 0L)), 2L)
        cv2$putText(frame, label_text, tuple(c(x1-1, max(0, y1-25))), 
                   cv2$FONT_HERSHEY_SIMPLEX, 0.8, tuple(c(0L, 255L, 0L)), 2L)
        
      }, error = function(e) {
        cat("Error processing face:", e$message, "\n")
      })
    }
    
    # Show result frame
    cv2$imshow("Recognition Results", frame)
    cv2$waitKey(1L)
  }
  
  if (key == 97L) {  # 'a' key - add to attendance
    cat("Adding to attendance log...\n")
    # This would be triggered after a 'c' capture to log attendance
    # Implementation depends on your specific attendance requirements
  }
}

# Cleanup
cap$release()
cv2$destroyAllWindows()

# Save attendance log if any entries
if (nrow(attendance_log) > 0) {
  timestamp <- format(Sys.time(), "%Y%m%d_%H%M%S")
  log_file <- paste0("attendance_", timestamp, ".csv")
  write.csv(attendance_log, log_file, row.names = FALSE)
  cat("Attendance log saved to:", log_file, "\n")
}

cat("Face recognition session ended.\n")