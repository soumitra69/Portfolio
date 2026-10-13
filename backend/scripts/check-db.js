import { connectDatabase } from "../config/database.js";

if (!process.env.MONGODB_URI) {
  console.error("Set MONGODB_URI in the backend environment before checking MongoDB.");
  process.exit(1);
}

let client;
try {
  client = await connectDatabase();
  await client.db.command({ ping: 1 });
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
