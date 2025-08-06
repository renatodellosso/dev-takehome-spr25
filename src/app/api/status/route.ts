import { db, mongoClient } from "@/lib/mongo";

export async function GET(request: Request) {
  try {
    await mongoClient.connect();

    return new Response(`Server is running! DB is connected.`, {
      status: 200,
    });
  } catch (error) {
    console.error("Error connecting to the database:", error);
    return new Response(`Server is running! DB is not connected.`, {
      status: 500,
    });
  }
}
