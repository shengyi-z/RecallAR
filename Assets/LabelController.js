// LabelController.js
// Manages the AR text display

// @input Component.Text nameText
// @input Component.Text relationText
// @input SceneObject backgroundObj

function show(name, relationship) {
    print("LabelController: Showing " + name + " / " + relationship);
    
    if (script.nameText) {
        // Ensure inputs are strings
        var nameStr = "" + (name || "Unknown");
        script.nameText.text = nameStr;
        print("LabelController: Set nameText to '" + nameStr + "'");
    } else {
        print("LabelController: WARNING - nameText is not linked!");
    }
    
    if (script.relationText) {
        var relationStr = "" + (relationship || "");
        script.relationText.text = relationStr;
        print("LabelController: Set relationText to '" + relationStr + "'");
    } else {
        print("LabelController: WARNING - relationText is not linked!");
    }
    
    if (script.backgroundObj) {
        script.backgroundObj.enabled = true;
        print("LabelController: Background enabled");
    } else {
        print("LabelController: WARNING - backgroundObj is not linked!");
    }
    
    // Optional: Dynamic color based on relationship
    // if (relationship === "Family") ...
}

function hide() {
    if (script.nameText) script.nameText.text = "";
    if (script.relationText) script.relationText.text = "";
    if (script.backgroundObj) script.backgroundObj.enabled = false;
}

script.show = show;
script.hide = hide;
