import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../src/app.js";
import { createStore } from "../src/store.js";
import sharp from "sharp";

async function fixture(t, options = {}) {
  const directory = await mkdtemp(join(tmpdir(), "portfolio-api-"));
  const filename = join(directory, "portfolio.json");
  const store = createStore(filename);
  const uploadDirectory = join(directory, "uploads");
  const app = createApp({ store, uploadDirectory, username: "admin@gmail.com", password: "admin", ...options });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    const target = await import("node:path");
    assert.equal(target.dirname(directory), tmpdir());
    await rm(directory, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (path, method = "GET", body, cookie) => fetch(base + path, {
    method,
    headers: { "Content-Type": "application/json", "X-Admin-Request": "1", ...(cookie ? { Cookie: cookie } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const login = async () => {
    const response = await request("/api/admin/login", "POST", { username: "admin@gmail.com", password: "admin" });
    assert.equal(response.status, 200);
    const header = response.headers.get("set-cookie");
    assert.match(header, /HttpOnly/);
    assert.match(header, /SameSite=Strict/);
    return header.split(";")[0];
  };
  return { base, request, login, store, filename, uploadDirectory };
}

test("health and seeded projects are public; admin data is protected", async (t) => {
  const { request } = await fixture(t);
  assert.deepEqual(await (await request("/api/health")).json(), { status: "ok" });
  assert.equal((await (await request("/api/projects")).json()).length, 3);
  assert.equal((await (await request("/api/skills")).json()).length, 5);
  assert.deepEqual(await (await request("/api/experience")).json(), []);
  assert.deepEqual(await (await request("/api/profile")).json(), { photoUrl: "/assets/DSC_0068.JPG" });
  for (const path of ["/api/admin/session", "/api/admin/messages"]) assert.equal((await request(path)).status, 401);
  assert.equal((await request("/api/admin/projects", "POST", {})).status, 401);
  for (const [path, method] of [["/api/admin/skills", "POST"], ["/api/admin/skills/skill-html", "PUT"], ["/api/admin/skills/skill-html", "DELETE"]]) {
    assert.equal((await request(path, method, {})).status, 401);
  }
  for (const [path, method] of [["/api/admin/experience", "POST"], ["/api/admin/experience/test", "PUT"], ["/api/admin/experience/test", "DELETE"], ["/api/admin/profile-photo", "POST"], ["/api/admin/profile-photo", "DELETE"]]) {
    assert.equal((await request(path, method, {})).status, 401);
  }
});

test("contact validation, persistence, read status, and deletion", async (t) => {
  const { request, login, filename } = await fixture(t);
  for (const body of [{}, { name: " ", email: "bad", message: "hi" }, { name: [], email: "x@y.com", message: "hi" }, { name: "Test", email: "x@y.com", message: "x".repeat(5001) }]) {
    assert.equal((await request("/api/contact", "POST", body)).status, 400);
  }
  assert.equal((await request("/api/contact", "POST", { name: " Test User ", email: "test@example.com", message: " Hello there " })).status, 201);
  const data = JSON.parse(await readFile(filename, "utf8"));
  assert.equal(data.messages[0].name, "Test User");
  assert.equal(data.messages[0].message, "Hello there");
  const cookie = await login();
  const messages = await (await request("/api/admin/messages", "GET", undefined, cookie)).json();
  assert.equal(messages.length, 1);
  assert.equal(messages[0].read, false);
  const path = `/api/admin/messages/${messages[0].id}`;
  assert.equal((await request(path, "PATCH", { read: "yes" }, cookie)).status, 400);
  assert.equal((await (await request(path, "PATCH", { read: true }, cookie)).json()).read, true);
  assert.equal((await request(path, "DELETE", undefined, cookie)).status, 200);
  assert.equal((await request(path, "DELETE", undefined, cookie)).status, 404);
  assert.equal(JSON.parse(await readFile(filename, "utf8")).messages.length, 0);
});

test("login rejects bad credentials and CSRF requests; logout invalidates the session", async (t) => {
  const { base, request, login } = await fixture(t);
  assert.equal((await request("/api/admin/login", "POST", { username: "admin@gmail.com", password: "wrong" })).status, 401);
  assert.equal((await request("/api/admin/login", "POST", { username: "admin", password: "admin" })).status, 401);
  assert.equal((await fetch(`${base}/api/admin/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })).status, 403);
  const cookie = await login();
  assert.equal((await request("/api/admin/session", "GET", undefined, cookie)).status, 200);
  assert.equal((await request("/api/admin/logout", "POST", undefined, cookie)).status, 200);
  assert.equal((await request("/api/admin/messages", "GET", undefined, cookie)).status, 401);
});

test("project changes persist and appear in the public API", async (t) => {
  const { request, login, store } = await fixture(t);
  const cookie = await login();
  const project = { title: "New project", description: "A new portfolio project", image: "/assets/example.png", demoUrl: "https://example.com", githubUrl: "https://github.com/example/project", technologies: ["Next.js"] };
  assert.equal((await request("/api/admin/projects", "POST", { ...project, demoUrl: "javascript:alert(1)" }, cookie)).status, 400);
  assert.equal((await request("/api/admin/projects", "POST", { ...project, image: "/assets/../secret.png" }, cookie)).status, 400);
  const created = await request("/api/admin/projects", "POST", project, cookie);
  assert.equal(created.status, 201);
  const saved = await created.json();
  assert.equal((await (await request("/api/projects")).json()).length, 4);
  assert.equal((await request(`/api/admin/projects/${saved.id}`, "PUT", { ...project, title: "Updated project" }, cookie)).status, 200);
  assert.equal((await store.read()).projects.at(-1).title, "Updated project");
  assert.equal((await request(`/api/admin/projects/${saved.id}`, "DELETE", undefined, cookie)).status, 200);
  assert.equal((await store.read()).projects.length, 3);
});

test("malformed and oversized requests return errors; contact requests are limited", async (t) => {
  const { base, request } = await fixture(t, { contactLimit: 1 });
  assert.equal((await fetch(`${base}/api/contact`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" })).status, 400);
  assert.equal((await request("/api/contact", "POST", { message: "x".repeat(20000) })).status, 413);
  assert.equal((await request("/api/contact", "POST", { name: "User", email: "user@example.com", message: "Hi" })).status, 201);
  assert.equal((await request("/api/contact", "POST", { name: "User", email: "user@example.com", message: "Hi" })).status, 429);
});

test("simultaneous writes do not lose contact messages", async (t) => {
  const { request, store } = await fixture(t);
  const responses = await Promise.all(Array.from({ length: 5 }, (_, index) => request("/api/contact", "POST", { name: `User ${index}`, email: "user@example.com", message: "Concurrent message" })));
  assert.ok(responses.every((response) => response.status === 201));
  assert.equal((await store.read()).messages.length, 5);
});

test("skills validate input, persist changes, and publish through the public API", async (t) => {
  const { request, login, filename } = await fixture(t);
  const cookie = await login();
  for (const input of [{}, { name: " ", icon: "fa-solid fa-code" }, { name: "x".repeat(61), icon: "fa-solid fa-code" }, { name: "Node.js", icon: "invalid-icon" }]) {
    assert.equal((await request("/api/admin/skills", "POST", input, cookie)).status, 400);
  }
  const created = await request("/api/admin/skills", "POST", { name: " Node.js ", icon: "fa-brands fa-node-js" }, cookie);
  assert.equal(created.status, 201);
  const skill = await created.json();
  assert.equal(skill.name, "Node.js");
  assert.equal((await (await request("/api/skills")).json()).length, 6);
  assert.equal((await createStore(filename).read()).skills.at(-1).name, "Node.js");
  const route = `/api/admin/skills/${skill.id}`;
  assert.equal((await request(route, "PUT", { name: "Backend", icon: "fa-solid fa-database" }, cookie)).status, 200);
  assert.equal((await (await request("/api/skills")).json()).at(-1).name, "Backend");
  assert.equal((await request(route, "PUT", { name: "", icon: "fa-solid fa-code" }, cookie)).status, 400);
  assert.equal((await request("/api/admin/skills/missing", "PUT", { name: "Valid", icon: "fa-solid fa-code" }, cookie)).status, 404);
  assert.equal((await request(route, "DELETE", undefined, cookie)).status, 200);
  assert.equal((await request(route, "DELETE", undefined, cookie)).status, 404);
  assert.equal((await createStore(filename).read()).skills.length, 5);
});

test("adding skills to existing portfolio data preserves projects and messages", async (t) => {
  const { store, filename } = await fixture(t);
  const existing = { messages: [{ id: "existing-message", message: "Keep this message" }], projects: [] };
  await writeFile(filename, JSON.stringify(existing));
  const migrated = await store.read();
  assert.equal(migrated.skills.length, 5);
  assert.deepEqual(migrated.messages, existing.messages);
  assert.deepEqual(migrated.projects, []);
  assert.deepEqual(migrated.experience, []);
  assert.deepEqual(migrated.profile, { photoUrl: "/assets/DSC_0068.JPG" });
  await store.update((data) => { data.skills = []; });
  const saved = await createStore(filename).read();
  assert.deepEqual(saved.skills, []);
  assert.deepEqual(saved.messages, existing.messages);
  assert.deepEqual(saved.projects, []);
});

test("experience persists joining/end dates and Present and publishes newest roles first", async (t) => {
  const { request, login, filename } = await fixture(t);
  const cookie = await login();
  const history = { company: " Test Company ", role: "Frontend Intern", employmentType: "Internship", startDate: "2023-01", endDate: "2023-06", current: false, description: "Built interfaces" };
  const created = await request("/api/admin/experience", "POST", history, cookie);
  assert.equal(created.status, 201);
  const saved = await created.json();
  assert.equal(saved.company, "Test Company");
  assert.equal((await createStore(filename).read()).experience[0].endDate, "2023-06");
  const current = await request("/api/admin/experience", "POST", { ...history, role: "Developer", employmentType: "Full-time", startDate: "2024-10", current: true }, cookie);
  assert.equal(current.status, 201);
  const active = await current.json();
  assert.equal(active.endDate, "");
  const publicList = await (await request("/api/experience")).json();
  assert.equal(publicList[0].id, active.id);
  assert.equal(publicList[0].current, true);
  assert.equal((await request(`/api/admin/experience/${saved.id}`, "PUT", { ...history, company: "Updated Company" }, cookie)).status, 200);
  assert.equal((await createStore(filename).read()).experience[0].company, "Updated Company");
  assert.equal((await request(`/api/admin/experience/${saved.id}`, "DELETE", undefined, cookie)).status, 200);
  assert.equal((await request(`/api/admin/experience/${saved.id}`, "DELETE", undefined, cookie)).status, 404);
  assert.equal((await request("/api/admin/experience/missing", "PUT", history, cookie)).status, 404);
});

test("experience rejects incomplete entries, invalid dates, and end dates before joining", async (t) => {
  const { request, login } = await fixture(t);
  const cookie = await login();
  const valid = { company: "Company", role: "Developer", employmentType: "Full-time", startDate: "2024-01", endDate: "2024-12", current: false };
  for (const invalid of [{}, { ...valid, company: " " }, { ...valid, role: [] }, { ...valid, employmentType: "invalid" }, { ...valid, startDate: "2024-13" }, { ...valid, endDate: "2023-12" }, { ...valid, current: "true" }, { ...valid, endDate: "" }]) {
    assert.equal((await request("/api/admin/experience", "POST", invalid, cookie)).status, 400);
  }
  assert.deepEqual(await (await request("/api/experience")).json(), []);
});

test("profile photos upload as validated images, persist, replace old files, and restore", async (t) => {
  const { base, request, login, filename, uploadDirectory } = await fixture(t);
  const cookie = await login();
  const image = await sharp({ create: { width: 1200, height: 800, channels: 3, background: "#2563eb" } }).png().toBuffer();
  const upload = () => fetch(`${base}/api/admin/profile-photo`, { method: "POST", headers: { "Content-Type": "image/png", "X-Admin-Request": "1", Cookie: cookie }, body: image });
  const first = await upload();
  assert.equal(first.status, 200);
  const originalPhoto = await first.json();
  assert.match(originalPhoto.photoUrl, /^\/api\/media\/[a-f0-9-]{36}\.jpg$/);
  const media = await fetch(base + originalPhoto.photoUrl);
  assert.equal(media.status, 200);
  assert.match(media.headers.get("Content-Type"), /image\/jpeg/);
  const metadata = await sharp(Buffer.from(await media.arrayBuffer())).metadata();
  assert.equal(metadata.width, 600);
  assert.equal(metadata.height, 600);
  assert.equal((await createStore(filename).read()).profile.photoUrl, originalPhoto.photoUrl);
  const second = await (await upload()).json();
  assert.notEqual(second.photoUrl, originalPhoto.photoUrl);
  assert.equal((await fetch(base + originalPhoto.photoUrl)).status, 404);
  assert.equal((await readdir(uploadDirectory)).length, 1);
  assert.deepEqual(await (await request("/api/profile")).json(), second);
  assert.equal((await request("/api/admin/profile-photo", "DELETE", undefined, cookie)).status, 200);
  assert.deepEqual(await (await request("/api/profile")).json(), { photoUrl: "/assets/DSC_0068.JPG" });
  assert.equal((await fetch(base + second.photoUrl)).status, 404);
  assert.deepEqual(await readdir(uploadDirectory), []);
});

test("profile upload rejects invalid, unsupported, and oversized files", async (t) => {
  const { base, login, store } = await fixture(t);
  const cookie = await login();
  const upload = (type, body, authenticated = true) => fetch(`${base}/api/admin/profile-photo`, { method: "POST", headers: { "Content-Type": type, "X-Admin-Request": "1", ...(authenticated ? { Cookie: cookie } : {}) }, body });
  assert.equal((await upload("image/png", Buffer.from("invalid"), false)).status, 401);
  assert.equal((await upload("image/jpeg", Buffer.from("not an image"))).status, 400);
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" /></svg>';
  assert.equal((await upload("image/svg+xml", svg)).status, 415);
  assert.equal((await upload("image/jpeg", svg)).status, 400);
  assert.equal((await upload("image/jpeg", Buffer.alloc(10 * 1024 * 1024 + 1))).status, 413);
  assert.equal((await store.read()).profile.photoUrl, "/assets/DSC_0068.JPG");
});
