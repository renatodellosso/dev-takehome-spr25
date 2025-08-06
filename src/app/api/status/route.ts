import { mongoClient } from "@/lib/mongo";
import { MongoServerError } from "mongodb";

export async function GET() {
  try {
    await mongoClient.connect();

    return new Response(`Server is running! DB is connected.`, {
      status: 200,
    });
  } catch (error) {
    if (error instanceof MongoServerError) {
      console.error("Error connecting to the database:", error);
    } else {
      console.error("Unexpected error:", error);
    }

    return new Response(`Server is running! DB is not connected.`, {
      status: 500,
    });
  }
}
