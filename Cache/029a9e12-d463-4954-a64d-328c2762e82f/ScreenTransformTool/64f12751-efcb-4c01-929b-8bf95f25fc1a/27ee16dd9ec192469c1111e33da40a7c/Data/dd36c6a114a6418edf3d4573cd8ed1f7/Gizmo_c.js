if (script.onAwake) {
    script.onAwake();
    return;
}
function checkUndefined(property, showIfData) {
    for (var i = 0; i < showIfData.length; i++) {
        if (showIfData[i][0] && script[showIfData[i][0]] != showIfData[i][1]) {
            return;
        }
    }
    if (script[property] == undefined) {
        throw new Error("Input " + property + " was not provided for the object " + script.getSceneObject().name);
    }
}
// @input SceneObject pivot
// @input SceneObject[] sidePointsSceneObjects
// @input SceneObject[] rotationPointsSceneObjects
// @input SceneObject[] frameSidesSceneObjects
// @input SceneObject[] anchorPointsSceneObjects
// @input SceneObject[] anchorFrameSidesSceneObjects
// @input SceneObject anchorsRootSceneObject
// @input Component.InteractionComponent gizmoInteractionComponent
// @input Component.ScriptComponent mouseHint
if (!global.BaseScriptComponent) {
    function BaseScriptComponent() {}
    global.BaseScriptComponent = BaseScriptComponent;
    global.BaseScriptComponent.prototype = Object.getPrototypeOf(script);
    global.BaseScriptComponent.prototype.__initialize = function () {};
    global.BaseScriptComponent.getTypeName = function () {
        throw new Error("Cannot get type name from the class, not decorated with @component");
    };
}
var Module = require("../../../../../../Modules/Src/Assets/Scripts/Editor/Gizmo/Gizmo");
Object.setPrototypeOf(script, Module.Gizmo.prototype);
script.__initialize();
let awakeEvent = script.createEvent("OnAwakeEvent");
awakeEvent.bind(() => {
    checkUndefined("pivot", []);
    checkUndefined("sidePointsSceneObjects", []);
    checkUndefined("rotationPointsSceneObjects", []);
    checkUndefined("frameSidesSceneObjects", []);
    checkUndefined("anchorPointsSceneObjects", []);
    checkUndefined("anchorFrameSidesSceneObjects", []);
    checkUndefined("anchorsRootSceneObject", []);
    checkUndefined("gizmoInteractionComponent", []);
    checkUndefined("mouseHint", []);
    if (script.onAwake) {
       script.onAwake();
    }
});
