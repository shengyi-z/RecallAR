"""
embedder.py — Abstract FaceEmbedder interface and concrete implementations.

Design goals:
  - The rest of the pipeline (build_embeddings, recognize_face) depends only on
    FaceEmbedder, never on any specific library directly.
  - Swapping backends means adding a new subclass here — no other file changes.

Available backends:
  - InsightFaceEmbedder      (ArcFace ONNX via onnxruntime, default — 512-d, accurate)
  - FaceRecognitionEmbedder  (dlib-based — 128-d, no TF, works on macOS/Apple Silicon)
  - DeepFaceEmbedder         (TensorFlow-based — may hang on some macOS setups)

To add a new backend:
  1. Subclass FaceEmbedder.
  2. Implement detect_and_extract_embedding().
  3. Implement the `backend_name` property.
  4. Pass an instance to build_database() or recognize().
"""

import logging
from abc import ABC, abstractmethod
from pathlib import Path

import cv2
import numpy as np

from config import DEFAULT_BACKEND, DEFAULT_DETECTOR, DEFAULT_INSIGHTFACE_MODEL, DEFAULT_MODEL

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Abstract interface
# ---------------------------------------------------------------------------


class FaceEmbedder(ABC):
    """Contract that every face embedding backend must satisfy.

    The single public method, ``detect_and_extract_embedding``, encapsulates
    the full sub-pipeline:

        load image → detect face(s) → validate single face → crop/align → embed

    All error conditions are communicated via typed exceptions so callers can
    handle them without knowing anything about the underlying library.
    """

    @property
    @abstractmethod
    def backend_name(self) -> str:
        """Human-readable identifier used in log messages (e.g. 'DeepFace/Facenet').

        Returns:
            A short string that uniquely identifies this backend configuration.
        """

    @abstractmethod
    def detect_and_extract_embedding(self, image_path: str | Path) -> list[float]:
        """Detect exactly one face in an image and return its embedding vector.

        This is the only method the rest of the pipeline calls.

        Args:
            image_path: Absolute or relative path to the source image.

        Returns:
            A plain Python list of floats representing the face embedding.
            The dimensionality depends on the backend (e.g. 128 for Facenet,
            512 for Facenet512 / ArcFace).

        Raises:
            FileNotFoundError: The image file does not exist on disk.
            ValueError: The image cannot be decoded, or zero / more-than-one
                        face was detected.
            RuntimeError: The embedding model raised an unexpected error.
        """


# ---------------------------------------------------------------------------
# DeepFace implementation
# ---------------------------------------------------------------------------


