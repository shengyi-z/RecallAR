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
exports.TouchManager = void 0;
var __selfType = requireType("./TouchManager");
function component(target) { target.getTypeName = function () { return __selfType; }; }
let TouchManager = (() => {
    let _classDecorators = [component];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = BaseScriptComponent;
    var TouchManager = _classThis = class extends _classSuper {
        register(receiver, parent = null) {
            receiver.trackedEvents.forEach((event) => {
                if (this.registeredEvents[event]) {
                    return;
                }
                this.registeredEvents[event] = this.createEvent(event);
                this.registeredEvents[event].bind(this.notify);
            });
            if (parent) {
                const parentIndex = this.leafReceiverIds.indexOf(parent.uniqueIdentifier);
                if (parentIndex !== -1) {
                    this.leafReceiverIds.splice(parentIndex, 1);
                }
                if (this.nonLeafReceiverIds.indexOf(parent.uniqueIdentifier) === -1) {
                    this.nonLeafReceiverIds.push(parent.uniqueIdentifier);
                }
                this.idToObject[parent.uniqueIdentifier] = parent;
            }
            const receiverIndex = this.nonLeafReceiverIds.indexOf(receiver.uniqueIdentifier);
            if (receiverIndex === -1) {
                this.leafReceiverIds.push(receiver.uniqueIdentifier);
            }
            this.idToObject[receiver.uniqueIdentifier] = receiver;
        }
        __initialize() {
            super.__initialize();
            this.registeredEvents = {};
            this.idToObject = {};
            this.leafReceiverIds = [];
            this.nonLeafReceiverIds = [];
            this.onAwake = () => {
            };
            this.notify = (eventData) => {
                const processedObjects = {};
                const queue = this.leafReceiverIds.map((id) => this.idToObject[id]);
                while (queue.length) {
                    const receiver = queue.shift();
                    if (isNull(receiver)) {
                        continue;
                    }
                    queue.push(receiver.touchParent);
                    if (!receiver.trackedEvents.some(event => event === eventData.getTypeName())) {
                        continue;
                    }
                    if (processedObjects[receiver.uniqueIdentifier]) {
                        continue;
                    }
                    processedObjects[receiver.uniqueIdentifier] = true;
                    if (receiver.eventFilter(eventData)) {
                        return;
                    }
                }
            };
        }
    };
    __setFunctionName(_classThis, "TouchManager");
    (() => {
        var _a;
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create((_a = _classSuper[Symbol.metadata]) !== null && _a !== void 0 ? _a : null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        TouchManager = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return TouchManager = _classThis;
})();
exports.TouchManager = TouchManager;
//# sourceMappingURL=TouchManager.js.map