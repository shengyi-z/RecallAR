import face_recognition
import json
import os
import sys
import numpy as np

# Usage: python register_face.py <name> <relation> <image_path>

REGISTRY_PATH = os.path.join(os.path.dirname(__file__), 'data', 'registry.json')

def register_face(name, relation, image_path):
    print(f"Processing {image_path} for {name} ({relation})...")
    
    try:
        image = face_recognition.load_image_file(image_path)
        encodings = face_recognition.face_encodings(image)
        
        if not encodings:
            print("Error: No face found in the image.")
            return
            
        # Use the first face found
        encoding = encodings[0].tolist()
        
        new_entry = {
            "id": f"{name}_{relation}", # Simple ID generation
            "name": name,
            "relation": relation,
            "encoding": encoding
        }
        
        # Load existing
        if os.path.exists(REGISTRY_PATH):
            with open(REGISTRY_PATH, 'r') as f:
                try:
                    registry = json.load(f)
                except json.JSONDecodeError:
                    registry = []
        else:
            registry = []
            
        # Check for duplicates (simple name check)
        # In a real app, you might update existing entries
        registry.append(new_entry)
        
        # Save
        with open(REGISTRY_PATH, 'w') as f:
            json.dump(registry, f, indent=4)
            
        print(f"Successfully registered {name}!")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python register_face.py <name> <relation> <image_path>")
        sys.exit(1)
        
    name = sys.argv[1]
    relation = sys.argv[2]
    img_path = sys.argv[3]
    
    register_face(name, relation, img_path)
