import express from "express";
import { sendTestEmail } from "../controller/email";

const emailRouter = express.Router();

emailRouter.post("/send", sendTestEmail);

export default emailRouter;