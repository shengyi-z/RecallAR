"""
build_embeddings.py — Build the face embedding database from a dataset folder.

The embedding logic is fully delegated to a FaceEmbedder instance, so this
script has no direct dependency on DeepFace or any other library.

Usage:
    python src/build_embeddings.py \
        --data_dir data/ \
        --output outputs/embeddings.json \
        [--model Facenet] \
        [--detector retinaface] \
        [--log_level DEBUG]

Dataset folder structure expected:
    data/
      Anna/
        anna1.jpg
        anna2.jpg
      David/
        david1.jpg
      Emma/
        emma1.jpg

Output (outputs/embeddings.json):
    {
      "Anna":  [[...embedding...], [...]],
      "David": [[...embedding...]],
      ...
    }
"""

import argparse
import logging
import sys
from pathlib import Path

# Allow running from the project root as well as from within src/
sys.path.insert(0, str(Path(__file__).parent))

from config import (
    DEFAULT_BACKEND,
    DEFAULT_DATA_DIR,
    DEFAULT_DETECTOR,
    DEFAULT_EMBEDDINGS_PATH,
    DEFAULT_INSIGHTFACE_MODEL,
    DEFAULT_MODEL,
    MIN_IMAGES_PER_PERSON,
    SUPPORTED_EXTENSIONS,
)
from embedder import DeepFaceEmbedder, FaceEmbedder, FaceRecognitionEmbedder, InsightFaceEmbedder
from utils import save_embeddings_db

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Dataset scanning
# ---------------------------------------------------------------------------


def collect_image_paths(data_dir: Path) -> dict[str, list[Path]]:
    """Walk the dataset directory and collect image paths per identity.

    Each immediate sub-directory of ``data_dir`` is treated as one identity.
    Files at the top level are silently ignored.

    Args:
        data_dir: Root of the dataset folder.

    Returns:
        Dict mapping identity name → list of image Paths, sorted alphabetically.

    Raises:
        FileNotFoundError: If data_dir does not exist.
        ValueError: If no identities with supported images are found.
    """
    if not data_dir.exists():
        raise FileNotFoundError(f"Data directory not found: {data_dir}")

    identity_images: dict[str, list[Path]] = {}

    for entry in sorted(data_dir.iterdir()):
        if not entry.is_dir():
            logger.debug("Skipping non-directory entry: %s", entry)
            continue

        images = [
            f for f in sorted(entry.iterdir())
            if f.is_file() and f.suffix.lower() in SUPPORTED_EXTENSIONS
        ]

        if images:
            identity_images[entry.name] = images
            logger.debug(
                "Found %d image(s) for identity '%s'.", len(images), entry.name
            )
        else:
            logger.warning(
                "No supported images in '%s' — skipping identity.", entry
            )

    if not identity_images:
        raise ValueError(
            f"No identities found in '{data_dir}'. "
            f"Make sure sub-directories contain images with extensions: "
            f"{sorted(SUPPORTED_EXTENSIONS)}"
        )

    logger.info(
        "Found %d identity(ies) in '%s'.", len(identity_images), data_dir
    )
    return identity_images


# ---------------------------------------------------------------------------
# Database construction
# ---------------------------------------------------------------------------


def build_database(
    data_dir: Path,
    embedder: FaceEmbedder,
) -> dict[str, list[list[float]]]:
    """Process all images and compute embeddings for each identity.

    Errors on individual images are logged and skipped; the identity is only
    registered if at least MIN_IMAGES_PER_PERSON embeddings succeed.

    Args:
        data_dir: Root dataset directory.
        embedder: Any FaceEmbedder implementation — the database builder does
                  not depend on which backend is used.

    Returns:
        Dict mapping identity name → list of embedding vectors.
    """
    logger.info("Building database using backend: %s", embedder.backend_name)
    identity_images = collect_image_paths(data_dir)
    database: dict[str, list[list[float]]] = {}

    total_images = sum(len(v) for v in identity_images.values())
    processed = 0

    for identity, image_paths in identity_images.items():
        logger.info(
            "Processing identity '%s' (%d image(s)).", identity, len(image_paths)
        )
        embeddings: list[list[float]] = []

        for img_path in image_paths:
            processed += 1
            logger.debug(
                "[%d/%d] Embedding %s ...", processed, total_images, img_path.name
            )
            print(
                f"  [{processed}/{total_images}] {img_path.name} ... ",
                end="",
                flush=True,
            )

            try:
                embedding = embedder.detect_and_extract_embedding(img_path)
                embeddings.append(embedding)
                print("OK")
                logger.debug("OK — dim=%d", len(embedding))
            except FileNotFoundError as exc:
                print(f"SKIP — {exc}")
                logger.warning("SKIP (file not found): %s", exc)
            except ValueError as exc:
                # Zero faces, multiple faces, or unreadable image
                print(f"SKIP — {exc}")
                logger.warning("SKIP (face validation): %s", exc)
            except RuntimeError as exc:
                print(f"SKIP — {exc}")
                logger.error("SKIP (embedding error): %s", exc)

        if len(embeddings) >= MIN_IMAGES_PER_PERSON:
            database[identity] = embeddings
            logger.info(
                "Registered '%s' with %d embedding(s).", identity, len(embeddings)
            )
            print(f"  -> Registered '{identity}' with {len(embeddings)} embedding(s).")
        else:
            logger.warning(
                "Skipping identity '%s': only %d valid embedding(s), need %d.",
                identity,
                len(embeddings),
                MIN_IMAGES_PER_PERSON,
            )
            print(
                f"  [WARN] '{identity}' skipped — "
                f"{len(embeddings)}/{MIN_IMAGES_PER_PERSON} valid embedding(s)."
            )

    return database


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build the RecallAR face embedding database.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "--data_dir",
        type=Path,
        default=DEFAULT_DATA_DIR,
        help="Root folder containing one sub-directory per identity.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_EMBEDDINGS_PATH,
        help="Where to save the embeddings JSON.",
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

    print(f"[INFO] Dataset directory : {args.data_dir}")
    print(f"[INFO] Output path       : {args.output}")
    print(f"[INFO] Backend           : {args.backend}")
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

    try:
        database = build_database(data_dir=args.data_dir, embedder=embedder)
    except (FileNotFoundError, ValueError) as exc:
        print(f"\n[ERROR] {exc}")
        logger.error("%s", exc)
        sys.exit(1)

    if not database:
        print("\n[ERROR] No embeddings were computed. Check your dataset.")
        sys.exit(1)

    save_embeddings_db(database, args.output)

    identities = list(database.keys())
    total = sum(len(v) for v in database.values())
    print(f"\n[INFO] Done. Registered {len(identities)} identity(ies), {total} embedding(s).")
    print(f"[INFO] Identities: {', '.join(identities)}")


if __name__ == "__main__":
    main()
