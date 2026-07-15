
import { Router } from "express";
import {
    generateArtifacts, regenerateArtifact, getLatestSession, listSessions, deleteSession,
} from "../controller/api-agent";

const apiAgentRouter =Router();
apiAgentRouter.post("/generate", generateArtifacts);
apiAgentRouter.post("/regenerate", regenerateArtifact);
apiAgentRouter.get("/latest", getLatestSession);
apiAgentRouter.get("/history", listSessions);
apiAgentRouter.delete("/:sessionId", deleteSession);
export default apiAgentRouter