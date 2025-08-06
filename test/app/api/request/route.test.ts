import { PUT } from "@/app/api/request/route";
import { collections } from "@/lib/mongo";
import { RESPONSES } from "@/lib/types/apiResponse";
import { ItemRequest, RequestStatus } from "@/lib/types/request";
import { isValidItemRequest } from "@/lib/validation/requests";

describe(PUT.name, () => {
  it("should return 201 Created for a valid request", async () => {
    const request = new Request("http://localhost/api/request", {
      method: "PUT",
      body: JSON.stringify({
        requestorName: "John Doe",
        itemRequested: "Book Title",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PUT(request);
    const responseData = await response.json();
    expect(response.status).toBe(RESPONSES.CREATED.code);
    expect(responseData.message).toBe(RESPONSES.CREATED.message);
  });

  it("creates a valid ItemRequest in the database", async () => {
    // I tried mocking @/lib/mongo.collections.requests.insertOne, but Jest wasn't picking up the call to it.

    const request = new Request("http://localhost/api/request", {
      method: "PUT",
      body: JSON.stringify({
        requestorName: "Jane Doe",
        itemRequested: "Another Book Title",
      }),
      headers: { "Content-Type": "application/json" },
    });

    await PUT(request);

    const itemRequest = (await collections.requests.findOne({
      requestorName: "Jane Doe",
    })) as ItemRequest | null;

    expect(itemRequest).toBeDefined();
    expect(isValidItemRequest(itemRequest!)).toBe(true);

    expect(itemRequest!.itemRequested).toBe("Another Book Title");
    expect(itemRequest!.status).toBe(RequestStatus.PENDING);
    expect(itemRequest!.creationDate).toBeDefined();
    expect(itemRequest!.lastEditDate).toBeDefined();
  });

  it("should not add extra fields to the ItemRequest", async () => {
    const request = new Request("http://localhost/api/request", {
      method: "PUT",
      body: JSON.stringify({
        requestorName: "Extra Fields Test",
        itemRequested: "Test Item",
        extraField: "This should not be saved",
      }),
      headers: { "Content-Type": "application/json" },
    });

    await PUT(request);

    const itemRequest = (await collections.requests.findOne({
      requestorName: "Extra Fields Test",
    })) as (ItemRequest & { extraField?: string }) | null;

    expect(itemRequest).toBeDefined();
    expect(isValidItemRequest(itemRequest!)).toBe(true);
    expect(itemRequest!.extraField).toBeUndefined();
  });

  describe("invalid input", () => {
    it("should return 400 Bad Request for invalid input", async () => {
      const request = new Request("http://localhost/api/request", {
        method: "PUT",
        body: JSON.stringify({
          requestorName: "", // Invalid: empty name
          itemRequested: "Some Item",
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await PUT(request);

      const responseData = await response.json();
      expect(response.status).toBe(RESPONSES.INVALID_INPUT.code);
      expect(responseData.message).toBe(RESPONSES.INVALID_INPUT.message);
    });

    it("should not create an ItemRequest in the database for invalid input", async () => {
      const request = new Request("http://localhost/api/request", {
        method: "PUT",
        body: JSON.stringify({
          requestorName: "", // Invalid: empty name
          itemRequested: "Invalid Item",
        }),
        headers: { "Content-Type": "application/json" },
      });

      await PUT(request);

      const itemRequest = await collections.requests.findOne({
        requestorName: "",
      });

      expect(itemRequest).toBeNull();
    });
  });
});
