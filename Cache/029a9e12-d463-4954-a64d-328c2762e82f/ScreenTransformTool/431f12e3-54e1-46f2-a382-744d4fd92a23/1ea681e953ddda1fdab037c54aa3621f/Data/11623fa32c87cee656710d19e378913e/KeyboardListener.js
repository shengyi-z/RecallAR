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
exports.KeyboardListener = void 0;
var __selfType = requireType("./KeyboardListener");
function component(target) { target.getTypeName = function () { return __selfType; }; }
const Utils_1 = require("./Utils");
let KeyboardListener = (() => {
    let _classDecorators = [component];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = BaseScriptComponent;
    var KeyboardListener = _classThis = class extends _classSuper {
        //@ts-ignore
        static isKeyPressed(key) {
            return KeyboardListener.isPressed[key];
        }
        //@ts-ignore
        static subscribeToKey(key, onPressed, onReleased) {
            if (!KeyboardListener.onPressedSubs[key]) {
                KeyboardListener.onPressedSubs[key] = [];
                KeyboardListener.onReleasedSubs[key] = [];
            }
            KeyboardListener.onPressedSubs[key].push(onPressed);
            KeyboardListener.onReleasedSubs[key].push(onReleased);
        }
        createKeyboardEvents() {
            //@ts-ignore
            this.createEvent("KeyPressedEvent").bind(this.onKeyPressed);
            //@ts-ignore
            this.createEvent("KeyReleasedEvent").bind(this.onKeyReleased);
        }
        __initialize() {
            super.__initialize();
            this.onAwake = () => {
                if (Utils_1.Utils.isEditor()) {
                    this.createKeyboardEvents();
                }
            };
            this.onKeyPressed = (eventData) => {
                KeyboardListener.isPressed[eventData.key] = true;
                if (KeyboardListener.onPressedSubs[eventData.key]) {
                    KeyboardListener.onPressedSubs[eventData.key].forEach(cb => cb(eventData));
                }
            };
            this.onKeyReleased = (eventData) => {
                KeyboardListener.isPressed[eventData.key] = false;
                if (KeyboardListener.onReleasedSubs[eventData.key]) {
                    KeyboardListener.onReleasedSubs[eventData.key].forEach(cb => cb(eventData));
                }
            };
        }
    };
    __setFunctionName(_classThis, "KeyboardListener");
    (() => {
        var _a;
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create((_a = _classSuper[Symbol.metadata]) !== null && _a !== void 0 ? _a : null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        KeyboardListener = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
    })();
    _classThis.isPressed = {};
    _classThis.onPressedSubs = {};
    _classThis.onReleasedSubs = {};
    (() => {
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return KeyboardListener = _classThis;
})();
exports.KeyboardListener = KeyboardListener;
//# sourceMappingURL=KeyboardListener.js.map