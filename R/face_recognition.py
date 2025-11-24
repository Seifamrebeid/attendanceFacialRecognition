
import cv2
import numpy as np
import pickle
import torch
from facenet_pytorch import MTCNN, InceptionResnetV1
from PIL import Image
from datetime import datetime
import pandas as pd

# Firebase Firestore integration
from firebase_admin import credentials, firestore, initialize_app

# Initialize Firebase
try:
    cred = credentials.Certificate("service.json")
    initialize_app(cred)
    db = firestore.client()
    firestore_available = True
    print("✅ Firebase Firestore initialized")
except Exception as e:
    print(f"⚠️ Firestore initialization failed: {e}")
    firestore_available = False

def read_firestore_attendance():
    """Read all attendance records from Firestore at startup"""
    if not firestore_available:
        return []
    
    try:
        docs = db.collection("attendance").stream()
        firestore_records = []
        for doc in docs:
            data = doc.to_dict()
            firestore_records.append({
                "id": doc.id,
                "name": data.get("name"),
                "action": data.get("action"),
                "timestamp": data.get("timestamp"),
                "similarity": data.get("similarity"),
                "duration_minutes": data.get("duration_minutes"),
                "session_id": data.get("session_id")
            })
        
        print(f"📖 Read {len(firestore_records)} records from Firestore:")
        for record in firestore_records[-5:]:  # Show last 5
            print(f"  {record["timestamp"]} - {record["name"]} {record["action"]}")
        
        return firestore_records
    except Exception as e:
        print(f"❌ Error reading from Firestore: {e}")
        return []

def write_to_firestore(attendance_log):
    """Write attendance log to Firestore when stopping"""
    if not firestore_available or not attendance_log:
        return
    
    try:
        print("\n💾 Writing to Firestore...")
        batch = db.batch()
        
        for entry in attendance_log:
            # Create document data with proper data types
            doc_data = {
                "name": entry["name"],
                "action": entry["action"],
                "timestamp": entry["timestamp"],
                "date": entry["date"], 
                "time": entry["time"],
                "similarity": float(entry["similarity"]),  # Convert numpy float to Python float
                "duration_minutes": float(entry["duration_minutes"]) if entry["duration_minutes"] else None,
                "session_id": int(entry["session_id"]) if entry["session_id"] else None,
                "created_at": datetime.now().isoformat()
            }
            
            # Add to batch
            doc_ref = db.collection("attendance").document()
            batch.set(doc_ref, doc_data)
        
        # Commit batch
        batch.commit()
        print(f"✅ Successfully wrote {len(attendance_log)} records to Firestore")
        
    except Exception as e:
        print(f"❌ Error writing to Firestore: {e}")

print("Loading enhanced face recognition system...")

# Read existing attendance from Firestore
existing_records = read_firestore_attendance()

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
    similarities = [cosine_similarity(face_encoding, known_enc) for known_enc in known_encodings] # nolint
    best_idx = np.argmax(similarities)
    best_similarity = similarities[best_idx]
    
    if best_similarity >= threshold:
        return known_names[best_idx], best_similarity
    else:
        return "Unknown", best_similarity

# Enhanced attendance tracking with entry/exit
attendance_log = []
current_sessions = {}  # Track who is currently "inside"
last_detection = {}    # Prevent duplicate detections within short time
session_counter = 1

def get_current_action(person_name):
    """Determine if this should be JOIN or LEFT"""
    return "LEFT" if person_name in current_sessions else "JOIN"

def calculate_duration(start_time, end_time):
    """Calculate duration in minutes"""
    duration = end_time - start_time
    return duration.total_seconds() / 60

