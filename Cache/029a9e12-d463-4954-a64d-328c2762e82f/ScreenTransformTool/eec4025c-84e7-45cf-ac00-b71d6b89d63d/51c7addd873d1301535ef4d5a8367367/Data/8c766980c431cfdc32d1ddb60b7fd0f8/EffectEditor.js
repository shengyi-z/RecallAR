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
exports.EffectEditor = void 0;
var __selfType = requireType("./EffectEditor");
function component(target) { target.getTypeName = function () { return __selfType; }; }
const SelectionListener_1 = require("./SelectionListener");
const SCTree_1 = require("./SCTree");
const Utils_1 = require("./Utils");
const SceneUtils_1 = require("./SceneUtils");
const CallScheduler_1 = require("./CallScheduler");
const SelectionPicker_1 = require("./SelectionPicker");
const GizmoPool_1 = require("./GizmoPool");
const AlignerHelper_1 = require("./AlignerHelper");
const OffsetHighlight_1 = require("./OffsetHighlight");
let EffectEditor = (() => {
    let _classDecorators = [component];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = BaseScriptComponent;
    var EffectEditor = _classThis = class extends _classSuper {
        setupSelectionListener() {
            this.selectionListener = new SelectionListener_1.SelectionListener(this);
            this.selectionListener.setOnSelectionUpdate(() => {
                this.update();
            });
        }
        setupSelectionPicker() {
            this.selectionPicker = new SelectionPicker_1.SelectionPicker(this, this.tree, this.sceneViewer.getCamera(), this.selectionListener, this.toolbar, this.gizmoPool);
        }
        setupGizmo() {
            this.gizmoPool = new GizmoPool_1.GizmoPool(this.gizmoRef, 2, this.tree);
            this.gizmoPool.setLayer(this.sceneViewer.getLayer());
            this.gizmoPool.setInteractionCamera(this.sceneViewer.getCamera());
            this.gizmoPool.addAlignmentFunction(this.aligner.align);
            this.gizmoPool.addOnUpdateCallback((data) => {
                this.offsetHighlight.draw(this.gizmoPool.getActiveScreenTransforms(), this.gizmoPool.getActiveFijiScreenTransforms());
                this.tree.syncEditable();
            });
            this.lensRegion.getPinchControl().addOnUpdateCallback(() => {
                if (this.tree.isValidHierarchy) {
                    this.updateGizmoVisualZoom();
                }
            });
            this.sceneViewer.setGizmoPool(this.gizmoPool);
        }
        updateGizmoVisualZoom() {
            this.gizmoPool.setVisualZoom(this.sceneViewer.getReferenceSize() * (1 / this.lensRegion.getPinchControl().getScale()) / 20);
        }
        update() {
            let selectedObjects = SceneUtils_1.SceneUtils.convertObjectsToLensCore(this.selectionListener.getSelectedObject());
            if (!selectedObjects[0]) {
                this.gizmoPool.destroyActiveGizmos();
                this.sceneViewer.resetFrames();
                return;
            }
            if (Utils_1.Utils.isEditor()) {
                this.tree.selectObjects(selectedObjects);
            }
            else {
                this.tree.selectObjects([this.testObject]);
                selectedObjects = [this.testObject];
            }
            if (!selectedObjects[0] || !this.tree.isValidHierarchy || !this.tree.validateObjects(selectedObjects)
                || !this.gizmoPool.isValid()) {
                this.toolbarObjects.forEach(obj => obj.enabled = false);
                this.clearView();
                return;
            }
            selectedObjects = this.tree.getSelectedObjects();
            this.toolbarObjects.forEach(obj => obj.enabled = true);
            if (!this.gizmoPool.isSame(selectedObjects)) {
                this.gizmoPool.createFromObjects(selectedObjects, this.tree.convertSceneObjects(selectedObjects));
            }
            this.gizmoPool.show();
            const camera = this.tree.getRoot().getComponent("Camera");
            const canvas = this.tree.getRoot().getComponent("Canvas");
            if (camera) {
                Utils_1.Utils.forceUpdateCamera(camera);
                this.setAspectForRootCamera(camera);
                this.lensRegion.getAspectControl().setAspect(camera.aspect);
                this.sceneViewer.init(camera);
            }
            else if (canvas) {
                const size = canvas.getSize();
                this.lensRegion.getAspectControl().setAspect(size.x / size.y);
                this.setAspectForRootCanvas(canvas);
                this.sceneViewer.initFromCanvas(canvas);
            }
            else {
                return;
            }
            this.sceneViewer.updateFrames();
            this.gizmoPool.setInteractionCamera(this.sceneViewer.getCamera());
            this.gizmoPool.setLayer(this.sceneViewer.getLayer());
            this.updateSceneViewerParams();
            this.updateGizmoVisualZoom();
            this.selectionPicker.setCamera(this.sceneViewer.getCamera());
            this.selectionPicker.reset();
            this.callScheduler.scheduleCall(() => {
                this.gizmoPool.callForceUpdateForActiveGizmos();
            });
            this.aligner.reset();
        }
        clearView() {
            this.gizmoPool.hide();
            this.offsetHighlight.reset();
            this.sceneViewer.clearView();
        }
        updateSceneViewerParams() {
            if (!this.sceneViewer.isInitialized()) {
                return;
            }
            const aspectControl = this.lensRegion.getAspectControl();
            const pinchControl = this.lensRegion.getPinchControl();
            const panControl = this.lensRegion.getPanControl();
            if (Utils_1.Utils.isEditor()) {
                panControl.forceUpdate();
            }
            const delta = panControl.getWorldDelta();
            this.sceneViewer.setScale(pinchControl.getScale(), aspectControl.getShrinkScale());
            this.sceneViewer.setDelta(delta.uniformScale(this.sceneViewer.getCamera().size / 20));
        }
        bindLensRegionToSceneViewer() {
            this.lensRegion.addOnLensRegionUpdate(() => {
                this.updateSceneViewerParams();
                if (this.tree.isValidHierarchy) {
                    this.aligner.reset();
                }
            });
            if (Utils_1.Utils.isEditor()) {
                this.lensRegion.getAspectControl().setLensStudioPreviewResolution(true);
            }
        }
        setAspectForRootCamera(camera) {
            if (camera.devicePropertyUsage !== Camera.DeviceProperty.Fov && camera.devicePropertyUsage !== Camera.DeviceProperty.None) {
                camera.devicePropertyUsage = Camera.DeviceProperty.None;
                camera.aspect = this.lensRegion.getAspectControl().getAspect();
            }
        }
        setAspectForRootCanvas(canvas) {
            const size = canvas.getSize();
            size.x = this.lensRegion.getAspectControl().getAspect() * size.x;
            // canvas.setSize(size);
        }
        getReferenceAspect() {
            if (isNull(this.tree.getRoot())) {
                return 1;
            }
            const camera = this.tree.getRoot().getComponent("Camera");
            const canvas = this.tree.getRoot().getComponent("Canvas");
            if (camera) {
                return camera.aspect;
            }
            else if (canvas) {
                const size = canvas.getSize();
                return size.x / size.y;
            }
            else {
                return 1;
            }
        }
        __initialize() {
            super.__initialize();
            this.toolbarObjects = [];
            this.onAwake = () => {
                this.callScheduler = new CallScheduler_1.CallScheduler(this, "LateUpdateEvent");
                this.toolbar.forEach(sc => this.toolbarObjects.push(sc.getSceneObject()));
                this.setupSelectionListener();
                this.tree = new SCTree_1.SCTree();
                this.sceneViewer.setTree(this.tree);
                this.bindLensRegionToSceneViewer();
                this.aligner = new AlignerHelper_1.AlignerHelper(this.tree, this.sceneViewer.getCamera(), this.pinLineRenderer, this.guides, this.lensRegion);
                this.offsetHighlight = new OffsetHighlight_1.OffsetHighlight(this.offsetLineRenderer, this.sceneViewer.getCamera());
                this.setupGizmo();
                this.setupSelectionPicker();
                if (!Utils_1.Utils.isEditor()) {
                    this.update();
                }
                this.createEvent("UpdateEvent").bind(() => {
                    this.sceneViewer.resetZPosition();
                    if (!this.tree.reassureValidPath()) {
                        this.gizmoPool.destroyActiveGizmos();
                        this.update();
                        return;
                    }
                    if (this.gizmoPool.isValid()) {
                        this.gizmoPool.updateActiveGizmos();
                        this.offsetHighlight.draw(this.gizmoPool.getActiveScreenTransforms(), this.gizmoPool.getActiveFijiScreenTransforms());
                    }
                    if (this.sceneViewer.checkForReferenceDiff()) {
                        this.update();
                        return;
                    }
                });
            };
        }
    };
    __setFunctionName(_classThis, "EffectEditor");
    (() => {
        var _a;
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create((_a = _classSuper[Symbol.metadata]) !== null && _a !== void 0 ? _a : null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        EffectEditor = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return EffectEditor = _classThis;
})();
exports.EffectEditor = EffectEditor;
//# sourceMappingURL=EffectEditor.js.map