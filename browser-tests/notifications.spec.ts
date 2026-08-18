import { test, expect } from "@playwright/test";

const sessionCookie = process.env.E2E_SESSION_COOKIE;

test.describe("authenticated realtime notifications", () => {
  test.skip(!sessionCookie, "Set E2E_SESSION_COOKIE to run authenticated staging coverage.");

  test("renders a toast when an SSE notification arrives", async ({ page, context }) => {
    await context.addCookies([{ name: "app_session_id", value: sessionCookie!, url: process.env.E2E_BASE_URL || "http://127.0.0.1:3000" }]);
    let streamConnected = false;
    await page.route("**/api/notifications/stream", async (route) => {
      streamConnected = true;
      await route.fulfill({
        status: 200,
        headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
        body: 'event: ready\ndata: {}\n\nevent: notification\ndata: {"id":991,"title":"Fleet access updated","message":"Your role changed to Medical Director."}\n\n',
      });
    });

    await page.goto("/?inbox=1");
    await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible();
    await expect.poll(() => streamConnected).toBe(true);
    await expect(page.getByText("Fleet access updated")).toBeVisible();
    await expect(page.getByText("Your role changed to Medical Director.")).toBeVisible();
  });
});
