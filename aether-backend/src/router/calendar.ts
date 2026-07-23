import { Router } from "express";
import {
    connectGoogle,
    createGoogleMeeting,
    getCalendarEvents,
    getCalendarStatus,
    googleCalendarCallback,
    googlewebhook,
} from "../controller/calendar";
import { create } from "axios";

const calendarRouter = Router()



calendarRouter.get("/connect",connectGoogle);

calendarRouter.get(
    "/callback",

    googleCalendarCallback
);

calendarRouter.post(
    "/webhook",
    googlewebhook
);

calendarRouter.get(
    "/status",
    getCalendarStatus
);

calendarRouter.get(
    "/events",
    getCalendarEvents
);

calendarRouter.post(
    "/create-meeting",
    createGoogleMeeting
);



export default calendarRouter;