import { Router } from "express";
import {
    connectGoogle,
    googleCalendarCallback,
    googlewebhook,
} from "../controller/calendar";

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

export default calendarRouter;