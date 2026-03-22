import json
import os
import sys
import numpy as np
from insightface.app import FaceAnalysis
from PIL import Image

# Usage: python register_face.py <name> <relation> <image_path>

REGISTRY_PATH = os.path.join(os.path.dirname(__file__), 'data', 'registry.json')

def register_face(name, relation, image_path):
    # Verify file exists
    if not os.path.exists(image_path):
        print(f"Error: Image file not found at {image_path}")
        return

    # Convert to absolute path to ensure backend can find it
    abs_path = os.path.abspath(image_path)
    
    print(f"Processing {abs_path} for {name} ({relation})...")
    
    # Initialize InsightFace
    print("Loading InsightFace model...")
    app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
    app.prepare(ctx_id=-1, det_size=(640, 640))
    
    # Load and process image
    img = Image.open(abs_path).convert('RGB')
    img_array = np.array(img)
    
    # Detect faces
    faces = app.get(img_array)
    
    if len(faces) == 0:
        print(f"Error: No face detected in {abs_path}")
        return
    
    # Use the first (largest) face
    face = faces[0]
    encoding = face.embedding
    
    print(f"Face detected! Embedding size: {encoding.shape}")
    
    new_entry = {
        "id": f"{name}_{relation}", 
        "name": name,
        "relation": relation,
        "image_path": abs_path,
        "encoding": encoding.tolist()  # Convert numpy array to list for JSON
    }
    
    # Load existing
    registry = []
    if os.path.exists(REGISTRY_PATH):
        with open(REGISTRY_PATH, 'r') as f:
            try:
                registry = json.load(f)
            except json.JSONDecodeError:
                registry = []
    
    # Check for duplicates (simple name check)
    # Remove existing entry with same name if any
    registry = [p for p in registry if p['name'] != name]
    
    registry.append(new_entry)
    
    # Save
    with open(REGISTRY_PATH, 'w') as f:
        json.dump(registry, f, indent=4)
        
    print(f"Successfully registered {name}! (Computed face embedding)")

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python register_face.py <name> <relation> <image_path>")
        sys.exit(1)
        
    name = sys.argv[1]
    relation = sys.argv[2]
    img_path = sys.argv[3]
    
    register_face(name, relation, img_path)
