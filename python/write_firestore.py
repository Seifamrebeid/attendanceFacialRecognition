# write_firestore.py
from firebase_admin import credentials, firestore, initialize_app
from datetime import datetime, timezone

# 1. Initialize Firebase
cred = credentials.Certificate(r"E:\\attendanceFacialRecognition\\python\\service.json")
initialize_app(cred)

# 2. Get Firestore client
db = firestore.client()

# 3. Prepare data to write
data = {
    "name": "Seif",
    "status": "present",
    "timestamp": datetime.now(timezone.utc).isoformat()
}

# 4. Write into 'attendance' collection with auto-generated ID
# doc_ref = db.collection("attendance").add(data)

# 5. Print all current documents in 'attendance' collection
docs = db.collection("attendance").stream()
for doc in docs:
    print(f"{doc.id} => {doc.to_dict()}")


# print("Document written with ID:", doc_ref[1].id)
