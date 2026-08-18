import type { Response } from "express";
import type { OperatorNotification } from "../drizzle/schema";

const streams = new Map<number, Set<Response>>();
const metrics = {
  activeConnections: 0,
  totalConnections: 0,
  totalNotifications: 0,
  deliveredNotifications: 0,
  droppedClients: 0,
  deliveryLatencyMs: 0,
  maxDeliveryLatencyMs: 0,
  lastConnectedAt: null as Date | null,
  lastDeliveredAt: null as Date | null,
};

export function openNotificationStream(userId: number, response: Response) {
  const userStreams = streams.get(userId) || new Set<Response>();
  userStreams.add(response);
  streams.set(userId, userStreams);
  metrics.activeConnections += 1;
  metrics.totalConnections += 1;
  metrics.lastConnectedAt = new Date();
  response.write(`event: ready\ndata: ${JSON.stringify({ userId })}\n\n`);
  let closed = false;
  return () => {
    if (closed) return;
    closed = true;
    userStreams.delete(response);
    if (!userStreams.size) streams.delete(userId);
    metrics.activeConnections = Math.max(0, metrics.activeConnections - 1);
  };
}

export function publishNotification(notification: OperatorNotification) {
  metrics.totalNotifications += 1;
  const userStreams = streams.get(notification.userId);
  if (!userStreams?.size) {
    metrics.droppedClients += 1;
    return;
  }
  const deliveredAt = Date.now();
  const createdAt = notification.createdAt.getTime();
  const deliveryLatencyMs = Math.max(0, deliveredAt - createdAt);
  metrics.deliveryLatencyMs = deliveryLatencyMs;
  metrics.maxDeliveryLatencyMs = Math.max(metrics.maxDeliveryLatencyMs, deliveryLatencyMs);
  metrics.lastDeliveredAt = new Date(deliveredAt);
  const payload = JSON.stringify({
    id: notification.id,
    kind: notification.kind,
    title: notification.title,
    message: notification.message,
    readAt: notification.readAt?.toISOString() || null,
    createdAt: notification.createdAt.toISOString(),
  });
  Array.from(userStreams).forEach((response) => {
    try {
      response.write(`event: notification\ndata: ${payload}\n\n`);
      metrics.deliveredNotifications += 1;
    } catch {
      metrics.droppedClients += 1;
      userStreams.delete(response);
      metrics.activeConnections = Math.max(0, metrics.activeConnections - 1);
    }
  });
  if (!userStreams.size) streams.delete(notification.userId);
}

export function heartbeatNotificationStreams() {
  Array.from(streams.values()).forEach((userStreams) => Array.from(userStreams).forEach((response) => {
    try {
      response.write(`event: heartbeat\ndata: {}\n\n`);
    } catch {
      metrics.droppedClients += 1;
    }
  }));
}

export function getNotificationStreamMetrics() {
  return {
    ...metrics,
    lastConnectedAt: metrics.lastConnectedAt?.toISOString() || null,
    lastDeliveredAt: metrics.lastDeliveredAt?.toISOString() || null,
  };
}
