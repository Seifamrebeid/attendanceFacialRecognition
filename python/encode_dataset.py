# encode_dataset.py
import os
import numpy as np
from PIL import Image
from facenet_pytorch import MTCNN, InceptionResnetV1
import torch

device = 'cuda' if torch.cuda.is_available() else 'cpu'
mtcnn = MTCNN(keep_all=False, device=device)
resnet = InceptionResnetV1(pretrained='vggface2').eval().to(device)

dataset_dir = "dataset"  # Relative path
enc_file = "encodings.npy"
names_file = "names.npy"

encs = []
names = []

if not os.path.exists(dataset_dir):
    print(f"[ERROR] Dataset directory {dataset_dir} does not exist.")
    exit(1)

for fname in sorted(os.listdir(dataset_dir)):
    if not fname.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
        continue
    path = os.path.join(dataset_dir, fname)
    try:
        img = Image.open(path).convert('RGB')
        print(f"[INFO] Processing {fname}")
    except Exception as e:
        print(f"[WARN] Cannot open {fname}: {e}")
        continue

    face_tensor = mtcnn(img)  # returns tensor or None
    if face_tensor is None:
        print(f"[WARN] No face in {fname}, skipping")
        continue

    face_tensor = face_tensor.unsqueeze(0).to(device)
    with torch.no_grad():
        emb = resnet(face_tensor)
    emb = emb.squeeze(0).cpu().numpy()
    emb = emb / (np.linalg.norm(emb) + 1e-10)

    encs.append(emb)
    names.append(os.path.splitext(fname)[0])

if len(encs) == 0:
    print("No encodings created. Check dataset images folder.")
else:
    np.save(enc_file, np.stack(encs))
    np.save(names_file, np.array(names))
    print(f"[OK] Saved {len(names)} encodings -> {enc_file}, {names_file}")
