"""
evaluate_threshold.py — Analyse the embedding database to recommend a threshold.

Strategy:
  - Positive pairs: two embeddings from the SAME identity → should be similar.
  - Negative pairs: two embeddings from DIFFERENT identities → should differ.

A good threshold sits between the positive-pair minimum and the negative-pair
maximum.  The script evaluates several candidates and suggests one that
prioritises low false positives (we'd rather say "Unknown" than misidentify
someone as a registered contact).

This module has no dependency on any face recognition library — it works purely
from the JSON embeddings database.

Usage:
    python src/evaluate_threshold.py \
        --db outputs/embeddings.json \
        [--threshold_candidates 0.50 0.55 0.60 0.65 0.70 0.75] \
        [--log_level DEBUG]
"""

import argparse
import logging
import sys
from itertools import combinations
from pathlib import Path

import numpy as np

# Allow running from the project root as well as from within src/
sys.path.insert(0, str(Path(__file__).parent))

from config import DEFAULT_EMBEDDINGS_PATH, DEFAULT_THRESHOLD_CANDIDATES
from utils import cosine_similarity, load_embeddings_db

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Pair generation
# ---------------------------------------------------------------------------


def compute_positive_pairs(
    db: dict[str, list[list[float]]],
) -> list[float]:
    """Compute cosine similarity for all same-identity embedding pairs.

    Identities with fewer than 2 embeddings cannot form any positive pairs
    and are silently skipped.

    Args:
        db: Embeddings database (identity → list of embeddings).

    Returns:
        List of cosine similarity scores for genuine pairs.
    """
    scores: list[float] = []
    for identity, embeddings in db.items():
        if len(embeddings) < 2:
            logger.debug(
                "Identity '%s' has only 1 embedding — no positive pairs.", identity
            )
            continue
        for emb_a, emb_b in combinations(embeddings, 2):
            scores.append(cosine_similarity(emb_a, emb_b))

    logger.debug("Computed %d positive pair score(s).", len(scores))
    return scores


def compute_negative_pairs(
    db: dict[str, list[list[float]]],
) -> list[float]:
    """Compute cosine similarity for all cross-identity embedding pairs.

    Args:
        db: Embeddings database (identity → list of embeddings).

    Returns:
        List of cosine similarity scores for impostor pairs.
    """
    scores: list[float] = []
    identities = list(db.keys())

    for id_a, id_b in combinations(identities, 2):
        for emb_a in db[id_a]:
            for emb_b in db[id_b]:
                scores.append(cosine_similarity(emb_a, emb_b))

    logger.debug("Computed %d negative pair score(s).", len(scores))
    return scores


# ---------------------------------------------------------------------------
# Statistics
# ---------------------------------------------------------------------------


def summarise(scores: list[float]) -> dict:
    """Compute mean, min, and max for a list of similarity scores.

    Args:
        scores: Raw cosine similarity values.

    Returns:
        Dict with keys ``count``, ``mean``, ``min``, ``max``.
    """
    arr = np.array(scores, dtype=np.float64)
    return {
        "count": len(arr),
        "mean": float(np.mean(arr)),
        "min": float(np.min(arr)),
        "max": float(np.max(arr)),
    }


# ---------------------------------------------------------------------------
# Threshold evaluation
# ---------------------------------------------------------------------------


def evaluate_thresholds(
    positive_scores: list[float],
    negative_scores: list[float],
    candidates: list[float],
) -> list[dict]:
    """For each candidate threshold, compute false-positive and false-negative rates.

    * FP (False Positive): a negative pair scores >= threshold → impostor accepted.
    * FN (False Negative): a positive pair scores <  threshold → genuine rejected.

    Prioritising low FP means we accept more FN — safer for a care setting.

    Args:
        positive_scores: Similarity scores for genuine (same-identity) pairs.
        negative_scores: Similarity scores for impostor (different-identity) pairs.
        candidates: Threshold values to evaluate.

    Returns:
        List of result dicts (keys: ``threshold``, ``fp_rate``, ``fn_rate``),
        sorted by fp_rate ascending (lowest false-positive rate first).
    """
    results = []
    for t in candidates:
        fp = sum(1 for s in negative_scores if s >= t) / max(len(negative_scores), 1)
        fn = sum(1 for s in positive_scores if s < t) / max(len(positive_scores), 1)
        results.append({"threshold": t, "fp_rate": fp, "fn_rate": fn})
        logger.debug("Threshold %.2f — FP=%.4f  FN=%.4f", t, fp, fn)

    results.sort(key=lambda r: (r["fp_rate"], r["fn_rate"]))
    return results


# ---------------------------------------------------------------------------
# Threshold suggestion
# ---------------------------------------------------------------------------


