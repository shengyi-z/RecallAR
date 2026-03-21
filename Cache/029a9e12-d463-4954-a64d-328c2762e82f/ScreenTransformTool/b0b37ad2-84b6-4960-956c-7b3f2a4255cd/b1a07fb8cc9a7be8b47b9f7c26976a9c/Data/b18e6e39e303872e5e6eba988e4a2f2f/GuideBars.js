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
exports.GuideBars = void 0;
var __selfType = requireType("./GuideBars");
function component(target) { target.getTypeName = function () { return __selfType; }; }
const GuidePool_1 = require("./GuidePool");
const Guide_1 = require("./Guide");
const CallScheduler_1 = require("../CallScheduler");
const LensRegion_1 = require("../../Common/Utilities/LensRegion/LensRegion");
const Config_1 = require("../Config");
const Gizmo_1 = require("../Gizmo/Gizmo");
let GuideBars = (() => {
    let _classDecorators = [component];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = BaseScriptComponent;
    var GuideBars = _classThis = class extends _classSuper {
        onAwake() {
            this.guidePool = new GuidePool_1.GuidePool(this.horizontalGuideRef, this.verticalGuideRef);
            this.callScheduler = new CallScheduler_1.CallScheduler(this.script, "LateUpdateEvent");
            this.setupInteractions();
            Config_1.Config.isGuideEnabled.addCallback((value) => {
                if (!value) {
                    this.guideLines.reset();
                }
                else {
                    this.drawLines();
                }
            });
            this.lensRegion.addOnLensRegionUpdate(() => {
                this.callScheduler.scheduleCall(() => this.drawLines());
                this.drawLines();
            });
        }
        getScreenPoints() {
            if (!Config_1.Config.isSnappingToGuideEnabled.value) {
                return [];
            }
            this.guidePointsBuffer = [];
            let horizontalIdx = 0;
            let verticalIdx = 0;
            this.guides.forEach((guide) => {
                if (guide.getType() === Guide_1.GuideType.Vertical) {
                    if (verticalIdx >= this.guidePointsBuffer.length) {
                        this.guidePointsBuffer.push(vec2.zero());
                    }
                    this.guidePointsBuffer[verticalIdx].x = guide.getScreenPosition().x;
                    verticalIdx += 1;
                }
                else {
                    if (horizontalIdx >= this.guidePointsBuffer.length) {
                        this.guidePointsBuffer.push(vec2.zero());
                    }
                    this.guidePointsBuffer[horizontalIdx].y = guide.getScreenPosition().y;
                    horizontalIdx += 1;
                }
            });
            return this.guidePointsBuffer;
        }
        setupInteractions() {
            this.topInteraction = this.topBar.getComponent("InteractionComponent");
            this.leftInteraction = this.leftBar.getComponent("InteractionComponent");
            this.topInteraction.onTouchStart.add((eventData) => {
                if (!Config_1.Config.isGuideEnabled.value || LensRegion_1.LensRegion.isBusy || Gizmo_1.Gizmo.isBusy || !eventData.position.lengthSquared) {
                    return;
                }
                this.mouseHint.setRoundness(0);
                this.mouseHint.enableStroke(true);
                this.mouseHint.show();
                this.mouseHint.updateFromMousePosition(eventData.position);
                this.activeGuide = this.guidePool.getHorizontalGuide();
                this.guides.push(this.activeGuide);
                this.activeGuide.addOnUpdate(() => this.drawLines());
                this.activeGuide.visualEnabled = true;
                this.activeGuide.setScreenPosition(eventData.position);
                this.mouseHint.setText(this.activeGuide.getHint());
                this.callScheduler.scheduleCall(() => { this.drawLines(); });
            });
            this.topInteraction.onTouchMove.add((eventData) => {
                if (!this.activeGuide) {
                    return;
                }
                this.mouseHint.updateFromMousePosition(eventData.position);
                this.activeGuide.setScreenPosition(eventData.position);
                this.mouseHint.setText(this.activeGuide.getHint());
                this.callScheduler.scheduleCall(() => { this.drawLines(); });
            });
            this.topInteraction.onTouchEnd.add((eventData) => {
                if (!this.activeGuide) {
                    return;
                }
                this.mouseHint.updateFromMousePosition(eventData.position);
                this.activeGuide.setScreenPosition(eventData.position);
                this.mouseHint.setText(this.activeGuide.getHint());
                this.callScheduler.scheduleCall(() => { this.drawLines(); });
                this.mouseHint.hide();
                this.activeGuide = null;
            });
            this.leftInteraction.onTouchStart.add((eventData) => {
                if (!Config_1.Config.isGuideEnabled.value || LensRegion_1.LensRegion.isBusy || Gizmo_1.Gizmo.isBusy || !eventData.position.lengthSquared) {
                    return;
                }
                this.mouseHint.setRoundness(0);
                this.mouseHint.enableStroke(true);
                this.mouseHint.show();
                this.mouseHint.updateFromMousePosition(eventData.position);
                this.activeGuide = this.guidePool.getVerticalGuide();
                this.guides.push(this.activeGuide);
                this.activeGuide.addOnUpdate(() => this.drawLines());
                this.activeGuide.visualEnabled = true;
                this.activeGuide.setScreenPosition(eventData.position);
                this.mouseHint.setText(this.activeGuide.getHint());
                this.callScheduler.scheduleCall(() => { this.drawLines(); });
            });
            this.leftInteraction.onTouchMove.add((eventData) => {
                if (!this.activeGuide) {
                    return;
                }
                if (!Config_1.Config.isGuideEnabled.value || LensRegion_1.LensRegion.isBusy || Gizmo_1.Gizmo.isBusy) {
                    this.activeGuide.visualEnabled = false;
                    this.mouseHint.hide();
                    this.activeGuide = null;
                    return;
                }
                this.mouseHint.updateFromMousePosition(eventData.position);
                this.activeGuide.setScreenPosition(eventData.position);
                this.mouseHint.setText(this.activeGuide.getHint());
                this.callScheduler.scheduleCall(() => { this.drawLines(); });
            });
            this.leftInteraction.onTouchEnd.add((eventData) => {
                if (!this.activeGuide) {
                    return;
                }
                this.activeGuide.setScreenPosition(eventData.position);
                this.callScheduler.scheduleCall(() => { this.drawLines(); });
                this.mouseHint.updateFromMousePosition(eventData.position);
                this.mouseHint.setText(this.activeGuide.getHint());
                this.mouseHint.hide();
                this.activeGuide = null;
            });
        }
        drawLines() {
            if (!Config_1.Config.isGuideEnabled.value) {
                return;
            }
            this.guideLines.reset();
            this.guides.forEach((guide) => {
                const pointA = guide.getWorldCenter();
                const pointB = guide.getWorldCenter();
                if (guide.getType() === Guide_1.GuideType.Vertical) {
                    pointA.y = 10000;
                    pointB.y = -10000;
                }
                else {
                    pointA.x = -10000;
                    pointB.x = 10000;
                }
                this.guideLines.addLine(pointA, pointB);
            });
            this.guideLines.update();
        }
        __initialize() {
            super.__initialize();
            this.activeGuide = null;
            this.guides = [];
            this.guidePointsBuffer = [];
        }
    };
    __setFunctionName(_classThis, "GuideBars");
    (() => {
        var _a;
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create((_a = _classSuper[Symbol.metadata]) !== null && _a !== void 0 ? _a : null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        GuideBars = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return GuideBars = _classThis;
})();
exports.GuideBars = GuideBars;
//# sourceMappingURL=GuideBars.js.map