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
exports.MouseHint = void 0;
var __selfType = requireType("./MouseHint");
function component(target) { target.getTypeName = function () { return __selfType; }; }
const Utils_1 = require("./Utils");
var setAlphaForHierarchy = Utils_1.Utils.setAlphaForHierarchy;
const GizmoUtils_1 = require("./Gizmo/GizmoUtils");
let MouseHint = (() => {
    let _classDecorators = [component];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = BaseScriptComponent;
    var MouseHint = _classThis = class extends _classSuper {
        onAwake() {
            this.object = this.getSceneObject();
            this.screenTransform = this.object.getComponent("ScreenTransform");
            this.imageScreenTransform = this.image.getSceneObject().getParent().getComponent("ScreenTransform");
            this.material = this.image.mainMaterial;
            this.defaultCornerPivot = this.screenTransform.pivot;
            this.updateParentPointOffset();
            this.hide();
            this.textComponent.updatePriority = -1;
            // this.image.updatePriority = -1;
            // print("IMAGE UPDATE PRIORITY: " + this.image.updatePriority);
            // print("TEXT UPDATE PRIORITY: " + this.textComponent.updatePriority);
        }
        setText(msg) {
            this.textComponent.text = msg;
            this.adjustAspect();
        }
        show() {
            this.material.mainPass.shapeAlpha = 1;
            setAlphaForHierarchy(this.getSceneObject(), 1);
        }
        hide() {
            // Need it to be rendered so extent target from textComponent can update in time.
            // TODO: Add force update for TextComponent?
            this.material.mainPass.shapeAlpha = 0;
            setAlphaForHierarchy(this.getSceneObject(), 0);
        }
        enableStroke(value) {
            this.strokeObjects.forEach(obj => obj.enabled = value);
        }
        setRoundness(value) {
            this.material.mainPass.shapeRoundness = value;
        }
        updateFromMousePosition(mouseScreenPosition) {
            const parentPosition = this.screenTransform.screenPointToParentPoint(mouseScreenPosition);
            this.screenTransform.anchors.setCenter(parentPosition);
            this.screenTransform.pivot = this.defaultCornerPivot;
        }
        updateFromTargetScreenTransform(screenTransform) {
            const center = screenTransform.localPointToScreenPoint(vec2.zero());
            const corner = vec2.one();
            if (center.x > 0.5) {
                corner.x *= -1;
            }
            if (center.y < 0.5) {
                corner.y *= -1;
            }
            // print("CENTER: " + center);
            // print("CORNER: " + corner);
            const targetScreenPoint = screenTransform.localPointToScreenPoint(corner);
            // print("TARGET: " + targetScreenPoint);
            this.screenTransform.anchors.setCenter(this.screenTransform.screenPointToParentPoint(targetScreenPoint));
            this.screenTransform.pivot = this.getCornerPivot(corner);
            this.screenTransform.offsets.setCenter(this.getPosition(corner));
            this.adjustAspect();
        }
        adjustAspect() {
            const size = this.imageScreenTransform.localPointToWorldPoint(vec2.one())
                .sub(this.imageScreenTransform.localPointToWorldPoint(vec2.one().uniformScale(-1)));
            let x = 0;
            let y = 0;
            if (size.x < size.y) {
                y = 1;
                x = size.x / size.y;
            }
            else {
                x = 1;
                y = size.y / size.x;
            }
            x = Math.floor(x * 1000) / 1000;
            y = Math.floor(y * 1000) / 1000;
            this.material.mainPass.shapeWidthX = x;
            this.material.mainPass.shapeHeightY = y;
        }
        getCornerPivot(corner) {
            const newPivot = this.screenTransform.pivot;
            newPivot.x = Math.abs(newPivot.x) * corner.x;
            newPivot.y = Math.abs(newPivot.y) * corner.y;
            return newPivot;
        }
        getPosition(corner) {
            const position = this.screenTransform.offsets.getCenter();
            position.x = Math.abs(position.x) * corner.x;
            position.y = Math.abs(position.y) * corner.y;
            return position;
        }
        updateParentPointOffset() {
            this.parentPointOffset = GizmoUtils_1.GizmoUtils.localPointToParentPoint(this.screenTransform, vec2.zero())
                .sub(GizmoUtils_1.GizmoUtils.localPointToParentPoint(this.screenTransform, vec2.one()));
        }
        __initialize() {
            super.__initialize();
            this.parentPointOffset = vec2.zero();
            this.defaultCornerPivot = vec2.zero();
        }
    };
    __setFunctionName(_classThis, "MouseHint");
    (() => {
        var _a;
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create((_a = _classSuper[Symbol.metadata]) !== null && _a !== void 0 ? _a : null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        MouseHint = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return MouseHint = _classThis;
})();
exports.MouseHint = MouseHint;
//# sourceMappingURL=MouseHint.js.map