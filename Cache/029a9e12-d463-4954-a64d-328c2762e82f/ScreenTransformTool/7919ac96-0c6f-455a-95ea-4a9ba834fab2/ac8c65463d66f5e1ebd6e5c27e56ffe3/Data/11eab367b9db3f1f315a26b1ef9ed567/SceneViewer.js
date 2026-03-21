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
exports.SceneViewer = void 0;
var __selfType = requireType("./SceneViewer");
function component(target) { target.getTypeName = function () { return __selfType; }; }
const InactiveFramePool_1 = require("./InactiveFramePool");
const Utils_1 = require("./Utils");
var SceneViewerMode;
(function (SceneViewerMode) {
    SceneViewerMode[SceneViewerMode["Camera"] = 0] = "Camera";
    SceneViewerMode[SceneViewerMode["Canvas"] = 1] = "Canvas";
    SceneViewerMode[SceneViewerMode["None"] = 2] = "None";
})(SceneViewerMode || (SceneViewerMode = {}));
let SceneViewer = (() => {
    let _classDecorators = [component];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = BaseScriptComponent;
    var SceneViewer = _classThis = class extends _classSuper {
        isInitialized() {
            return (!isNull(this.referencedCamera) || !isNull(this.referencedCanvas)) && !isNull(this.referencedObject);
        }
        init(camera) {
            if (!isNull(this.referencedObject)) {
                this.removeLayers(this.referencedObject);
            }
            this.registerGizmos();
            this.mode = SceneViewerMode.Camera;
            this.aspect = camera.aspect;
            camera.near = -1;
            this.camera.enabled = true;
            this.referencedCamera = camera;
            this.referencedObject = camera.getSceneObject();
            this.referencedObject.setParent(null);
            this.referencedTransform = this.referencedObject.getTransform();
            this.referencedTransform.setWorldTransform(mat4.identity());
            // this.referencedTransform.setWorldRotation(quat.quatIdentity());
            this.referencedTransformMatrix = this.referencedTransform.getWorldTransform();
            this.copyTransform(this.referencedObject);
            this.setScale(1, 1);
            // this.spawnFrames(this.referencedObject);
            this.resetLayers();
            this.copyDeviceProperties(camera);
            this.startSize = this.camera.size;
            this.resetZPosition();
            Utils_1.Utils.forceUpdateCamera(this.camera);
        }
        initFromCanvas(canvas) {
            if (!isNull(this.referencedObject)) {
                this.removeLayers(this.referencedObject);
            }
            this.registerGizmos();
            this.mode = SceneViewerMode.Canvas;
            this.aspect = canvas.getSize().x / canvas.getSize().y;
            this.camera.enabled = true;
            this.referencedCanvas = canvas;
            this.referencedObject = canvas.getSceneObject();
            this.referencedObject.setParent(null);
            this.referencedTransform = this.referencedObject.getTransform();
            this.referencedTransform.setWorldTransform(mat4.identity());
            // this.referencedTransform.setWorldRotation(quat.quatIdentity());
            this.referencedTransformMatrix = this.referencedTransform.getWorldTransform();
            this.copyTransform(this.referencedObject);
            this.setScale(1, 1);
            // this.spawnFrames(this.referencedObject);
            this.resetLayers();
            this.copyDevicePropertiesFromCanvas(canvas);
            this.startSize = this.camera.size;
            this.resetZPosition();
            Utils_1.Utils.forceUpdateCamera(this.camera);
        }
        setScale(scale, shrinkScale) {
            this.lastScale = scale;
            this.camera.size = this.getReferenceHeight() * (1 / (scale * shrinkScale));
            Utils_1.Utils.forceUpdateCamera(this.camera);
            this.updateFramesScale(this.getReferenceSize() * (1 / scale) / 20);
        }
        setDelta(delta) {
            const scale = this.transform.getWorldScale();
            const rotation = this.transform.getWorldRotation();
            delta.x *= this.deviceCameraTexture.getHeight() / this.deviceCameraTexture.getWidth() * this.camera.aspect * scale.x;
            delta.y *= scale.y;
            delta = rotation.multiplyVec3(delta);
            const position = this.referencedTransform.getWorldPosition().add(delta).add(this.lastOffset);
            this.lastDelta = delta;
            this.transform.setWorldPosition(position);
            Utils_1.Utils.forceUpdateCamera(this.camera);
        }
        getSize() {
            return Math.max(this.camera.size, this.camera.size * this.aspect);
        }
        getStartSize() {
            return this.startSize;
        }
        getAspect() {
            return this.aspect;
        }
        getCamera() {
            return this.camera;
        }
        getLayer() {
            return this.uniqueLayer;
        }
        clearView() {
            this.camera.enabled = false;
            if (!isNull(this.referencedObject)) {
                this.removeLayers(this.referencedObject);
                this.destroyFrames();
                this.referencedObject = null;
            }
        }
        resetZPosition() {
            if (isNull(this.referencedObject)) {
                return;
            }
            const offset = this.referencedTransform.forward.uniformScale(this.depthOffset);
            if (offset.equal(this.lastOffset)) {
                return;
            }
            this.lastOffset = offset;
            this.transform.setWorldPosition(this.referencedTransform.getWorldPosition().add(offset));
        }
        setGizmoPool(gizmoPool) {
            this.gizmoPool = gizmoPool;
        }
        getFrames() {
            return this.frames;
        }
        updateFrames() {
            // this.frames.forEach(frame => frame.updateParentLayer());
            if (isNull(this.referencedObject)) {
                return;
            }
            this.updateLayers(this.referencedObject);
        }
        resetFrames() {
            this.frames = []; // TODO: find another way to delete invalidated objects
            if (!isNull(this.referencedObject)) {
                this.spawnFrames();
            }
        }
        getReferenceHeight() {
            return this.mode === SceneViewerMode.Camera ? this.referencedCamera.size : this.referencedCanvas.getSize().y;
        }
        getReferenceSize() {
            if (this.mode === SceneViewerMode.Camera && !isNull(this.referencedCamera)) {
                return Math.max(this.referencedCamera.size, this.referencedCamera.size * this.referencedCamera.aspect);
            }
            else if (this.mode === SceneViewerMode.Canvas && !isNull(this.referencedCanvas)) {
                return Math.max(this.referencedCanvas.getSize().x, this.referencedCanvas.getSize().y);
            }
            else {
                return 1;
            }
        }
        getReferenceAspect() {
            if (this.mode === SceneViewerMode.Camera && !isNull(this.referencedCamera)) {
                return this.referencedCamera.aspect;
            }
            else if (!isNull(this.referencedCanvas)) {
                const size = this.referencedCanvas.getSize();
                return size.x / size.y;
            }
            else {
                return 1;
            }
        }
        // Checks if there's been changes to reference object since last update
        checkForReferenceDiff() {
            return this.getAspect() !== this.getReferenceAspect()
                || this.getStartSize() !== this.getReferenceHeight()
                || !this.referencedTransformMatrix.equal(this.referencedTransform.getWorldTransform());
        }
        setTree(tree) {
            this.tree = tree;
        }
        updateFramesScale(scale) {
            this.frames.forEach(frame => frame.setScale(scale));
        }
        setupInactiveFrame() {
            this.inactiveFramePool = new InactiveFramePool_1.InactiveFramePool(this.inactiveFrameRef, 2);
        }
        destroyFrames() {
            this.frames.forEach(frame => frame.destroy());
            this.frames = [];
        }
        spawnFrames() {
            if (!this.tree) {
                return;
            }
            this.tree.collectObjects().forEach((obj) => {
                if (this.systemObj[obj.uniqueIdentifier]) {
                    return;
                }
                const newFrame = this.inactiveFramePool.getNewInactiveFrame();
                newFrame.setParent(obj);
                newFrame.setLayer(this.uniqueLayer);
                newFrame.setScale(this.getReferenceSize() * (1 / this.lastScale) / 20);
                this.frames.push(newFrame);
                this.systemObj[newFrame.getSceneObject().uniqueIdentifier] = true;
            });
        }
        resetLayers() {
            this.copyTransform(this.referencedObject);
            this.systemObj = {};
            this.trackedObj = {};
            this.frames.forEach(frame => frame.destroy());
            this.frames = [];
            this.camera.renderLayer = this.uniqueLayer;
            this.updateLayers(this.sceneObject);
            this.registerGizmos();
            this.updateLayers(this.sceneObject);
            this.lights.forEach(light => light.renderLayer = this.uniqueLayer);
            if (this.referencedObject) {
                this.updateLayers(this.referencedObject);
                this.spawnFrames();
            }
        }
        copyTransform(src) {
            this.transform.setWorldTransform(src.getTransform().getWorldTransform());
            this.lastOffset = vec3.zero();
        }
        removeLayers(root) {
            root.layer = root.layer.except(this.uniqueLayer);
            this.trackedObj[root.uniqueIdentifier] = false;
            const childrenCount = root.getChildrenCount();
            for (let i = 0; i < childrenCount; i++) {
                this.removeLayers(root.getChild(i));
            }
        }
        updateLayers(root) {
            if (root.layer.contains(Utils_1.Utils.SYSTEM_LAYER)) {
                return;
            }
            root.layer = this.uniqueLayer; //root.layer.union(this.uniqueLayer);
            this.trackedObj[root.uniqueIdentifier] = true;
            const childrenCount = root.getChildrenCount();
            for (let i = 0; i < childrenCount; i++) {
                this.updateLayers(root.getChild(i));
            }
        }
        copyDeviceProperties(camera) {
            // this.camera.aspect = camera.aspect;
            this.startSize = camera.size;
        }
        copyDevicePropertiesFromCanvas(canvas) {
            const size = canvas.getSize();
            this.camera.size = size.y;
            this.startSize = size.y;
            Utils_1.Utils.forceUpdateCamera(this.camera);
        }
        registerGizmos() {
            this.gizmoPool.getActiveGizmos().forEach((gizmo) => {
                this.systemObj[gizmo.getSceneObject().uniqueIdentifier] = true;
            });
        }
        __initialize() {
            super.__initialize();
            this.uniqueLayer = LayerSet.makeUnique();
            this.mode = SceneViewerMode.None;
            this.aspect = 1;
            this.frames = [];
            this.startSize = 1;
            this.lastOffset = vec3.zero();
            this.lastDelta = vec3.zero();
            this.depthOffset = 50000;
            this.trackedObj = {};
            this.systemObj = {};
            this.lastScale = 1;
            this.onAwake = () => {
                this.camera = this.sceneObject.getComponent("Camera");
                this.transform = this.sceneObject.getTransform();
                if (!this.camera) {
                    throw Error("SceneViewer can't find a Camera component");
                }
                this.setupInactiveFrame();
            };
        }
    };
    __setFunctionName(_classThis, "SceneViewer");
    (() => {
        var _a;
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create((_a = _classSuper[Symbol.metadata]) !== null && _a !== void 0 ? _a : null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        SceneViewer = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return SceneViewer = _classThis;
})();
exports.SceneViewer = SceneViewer;
//# sourceMappingURL=SceneViewer.js.map