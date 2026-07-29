"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidIncidentStatus = isValidIncidentStatus;
exports.isValidIncidentSeverity = isValidIncidentSeverity;
exports.loadOwnedProject = loadOwnedProject;
exports.validateIncidentAnalysis = validateIncidentAnalysis;
exports.serializeIncident = serializeIncident;
exports.createIncidentForProject = createIncidentForProject;
exports.listIncidentsForProject = listIncidentsForProject;
exports.getIncidentById = getIncidentById;
exports.updateIncidentStatusSeverity = updateIncidentStatusSeverity;
exports.analyzeIncidentWithAi = analyzeIncidentWithAi;
const mongoose_1 = __importDefault(require("mongoose"));
const project_1 = require("../models/project");
const incident_1 = require("../models/incident");
const groq_1 = require("./groq");
const groq_2 = require("../config/groq");
const GROQ_MODEL_NAME = groq_2.GROQ_MODEL;
function isValidIncidentStatus(value) {
    return typeof value === "string" && incident_1.INCIDENT_STATUS_VALUES.includes(value);
}
function isValidIncidentSeverity(value) {
    return typeof value === "string" && incident_1.INCIDENT_SEVERITY_VALUES.includes(value);
}
async function loadOwnedProject(projectId, userId) {
    return project_1.Project.findOne({ _id: projectId, owner: userId });
}
function parseTimelineInput(raw) {
    if (!Array.isArray(raw))
        return [];
    const entries = [];
    for (const item of raw) {
        if (!item || typeof item !== "object")
            continue;
        const summary = typeof item.summary === "string"
            ? item.summary.trim()
            : "";
        if (!summary)
            continue;
        const atRaw = item.at;
        const at = typeof atRaw === "string" || atRaw instanceof Date
            ? new Date(atRaw)
            : new Date();
        if (Number.isNaN(at.getTime()))
            continue;
        const source = typeof item.source === "string"
            ? item.source
            : undefined;
        entries.push({ at, summary, source });
    }
    return entries;
}
function parseRelatedCommits(raw) {
    if (!Array.isArray(raw))
        return [];
    const commits = [];
    for (const item of raw) {
        if (!item || typeof item !== "object")
            continue;
        const sha = typeof item.sha === "string"
            ? item.sha.trim()
            : "";
        const message = typeof item.message === "string"
            ? item.message.trim()
            : "";
        if (!sha || !message)
            continue;
        commits.push({
            sha,
            message,
            author: typeof item.author === "string"
                ? item.author
                : undefined,
            url: typeof item.url === "string"
                ? item.url
                : undefined,
        });
    }
    return commits;
}
function stringArray(raw) {
    if (!Array.isArray(raw))
        return [];
    return raw.filter((x) => typeof x === "string" && x.trim().length > 0);
}
function validateIncidentAnalysis(raw) {
    if (!raw || typeof raw !== "object")
        return null;
    const o = raw;
    const rootCause = typeof o.rootCause === "string" ? o.rootCause.trim() : "";
    if (!rootCause)
        return null;
    const confidence = typeof o.confidence === "number" && !Number.isNaN(o.confidence)
        ? Math.min(100, Math.max(0, o.confidence))
        : null;
    if (confidence === null)
        return null;
    if (!Array.isArray(o.evidence) || !o.evidence.every((e) => typeof e === "string")) {
        return null;
    }
    if (!Array.isArray(o.affectedComponents) ||
        !o.affectedComponents.every((e) => typeof e === "string")) {
        return null;
    }
    if (!Array.isArray(o.recommendedActions) ||
        !o.recommendedActions.every((e) => typeof e === "string")) {
        return null;
    }
    if (!isValidIncidentSeverity(o.severity))
        return null;
    if (!Array.isArray(o.timeline))
        return null;
    const timeline = [];
    for (const entry of o.timeline) {
        if (!entry || typeof entry !== "object")
            return null;
        const summary = typeof entry.summary === "string"
            ? entry.summary.trim()
            : "";
        if (!summary)
            return null;
        const hint = { summary };
        const at = entry.at;
        if (typeof at === "string" && at.trim())
            hint.at = at.trim();
        const source = entry.source;
        if (typeof source === "string" && source.trim())
            hint.source = source.trim();
        timeline.push(hint);
    }
    return {
        rootCause,
        confidence,
        evidence: o.evidence,
        affectedComponents: o.affectedComponents,
        timeline,
        recommendedActions: o.recommendedActions,
        severity: o.severity,
    };
}
function aiTimelineToStored(hints) {
    return hints.map((h) => {
        let at = new Date();
        if (h.at) {
            const parsed = new Date(h.at);
            if (!Number.isNaN(parsed.getTime()))
                at = parsed;
        }
        return { at, summary: h.summary, source: h.source || "ai" };
    });
}
function serializeIncident(doc) {
    return {
        id: doc._id.toString(),
        projectId: doc.projectId.toString(),
        title: doc.title,
        description: doc.description,
        status: doc.status,
        severity: doc.severity,
        startedAt: doc.startedAt,
        resolvedAt: doc.resolvedAt,
        timeline: doc.timeline,
        relatedEvents: doc.relatedEvents,
        relatedCommits: doc.relatedCommits,
        suspectedRootCause: doc.suspectedRootCause,
        rootCauseConfidence: doc.rootCauseConfidence,
        recommendedActions: doc.recommendedActions,
        aiAnalysis: doc.aiAnalysis,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
    };
}
async function createIncidentForProject(userId, input) {
    const project = await loadOwnedProject(input.projectId, userId);
    if (!project) {
        throw Object.assign(new Error("Project not found for this user"), { statusCode: 404 });
    }
    let startedAt = new Date();
    if (input.startedAt) {
        const parsed = new Date(input.startedAt);
        if (!Number.isNaN(parsed.getTime()))
            startedAt = parsed;
    }
    const status = input.status ?? "investigating";
    const resolvedAt = status === "resolved" ? new Date() : undefined;
    return incident_1.Incident.create({
        projectId: project._id,
        title: input.title.trim(),
        description: typeof input.description === "string" ? input.description : "",
        severity: input.severity ?? "medium",
        status,
        startedAt,
        resolvedAt,
        timeline: parseTimelineInput(input.timeline),
        relatedEvents: stringArray(input.relatedEvents),
        relatedCommits: parseRelatedCommits(input.relatedCommits),
    });
}
async function listIncidentsForProject(userId, projectId) {
    const project = await loadOwnedProject(projectId, userId);
    if (!project) {
        throw Object.assign(new Error("Project not found for this user"), { statusCode: 404 });
    }
    return incident_1.Incident.find({ projectId: project._id }).sort({ createdAt: -1 });
}
async function getIncidentById(userId, incidentId) {
    if (!mongoose_1.default.Types.ObjectId.isValid(incidentId)) {
        throw Object.assign(new Error("Invalid incident id"), { statusCode: 400 });
    }
    const incident = await incident_1.Incident.findById(incidentId);
    if (!incident) {
        throw Object.assign(new Error("Incident not found"), { statusCode: 404 });
    }
    const project = await loadOwnedProject(incident.projectId, userId);
    if (!project) {
        throw Object.assign(new Error("Incident not found"), { statusCode: 404 });
    }
    return incident;
}
async function updateIncidentStatusSeverity(userId, incidentId, updates) {
    const incident = await getIncidentById(userId, incidentId);
    if (updates.status !== undefined) {
        incident.status = updates.status;
        if (updates.status === "resolved" && !incident.resolvedAt) {
            incident.resolvedAt = new Date();
        }
        if (updates.status !== "resolved") {
            incident.resolvedAt = undefined;
        }
    }
    if (updates.severity !== undefined) {
        incident.severity = updates.severity;
    }
    await incident.save();
    return incident;
}
async function analyzeIncidentWithAi(userId, incidentId, overrides = {}) {
    const incident = await getIncidentById(userId, incidentId);
    const project = await project_1.Project.findById(incident.projectId);
    if (!project) {
        throw Object.assign(new Error("Project not found"), { statusCode: 404 });
    }
    const overrideCommits = parseRelatedCommits(overrides.recentCommits);
    const overrideEvents = stringArray(overrides.deploymentsOrEvents);
    const overrideTimeline = parseTimelineInput(overrides.timeline);
    const overrideFiles = stringArray(overrides.affectedServicesOrFiles);
    const context = {
        title: incident.title,
        description: incident.description,
        errorDescription: typeof overrides.errorDescription === "string"
            ? overrides.errorDescription
            : incident.description,
        recentCommits: overrideCommits.length > 0 ? overrideCommits : incident.relatedCommits,
        deploymentsOrEvents: overrideEvents.length > 0 ? overrideEvents : incident.relatedEvents,
        affectedServicesOrFiles: overrideFiles,
        timeline: overrideTimeline.length > 0
            ? overrideTimeline.map((t) => ({
                at: t.at.toISOString(),
                summary: t.summary,
                source: t.source,
            }))
            : incident.timeline.map((t) => ({
                at: t.at.toISOString(),
                summary: t.summary,
                source: t.source,
            })),
        project: {
            repoName: project.repo || project.name || "unknown",
            description: project.description,
            stack: project.stack || [],
        },
    };
    const raw = await groq_1.groqService.analyzeIncident(context);
    const validated = validateIncidentAnalysis(raw);
    if (!validated) {
        throw Object.assign(new Error("AI response failed validation"), { statusCode: 502 });
    }
    const storedTimeline = aiTimelineToStored(validated.timeline);
    incident.suspectedRootCause = validated.rootCause;
    incident.rootCauseConfidence = validated.confidence;
    incident.recommendedActions = validated.recommendedActions;
    incident.aiAnalysis = {
        ...validated,
        timeline: storedTimeline,
        analyzedAt: new Date(),
        model: GROQ_MODEL_NAME,
    };
    if (incident.status === "investigating") {
        incident.status = "identified";
    }
    await incident.save();
    return incident;
}
