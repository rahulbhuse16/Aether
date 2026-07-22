import { Request, Response } from "express";
import { google } from "googleapis";
import crypto from "crypto";
import { NotificationPriority, NotificationType } from "../models/notification";
import { User } from "../models/user";
import { saveNotification } from "../utils/notifications";
import { ENV } from "../config/env";

const {
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    CALENDAR_REDIRECT_URI,
    GOOGLE_WEBHOOK_URL,
    FRONTEND_URL,
} = ENV;

// Google OAuth client (used only to generate the auth URL / exchange the code;
// never mutated with per-user credentials, so it's safe to share)
const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    CALENDAR_REDIRECT_URI
);

const GOOGLE_SCOPES = [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/calendar.events",
];

// Hard caps to prevent runaway memory usage when fetching events
const EVENTS_LOOKBACK_MS = 24 * 60 * 60 * 1000; // 1 day back
const EVENTS_LOOKAHEAD_MS = 90 * 24 * 60 * 60 * 1000; // 90 days forward
const MAX_EVENTS_PER_PAGE = 250;
const MAX_PAGES = 4; // hard ceiling: at most 1000 events processed per webhook call

/**
 * Build a per-request OAuth2 client authenticated for a specific user.
 * Never reuse/mutate the module-level oauth2Client for this — that client
 * is shared across all requests and setting credentials on it would leak
 * one user's tokens into another user's request.
 */
const getAuthClientForUser = (user: any): InstanceType<typeof google.auth.OAuth2> => {
    const auth = new google.auth.OAuth2(
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        CALENDAR_REDIRECT_URI
    );

    auth.setCredentials({
        access_token: user.googleCalendar?.accessToken,
        refresh_token: user.googleCalendar?.refreshToken,
        expiry_date: user.googleCalendar?.expiryDate,
    });

    return auth;
};

/**
 * Redirect user to Google OAuth
 */
export const connectGoogle = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { userId } = req.query;

        if (!userId) {
            res.status(400).json({
                message: "userId is required",
            });
            return;
        }

        const state = Buffer.from(
            JSON.stringify({
                userId,
            })
        ).toString("base64");

        const authUrl = oauth2Client.generateAuthUrl({
            access_type: "offline",
            prompt: "consent",
            scope: GOOGLE_SCOPES,
            state,
        });

        res.redirect(authUrl);
    } catch (error) {
        console.error("Google connect error:", error);

        res.status(500).json({
            message: "Failed to connect Google Calendar",
        });
    }
};

/**
 * Google OAuth callback
 */
export const googleCalendarCallback = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { code, state } = req.query;

        if (!code || !state) {
            res.status(400).send("Missing OAuth code or state");
            return;
        }

        let decodedState: { userId?: string };

        try {
            decodedState = JSON.parse(
                Buffer.from(state as string, "base64").toString("utf-8")
            );
        } catch {
            res.status(400).send("Invalid state parameter");
            return;
        }

        const { userId } = decodedState;

        if (!userId) {
            res.status(400).send("Invalid userId");
            return;
        }

        /**
         * Exchange authorization code for tokens
         */
        const { tokens } = await oauth2Client.getToken(code as string);

        if (!tokens.access_token) {
            res.status(400).send("Google access token not received");
            return;
        }

        /**
         * Save tokens in user
         */
        const user = await User.findByIdAndUpdate(
            userId,
            {
                $set: {
                    "googleCalendar.accessToken": tokens.access_token,
                    "googleCalendar.refreshToken": tokens.refresh_token || undefined,
                    "googleCalendar.expiryDate": tokens.expiry_date,
                    "googleCalendar.connected": true,
                },
            },
            {
                new: true,
            }
        );

        if (!user) {
            res.status(404).send("User not found");
            return;
        }

        /**
         * Create Google Calendar webhook watch
         */
        await createGoogleCalendarWatch(userId);

        /**
         * Redirect to frontend
         */
        res.redirect(`${FRONTEND_URL}/settings?googleCalendar=connected`);
    } catch (error) {
        console.error("Google Calendar callback error:", error);

        res.redirect(`${FRONTEND_URL}/settings?googleCalendar=failed`);
    }
};

/**
 * Google Calendar webhook
 */
