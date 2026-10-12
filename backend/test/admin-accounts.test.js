import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createAdminAccounts, hashPassword, verifyPassword } from "../src/admin-accounts.js";
import { createMongoStore } from "../src/mongo-store.js";
import { createApp } from "../src/app.js";

function collectionFixture() {
  let document;
  const collection = {
    async findOne() { return document ? structuredClone(document) : null; },
    async updateOne(filter, update) {
      if (document) return { upsertedCount: 0, matchedCount: 1 };
      document = { _id: filter._id, ...structuredClone(update.$setOnInsert) };
      return { upsertedCount: 1, matchedCount: 0 };
    },
  };
  return { collection, account: () => structuredClone(document) };
}

const testUsername = "owner@example.test";
const testPassword = randomBytes(24).toString("hex");

test("password hashes use distinct salts and reject wrong passwords and malformed hashes", async () => {
  const first = await hashPassword(testPassword);
  const second = await hashPassword(testPassword);
  assert.notEqual(first, second);
  assert.ok(!first.includes(testPassword));
  assert.equal(await verifyPassword(testPassword, first), true);
  assert.equal(await verifyPassword("wrong", first), false);
  for (const hash of [null, testPassword, "scrypt$invalid$invalid"]) {
    assert.equal(await verifyPassword(testPassword, hash), false);
  }
});

test("database setup saves only a password hash and never overwrites the existing owner", async () => {
  const { collection, account } = collectionFixture();
  const accounts = createAdminAccounts(collection);
  assert.equal(await accounts.provision(testUsername, testPassword), true);
  const original = account();
  assert.equal(original.password, undefined);
  assert.ok(!JSON.stringify(original).includes(testPassword));
  assert.equal(await accounts.provision("other@example.test", "different"), false);
  assert.deepEqual(account(), original);
  const restarted = createAdminAccounts(collection);
  assert.deepEqual(await restarted.authenticate(testUsername, testPassword), { username: testUsername });
  assert.equal(await restarted.authenticate(testUsername, "wrong"), null);
  assert.equal(await restarted.authenticate("other@example.test", testPassword), null);
  for (const [username, password] of [[{}, testPassword], [testUsername, {}], [testUsername, "x".repeat(1025)]]) {
    assert.equal(await restarted.authenticate(username, password), null);
  }
});

test("simultaneous admin setup attempts preserve a single account", async () => {
  const { collection } = collectionFixture();
  const results = await Promise.all([
    createAdminAccounts(collection).provision(testUsername, testPassword),
    createAdminAccounts(collection).provision(testUsername, testPassword),
  ]);
  assert.equal(results.filter(Boolean).length, 1);
});

test("missing admin account requires database setup and invalid setup cannot create an account", async () => {
  const { collection, account } = collectionFixture();
  const accounts = createAdminAccounts(collection);
  await assert.rejects(accounts.provision(testUsername, ""));
  assert.equal(account(), undefined);
  await assert.rejects(accounts.authenticate(testUsername, testPassword), { code: "ADMIN_NOT_CONFIGURED" });
});

async function apiFixture(t, provision = true) {
  const admins = collectionFixture();
  const portfolio = collectionFixture();
  const client = {
    async connect() {}, async close() {},
    db: () => ({ collection: (name) => {
      assert.ok(["admins", "portfolio"].includes(name));
      return name === "admins" ? admins.collection : portfolio.collection;
    } }),
  };
  if (provision) await createAdminAccounts(admins.collection).provision(testUsername, testPassword);
  const store = createMongoStore("mongodb://unused", { client, loadInitialData: async () => ({ projects: [], messages: [] }) });
  // Even conflicting environment credentials cannot override a MongoDB account.
  const server = createApp({ store, username: "local@example.test", password: "local-only" }).listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(async () => { await new Promise((resolve) => server.close(resolve)); await store.close(); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (path, method = "GET", body, cookie) => fetch(base + path, {
    method, headers: { "Content-Type": "application/json", "X-Admin-Request": "1", ...(cookie ? { Cookie: cookie } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { request, store };
}

test("database login works independently of local credentials and preserves protected sessions and logout", async (t) => {
  const { request, store } = await apiFixture(t);
  const login = await request("/api/admin/login", "POST", { username: testUsername, password: testPassword });
  assert.equal(login.status, 200);
  assert.deepEqual(await login.json(), { username: testUsername });
  const cookie = login.headers.get("set-cookie").split(";")[0];
  assert.deepEqual(await (await request("/api/admin/session", "GET", undefined, cookie)).json(), { username: testUsername });
  assert.equal((await request("/api/admin/messages", "GET", undefined, cookie)).status, 200);
  assert.equal((await request("/api/admin/login", "POST", { username: "local@example.test", password: "local-only" })).status, 401);
  assert.equal((await request("/api/admin/logout", "POST", undefined, cookie)).status, 200);
  assert.equal((await request("/api/admin/session", "GET", undefined, cookie)).status, 401);
  assert.equal((await store.read()).admins, undefined);
  assert.equal((await (await request("/api/projects")).json()).length, 0);
});

test("database login with no runtime username/password returns the stored username", async (t) => {
  const { collection } = collectionFixture();
  const accounts = createAdminAccounts(collection);
  await accounts.provision(testUsername, testPassword);
  const store = { authenticateAdmin: accounts.authenticate };
  const server = createApp({ store, username: "", password: "" }).listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const result = await fetch(`http://127.0.0.1:${server.address().port}/api/admin/login`, {
    method: "POST", headers: { "Content-Type": "application/json", "X-Admin-Request": "1" },
    body: JSON.stringify({ username: testUsername, password: testPassword }),
  });
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { username: testUsername });
});

test("a missing database account returns 503 without accepting local credentials", async (t) => {
  const { request } = await apiFixture(t, false);
  const result = await request("/api/admin/login", "POST", { username: "local@example.test", password: "local-only" });
  assert.equal(result.status, 503);
  assert.match((await result.json()).message, /database/);
});

test("a failed database login returns 503 without leaking connection errors or accepting local credentials", async (t) => {
  const { request, store } = await apiFixture(t);
  store.authenticateAdmin = async () => { throw new Error("Private database connection details"); };
  const result = await request("/api/admin/login", "POST", { username: "local@example.test", password: "local-only" });
  assert.equal(result.status, 503);
  assert.deepEqual(await result.json(), { message: "The admin service is unavailable. Please try again shortly." });
});
