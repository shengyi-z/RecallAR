"""
utils.py — Pure, backend-agnostic helpers for the RecallAR pipeline.

This module has NO dependency on any face-recognition library (DeepFace,
InsightFace, etc.).  All library-specific code lives in embedder.py.

Responsibilities:
  - Cosine similarity computation
  - Embeddings database I/O (JSON)
  - Best-match lookup against a registered database
"""

import json
import logging
from pathlib import Path

import numpy as np

from config import DEFAULT_THRESHOLD

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Cosine similarity
# ---------------------------------------------------------------------------


def cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    """Compute cosine similarity between two embedding vectors.

    Args:
        vec_a: First embedding vector.
        vec_b: Second embedding vector.

    Returns:
        Similarity score in [-1.0, 1.0].  1.0 means identical direction.
        Returns 0.0 if either vector is the zero vector.
    """
    a = np.array(vec_a, dtype=np.float64)
    b = np.array(vec_b, dtype=np.float64)

    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)

    if norm_a == 0.0 or norm_b == 0.0:
        logger.warning("cosine_similarity received a zero-norm vector — returning 0.0")
        return 0.0

    return float(np.dot(a, b) / (norm_a * norm_b))


# ---------------------------------------------------------------------------
# Embeddings database I/O
# ---------------------------------------------------------------------------


def load_embeddings_db(db_path: str | Path) -> dict[str, list[list[float]]]:
    """Load the embeddings database from a JSON file.

    Expected format:
        {
          "Anna":  [[...embedding...], [...]],
          "David": [[...embedding...]],
          ...
        }

    Args:
        db_path: Path to the JSON file produced by build_embeddings.py.

    Returns:
        Dict mapping identity name → list of embedding vectors.

    Raises:
        FileNotFoundError: If db_path does not exist on disk.
        ValueError: If the JSON is malformed or has an unexpected structure.
    """
    db_path = Path(db_path)
    logger.debug("Loading embeddings database from: %s", db_path)

    if not db_path.exists():
        raise FileNotFoundError(f"Embeddings database not found: {db_path}")

    with open(db_path, "r", encoding="utf-8") as fh:
        data = json.load(fh)

    if not isinstance(data, dict):
        raise ValueError(
            f"Embeddings JSON must be a top-level object, got {type(data).__name__}."
        )

    identities = list(data.keys())
    total = sum(len(v) for v in data.values())
    logger.info(
        "Loaded embeddings database: %d identity(ies), %d embedding(s) — %s",
        len(identities),
        total,
        db_path,
    )
    return data  # type: ignore[return-value]


def save_embeddings_db(
    database: dict[str, list[list[float]]],
    output_path: str | Path,
) -> None:
    """Serialise the embeddings database to a JSON file.

    Args:
        database: Dict mapping identity name → list of embedding vectors.
        output_path: Destination file path.  Parent directories are created
                     automatically if they do not exist.
    """
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as fh:
        json.dump(database, fh, indent=2)

    total = sum(len(v) for v in database.values())
    logger.info(
        "Saved embeddings database: %d identity(ies), %d embedding(s) → %s",
        len(database),
        total,
        output_path,
    )


# ---------------------------------------------------------------------------
# Best-match lookup
# ---------------------------------------------------------------------------


def find_best_match(
    query_embedding: list[float],
    db: dict[str, list[list[float]]],
    threshold: float = DEFAULT_THRESHOLD,
) -> tuple[str, float]:
    """Compare a query embedding against all registered embeddings.

    Matching strategy: for identities with multiple reference images the score
    is the *maximum* similarity across all stored embeddings (nearest-neighbour).
    This is more robust to pose/lighting variation than averaging.

    Args:
        query_embedding: Embedding vector of the test face.
        db: Embeddings database (identity name → list of embeddings).
        threshold: Minimum cosine similarity required to accept a match.
                   Scores below this return "Unknown".

    Returns:
        Tuple of ``(identity_name, best_score)``.
        ``identity_name`` is ``"Unknown"`` when ``best_score < threshold``.
    """
    best_name = "Unknown"
    best_score = -1.0

    for identity, embeddings in db.items():
        for emb in embeddings:
            score = cosine_similarity(query_embedding, emb)
            if score > best_score:
                best_score = score
                best_name = identity
                logger.debug(
                    "New best match candidate: %s  score=%.4f", identity, score
                )

    if best_score < threshold:
        logger.info(
            "No match above threshold %.2f — best was '%s' at %.4f",
            threshold,
            best_name,
            best_score,
        )
        return "Unknown", best_score

    logger.info(
        "Match found: '%s'  score=%.4f  threshold=%.2f",
        best_name,
        best_score,
        threshold,
    )
    return best_name, best_score
