import { MongoClient, type Db } from "mongodb";

let client: MongoClient | null = null;
let db: Db | null = null;
let connecting: Promise<Db> | null = null;

/**
 * Returns a connected MongoDB database handle, reusing a single
 * connection across the process. Throws if MONGODB_URI is not set —
 * callers should only invoke this from routes that actually need it,
 * not at module load time, so the rest of the API can still boot
 * without Mongo configured.
 */
export async function getMongoDb(): Promise<Db> {
  if (db) return db;
  if (connecting) return connecting;

  const uri = process.env["MONGODB_URI"];
  if (!uri) {
    throw new Error(
      "MONGODB_URI must be set to use MongoDB-backed features (courses, units, resources, purchases).",
    );
  }

  connecting = (async () => {
    client = new MongoClient(uri);
    await client.connect();
    // Uses the database name embedded in the connection string
    // (e.g. mongodb+srv://.../kasneb -> "kasneb").
    db = client.db();
    return db;
  })();

  return connecting;
}

export async function closeMongoConnection(): Promise<void> {
  await client?.close();
  client = null;
  db = null;
  connecting = null;
}
