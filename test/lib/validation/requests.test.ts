import { ItemRequest, RequestStatus } from "@/lib/types/request";
import { isValidItemRequest } from "@/lib/validation/requests";

describe(isValidItemRequest.name, () => {
  function getTestRequest(): ItemRequest {
    return {
      requestorName: "Test User",
      itemRequested: "Test Item",
      creationDate: new Date(),
      lastEditDate: new Date(),
      status: RequestStatus.PENDING,
    };
  }

  it("returns true for a valid ItemRequest", () => {
    const request = getTestRequest();

    expect(isValidItemRequest(request)).toBe(true);
  });

  it("returns false for undefined or null requests", () => {
    expect(isValidItemRequest(undefined as any as ItemRequest)).toBe(false);
    expect(isValidItemRequest(null as any as ItemRequest)).toBe(false);
  });

  it("returns false for request with empty name and item", () => {
    const request: ItemRequest = {
      ...getTestRequest(),
      requestorName: "",
      itemRequested: "",
    };

    expect(isValidItemRequest(request)).toBe(false);
  });

  it("returns false for request with long name or item", () => {
    const longString = "a".repeat(101); // 101 characters long
    const request: ItemRequest = {
      ...getTestRequest(),
      requestorName: longString,
      itemRequested: longString,
    };

    expect(isValidItemRequest(request)).toBe(false);
  });

  it("returns false for request with invalid dates", () => {
    const request: ItemRequest = {
      ...getTestRequest(),
      creationDate: new Date("invalid-date"),
      lastEditDate: new Date("invalid-date"),
    };

    expect(isValidItemRequest(request)).toBe(false);
  });

  it("returns false for request with invalid status", () => {
    const request: ItemRequest = {
      ...getTestRequest(),
      status: "invalid-status" as any as RequestStatus, // Invalid status
    };

    expect(isValidItemRequest(request)).toBe(false);
  });

  it("returns false for request with missing fields", () => {
    const fullRequest = getTestRequest();

    // Test each field by removing it one at a time
    for (const key in fullRequest) {
      const request: Partial<ItemRequest> = { ...fullRequest }; // Spread operator to create a copy
      delete request[key as keyof ItemRequest];

      expect(isValidItemRequest(request as ItemRequest)).toBe(false);
    }
  });

  it("returns false for request with incorrect types", () => {
    const request = getTestRequest();

    const invalidTypeRequest: { [key in keyof ItemRequest]: any } = {
      requestorName: 123,
      itemRequested: true,
      creationDate: "not-a-date",
      lastEditDate: "also-not-a-date",
      status: 42,
    };

    // Test each field by replacing it with an invalid type
    for (const key in request) {
      const invalidRequest: any = { ...request };
      invalidRequest[key] = invalidTypeRequest[key as keyof ItemRequest];

      expect(isValidItemRequest(invalidRequest)).toBe(false);
    }
  });
});
