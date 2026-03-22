// Main Controller
//
// Made with Easy Lens

//@input Component.ScriptComponent faceEvents_debug
//@input Component.ScriptComponent faceStatusText
//@input Component.ScriptComponent pip_faceCropPreview
//@input Component.ScriptComponent selfieWidget_debug
//@input Component.ScriptComponent debug_texture_store
//@input Component.ScriptComponent spriteManager
//@input Component.ScriptComponent canvasApi_debug


try {

// db.js integration contract
// db must expose: setFaceTexture(tex), setFaceTrackingActive(isActive)
// and internally process the texture only when trackingActive is true.
// Here we include a minimal shim to avoid undefined identifier errors if db.js isn't loaded yet.

// Minimal no-op shim; will be replaced if real db.js is present
var db = (typeof db !== "undefined" && db) ? db : {
    setFaceTexture: function(_) {},
    setFaceTrackingActive: function(_) {}
};

var faceCropTexture = null;

// Initialize status text on start and wire face-crop texture into db.js
var onStart = script.createEvent("OnStartEvent");
onStart.bind(function() {
    // Acquire the live face-crop texture from the Sprite Store
    // Designer: ensure debug_texture_store.assetName0 is set to "faceCropTex"
    if (script.debug_texture_store && script.debug_texture_store.getTexture) {
        faceCropTexture = script.debug_texture_store.getTexture("faceCropTex");
    }

    // Start with NO FACE status and red color
    script.faceStatusText.text = "NO FACE";
    if (script.faceStatusText.forceSafeRegion) {
        script.faceStatusText.forceSafeRegion(true);
    }
    script.faceStatusText.color = new vec4(1.0, 0.0, 0.0, 1.0);

    // Ensure PiP preview and selfie widget remain enabled for visual debugging
    script.pip_faceCropPreview.enabled = true;
    script.selfieWidget_debug.enabled = true;

    // Pass texture to db.js if available
    if (typeof db !== "undefined" && db && typeof db.setFaceTexture === "function") {
        db.setFaceTexture(faceCropTexture);
    }

    // Let db know tracking starts as inactive
    if (typeof db !== "undefined" && db && typeof db.setFaceTrackingActive === "function") {
        db.setFaceTrackingActive(false);
    }
});

// Face found -> update status to green "FACE FOUND" and notify db.js
script.faceEvents_debug.onFaceFound.add(function() {
    script.faceStatusText.enabled = true;
    script.faceStatusText.text = "FACE FOUND";
    script.faceStatusText.color = new vec4(0.0, 1.0, 0.0, 1.0);

    if (typeof db !== "undefined" && db && typeof db.setFaceTrackingActive === "function") {
        db.setFaceTrackingActive(true);
    }
});

// Face lost -> update status to red "NO FACE" and notify db.js
script.faceEvents_debug.onFaceLost.add(function() {
    script.faceStatusText.text = "NO FACE";
    script.faceStatusText.color = new vec4(1.0, 0.0, 0.0, 1.0);

    if (typeof db !== "undefined" && db && typeof db.setFaceTrackingActive === "function") {
        db.setFaceTrackingActive(false);
    }
});

// Optional: throttle debug prints inside db.js once per second.
// Add this snippet to db.js (not here):
// let _lastLogTime = 0;
// let _trackingActive = false;
// let _faceTex = null;
// db.setFaceTexture = function(tex) { _faceTex = tex; };
// db.setFaceTrackingActive = function(active) { _trackingActive = active; };
// var upd = script.createEvent("UpdateEvent");
// upd.bind(function(){
//     _lastLogTime += getDeltaTime();
//     if (_lastLogTime >= 1.0) {
//         _lastLogTime = 0;
//         print("db.js: trackingActive=" + _trackingActive + ", faceTexValid=" + (!!_faceTex));
//     }
//     if (!_trackingActive || !_faceTex) { return; }
//     // Process _faceTex here per-frame as needed
// });

} catch(e) {
  print("error in controller");
  print(e);
}
