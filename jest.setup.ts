import { collections, mongoClient } from "@/lib/mongo";

afterAll(async () => {
  // Close the MongoDB connection after all tests are done
  // Not doing this would lead to Jest not exiting
  await mongoClient.close();
});
