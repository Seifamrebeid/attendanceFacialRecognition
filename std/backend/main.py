"""
Face Recognition Backend API
Provides endpoints for face detection and recognition
using the same concept as the R project
"""

import os
import base64
import io
import uuid
from datetime import datetime
from typing import Optional, List
import numpy as np
from PIL import Image
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Initialize FastAPI
app = FastAPI(
    title="Face Recognition API",
    description="API for face recognition attendance system",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# Global State
# ============================================
models_loaded = False
mtcnn = None
resnet = None
encodings = None
names = None
searcher = None
device = "cpu"

# Store for confirmed users (simulating session)
confirmed_users = {}

# ============================================
# Pydantic Models
# ============================================
class Message(BaseModel):
    name: str

class FrameRequest(BaseModel):
    image: str  # Base64 encoded image

class ConfirmRequest(BaseModel):
    student_id: str
    name: str
    similarity: float

class RecognitionResult(BaseModel):
    success: bool
    recognized: bool
    name: Optional[str] = None
    student_id: Optional[str] = None
    similarity: Optional[float] = None
    message: str

class ConfirmResponse(BaseModel):
    success: bool
    message: str
    greeting: Optional[str] = None

# ============================================
# Model Loading
# ============================================
def load_models():
    """Load face detection and recognition models"""
    global models_loaded, mtcnn, resnet, encodings, names, searcher, device
    
    if models_loaded:
        return True
    
    try:
        import torch
        from facenet_pytorch import MTCNN, InceptionResnetV1
        from sklearn.neighbors import NearestNeighbors
        
        device = 'cuda' if torch.cuda.is_available() else 'cpu'
        print(f"Using device: {device}")
        
        # Initialize models
        mtcnn = MTCNN(keep_all=True, device=device)
        resnet = InceptionResnetV1(pretrained='vggface2').eval().to(device)
        print("Face detection models loaded")
        
        # Load encodings - look in parent's python folder
        base_path = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        enc_path = os.path.join(base_path, "python", "encodings.npy")
        names_path = os.path.join(base_path, "python", "names.npy")
        
        # Also try local path if not found
        if not os.path.exists(enc_path):
            enc_path = os.path.join(os.path.dirname(__file__), "encodings.npy")
            names_path = os.path.join(os.path.dirname(__file__), "names.npy")
        
        if not os.path.exists(enc_path):
            print(f"Encodings file not found at {enc_path}")
            print("Please run encode_dataset.py first or copy encodings.npy here")
            return False
        
        encodings = np.load(enc_path)
        names = np.load(names_path)
        print(f"Loaded {len(names)} face encodings")
        
        # Create nearest neighbors searcher
        if len(encodings) > 0:
            searcher = NearestNeighbors(n_neighbors=3, metric='cosine').fit(encodings)
        
        models_loaded = True
        return True
        
    except ImportError as e:
        print(f"Missing dependencies: {e}")
        print("Install: pip install torch facenet-pytorch scikit-learn")
        return False
    except Exception as e:
        print(f"Error loading models: {e}")
        return False

# ============================================
# Face Recognition Logic
# ============================================
def decode_base64_image(base64_string: str) -> Image.Image:
    """Decode base64 string to PIL Image"""
    # Remove data URL prefix if present
    if "base64," in base64_string:
        base64_string = base64_string.split("base64,")[1]
    
    image_data = base64.b64decode(base64_string)
    image = Image.open(io.BytesIO(image_data))
    return image.convert('RGB')

def recognize_face(image: Image.Image) -> dict:
    """Perform face recognition on an image"""
    global mtcnn, resnet, encodings, names, searcher, device
    
    import torch
    
    if not models_loaded:
        return {"recognized": False, "message": "Models not loaded"}
    
    # Convert PIL to numpy for detection
    img_array = np.array(image)
    
    # Detect faces
    boxes, probs = mtcnn.detect(image)
    
    if boxes is None or len(boxes) == 0:
        return {"recognized": False, "message": "No face detected"}
    
    # Get the best detection (highest probability)
    best_idx = np.argmax(probs)
    box = boxes[best_idx]
    x1, y1, x2, y2 = [int(b) for b in box]
    
    # Guard crop coordinates
    x1, y1 = max(0, x1), max(0, y1)
    x2, y2 = min(image.width - 1, x2), min(image.height - 1, y2)
    
    if x2 <= x1 or y2 <= y1:
        return {"recognized": False, "message": "Invalid face region"}
    
    # Crop face and get embedding
    face_img = image.crop((x1, y1, x2, y2))
    face_tensor = mtcnn(face_img)
    
    if face_tensor is None:
        return {"recognized": False, "message": "Could not extract face features"}
    
    # Normalize tensor shape
    if isinstance(face_tensor, torch.Tensor):
        if face_tensor.ndim == 3:
            face_tensor = face_tensor.unsqueeze(0).to(device)
        elif face_tensor.ndim == 4:
            face_tensor = face_tensor.to(device)
    
    # Get embedding
    with torch.no_grad():
        emb_tensor = resnet(face_tensor)
    emb = emb_tensor.squeeze(0).cpu().numpy()
    emb = emb / (np.linalg.norm(emb) + 1e-10)
    
    # Search for match
    dist, idx = searcher.kneighbors([emb], n_neighbors=1, return_distance=True)
    cosine_sim = 1 - dist[0][0]
    
    threshold = 0.45  # Same threshold as R project
    
    if cosine_sim >= threshold:
        matched_name = names[idx[0][0]]
        # Generate a student ID from the name (in real app, this would come from database)
        student_id = f"STD-{hash(matched_name) % 10000:04d}"
        
        return {
            "recognized": True,
            "name": str(matched_name),
            "student_id": student_id,
            "similarity": float(cosine_sim),
            "message": f"Face recognized with {cosine_sim:.0%} confidence"
        }
    else:
        return {
            "recognized": False,
            "similarity": float(cosine_sim),
            "message": f"Face detected but not recognized ({cosine_sim:.0%} match)"
        }

# ============================================
# API Endpoints
# ============================================

@app.on_event("startup")
async def startup_event():
    """Load models on startup"""
    print("Starting Face Recognition API...")
    load_models()

@app.get("/")
def read_root():
    """Root endpoint"""
    return {
        "name": "Face Recognition API",
        "version": "1.0.0",
        "status": "running",
        "models_loaded": models_loaded
    }

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "models_loaded": models_loaded,
        "encodings_count": len(names) if names is not None else 0
    }

