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
// @input bool updateWithCameraSize
// @input Component.Camera camera {"showIf":"updateWithCameraSize", "showIfValue":true}
// @input Asset.Material linesMat
// @input Asset.Texture startPoint
// @input Asset.Texture endPoint
if (!global.BaseScriptComponent) {
    function BaseScriptComponent() {}
    global.BaseScriptComponent = BaseScriptComponent;
    global.BaseScriptComponent.prototype = Object.getPrototypeOf(script);
    global.BaseScriptComponent.prototype.__initialize = function () {};
    global.BaseScriptComponent.getTypeName = function () {
        throw new Error("Cannot get type name from the class, not decorated with @component");
    };
}
var Module = require("../../../../../Modules/Src/Assets/Scripts/Editor/LineRenderer");
Object.setPrototypeOf(script, Module.LineRenderer.prototype);
script.__initialize();
let awakeEvent = script.createEvent("OnAwakeEvent");
awakeEvent.bind(() => {
    checkUndefined("updateWithCameraSize", []);
    checkUndefined("linesMat", []);
    checkUndefined("startPoint", []);
    checkUndefined("endPoint", []);
    if (script.onAwake) {
       script.onAwake();
    }
});
