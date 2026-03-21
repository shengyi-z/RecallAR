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
exports.Guide = exports.GuideType = void 0;
var __selfType = requireType("./Guide");
function component(target) { target.getTypeName = function () { return __selfType; }; }
var GuideType;
(function (GuideType) {
    GuideType[GuideType["Horizontal"] = 0] = "Horizontal";
    GuideType[GuideType["Vertical"] = 1] = "Vertical";
})(GuideType || (exports.GuideType = GuideType = {}));
let Guide = (() => {
    let _classDecorators = [component];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = BaseScriptComponent;
    var Guide = _classThis = class extends _classSuper {
        onAwake() {
            this.screenTransform = this.sceneObject.getComponent("ScreenTransform");
            this.position = this.screenTransform.anchors.getCenter();
            this.image = this.sceneObject.getComponent("Image");
            this.interaction = this.sceneObject.getComponent("InteractionComponent");
            const position = this.screenTransform.position;
            position.z = 15;
            this.screenTransform.position = position;
            this.setupInteractions();
        }
        addOnUpdate(cb) {
            this.callbacks.push(cb);
        }
        set visualEnabled(value) {
            this.image.enabled = value;
        }
        setType(type) {
            this.type = type;
        }
        getSingleAxisPosition() {
            if (this.getType() === GuideType.Vertical) {
                return this.position.x;
            }
            else {
                return this.position.y;
            }
        }
        getPosition() {
            return this.position;
        }
        getScreenPosition() {
            return this.screenTransform.localPointToScreenPoint(vec2.zero());
        }
        setScreenPosition(position) {
            this.setPosition(this.screenTransform.screenPointToParentPoint(position));
        }
        setPosition(position) {
            if (this.type === GuideType.Vertical) {
                this.position.x = position.x;
            }
            else {
                this.position.y = position.y;
            }
            this.screenTransform.anchors.setCenter(this.position);
            this.doCallbacks();
        }
        getWorldCenter() {
            return this.screenTransform.localPointToWorldPoint(vec2.zero());
        }
        getType() {
            return this.type;
        }
        getHint() {
            if (this.getType() === GuideType.Vertical) {
                return "X: " + this.getSingleAxisPosition().toFixed(4);
            }
            else {
                return "Y: " + this.getSingleAxisPosition().toFixed(4);
            }
        }
        doCallbacks() {
            this.callbacks.forEach((cb) => {
                cb && cb();
            });
        }
        setupInteractions() {
            this.interaction.onTouchStart.add((eventData) => {
                this.mouseHint.show();
                this.setScreenPosition(eventData.position);
                this.mouseHint.updateFromMousePosition(eventData.position);
                this.mouseHint.setText(this.getHint());
            });
            this.interaction.onTouchMove.add((eventData) => {
                this.setScreenPosition(eventData.position);
                this.mouseHint.updateFromMousePosition(eventData.position);
                this.mouseHint.setText(this.getHint());
            });
            this.interaction.onTouchEnd.add((eventData) => {
                this.setScreenPosition(eventData.position);
                this.mouseHint.updateFromMousePosition(eventData.position);
                this.mouseHint.setText(this.getHint());
                this.mouseHint.hide();
            });
        }
        __initialize() {
            super.__initialize();
            this.type = GuideType.Horizontal;
            this.position = vec2.zero();
            this.callbacks = [];
        }
    };
    __setFunctionName(_classThis, "Guide");
    (() => {
        var _a;
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create((_a = _classSuper[Symbol.metadata]) !== null && _a !== void 0 ? _a : null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        Guide = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return Guide = _classThis;
})();
exports.Guide = Guide;
//# sourceMappingURL=Guide.js.map