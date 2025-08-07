import { DELETE, PATCH } from "@/app/api/request/batch/route";
import { collections } from "@/lib/mongo";
import { HTTP_STATUS_CODE, RESPONSES } from "@/lib/types/apiResponse";
import { getSeedRequests, RequestStatus } from "@/lib/types/request";
import { ObjectId } from "mongodb";

beforeEach(async () => {
  // Seed the database with test data
  await collections.requests.insertMany(getSeedRequests());
});

async function getRequestIds() {
  const requests = await collections.requests.find({}).toArray();
  return requests.map((req) => req._id.toString());
}

describe(PATCH.name, () => {
  it("returns 200 OK for valid request data", async () => {
    const ids = await getRequestIds();

    const request = new Request("http://localhost/api/request/batch", {
      method: "PATCH",
      body: JSON.stringify({ ids, status: RequestStatus.APPROVED }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request);

    expect(response.status).toBe(HTTP_STATUS_CODE.OK);
    const responseData = await response.json();
    expect(responseData.message).toEqual("Requests updated successfully.");
  });

  it("returns 400 Bad Request for non-array 'ids' field", async () => {
    const request = new Request("http://localhost/api/request/batch", {
      method: "PATCH",
      body: JSON.stringify({
        ids: "invalid-id",
        status: RequestStatus.APPROVED,
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request);

    expect(response.status).toBe(HTTP_STATUS_CODE.BAD_REQUEST);
    const responseData = await response.json();
    expect(responseData.message).toEqual(RESPONSES.INVALID_INPUT.message);
  });

  it("returns 400 Bad Request for invalid 'status' field", async () => {
    const ids = await getRequestIds();

    const request = new Request("http://localhost/api/request/batch", {
      method: "PATCH",
      body: JSON.stringify({ ids, status: "invalid-status" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request);

    expect(response.status).toBe(HTTP_STATUS_CODE.BAD_REQUEST);
    const responseData = await response.json();
    expect(responseData.message).toEqual(RESPONSES.INVALID_INPUT.message);
  });

  it("returns 500 Internal Server Error if the database update fails", async () => {
    // Mock the updateMany method to simulate a database failure
    const originalUpdateMany = collections.requests.updateMany;
    collections.requests.updateMany = jest.fn().mockResolvedValue({
      acknowledged: false,
      modifiedCount: 0,
    } as any);

    const ids = await getRequestIds();

    const request = new Request("http://localhost/api/request/batch", {
      method: "PATCH",
      body: JSON.stringify({ ids, status: RequestStatus.APPROVED }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request);

    expect(response.status).toBe(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR);
    const responseData = await response.json();
    expect(responseData.message).toEqual(RESPONSES.UNKNOWN_ERROR.message);

    // Restore the original method
    collections.requests.updateMany = originalUpdateMany;
  });

  it("updates multiple requests with valid IDs", async () => {
    const ids = await getRequestIds();

    const request = new Request("http://localhost/api/request/batch", {
      method: "PATCH",
      body: JSON.stringify({
        ids: [ids[0], ids[1]],
        status: RequestStatus.APPROVED,
      }),
      headers: { "Content-Type": "application/json" },
    });

    await PATCH(request);

    const itemRequests = await collections.requests
      .find({ _id: { $in: [new ObjectId(ids[0]), new ObjectId(ids[1])] } })
      .toArray();

    expect(itemRequests).toHaveLength(2);
    itemRequests.forEach((req) => {
      expect(req.status).toBe(RequestStatus.APPROVED);
    });
  });

  it("updates lastEditDate for updated requests", async () => {
    const ids = await getRequestIds();

    const request = new Request("http://localhost/api/request/batch", {
      method: "PATCH",
      body: JSON.stringify({
        ids: [ids[0], ids[1]],
        status: RequestStatus.APPROVED,
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request);

    const itemRequests = await collections.requests
      .find({ _id: { $in: [new ObjectId(ids[0]), new ObjectId(ids[1])] } })
      .toArray();

    expect(itemRequests).toHaveLength(2);
    // Convert ISO strings to date strings
    itemRequests.forEach((req) => {
      expect(req.lastEditDate).toBeDefined();
      expect(new Date(req.lastEditDate).toDateString()).toEqual(
        new Date().toDateString()
      );
    });
  });

  it("returns invalid IDs in the response", async () => {
    const ids = await getRequestIds();
    const invalidId = "invalid-id";

    const request = new Request("http://localhost/api/request/batch", {
      method: "PATCH",
      body: JSON.stringify({
        ids: [ids[0], invalidId],
        status: RequestStatus.APPROVED,
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request);

    const responseData = await response.json();
    expect(responseData.invalidIds).toHaveLength(1);
    expect(responseData.invalidIds).toEqual(["invalid-id"]);
  });

  it("updates valid IDs, even if some are invalid", async () => {
    const ids = await getRequestIds();
    const nonExistentId = new ObjectId().toString();

    const request = new Request("http://localhost/api/request/batch", {
      method: "PATCH",
      body: JSON.stringify({
        ids: [ids[0], nonExistentId],
        status: RequestStatus.APPROVED,
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request);

    const responseData = await response.json();
    expect(responseData.invalidIds).toContain(nonExistentId);
    expect(responseData.invalidIds).toHaveLength(1);

    const itemRequests = await collections.requests
      .find({ _id: new ObjectId(ids[0]) })
      .toArray();

    expect(itemRequests).toHaveLength(1);
    expect(itemRequests[0].status).toBe(RequestStatus.APPROVED);
  });

  it("returns a correct successfulUpdateCount", async () => {
    const ids = await getRequestIds();

    const request = new Request("http://localhost/api/request/batch", {
      method: "PATCH",
      body: JSON.stringify({
        ids: [ids[0], ids[1], new ObjectId().toString()],
        status: RequestStatus.APPROVED,
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request);

    const responseData = await response.json();
    expect(responseData.successfulUpdateCount).toBe(2);
  });
});

describe(DELETE.name, () => {
  it("returns 200 OK for valid request data", async () => {
    const ids = await getRequestIds();

    const request = new Request("http://localhost/api/request", {
      method: "DELETE",
      body: JSON.stringify([ids[0]]),
      headers: { "Content-Type": "application/json" },
    });

    const response = await DELETE(request);

    expect(response.status).toBe(HTTP_STATUS_CODE.OK);
    const responseData = await response.json();
    expect(responseData.message).toEqual("Requests deleted successfully.");
  });

  it("returns 400 Bad Request for non-array request data", async () => {
    const request = new Request("http://localhost/api/request", {
      method: "DELETE",
      body: JSON.stringify({ id: "invalid-id" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await DELETE(request);

    expect(response.status).toBe(HTTP_STATUS_CODE.BAD_REQUEST);
    const responseData = await response.json();
    expect(responseData.message).toEqual(RESPONSES.INVALID_INPUT.message);
  });

  it("returns 500 Internal Server Error if the database delete fails", async () => {
    // Mock the deleteMany method to simulate a database failure
    const originalDeleteMany = collections.requests.deleteMany;
    collections.requests.deleteMany = jest.fn().mockResolvedValue({
      acknowledged: false,
      deletedCount: 0,
    } as any);

    const ids = await getRequestIds();

    const request = new Request("http://localhost/api/request", {
      method: "DELETE",
      body: JSON.stringify([ids[0]]),
      headers: { "Content-Type": "application/json" },
    });

    const response = await DELETE(request);

    expect(response.status).toBe(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR);
    const responseData = await response.json();
    expect(responseData.message).toEqual(RESPONSES.UNKNOWN_ERROR.message);

    // Restore the original method
    collections.requests.deleteMany = originalDeleteMany;
  });

  it("deletes multiple requests with valid IDs", async () => {
    const ids = await getRequestIds();

    const request = new Request("http://localhost/api/request", {
      method: "DELETE",
      body: JSON.stringify([ids[0], ids[1]]),
      headers: { "Content-Type": "application/json" },
    });

    await DELETE(request);

    const requests = await collections.requests
      .find({ _id: { $in: [new ObjectId(ids[0]), new ObjectId(ids[1])] } })
      .toArray();
    expect(requests).toHaveLength(0);
  });

  it("adds invalid IDs to the response", async () => {
    const ids = await getRequestIds();
    const invalidId = "invalid-id";

    const request = new Request("http://localhost/api/request", {
      method: "DELETE",
      body: JSON.stringify([ids[0], invalidId]),
      headers: { "Content-Type": "application/json" },
    });

    const response = await DELETE(request);

    const responseData = await response.json();
    expect(responseData.invalidIds).toHaveLength(1);
    expect(responseData.invalidIds).toEqual(["invalid-id"]);
  });

  it("returns a correct successfulDeleteCount", async () => {
    const ids = await getRequestIds();

    const request = new Request("http://localhost/api/request", {
      method: "DELETE",
      body: JSON.stringify([ids[0], ids[1], new ObjectId().toString()]),
      headers: { "Content-Type": "application/json" },
    });

    const response = await DELETE(request);

    const responseData = await response.json();
    expect(responseData.successfulDeleteCount).toBe(2);
  });
});
