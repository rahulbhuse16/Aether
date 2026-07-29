import { Request, Response } from "express";
import { User } from "../models/user";
import {
  analyzeIncidentWithAi,
  createIncidentForProject,
  getIncidentById,
  isValidIncidentSeverity,
  isValidIncidentStatus,
  listIncidentsForProject,
  serializeIncident,
  updateIncidentStatusSeverity,
} from "../services/incident-commander";

async function resolveUser(userId: unknown) {
  if (typeof userId !== "string" || !userId.trim()) {
    return null;
  }
  return User.findById(userId.trim());
}

function getErrorStatus(err: unknown, fallback = 500): number {
  const code = (err as { statusCode?: number })?.statusCode;
  return typeof code === "number" ? code : fallback;
}

/** POST /api/v1/incidents */
export async function createIncident(req: Request, res: Response) {
  try {
    const { userId, projectId, title, description, severity, status, startedAt, timeline, relatedEvents, relatedCommits } =
      req.body;

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
    if (severity !== undefined && !isValidIncidentSeverity(severity)) {
      return res.status(400).json({
        success: false,
        message: "severity must be low, medium, high, or critical",
      });
    }
    if (status !== undefined && !isValidIncidentStatus(status)) {
      return res.status(400).json({
        success: false,
        message: "status must be investigating, identified, or resolved",
      });
    }

    const incident = await createIncidentForProject(String(user._id), {
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

    return res.status(201).json({ success: true, data: serializeIncident(incident) });
  } catch (err) {
    console.error("[createIncident]", err);
    const status = getErrorStatus(err);
    return res.status(status).json({
      success: false,
      message: (err as Error).message || "Failed to create incident",
    });
  }
}

/** GET /api/v1/incidents/project/:projectId */
export async function getIncidentsByProject(req: Request, res: Response) {
  try {
    const user = await resolveUser(req.query.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { projectId } = req.params;
    if (!projectId) {
      return res.status(400).json({ success: false, message: "projectId is required" });
    }

    const incidents = await listIncidentsForProject(String(user._id), projectId);
    return res.status(200).json({
      success: true,
      data: incidents.map(serializeIncident),
    });
  } catch (err) {
    console.error("[getIncidentsByProject]", err);
    const status = getErrorStatus(err);
    return res.status(status).json({
      success: false,
      message: (err as Error).message || "Failed to fetch incidents",
    });
  }
}

/** GET /api/v1/incidents/:incidentId */
export async function getIncident(req: Request, res: Response) {
  try {
    const user = await resolveUser(req.query.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const incident = await getIncidentById(String(user._id), req.params.incidentId);
    return res.status(200).json({ success: true, data: serializeIncident(incident) });
  } catch (err) {
    console.error("[getIncident]", err);
    const status = getErrorStatus(err);
    return res.status(status).json({
      success: false,
      message: (err as Error).message || "Failed to fetch incident",
    });
  }
}

/** PATCH /api/v1/incidents/:incidentId */
export async function patchIncident(req: Request, res: Response) {
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
    if (status !== undefined && !isValidIncidentStatus(status)) {
      return res.status(400).json({
        success: false,
        message: "status must be investigating, identified, or resolved",
      });
    }
    if (severity !== undefined && !isValidIncidentSeverity(severity)) {
      return res.status(400).json({
        success: false,
        message: "severity must be low, medium, high, or critical",
      });
    }

    const incident = await updateIncidentStatusSeverity(String(user._id), req.params.incidentId, {
      status,
      severity,
    });

    return res.status(200).json({ success: true, data: serializeIncident(incident) });
  } catch (err) {
    console.error("[patchIncident]", err);
    const status = getErrorStatus(err);
    return res.status(status).json({
      success: false,
      message: (err as Error).message || "Failed to update incident",
    });
  }
}

/** POST /api/v1/incidents/:incidentId/analyze */
export async function analyzeIncident(req: Request, res: Response) {
  try {
    const {
      userId,
      errorDescription,
      recentCommits,
      deploymentsOrEvents,
      affectedServicesOrFiles,
      timeline,
    } = req.body;

    const user = await resolveUser(userId);
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const incident = await analyzeIncidentWithAi(String(user._id), req.params.incidentId, {
      errorDescription,
      recentCommits,
      deploymentsOrEvents,
      affectedServicesOrFiles,
      timeline,
    });

    return res.status(200).json({ success: true, data: serializeIncident(incident) });
  } catch (err) {
    console.error("[analyzeIncident]", err);
    const status = getErrorStatus(err);
    return res.status(status).json({
      success: false,
      message: (err as Error).message || "Failed to analyze incident",
    });
  }
}
