// SnapchatPlacesAPI.js
// @input Component.ScriptComponent remoteServiceModule

script.createEvent("OnStartEvent").bind(function () {
    if (!script.remoteServiceModule) {
        print("ERROR: drag the Snapchat Places API object into remoteServiceModule slot");
        return;
    }

    var rsm = script.remoteServiceModule.getRemoteServiceModule();

    var request = RemoteServiceHttpRequest.create();
    request.endpoint = "nearbyPlaces";

    print("Calling Snapchat Places API...");

    rsm.performHttpRequest(request, function (response) {
        print("Status code: " + response.statusCode);
        print("Raw response: " + response.body);

        if (response.statusCode !== 200) {
            print("ERROR: Request failed with code " + response.statusCode);
            return;
        }

        try {
            var data = JSON.parse(response.body);
            var places = data.results || data.venues || data.places || [];

            print("=== NEARBY PLACES (" + places.length + " found) ===");
            for (var i = 0; i < places.length; i++) {
                var p = places[i];
                print("[" + i + "] " + JSON.stringify(p));
            }
            print("=== END ===");

        } catch (e) {
            print("Parse error: " + e);
        }
    });
});