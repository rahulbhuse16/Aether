import { Router } from "express";
import { createJiraTickets, emailMeetingSummary, uploadMeeting,listMeetings } from "../controller/meeting-agent";

const meetingAgentRouter=Router()
meetingAgentRouter.post('/upload',uploadMeeting)
meetingAgentRouter.post('/:meetingId/jira',createJiraTickets)
meetingAgentRouter.post('/meetingId/email',emailMeetingSummary)
meetingAgentRouter.get('/',listMeetings)

export default meetingAgentRouter
