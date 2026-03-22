import base64
import os
import json
import numpy as np
from insightface.app import FaceAnalysis
from PIL import Image
import io

class RecognitionService:
    def __init__(self, registry_path):
        self.registry_path = registry_path
        
        # Initialize InsightFace
        print("Loading InsightFace model...")
        self.app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
        self.app.prepare(ctx_id=-1, det_size=(640, 640))
        
        self.known_people = []
        self.reload_registry()

    def reload_registry(self):
        if not os.path.exists(self.registry_path):
            self.known_people = []
            return

        with open(self.registry_path, 'r') as f:
            data = json.load(f)
            
        # Convert encodings back to numpy arrays
        for person in data:
            if 'encoding' in person:
                person['encoding'] = np.array(person['encoding'])
        
        self.known_people = data
        print(f"Loaded {len(self.known_people)} people from registry.")

    def identify_image(self, image_file_or_path):
        try:
            # Prepare the target image
            if hasattr(image_file_or_path, 'read'):
                # File-like object
                image_bytes = image_file_or_path.read()
                image_file_or_path.seek(0)
            else:
                # Path
                with open(image_file_or_path, "rb") as image_file:
                    image_bytes = image_file.read()
            
            # Convert to numpy array (RGB)
            target_image = Image.open(io.BytesIO(image_bytes))
            target_image = target_image.convert('RGB')
            target_array = np.array(target_image)
            
            # Detect faces in target image
            faces = self.app.get(target_array)
            
            if len(faces) == 0:
                return {"status": "error", "message": "No face detected in image"}
            
            # Use the first (largest) face
            target_face = faces[0]
            target_encoding = target_face.embedding
            
            if len(self.known_people) == 0:
                return {"status": "unknown", "message": "No registered people in database"}
            
            # Compare with known faces using cosine similarity
            best_match_name = None
            best_match_relation = None
            best_similarity = -1.0  # Cosine similarity ranges from -1 to 1
            threshold = 0.6  # Minimum cosine similarity (higher = stricter match)
            
            for person in self.known_people:
                if 'encoding' not in person:
                    continue
                
                ref_encoding = person['encoding']
                
                # Calculate cosine similarity
                similarity = np.dot(target_encoding, ref_encoding) / (
                    np.linalg.norm(target_encoding) * np.linalg.norm(ref_encoding)
                )
                
                if similarity > best_similarity:
                    best_similarity = similarity
                    best_match_name = person['name']
                    best_match_relation = person['relation']
            
            print(f"Best match: {best_match_name} (similarity: {best_similarity:.3f})")
            
            if best_similarity > threshold:
                confidence = round(best_similarity, 2)
                return {
                    "status": "match",
                    "name": best_match_name,
                    "relationship": best_match_relation,
                    "confidence": confidence
                }
            else:
                return {"status": "unknown", "message": f"No match found (best similarity: {best_similarity:.3f})"}


        except Exception as e:
            print(f"Error during recognition: {e}")
            import traceback
            traceback.print_exc()
            return {"status": "error", "message": str(e)}
