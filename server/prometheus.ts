import { getFleetEventBridgeMetrics } from "./fleet-event-bridge";
import { getNotificationStreamMetrics } from "./notifications";

function metric(name: string, help: string, type: "gauge" | "counter", value: number) {
  return `# HELP ${name} ${help}\n# TYPE ${name} ${type}\n${name} ${Number.isFinite(value) ? value : 0}`;
}

export function renderPrometheusMetrics() {
  const stream = getNotificationStreamMetrics();
  const bridge = getFleetEventBridgeMetrics();
  return [
    metric("gemini_ops_sse_active_connections", "Current number of active SSE notification connections.", "gauge", stream.activeConnections),
    metric("gemini_ops_sse_total_connections", "Total SSE notification connections opened since process start.", "counter", stream.totalConnections),
    metric("gemini_ops_sse_notifications_total", "Total notifications received by the SSE publisher.", "counter", stream.totalNotifications),
    metric("gemini_ops_sse_notifications_delivered_total", "Total notification writes successfully delivered to SSE clients.", "counter", stream.deliveredNotifications),
    metric("gemini_ops_sse_dropped_clients_total", "Total notifications or heartbeat writes dropped because a client was unavailable.", "counter", stream.droppedClients),
    metric("gemini_ops_sse_delivery_latency_ms", "Most recent notification delivery latency in milliseconds.", "gauge", stream.deliveryLatencyMs),
    metric("gemini_ops_sse_delivery_latency_max_ms", "Maximum notification delivery latency observed since process start in milliseconds.", "gauge", stream.maxDeliveryLatencyMs),
    metric("gemini_ops_fleet_events_received_total", "Fleet events received by the dashboard bridge.", "counter", bridge.received),
    metric("gemini_ops_fleet_events_published_total", "Fleet role-change events persisted and published to operator inboxes.", "counter", bridge.published),
    metric("gemini_ops_fleet_events_ignored_total", "Fleet events acknowledged but ignored because they were not role or department changes.", "counter", bridge.ignored),
    metric("gemini_ops_fleet_events_duplicate_total", "Fleet events ignored because their event IDs were already processed.", "counter", bridge.duplicate),
    metric("gemini_ops_fleet_events_failed_total", "Fleet events that failed validation or notification persistence.", "counter", bridge.failed),
    "",
  ].join("\n");
}
