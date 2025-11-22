# encode_dataset.R
# Facial encoding script for attendance system

# Load required libraries
library(reticulate)
library(magrittr)
library(here)

# Configure Python environment (using the conda environment from the python folder)
python_path <- here("..", "python", ".conda", "python.exe")
if (file.exists(python_path)) {
  use_python(python_path)
} else {
  # Fallback to system Python
  cat("Warning: Using system Python. Install requirements with: pip install opencv-python numpy pillow torch torchvision facenet-pytorch\n")
}

# Import Python libraries
cv2 <- import("cv2")
np <- import("numpy")
torch <- import("torch")
PIL <- import("PIL")
facenet <- import("facenet_pytorch")

# Configuration
dataset_dir <- "dataset"
enc_file <- "encodings.rds"
names_file <- "names.rds"

# Initialize models
cat("Initializing face recognition models...\n")
device <- if (torch$cuda$is_available()) "cuda" else "cpu"
cat("Using device:", device, "\n")

mtcnn <- facenet$MTCNN(keep_all = FALSE, device = device)
resnet <- facenet$InceptionResnetV1(pretrained = 'vggface2')$eval()$to(device)

# Check if dataset directory exists
if (!dir.exists(dataset_dir)) {
  stop("Dataset directory not found. Please create '", dataset_dir, "' folder and add face images.")
}

# Get list of image files
image_files <- list.files(dataset_dir, pattern = "\\.(jpg|jpeg|png)$", ignore.case = TRUE)
if (length(image_files) == 0) {
  stop("No image files found in dataset directory.")
}

cat("Found", length(image_files), "images in dataset\n")

# Initialize storage
encodings_list <- list()
names_list <- character()

# Process each image
for (i in seq_along(image_files)) {
  fname <- image_files[i]
  cat("Processing", fname, "...")
  
  file_path <- file.path(dataset_dir, fname)
  
  tryCatch({
    # Load and convert image
    img <- PIL$Image$open(file_path)$convert('RGB')
    
    # Detect face
    face_tensor <- mtcnn(img)
    
    if (is.null(face_tensor)) {
      cat(" No face detected, skipping\n")
      next
    }
    
    # Add batch dimension and move to device
    face_tensor <- face_tensor$unsqueeze(0L)$to(device)
    
    # Generate encoding
    with(torch$no_grad(), {
      emb <- resnet(face_tensor)
    })
    
    # Convert to R array and normalize
    emb_array <- as.array(emb$squeeze(0L)$cpu()$numpy())
    emb_norm <- emb_array / (norm(emb_array, type = "F") + 1e-10)
    
    # Store results
    encodings_list[[length(encodings_list) + 1]] <- emb_norm
    names_list <- c(names_list, tools::file_path_sans_ext(fname))
    
    cat(" ✓\n")
    
  }, error = function(e) {
    cat(" Error:", e$message, "\n")
  })
}

# Save results
if (length(encodings_list) == 0) {
  stop("No encodings created. Check dataset images.")
} else {
  # Convert list to matrix
  encodings_matrix <- do.call(rbind, encodings_list)
  
  # Save to RDS files
  saveRDS(encodings_matrix, enc_file)
  saveRDS(names_list, names_file)
  
  cat("\n[OK] Saved", length(names_list), "encodings to", enc_file, "and", names_file, "\n")
  cat("Names encoded:", paste(names_list, collapse = ", "), "\n")
}

cat("\nEncoding completed successfully!\n")