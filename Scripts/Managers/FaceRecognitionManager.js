// FaceRecognitionManager.js
// Main controller for the recognition flow

// Inputs (dragged from Inspector)
// @input Component.ScriptComponent apiClient
// @input Component.ScriptComponent labelController
// @input Component.Head headBinding

// Core Modules
var cameraModule = require("LensStudio:CameraModule");

var updateEvent = script.createEvent("UpdateEvent");
var isRequesting = false;
var lastRequestTime = 0;
var cacheDuration = 3000; // 3 seconds
var cachedResult = null;

var cameraTexture = null;
var isCameraReady = false;

// Initialize Camera
function initCamera() {
    print("Manager: Initializing camera...");
    try {
        var cameraRequest = CameraModule.createCameraRequest();
        cameraRequest.cameraId = CameraModule.CameraId.Default_Color;
        cameraTexture = cameraModule.requestCamera(cameraRequest);
        
        if (cameraTexture) {
            print("Manager: Camera texture requested");
        } else {
            print("Manager: Failed to get camera texture");
        }
    } catch (e) {
        print("Manager: Error initializing camera: " + e);
    }
}

initCamera();

// Face Tracking state (mocking the check for now)
// In real Lens, you'd check `global.scene.isTracking()` or similar on the Face Mesh
var isFaceTracked = true; 

updateEvent.bind(function() {
    // Check camera readiness
    if (!isCameraReady && cameraTexture) {
        if (cameraTexture.getWidth() > 0 && cameraTexture.getHeight() > 0) {
            isCameraReady = true;
            print("Manager: Camera ready " + cameraTexture.getWidth() + "x" + cameraTexture.getHeight());
        }
    }

    // 1. Check if face is tracked (simplified)
    // In reality: check if the Head Binding object is active or if Face Tracking component says so
    if (!isFaceTracked) {
        if (script.labelController && script.labelController.api) {
            script.labelController.api.hide();
        }
        return;
    }

    // 2. Check Cache
    var now = getTime(); // Lens Studio time in seconds
    var nowMs = now * 1000;
    
    if (cachedResult && (nowMs - lastRequestTime < cacheDuration)) {
        // Show cached result
        if (script.labelController && script.labelController.api) {
            script.labelController.api.show(cachedResult.name, cachedResult.relationship);
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

    if (!cameraTexture) {
        print("Manager: No camera texture");
        isRequesting = false;
        return;
    }

    // Capture Frame
    Base64.encodeTextureAsync(
        cameraTexture,
        function(base64Image) {
            // Success callback
            callApi(base64Image);
        },
        function() {
            // Failure callback
            print("Manager: Failed to encode texture");
            isRequesting = false;
        },
        CompressionQuality.HighQuality,
        EncodingType.Jpg
    );
}

function callApi(base64Image) {
    if (script.apiClient && script.apiClient.api) {
        script.apiClient.api.identify(base64Image, function(error, data) {
            isRequesting = false;
            lastRequestTime = new Date().getTime(); // Use system time for cache logic

            if (error) {
                print("Manager: Recognition failed - " + error);
                return;
            }

            print("Manager: Match found - " + (data.name || "Unknown"));
            cachedResult = data;
            
            // Update UI
            if (script.labelController && script.labelController.api) {
                if (data.status === "match") {
                    script.labelController.api.show(data.name, data.relationship);
                } else {
                    script.labelController.api.show("Unknown", "");
                }
            }
        });
    } else {
        print("Error: API Client not linked");
        isRequesting = false;
    }
}
