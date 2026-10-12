import { MongoClient } from "mongodb";
import { createAdminAccounts } from "./admin-accounts.js";

export function createMongoStore(uri, {
  database = process.env.MONGODB_DB || "portfolio",
  loadInitialData,
  client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000, connectTimeoutMS: 10000 }),
} = {}) {
  let connection;
  let queue = Promise.resolve();

  function connect() {
    if (!connection) {
      connection = (async () => {
        await client.connect();
        const collection = client.db(database).collection("portfolio");
        if (!await collection.findOne({ _id: "main" })) {
          const data = await loadInitialData();
          try {
            await collection.updateOne({ _id: "main" }, {
              $setOnInsert: { revision: 0, data },
            }, { upsert: true });
          } catch (error) {
            // Another instance may have inserted the same initial document.
            if (error.code !== 11000) throw error;
          }
        }
        return collection;
      })().catch((error) => { connection = undefined; throw error; });
    }
    return connection;
  }

  async function read() {
    const collection = await connect();
    const document = await collection.findOne({ _id: "main" });
    if (!document) throw new Error("Portfolio database document is missing.");
    return structuredClone(document.data);
  }

  function update(action) {
    const task = queue.then(async () => {
      const collection = await connect();
      for (let attempt = 0; attempt < 20; attempt++) {
        const document = await collection.findOne({ _id: "main" });
        if (!document) throw new Error("Portfolio database document is missing.");
        const data = structuredClone(document.data);
        const result = action(data);
        const saved = await collection.updateOne({ _id: "main", revision: document.revision }, {
          $set: { data }, $inc: { revision: 1 },
        });
        if (saved.matchedCount === 1) return result;
      }
      throw new Error("Portfolio data changed repeatedly. Please try again.");
    });
    queue = task.catch(() => {});
    return task;
  }

  return {
    read: () => queue.then(read),
    update,
    authenticateAdmin: async (username, password) => {
      await connect();
      return createAdminAccounts(client.db(database).collection("admins")).authenticate(username, password);
    },
    close: async () => { await queue; await client.close(); },
  };
}
