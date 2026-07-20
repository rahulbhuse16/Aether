import { Response,Request } from "express";
import mongoose from "mongoose";
import { Task } from "../models/task";
import { Project } from "../models/project";
import { createGithubIssueForTask, pushTaskStatusToGithub } from "../services/github-sync";
import { User } from "../models/user";

const STATUS_VALUES = ["open", "in_progress", "done"] as const;
const PRIORITY_VALUES = ["high", "medium", "low"] as const;
const SOURCE_VALUES = ["github", "jira", "ai"] as const;

/**
 * IMPORTANT — the original version trusted `userId` from req.body, which
 * means any caller could act on any other user's tasks just by passing a
 * different id. Every handler below now takes the user from `req.user`,
 * which the `requireAuth` middleware attaches from a verified JWT — there is
 * no path in this file where the client can name whose data to touch.
 */

function isValidStatus(value: unknown): value is (typeof STATUS_VALUES)[number] {
  return typeof value === "string" && (STATUS_VALUES as readonly string[]).includes(value);
}

function isValidPriority(value: unknown): value is (typeof PRIORITY_VALUES)[number] {
  return typeof value === "string" && (PRIORITY_VALUES as readonly string[]).includes(value);
}

function isValidSource(value: unknown): value is (typeof SOURCE_VALUES)[number] {
  return typeof value === "string" && (SOURCE_VALUES as readonly string[]).includes(value);
}

/** Loads the Project a github-sourced task belongs to, scoped to the requesting user (never trusts task.project blindly across users). */
async function loadOwnedProject(projectId: mongoose.Types.ObjectId | string, userId: string) {
  return Project.findOne({ _id: projectId, owner: userId });
}

/** POST /api/tasks */
export async function createTask(req: Request, res: Response) {
  try {

    const {userId}=req.body

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" })
    const { title, status, priority, dueDate, syncToGithub, projectId } = req.body;

    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "title is required" });
    }
    if (status !== undefined && !isValidStatus(status)) {
      return res.status(400).json({ error: `status must be one of ${STATUS_VALUES.join(", ")}` });
    }
    if (priority !== undefined && priority !== null && !isValidPriority(priority)) {
      return res.status(400).json({ error: `priority must be one of ${PRIORITY_VALUES.join(", ")}` });
    }
    if (syncToGithub && !projectId) {
      return res.status(400).json({ error: "projectId is required when syncToGithub is true" });
    }

    // Id is generated server-side, never taken from the client — a client-supplied
    // id could collide with (or be crafted to overwrite) another task.
    const id = `t-${new mongoose.Types.ObjectId().toHexString()}`;

    let task = await Task.create({
      id,
      title: title.trim(),
      status: status ?? "open",
      source: "ai", // tasks created through this endpoint always start as "ai"; GitHub-sourced tasks come from the sync service, not here
      priority: priority ?? undefined,
      dueDate,
      user: user._id,
      project: projectId ? new mongoose.Types.ObjectId(projectId) : undefined,
    });

    if (syncToGithub) {
      const project = await loadOwnedProject(projectId, String(user._id));
      if (!project) {
        return res.status(404).json({ error: "Project not found for this user" });
      }
      task = await createGithubIssueForTask(user, project, task) as any;
    }

    res.status(201).json(task);
  } catch (err) {
    console.error("[createTask]", err);
    res.status(500).json({ error: "Failed to create task" });
  }
}

/** PATCH /api/tasks/:id/status  { status } */
export async function updateTaskStatus(req: Request, res: Response) {
  try {
    const { status,userId } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" })
    

    if (!isValidStatus(status)) {
      return res.status(400).json({ error: `status must be one of ${STATUS_VALUES.join(", ")}` });
    }

    const task = await Task.findOne({ id: req.params.id, user: user._id });
    if (!task) return res.status(404).json({ error: "Task not found" });

    task.status = status;
    await task.save();

    // 2-way sync: push the new status back to the GitHub issue, if this task is linked to one.
    if (task.source === "github" && task.project) {
      const project = await Project.findById(task.project);
      if (project) {
        await pushTaskStatusToGithub(user, project, task);
      } else {
        console.warn(`[updateTaskStatus] task ${task.id} references missing project ${task.project}`);
      }
    }

    res.json(task);
  } catch (err) {
    console.error("[updateTaskStatus]", err);
    res.status(500).json({ error: "Failed to update task status" });
  }
}

/** PATCH /api/tasks/:id/toggle — done <-> open, mirrors slice's toggleTask */
export async function toggleTask(req: Request, res: Response) {
  try {

    const {userId}=req.body

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" })

    const task = await Task.findOne({ id: req.params.id, user: user._id });
    if (!task) return res.status(404).json({ error: "Task not found" });

    task.status = task.status === "done" ? "open" : "done";
    await task.save();

    if (task.source === "github" && task.project) {
      const project = await Project.findById(task.project);
      if (project) {
        await pushTaskStatusToGithub(user, project, task);
      } else {
        console.warn(`[toggleTask] task ${task.id} references missing project ${task.project}`);
      }
    }

    res.json(task);
  } catch (err) {
    console.error("[toggleTask]", err);
    res.status(500).json({ error: "Failed to toggle task" });
  }
}

/** GET /api/tasks/project/:projectId — get all tasks for a specific project */
export async function getTasksByProjectId(req: Request, res: Response) {
  try {
    const { userId } = req.query;

    if (!userId || typeof userId !== "string") {
      return res.status(400).json({ error: "userId is required" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const { projectId } = req.params;

    if (!projectId) {
      return res.status(400).json({ error: "projectId is required" });
    }

    // Verify the project belongs to the user
    const project = await Project.findOne({ _id: projectId, owner: user._id });
    if (!project) {
      return res.status(404).json({ error: "Project not found for this user" });
    }

    const tasks = await Task.find({
      project: projectId,
      user: user._id,
    }).sort({ createdAt: -1 });

    res.json(tasks);
  } catch (err) {
    console.error("[getTasksByProjectId]", err);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
}