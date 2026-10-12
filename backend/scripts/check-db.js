import { MongoClient } from "mongodb";

if (!process.env.MONGODB_URI) {
  console.error("Set MONGODB_URI in the backend environment before checking MongoDB.");
  process.exit(1);
}

let client;
try {
  client = new MongoClient(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000, connectTimeoutMS: 10000,
  });
  await client.connect();
  await client.db(process.env.MONGODB_DB || "portfolio").command({ ping: 1 });
  console.log("MongoDB connection verified.");
} catch (error) {
  const authenticationFailed = error.code === 18 || /authentication|bad auth/i.test(error.message);
  console.error(authenticationFailed
    ? "MongoDB authentication failed. Check the Atlas database username and password in MONGODB_URI."
    : `MongoDB connection failed (${error.name}). Check the URI and Atlas Network Access.`);
  process.exitCode = 1;
} finally {
  await client?.close();
}
