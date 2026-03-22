// Main Controller
//
// Made with Easy Lens

//@input Component.ScriptComponent face_shadow_canvas
//@input Component.ScriptComponent face_landmarks


try {

// Face-tracked black shadow overlay using Canvas API and FaceLandmarks

var canvas;
var faceSeenRecently = false;

// Last-known normalized (0..1) positions
var lm = {
    leftEye: null,
    rightEye: null,
    nose: null,
    mouth: null,
    forehead: null,
    head: null
};

// Helper: track recent updates
var inactivityTimer = 0.0; // seconds since last landmark update
function markFaceActivity() {
    faceSeenRecently = true;
    inactivityTimer = 0.0;
}

// Init on start to get correct device resolution
script.createEvent("OnStartEvent").bind(function() {
    if (!script.face_shadow_canvas || script.face_shadow_canvas.enabled === false) {
        return;
    }

    // Fullscreen, onscreen canvas for the shadow overlay
    canvas = script.face_shadow_canvas.createOnScreenCanvas();
    canvas.angleMode('degrees');

    // Subscribe to FaceLandmarks 2D events
    if (script.face_landmarks && script.face_landmarks.enabled !== false) {
        script.face_landmarks.onLeftEyePosition2DUpdated.add(function(position2d) {
            lm.leftEye = position2d;
            markFaceActivity();
        });
        script.face_landmarks.onRightEyePosition2DUpdated.add(function(position2d) {
            lm.rightEye = position2d;
            markFaceActivity();
        });
        script.face_landmarks.onNosePosition2DUpdated.add(function(position2d) {
            lm.nose = position2d;
            markFaceActivity();
        });
        script.face_landmarks.onMouthPosition2DUpdated.add(function(position2d) {
            lm.mouth = position2d;
            markFaceActivity();
        });
        script.face_landmarks.onForeheadPosition2DUpdated.add(function(position2d) {
            lm.forehead = position2d;
            markFaceActivity();
        });
        script.face_landmarks.onHeadCenterPosition2DUpdated.add(function(position2d) {
            lm.head = position2d;
            markFaceActivity();
        });
    }

    // Per-frame drawing
    var updateEventRef = script.createEvent("UpdateEvent");
    updateEventRef.bind(updateFrame);
});

function toPixels(p, w, h) {
    return new vec2(MathUtils.clamp(p.x, 0, 1) * w, MathUtils.clamp(p.y, 0, 1) * h);
}

function drawSoftEllipse(cx, cy, rx, ry, angleDeg, layers, alphaTop) {
    // Draw multiple concentric ellipses with decreasing alpha to fake softness
    var baseAlpha = alphaTop; // 0-255
    var w = canvas.getWidth(); // not used but kept to ensure calls stay valid each frame
    var h = canvas.getHeight();

    canvas.push();
    canvas.translate(cx, cy);
    canvas.rotate(angleDeg);

    var maxGrow = Math.max(rx, ry) * 0.35; // feather radius
    for (var i = 0; i < layers; i++) {
        var t = i / Math.max(1, layers - 1);
        var grow = t * maxGrow;
        var a = Math.round(baseAlpha * (1.0 - t));
        canvas.noStroke();
        canvas.fill(0, 0, 0, a);
        canvas.ellipse(0, 0, (rx + grow) * 2, (ry + grow) * 2);
    }

    canvas.pop();
}

function drawNoirBand(center, widthPx, heightPx, angleDeg, alpha) {
    canvas.push();
    canvas.translate(center.x, center.y);
    canvas.rotate(angleDeg);
    canvas.noStroke();
    canvas.fill(0, 0, 0, alpha);
    canvas.rect(-widthPx * 0.5, -heightPx * 0.5, widthPx, heightPx);
    canvas.pop();
}

function updateFrame() {
    if (!canvas) { return; }

    // Time keeping to fade tracking state (for any future interactions)
    var dt = getDeltaTime();
    inactivityTimer += dt;
    if (inactivityTimer > 0.25) {
        faceSeenRecently = false;
    }

    // Clear to transparent black because we render black shapes on top
    canvas.background(0, 0, 0, 0);

    var w = canvas.getWidth();
    var h = canvas.getHeight();

    if (!lm.leftEye || !lm.rightEye || !lm.head) {
        return; // Need core landmarks for stable placement
    }

    // Convert to pixels
    var L = toPixels(lm.leftEye, w, h);
    var R = toPixels(lm.rightEye, w, h);
    var H = toPixels(lm.head, w, h);
    var F = lm.forehead ? toPixels(lm.forehead, w, h) : new vec2((L.x + R.x) * 0.5, Math.min(L.y, R.y) - Math.abs(R.x - L.x) * 0.35);

    // Eye vector for rotation and scale
    var eyeVec = new vec2(R.x - L.x, R.y - L.y);
    var eyeDist = Math.max(1, eyeVec.length); // pixels
    var angleDeg = Math.atan2(eyeVec.y, eyeVec.x) * MathUtils.RadToDeg;

    // Primary top shadow: centered between eyes and forehead
    var eyeMid = new vec2((L.x + R.x) * 0.5, (L.y + R.y) * 0.5);
    var topCenter = new vec2(MathUtils.lerp(eyeMid.x, F.x, 0.6), MathUtils.lerp(eyeMid.y, F.y, 0.6));

    var rxTop = eyeDist * 1.2;   // horizontal radius
    var ryTop = eyeDist * 0.8;   // vertical radius

    drawSoftEllipse(topCenter.x, topCenter.y, rxTop, ryTop, angleDeg, 6, 110);

    // Secondary vignette over the face
    var rxFace = eyeDist * 1.8;
    var ryFace = eyeDist * 2.3;
    drawSoftEllipse(H.x, H.y, rxFace, ryFace, angleDeg, 5, 60);

    // Optional noir eye band across the eyes
    var bandW = eyeDist * 2.6;
    var bandH = Math.max(10, eyeDist * 0.35);
    drawNoirBand(eyeMid, bandW, bandH, angleDeg, 85);
}

} catch(e) {
  print("error in controller");
  print(e);
}
