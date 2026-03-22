// APIClient.js
// Handles communication with the backend recognition service

// Hardcoded Configuration (Bypassing Inspector)
var useMock = false; 
var backendUrl = "https://nonvenomous-compensatingly-carmina.ngrok-free.dev/identify";

// Import Lens Studio modules
var internetModule = require("LensStudio:InternetModule");

// Mock data for Phase 1
var mockData = {
    status: "match",
    name: "Grandma",
    relationship: "Family",
    confidence: 0.95
};

function identify(imageBase64, callback) {
    if (useMock) {
        print("APIClient: Using Mock Data");
        // Simulate network delay
        var delayEvent = script.createEvent("DelayedCallbackEvent");
        delayEvent.bind(function() {
            callback(null, mockData);
        });
        delayEvent.reset(1.0); // 1 second delay
        return;
    }

    // Real API Call (Phase 2) using LensStudio:InternetModule
    var options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            image: imageBase64
        })
    };

    internetModule.fetch(backendUrl, options)
        .then(function(response) {
            if (response.status === 200) {
                return response.json();
            } else {
                throw new Error("HTTP Status " + response.status);
            }
        })
        .then(function(data) {
            callback(null, data);
        })
        .catch(function(error) {
            print("API Error: " + error);
            callback(error, null);
        });
}

// Export the function
script.identify = identify;
script.setUseMock = function(val) { useMock = val; };
