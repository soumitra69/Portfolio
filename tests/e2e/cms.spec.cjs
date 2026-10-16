const { test, expect } = require("@playwright/test");
const { readFile } = require("node:fs/promises");
const { mkdir } = require("node:fs/promises");

async function login(page) {
  await page.goto("/admin");
  await page.getByLabel("Username").fill("browser-admin@example.test");
  await page.getByLabel("Password").fill("Browser-test-only-passphrase");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Refresh", exact: true }),
  ).toBeEnabled();
}
test("admin editors publish, hide, restore, reorder and delete real CMS content", async ({
  page,
  context,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await login(page);
  await expect(page.locator(".admin-stats > div")).toHaveCount(8);
  await mkdir("artifacts/portfolio", { recursive: true });
  await page.screenshot({ path: "artifacts/portfolio/after-admin-desktop.png", fullPage: true });
  await page.getByRole("tab", { name: "Services", exact: true }).click();
  await page.getByLabel("Title *", { exact: true }).fill("Browser CMS fixture");
  await page
    .getByLabel("Short description *", { exact: true })
    .fill("Isolated browser acceptance record.");
  await page.getByLabel("Price / pricing note").fill("Discuss your project");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Services saved.");
  const card = page
    .locator(".cms-item")
    .filter({
      has: page.getByRole("heading", {
        name: "Browser CMS fixture",
        exact: true,
      }),
    });
  await expect(card).toBeVisible();
  const publicPage = await context.newPage();
  await publicPage.goto("/");
  await expect(
    publicPage
      .locator("#services")
      .getByRole("heading", { name: "Browser CMS fixture" }),
  ).toBeVisible();
  await card.getByRole("button", { name: "Hide", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Visibility and active state saved.",
  );
  await publicPage.reload();
  await expect(
    publicPage.getByRole("heading", { name: "Browser CMS fixture" }),
  ).toHaveCount(0);
  await card.getByRole("button", { name: "Show", exact: true }).click();
  await expect(card.getByText("Visible · Active")).toBeVisible();
  await card.getByRole("button", { name: "Edit", exact: true }).click();
  await page
    .getByLabel("Title *", { exact: true })
    .fill("Updated browser fixture");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Services saved.");
  await publicPage.reload();
  await expect(
    publicPage
      .locator("#services")
      .getByRole("heading", { name: "Updated browser fixture" }),
  ).toBeVisible();
  await page
    .locator(".cms-item")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("button", { name: "Permanently delete", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Item permanently deleted.",
  );
  await page.getByRole("tab", { name: "Navigation", exact: true }).click();
  const gallery = page
    .locator(".cms-item")
    .filter({
      has: page.getByRole("heading", { name: "Gallery", exact: true }),
    });
  await gallery.getByRole("button", { name: "Hide", exact: true }).click();
  await expect(gallery.getByText("Hidden · Active")).toBeVisible();
  await publicPage.reload();
  await expect(
    publicPage
      .getByRole("navigation")
      .getByRole("link", { name: "Gallery", exact: true }),
  ).toHaveCount(0);
  await gallery.getByRole("button", { name: "Show", exact: true }).click();
  await expect(gallery.getByText("Visible · Active")).toBeVisible();
  await gallery
    .getByRole("button", { name: "Move Gallery up", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Display order saved.");
  await expect(page.locator(".cms-item h3").nth(6)).toHaveText("Gallery");
  await gallery
    .getByRole("button", { name: "Move Gallery down", exact: true })
    .click();
  await expect(page.locator(".cms-item h3").nth(7)).toHaveText("Gallery");
  await page
    .getByRole("tab", { name: "Contact information", exact: true })
    .click();
  await page.getByLabel("Show mobile", { exact: true }).uncheck();
  await page.getByLabel("Show email", { exact: true }).uncheck();
  await page.getByLabel("Show location", { exact: true }).uncheck();
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Contact information saved.",
  );
  await publicPage.reload();
  await expect(publicPage.getByText("94750163", { exact: true })).toHaveCount(
    0,
  );
  await expect(
    publicPage.getByText("soumitrasamanta69@gmail.com", { exact: true }),
  ).toHaveCount(0);
  // Contact privacy is separate from the explicitly public service-area copy.
  await expect(publicPage.locator("#contact .contact-item").getByText("Haldia", { exact: true })).toHaveCount(0);
  await page.getByLabel("Show mobile", { exact: true }).check();
  await page.getByLabel("Show email", { exact: true }).check();
  await page.getByLabel("Show location", { exact: true }).check();
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Contact information saved.",
  );
  await publicPage.close();
  expect(errors).toEqual([]);
});

test("image uploads publish gallery lightbox and DP without breaking mobile admin", async ({
  page,
  context,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await login(page);
  const png = await readFile("frontend/public/assets/Digital_Marketing_Agency_Website_ (1).png");
  await page.getByRole("tab", { name: "Gallery", exact: true }).click();
  await page
    .getByLabel("Title / image alt text *", { exact: true })
    .fill("Browser upload fixture");
  await page.getByLabel("Category", { exact: true }).fill("Projects");
  await page
    .getByLabel("Upload image", { exact: true })
    .setInputFiles({
      name: "browser-test.png",
      mimeType: "image/png",
      buffer: png,
    });
  await expect(page.getByRole("status")).toContainText("Image uploaded.");
  await expect(page.getByAltText("Selected image preview")).toBeVisible();
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Gallery saved.");
  await page.evaluate(async () => {
    const headers = {
      "Content-Type": "application/json",
      "X-Admin-Request": "1",
    };
    const cms = await (await fetch("/api/admin/cms")).json();
    await fetch("/api/admin/cms/gallery", {
      method: "POST",
      headers,
      body: JSON.stringify({
        image: cms.gallery[0].image,
        title: "Second browser upload fixture",
        category: "Certificates",
      }),
    });
  });
  const publicPage = await context.newPage();
  await publicPage.goto("/");
  await publicPage
    .getByRole("button", { name: "Open Browser upload fixture" })
    .click();
  await expect(publicPage.getByRole("dialog")).toBeVisible();
  await publicPage.keyboard.press("ArrowRight");
  await expect(publicPage.getByRole("dialog").getByRole("heading")).toHaveText(
    "Second browser upload fixture",
  );
  await publicPage.keyboard.press("ArrowLeft");
  await expect(publicPage.getByRole("dialog").getByRole("heading")).toHaveText(
    "Browser upload fixture",
  );
  await publicPage.keyboard.press("Escape");
  await expect(publicPage.getByRole("dialog")).not.toBeVisible();
  await expect(
    publicPage.getByRole("button", { name: "Open Browser upload fixture" }),
  ).toBeFocused();
  await publicPage
    .getByRole("button", { name: "Certificates", exact: true })
    .click();
  await expect(
    publicPage.getByRole("button", {
      name: "Open Browser upload fixture",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    publicPage.getByRole("button", {
      name: "Open Second browser upload fixture",
    }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Profile DP", exact: true }).click();
  await page
    .getByLabel("Choose or replace image")
    .setInputFiles({
      name: "browser-profile.png",
      mimeType: "image/png",
      buffer: png,
    });
  await expect(page.getByAltText("Profile image preview")).toBeVisible();
  await page.getByRole("button", { name: "Upload and save" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Profile image updated everywhere.",
  );
  await publicPage.reload();
  await expect(publicPage.locator(".profile-img")).toHaveAttribute(
    "src",
    /\/api\/media\/.+\.webp/,
  );
  await page.getByRole("button", { name: "Hide", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Photo visibility updated.",
  );
  await publicPage.reload();
  await expect(publicPage.locator(".profile-img")).toHaveCount(0);
  await page.getByRole("button", { name: "Show", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Photo visibility updated.",
  );
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete photo" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Profile picture removed.",
  );
  await publicPage.reload();
  await expect(publicPage.locator(".profile-img")).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Open admin navigation" }).click();
  await page.getByRole("tab", { name: "Profile", exact: true }).click();
  await page
    .getByLabel("Long introduction")
    .fill("Test an editable optional introduction.");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Profile saved.");
  // Restore the isolated fixture's image and text for the remaining public tests.
  await page.evaluate(async () => {
    const headers = {
      "Content-Type": "application/json",
      "X-Admin-Request": "1",
    };
    await fetch("/api/admin/cms/profile-photo", {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        photoUrl: "/assets/DSC_0068.JPG",
        photoVisible: true,
      }),
    });
    await fetch("/api/admin/cms/profile/reset", { method: "POST", headers });
    const cms = await (await fetch("/api/admin/cms")).json();
    for (const item of cms.gallery)
      await fetch("/api/admin/cms/gallery/" + item.id, {
        method: "DELETE",
        headers,
      });
  });
  await publicPage.close();
  expect(errors).toEqual([]);
});
