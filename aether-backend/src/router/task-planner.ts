import { Router } from "express";
import {
  createTask,
  updateTaskStatus,
  toggleTask,
  getTasksByProjectId,
} from "../controller/task-planner";
import { verifyJWT } from "../middleware/auth";

const taskRouter = Router();

taskRouter.use(verifyJWT);


taskRouter.post("/", createTask);
taskRouter.patch("/:id/status", updateTaskStatus);
taskRouter.patch("/:id/toggle", toggleTask);
taskRouter.get("/project/:projectId", getTasksByProjectId);

export default taskRouter;