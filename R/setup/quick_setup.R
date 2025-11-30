# Quick Fix - Direct Python Execution
# This creates Python scripts and executes them directly to avoid reticulate issues  # nolint

cat("🎯 R Facial Recognition - Quick Setup\n")
cat("====== ===============================\n\n")

# First, let's create the face encoding script in Python
python_encode_script <- '
import os
import numpy as np
from PIL import Image
from facenet_pytorch import MTCNN, InceptionResnetV1
import torch
import pickle

print("Starting face encoding...")

device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Using device: {device}")

mtcnn = MTCNN(keep_all=False, device=device)
resnet = InceptionResnetV1(pretrained="vggface2").eval().to(device)

dataset_dir = "dataset"
if not os.path.exists(dataset_dir):
    print("Dataset directory not found!")
    exit(1)

encodings = []
names = []

for filename in sorted(os.listdir(dataset_dir)):
    if not filename.lower().endswith((".jpg", ".jpeg", ".png")):
        continue
    
    print(f"Processing {filename}...")
    
    try:
        img = Image.open(os.path.join(dataset_dir, filename)).convert("RGB")
        face_tensor = mtcnn(img)
        
        if face_tensor is None:
            print(f"  No face detected in {filename}")
            continue
        
        face_tensor = face_tensor.unsqueeze(0).to(device)
        with torch.no_grad():
            emb = resnet(face_tensor)
        
        emb_array = emb.squeeze(0).cpu().numpy()
        emb_norm = emb_array / (np.linalg.norm(emb_array) + 1e-10)
        
        encodings.append(emb_norm)
        names.append(os.path.splitext(filename)[0])
        print(f"  ✓ Encoded {filename}")
        
    except Exception as e:
        print(f"  ✗ Error processing {filename}: {e}")

if len(encodings) > 0:
    with open("face_encodings.pkl", "wb") as f:
        pickle.dump({"encodings": np.stack(encodings), "names": names}, f)
    print(f"\\n✅ Saved {len(names)} face encodings!")
    print("People encoded:", ", ".join(names))
else:
    print("\\n❌ No face encodings created!")
'

# Write the Python script
writeLines(python_encode_script, "encode_faces.py")
cat("📄 Created encode_faces.py\n")

# Run the encoding script
cat("🔄 Running face encoding...\n")
system2("conda", args = c("run", "-n", "faceenv", "python", "encode_faces.py"))# Check if encodings were created
if (file.exists("face_encodings.pkl")) {
  cat("✅ Face encodings created successfully!\n")
  # Create a simple R recognition function
  cat("📋 Creating R recognition functions...\n")

  # Load the encodings in R (we'll need to install more packages for pickle)
  system2("conda", args = c("run", "-n", "faceenv", "pip", "install", "pickle5"))
  cat("\n🎉 Setup completed!\n")
  cat("To use the system:\n")
  cat("1. Face encodings are in face_encodings.pkl\n")
  cat("2. Use Python directly for recognition\n")
  cat("3. Or integrate with R using system2() calls\n\n")

} else {
  cat("❌ Face encoding failed. Check the output above.\n")
}