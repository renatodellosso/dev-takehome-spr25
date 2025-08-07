import { GET, PUT } from "@/app/api/request/route";
import { PAGINATION_PAGE_SIZE } from "@/lib/constants/config";
import { collections } from "@/lib/mongo";
import { RESPONSES } from "@/lib/types/apiResponse";
import { ItemRequest, RequestStatus } from "@/lib/types/request";
import { isValidItemRequest } from "@/lib/validation/requests";
import { WithId } from "mongodb";

// Done in here, not in jest.setup.ts, because clearing after non-DB-using tests caused issues
beforeEach(async () => {
  await collections.requests.deleteMany({});
});

describe(PUT.name, () => {
  it("return 201 Created for a valid request", async () => {
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

  it("creates a valid ItemRequest in the database with correct status", async () => {
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

    const itemRequest = await collections.requests.findOne({
      requestorName: "Jane Doe",
    });

    expect(itemRequest).toBeDefined();
    expect(isValidItemRequest(itemRequest!)).toBe(true);

    expect(itemRequest!.itemRequested).toBe("Another Book Title");
    expect(itemRequest!.status).toBe(RequestStatus.PENDING);
    expect(itemRequest!.creationDate).toBeDefined();
    expect(itemRequest!.lastEditDate).toBeDefined();
  });

  it("not add extra fields to the ItemRequest", async () => {
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
    it("return 400 Bad Request for invalid input", async () => {
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

    it("not create an ItemRequest in the database for invalid input", async () => {
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

describe(GET.name, () => {
  function newItemRequest(index: number): ItemRequest {
    const DAY_TO_MS = 24 * 60 * 60 * 1000;
    const today = new Date();

    const creationDate = new Date(today.getTime() - index * DAY_TO_MS);
    const editDate = new Date(today.getTime() + index * DAY_TO_MS);

    const possibleStatuses = Object.values(RequestStatus);

    return {
      requestorName: `User ${index}`,
      itemRequested: `Item ${index}`,
      creationDate: creationDate.toISOString(),
      lastEditDate: editDate.toISOString(),
      status: possibleStatuses[index % possibleStatuses.length],
    };
  }

  /**
   *  Edit dates are in reverse order of creation dates to test sorting
   */
  const SEED_REQUESTS: ItemRequest[] = Array.from(
    { length: PAGINATION_PAGE_SIZE * Object.values(RequestStatus).length * 2 }, // 2 pages of each status
    (_, i) => newItemRequest(i)
  );

  beforeEach(async () => {
    // Seed the database with test data
    await collections.requests.insertMany(SEED_REQUESTS);
  });

  it("return 200 OK for a valid request", async () => {
    const request = new Request("http://localhost/api/request", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
  });

  it("returns a list of requests", async () => {
    const request = new Request("http://localhost/api/request", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    const response = await GET(request);

    const requests = await response.json();
    expect(Array.isArray(requests)).toBe(true);
    expect(requests.length).toBeGreaterThan(0);

    for (const req of requests) {
      expect(isValidItemRequest(req)).toBe(true);
    }
  });

  it("sorts requests by creationDate in descending order", async () => {
    const request = new Request("http://localhost/api/request", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    const response = await GET(request);
    const requests = (await response.json()) as WithId<ItemRequest>[];

    // Check if the dates are in descending order
    for (let i = 0; i < requests.length - 1; i++) {
      const d1 = new Date(requests[i].creationDate);
      const d2 = new Date(requests[i + 1].creationDate);

      expect(d1.getTime()).toBeGreaterThanOrEqual(d2.getTime());
    }
  });

  describe("pagination", () => {
    it("defaults to page 1 if no page is specified", async () => {
      const defaultPageRequest = new Request("http://localhost/api/request", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const firstPageRequest = new Request(
        "http://localhost/api/request?page=1",
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );

      // Make and parse both requests simultaneously
      const [defaultPageRequests, firstPageRequests] = await Promise.all([
        GET(defaultPageRequest).then((res) => res.json()),
        GET(firstPageRequest).then((res) => res.json()),
      ]);

      expect(defaultPageRequests).toEqual(firstPageRequests);
    });

    it("returns the correct number of requests per page", async () => {
      const request = new Request("http://localhost/api/request?page=1", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const response = await GET(request);
      const requests = await response.json();

      expect(requests.length).toBe(PAGINATION_PAGE_SIZE);
    });

    it("returns the correct page of requests", async () => {
      const firstPageRequest = new Request(
        "http://localhost/api/request?page=1",
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );

      const secondPageRequest = new Request(
        "http://localhost/api/request?page=2",
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );

      const [firstPageRequests, secondPageRequests] = await Promise.all([
        GET(firstPageRequest).then(
          (res) => res.json() as Promise<WithId<ItemRequest>[]>
        ),
        GET(secondPageRequest).then(
          (res) => res.json() as Promise<WithId<ItemRequest>[]>
        ),
      ]);

      // First page's requests should have greater creation dates than second page's requests
      const firstDate = new Date(
        firstPageRequests[firstPageRequests.length - 1].creationDate
      );
      const secondDate = new Date(secondPageRequests[0].creationDate);

      expect(firstDate.getTime()).toBeGreaterThan(secondDate.getTime());
    });
  });

  describe("status filter", () => {
    it("defaults to no filter if status is not specified", async () => {
      const request = new Request("http://localhost/api/request?page=1", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const response = await GET(request);
      const requests = await response.json();

      const statuses = new Set<RequestStatus>(
        requests.map((req: ItemRequest) => req.status)
      );
      expect(statuses.size).toBeGreaterThan(1);
    });

    it("filters requests by status", async () => {
      for (const status of Object.values(RequestStatus)) {
        const request = new Request(
          `http://localhost/api/request?page=1&status=${status}`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          }
        );

        const response = await GET(request);
        const requests = await response.json();

        for (const req of requests) {
          expect(req.status).toBe(status);
        }
      }
    });

    it("returns 400 Bad Request for invalid status", async () => {
      const request = new Request(
        "http://localhost/api/request?page=1&status=invalid_status",
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await GET(request);
      expect(response.status).toBe(400);
      const responseData = await response.json();
      expect(responseData.message).toBe(RESPONSES.INVALID_INPUT.message);
    });

    it("works with pagination", async () => {
      for (const status of Object.values(RequestStatus)) {
        const firstPageRequest = new Request(
          `http://localhost/api/request?page=1&status=${status}`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          }
        );

        const secondPageRequest = new Request(
          `http://localhost/api/request?page=2&status=${status}`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          }
        );

        const [firstPageRequests, secondPageRequests] = await Promise.all([
          GET(firstPageRequest).then(
            (res) => res.json() as Promise<WithId<ItemRequest>[]>
          ),
          GET(secondPageRequest).then(
            (res) => res.json() as Promise<WithId<ItemRequest>[]>
          ),
        ]);

        // First page's requests should have greater creation dates than second page's requests
        const firstDate = new Date(
          firstPageRequests[firstPageRequests.length - 1].creationDate
        );
        const secondDate = new Date(secondPageRequests[0].creationDate);

        expect(firstDate.getTime()).toBeGreaterThan(secondDate.getTime());
      }
    });
  });
});
