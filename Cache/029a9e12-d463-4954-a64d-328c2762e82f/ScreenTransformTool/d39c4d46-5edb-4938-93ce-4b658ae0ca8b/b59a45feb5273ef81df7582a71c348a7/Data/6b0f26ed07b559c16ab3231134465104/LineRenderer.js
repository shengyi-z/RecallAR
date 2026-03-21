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
exports.LineRenderer = void 0;
var __selfType = requireType("./LineRenderer");
function component(target) { target.getTypeName = function () { return __selfType; }; }
let LineRenderer = (() => {
    let _classDecorators = [component];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = BaseScriptComponent;
    var LineRenderer = _classThis = class extends _classSuper {
        addLine(from, to) {
            this.lines.push([from, to]);
            this.skipReset = false;
        }
        reset() {
            if (this.skipReset) {
                return;
            }
            this.skipReset = true;
            for (let i = 0; i < this.lines.length; i++) {
                this.addVectorAt(this.startPointTexData, i, this.zero);
                this.addVectorAt(this.endPointTexData, i, this.zero);
            }
            this.lines = [];
            this.update();
        }
        update() {
            if (this.updateWithCameraSize) {
                this.linesMat.mainPass.cameraSize = this.camera.size;
            }
            this.lines.forEach((line, idx) => {
                this.addVectorAt(this.startPointTexData, idx, line[0]);
                this.addVectorAt(this.endPointTexData, idx, line[1]);
            });
            this.startPointTexProvider.setPixelsFloat32(0, 0, this.DIMENTION, this.DIMENTION, this.startPointTexData);
            this.endPointTexProvider.setPixelsFloat32(0, 0, this.DIMENTION, this.DIMENTION, this.endPointTexData);
        }
        addVectorAt(data, index, position) {
            data[4 * index] = position.x;
            data[4 * index + 1] = position.y;
            data[4 * index + 2] = position.z;
            data[4 * index + 3] = 0;
        }
        __initialize() {
            super.__initialize();
            this.zero = vec3.zero();
            this.skipReset = false;
            this.DIMENTION = 100;
            this.CHANNELS = 4;
            this.lines = [];
            this.onAwake = () => {
                const startTexture = ProceduralTextureProvider.create(this.DIMENTION, this.DIMENTION, Colorspace.RGBAFloat);
                this.startPointTexProvider = startTexture.control;
                this.startPointTexData = new Float32Array(this.DIMENTION * this.DIMENTION * this.CHANNELS);
                this.startPoint.control = this.startPointTexProvider;
                const endTexture = ProceduralTextureProvider.create(this.DIMENTION, this.DIMENTION, Colorspace.RGBAFloat);
                this.endPointTexProvider = endTexture.control;
                this.endPointTexData = new Float32Array(this.DIMENTION * this.DIMENTION * this.CHANNELS);
                this.endPoint.control = this.endPointTexProvider;
                this.linesMat.mainPass.instanceCount = this.DIMENTION * this.DIMENTION;
            };
        }
    };
    __setFunctionName(_classThis, "LineRenderer");
    (() => {
        var _a;
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create((_a = _classSuper[Symbol.metadata]) !== null && _a !== void 0 ? _a : null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        LineRenderer = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return LineRenderer = _classThis;
})();
exports.LineRenderer = LineRenderer;
//# sourceMappingURL=LineRenderer.js.map