
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

dataset_dir = "./dataset"
print(f"Looking for images in {dataset_dir}...")
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
    print(f"\n✅ Saved {len(names)} face encodings!")
    print("People encoded:", ", ".join(names))
else:
    print("\n❌ No face encodings created!")

