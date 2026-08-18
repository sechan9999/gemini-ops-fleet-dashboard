import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchTrpcWithRetry } from "./trpc-fetch";

describe("fetchTrpcWithRetry", () => {
  afterEach(() => vi.restoreAllMocks());

  it("retries an HTML proxy response and returns the later JSON response", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("<!doctype html>", { status: 502, headers: { "content-type": "text/html" } }))
      .mockResolvedValueOnce(new Response('{"result":"ok"}', { status: 200, headers: { "content-type": "application/json" } }));

    const response = await fetchTrpcWithRetry("/api/trpc/fleet.profile");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ result: "ok" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry a normal JSON response", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response('{"result":"ok"}', { status: 200, headers: { "content-type": "application/json" } }));

    const response = await fetchTrpcWithRetry("/api/trpc/fleet.profile");

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
