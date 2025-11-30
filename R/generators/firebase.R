# python_generator_firebase.R
# Generate Firebase-related Python code
#
# This module generates the Python code for Firebase/Firestore integration
# including initialization, reading, and writing attendance records.

#' Generate Firebase Python Code
#'
#' @description Generates the complete Firebase integration Python code
#'              including initialization, read, and write functions
#' @return Character string containing Python code for Firebase integration
#' @export
generate_firebase_code <- function() {
  code <- '
# Firebase Firestore integration
from firebase_admin import credentials, firestore, initialize_app

# Initialize Firebase
try:
    cred = credentials.Certificate("service.json")
    initialize_app(cred)
    db = firestore.client()
    firestore_available = True
    print("Firebase Firestore initialized")
except Exception as e:
    print(f"Firestore initialization failed: {e}")
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
        
        print(f"Read {len(firestore_records)} records from Firestore:")
        for record in firestore_records[-3:]:  # Show last 3
            print(f"  {record[\'timestamp\']} - {record[\'name\']} {record[\'action\']}")
        
        return firestore_records
    except Exception as e:
        print(f"Error reading from Firestore: {e}")
        return []

def write_to_firestore(attendance_log):
    """Write attendance log to Firestore when stopping"""
    if not firestore_available or not attendance_log:
        return
    
    try:
        print("\\nWriting to Firestore...")
        batch = db.batch()
        
        for entry in attendance_log:
            doc_data = {
                "name": entry["name"],
                "action": entry["action"],
                "timestamp": entry["timestamp"],
                "date": entry["date"], 
                "time": entry["time"],
                "similarity": float(entry["similarity"]),
                "duration_minutes": float(entry["duration_minutes"]) if entry["duration_minutes"] else None,
                "session_id": int(entry["session_id"]) if entry["session_id"] else None,
                "created_at": datetime.now().isoformat()
            }
            
            doc_ref = db.collection("attendance").document()
            batch.set(doc_ref, doc_data)
        
        batch.commit()
        print(f"Successfully wrote {len(attendance_log)} records to Firestore")
        
    except Exception as e:
        print(f"Error writing to Firestore: {e}")
'
  
  return(code)
}
