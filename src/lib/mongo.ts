import { MongoClient } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable");
}

if (!process.env.DB_NAME) {
  throw new Error("Please define the DB_NAME environment variable");
}

const mongoClient = new MongoClient(process.env.MONGODB_URI);
const db = mongoClient.db(process.env.DB_NAME);

const collections = {
  requests: db.collection("requests"),
};

export { mongoClient, db, collections };
