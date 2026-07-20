import { Router } from "express";
import {
  createTask,
  updateTaskStatus,
  toggleTask,
} from "../controller/task-planner";
import { verifyJWT } from "../middleware/auth";

const taskRouter = Router();

taskRouter.use(verifyJWT);


taskRouter.post("/", createTask);
taskRouter.patch("/:id/status", updateTaskStatus);
taskRouter.patch("/:id/toggle", toggleTask);

export default taskRouter;