def suggest_threshold(
    evaluations: list[dict],
    positive_stats: dict,
    negative_stats: dict,
) -> float:
    """Pick a suggested threshold that keeps the FP rate as low as possible.

    Strategy:
      1. Among candidates with FP = 0, prefer the highest (tightest band).
      2. If no candidate achieves FP = 0, fall back to the midpoint between
         the negative-pair maximum and the positive-pair minimum.
      3. Last resort: return 0.65.

    Args:
        evaluations: Output of :func:`evaluate_thresholds`.
        positive_stats: Stats for genuine pairs.
        negative_stats: Stats for impostor pairs.

    Returns:
        Suggested threshold value.
    """
    zero_fp = [r for r in evaluations if r["fp_rate"] == 0.0]
    if zero_fp:
        # Among zero-FP candidates, pick the one with the lowest FN rate.
        # Tie-break by taking the highest threshold (strictest that still matches).
        best = min(zero_fp, key=lambda r: (r["fn_rate"], -r["threshold"]))
        suggestion = best["threshold"]
        logger.info("Suggested threshold (zero-FP criterion): %.2f", suggestion)
        return suggestion

    if positive_stats["count"] > 0 and negative_stats["count"] > 0:
        midpoint = (negative_stats["max"] + positive_stats["min"]) / 2
        suggestion = round(midpoint, 2)
        logger.info(
            "No zero-FP candidate found — midpoint suggestion: %.2f", suggestion
        )
        return suggestion

    logger.warning("Insufficient data for threshold suggestion — returning default 0.65.")
    return 0.65


# ---------------------------------------------------------------------------
# Output formatting
# ---------------------------------------------------------------------------


def print_stats(label: str, stats: dict) -> None:
    """Print mean, min, and max for a set of pair scores."""
    print(f"\n  {label} ({stats['count']} pair(s)):")
    if stats["count"] == 0:
        print("    (no pairs — need at least 2 images per identity)")
        return
    print(f"    mean = {stats['mean']:.4f}   min = {stats['min']:.4f}   max = {stats['max']:.4f}")


def print_threshold_table(evaluations: list[dict]) -> None:
    """Print a formatted table of threshold candidates with FP/FN rates."""
    print(f"\n  {'Threshold':>10}  {'FP Rate':>10}  {'FN Rate':>10}  Notes")
    print("  " + "-" * 58)
    for row in evaluations:
        notes = ""
        if row["fp_rate"] == 0.0:
            notes = "<-- zero FP"
        elif row["fp_rate"] <= 0.05:
            notes = "<-- <=5% FP"
        print(
            f"  {row['threshold']:>10.2f}  "
            f"{row['fp_rate']:>10.4f}  "
            f"{row['fn_rate']:>10.4f}  "
            f"{notes}"
        )


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Evaluate threshold candidates for RecallAR recognition.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "--db",
        type=Path,
        default=DEFAULT_EMBEDDINGS_PATH,
        help="Path to the embeddings JSON database.",
    )
    parser.add_argument(
        "--threshold_candidates",
        nargs="+",
        type=float,
        default=DEFAULT_THRESHOLD_CANDIDATES,
        help="Threshold values to evaluate.",
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

    logger.info("Loading database from: %s", args.db)
    print(f"[INFO] Database : {args.db}")

    try:
        db = load_embeddings_db(args.db)
    except FileNotFoundError as exc:
        print(f"[ERROR] {exc}")
        logger.error("%s", exc)
        sys.exit(1)

    if not db:
        print("[ERROR] Database is empty.")
        sys.exit(1)

    identities = list(db.keys())
    total_embeddings = sum(len(v) for v in db.values())
    print(f"[INFO] Identities      : {', '.join(identities)}")
    print(f"[INFO] Total embeddings: {total_embeddings}")

    # --- Compute pair scores ---
    print("\n[INFO] Computing pair similarities...")
    positive_scores = compute_positive_pairs(db)
    negative_scores = compute_negative_pairs(db)

    # --- Statistics ---
    print("\n=== Pair Similarity Statistics ===")

    if positive_scores:
        pos_stats = summarise(positive_scores)
        print_stats("Positive pairs (same identity)", pos_stats)
    else:
        pos_stats: dict = {"count": 0, "mean": 0.0, "min": 0.0, "max": 0.0}
        print("\n  Positive pairs: none (each identity has only 1 image).")

    if negative_scores:
        neg_stats = summarise(negative_scores)
        print_stats("Negative pairs (different identities)", neg_stats)
    else:
        neg_stats: dict = {"count": 0, "mean": 0.0, "min": 0.0, "max": 0.0}
        print("\n  Negative pairs: none (fewer than 2 identities in database).")

    # --- Threshold evaluation ---
    if positive_scores or negative_scores:
        print(
            "\n=== Threshold Evaluation  "
            "(FP = impostor accepted, FN = genuine rejected) ==="
        )
        evaluations = evaluate_thresholds(
            positive_scores,
            negative_scores,
            args.threshold_candidates,
        )
        print_threshold_table(evaluations)

        suggested = suggest_threshold(evaluations, pos_stats, neg_stats)
        print(f"\n[SUGGESTED THRESHOLD] {suggested:.2f}")
        print(
            "  (prioritises low false positives — lower the value to reduce "
            "missed recognitions at the cost of more false acceptances)"
        )
    else:
        print("\n[WARN] Not enough data to evaluate thresholds.")

    print()


if __name__ == "__main__":
    main()
