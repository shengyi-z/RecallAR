// ObjectDetectionController.js
// Rewritten: shows face recognition name above each detection box
//
// @input Component.Text counter
// @input SceneObject objectToCopy
// @input float smoothing = 0.5 {"widget":"slider", "min":0.0, "max":0.95, "step":0.05}
// @input Component.MLComponent faceRecognizer {"hint":"w600k_mbf ML Component"}

// @input bool advanced = false
// @input Component.ScriptComponent mlController    {"showIf":"advanced"}
// @input Component.ScriptComponent hintController  {"showIf":"advanced"}
// @ui {"widget":"separator","showIf":"advanced"}
// @input float matchingThreshold = 0.5  {"showIf":"advanced"}
// @input int   lostFramesThreshold = 0  {"showIf":"advanced"}

// ─── Known people — paste embeddings here after registration ───
var knownPeople = [
  { name: "Your Son · David · 40 yrs", embedding: null },
  { name: "Your Daughter · Sarah",     embedding: null }
];
var RECOG_THRESHOLD = 0.5;

// ─── Registration helpers ─────────────────────────────────────
// Set registerMode = true in Inspector, tap to capture embedding
// @input bool   registerMode = false
// @input string registerName = "David"

// ─── Internal state ───────────────────────────────────────────
var defaultAnchors = Rect.create(-100, -100, 0, 0);
var detectionBoxes;
var updateEvent = script.createEvent("UpdateEvent");

if (checkInputs()) {
    script.objectToCopy.enabled = false;
    updateEvent.bind(waitOnInitialized);
}

function waitOnInitialized() {
    if (!script.mlController.getDetections) return;
    var maxCount = script.mlController.getMaxDetectionsCount();
    detectionBoxes = instantiateObjects(script.objectToCopy, maxCount);
    updateEvent.bind(onUpdate);
}

// ─── Main update ──────────────────────────────────────────────
function onUpdate() {
    var detections = script.mlController.getDetections();
    updateDetectionBoxes(detections.boxes);

    if (script.hintController && script.hintController.showHint) {
        script.hintController.showHint(detections.boxes.length === 0);
    }
    if (script.counter) {
        script.counter.text = detections.boxes.length.toString();
    }

    // Run face recognition on current frame
    runFaceRecognition();
}

// ─── Face recognition ─────────────────────────────────────────
function runFaceRecognition() {
    if (!script.faceRecognizer) return;

    try {
        var output = script.faceRecognizer.getOutput("516");
        if (!output || !output.data) {
            print("No output yet — is texture set on w600k_mbf?");
            return;
        }
        var embedding = output.data;
        if (embedding.length < 512) {
            print("Output too short: " + embedding.length);
            return;
        }
        if (!output || !output.data || output.data.length < 512) return;

        var embedding = output.data;

        // Registration mode: tap to save embedding
        if (script.registerMode) return;

        // Find best match
        var bestName  = "Unknown";
        var bestScore = -1;

        for (var i = 0; i < knownPeople.length; i++) {
            if (!knownPeople[i].embedding) continue;
            var score = cosineSim(embedding, knownPeople[i].embedding);
            if (score > bestScore) {
                bestScore = score;
                bestName  = (score > RECOG_THRESHOLD)
                    ? knownPeople[i].name
                    : "Unknown";
            }
        }

        // Push name to all active detection box labels
        for (var b = 0; b < detectionBoxes.length; b++) {
            if (!detectionBoxes[b].isTracking) continue;
            var labelComp = getBoxLabel(detectionBoxes[b].sceneObject);
            if (labelComp) {
                labelComp.text = bestName
                    + (bestScore > 0
                        ? " (" + (bestScore * 100).toFixed(0) + "%)"
                        : "");
            }
        }

    } catch(e) {
        print("FaceRecog error: " + e);
    }
}

// Find the Text component inside a detection box SceneObject
function getBoxLabel(obj) {
    if (!obj) return null;
    var text = obj.getComponent("Component.Text");
    if (text) return text;
    // Search children
    for (var i = 0; i < obj.getChildrenCount(); i++) {
        var t = obj.getChild(i).getComponent("Component.Text");
        if (t) return t;
    }
    return null;
}

// ─── Cosine similarity ────────────────────────────────────────
function cosineSim(a, b) {
    var dot = 0, na = 0, nb = 0;
    for (var i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        na  += a[i] * a[i];
        nb  += b[i] * b[i];
    }
    return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-10);
}

// ─── Tap to register embedding ────────────────────────────────
script.createEvent("TapEvent").bind(function() {
    if (!script.registerMode || !script.faceRecognizer) return;

    var output = script.faceRecognizer.getOutput(0);
    if (!output || !output.data) {
        print("REGISTER ERROR: No output data");
        return;
    }

    var emb = [];
    for (var i = 0; i < output.data.length; i++) {
        emb.push(output.data[i]);
    }

    print("=== EMBEDDING FOR: " + script.registerName + " ===");
    print(JSON.stringify(emb));
    print("=== COPY the line above, paste into knownPeople embedding ===");
});

