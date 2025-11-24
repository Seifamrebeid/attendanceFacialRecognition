
from firebase_admin import credentials, firestore, initialize_app
import os

print("Testing Firestore connectivity...")

# Check if service.json exists
if os.path.exists("service.json"):
    print("✅ service.json found")
    
    try:
        # Initialize Firebase
        cred = credentials.Certificate("service.json")
        initialize_app(cred)
        db = firestore.client()
        
        print("✅ Firebase initialized successfully")
        
        # Try to read from attendance collection
        docs = db.collection("attendance").limit(3).stream()
        records = []
        for doc in docs:
            records.append({
                "id": doc.id,
                "data": doc.to_dict()
            })
        
        print(f"✅ Read {len(records)} existing records from Firestore")
        for record in records:
            data = record["data"]
            print(f"  {data.get("timestamp", "No timestamp")} - {data.get("name", "Unknown")} {data.get("action", "No action")}")
        
        print("🎉 Firestore integration working!")
        
    except Exception as e:
        print(f"❌ Firestore error: {e}")
else:
    print("❌ service.json not found - Firestore will not work")