@app.post("/hello")
def say_hello(msg: Message):
    """Original hello endpoint for backward compatibility"""
    return {"message": f"Hello {msg.name}, from Python!"}

@app.post("/api/recognize", response_model=RecognitionResult)
async def recognize_frame(request: FrameRequest):
    """
    Process a webcam frame and recognize the face
    
    Send a base64 encoded image and get back:
    - recognized: whether a known face was found
    - name: the person's name if recognized
    - student_id: generated student ID
    - similarity: confidence score (0-1)
    """
    if not models_loaded:
        success = load_models()
        if not success:
            raise HTTPException(
                status_code=503,
                detail="Face recognition models not available. Check server logs."
            )
    
    try:
        # Decode the image
        image = decode_base64_image(request.image)
        
        # Perform recognition
        result = recognize_face(image)
        
        return RecognitionResult(
            success=True,
            recognized=result.get("recognized", False),
            name=result.get("name"),
            student_id=result.get("student_id"),
            similarity=result.get("similarity"),
            message=result.get("message", "")
        )
        
    except Exception as e:
        return RecognitionResult(
            success=False,
            recognized=False,
            message=f"Error processing image: {str(e)}"
        )

@app.post("/api/confirm", response_model=ConfirmResponse)
async def confirm_attendance(request: ConfirmRequest):
    """
    Confirm attendance for a recognized person
    
    After recognition, call this to confirm and get a greeting
    """
    try:
        # Store confirmation (in real app, this would write to database)
        session_id = str(uuid.uuid4())
        timestamp = datetime.now().isoformat()
        
        confirmed_users[session_id] = {
            "student_id": request.student_id,
            "name": request.name,
            "similarity": request.similarity,
            "confirmed_at": timestamp
        }
        
        # Generate personalized greeting
        greeting = f"Hi {request.name}! 👋\nStudent ID: {request.student_id}\nWelcome to the session!"
        
        return ConfirmResponse(
            success=True,
            message="Attendance confirmed successfully",
            greeting=greeting
        )
        
    except Exception as e:
        return ConfirmResponse(
            success=False,
            message=f"Error confirming attendance: {str(e)}"
        )

@app.get("/api/status")
def get_status():
    """Get current system status"""
    return {
        "models_loaded": models_loaded,
        "device": device,
        "encodings_count": len(names) if names is not None else 0,
        "confirmed_sessions": len(confirmed_users)
    }

# ============================================
# Run server
# ============================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
