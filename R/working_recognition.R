# working_recognition.R
# Working face recognition using direct Python calls

cat("🎯 Facial Recognition Attendance System\n")
cat("=======================================\n\n")

# Check if face encodings exist
if (!file.exists("face_encodings.pkl")) {
  cat("❌ Face encodings not found. Run quick_setup.R first.\n")
  stop("Face encodings required")
}

cat("✅ Face encodings found!\n")

# Create Python recognition script
python_recognition_script <- '
import cv2
import numpy as np
import pickle
import torch
from facenet_pytorch import MTCNN, InceptionResnetV1
from PIL import Image

print("Loading face recognition system...")

# Load face encodings
with open("face_encodings.pkl", "rb") as f:
    data = pickle.load(f)
    known_encodings = data["encodings"]
    known_names = data["names"]

print(f"Loaded {len(known_names)} face encodings")
print("Known people:", ", ".join(known_names))

# Initialize models
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Using device: {device}")

mtcnn = MTCNN(keep_all=True, device=device)
resnet = InceptionResnetV1(pretrained="vggface2").eval().to(device)

def cosine_similarity(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

def find_best_match(face_encoding, threshold=0.45):
    similarities = [cosine_similarity(face_encoding, known_enc) for known_enc in known_encodings]
    best_idx = np.argmax(similarities)
    best_similarity = similarities[best_idx]
    
    if best_similarity >= threshold:
        return known_names[best_idx], best_similarity
    else:
        return "Unknown", best_similarity

# Initialize camera
print("\\nInitializing camera...")
cap = cv2.VideoCapture(0)
if not cap.isOpened():
    print("❌ Cannot open camera")
    exit(1)

print("\\n🎥 Face Recognition Started!")
print("Controls:")
print("- Press SPACE to capture and match faces")
print("- Press Q to quit")
print("- Press A to add to attendance log")

attendance_log = []

try:
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        cv2.imshow("Attendance System - Press SPACE to capture, Q to quit", frame)
        key = cv2.waitKey(1) & 0xFF
        
        if key == ord("q"):
            break
        
        if key == ord(" "):  # Spacebar
            print("\\n📸 Capturing and processing faces...")
            
            # Convert BGR to RGB
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            # Detect faces
            boxes, _ = mtcnn.detect(rgb_frame)
            
            if boxes is None:
                print("👤 No faces detected")
                continue
            
            print(f"🔍 Detected {len(boxes)} face(s)")
            
            for i, box in enumerate(boxes):
                x1, y1, x2, y2 = [int(b) for b in box]
                x1, y1 = max(0, x1), max(0, y1)
                x2, y2 = min(frame.shape[1], x2), min(frame.shape[0], y2)
                
                if x2 <= x1 or y2 <= y1:
                    continue
                
                # Extract face
                face_img = rgb_frame[y1:y2, x1:x2]
                face_pil = Image.fromarray(face_img)
                
                try:
                    face_tensor = mtcnn(face_pil)
                    if face_tensor is None:
                        continue
                    
                    if len(face_tensor.shape) == 3:
                        face_tensor = face_tensor.unsqueeze(0)
                    
                    face_tensor = face_tensor.to(device)
                    
                    with torch.no_grad():
                        emb = resnet(face_tensor)
                    
                    emb_array = emb.squeeze(0).cpu().numpy()
                    emb_norm = emb_array / (np.linalg.norm(emb_array) + 1e-10)
                    
                    name, similarity = find_best_match(emb_norm)
                    print(f"👤 Face {i+1}: {name} ({similarity:.2f})")
                    
                    # Draw on frame
                    color = (0, 255, 0) if name != "Unknown" else (0, 0, 255)
                    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                    cv2.putText(frame, f"{name} ({similarity:.2f})", 
                              (x1, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
                    
                    # Add to attendance if recognized
                    if name != "Unknown" and similarity >= 0.45:
                        from datetime import datetime
                        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                        attendance_log.append({
                            "name": name, 
                            "timestamp": timestamp, 
                            "similarity": similarity
                        })
                        
                except Exception as e:
                    print(f"Error processing face: {e}")
            
            cv2.imshow("Recognition Results", frame)
        
        if key == ord("a"):
            print("📝 Current attendance log:")
            if attendance_log:
                for entry in attendance_log[-5:]:  # Show last 5 entries
                    print(f"  {entry[\"timestamp\"]} - {entry[\"name\"]} ({entry[\"similarity\"]:.2f})")
            else:
                print("  No attendance entries yet")

finally:
    cap.release()
    cv2.destroyAllWindows()
    
    # Save attendance log
    if attendance_log:
        import pandas as pd
        df = pd.DataFrame(attendance_log)
        timestamp = pd.Timestamp.now().strftime("%Y%m%d_%H%M%S")
        filename = f"attendance_{timestamp}.csv"
        df.to_csv(filename, index=False)
        print(f"\\n💾 Attendance log saved to {filename}")
        print(f"Total entries: {len(attendance_log)}")
    
    print("\\n✅ Face recognition session ended")
'

# Write and run the recognition script  
writeLines(python_recognition_script, "face_recognition.py")
cat("📄 Created face_recognition.py\n")

cat("🚀 Starting face recognition...\n")
cat("   (This will open a camera window)\n\n")

# Add PIL to imports
system2(file.path("..", "r_python_env", "Scripts", "pip.exe"), 
        args = c("install", "pandas"), 
        stdout = FALSE, stderr = FALSE)

# Run the recognition script
system2(file.path("..", "r_python_env", "Scripts", "python.exe"), 
        args = "face_recognition.py")

cat("\n✅ Face recognition completed!\n")