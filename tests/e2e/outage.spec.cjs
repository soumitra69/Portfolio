const { test, expect } = require("@playwright/test");

test("a backend outage keeps SSR and mobile portfolio usable, blocks submissions and recovers live content", async ({ page, request }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const control = "http://127.0.0.1:5055/__test/availability";
  await request.post(control, { data: { ready: false } });
  try {
    const html = await request.get("/");
    expect(html.status()).toBe(200);
    expect(await html.text()).toContain("Digital Marketing Agency Website");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page.locator(".hero-identity")).toBeVisible();
    await expect(page.locator("main section")).toHaveCount(9);
    await expect(page.locator(".project-card")).toHaveCount(3);
    await expect(page.getByRole("heading", { name: "Portfolio temporarily unavailable" })).toHaveCount(0);
    await expect(page.locator(".content-error")).toContainText("You can browse my portfolio");
    await expect(page.getByRole("button", { name: "Send Message", exact: true })).toBeDisabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const content = await request.get("/api/content");
    expect(content.headers()["cache-control"]).toContain("no-store");
    expect((await content.json()).availability).toBe("offline");
    expect((await request.post("/api/messages", { data: {} })).status()).toBe(503);
    await request.post(control, { data: { ready: true } });
    await page.getByRole("button", { name: "Try again", exact: true }).click();
    await expect(page.locator(".content-error")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Send Message", exact: true })).toBeEnabled();
    expect((await (await request.get("/api/content")).json()).availability).toBe("live");
    expect(errors).toEqual([]);
  } finally { await request.post(control, { data: { ready: true } }); }
});
