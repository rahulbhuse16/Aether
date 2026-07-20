import { Router } from "express";
import { createJiraTickets, emailMeetingSummary, uploadMeeting,listMeetings } from "../controller/meeting-agent";
import { verifyJWT } from "../middleware/auth";

const meetingAgentRouter=Router()
meetingAgentRouter.use(verifyJWT)
meetingAgentRouter.post('/upload',uploadMeeting)
meetingAgentRouter.post('/:meetingId/jira',createJiraTickets)
meetingAgentRouter.post('/meetingId/email',emailMeetingSummary)
meetingAgentRouter.get('/',listMeetings)

export default meetingAgentRouter
