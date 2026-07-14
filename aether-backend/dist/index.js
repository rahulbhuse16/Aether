"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const connectDB_1 = require("./utils/connectDB");
const cors_1 = __importDefault(require("cors"));
const auth_1 = __importDefault(require("./router/auth"));
const github_1 = __importDefault(require("./router/github"));
const project_1 = __importDefault(require("./router/project"));
const dashboard_1 = __importDefault(require("./router/dashboard"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use('/api/v1/auth', auth_1.default);
app.use('/api/v1/projects', project_1.default);
app.use('/api/v1/github', github_1.default);
app.use('/api/v1/dashboard', dashboard_1.default);
(0, connectDB_1.connectDB)();
app.listen(5000, () => {
    console.log("running on port 5000");
});
