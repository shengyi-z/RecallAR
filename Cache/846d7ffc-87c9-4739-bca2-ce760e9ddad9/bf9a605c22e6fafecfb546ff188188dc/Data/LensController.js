// Main Controller
//
// Made with Easy Lens

//@input Component.ScriptComponent canvas_api


try {

// House Object Detection Highlight Overlay
// Requirements implemented:
// - Reads normalized bbox + confidence from a global/object detection provider (see getDetectionResult placeholder)
// - Thresholded highlight with pulsing outline and label
// - Exponential smoothing on bbox
// - Per-frame redraw, cleared each frame
// - Script params: confidenceThreshold, baseColor, pulseSpeed, baseThickness, smoothingFactor

// -----------------------------
// Script Parameters (editable in Inspector)
// -----------------------------
script.confidenceThreshold = script.confidenceThreshold || 0.6;   // 0..1
script.baseColor = script.baseColor || new vec4(255, 230, 0, 255); // RGBA 0..255, bright yellow
script.pulseSpeed = script.pulseSpeed || 2.2;                      // Hz
script.baseThickness = script.baseThickness || 3.0;                // pixels
script.smoothingFactor = script.smoothingFactor || 0.2;            // 0..1 (higher = snappier)

// -----------------------------
// Internal State
// -----------------------------
var canvas = null;
var smoothedBBox = null; // {x,y,w,h} in 0..1 normalized coords
var isActive = false;
var timeAccum = 0;

// -----------------------------
// Utility: Lerp scalar
// -----------------------------
function lerp(a, b, t) {
    return a + (b - a) * t;
}

// -----------------------------
// Utility: Smooth bbox with exponential smoothing in normalized space
// -----------------------------
function smoothBBox(prev, next, alpha) {
    if (!prev) {
        return { x: next.x, y: next.y, w: next.w, h: next.h };
    }
    return {
        x: lerp(prev.x, next.x, alpha),
        y: lerp(prev.y, next.y, alpha),
        w: lerp(prev.w, next.w, alpha),
        h: lerp(prev.h, next.h, alpha)
    };
}

// -----------------------------
// Placeholder: Fetch detection result from your existing object detection
// IMPORTANT: Replace this with your actual integration.
// Expected return:
//   { bbox: {x,y,w,h}, confidence } in normalized 0..1 screen space
// If no detection: return null
// -----------------------------
function getDetectionResult() {
    // NOTE: Integrate with your existing detection provider here.
    // For example, if your detection controller exposes:
    //   global.houseDetection.getLatest()
    // which returns {bbox:{x,y,w,h}, confidence}
    // return global.houseDetection ? global.houseDetection.getLatest() : null;
    return null;
}

// -----------------------------
// Drawing helpers
// -----------------------------
function clearCanvas() {
    // Clear to transparent; choose a background close to drawn color to minimize fringes
    canvas.background(0, 0, 0, 0);
}

function drawPulsingBoxAndLabel(bboxNorm, pulse01) {
    // bboxNorm is normalized 0..1; convert to pixel space using canvas size
    var wPx = canvas.getWidth();
    var hPx = canvas.getHeight();

    // Clamp bbox to [0,1] to stay on-screen
    var xN = Math.max(0, Math.min(1, bboxNorm.x));
    var yN = Math.max(0, Math.min(1, bboxNorm.y));
    var rN = Math.max(0, Math.min(1, xN + bboxNorm.w));
    var bN = Math.max(0, Math.min(1, yN + bboxNorm.h));

    var x = Math.round(xN * wPx);
    var y = Math.round(yN * hPx);
    var w = Math.max(1, Math.round((rN - xN) * wPx));
    var h = Math.max(1, Math.round((bN - yN) * hPx));

    // Pulsing thickness and alpha
    var pulseThickness = script.baseThickness + pulse01 * (script.baseThickness * 0.8);
    var alpha = Math.max(120, Math.min(255, Math.round(160 + pulse01 * 80)));

    // Outline glow: draw multiple strokes with additive blend and decreasing alpha
    canvas.noFill();
    canvas.blendMode('add');
    var glowLayers = 3;
    for (var i = glowLayers - 1; i >= 0; i--) {
        var t = pulseThickness + i * 1.0;
        var layerAlpha = Math.round(alpha * (0.3 + 0.25 * (glowLayers - 1 - i)));
        canvas.stroke(script.baseColor.r, script.baseColor.g, script.baseColor.b, layerAlpha);
        canvas.strokeWeight(t);
        canvas.rect(x, y, w, h, Math.min(w, h) * 0.04);
    }

    // Solid outline on top
    canvas.blendMode('normal');
    canvas.stroke(script.baseColor.r, script.baseColor.g, script.baseColor.b, alpha);
    canvas.strokeWeight(pulseThickness);
    canvas.rect(x, y, w, h, Math.min(w, h) * 0.06);

    // Corner brackets (optional flair)
    var cornerLen = Math.round(Math.min(w, h) * 0.14);
    var cornerThick = Math.max(2, Math.round(pulseThickness * 0.8));
    canvas.strokeWeight(cornerThick);

    // Top-left
    canvas.line(x, y, x + cornerLen, y);
    canvas.line(x, y, x, y + cornerLen);
    // Top-right
    canvas.line(x + w, y, x + w - cornerLen, y);
    canvas.line(x + w, y, x + w, y + cornerLen);
    // Bottom-left
    canvas.line(x, y + h, x + cornerLen, y + h);
    canvas.line(x, y + h, x, y + h - cornerLen);
    // Bottom-right
    canvas.line(x + w, y + h, x + w - cornerLen, y + h);
    canvas.line(x + w, y + h, x + w, y + h - cornerLen);

    // Label "HOUSE" near top-left with small background
    var labelPaddingX = Math.round(8 + 6 * pulse01);
    var labelPaddingY = Math.round(4 + 3 * pulse01);
    var labelTextSize = Math.round(Math.max(14, Math.min(28, Math.min(wPx, hPx) * 0.025)));
    var labelX = x;
    var labelY = Math.max(0, y - (labelTextSize + labelPaddingY * 2 + 6));

    // Background box for readability
    canvas.noStroke();
    canvas.fill(0, 0, 0, Math.round(130 + pulse01 * 50));
    var labelW = Math.round(labelTextSize * 3.6); // fits "HOUSE"
    var labelH = labelTextSize + labelPaddingY * 2;
    canvas.rect(labelX, labelY, labelW, labelH, Math.round(labelH * 0.35));

    // Label text
    canvas.fill(255, 255, 255, 230);
    canvas.textSize(labelTextSize);
    canvas.textAlign('left', 'middle');
    canvas.text("HOUSE", labelX + labelPaddingX, labelY + Math.round(labelH * 0.5));
}

// -----------------------------
// Lifecycle
// -----------------------------
script.createEvent("OnStartEvent").bind(function() {
    // Ensure block is enabled for rendering
    script.canvas_api.enabled = true;

    // Create full-screen onscreen canvas
    canvas = script.canvas_api.createOnScreenCanvas();

    // Start per-frame update
    script.createEvent("UpdateEvent").bind(function() {
        var dt = getDeltaTime() || 0;
        timeAccum += dt;

        // Query detection
        var detection = getDetectionResult();
        var above = false;
        if (detection && detection.bbox && typeof detection.confidence === "number") {
            above = detection.confidence >= script.confidenceThreshold;
        }

        if (above) {
            // Smooth bbox
            smoothedBBox = smoothBBox(smoothedBBox, detection.bbox, script.smoothingFactor);
            isActive = true;
        } else {
            // Decay activity quickly to hide highlight when lost
            isActive = false;
            smoothedBBox = null;
        }

        // Draw overlay
        clearCanvas();

        if (isActive && smoothedBBox) {
            // Pulse in 0..1 range using sin
            var pulse01 = 0.5 + 0.5 * Math.sin(timeAccum * Math.PI * 2 * script.pulseSpeed);
            drawPulsingBoxAndLabel(smoothedBBox, pulse01);
        }
    });
});

} catch(e) {
  print("error in controller");
  print(e);
}
