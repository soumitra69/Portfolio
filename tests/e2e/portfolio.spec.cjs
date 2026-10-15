const { test, expect } = require("@playwright/test");
const { mkdir } = require("node:fs/promises");

test("existing sections, desktop links, dark theme and contact validation work", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page.locator("main section")).toHaveCount(9);
  expect(await page.locator("main section").evaluateAll((sections) => sections.map((section) => section.id))).toEqual(["home", "about", "skills", "services", "experience", "education", "projects", "gallery", "contact"]);
  await expect(page.getByRole("heading", { name: "Hi, I'm Soumitra Samanta" })).toBeVisible();
  await expect(page.locator(".project-card")).toHaveCount(3);
  await expect(page.locator(".project-links a")).toHaveCount(6);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload(); await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await page.getByRole("link", { name: "Get In Touch", exact: true }).click();
  await page.getByRole("button", { name: "Send Message", exact: true }).click();
  await expect(page.getByLabel("Name", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("Name", { exact: true })).toBeFocused();
  await page.getByLabel("Name", { exact: true }).fill("Browser test visitor");
  await page.getByLabel("Email", { exact: true }).fill("visitor@example.test");
  await page.getByLabel("Subject", { exact: true }).fill("Browser contact check");
  await page.getByLabel("Message", { exact: true }).fill("Checking the contact form from the browser.");
  await page.getByRole("button", { name: "Send Message", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Your message has been received");
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("");
});

test("existing work-together CTA submits an inquiry; admin manages it and reads contact details", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Let's work together!" }).click();
  await expect(page.getByRole("radio", { name: "Discuss a project" })).toBeChecked();
  await page.getByLabel("Name", { exact: true }).fill("Browser test client");
  await page.getByLabel("Email", { exact: true }).fill("client@example.test");
  await page.getByLabel("Company", { exact: false }).fill("Browser test company");
  await page.getByLabel("Project type", { exact: true }).selectOption("Web application");
  await page.getByLabel("Message", { exact: true }).fill("Checking the inquiry workflow.");
  await page.getByRole("button", { name: "Send Project Inquiry" }).click();
  await expect(page.getByRole("status")).toContainText("Your project inquiry has been received");
  await page.goto("/admin");
  await page.getByLabel("Username").fill("browser-admin@example.test"); await page.getByLabel("Password").fill("Browser-test-only-passphrase");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await page.getByRole("tab", { name: /Messages/ }).click();
  await expect(page.getByText("Browser contact check", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Details", exact: true }).click();
  await expect(page.getByText("SMTP is not configured", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: /Inquiries/ }).click();
  await expect(page.getByText("Browser test client", { exact: false })).toBeVisible();
  await page.getByLabel("Inquiry status").selectOption("Contacted");
  await expect(page.getByRole("status")).toContainText("Inquiry status updated");
  await page.getByRole("button", { name: "Details", exact: true }).click();
  await expect(page.getByText("Browser test company", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Visitors", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visitor statistics" })).toBeVisible();
  await expect(page.getByText("Unique visitor-days", { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await mkdir("artifacts/portfolio", { recursive: true });
  await page.screenshot({ path: "artifacts/portfolio/after-admin-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
});

test("mobile navigation, forms and section layout stay usable at narrow widths", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("navigation").getByRole("link", { name: "About", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Open navigation" })).toBeFocused();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("navigation").getByRole("link", { name: "Contact", exact: true }).click();
  await expect(page.getByRole("button", { name: "Open navigation" })).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByLabel("Subject")).toBeVisible();
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => document.querySelectorAll(".reveal-pending").forEach((section) => section.classList.remove("reveal-pending")));
  await mkdir("artifacts/portfolio", { recursive: true });
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.screenshot({ path: "artifacts/portfolio/after-mobile.png", fullPage: true });
});

test("desktop screenshots and reduced-motion preferences preserve a visible page", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".reveal-pending")).toHaveCount(0);
  await page.locator("#contact").scrollIntoViewIfNeeded();
  await expect(page.getByLabel("Subject")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await mkdir("artifacts/portfolio", { recursive: true });
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.screenshot({ path: "artifacts/portfolio/after-desktop.png", fullPage: true });
});

test("a failed contact request reports an error and preserves entered details for retry", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Get In Touch", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Retry visitor");
  await page.getByLabel("Email", { exact: true }).fill("retry@example.test");
  await page.getByLabel("Subject", { exact: true }).fill("Retry check");
  await page.getByLabel("Message", { exact: true }).fill("Keep my details if the server is unavailable.");
  await page.route("**/api/messages", (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "The service is temporarily unavailable." }) }));
  await page.getByRole("button", { name: "Send Message", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("temporarily unavailable");
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Retry visitor");
  await expect(page.getByLabel("Message", { exact: true })).toHaveValue("Keep my details if the server is unavailable.");
  await expect(page.getByRole("button", { name: "Send Message", exact: true })).toBeEnabled();
});
