const { test, expect } = require("@playwright/test");
const { mkdir } = require("node:fs/promises");

test("dark desktop design preserves content and supports 3D pause, tilt, links and keyboard navigation", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "deviceMemory", { get: () => 8 });
    // Exercise the real Three renderer in just this test even on headless
    // software GPUs; normal pages deliberately use the lighter CSS fallback.
    const original = WebGL2RenderingContext.prototype.getParameter;
    WebGL2RenderingContext.prototype.getParameter = function (parameter) {
      return parameter === 37446
        ? "Test hardware adapter"
        : original.call(this, parameter);
    };
  });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator(".hero-role")).toHaveText(
    "Web Developer in Purba Medinipur, Haldia & Tamluk",
  );
  await expect(page.locator(".skill-item")).toHaveCount(5);
  await expect(page.locator(".hero-socials a")).toHaveCount(2);
  await expect(
    page.locator(".hero-socials a[href='https://github.com/soumitra69']"),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Request Resume", exact: true }),
  ).toHaveAttribute("href", "#contact");
  const hasWebGL = await page.evaluate(() =>
    Boolean(document.createElement("canvas").getContext("webgl2")),
  );
  await expect(page.locator(".hero-scene")).toHaveAttribute(
    "data-renderer",
    hasWebGL ? "webgl" : "css",
  );
  const pause = page.getByRole("button", { name: "Pause 3D animation" });
  await pause.click();
  await expect(page.locator(".hero-scene")).toHaveAttribute(
    "data-paused",
    "true",
  );
  await page.getByRole("button", { name: "Resume 3D animation" }).click();
  await expect(page.locator(".hero-scene")).toHaveAttribute(
    "data-paused",
    "false",
  );
  await page.locator("#skills").scrollIntoViewIfNeeded();
  const card = page.locator(".skill-item").first();
  await card.hover({ position: { x: 12, y: 12 } });
  await expect
    .poll(() =>
      card.evaluate((element) => element.style.getPropertyValue("--tilt-x")),
    )
    .not.toBe("");
  await expect(page.locator("header")).toHaveAttribute("data-scrolled", "true");
  await page.getByRole("link", { name: "Home", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(20);
  await mkdir("artifacts/portfolio", { recursive: true });
  await page.screenshot({ path: "artifacts/portfolio/dark-desktop.png" });
  expect(errors).toEqual([]);
});

test("mobile and reduced-motion users get a stable static visual with no horizontal overflow", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".hero-scene")).toHaveAttribute(
    "data-renderer",
    "css",
  );
  await expect(
    page.getByRole("button", { name: "Pause 3D animation" }),
  ).toHaveCount(0);
  await expect(page.locator(".reveal-pending")).toHaveCount(0);
  for (const width of [320, 390, 768, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await mkdir("artifacts/portfolio", { recursive: true });
  for (const section of await page.locator("main section").all())
    await section.scrollIntoViewIfNeeded();
  for (const image of await page.locator("main img").all())
    await image.scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      page
        .locator("main img")
        .evaluateAll((images) =>
          images.every((image) => image.complete && image.naturalWidth > 0),
        ),
    )
    .toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "artifacts/portfolio/dark-mobile-hero.png" });
  await page.screenshot({
    path: "artifacts/portfolio/dark-mobile.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("CMS theme and accent settings still change the redesigned public page", async ({
  page,
  request,
}) => {
  const login = await request.post("/api/admin/login", {
    data: {
      username: "browser-admin@example.test",
      password: "Browser-test-only-passphrase",
    },
    headers: { "X-Admin-Request": "1" },
  });
  expect(login.status()).toBe(200);
  const original = (await (await request.get("/api/admin/cms")).json())
    .settings;
  const descriptor = require("../../frontend/shared/cms-fields.json").settings;
  const settings = Object.fromEntries(
    descriptor.fields
      .map(([key]) => [key, original[key]])
      .filter(([, value]) => value !== undefined),
  );
  const headers = { "X-Admin-Request": "1" };
  try {
    const changed = await request.put("/api/admin/cms/settings", {
      headers,
      data: { ...settings, theme: "light", primaryColor: "#6050ba" },
    });
    expect(changed.status()).toBe(200);
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    expect(
      await page.evaluate(() =>
        document.documentElement.style.getPropertyValue("--primary-color"),
      ),
    ).toBe("#6050ba");
    expect(
      await page
        .locator(".hero-text .btn-primary")
        .evaluate((button) => getComputedStyle(button).backgroundImage),
    ).toContain("color(srgb");
  } finally {
    expect(
      (
        await request.put("/api/admin/cms/settings", {
          headers,
          data: settings,
        })
      ).status(),
    ).toBe(200);
  }
});

test("an unavailable WebGL context preserves the hero, content and controls without a crash", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type.startsWith("webgl")
        ? null
        : original.call(this, type, ...args);
    };
  });
  await page.goto("/");
  await expect(page.locator(".hero-scene")).toHaveAttribute(
    "data-renderer",
    "css",
  );
  await expect(page.locator(".scene-fallback")).toBeVisible();
  await expect(
    page.locator(".hero-identity"),
  ).toBeVisible();
  await expect(page.locator(".project-card")).toHaveCount(3);
});