def log_attendance(name, similarity, action):
    """Log attendance with enhanced tracking"""
    global session_counter
    
    timestamp = datetime.now()
    duration_minutes = None
    session_id = None
    
    if action == "JOIN":
        current_sessions[name] = {
            "start_time": timestamp,
            "session_id": session_counter
        }
        session_id = session_counter
        session_counter += 1
        print(f"🟢 {name} JOINED at {timestamp.strftime("%H:%M:%S")}")
        
    elif action == "LEFT" and name in current_sessions:
        start_time = current_sessions[name]["start_time"]
        session_id = current_sessions[name]["session_id"]
        duration_minutes = calculate_duration(start_time, timestamp)
        
        # Remove from current sessions
        del current_sessions[name]
        
        hours = int(duration_minutes // 60)
        minutes = int(duration_minutes % 60)
        duration_str = f"{hours}h {minutes}m" if hours > 0 else f"{minutes}m"
        print(f"🔴 {name} LEFT at {timestamp.strftime("%H:%M:%S")} (Duration: {duration_str})") # nolint
    
    # Add to log
    attendance_log.append({
        "name": name,
        "action": action,
        "timestamp": timestamp.strftime("%Y-%m-%d %H:%M:%S"),
        "date": timestamp.strftime("%Y-%m-%d"),
        "time": timestamp.strftime("%H:%M:%S"),
        "similarity": round(similarity, 2),
        "duration_minutes": round(duration_minutes, 1) if duration_minutes else None, # nolint
        "session_id": session_id
    })

# Initialize camera
print("\nInitializing camera...")
cap = cv2.VideoCapture(0)
if not cap.isOpened():
    print("❌ Cannot open camera")
    exit(1)

print("\n🎥 Enhanced Face Recognition Started!")
print("📊 Entry/Exit Tracking Enabled")
print("Controls:")
print("- Press SPACE to capture and process faces")
print("- Press Q to quit")
print("- Press A to view attendance summary")
print("- Press S to show current sessions")

try:
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        # Add current time overlay
        current_time = datetime.now().strftime("%H:%M:%S")
        cv2.putText(frame, f"Time: {current_time}", (10, 30), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        
        # Show current sessions count
        sessions_count = len(current_sessions)
        cv2.putText(frame, f"Currently Inside: {sessions_count}", (10, 60), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        
        cv2.imshow("Enhanced Attendance System - Press SPACE to scan", frame)
        key = cv2.waitKey(1) & 0xFF
        
        if key == ord("q"):
            break
        
        if key == ord(" "):  # Spacebar
            print(f"\n📸 Scanning at {current_time}...")
            
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
                    
                    if name != "Unknown" and similarity >= 0.45:
                        # Determine action (JOIN or LEFT)
                        action = get_current_action(name)
                        
                        # Prevent duplicate entries for SAME person within 5 seconds # nolint
                        # Different people can be detected immediately
                        current_time_obj = datetime.now()
                        if (name in last_detection and 
                            (current_time_obj - last_detection[name]).seconds < 5): # nolint
                            continue  # Skip only for same person within 5 seconds # nolint
                        
                        last_detection[name] = current_time_obj
                        
                        # Log attendance
                        log_attendance(name, similarity, action)
                        
                        # Draw on frame with action-specific colors
                        if action == "JOIN":
                            color = (0, 255, 0)  # Green for JOIN
                            status_text = "JOINING"
                        else:
                            color = (0, 165, 255)  # Orange for LEFT
                            status_text = "LEAVING"
                        
                        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 3)
                        
                        # Display name, action and similarity
                        label = f"{name} {status_text} ({similarity:.2f})"
                        cv2.putText(frame, label, (x1, y1-10), 
                                  cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)
                        
                        print(f"👤 {name} - Action: {action} - Confidence: {similarity:.2f}") # nolint
                    
                    else:
                        # Unknown person
                        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
                        cv2.putText(frame, f"Unknown ({similarity:.2f})", (x1, y1-10),  # nolint
                                  cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
                        
                except Exception as e:
                    print(f"Error processing face: {e}")
            
            cv2.imshow("Recognition Results", frame)
        
        if key == ord("a"):
            print("\n📊 Attendance Summary:")
            if attendance_log:
                recent_entries = attendance_log[-10:]  # Show last 10 entries
                for entry in recent_entries:
                    duration_text = f" - {entry["duration_minutes"]:.1f}min" if entry["duration_minutes"] else "" # nolint: line_length_linter.
                    print(f"  {entry["timestamp"]} - {entry["name"]} {entry["action"]}{duration_text}") # nolint
            else:
                print("  No attendance entries yet")
        
        if key == ord("s"):
            print("\n👥 Current Sessions (People Inside):")
            if current_sessions:
                for name, session in current_sessions.items():
                    elapsed = datetime.now() - session["start_time"]
                    elapsed_minutes = elapsed.total_seconds() / 60
                    hours = int(elapsed_minutes // 60)
                    minutes = int(elapsed_minutes % 60)
                    duration_str = f"{hours}h {minutes}m" if hours > 0 else f"{minutes}m" # nolint
                    print(f"  {name} - Inside for {duration_str}")
            else:
                print("  No one currently inside")

finally:
    cap.release()
    cv2.destroyAllWindows()
    
    # Save enhanced attendance log
    if attendance_log:
        df = pd.DataFrame(attendance_log)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"enhanced_attendance_{timestamp}.csv"
        df.to_csv(filename, index=False)
        print(f"\n💾 Enhanced attendance log saved to {filename}")
        
        # Write to Firestore when stopping face recognition
        write_to_firestore(attendance_log)
        
        # Show summary statistics
        print("\n📈 Session Summary:")
        print(f"Total entries: {len(attendance_log)}")
        
        # Calculate total time spent per person
        person_totals = {}
        for entry in attendance_log:
            if entry["duration_minutes"]:
                name = entry["name"]
                if name not in person_totals:
                    person_totals[name] = 0
                person_totals[name] += entry["duration_minutes"]
        
        if person_totals:
            print("\nTotal time spent:")
            for name, total_minutes in person_totals.items():
                hours = int(total_minutes // 60)
                minutes = int(total_minutes % 60)
                duration_str = f"{hours}h {minutes}m" if hours > 0 else f"{minutes}m" # nolint
                print(f"  {name}: {duration_str}")
    
    print("\n✅ Enhanced face recognition session ended")

