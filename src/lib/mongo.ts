import { MongoClient } from "mongodb";
import { ItemRequest } from "./types/request";

// global.__MONGO_URI__ is set by jest-mongodb to separate each Jest worker's database
const mongoUri =
  (global as unknown as { __MONGO_URI__: string }).__MONGO_URI__ ??
  process.env.MONGODB_URI;

const dbName = process.env.DB_NAME || "test";

if (!mongoUri) {
  throw new Error("Please define the MONGODB_URI environment variable");
}

if (!dbName) {
  throw new Error("Please define the DB_NAME environment variable");
}

const mongoClient = new MongoClient(mongoUri);
const db = mongoClient.db(dbName);

const collections = {
  requests: db.collection<ItemRequest>("requests"),
};

export { mongoClient, db, collections };
