import { createOperatorNotification } from "./db";

export type FleetRoleChangeEvent = {
  id?: string;
  event_id?: string;
  event_type?: string;
  user_id?: number | string;
  operator_id?: number | string;
  name?: string;
  actor?: string;
  previous_role?: string;
  role?: string;
  previous_department?: string;
  department?: string;
  details?: Record<string, unknown>;
  timestamp?: string;
};

const processedEventIds = new Set<string>();
export function isFleetEventTokenValid(providedToken: string | undefined, expectedToken: string | undefined = process.env.FLEET_EVENT_INGEST_TOKEN) {
  return Boolean(expectedToken && providedToken && providedToken === expectedToken);
}

const bridgeMetrics = {
  received: 0,
  published: 0,
  ignored: 0,
  duplicate: 0,
  failed: 0,
  lastReceivedAt: null as Date | null,
  lastPublishedAt: null as Date | null,
};

function eventId(event: FleetRoleChangeEvent) {
  return String(event.event_id || event.id || `${event.user_id || event.operator_id || "unknown"}:${event.timestamp || "unknown"}:${event.role || "unknown"}`);
}

function asUserId(event: FleetRoleChangeEvent) {
  const raw = event.user_id ?? event.operator_id;
  const userId = Number(raw);
  return Number.isInteger(userId) && userId > 0 ? userId : null;
}

function isRoleChange(event: FleetRoleChangeEvent) {
  const type = String(event.event_type || "").toLowerCase();
  return type.includes("role") || type.includes("department") || Boolean(event.role || event.department);
}

export async function ingestFleetRoleChangeEvent(event: FleetRoleChangeEvent) {
  bridgeMetrics.received += 1;
  bridgeMetrics.lastReceivedAt = new Date();
  const id = eventId(event);
  if (processedEventIds.has(id)) {
    bridgeMetrics.duplicate += 1;
    return { status: "duplicate" as const, eventId: id };
  }
  if (!isRoleChange(event)) {
    bridgeMetrics.ignored += 1;
    return { status: "ignored" as const, eventId: id };
  }
  const userId = asUserId(event);
  if (!userId) {
    bridgeMetrics.failed += 1;
    throw new Error("Fleet role-change event is missing a numeric user_id or operator_id");
  }
  processedEventIds.add(id);
  try {
    const currentRole = event.role || "updated role";
    const currentDepartment = event.department || "updated department";
    const actor = event.actor || "Fleet event publisher";
    const created = await createOperatorNotification({
      userId,
      kind: "role_change",
      title: "Fleet access updated",
      message: `${actor} updated ${event.name || `operator ${userId}`} to ${currentRole} · ${currentDepartment}.`,
    });
    if (!created) throw new Error("Notification persistence is unavailable");
    bridgeMetrics.published += 1;
    bridgeMetrics.lastPublishedAt = new Date();
    return { status: "published" as const, eventId: id, notificationId: created.id };
  } catch (error) {
    processedEventIds.delete(id);
    bridgeMetrics.failed += 1;
    throw error;
  }
}

export async function ingestFleetEvents(payload: unknown) {
  const events = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && Array.isArray((payload as { events?: unknown[] }).events)
      ? (payload as { events: unknown[] }).events
      : payload && typeof payload === "object" && Array.isArray((payload as { activities?: unknown[] }).activities)
        ? (payload as { activities: unknown[] }).activities
        : [payload];
  const results = [];
  for (const event of events) {
    if (!event || typeof event !== "object") continue;
    results.push(await ingestFleetRoleChangeEvent(event as FleetRoleChangeEvent));
  }
  return results;
}

export function getFleetEventBridgeMetrics() {
  return {
    ...bridgeMetrics,
    lastReceivedAt: bridgeMetrics.lastReceivedAt?.toISOString() || null,
    lastPublishedAt: bridgeMetrics.lastPublishedAt?.toISOString() || null,
    processedEventIds: processedEventIds.size,
  };
}
