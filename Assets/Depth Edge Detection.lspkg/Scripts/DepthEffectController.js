// DepthEffectController.js
// Version: 0.1.1
// Description: Set depth textures values onto a selected materials

//@input Asset.Material[] materials
//@input Asset.Texture depthTexture
//@input Asset.Texture placeholderTexture

if (!validateInputs()) return;

var depthTextureActive = script.depthTexture.getWidth() > 1;
    
for (var j = 0; j < script.materials.length; j++) {
    var mainPass = script.materials[j].mainPass;
    if (depthTextureActive) {
        mainPass.depthImage = script.depthTexture;
        mainPass.fallbacktexMult = 1.0;
    } else {
        mainPass.depthImage = script.placeholderTexture;
        mainPass.fallbacktexMult = 1000.0;
    }
}

function validateInputs() {
    
    for (var i = 0; i < script.materials.length; i++) {
        if (isNull(script.materials[i])) {
            print("ERROR: Please add and assign a material that you want to pass data to.");
            return false;
        }
    }
    
    if (!script.depthTexture) {
        print("ERROR: Please add and assign a Depth Texture asset to the script.");
        return false;
    }
    
    if (!script.placeholderTexture) {
        print("ERROR: Please assign a Placeholder Texture to the script to make sure that experience,");
        print("will be working on unsupported devices.");
        return false;
    }
    return true;
}
    
