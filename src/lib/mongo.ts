import { MongoClient } from "mongodb";
import { ItemRequest } from "./types/request";

if (!process.env.MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable");
}

if (!process.env.DB_NAME) {
  throw new Error("Please define the DB_NAME environment variable");
}

const mongoClient = new MongoClient(
  // __MONGO_URI__ is set by jest-mongodb to separate each Jest worker's database
  (global as any).__MONGO_URI__ ?? process.env.MONGODB_URI
);
const db = mongoClient.db(process.env.DB_NAME);

const collections = {
  requests: db.collection<ItemRequest>("requests"),
};

export { mongoClient, db, collections };
