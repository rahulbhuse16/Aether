import { Response } from "express";

const clients = new Map<string, Set<Response>>();

/**
 * Register a new SSE connection
 */
export const addSseClient = (userId: string, res: Response) => {
  if (!clients.has(userId)) {
    clients.set(userId, new Set());
  }

  clients.get(userId)!.add(res);

  // Initial connection event
  res.write(
    `event: connected\n` +
      `data: ${JSON.stringify({
        success: true,
        message: "Connected to Aether Notifications",
      })}\n\n`
  );

  // Heartbeat every 30 seconds
  const heartbeat = setInterval(() => {
    res.write(": heartbeat\n\n");
  }, 30000);

  // Cleanup on disconnect
  res.on("close", () => {
    clearInterval(heartbeat);

    const userClients = clients.get(userId);

    if (!userClients) return;

    userClients.delete(res);

    if (userClients.size === 0) {
      clients.delete(userId);
    }
  });
};

/**
 * Send an SSE event to a user
 */
export const sendSseEvent = (
  userId: string,
  event: string,
  data: unknown
) => {
  const userClients = clients.get(userId);

  if (!userClients || userClients.size === 0) {
    return;
  }

  const payload =
    `event: ${event}\n` +
    `data: ${JSON.stringify(data)}\n\n`;

  userClients.forEach((client) => {
    client.write(payload);
  });
};

/**
 * Broadcast to all connected users
 */
export const broadcastSseEvent = (
  event: string,
  data: unknown
) => {
  const payload =
    `event: ${event}\n` +
    `data: ${JSON.stringify(data)}\n\n`;

  clients.forEach((connections) => {
    connections.forEach((client) => {
      client.write(payload);
    });
  });
};

/**
 * Disconnect all clients for a user
 */
export const removeUserClients = (userId: string) => {
  const userClients = clients.get(userId);

  if (!userClients) return;

  userClients.forEach((client) => {
    client.end();
  });

  clients.delete(userId);
};

/**
 * Connected users count
 */
export const getConnectedUsersCount = () => clients.size;