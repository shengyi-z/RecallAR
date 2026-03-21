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
exports.InactiveFrame = void 0;
var __selfType = requireType("./InactiveFrame");
function component(target) { target.getTypeName = function () { return __selfType; }; }
let InactiveFrame = (() => {
    let _classDecorators = [component];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = BaseScriptComponent;
    var InactiveFrame = _classThis = class extends _classSuper {
        onAwake() {
            this.material = this.materialRef.clone();
            this.sides.forEach((side) => {
                side.mainMaterial = this.material;
                this.sideTransforms.push(side.getSceneObject().getParent().getComponent("ScreenTransform"));
            });
            this.updateDefaultOffset();
            this.setHoveEvent();
            this.hide();
        }
        setInteractionCamera(camera) {
            return;
            this.interactionComponent.setCamera(camera);
        }
        setOnHover(cb) {
            this.onHoverCallback = cb;
        }
        setInactive() {
            this.material.mainPass.baseColor = InactiveFrame.INACTIVE_COLOR;
        }
        getLayerSet() {
            return this.sceneObject.layer;
        }
        setLayerSet(layerSet) {
            this.sceneObject.layer = layerSet;
        }
        setScale(scale) {
            this.sideTransforms.forEach((screenTransform, idx) => {
                const offset = screenTransform.offsets;
                offset.top = Math.abs(offset.top) > this.EPS ? this.defaultOffsets[idx] * scale : 0;
                offset.left = Math.abs(offset.left) > this.EPS ? this.defaultOffsets[idx] * scale : 0;
                offset.right = Math.abs(offset.right) > this.EPS ? this.defaultOffsets[idx] * scale : 0;
                offset.bottom = Math.abs(offset.bottom) > this.EPS ? this.defaultOffsets[idx] * scale : 0;
                screenTransform.offsets = offset;
            });
        }
        hide() {
            this.sides.forEach(side => side.enabled = false);
        }
        show() {
            this.sides.forEach(side => side.enabled = true);
        }
        copy() {
            const parent = this.sceneObject.getParent();
            const copyObject = parent.copyWholeHierarchy(this.sceneObject);
            return copyObject.getComponent("ScriptComponent");
        }
        // updateParentLayer(): void {
        //     if (isNull(this.parent)) {
        //         return;
        //     }
        //     this.parent.layer = this.parent.layer.union(this.getLayerSet().except());
        // }
        setParent(parent) {
            this.sceneObject.setParent(parent);
        }
        setLayer(layer) {
            if (this.sceneObject.hasParent()) {
                const parent = this.sceneObject.getParent();
                parent.layer = parent.layer.union(layer);
            }
            this.sides.forEach(sideImage => sideImage.getSceneObject().layer = layer);
        }
        destroy() {
            if (isNull(this.sceneObject)) {
                return;
            }
            try { // Check above doesn't catch that the object is invalid :(
                this.sceneObject.destroy();
            }
            catch (e) {
                return; // TODO: Figure out something else instead of muting the error
            }
        }
        isValid() {
            return !isNull(this.sceneObject) && !this.sideTransforms.some(obj => isNull(obj));
        }
        updateDefaultOffset() {
            this.defaultOffsets = [];
            this.sideTransforms.forEach(screenTransform => {
                const offsets = screenTransform.offsets;
                this.defaultOffsets.push(offsets.left + offsets.right + offsets.top + offsets.bottom);
            });
        }
        setHoveEvent() {
            var _a;
            return;
            (_a = this.interactionComponent.onHover) === null || _a === void 0 ? void 0 : _a.add(() => {
                this.material.mainPass.baseColor = InactiveFrame.ACTIVE_COLOR;
                this.onHoverCallback && this.onHoverCallback();
            });
        }
        __initialize() {
            super.__initialize();
            this.EPS = 1e-3;
            this.sideTransforms = [];
            this.defaultOffsets = [];
            this.onHoverCallback = null;
        }
    };
    __setFunctionName(_classThis, "InactiveFrame");
    (() => {
        var _a;
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create((_a = _classSuper[Symbol.metadata]) !== null && _a !== void 0 ? _a : null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        InactiveFrame = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
    })();
    _classThis.INACTIVE_COLOR = new vec4(162 / 255, 162 / 255, 162 / 255, 67 / 255);
    _classThis.ACTIVE_COLOR = new vec4(38 / 255, 146 / 255, 215 / 255, 67 / 255);
    (() => {
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return InactiveFrame = _classThis;
})();
exports.InactiveFrame = InactiveFrame;
//# sourceMappingURL=InactiveFrame.js.map