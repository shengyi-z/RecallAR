// FaceCardController.js
// @input Component.Text3D nameText
// @input Component.Text3D relationText
// @input Component.Text3D noteText
// @input SceneObject cardRoot

// @input string personName = "David"
// @input string relation = "Son"
// @input string note = "He takes care of me a lot"
// @input bool showOnlyWhenFaceDetected = true

function applyCardText() {
    if (script.nameText) {
        script.nameText.text = script.personName;
    }

    if (script.relationText) {
        script.relationText.text = script.relation;
    }

    if (script.noteText) {
        script.noteText.text = script.note;
    }
}

function setCardVisible(isVisible) {
    if (script.cardRoot) {
        script.cardRoot.enabled = isVisible;
    }
}

var faceML = script.getSceneObject().getComponent("FaceML");

if (script.showOnlyWhenFaceDetected && faceML) {
    // Show card when a face is detected.
    faceML.onFaceFound = function () {
        applyCardText();
        setCardVisible(true);
    };

    // Hide card when the face is lost.
    faceML.onFaceLost = function () {
        setCardVisible(false);
    };

    setCardVisible(false);
} else {
    applyCardText();
    setCardVisible(true);
}