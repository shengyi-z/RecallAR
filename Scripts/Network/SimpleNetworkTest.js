// SimpleNetworkTest.js
// Attach this to any object in your scene to test network connectivity

var internetModule = require("LensStudio:InternetModule");
var backendUrl = "https://nonvenomous-compensatingly-carmina.ngrok-free.dev/identify"; // Update with your current ngrok URL

function testConnection() {
    print("Test: Sending request to " + backendUrl);
    
    var options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            image: "test_from_lens"
        })
    };

    internetModule.fetch(backendUrl, options)
        .then(function(response) {
            print("Test: Response status " + response.status);
            return response.text();
        })
        .then(function(text) {
            print("Test: Response body " + text);
        })
        .catch(function(error) {
            print("Test: Error " + error);
        });
}

// Call immediately on start
testConnection();