class DeepFaceEmbedder(FaceEmbedder):
    """FaceEmbedder backed by the DeepFace library.

    DeepFace handles detection, alignment, and embedding in one call.
    This class wraps it so the rest of the codebase stays library-agnostic.

    Args:
        model_name: DeepFace model name.
            Supported: "Facenet" (128-d), "Facenet512" (512-d),
            "ArcFace" (512-d), "VGG-Face" (4096-d), "SFace" (128-d).
        detector_backend: DeepFace detector backend.
            Supported: "retinaface", "mtcnn", "opencv", "ssd", "mediapipe".
    """

    def __init__(
        self,
        model_name: str = DEFAULT_MODEL,
        detector_backend: str = DEFAULT_DETECTOR,
    ) -> None:
        self._model_name = model_name
        self._detector_backend = detector_backend
        logger.debug(
            "DeepFaceEmbedder initialised — model=%s, detector=%s",
            model_name,
            detector_backend,
        )

    @property
    def backend_name(self) -> str:
        return f"DeepFace/{self._model_name} (detector={self._detector_backend})"

    def detect_and_extract_embedding(self, image_path: str | Path) -> list[float]:
        """Full pipeline: load → detect exactly one face → crop/align → embed.

        Args:
            image_path: Path to the source image.

        Returns:
            Embedding vector as a list of floats.

        Raises:
            FileNotFoundError: Image file not found.
            ValueError: Image unreadable, or zero/multiple faces detected.
            RuntimeError: Embedding model error.
        """
        # DeepFace is imported here so the rest of the codebase stays
        # importable even when DeepFace is not installed.
        from deepface import DeepFace  # noqa: PLC0415

        path = Path(image_path)
        logger.info("Processing image: %s", path)

        if not path.exists():
            raise FileNotFoundError(f"Image not found: {path}")

        img = cv2.imread(str(path))
        if img is None:
            raise ValueError(f"Could not decode image (corrupt or unsupported format): {path}")

        # Detect, align, and crop faces in one DeepFace call.
        try:
            faces = DeepFace.extract_faces(
                img_path=img,
                detector_backend=self._detector_backend,
                enforce_detection=True,
                align=True,
            )
        except ValueError:
            faces = []  # DeepFace raises ValueError when no face is found

        if len(faces) == 0:
            raise ValueError(f"No face detected in: {path}")
        if len(faces) > 1:
            raise ValueError(f"Expected 1 face, found {len(faces)} in: {path}")

        # DeepFace returns float32 in [0, 1]; convert to uint8 for represent().
        face_uint8 = (faces[0]["face"] * 255).astype(np.uint8)

        try:
            result = DeepFace.represent(
                img_path=face_uint8,
                model_name=self._model_name,
                enforce_detection=False,  # already cropped
                detector_backend="skip",  # skip redundant re-detection
            )
            embedding: list[float] = result[0]["embedding"]
        except Exception as exc:
            raise RuntimeError(f"Embedding extraction failed: {exc}") from exc

        logger.info("Embedding ready — %s  dim=%d", path.name, len(embedding))
        return embedding


# ---------------------------------------------------------------------------
# face_recognition (dlib) implementation — default for macOS
# ---------------------------------------------------------------------------


class FaceRecognitionEmbedder(FaceEmbedder):
    """FaceEmbedder backed by the face_recognition library (dlib).

    Produces 128-d L2-normalised embeddings. Does not use TensorFlow,
    so it works reliably on macOS including Apple Silicon.

    Args:
        model: ``"hog"`` (fast, CPU) or ``"cnn"`` (slower, more accurate).
    """

    def __init__(self, model: str = "hog") -> None:
        self._model = model
        logger.debug("FaceRecognitionEmbedder initialised — model=%s", model)

    @property
    def backend_name(self) -> str:
        return f"face_recognition/dlib (model={self._model})"

    def detect_and_extract_embedding(self, image_path: str | Path) -> list[float]:
        """Full pipeline: load → detect exactly one face → embed.

        Args:
            image_path: Path to the source image.

        Returns:
            128-d embedding vector as a list of floats.

        Raises:
            FileNotFoundError: Image file not found.
            ValueError: Image unreadable, or zero/multiple faces detected.
            RuntimeError: Embedding extraction failed.
        """
        import face_recognition  # noqa: PLC0415
        from PIL import Image, ImageOps  # noqa: PLC0415

        path = Path(image_path)
        logger.info("Processing image: %s", path)

        if not path.exists():
            raise FileNotFoundError(f"Image not found: {path}")

        # Load via PIL and apply EXIF orientation (iPhone photos are often
        # stored rotated — face_recognition does not do this automatically).
        try:
            pil_img = Image.open(str(path))
            pil_img = ImageOps.exif_transpose(pil_img)
            image = np.array(pil_img.convert("RGB"))
        except Exception as exc:
            raise ValueError(f"Could not decode image: {path}") from exc

        locations = face_recognition.face_locations(image, model=self._model)

        if len(locations) == 0:
            raise ValueError(f"No face detected in: {path}")
        if len(locations) > 1:
            raise ValueError(f"Expected 1 face, found {len(locations)} in: {path}")

        try:
            encodings = face_recognition.face_encodings(
                image, known_face_locations=locations
            )
            embedding: list[float] = encodings[0].tolist()
        except Exception as exc:
            raise RuntimeError(f"Embedding extraction failed: {exc}") from exc

        logger.info("Embedding ready — %s  dim=%d", path.name, len(embedding))
        return embedding


