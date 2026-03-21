import face_recognition
import numpy as np
import json
import os

class RecognitionService:
    def __init__(self, registry_path):
        self.registry_path = registry_path
        self.known_encodings = []
        self.known_metadata = []
        self.reload_registry()

    def reload_registry(self):
        if not os.path.exists(self.registry_path):
            self.known_encodings = []
            self.known_metadata = []
            return

        with open(self.registry_path, 'r') as f:
            data = json.load(f)
            
        self.known_encodings = []
        self.known_metadata = []
        
        for person in data:
            if 'encoding' in person and person['encoding']:
                self.known_encodings.append(np.array(person['encoding']))
                self.known_metadata.append({
                    "name": person['name'],
                    "relation": person['relation']
                })
        print(f"Loaded {len(self.known_encodings)} faces from registry.")

    def identify_image(self, image_file_or_path):
        try:
            # Load image
            unknown_image = face_recognition.load_image_file(image_file_or_path)
            
            # Detect faces
            face_locations = face_recognition.face_locations(unknown_image)
            
            if not face_locations:
                return {"status": "no_face"}

            # Encode faces
            # For MVP, we assume the primary face is the largest or first one found
            unknown_encodings = face_recognition.face_encodings(unknown_image, face_locations)
            
            if not unknown_encodings:
                return {"status": "no_face_encoding"}

            unknown_encoding = unknown_encodings[0]

            # Compare against known faces
            if not self.known_encodings:
                 return {"status": "unknown", "reason": "empty_registry"}

            # Tolerance: Lower is stricter. 0.6 is default.
            matches = face_recognition.compare_faces(self.known_encodings, unknown_encoding, tolerance=0.5)
            face_distances = face_recognition.face_distance(self.known_encodings, unknown_encoding)
            
            best_match_index = np.argmin(face_distances)
            
            if matches[best_match_index]:
                person = self.known_metadata[best_match_index]
                confidence = 1.0 - face_distances[best_match_index]
                return {
                    "status": "match",
                    "name": person['name'],
                    "relationship": person['relation'],
                    "confidence": float(confidence)
                }
            else:
                return {"status": "unknown"}
                
        except Exception as e:
            print(f"Error processing image: {e}")
            return {"status": "error", "message": str(e)}
