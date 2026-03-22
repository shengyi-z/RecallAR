# CareXR-RecallAR

CareXR-RecallAR is a two-part prototype project built to support people living with Alzheimer's disease through AR-assisted memory support.

## Project Overview

This repository combines:

1. PathGuide_CareXR: An AR path-memorization experience that helps users remember and follow important routes.
2. RecallAR: A face-recognition pipeline that identifies important people (family or caregivers) from a pre-authorized set.

Together, these modules aim to reduce confusion, improve confidence, and support safer daily routines.

## Repository Structure

```
CareXR-RecallAR/
├── PathGuide_CareXR/        # AR path guidance and memorization project (Lens Studio)
├── RecallAR/                # AR experience project files
├── Face_recognition/        # Python face-recognition pipeline used by RecallAR
└── README.md
```

## Part 1: PathGuide (Path Memorization)

PathGuide is the navigation-support module. It is designed for indoor/outdoor memory assistance by presenting visual AR cues so users can learn or recall a route.

### Main goal

- Help users memorize important paths (for example: room-to-room, home-to-garden, or key daily locations).

### Folder

- `PathGuide_CareXR/`

### Notes

- This module is implemented as a Lens Studio project (`.esproj`) with AR assets, materials, scripts, and prefabs.
- Open the project in Lens Studio to run, test, and publish.

## Part 2: RecallAR (Face Recognition)

RecallAR is the familiar-person recognition module. It detects and recognizes known people from a small pre-authorized database, then can provide identity context in AR.

### Main goal

- Help users identify important people, such as family members or caregivers.

### Folders

- `RecallAR/` for Lens Studio experience integration.
- `Face_recognition/` for the Python training/inference pipeline.

## Face Recognition Quick Start

From `Face_recognition/`:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Build embeddings database:

```bash
python src/build_embeddings.py
```

Run recognition on a test image:

```bash
python src/recognize_face.py --image test_images/test1.jpg
```

Optional threshold evaluation:

```bash
python src/evaluate_threshold.py
```

## Intended Use and Safety

- This project is a research/hackathon prototype, not a medical device.
- The recognition workflow is designed to prefer `Unknown` when uncertain, to reduce harmful false identifications.
- Use only with informed consent and appropriate privacy handling for face images.

## Suggested Workflow

1. Prepare familiar-person photos in `Face_recognition/data/`.
2. Build and validate embeddings/thresholds using Python scripts.
3. Export or integrate outputs into the AR Lens experience.
4. Test PathGuide and RecallAR flows with caregivers and iterate.

