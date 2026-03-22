"""
config.py — Central configuration and constants for the RecallAR pipeline.

All scripts import from here so that values only need to change in one place.
"""

from pathlib import Path

# ---------------------------------------------------------------------------
# Dataset / registration
# ---------------------------------------------------------------------------

# Image file extensions the pipeline will process.
SUPPORTED_EXTENSIONS: frozenset[str] = frozenset(
    {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
)

# Minimum number of successfully embedded images required before an identity
# is written to the database.  Set to 1 to allow single-image registration.
MIN_IMAGES_PER_PERSON: int = 1

# ---------------------------------------------------------------------------
# Matching
# ---------------------------------------------------------------------------

# Cosine similarity threshold used by recognize_face.py.
# Scores below this → "Unknown".  Run evaluate_threshold.py to calibrate.
DEFAULT_THRESHOLD: float = 0.40

# ---------------------------------------------------------------------------
# Embedding backend defaults
# ---------------------------------------------------------------------------

# Which embedding backend to use.
# "insightface"      — ArcFace ONNX via onnxruntime, 512-d, accurate (default)
# "face_recognition" — dlib-based, 128-d, no TF, works on macOS/Apple Silicon
# "deepface"         — TensorFlow-based, may hang on some macOS setups
DEFAULT_BACKEND: str = "insightface"

# InsightFace model pack.  Only used when DEFAULT_BACKEND = "insightface".
# "buffalo_s" — lightweight, fast, ~50 MB download
# "buffalo_l" — more accurate, ~340 MB download
DEFAULT_INSIGHTFACE_MODEL: str = "buffalo_s"

# DeepFace model.  Only used when DEFAULT_BACKEND = "deepface".
# Alternatives: "Facenet512", "ArcFace", "VGG-Face", "SFace"
DEFAULT_MODEL: str = "Facenet"

# DeepFace face detector.  Only used when DEFAULT_BACKEND = "deepface".
# Alternatives: "mtcnn", "ssd", "mediapipe", "opencv"
DEFAULT_DETECTOR: str = "retinaface"

# ---------------------------------------------------------------------------
# File system paths (relative to the project root)
# ---------------------------------------------------------------------------

# Root folder containing one sub-directory per registered identity.
DEFAULT_DATA_DIR: Path = Path("data")

# Where build_embeddings.py writes the JSON database.
DEFAULT_EMBEDDINGS_PATH: Path = Path("outputs/embeddings.json")

# ---------------------------------------------------------------------------
# Threshold evaluation
# ---------------------------------------------------------------------------

# Candidate thresholds evaluated by evaluate_threshold.py.
DEFAULT_THRESHOLD_CANDIDATES: list[float] = [
    0.40, 0.45, 0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80
]
