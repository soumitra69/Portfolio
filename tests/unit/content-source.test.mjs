import { test } from "node:test";
import assert from "node:assert/strict";
import offline from "../../frontend/shared/offline-content.json" with { type: "json" };
import { readPublicContent } from "../../frontend/services/content-source.mjs";

const env = { BACKEND_URL: "https://backend.example" };

test("HTTP failures, network failures and invalid content preserve the original portfolio", async () => {
  for (const fetcher of [
    async () => new Response("unavailable", { status: 503 }),
    async () => new Response("not found", { status: 404 }),
    async () => { throw new TypeError("network failure"); },
    async () => Response.json({ message: "unexpected response" }),
    async () => new Response("invalid JSON"),
  ]) {
    const content = await readPublicContent({ fetcher, env });
    assert.equal(content.availability, "offline");
    assert.equal(content.isStatic, true);
    assert.equal(content.profile.name, "Soumitra Samanta");
    assert.equal(content.projects.length, 3);
    assert.deepEqual(content.sections.map((section) => section.key), offline.sections.map((section) => section.key));
    assert.equal(content.profile.photoUrl, "");
    for (const key of ["email", "mobile", "location"]) assert.equal(content.contactInfo[key], "");
    assert.deepEqual(content.socialLinks, []);
    assert.equal(content.messages, undefined);
    content.profile.name = "mutated";
  }
});

test("the next successful backend response restores live data and always bypasses caches", async () => {
  const content = { ...structuredClone(offline), profile: { ...offline.profile, name: "Live owner" } };
  const result = await readPublicContent({ env, fetcher: async (url, options) => {
    assert.equal(url, "https://backend.example/api/content");
    assert.equal(options.cache, "no-store");
    assert.ok(options.signal instanceof AbortSignal);
    return Response.json(content);
  } });
  assert.equal(result.availability, "live");
  assert.equal(result.isStatic, false);
  assert.equal(result.profile.name, "Live owner");
});
