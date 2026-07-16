"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConnectedUsersCount = exports.removeUserClients = exports.broadcastSseEvent = exports.sendSseEvent = exports.addSseClient = void 0;
const clients = new Map();
/**
 * Register a new SSE connection
 */
const addSseClient = (userId, res) => {
    if (!clients.has(userId)) {
        clients.set(userId, new Set());
    }
    clients.get(userId).add(res);
    // Initial connection event
    res.write(`event: connected\n` +
        `data: ${JSON.stringify({
            success: true,
            message: "Connected to Aether Notifications",
        })}\n\n`);
    // Heartbeat every 30 seconds
    const heartbeat = setInterval(() => {
        res.write(": heartbeat\n\n");
    }, 30000);
    // Cleanup on disconnect
    res.on("close", () => {
        clearInterval(heartbeat);
        const userClients = clients.get(userId);
        if (!userClients)
            return;
        userClients.delete(res);
        if (userClients.size === 0) {
            clients.delete(userId);
        }
    });
};
exports.addSseClient = addSseClient;
/**
 * Send an SSE event to a user
 */
const sendSseEvent = (userId, event, data) => {
    const userClients = clients.get(userId);
    if (!userClients || userClients.size === 0) {
        return;
    }
    const payload = `event: ${event}\n` +
        `data: ${JSON.stringify(data)}\n\n`;
    userClients.forEach((client) => {
        client.write(payload);
    });
};
exports.sendSseEvent = sendSseEvent;
/**
 * Broadcast to all connected users
 */
const broadcastSseEvent = (event, data) => {
    const payload = `event: ${event}\n` +
        `data: ${JSON.stringify(data)}\n\n`;
    clients.forEach((connections) => {
        connections.forEach((client) => {
            client.write(payload);
        });
    });
};
exports.broadcastSseEvent = broadcastSseEvent;
/**
 * Disconnect all clients for a user
 */
const removeUserClients = (userId) => {
    const userClients = clients.get(userId);
    if (!userClients)
        return;
    userClients.forEach((client) => {
        client.end();
    });
    clients.delete(userId);
};
exports.removeUserClients = removeUserClients;
/**
 * Connected users count
 */
const getConnectedUsersCount = () => clients.size;
exports.getConnectedUsersCount = getConnectedUsersCount;
