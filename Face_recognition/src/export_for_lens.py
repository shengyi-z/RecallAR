"""
export_for_lens.py — Export the embeddings database and ONNX model for Lens Studio.

Produces two files in outputs/:
  - embeddings_lens.json   one averaged 512-d embedding per registered identity
  - w600k_mbf.onnx         the InsightFace ArcFace recognition model

The JSON format is flat and easy to consume from Lens Studio JavaScript:
    {
      "Sabrina": [0.12, -0.04, ...],   // 512 floats
      "Cleo":    [0.88,  0.02, ...]
    }

Usage:
    python src/export_for_lens.py
    python src/export_for_lens.py --db outputs/embeddings.json --out_dir outputs/
"""

import argparse
import json
import shutil
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))

from config import DEFAULT_EMBEDDINGS_PATH, DEFAULT_INSIGHTFACE_MODEL


# InsightFace stores downloaded models here by default.
INSIGHTFACE_MODEL_DIR = Path.home() / ".insightface" / "models"
RECOGNITION_MODEL_FILENAME = "w600k_mbf.onnx"


def flatten_embeddings(
    db: dict[str, list[list[float]]],
) -> dict[str, list[float]]:
    """Average all embeddings per identity into a single representative vector.

    Args:
        db: Full embeddings database (identity → list of embedding vectors).

    Returns:
        Flat dict mapping identity → single averaged + L2-normalised embedding.
    """
    flat: dict[str, list[float]] = {}
    for identity, embeddings in db.items():
        arr = np.array(embeddings, dtype=np.float64)
        mean_vec = np.mean(arr, axis=0)
        # Re-normalise so cosine similarity still works correctly.
        norm = np.linalg.norm(mean_vec)
        if norm > 0:
            mean_vec = mean_vec / norm
        flat[identity] = mean_vec.tolist()
        print(f"  {identity}: averaged {len(embeddings)} embedding(s) → 1 vector (dim={len(flat[identity])})")
    return flat


def find_onnx_model(model_name: str) -> Path | None:
    """Locate the InsightFace recognition ONNX model on disk.

    Args:
        model_name: InsightFace model pack name (e.g. "buffalo_s").

    Returns:
        Path to the .onnx file, or None if not found.
    """
    candidate = INSIGHTFACE_MODEL_DIR / model_name / RECOGNITION_MODEL_FILENAME
    if candidate.exists():
        return candidate
    return None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Export embeddings and ONNX model for Lens Studio.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "--db",
        type=Path,
        default=DEFAULT_EMBEDDINGS_PATH,
        help="Path to the embeddings JSON database.",
    )
    parser.add_argument(
        "--out_dir",
        type=Path,
        default=Path("outputs"),
        help="Directory to write export files into.",
    )
    parser.add_argument(
        "--insightface_model",
        type=str,
        default=DEFAULT_INSIGHTFACE_MODEL,
        help="InsightFace model pack name (used to locate the ONNX file).",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    # --- Load database ---
    if not args.db.exists():
        print(f"[ERROR] Database not found: {args.db}")
        sys.exit(1)

    with open(args.db, "r", encoding="utf-8") as fh:
        db: dict[str, list[list[float]]] = json.load(fh)

    print(f"[INFO] Loaded {len(db)} identity(ies) from {args.db}")

    # --- Flatten embeddings ---
    print("\n[INFO] Averaging embeddings per identity...")
    flat = flatten_embeddings(db)

    # --- Write embeddings_lens.json ---
    args.out_dir.mkdir(parents=True, exist_ok=True)
    lens_json_path = args.out_dir / "embeddings_lens.json"
    with open(lens_json_path, "w", encoding="utf-8") as fh:
        json.dump(flat, fh, indent=2)
    print(f"\n[OK] Embeddings written to: {lens_json_path}")

    # --- Copy ONNX model ---
    onnx_src = find_onnx_model(args.insightface_model)
    if onnx_src:
        onnx_dst = args.out_dir / RECOGNITION_MODEL_FILENAME
        shutil.copy2(onnx_src, onnx_dst)
        size_mb = onnx_dst.stat().st_size / 1_048_576
        print(f"[OK] ONNX model  copied to: {onnx_dst}  ({size_mb:.1f} MB)")
    else:
        print(f"[WARN] ONNX model not found at {INSIGHTFACE_MODEL_DIR / args.insightface_model}")
        print("       Run build_embeddings.py first so InsightFace downloads the model.")

    # --- Summary ---
    print(f"""
=== Lens Studio export ready ===

  outputs/embeddings_lens.json  — load this as a JSON asset in Lens Studio
  outputs/w600k_mbf.onnx        — import as a Custom ML model

In your Lens Studio script:
  1. Run the ONNX model on the face crop to get a 512-d embedding.
  2. Compute cosine similarity against each vector in embeddings_lens.json.
  3. If best score >= threshold (suggested: 0.40), show the matched name.
  4. Otherwise show "Unknown".

Cosine similarity (JavaScript):
  function cosineSim(a, b) {{
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {{
      dot += a[i] * b[i]; na += a[i]*a[i]; nb += b[i]*b[i];
    }}
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
  }}
""")


if __name__ == "__main__":
    main()
