import express from "express";
import { connectDB } from "./utils/connectDB";
import cors from "cors";
import authRouter from "./router/auth";
import gitHubRouter from "./router/github";
import projectRouter from "./router/project";
import dashBoardRouter from "./router/dashboard";
import chatRouter from "./router/chat";
import codeReviewRouter from "./router/code-review";
import apiAgentRouter from "./router/api-agent";
import bugRouter from "./router/bug-finder";
import architectureRouter from "./router/architecture";
import deployRouter from "./router/deployment";
import docsRouter from "./router/documentation";
import voiceEngineerRouter from "./router/voice-engineer";
import notificationsRouter from "./router/notification";
import meetingAgentRouter from "./router/meeting-agent";
import emailRouter from "./router/email";
import cookieParser from "cookie-parser";
import taskRouter from "./router/task-planner";
import calendarRouter from "./router/calendar";

const app = express();

app.use(cors());

// IMPORTANT: GitHub webhook MUST come before express.json()
app.use(
  "/api/v1/github/webhook",
  express.raw({
    type: "application/json",
  })
);

// Normal body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/projects", projectRouter);
app.use("/api/v1/github", gitHubRouter);
app.use("/api/v1/dashboard", dashBoardRouter);
app.use("/api/v1/chat", chatRouter);
app.use("/api/v1/code-review", codeReviewRouter);
app.use("/api/v1/api-agent", apiAgentRouter);
app.use("/api/v1/bug-finder", bugRouter);
app.use("/api/v1/architecture", architectureRouter);
app.use("/api/v1/deployment", deployRouter);
app.use("/api/v1/docs", docsRouter);
app.use("/api/v1/voice-engineer", voiceEngineerRouter);
app.use("/api/v1/notifications", notificationsRouter);
app.use("/api/v1/meetings", meetingAgentRouter);
app.use("/api/v1/email", emailRouter);
app.use("/api/v1/task-planner", taskRouter);
app.use("/api/v1/calendar",calendarRouter)

connectDB();

app.listen(5000, () => {
  console.log("running on port 5000");
});