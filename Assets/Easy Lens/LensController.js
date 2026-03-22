// Main Controller
//
// Made with Easy Lens

//@input Component.ScriptComponent canvas_debug


try {

// Diagnostic overlay using Canvas API
// Limitations: No face tracking blocks available; this overlay helps verify screen-space alignment only.

var canvas;

// Init on start to get correct device resolution
script.createEvent("OnStartEvent").bind(function() {
    // Ensure the block is enabled (can be toggled by designer in Inspector)
    if (!script.canvas_debug || script.canvas_debug.enabled === false) {
        return;
    }

    // Fullscreen, onscreen canvas
    canvas = script.canvas_debug.createOnScreenCanvas();

    // Optional: configure consistent styling once
    canvas.angleMode('degrees');
});

// Redraw every frame
script.createEvent("UpdateEvent").bind(function() {
    if (!canvas) {
        return;
    }

    // Clear to transparent while matching overlay color family (white strokes)
    canvas.background(255, 255, 255, 0);

    var w = canvas.getWidth();
    var h = canvas.getHeight();
    var cx = w * 0.5;
    var cy = h * 0.5;

    // Draw normalized screen-bounds frame (0-1 full screen)
    canvas.noFill();
    canvas.stroke(0, 255, 0, 200); // semi-transparent green
    canvas.strokeWeight(Math.max(2, Math.round(Math.min(w, h) * 0.003)));
    canvas.rect(0, 0, w, h);

    // Draw centered crosshair
    var arm = Math.round(Math.min(w, h) * 0.05);
    var gap = Math.round(Math.min(w, h) * 0.01);

    // Horizontal line (with center gap)
    canvas.stroke(255, 255, 255, 220);
    canvas.line(cx - arm, cy, cx - gap, cy);
    canvas.line(cx + gap, cy, cx + arm, cy);

    // Vertical line (with center gap)
    canvas.line(cx, cy - arm, cx, cy - gap);
    canvas.line(cx, cy + gap, cx, cy + arm);

    // Corner ticks to verify mirroring/orientation
    var tick = Math.round(Math.min(w, h) * 0.03);
    canvas.stroke(255, 255, 255, 180);

    // Top-left
    canvas.line(0, 0, tick, 0);
    canvas.line(0, 0, 0, tick);

    // Top-right
    canvas.line(w - tick, 0, w, 0);
    canvas.line(w, 0, w, tick);

    // Bottom-left
    canvas.line(0, h - tick, 0, h);
    canvas.line(0, h, tick, h);

    // Bottom-right
    canvas.line(w - tick, h, w, h);
    canvas.line(w, h - tick, w, h);

    // Axis labels to detect flips
    var ts = Math.round(Math.min(w, h) * 0.025);
    canvas.textSize(ts);
    canvas.fill(255);
    canvas.noStroke();
    canvas.textAlign('left', 'top');
    canvas.text("X+", Math.min(w - ts * 2, cx + arm + gap + 8), Math.max(0, cy - ts * 1.2));
    canvas.textAlign('left', 'top');
    canvas.text("Y+", Math.max(0, cx - ts * 0.5), Math.min(h - ts * 2, cy + arm + gap + 8));

    // Instruction text
    var pad = Math.round(Math.min(w, h) * 0.03);
    var boxW = Math.min(w - pad * 2, Math.round(w * 0.9));
    var boxH = Math.round(ts * 3.2);

    // Background panel for readability
    canvas.fill(0, 0, 0, 140);
    canvas.noStroke();
    canvas.rect(pad, pad, boxW, boxH, Math.round(ts * 0.4));

    // Text
    canvas.fill(255);
    canvas.textAlign('left', 'middle');
    canvas.textSize(ts);
    canvas.text("Check if your blur/mask is offset, mirrored, or scaled wrong.", pad + Math.round(ts * 0.6), pad + Math.round(boxH * 0.5));
});

} catch(e) {
  print("error in controller");
  print(e);
}
