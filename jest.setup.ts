import { collections, mongoClient } from "@/lib/mongo";

beforeEach(async () => {
  await collections.requests.deleteMany({});
});

afterAll(async () => {
  // Close the MongoDB connection after all tests are done
  // Not doing this would lead to Jest not exiting
  await mongoClient.close();
});
