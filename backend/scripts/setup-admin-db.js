import { connectDatabase } from "../config/database.js";
import { createAdminAccounts } from "../src/admin-accounts.js";

let client;
try {
  if (!process.env.MONGODB_URI || !process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
    throw new Error("Set MONGODB_URI, ADMIN_USERNAME and ADMIN_PASSWORD privately before running database setup.");
  }
  client = await connectDatabase();
  const collection = client.db.collection("admins");
  const created = await createAdminAccounts(collection).provision(process.env.ADMIN_USERNAME, process.env.ADMIN_PASSWORD);
  console.log(created
    ? "Admin account created in MongoDB with a password hash. No credentials were saved to a local data file."
    : "A MongoDB admin account already exists. Its credentials were preserved.");
} catch (error) {
  const authenticationFailed = error.code === 18 || /authentication|bad auth/i.test(error.message);
  console.error(authenticationFailed
    ? "MongoDB authentication failed. Check the Atlas database username and password in MONGODB_URI."
    : !client ? error.message : `Database admin setup failed (${error.name}). Check MongoDB credentials and network access.`);
  process.exitCode = 1;
} finally {
  await client?.close();
}
