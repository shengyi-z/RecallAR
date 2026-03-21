// LabelController.js
// Manages the AR text display

// @input Component.Text nameText
// @input Component.Text relationText
// @input SceneObject backgroundObj

function show(name, relationship) {
    if (script.nameText) {
        script.nameText.text = name;
    }
    if (script.relationText) {
        script.relationText.text = relationship;
    }
    if (script.backgroundObj) {
        script.backgroundObj.enabled = true;
    }
    
    // Optional: Dynamic color based on relationship
    // if (relationship === "Family") ...
}

function hide() {
    if (script.nameText) script.nameText.text = "";
    if (script.relationText) script.relationText.text = "";
    if (script.backgroundObj) script.backgroundObj.enabled = false;
}

script.api.show = show;
script.api.hide = hide;
