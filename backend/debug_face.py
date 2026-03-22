import face_recognition
import cv2
import sys
import os

# Usage: python3 debug_face.py <image_path>

def debug_image(image_path):
    if not os.path.exists(image_path):
        print(f"Error: File not found {image_path}")
        return

    print(f"Processing: {image_path}")
    
    # 1. Load image
    image = face_recognition.load_image_file(image_path)
    print(f"Image shape: {image.shape}")
    
    # 2. Try Default HOG Model (Fast)
    print("Attempting HOG detection...")
    locations_hog = face_recognition.face_locations(image, model="hog")
    print(f"HOG found {len(locations_hog)} faces")
    
    # 3. Try CNN Model (Accurate but Slow)
    print("Attempting CNN detection (this may take a while)...")
    try:
        locations_cnn = face_recognition.face_locations(image, model="cnn")
        print(f"CNN found {len(locations_cnn)} faces")
    except Exception as e:
        print(f"CNN detection failed: {e}")
        locations_cnn = []

    # 4. Save debug image with boxes if faces found
    if locations_hog or locations_cnn:
        # Convert RGB (face_recognition) to BGR (OpenCV)
        bgr_image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
        
        # Draw HOG detections (Blue)
        for top, right, bottom, left in locations_hog:
            cv2.rectangle(bgr_image, (left, top), (right, bottom), (255, 0, 0), 2)
            
        # Draw CNN detections (Red)
        for top, right, bottom, left in locations_cnn:
            cv2.rectangle(bgr_image, (left, top), (right, bottom), (0, 0, 255), 2)
            
        output_path = "debug_output.jpg"
        cv2.imwrite(output_path, bgr_image)
        print(f"Debug image saved to {output_path} (Blue=HOG, Red=CNN)")
    else:
        print("No faces found by any model.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 debug_face.py <image_path>")
    else:
        debug_image(sys.argv[1])
