"""
recognize_face.py — Identify a person in a test image against the registered database.

The embedding logic is delegated entirely to a FaceEmbedder instance, keeping
this module free of any direct dependency on DeepFace or any other library.

Usage:
    python src/recognize_face.py \
        --image test_images/test1.jpg \
        --db outputs/embeddings.json \
        [--threshold 0.65] \
        [--model Facenet] \
        [--detector retinaface] \
        [--log_level DEBUG]

Exit codes:
    0 — A known identity was matched.
    1 — The person was classified as Unknown (score below threshold).
    2 — An input/processing error occurred.
"""

import argparse
import logging
import sys
from pathlib import Path

# Allow running from the project root as well as from within src/
sys.path.insert(0, str(Path(__file__).parent))

from config import (
    DEFAULT_BACKEND,
    DEFAULT_DETECTOR,
    DEFAULT_EMBEDDINGS_PATH,
    DEFAULT_INSIGHTFACE_MODEL,
    DEFAULT_MODEL,
    DEFAULT_THRESHOLD,
)
from embedder import DeepFaceEmbedder, FaceEmbedder, FaceRecognitionEmbedder, InsightFaceEmbedder
from utils import find_best_match, load_embeddings_db

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Core recognition function — library-agnostic, reusable in other modules
# ---------------------------------------------------------------------------


def recognize(
    image_path: str | Path,
    db_path: str | Path,
    embedder: FaceEmbedder,
    threshold: float = DEFAULT_THRESHOLD,
) -> dict:
    """Run the full recognition pipeline on a single image.

    Errors are returned inside the result dict rather than raised so that
    callers (e.g. a real-time AR loop) can handle failures without try/except.

    Args:
        image_path: Path to the test image.
        db_path: Path to the JSON embeddings database.
        embedder: A FaceEmbedder instance.  Any backend can be passed in.
        threshold: Cosine similarity threshold.  Scores below this → Unknown.

    Returns:
        Result dict with the following keys:

        * ``"identity"``  — matched name (``str``), or ``"Unknown"``
        * ``"score"``     — best cosine similarity score (``float``)
        * ``"matched"``   — ``True`` if score >= threshold (``bool``)
        * ``"error"``     — error message string, or ``None``
    """
    result: dict = {
        "identity": "Unknown",
        "score": 0.0,
        "matched": False,
        "error": None,
    }

    # --- Load the embeddings database ---
    try:
        db = load_embeddings_db(db_path)
    except FileNotFoundError as exc:
        logger.error("Database not found: %s", exc)
        result["error"] = str(exc)
        return result

    if not db:
        msg = "Embeddings database is empty."
        logger.error(msg)
        result["error"] = msg
        return result

    # --- Extract embedding from the test image via the injected backend ---
    logger.info(
        "Recognising image '%s' using backend: %s", image_path, embedder.backend_name
    )
    try:
        query_embedding = embedder.detect_and_extract_embedding(image_path)
    except FileNotFoundError as exc:
        logger.error("Image not found: %s", exc)
        result["error"] = str(exc)
        return result
    except ValueError as exc:
        # Covers: unreadable image, zero faces, multiple faces
        logger.warning("Face validation failed: %s", exc)
        result["error"] = str(exc)
        return result
    except RuntimeError as exc:
        logger.error("Embedding extraction error: %s", exc)
        result["error"] = str(exc)
        return result

    # --- Match against database ---
    identity, score = find_best_match(query_embedding, db, threshold=threshold)

    result["identity"] = identity
    result["score"] = round(score, 4)
    result["matched"] = identity != "Unknown"

    if result["matched"]:
        logger.info("Result: MATCH '%s'  score=%.4f", identity, score)
    else:
        logger.info("Result: UNKNOWN  best_score=%.4f  threshold=%.2f", score, threshold)

    return result


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Recognize a face in a test image against the RecallAR database.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "--image",
        type=Path,
        required=True,
        help="Path to the test image.",
    )
    parser.add_argument(
        "--db",
        type=Path,
        default=DEFAULT_EMBEDDINGS_PATH,
        help="Path to the embeddings JSON database.",
    )
    parser.add_argument(
        "--threshold",
        type=float,
        default=DEFAULT_THRESHOLD,
        help="Cosine similarity threshold. Scores below this → Unknown.",
    )
    parser.add_argument(
        "--backend",
        type=str,
        default=DEFAULT_BACKEND,
        choices=["insightface", "face_recognition", "deepface"],
        help="Embedding backend. 'insightface' (ArcFace ONNX, default) gives best accuracy.",
    )
    parser.add_argument(
        "--insightface_model",
        type=str,
        default=DEFAULT_INSIGHTFACE_MODEL,
        help="InsightFace model pack: 'buffalo_s' (fast) or 'buffalo_l' (accurate).",
    )
    parser.add_argument(
        "--model",
        type=str,
        default=DEFAULT_MODEL,
        help="DeepFace model (ignored when --backend=face_recognition).",
    )
    parser.add_argument(
        "--detector",
        type=str,
        default=DEFAULT_DETECTOR,
        help="DeepFace detector (ignored when --backend=face_recognition).",
    )
    parser.add_argument(
        "--log_level",
        type=str,
        default="INFO",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        help="Logging verbosity.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    logging.basicConfig(
        level=getattr(logging, args.log_level),
        format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
        datefmt="%H:%M:%S",
    )

    print(f"[INFO] Test image  : {args.image}")
    print(f"[INFO] Database    : {args.db}")
    print(f"[INFO] Threshold   : {args.threshold}")
    print(f"[INFO] Backend     : {args.backend}")
    print()

    if args.backend == "insightface":
        embedder: FaceEmbedder = InsightFaceEmbedder(model_name=args.insightface_model)
    elif args.backend == "face_recognition":
        embedder = FaceRecognitionEmbedder()
    else:
        embedder = DeepFaceEmbedder(
            model_name=args.model,
            detector_backend=args.detector,
        )

    result = recognize(
        image_path=args.image,
        db_path=args.db,
        embedder=embedder,
        threshold=args.threshold,
    )

    if result["error"]:
        print(f"[ERROR] {result['error']}")
        sys.exit(2)

    identity = result["identity"]
    score = result["score"]

    if result["matched"]:
        print(f"[RESULT] MATCH    : {identity}")
        print(f"[RESULT] Score    : {score:.4f}  (threshold = {args.threshold})")
        sys.exit(0)
    else:
        print(f"[RESULT] UNKNOWN  (best score = {score:.4f}, threshold = {args.threshold})")
        sys.exit(1)


if __name__ == "__main__":
    main()
