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
exports.Cursor = void 0;
var __selfType = requireType("./Cursor");
function component(target) { target.getTypeName = function () { return __selfType; }; }
const CursorData_1 = require("./CursorData");
const CursorModule_1 = require("./CursorModule");
const CursorUtils_1 = require("./CursorUtils");
const CursorIcons_1 = require("./CursorIcons");
const GizmoUtils_1 = require("../Gizmo/GizmoUtils");
let Cursor = (() => {
    let _classDecorators = [component];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = BaseScriptComponent;
    var Cursor = _classThis = class extends _classSuper {
        eventFilter(touchData) {
            switch (touchData.getTypeName()) {
                case "TouchStartEvent":
                    if (!this.isInside(touchData.getTouchPosition())) {
                        return false;
                    }
                    (0, CursorModule_1.lock)();
                    this.onStart();
                    return true;
                case "TouchMoveEvent":
                    if (!this.isInside(touchData.getTouchPosition())) {
                        if (CursorModule_1.lastCursorID === this.id) {
                            this.onEnd();
                        }
                        return false;
                    }
                    this.onStart();
                    return true;
                case "TouchEndEvent":
                    if (CursorModule_1.lastCursorID === this.id) {
                        (0, CursorModule_1.unlock)();
                        this.onEnd();
                    }
                    return false;
                case "HoverStartEvent":
                    if (!this.isInside(touchData.getHoverPosition())) {
                        return false;
                    }
                    this.onStart();
                    return true;
                case "HoverEvent":
                    if (!this.isInside(touchData.getHoverPosition())) {
                        if (CursorModule_1.lastCursorID === this.id) {
                            this.onEnd();
                        }
                        return false;
                    }
                    this.onStart();
                    return true;
                case "HoverEndEvent":
                    if (CursorModule_1.lastCursorID === this.id) {
                        this.onEnd();
                    }
                    return false;
                case "PanGestureStartEvent":
                    this.onStart();
                    (0, CursorModule_1.lock)();
                    return true;
                case "PanGestureMoveEvent":
                    // this.onStart();
                    return true;
                case "PanGestureEndEvent":
                    if (CursorModule_1.lastCursorID === this.id) {
                        (0, CursorModule_1.unlock)();
                        this.onEnd();
                    }
                    return false;
                case "PinchGestureStartEvent":
                    this.onStart();
                    (0, CursorModule_1.lock)();
                    return true;
                case "PinchGestureMoveEvent":
                    // this.onStart();
                    return true;
                case "PinchGestureEndEvent":
                    if (CursorModule_1.lastCursorID === this.id) {
                        (0, CursorModule_1.unlock)();
                        this.onEnd();
                    }
                    return false;
            }
            return false;
        }
        // In radians
        setRotation(angle) {
            this.rotation = angle * 180 / Math.PI;
            this.tryUpdateCursor();
        }
        setCursorType(cursorType) {
            this.cursorType = cursorType;
            this.tryUpdateCursor();
        }
        isInside(point) {
            const worldPoint = this.camera.screenSpaceToWorldSpace(point, -1);
            return this.screenTransform.containsWorldPoint(worldPoint);
        }
        tryUpdateCursor() {
            if (this.cursorType === CursorData_1.CursorType.Default) {
                (0, CursorModule_1.resetCursorTexture)(this.id);
                return;
            }
            (0, CursorModule_1.setCursorTexture)(this.id, this.prepareTexture());
        }
        getTexture() {
            if (this.cursorType === CursorData_1.CursorType.Custom) {
                return this.cursorTexture;
            }
            if (global.deviceInfoSystem.getOS() === OS.MacOS) {
                return CursorIcons_1.CursorIcons.macIconTextures[Math.round(this.cursorType)];
            }
            if (global.deviceInfoSystem.getOS() === OS.Windows) {
                return CursorIcons_1.CursorIcons.winIconTextures[Math.round(this.cursorType)];
            }
            throw new Error("Your OS isn't supported");
        }
        prepareTexture() {
            this.cropTextureProvider.inputTexture = this.getTexture();
            if (this.rotationType === CursorData_1.RotationType.Custom) {
                this.cropTextureProvider.rotation = CursorUtils_1.CursorUtils.degToRad(this.rotation);
            }
            else if (this.rotationType === CursorData_1.RotationType.LockToWorldRotation) {
                this.cropTextureProvider.rotation = this.transform.getWorldRotation().toEulerAngles().z + CursorUtils_1.CursorUtils.degToRad(this.rotationOffset);
            }
            else {
                this.cropTextureProvider.rotation = this.getObjectRotation() + CursorUtils_1.CursorUtils.degToRad(this.rotationObjectOffset);
            }
            return this.cropTexture;
        }
        getObjectRotation() {
            const centerPos = this.rotationObjectScreenTransform.localPointToScreenPoint(vec2.zero());
            const cursorPos = GizmoUtils_1.GizmoUtils.worldPointToScreenPoint(this.rotationObjectScreenTransform, this.transform.getWorldPosition());
            return this.getAngleBetweenVectors(vec2.right(), cursorPos.sub(centerPos).normalize());
        }
        getAngleBetweenVectors(vector1, vector2) {
            const dotProduct = vector1.x * vector2.x + vector1.y * vector2.y;
            const crossProduct = vector1.x * vector2.y - vector1.y * vector2.x;
            const magnitude1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y);
            const magnitude2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y);
            const cosTheta = dotProduct / (magnitude1 * magnitude2);
            let radians = Math.acos(cosTheta);
            const sign = Math.sign(crossProduct);
            radians = sign * radians;
            if (radians < 0) {
                radians += 2 * Math.PI;
            }
            return -radians;
        }
        onStart() {
            if (this.cursorType === CursorData_1.CursorType.Default) {
                if (CursorModule_1.lastCursorID !== this.id) {
                    (0, CursorModule_1.resetCursorTexture)(this.id);
                    (0, CursorModule_1.setInfo)(this.id, 0);
                }
                return;
            }
            if (CursorModule_1.lastCursorID === this.id && CursorModule_1.lastRotation === this.cropTextureProvider.rotation) {
                return;
            }
            (0, CursorModule_1.setCursorTexture)(this.id, this.prepareTexture());
            (0, CursorModule_1.setInfo)(this.id, this.cropTextureProvider.rotation);
        }
        onChange() {
            if (CursorModule_1.lastCursorID === this.id) {
                return;
            }
            if (this.cursorType === CursorData_1.CursorType.Default) {
                (0, CursorModule_1.resetCursorTexture)(this.id);
                (0, CursorModule_1.setInfo)(this.id, 0);
                return;
            }
            const texture = this.prepareTexture(); // need to do this before 'if' to have updated rotation
            if (this.cropTextureProvider.rotation !== CursorModule_1.lastRotation) {
                (0, CursorModule_1.setCursorTexture)(this.id, texture);
            }
        }
        onEnd() {
            (0, CursorModule_1.resetCursorTexture)(this.id);
        }
        setupTriggers() {
            this.createEvent("OnDestroyEvent").bind(() => this.onEnd);
            if (!CursorUtils_1.CursorUtils.isEditor()) {
                this.trackedEvents = ["TouchStartEvent", "TouchMoveEvent", "TouchEndEvent"];
                return;
            }
            switch (this.triggerType) {
                case CursorData_1.TriggerType.onTouch:
                    this.trackedEvents = ["TouchStartEvent", "TouchMoveEvent", "TouchEndEvent"];
                    break;
                case CursorData_1.TriggerType.onHover:
                    this.trackedEvents = ["HoverStartEvent", "HoverEvent", "HoverEndEvent", "TouchStartEvent", "TouchMoveEvent", "TouchEndEvent"];
                    break;
                case CursorData_1.TriggerType.onPan:
                    this.trackedEvents = ["PanGestureStartEvent", "PanGestureMoveEvent", "PanGestureEndEvent"];
                    break;
                case CursorData_1.TriggerType.onPinch:
                    this.trackedEvents = ["PinchGestureStartEvent", "PinchGestureMoveEvent", "PinchGestureEndEvent"];
                    break;
                default:
                    throw new Error("Trigger type not implemented");
            }
        }
        createCropTexture() {
            this.cropTexture = global.assetSystem.createAsset("Asset.Texture");
            this.cropTexture.control = global.scene.createResourceProvider("Provider.RectCropTextureProvider");
            this.cropTextureProvider = this.cropTexture.control;
        }
        __initialize() {
            super.__initialize();
            this.trackedEvents = [];
            this.onAwake = () => {
                var _a;
                this.transform = this.getTransform();
                this.rotationObjectScreenTransform = (_a = this.rotationObject) === null || _a === void 0 ? void 0 : _a.getComponent("ScreenTransform");
                this.interactionComponent = this.getSceneObject().getComponent("InteractionComponent");
                this.screenTransform = this.getSceneObject().getComponent("ScreenTransform");
                this.id = this.uniqueIdentifier;
                this.createCropTexture();
                this.setupTriggers();
                this.touchManager.register(this, this.touchParent);
            };
        }
    };
    __setFunctionName(_classThis, "Cursor");
    (() => {
        var _a;
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create((_a = _classSuper[Symbol.metadata]) !== null && _a !== void 0 ? _a : null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        Cursor = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return Cursor = _classThis;
})();
exports.Cursor = Cursor;
//# sourceMappingURL=Cursor.js.map