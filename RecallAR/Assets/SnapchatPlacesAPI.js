// SnapchatPlacesAPI.js
// @input Component.ScriptComponent placesModule
// @input Component.Text handLabel

print("=== SnapchatPlacesAPI started ===");

var done = false;

script.createEvent("OnStartEvent").bind(function() {
  print("=== OnStartEvent fired ===");

  if (!script.handLabel) {
    print("ERROR: handLabel not set");
    return;
  }

  if (!script.placesModule) {
    print("ERROR: placesModule not set");
    script.handLabel.text = "No API";
    return;
  }

  script.handLabel.text = "Getting location...";

  var rsm = script.placesModule.remoteServiceModule;
  var req = global.RemoteApiRequest.create();
  req.endpoint = "get_nearby_places";
  req.body = '{"lat":45.4732,"lng":-73.6009,"gps_accuracy_m":65.0}';

  print("Calling Places API...");

  rsm.subscribeApiRequest(req, function(response) {
    print("Status: " + response.statusCode);

    if (response.statusCode !== 1) {
      script.handLabel.text = "Location unavailable";
      print("Error: " + response.body);
      return;
    }

    try {
      var data   = JSON.parse(response.body);
      var all    = data.nearbyPlaces || [];

      var venues = all.filter(function(p) {
        return p.placeTypeEnum === "VENUE";
      });

      print("=== " + venues.length + " VENUES NEARBY ===");
      for (var i = 0; i < venues.length; i++) {
        print("[" + i + "] " + venues[i].name + " — " + venues[i].categoryName);
      }

      // Current location = top venue
      var current = venues.length > 0
        ? venues[0].name + ", " + venues[0].subtitle
        : "Unknown location";

      // Nearby = next 2 venues
      var nearby = [];
      for (var i = 1; i < Math.min(3, venues.length); i++) {
        nearby.push("- " + venues[i].name);
      }
      var nearbyText = nearby.length > 0
        ? nearby.join("\n")
        : "- No venues nearby";

      script.handLabel.text =
        "You are currently at:\n" +
        current + "\n" +
        "\n" +
        "Nearby places:\n" +
        nearbyText + "\n" +
        "\n" +
        "Sending location to\n" +
        "emergency contacts...\n";

      print("Hand card updated — at: " + current);

    } catch(e) {
      script.handLabel.text = "Error loading places";
      print("Parse error: " + e);
    }
  });
});