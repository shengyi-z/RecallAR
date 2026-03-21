# Assistive AR Backend

This is the Python backend for the Spectacles Alzheimer's Assistant project.

## Setup

1.  **Install Dependencies**
    ```bash
    pip install -r requirements.txt
    ```
    *Note: `dlib` (dependency of face_recognition) requires CMake installed.*

2.  **Register Family Members**
    Add photos of family members to the `data/` folder (or anywhere), then run:
    ```bash
    python register_face.py "Maria" "Wife" ./photos/maria.jpg
    python register_face.py "David" "Son" ./photos/david.jpg
    ```
    This will update `data/registry.json`.

3.  **Run Server**
    ```bash
    python app.py
    ```
    Server runs on `http://localhost:5000`.

## API Usage

**Endpoint:** `POST /identify`

**Body:** `multipart/form-data` with `image` field.

**Response:**
```json
{
  "status": "match",
  "name": "Maria",
  "relationship": "Wife",
  "confidence": 0.98
}
```
or
```json
{
  "status": "unknown"
}
```

## Deployment for Spectacles

To access this from Spectacles, you need a public URL.
Use **ngrok** for local testing:
```bash
ngrok http 5000
```
Then update the `backendUrl` in `Scripts/Network/APIClient.js` with the https URL from ngrok.
