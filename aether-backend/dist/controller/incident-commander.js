"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createIncident = createIncident;
exports.getIncidentsByProject = getIncidentsByProject;
exports.getIncident = getIncident;
exports.patchIncident = patchIncident;
exports.analyzeIncident = analyzeIncident;
const user_1 = require("../models/user");
const incident_commander_1 = require("../services/incident-commander");
async function resolveUser(userId) {
    if (typeof userId !== "string" || !userId.trim()) {
        return null;
    }
    return user_1.User.findById(userId.trim());
}
function getErrorStatus(err, fallback = 500) {
    const code = err?.statusCode;
    return typeof code === "number" ? code : fallback;
}
/** POST /api/v1/incidents */
async function createIncident(req, res) {
    try {
        const { userId, projectId, title, description, severity, status, startedAt, timeline, relatedEvents, relatedCommits } = req.body;
        const user = await resolveUser(userId);
        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        if (typeof projectId !== "string" || !projectId.trim()) {
            return res.status(400).json({ success: false, message: "projectId is required" });
        }
        if (typeof title !== "string" || !title.trim()) {
            return res.status(400).json({ success: false, message: "title is required" });
        }
        if (severity !== undefined && !(0, incident_commander_1.isValidIncidentSeverity)(severity)) {
            return res.status(400).json({
                success: false,
                message: "severity must be low, medium, high, or critical",
            });
        }
        if (status !== undefined && !(0, incident_commander_1.isValidIncidentStatus)(status)) {
            return res.status(400).json({
                success: false,
                message: "status must be investigating, identified, or resolved",
            });
        }
        const incident = await (0, incident_commander_1.createIncidentForProject)(String(user._id), {
            projectId: projectId.trim(),
            title,
            description,
            severity,
            status,
            startedAt,
            timeline,
            relatedEvents,
            relatedCommits,
        });
        return res.status(201).json({ success: true, data: (0, incident_commander_1.serializeIncident)(incident) });
    }
    catch (err) {
        console.error("[createIncident]", err);
        const status = getErrorStatus(err);
        return res.status(status).json({
            success: false,
            message: err.message || "Failed to create incident",
        });
    }
}
/** GET /api/v1/incidents/project/:projectId */
async function getIncidentsByProject(req, res) {
    try {
        const user = await resolveUser(req.query.userId);
        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        const { projectId } = req.params;
        if (!projectId) {
            return res.status(400).json({ success: false, message: "projectId is required" });
        }
        const incidents = await (0, incident_commander_1.listIncidentsForProject)(String(user._id), projectId);
        return res.status(200).json({
            success: true,
            data: incidents.map(incident_commander_1.serializeIncident),
        });
    }
    catch (err) {
        console.error("[getIncidentsByProject]", err);
        const status = getErrorStatus(err);
        return res.status(status).json({
            success: false,
            message: err.message || "Failed to fetch incidents",
        });
    }
}
/** GET /api/v1/incidents/:incidentId */
async function getIncident(req, res) {
    try {
        const user = await resolveUser(req.query.userId);
        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        const incident = await (0, incident_commander_1.getIncidentById)(String(user._id), req.params.incidentId);
        return res.status(200).json({ success: true, data: (0, incident_commander_1.serializeIncident)(incident) });
    }
    catch (err) {
        console.error("[getIncident]", err);
        const status = getErrorStatus(err);
        return res.status(status).json({
            success: false,
            message: err.message || "Failed to fetch incident",
        });
    }
}
/** PATCH /api/v1/incidents/:incidentId */
async function patchIncident(req, res) {
    try {
        const { userId, status, severity } = req.body;
        const user = await resolveUser(userId);
        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        if (status === undefined && severity === undefined) {
            return res.status(400).json({
                success: false,
                message: "At least one of status or severity is required",
            });
        }
        if (status !== undefined && !(0, incident_commander_1.isValidIncidentStatus)(status)) {
            return res.status(400).json({
                success: false,
                message: "status must be investigating, identified, or resolved",
            });
        }
        if (severity !== undefined && !(0, incident_commander_1.isValidIncidentSeverity)(severity)) {
            return res.status(400).json({
                success: false,
                message: "severity must be low, medium, high, or critical",
            });
        }
        const incident = await (0, incident_commander_1.updateIncidentStatusSeverity)(String(user._id), req.params.incidentId, {
            status,
            severity,
        });
        return res.status(200).json({ success: true, data: (0, incident_commander_1.serializeIncident)(incident) });
    }
    catch (err) {
        console.error("[patchIncident]", err);
        const status = getErrorStatus(err);
        return res.status(status).json({
            success: false,
            message: err.message || "Failed to update incident",
        });
    }
}
/** POST /api/v1/incidents/:incidentId/analyze */
async function analyzeIncident(req, res) {
    try {
        const { userId, errorDescription, recentCommits, deploymentsOrEvents, affectedServicesOrFiles, timeline, } = req.body;
        const user = await resolveUser(userId);
        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        const incident = await (0, incident_commander_1.analyzeIncidentWithAi)(String(user._id), req.params.incidentId, {
            errorDescription,
            recentCommits,
            deploymentsOrEvents,
            affectedServicesOrFiles,
            timeline,
        });
        return res.status(200).json({ success: true, data: (0, incident_commander_1.serializeIncident)(incident) });
    }
    catch (err) {
        console.error("[analyzeIncident]", err);
        const status = getErrorStatus(err);
        return res.status(status).json({
            success: false,
            message: err.message || "Failed to analyze incident",
        });
    }
}
