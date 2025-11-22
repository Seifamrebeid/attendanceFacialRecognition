# recognize_webcam.py (fixed)
import cv2
import numpy as np
from facenet_pytorch import MTCNN, InceptionResnetV1
import torch
from sklearn.neighbors import NearestNeighbors
from PIL import Image

device = 'cuda' if torch.cuda.is_available() else 'cpu'
mtcnn = MTCNN(keep_all=True, device=device)
resnet = InceptionResnetV1(pretrained='vggface2').eval().to(device)

enc_file = "encodings.npy"
names_file = "names.npy"

encodings = np.load(enc_file)
names = np.load(names_file)

if len(encodings) == 0:
    raise RuntimeError("No encodings found. Run encode_dataset.py first.")

searcher = NearestNeighbors(n_neighbors=3, metric='cosine').fit(encodings)

cap = cv2.VideoCapture(0)
if not cap.isOpened():
    raise RuntimeError("Cannot open camera")

print("Press 'c' to capture & match, 'q' to quit")
while True:
    ret, frame = cap.read()
    if not ret:
        break
    cv2.imshow("Camera", frame)
    k = cv2.waitKey(1) & 0xFF
    if k == ord('q'):
        break
    if k == ord('c'):
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        boxes, _ = mtcnn.detect(rgb)
        if boxes is None:
            print("No face detected.")
            continue

        for box in boxes:
            x1, y1, x2, y2 = [int(b) for b in box]
            # guard crop coordinates
            x1, y1 = max(0, x1), max(0, y1)
            x2, y2 = min(frame.shape[1] - 1, x2), min(frame.shape[0] - 1, y2)
            if x2 <= x1 or y2 <= y1:
                print("Invalid box, skipping")
                continue

            # Crop and create PIL image
            face_img = Image.fromarray(rgb[y1:y2, x1:x2])

            # mtcnn can return either a (3,160,160) tensor or (1,3,160,160) batched tensor
            face_tensor = mtcnn(face_img)
            if face_tensor is None:
                print("mtcnn couldn't produce a face tensor for this crop.")
                continue

            # Normalize shape to (1, 3, 160, 160)
            if isinstance(face_tensor, torch.Tensor):
                if face_tensor.ndim == 3:          # (3,160,160)
                    face_tensor = face_tensor.unsqueeze(0).to(device)
                elif face_tensor.ndim == 4:        # (1,3,160,160) already batched
                    face_tensor = face_tensor.to(device)
                else:
                    print(f"Unexpected tensor ndim: {face_tensor.ndim}, skipping")
                    continue
            else:
                # In some versions mtcnn returns a list/tuple - handle defensively
                try:
                    face_tensor = torch.stack([t for t in face_tensor]).to(device)
                except Exception:
                    print("Unexpected mtcnn return type; skipping face.")
                    continue

            # Get embedding
            with torch.no_grad():
                emb_tensor = resnet(face_tensor)  # shape (1,512) expected
            emb = emb_tensor.squeeze(0).cpu().numpy()
            emb = emb / (np.linalg.norm(emb) + 1e-10)

            # Search
            dist, idx = searcher.kneighbors([emb], n_neighbors=1, return_distance=True)
            cosine_sim = 1 - dist[0][0]
            threshold = 0.45  # tune this per your dataset
            if cosine_sim >= threshold:
                label = names[idx[0][0]]
            else:
                label = "Unknown"
            text = f"{label} ({cosine_sim:.2f})"

            # Draw results
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.putText(frame, text, (x1, max(0, y1 - 10)), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)

        cv2.imshow("Match", frame)
        cv2.waitKey(1)

cap.release()
cv2.destroyAllWindows()
