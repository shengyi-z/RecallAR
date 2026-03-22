// ScreenLogoController.js
// Version: 0.1.0
// Event: onAwake
// Description: logic to modify the Screen Image based on the inputs

// @input Asset.Texture teamLogo

// @ui {"widget":"group_start", "label":"Screen Logo"}
// @input int logoPosition = 2 { "widget": "combobox", "values":[{"label": "Top Right", "value": 0}, {"label": "Top Left", "value": 1}, {"label": "Top Middle", "value": 2}, {"label": "Bottom Right", "value": 3}, {"label": "Bottom Left", "value": 4}, {"label": "Bottom Middle", "value": 5}]}
// @input float logoAlpha = 0.8 { "widget":"slider", "min":0.0, "max":1.0, "step":0.01}
// @input float logoSize = 0.3 { "widget":"slider", "min":0.0, "max":1.0, "step":0.01}
// @input float logoOffsetX = 0.0 { "widget":"slider", "min":-1.0, "max":1.0, "step":0.01}
// @input float logoOffsetY = 0.0 { "widget":"slider", "min":-1.0, "max":1.0, "step":0.01}
// @ui {"widget":"group_end"}


//@input bool advanced
/** @type {boolean} */
var advanced = script.advanced;

// @ui {"widget":"group_start", "label":"Advanced","showIf": "advanced", "showIfValue": true}
// @input Component.Image screenLogo{"label":"Screen Logo [DO NOT EDIT]"}
// @ui {"widget":"group_end"}

function configureScreenLogo() {
    if (script.screenLogo && script.teamLogo) {
        script.screenLogo.mainPass.baseTex = script.teamLogo;
        script.screenLogo.mainPass.baseColor = new vec4(1.0, 1.0, 1.0, script.logoAlpha);

        var screenTransform = script.screenLogo.getSceneObject().getComponent("Component.ScreenTransform");
        var bindingPointPositions = [new vec2(0.60, 0.70),
            new vec2(-0.60, 0.70),
            new vec2(0, 0.70),
            new vec2(0.60, -0.70),
            new vec2(-0.60, -0.70),
            new vec2(0, -0.70)];

        // Full screen — ignore position/size inputs
        screenTransform.anchors.left   = -1;
        screenTransform.anchors.right  =  1;
        screenTransform.anchors.top    =  1;
        screenTransform.anchors.bottom = -1;
    }
}

function setRectCenter(rect, center) {
    var offset = center.sub(rect.getCenter());
    rect.left += offset.x;
    rect.right += offset.x;
    rect.top += offset.y;
    rect.bottom += offset.y;
}

function setRectSize(rect, size) {
    var center = rect.getCenter();
    rect.left = center.x - size.x * 0.5;
    rect.right = center.x + size.x * 0.5;
    rect.top = center.y + size.y * 0.5;
    rect.bottom = center.y - size.y * 0.5;
}


configureScreenLogo();