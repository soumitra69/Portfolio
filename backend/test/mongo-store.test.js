import { test } from "node:test";
import assert from "node:assert/strict";
import { createMongoStore } from "../src/mongo-store.js";

function fixture() {
  let document;
  let closed = false;
  const collection = {
    async findOne() { return document ? structuredClone(document) : null; },
    async updateOne(filter, update, options) {
      if (options?.upsert) {
        document ??= { _id: filter._id, ...structuredClone(update.$setOnInsert) };
        return { matchedCount: 1 };
      }
      if (filter.revision !== document.revision) return { matchedCount: 0 };
      document.data = structuredClone(update.$set.data);
      document.revision += update.$inc.revision;
      return { matchedCount: 1 };
    },
  };
  const client = {
    async connect() {},
    db: () => ({ collection: () => collection }),
    async close() { closed = true; },
  };
  const initial = { messages: [], projects: [{ id: "existing" }], skills: [], experience: [], profile: { photoUrl: "/assets/original.jpg" } };
  const store = () => createMongoStore("mongodb://unused", { client, loadInitialData: async () => structuredClone(initial) });
  return { store, initial, isClosed: () => closed };
}

test("MongoDB imports existing data once and preserves it across store instances", async () => {
  const { store, initial, isClosed } = fixture();
  const first = store();
  assert.deepEqual(await first.read(), initial);
  await first.update((data) => { data.projects.push({ id: "new" }); });
  const second = store();
  assert.equal((await second.read()).projects.length, 2);
  const copy = await first.read();
  copy.projects.length = 0;
  assert.equal((await first.read()).projects.length, 2);
  await first.close();
  assert.equal(isClosed(), true);
});

test("MongoDB revision checks preserve simultaneous writes from different instances", async () => {
  const { store } = fixture();
  const first = store();
  const second = store();
  await first.read();
  await Promise.all(Array.from({ length: 10 }, (_, id) => (id % 2 ? first : second).update((data) => data.messages.push({ id }))));
  const data = await first.read();
  assert.equal(data.messages.length, 10);
  assert.equal(new Set(data.messages.map((message) => message.id)).size, 10);
});

test("A failed MongoDB mutation does not persist changes or block later updates", async () => {
  const { store, initial } = fixture();
  const database = store();
  await assert.rejects(database.update((data) => { data.projects = []; throw new Error("Invalid change"); }));
  assert.deepEqual(await database.read(), initial);
  await database.update((data) => data.messages.push({ id: "saved" }));
  assert.equal((await database.read()).messages.length, 1);
});

test("A failed MongoDB connection is retried without falling back to local data", async () => {
  let connections = 0;
  const document = { _id: "main", revision: 0, data: { messages: [] } };
  const client = {
    async connect() { if (++connections === 1) throw new Error("Unavailable"); },
    db: () => ({ collection: () => ({ findOne: async () => document }) }),
    async close() {},
  };
  const database = createMongoStore("mongodb://unused", { client, loadInitialData: () => assert.fail("Existing database must not be reseeded") });
  await assert.rejects(database.read());
  assert.deepEqual(await database.read(), { messages: [] });
  assert.equal(connections, 2);
});
