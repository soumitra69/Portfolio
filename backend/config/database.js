import mongoose from "mongoose";

export async function connectDatabase(uri = process.env.MONGODB_URI, database = process.env.MONGODB_DB || "portfolio") {
  if (!uri) throw new Error("Set MONGODB_URI in the backend environment.");
  const connection = mongoose.createConnection(uri, {
    dbName: database, serverSelectionTimeoutMS: 10000, connectTimeoutMS: 10000,
    maxPoolSize: 10, bufferCommands: false, autoCreate: false,
  });
  connection.on("error", (error) => console.error(`MongoDB connection error (${error.name}).`));
  try { await connection.asPromise(); return connection; }
  catch (error) { await connection.close().catch(() => {}); throw error; }
}
