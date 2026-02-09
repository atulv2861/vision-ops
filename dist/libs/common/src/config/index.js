"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigModule = exports.appConfig = void 0;
var app_config_1 = require("./app.config");
Object.defineProperty(exports, "appConfig", { enumerable: true, get: function () { return __importDefault(app_config_1).default; } });
var config_module_1 = require("./config.module");
Object.defineProperty(exports, "ConfigModule", { enumerable: true, get: function () { return config_module_1.ConfigModule; } });
//# sourceMappingURL=index.js.map