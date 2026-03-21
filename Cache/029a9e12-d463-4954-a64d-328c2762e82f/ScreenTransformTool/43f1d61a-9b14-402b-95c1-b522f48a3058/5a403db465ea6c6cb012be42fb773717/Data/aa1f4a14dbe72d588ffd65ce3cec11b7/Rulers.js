"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rulers = void 0;
var __selfType = requireType("./Rulers");
function component(target) { target.getTypeName = function () { return __selfType; }; }
const Config_1 = require("../Config");
let Rulers = (() => {
    let _classDecorators = [component];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = BaseScriptComponent;
    var Rulers = _classThis = class extends _classSuper {
        onAwake() {
            this.createEvent("OnStartEvent").bind(() => {
                this.onStart();
            });
        }
        onStart() {
            this.lensRegion.addOnLensRegionUpdate(() => {
                this.updateRulers();
            });
            Config_1.Config.isRulerEnabled.addCallback((value) => {
                if (value) {
                    this.show();
                }
                else {
                    this.hide();
                }
            });
        }
        show() {
            this.script.getSceneObject().enabled = true;
        }
        hide() {
            this.script.getSceneObject().enabled = false;
        }
        updateRulers() {
            const topRight = this.frame.localPointToScreenPoint(vec2.one());
            const bottomLeft = this.frame.localPointToScreenPoint(vec2.one().uniformScale(-1));
            this.fixDistortion(topRight, bottomLeft);
            this.updateRuler(this.horizontal, bottomLeft, topRight, true);
            this.updateRuler(this.vertical, bottomLeft, topRight, false);
        }
        updateRuler(screenTransform, bottomLeft, topRight, isHorizontal) {
            const bottomLeftParent = screenTransform.screenPointToParentPoint(bottomLeft);
            const topRightParent = screenTransform.screenPointToParentPoint(topRight);
            if (isHorizontal) {
                screenTransform.anchors.left = bottomLeftParent.x;
                screenTransform.anchors.right = topRightParent.x;
            }
            else {
                screenTransform.anchors.bottom = bottomLeftParent.y;
                screenTransform.anchors.top = topRightParent.y;
            }
        }
        fixDistortion(topRight, bottomLeft) {
            const height = this.lensRegion.getWindowTexture().getHeight() * (bottomLeft.y - topRight.y);
            const width = this.lensRegion.getWindowTexture().getWidth() * (topRight.x - bottomLeft.x);
            this.horizontalMaterial.mainPass.widthScale = 640 / width;
            this.verticalMaterial.mainPass.widthScale = 640 / height;
        }
    };
    __setFunctionName(_classThis, "Rulers");
    (() => {
        var _a;
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create((_a = _classSuper[Symbol.metadata]) !== null && _a !== void 0 ? _a : null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        Rulers = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return Rulers = _classThis;
})();
exports.Rulers = Rulers;
//# sourceMappingURL=Rulers.js.map