export const googlewebhook = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        /**
         * Google sends these headers
         */
        const channelId = req.headers["x-goog-channel-id"] as string;
        const resourceState = req.headers["x-goog-resource-state"] as string;
        const channelToken = req.headers["x-goog-channel-token"] as string;

        console.log("Google Calendar Webhook:", {
            channelId,
            resourceState,
        });

        /**
         * Google sends an initial "sync" event
         */
        if (resourceState === "sync") {
            res.status(200).send("OK");
            return;
        }

        if (!channelToken) {
            res.status(200).send("OK");
            return;
        }

        /**
         * channelToken contains userId
         */
        const userId = channelToken;

        const user = await User.findById(userId);

        if (!user?.googleCalendar?.accessToken) {
            res.status(200).send("OK");
            return;
        }

        /**
         * Reject notifications for a stale/unknown channel — if the user
         * re-connected and a new watch channel was created, an old channel
         * still firing should be ignored, not processed.
         */
        if (
            user.googleCalendar.channelId &&
            channelId &&
            user.googleCalendar.channelId !== channelId
        ) {
            res.status(200).send("OK");
            return;
        }

        /**
         * Authenticate Google Calendar API
         */
        const auth = getAuthClientForUser(user);

        const calendar = google.calendar({
            version: "v3",
            auth,
        });

        /**
         * Fetch latest calendar events.
         *
         * IMPORTANT: singleEvents=true expands recurring events into
         * individual instances. Without timeMin/timeMax, Google will expand
         * EVERY occurrence of EVERY recurring event on the calendar
         * (potentially tens of thousands of instances), which is what was
         * causing the JS heap to blow up here. We bound the window and cap
         * page count so memory usage stays predictable.
         */
        const now = Date.now();
        const timeMin = new Date(now - EVENTS_LOOKBACK_MS).toISOString();
        const timeMax = new Date(now + EVENTS_LOOKAHEAD_MS).toISOString();
        const updatedMin = new Date(now - 5 * 60 * 1000).toISOString();

        let pageToken: string | undefined = undefined;
        let pagesFetched = 0;
        const notificationsToSave: Array<{
            eventTitle: string;
            startTime?: string | null;
            htmlLink?: string | null;
            id?: string | null;
            status?: string | null;
        }> = [];

        do {
            //@ts-ignore
            const eventsResponse = await calendar.events.list({
                calendarId: "primary",
                singleEvents: true,
                orderBy: "startTime",
                updatedMin,
                timeMin,
                timeMax,
                maxResults: MAX_EVENTS_PER_PAGE,
                pageToken,
            });

            const events = eventsResponse.data.items || [];

            for (const event of events) {
                notificationsToSave.push({
                    eventTitle: event.summary || "Calendar event",
                    startTime: event.start?.dateTime || event.start?.date || undefined,
                    htmlLink: event.htmlLink,
                    id: event.id,
                    status: event.status,
                });
            }

            pageToken = eventsResponse.data.nextPageToken || undefined;
            pagesFetched += 1;
        } while (pageToken && pagesFetched < MAX_PAGES);

        /**
         * Create notification for calendar updates
         */
        for (const evt of notificationsToSave) {
            await saveNotification({
                userId: user._id.toString(),
                type: NotificationType.SYSTEM,
                priority: NotificationPriority.MEDIUM,
                title: "Google Calendar Updated",
                description: `Calendar event "${evt.eventTitle}" was created or updated.`,
                href: evt.htmlLink || "/calendar",
                metadata: {
                    source: "google-calendar",
                    eventId: evt.id,
                    eventTitle: evt.eventTitle,
                    startTime: evt.startTime,
                    status: evt.status,
                },
            });
        }

        res.status(200).send("OK");
    } catch (error) {
        console.error("Google Calendar webhook error:", error);

        /**
         * Always return 200 to Google.
         * Otherwise Google retries the webhook.
         */
        res.status(200).send("OK");
    }
};

/**
 * Create Google Calendar Watch Channel
 */
const createGoogleCalendarWatch = async (userId: string): Promise<void> => {
    try {
        const user = await User.findById(userId);

        if (!user?.googleCalendar?.accessToken) {
            throw new Error("Google Calendar is not connected");
        }

        const auth = getAuthClientForUser(user);

        const calendar = google.calendar({
            version: "v3",
            auth,
        });

        const channelId = crypto.randomUUID();

        const response = await calendar.events.watch({
            calendarId: "primary",
            requestBody: {
                id: channelId,
                type: "web_hook",
                address: GOOGLE_WEBHOOK_URL,
                /**
                 * Used to identify the user
                 */
                token: userId,
            },
        });

        /**
         * Save channel information
         */
        await User.findByIdAndUpdate(userId, {
            $set: {
                "googleCalendar.channelId": channelId,
                "googleCalendar.resourceId": response.data.resourceId,
                "googleCalendar.expiration": response.data.expiration,
            },
        });

        console.log("Google Calendar Watch Created:", {
            userId,
            channelId,
            resourceId: response.data.resourceId,
            expiration: response.data.expiration,
        });
    } catch (error) {
        console.error("Create Google Calendar watch error:", error);
    }
};