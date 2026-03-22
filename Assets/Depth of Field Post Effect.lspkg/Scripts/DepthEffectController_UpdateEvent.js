//@input Asset.Material[] materials
//@input Asset.Texture depthTexture
//@input Asset.Texture placeholderTexture
script.createEvent("UpdateEvent").bind(function() { require("DepthEffectController_wrapped")(script)})