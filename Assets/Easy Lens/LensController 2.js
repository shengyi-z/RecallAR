// Main Controller
//
// Made with Easy Lens

//@input Component.ScriptComponent canvas_debug
//@input Component.ScriptComponent face_landmarks
//@input Component.ScriptComponent status_text


try {

// Diagnostic overlay with live FaceLandmarks dots to verify alignment

var canvas;
var lastUpdateTime = 0.0; // seconds since start
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

// Utility to note activity time
function markFaceActivity() {
    // We don't have a global time API; accumulate using UpdateEvent delta
    faceSeenRecently = true;
    inactivityTimer = 0.0;
}

var inactivityTimer = 0.0; // seconds since last landmark update
var updateEventRef;

// Init on start to get correct device resolution
script.createEvent("OnStartEvent").bind(function() {
    if (!script.canvas_debug || script.canvas_debug.enabled === false) {
        return;
    }

    // Fullscreen, onscreen canvas
    canvas = script.canvas_debug.createOnScreenCanvas();
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

    // Create and keep a reference to UpdateEvent so we can track delta time
    updateEventRef = script.createEvent("UpdateEvent");
    updateEventRef.bind(updateFrame);
});

function drawDot(x, y, sizePx, r, g, b, label) {
    canvas.noStroke();
    canvas.fill(r, g, b, 230);
    canvas.circle(x, y, sizePx);
    if (label) {
        canvas.fill(255);
        canvas.textAlign('left', 'middle');
        canvas.textSize(Math.round(sizePx * 0.7));
        canvas.text(label, x + Math.max(6, Math.round(sizePx * 0.35)), y);
    }
}

function updateStatusText(isTracking) {
    if (!script.status_text) { return; }
    var hint = "If your blur is offset, compare it to these dots.";
    var state = isTracking ? "Face tracking: ON" : "Face tracking: OFF";
    // Keep content short; layout is defined in the block. We only change text dynamically.
    script.status_text.text = state + "\n" + hint;
    // Since we change text via code and expect anchored UI, keep it in safe region
    if (script.status_text.forceSafeRegion) {
        script.status_text.forceSafeRegion(true);
    }
}

function updateFrame() {
    if (!canvas) { return; }

    // Time keeping
    var dt = getDeltaTime();
    inactivityTimer += dt;
    if (inactivityTimer > 0.25) {
        faceSeenRecently = false;
    }

    // Clear to transparent while matching overlay color family (white strokes)
    canvas.background(255, 255, 255, 0);

    var w = canvas.getWidth();
    var h = canvas.getHeight();
    var cx = w * 0.5;
    var cy = h * 0.5;

    // Frame and guides
    canvas.noFill();
    canvas.stroke(0, 255, 0, 200);
    canvas.strokeWeight(Math.max(2, Math.round(Math.min(w, h) * 0.003)));
    canvas.rect(0, 0, w, h);

    var arm = Math.round(Math.min(w, h) * 0.05);
    var gap = Math.round(Math.min(w, h) * 0.01);

    canvas.stroke(255, 255, 255, 220);
    canvas.line(cx - arm, cy, cx - gap, cy);
    canvas.line(cx + gap, cy, cx + arm, cy);

    canvas.line(cx, cy - arm, cx, cy - gap);
    canvas.line(cx, cy + gap, cx, cy + arm);

    var tick = Math.round(Math.min(w, h) * 0.03);
    canvas.stroke(255, 255, 255, 180);
    canvas.line(0, 0, tick, 0);
    canvas.line(0, 0, 0, tick);
    canvas.line(w - tick, 0, w, 0);
    canvas.line(w, 0, w, tick);
    canvas.line(0, h - tick, 0, h);
    canvas.line(0, h, tick, h);
    canvas.line(w - tick, h, w, h);
    canvas.line(w, h - tick, w, h);

    var ts = Math.round(Math.min(w, h) * 0.025);
    canvas.textSize(ts);
    canvas.fill(255);
    canvas.noStroke();
    canvas.textAlign('left', 'top');
    canvas.text("X+", Math.min(w - ts * 2, cx + arm + gap + 8), Math.max(0, cy - ts * 1.2));
    canvas.textAlign('left', 'top');
    canvas.text("Y+", Math.max(0, cx - ts * 0.5), Math.min(h - ts * 2, cy + arm + gap + 8));

    // Draw landmark dots when available
    var dotSize = Math.max(8, Math.round(Math.min(w, h) * 0.018));

    function toPixels(p) {
        return new vec2(MathUtils.clamp(p.x, 0, 1) * w, MathUtils.clamp(p.y, 0, 1) * h);
    }

    if (lm.leftEye) {
        var p = toPixels(lm.leftEye);
        drawDot(p.x, p.y, dotSize, 0, 180, 255, "L eye");
    }
    if (lm.rightEye) {
        var p2 = toPixels(lm.rightEye);
        drawDot(p2.x, p2.y, dotSize, 255, 180, 0, "R eye");
    }
    if (lm.nose) {
        var pn = toPixels(lm.nose);
        drawDot(pn.x, pn.y, dotSize, 255, 80, 80, "Nose");
    }
    if (lm.mouth) {
        var pm = toPixels(lm.mouth);
        drawDot(pm.x, pm.y, dotSize, 255, 50, 200, "Mouth");
    }
    if (lm.forehead) {
        var pf = toPixels(lm.forehead);
        drawDot(pf.x, pf.y, dotSize, 120, 255, 120, "Forehead");
    }
    if (lm.head) {
        var ph = toPixels(lm.head);
        drawDot(ph.x, ph.y, dotSize, 200, 200, 255, "Head");
    }

    // Update status text each frame
    updateStatusText(faceSeenRecently);
}

} catch(e) {
  print("error in controller");
  print(e);
}
