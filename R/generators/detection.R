# python_generator_detection.R
# Generate face detection and recognition Python code
#
# This module generates the Python code for face detection, recognition,
# and the FaceDetector class functionality.

#' Generate Detection Python Code
#'
#' @description Generates the complete face detection and recognition Python code
#'              including cosine similarity, face matching, and detection functions
#' @return Character string containing Python code for face detection
#' @export
generate_detection_code <- function() {
  code <- '
# Smart auto-detection using face positioning and stability
def detect_face_in_optimal_zone(boxes, frame_shape, stability_threshold=0.02):
    """Detect if face is in optimal position for auto-capture"""
    if boxes is None:
        return False, None
    
    height, width = frame_shape[:2]
    center_x, center_y = width // 2, height // 2
    
    # Define optimal capture zone (center 40% of frame)
    zone_width = int(width * 0.4)
    zone_height = int(height * 0.4)
    
    zone_left = center_x - zone_width // 2
    zone_right = center_x + zone_width // 2
    zone_top = center_y - zone_height // 2
    zone_bottom = center_y + zone_height // 2
    
    for box in boxes:
        x1, y1, x2, y2 = [int(b) for b in box]
        face_center_x = (x1 + x2) // 2
        face_center_y = (y1 + y2) // 2
        face_width = x2 - x1
        face_height = y2 - y1
        face_area = face_width * face_height
        
        # Check if face is in optimal zone
        in_zone = (zone_left <= face_center_x <= zone_right and 
                   zone_top <= face_center_y <= zone_bottom)
        
        # Check face size (should be substantial but not too close)
        optimal_size = 8000 <= face_area <= 50000
        
        if in_zone and optimal_size:
            return True, (x1, y1, x2, y2, face_center_x, face_center_y)
    
    return False, None

def draw_smart_guidance(frame, boxes, optimal_face, quality_score):
    """Draw smart positioning guidance with high-quality text"""
    height, width = frame.shape[:2]
    center_x, center_y = width // 2, height // 2
    
    # Helper function for high-quality text on camera feed
    def draw_text_camera(img, text, pos, font_scale, color, thickness=2):
        cv2.putText(img, text, pos, cv2.FONT_HERSHEY_SIMPLEX, font_scale, color, thickness, cv2.LINE_AA)
    
    # Draw optimal zone
    zone_width = int(width * 0.4)
    zone_height = int(height * 0.4)
    
    zone_left = center_x - zone_width // 2
    zone_right = center_x + zone_width // 2
    zone_top = center_y - zone_height // 2
    zone_bottom = center_y + zone_height // 2
    
    # Draw zone rectangle
    cv2.rectangle(frame, (zone_left, zone_top), (zone_right, zone_bottom), (0, 255, 255), 2)
    draw_text_camera(frame, "OPTIMAL ZONE", (zone_left, zone_top - 10), 0.8, (0, 255, 255), 2)
    
    # Draw center crosshair
    cv2.line(frame, (center_x - 20, center_y), (center_x + 20, center_y), (0, 255, 255), 2)
    cv2.line(frame, (center_x, center_y - 20), (center_x, center_y + 20), (0, 255, 255), 2)
    
    if boxes is not None:
        for box in boxes:
            x1, y1, x2, y2 = [int(b) for b in box]
            face_center_x = (x1 + x2) // 2
            face_center_y = (y1 + y2) // 2
            
            if optimal_face and optimal_face[0] == x1:  # This is the optimal face
                # Green for optimal position
                color = (0, 255, 0)
                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 3)
            else:
                # Guide to optimal position
                color = (255, 255, 0)  # Yellow for guidance
                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                
                # Direction arrows with better text
                if face_center_x < zone_left:
                    draw_text_camera(frame, "MOVE RIGHT ->", (x1, y2 + 25), 0.7, color, 2)
                elif face_center_x > zone_right:
                    draw_text_camera(frame, "<- MOVE LEFT", (x1, y2 + 25), 0.7, color, 2)
                
                if face_center_y < zone_top:
                    draw_text_camera(frame, "MOVE DOWN", (x1, y1 - 35), 0.7, color, 2)
                elif face_center_y > zone_bottom:
                    draw_text_camera(frame, "MOVE UP", (x1, y1 - 35), 0.7, color, 2)
                
                # Size guidance with better text
                face_area = (x2 - x1) * (y2 - y1)
                if face_area < 8000:
                    draw_text_camera(frame, "COME CLOSER", (x1, y2 + 50), 0.7, color, 2)
                elif face_area > 50000:
                    draw_text_camera(frame, "STEP BACK", (x1, y2 + 50), 0.7, color, 2)
    
    # Enhanced quality indicator with better styling
    if quality_score > 0:
        # Position on top right for better visibility
        bar_x = width - 320
        bar_y = 30
        bar_length = int(250 * quality_score)
        
        # Background rectangle with rounded effect
        cv2.rectangle(frame, (bar_x - 10, bar_y - 10), (bar_x + 270, bar_y + 35), (0, 0, 0), -1)
        cv2.rectangle(frame, (bar_x - 8, bar_y - 8), (bar_x + 268, bar_y + 33), (50, 50, 50), 2)
        
        # Quality bar background
        cv2.rectangle(frame, (bar_x, bar_y + 15), (bar_x + 250, bar_y + 25), (100, 100, 100), -1)
        
        # Color gradient based on quality
        if quality_score >= 0.8:
            bar_color = (0, 255, 0)  # Bright Green
            status_text = "EXCELLENT"
        elif quality_score >= 0.6:
            bar_color = (0, 255, 255)  # Yellow
            status_text = "GOOD"
        elif quality_score >= 0.4:
            bar_color = (0, 165, 255)  # Orange
            status_text = "OK"
        else:
            bar_color = (0, 100, 255)  # Red
            status_text = "POOR"
        
        # Quality bar fill
        cv2.rectangle(frame, (bar_x, bar_y + 15), (bar_x + bar_length, bar_y + 25), bar_color, -1)
        
        # Enhanced text with percentage and status
        cv2.putText(frame, f"Quality: {quality_score:.0%} - {status_text}", (bar_x, bar_y + 10), 
                    cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 255), 3, cv2.LINE_AA)