# ---------------------------------------------------------------------------
# InsightFace (ArcFace ONNX) implementation — default
# ---------------------------------------------------------------------------


class InsightFaceEmbedder(FaceEmbedder):
    """FaceEmbedder backed by InsightFace ArcFace via ONNX Runtime.

    Produces 512-d L2-normalised ArcFace embeddings. Uses onnxruntime
    under the hood — no TensorFlow required. Works on macOS/Apple Silicon.

    First run downloads the model pack (~50 MB for buffalo_s) to
    ~/.insightface/models/.

    Args:
        model_name: InsightFace model pack.
            "buffalo_s" — lightweight, fast (default).
            "buffalo_l" — more accurate, larger (~340 MB).
    """

    def __init__(self, model_name: str = DEFAULT_INSIGHTFACE_MODEL) -> None:
        self._model_name = model_name
        self._app = None  # lazy-initialised on first call
        logger.debug("InsightFaceEmbedder initialised — model=%s", model_name)

    @property
    def backend_name(self) -> str:
        return f"InsightFace/ArcFace (model={self._model_name})"

    def _get_app(self):
        """Lazy-load the InsightFace app so import cost is paid once."""
        if self._app is None:
            from insightface.app import FaceAnalysis  # noqa: PLC0415

            self._app = FaceAnalysis(
                name=self._model_name,
                providers=["CPUExecutionProvider"],
            )
            self._app.prepare(ctx_id=0, det_size=(640, 640))
            logger.debug("InsightFace app ready — model=%s", self._model_name)
        return self._app

    def detect_and_extract_embedding(self, image_path: str | Path) -> list[float]:
        """Full pipeline: load → apply EXIF rotation → detect one face → embed.

        Args:
            image_path: Path to the source image.

        Returns:
            512-d ArcFace embedding as a list of floats.

        Raises:
            FileNotFoundError: Image file not found.
            ValueError: Image unreadable, or zero/multiple faces detected.
            RuntimeError: Embedding extraction failed.
        """
        from PIL import Image, ImageOps  # noqa: PLC0415

        path = Path(image_path)
        logger.info("Processing image: %s", path)

        if not path.exists():
            raise FileNotFoundError(f"Image not found: {path}")

        # Apply EXIF orientation (iPhone photos are often stored rotated).
        # InsightFace expects BGR, so convert RGB → BGR after transpose.
        try:
            pil_img = Image.open(str(path))
            pil_img = ImageOps.exif_transpose(pil_img)
            img_bgr = cv2.cvtColor(np.array(pil_img.convert("RGB")), cv2.COLOR_RGB2BGR)
        except Exception as exc:
            raise ValueError(f"Could not decode image: {path}") from exc

        faces = self._get_app().get(img_bgr)

        if len(faces) == 0:
            raise ValueError(f"No face detected in: {path}")
        if len(faces) > 1:
            raise ValueError(f"Expected 1 face, found {len(faces)} in: {path}")

        try:
            embedding: list[float] = faces[0].embedding.tolist()
        except Exception as exc:
            raise RuntimeError(f"Embedding extraction failed: {exc}") from exc

        logger.info("Embedding ready — %s  dim=%d", path.name, len(embedding))
        return embedding


def get_default_embedder() -> FaceEmbedder:
    """Return the default embedder based on DEFAULT_BACKEND in config."""
    if DEFAULT_BACKEND == "insightface":
        return InsightFaceEmbedder()
    if DEFAULT_BACKEND == "face_recognition":
        return FaceRecognitionEmbedder()
    return DeepFaceEmbedder()
