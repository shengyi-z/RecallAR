"""
test_webcam.py — Live webcam face recognition using the RecallAR pipeline.

Press SPACE to capture a frame and identify the person.
Press Q to quit.

Usage:
    python src/test_webcam.py
    python src/test_webcam.py --db outputs/embeddings.json --threshold 0.95
"""

import argparse
import sys
import tempfile
from pathlib import Path

import cv2

sys.path.insert(0, str(Path(__file__).parent))

from config import DEFAULT_BACKEND, DEFAULT_EMBEDDINGS_PATH, DEFAULT_INSIGHTFACE_MODEL, DEFAULT_THRESHOLD
from embedder import DeepFaceEmbedder, FaceRecognitionEmbedder, InsightFaceEmbedder
from recognize_face import recognize


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Live webcam face recognition.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument("--db", type=Path, default=DEFAULT_EMBEDDINGS_PATH)
    parser.add_argument("--threshold", type=float, default=DEFAULT_THRESHOLD)
    parser.add_argument(
        "--backend",
        type=str,
        default=DEFAULT_BACKEND,
        choices=["insightface", "face_recognition", "deepface"],
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    if args.backend == "insightface":
        embedder = InsightFaceEmbedder(model_name=DEFAULT_INSIGHTFACE_MODEL)
    elif args.backend == "face_recognition":
        embedder = FaceRecognitionEmbedder()
    else:
        embedder = DeepFaceEmbedder()

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("[ERROR] Could not open webcam.")
        sys.exit(1)

    print(f"[INFO] Database  : {args.db}")
    print(f"[INFO] Threshold : {args.threshold}")
    print()
    print("Press SPACE to capture and recognise. Press Q to quit.")

    label = "Press SPACE"

    while True:
        ret, frame = cap.read()
        if not ret:
            print("[ERROR] Failed to read from webcam.")
            break

        # Overlay the last result on the live feed
        cv2.putText(frame, label, (20, 40),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 255, 0), 2)
        cv2.imshow("RecallAR webcam  (SPACE=recognise  Q=quit)", frame)

        key = cv2.waitKey(1) & 0xFF

        if key == ord("q"):
            break
        elif key == ord(" "):
            # Save the current frame to a temp file and run recognition
            with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as f:
                tmp_path = f.name
            cv2.imwrite(tmp_path, frame)

            result = recognize(tmp_path, args.db, embedder, args.threshold)
            Path(tmp_path).unlink(missing_ok=True)

            if result["error"]:
                label = f"ERROR: {result['error']}"
                print(f"[ERROR] {result['error']}")
            elif result["matched"]:
                label = f"{result['identity']}  ({result['score']:.2f})"
                print(f"[RESULT] MATCH    : {result['identity']}  score={result['score']:.4f}")
            else:
                label = f"Unknown  ({result['score']:.2f})"
                print(f"[RESULT] UNKNOWN  best score={result['score']:.4f}")

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
