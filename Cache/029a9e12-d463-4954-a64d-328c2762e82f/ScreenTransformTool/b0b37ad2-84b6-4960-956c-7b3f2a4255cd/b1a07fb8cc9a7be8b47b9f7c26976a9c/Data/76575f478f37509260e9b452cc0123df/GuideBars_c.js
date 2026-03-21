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
// @input SceneObject topBar
// @input SceneObject leftBar
// @input Component.ScriptComponent horizontalGuideRef
// @input Component.ScriptComponent verticalGuideRef
// @input Component.ScriptComponent guideLines
// @input Component.ScriptComponent lensRegion
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
var Module = require("../../../../../../Modules/Src/Assets/Scripts/Editor/RulersAndGuides/GuideBars");
Object.setPrototypeOf(script, Module.GuideBars.prototype);
script.__initialize();
let awakeEvent = script.createEvent("OnAwakeEvent");
awakeEvent.bind(() => {
    checkUndefined("topBar", []);
    checkUndefined("leftBar", []);
    checkUndefined("horizontalGuideRef", []);
    checkUndefined("verticalGuideRef", []);
    checkUndefined("guideLines", []);
    checkUndefined("lensRegion", []);
    checkUndefined("mouseHint", []);
    if (script.onAwake) {
       script.onAwake();
    }
});
