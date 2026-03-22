// FaceRecognitionManager.js
// Main controller for the recognition flow

// Inputs (dragged from Inspector)
// @input Component.ScriptComponent apiClient
// @input Component.ScriptComponent labelController
// @input Component.Head headBinding
// @input Asset.Texture deviceCameraTexture

// Core Modules
// var cameraModule = require("LensStudio:CameraModule"); // Removing complex CameraModule

var updateEvent = script.createEvent("UpdateEvent");
var isRequesting = false;
var lastRequestTime = 0;
var cacheDuration = 3000; // 3 seconds
var cachedResult = null;

// var cameraTexture = null; // We will use script.deviceCameraTexture instead
var isCameraReady = false;

// Initialize Camera
function initCamera() {
    print("Manager: Initializing camera (via Input Texture)...");
    if (script.deviceCameraTexture) {
        // We do NOT set isCameraReady = true here. We wait for the texture to actually have dimensions.
        isCameraReady = false; 
        print("Manager: Camera texture linked, waiting for load...");
    } else {
        print("Manager: ERROR - Please link 'Device Camera Texture' to the script input!");
    }
}

initCamera();

// Face Tracking state - using Head component
var isFaceTracked = false; 

updateEvent.bind(function() {
    // Check camera readiness
    if (!isCameraReady && script.deviceCameraTexture) {
         // Bypass strict width/height check for Spectacles hardware
         // If texture is linked, we assume it will be ready shortly
         isCameraReady = true;
         print("Manager: Camera assumed ready (bypassing size check)");
    }

    // 1. Check if face is tracked using Head Binding component
    if (script.headBinding) {
        // Head component doesn't have isTracking(), check if it's enabled and attached
        var headTransform = script.headBinding.getTransform();
        isFaceTracked = (headTransform && script.headBinding.getSceneObject().enabled);
    } else {
        // If no Head Binding, assume always tracking (for testing)
        isFaceTracked = true;
    }
    
    if (!isFaceTracked) {
        if (script.labelController) {
            script.labelController.hide();
        }
        // Clear cache when no face is tracked
        cachedResult = null;
        return;
    }

    // 2. Check Cache
    var now = getTime(); // Lens Studio time in seconds
    var nowMs = now * 1000;
    
    if (cachedResult && (nowMs - lastRequestTime < cacheDuration)) {
        // Show cached result
        if (script.labelController) {
            script.labelController.show(cachedResult.name, cachedResult.relationship);
        }
        return;
    }

    // 3. Trigger Recognition if not already requesting
    if (!isRequesting && isCameraReady) {
        performRecognition(nowMs);
    }
});

function performRecognition(currentTimeMs) {
    isRequesting = true;
    print("Manager: Starting recognition...");

    if (!script.deviceCameraTexture) {
        print("Manager: No camera texture input!");
        isRequesting = false;
        return;
    }

    // Capture Frame
    try {
        Base64.encodeTextureAsync(
            script.deviceCameraTexture,
            function(base64Image) {
                // Success callback
                print("Manager: Capture success! Image size: " + base64Image.length + " chars");
                callApi(base64Image);
            },
            function() {
                // Failure callback
                print("Manager: Failed to encode texture (retrying...)");
                isRequesting = false; // Will retry on next Update loop
            },
            CompressionQuality.HighQuality,
            EncodingType.Jpg
        );
    } catch (e) {
        // If exception occurs (e.g. texture not loaded), back off a bit
        print("Manager: Exception encoding texture: " + e);
        // Add a small artificial delay so we don't spam errors
        var delayEvent = script.createEvent("DelayedCallbackEvent");
        delayEvent.bind(function(){
            isRequesting = false; 
        });
        delayEvent.reset(1.0); // Wait 1 second before allowing retry
    }
}

function callApi(base64Image) {
    if (script.apiClient) {
        script.apiClient.identify(base64Image, function(error, data) {
            isRequesting = false;
            lastRequestTime = getTime() * 1000; // Use Lens Studio time (consistent with nowMs)

            if (error) {
                print("Manager: Recognition failed - " + error);
                return;
            }

            var name = data.name || "Unknown";
            var status = data.status || "unknown";
            print("Manager: Match found - " + name + " (Status: " + status + ", Confidence: " + (data.confidence || "N/A") + ")");
            
            // Only cache successful matches
            if (status === "match") {
                cachedResult = data;
            } else {
                cachedResult = null; // Don't cache Unknown results
            }
            
            // Update UI
            if (script.labelController) {
                if (status === "match" && data.name && data.relationship) {
                    script.labelController.show(data.name, data.relationship);
                } else {
                    script.labelController.show("Unknown", "");
                }
            }
        });
    } else {
        print("Error: API Client not linked");
        isRequesting = false;
    }
}
