from flask import Flask, request, jsonify
import os
import json
import base64
import io
from services.recognition_service import RecognitionService

app = Flask(__name__)

# Config
# Get absolute path to 'data' relative to this file
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
REGISTRY_PATH = os.path.join(DATA_DIR, 'registry.json')

# Ensure registry exists
if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)

# Initialize Service
recognition_service = RecognitionService(REGISTRY_PATH)

@app.route('/identify', methods=['POST'])
def identify():
    # Handle Multipart (File)
    if 'image' in request.files:
        file = request.files['image']
        if file.filename == '':
             return jsonify({"status": "error", "message": "No selected file"}), 400
        result = recognition_service.identify_image(file)
        return jsonify(result)

    # Handle JSON (Base64)
    if request.is_json:
        data = request.get_json()
        if 'image' in data:
            import base64
            import io
            
            # Decode base64
            image_data = data['image']
            # Remove header if present (e.g., "data:image/jpeg;base64,")
            if "," in image_data:
                image_data = image_data.split(",")[1]
            
            try:
                decoded = base64.b64decode(image_data)
                image_file = io.BytesIO(decoded)
                result = recognition_service.identify_image(image_file)
                return jsonify(result)
            except Exception as e:
                 return jsonify({"status": "error", "message": f"Invalid base64: {str(e)}"}), 400

    return jsonify({"status": "error", "message": "No image provided (file or json)"}), 400

@app.route('/reload', methods=['POST'])
def reload_registry():
    """Helper to reload registry without restarting server"""
    recognition_service.reload_registry()
    return jsonify({"status": "ok", "message": "Registry reloaded"})

if __name__ == '__main__':
    # Listen on all interfaces
    app.run(host='0.0.0.0', port=5001, debug=True)