def cosine_similarity(a, b):
    """Calculate cosine similarity between two vectors"""
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

def similarity_to_match_percent(similarity):
    """Convert cosine similarity (0–1) to human-friendly percent 0–100"""
    if similarity is None:
        return 0
    try:
        s = float(similarity)
    except Exception:
        return 0
    if s < 0.0:
        s = 0.0
    if s > 1.0:
        s = 1.0
    return int(s * 100)

def find_best_match(face_encoding, threshold=0.45):
    """Find the best matching face from known encodings"""
    similarities = [cosine_similarity(face_encoding, known_enc) for known_enc in known_encodings]
    best_idx = np.argmax(similarities)
    best_similarity = similarities[best_idx]
    
    if best_similarity >= threshold:
        return known_names[best_idx], best_similarity
    else:
        return "Unknown", best_similarity

def is_same_face(pos1, pos2, threshold=50):
    """Check if two face positions represent the same face"""
    if pos1 is None or pos2 is None:
        return False
    center1_x, center1_y = (pos1[0] + pos1[2]) // 2, (pos1[1] + pos1[3]) // 2
    center2_x, center2_y = (pos2[0] + pos2[2]) // 2, (pos2[1] + pos2[3]) // 2
    distance = ((center1_x - center2_x)**2 + (center1_y - center2_y)**2)**0.5
    return distance < threshold

def get_current_action(person_name):
    """Determine if this should be JOIN, LEFT, or potential RETURNED"""
    if person_name in current_sessions:
        return "LEFT"
    else:
        # Check if they left recently (within 10 minutes) - could be RETURNED
        current_time = datetime.now()
        if (person_name in recent_departures and 
            (current_time - recent_departures[person_name]).total_seconds() < 600):  # 10 minutes
            return "RETURNED"
        else:
            return "JOIN"

def calculate_duration(start_time, end_time):
    """Calculate duration in minutes between two timestamps"""
    duration = end_time - start_time
    return duration.total_seconds() / 60

def log_attendance(name, similarity, action):
    """Log attendance with enhanced tracking and REAL-TIME Firestore write.
       Also updates CURRENT_RECOGNITION global for the UI and stores a percent."""
    global session_counter
    
    timestamp = datetime.now()
    duration_minutes = None
    session_id = None

    # Convert similarity (0–1) to percent for UI
    match_percent = similarity_to_match_percent(similarity)
    
    # Try to split "Abdullah_Nagy_Abdullah_231004881" → display name + ID
    display_name = str(name)
    student_id = ""
    if isinstance(name, str):
        parts = name.split("_")
        if len(parts) > 1 and parts[-1].isdigit():
            student_id = parts[-1]
            display_name = " ".join(parts[:-1])
    
    # Update global CURRENT_RECOGNITION for the right-side panel
    try:
        globals()["CURRENT_RECOGNITION"] = {
            "name": display_name,
            "id": student_id,
            "match_percent": match_percent,
            "live_face": None,   # can be replaced later with cropped frame
            "ref_face": None     # can be replaced later with DB photo
        }
    except Exception:
        pass
    
    if action == "JOIN":
        current_sessions[name] = {
            "start_time": timestamp,
            "session_id": session_counter
        }
        session_id = session_counter
        session_counter += 1
        
        # Remove from recent departures if they were there
        if name in recent_departures:
            del recent_departures[name]
            
        print("[JOIN] {} JOINED at {}".format(name, timestamp.strftime("%H:%M:%S")))
        
    elif action == "LEFT" and name in current_sessions:
        start_time = current_sessions[name]["start_time"]
        session_id = current_sessions[name]["session_id"]
        duration_minutes = calculate_duration(start_time, timestamp)
        
        # Track this person departure time for RETURNED detection
        recent_departures[name] = timestamp
        
        del current_sessions[name]
        
        hours = int(duration_minutes // 60)
        minutes = int(duration_minutes % 60)
        duration_str = f"{hours}h {minutes}m" if hours > 0 else f"{minutes}m"
        print("[LEFT] {} LEFT at {} (Duration: {})".format(name, timestamp.strftime("%H:%M:%S"), duration_str))
    
    # Add to local attendance log (now with match_percent)
    attendance_log.append({
        "name": name,
        "action": action,
        "timestamp": timestamp.strftime("%Y-%m-%d %H:%M:%S"),
        "date": timestamp.strftime("%Y-%m-%d"),
        "time": timestamp.strftime("%H:%M:%S"),
        "similarity": round(similarity, 2),
        "match_percent": match_percent,
        "duration_minutes": round(duration_minutes, 1) if duration_minutes else None,
        "session_id": session_id
    })
    
    # REAL-TIME: Write to Firestore immediately
    write_attendance_record_realtime(name, similarity, action)
'
  
  return(code)
}
