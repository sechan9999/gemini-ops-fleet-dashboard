import type { Response } from "express";
import type { OperatorNotification } from "../drizzle/schema";

const streams = new Map<number, Set<Response>>();

export function openNotificationStream(userId: number, response: Response) {
  const userStreams = streams.get(userId) || new Set<Response>();
  userStreams.add(response);
  streams.set(userId, userStreams);
  response.write(`event: ready\ndata: ${JSON.stringify({ userId })}\n\n`);
  return () => {
    userStreams.delete(response);
    if (!userStreams.size) streams.delete(userId);
  };
}

export function publishNotification(notification: OperatorNotification) {
  const userStreams = streams.get(notification.userId);
  if (!userStreams?.size) return;
  const payload = JSON.stringify({
    id: notification.id,
    kind: notification.kind,
    title: notification.title,
    message: notification.message,
    readAt: notification.readAt?.toISOString() || null,
    createdAt: notification.createdAt.toISOString(),
  });
  Array.from(userStreams).forEach((response) => response.write(`event: notification\ndata: ${payload}\n\n`));
}

export function heartbeatNotificationStreams() {
  Array.from(streams.values()).forEach((userStreams) => Array.from(userStreams).forEach((response) => response.write(`event: heartbeat\ndata: {}\n\n`)));
}