// ─── Detection box management (unchanged logic) ───────────────
function instantiateObjects(origin, count) {
    var parent = script.objectToCopy.getParent();
    var screenRegion = parent.getComponent("Component.ScreenRegionComponent");
    if (screenRegion == null) {
        screenRegion = parent.createComponent("Component.ScreenRegionComponent");
    }
    screenRegion.region = ScreenRegionType.FullFrame;

    var boxes = [];
    for (var i = 0; i < count; i++) {
        var sceneObject   = parent.copyWholeHierarchy(origin);
        var screenTransform = sceneObject.getComponent("Component.ScreenTransform");
        screenTransform.anchors = defaultAnchors;
        boxes.push({
            sceneObject:     sceneObject,
            screenTransform: screenTransform,
            isTracking:      false,
            updated:         false,
            lost_time:       0
        });
    }
    return boxes;
}

function updateDetectionBoxes(boxes) {
    var active_tracklets = Array(detectionBoxes.length);
    var num_active = 0, num_new = 0, first_new = 0;
    var new_tracklets = Array(detectionBoxes.length);

    for (var j = 0; j < detectionBoxes.length; j++) {
        if (detectionBoxes[j].isTracking) {
            active_tracklets[num_active++] = j;
        }
        detectionBoxes[j].updated = false;
    }

    for (var i = 0; i < boxes.length; i++) {
        var temp = Rect.create(0,0,0,0);
        temp.left   = boxes[i][0];
        temp.right  = boxes[i][0] + boxes[i][2];
        temp.bottom = boxes[i][1];
        temp.top    = boxes[i][1] + boxes[i][3];

        var best_tracklet_idx = -1, best_iou = 0;
        for (var k = 0; k < num_active; k++) {
            if (active_tracklets[k] === -1) continue;
            var iou = computeMatchingScore(temp, detectionBoxes[active_tracklets[k]].screenTransform.anchors);
            if (iou > best_iou) { best_iou = iou; best_tracklet_idx = k; }
        }

        if (best_tracklet_idx === -1 || best_iou < script.matchingThreshold) {
            new_tracklets[num_new++] = temp;
        } else {
            var idx = active_tracklets[best_tracklet_idx];
            detectionBoxes[idx].screenTransform.anchors =
                lerpRect(detectionBoxes[idx].screenTransform.anchors, temp, 1.0 - script.smoothing);
            detectionBoxes[idx].isTracking = true;
            detectionBoxes[idx].updated    = true;
            detectionBoxes[idx].lost_time  = 0;
            active_tracklets[best_tracklet_idx] = -1;
        }
    }

    for (var l = 0; l < detectionBoxes.length; l++) {
        if (!detectionBoxes[l].updated) {
            if (detectionBoxes[l].isTracking && detectionBoxes[l].lost_time < script.lostFramesThreshold) {
                detectionBoxes[l].lost_time++;
                continue;
            }
            if (num_new > 0) {
                num_new--;
                detectionBoxes[l].screenTransform.anchors = new_tracklets[first_new++];
                detectionBoxes[l].isTracking = true;
                detectionBoxes[l].sceneObject.enabled = true;
            } else {
                detectionBoxes[l].screenTransform.anchors = defaultAnchors;
                detectionBoxes[l].sceneObject.enabled     = false;
                detectionBoxes[l].isTracking = false;
            }
            detectionBoxes[l].lost_time = 0;
        }
    }
}

function computeMatchingScore(box1, box2) {
    var xx1 = Math.max(box1.left,   box2.left);
    var yy1 = Math.min(box1.top,    box2.top);
    var xx2 = Math.min(box1.right,  box2.right);
    var yy2 = Math.max(box1.bottom, box2.bottom);
    var area1 = (box1.right - box1.left) * (box1.top - box1.bottom);
    var area2 = (box2.right - box2.left) * (box2.top - box2.bottom);
    var inter = Math.max(0, xx2 - xx1) * Math.max(0, yy1 - yy2);
    return inter / (area1 + area2 - inter);
}

function lerpRect(a, b, t) {
    a.left   += (b.left   - a.left)   * t;
    a.right  += (b.right  - a.right)  * t;
    a.bottom += (b.bottom - a.bottom) * t;
    a.top    += (b.top    - a.top)    * t;
    return a;
}

function checkInputs() {
    if (!script.objectToCopy) {
        print("Error: objectToCopy not set"); return false;
    }
    if (!script.objectToCopy.getComponent("Component.ScreenTransform")) {
        print("Error: objectToCopy needs ScreenTransform"); return false;
    }
    if (!script.objectToCopy.getParent() ||
        !script.objectToCopy.getParent().getComponent("Component.ScreenTransform")) {
        print("Error: objectToCopy parent needs ScreenTransform"); return false;
    }
    if (!script.objectToCopy.getComponent("Component.ScreenTransform").isInScreenHierarchy()) {
        print("Error: objectToCopy must be child of Orthographic Camera"); return false;
    }
    if (!script.mlController) {
        print("Error: mlController not set"); return false;
    }
    if (!script.faceRecognizer) {
        print("Warning: faceRecognizer not set — name labels won't appear");
    }
    return true;
}