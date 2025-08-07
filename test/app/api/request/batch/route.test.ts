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
    const request = new Request("http://localhost/api/request", {
      method: "PATCH",
      body: JSON.stringify([
        {
          id: "some-valid-id",
          status: "approved",
        },
      ]),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request);

    expect(response.status).toBe(HTTP_STATUS_CODE.OK);
    const responseData = await response.json();

    expect(responseData.message).toEqual("Requests updated successfully.");
  });

  it("returns 200 OK for request data that is an empty array", async () => {
    const request = new Request("http://localhost/api/request", {
      method: "PATCH",
      body: JSON.stringify([]),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request);

    expect(response.status).toBe(HTTP_STATUS_CODE.OK);
    const responseData = await response.json();
    expect(responseData.message).toEqual("Requests updated successfully.");
  });

  it("returns 400 Bad Request for non-array request data", async () => {
    const request = new Request("http://localhost/api/request", {
      method: "PATCH",
      body: JSON.stringify({ id: "invalid-id", status: "unknown" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request);

    expect(response.status).toBe(HTTP_STATUS_CODE.BAD_REQUEST);
    const responseData = await response.json();
    expect(responseData.message).toEqual(RESPONSES.INVALID_INPUT.message);
  });

  it("updates multiple requests with valid IDs and statuses", async () => {
    const ids = await getRequestIds();

    const request = new Request("http://localhost/api/request", {
      method: "PATCH",
      body: JSON.stringify([
        { id: ids[0], status: RequestStatus.APPROVED },
        { id: ids[1], status: RequestStatus.COMPLETED },
      ]),
      headers: { "Content-Type": "application/json" },
    });

    await PATCH(request);

    const [updatedRequest1, updatedRequest2] = await Promise.all([
      collections.requests.findOne({ _id: new ObjectId(ids[0]) }),
      collections.requests.findOne({ _id: new ObjectId(ids[1]) }),
    ]);

    expect(updatedRequest1?.status).toBe(RequestStatus.APPROVED);
    expect(updatedRequest2?.status).toBe(RequestStatus.COMPLETED);
  });

  it("sets lastEditDate to current date on updates", async () => {
    const ids = await getRequestIds();

    const request = new Request("http://localhost/api/request", {
      method: "PATCH",
      body: JSON.stringify([
        { id: ids[0], status: RequestStatus.APPROVED },
        { id: ids[1], status: RequestStatus.COMPLETED },
      ]),
      headers: { "Content-Type": "application/json" },
    });

    await PATCH(request);

    const [updatedRequest1, updatedRequest2] = await Promise.all([
      collections.requests.findOne({ _id: new ObjectId(ids[0]) }),
      collections.requests.findOne({ _id: new ObjectId(ids[1]) }),
    ]);

    const currentDate = new Date().toDateString();

    expect(updatedRequest1?.lastEditDate).toBeDefined();
    expect(new Date(updatedRequest1!.lastEditDate).toDateString()).toEqual(
      currentDate
    );
    expect(updatedRequest2?.lastEditDate).toBeDefined();
    expect(new Date(updatedRequest2!.lastEditDate).toDateString()).toEqual(
      currentDate
    );
  });

  it("returns errors for invalid IDs and statuses", async () => {
    const ids = await getRequestIds();
    const invalidId = new ObjectId();

    const request = new Request("http://localhost/api/request", {
      method: "PATCH",
      body: JSON.stringify([
        { id: invalidId, status: RequestStatus.APPROVED },
        { id: "invalid-id", status: RequestStatus.COMPLETED },
        { id: ids[1], status: "unknown" },
      ]),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request);

    const responseData = await response.json();
    expect(responseData.errors).toHaveLength(3);
    // Use containEqual so order doesn't matter
    expect(responseData.errors).toContainEqual({
      id: invalidId.toString(),
      invalidFields: ["id"],
    });
    expect(responseData.errors).toContainEqual({
      id: "invalid-id",
      invalidFields: ["id"],
    });
    expect(responseData.errors).toContainEqual({
      id: ids[1],
      invalidFields: ["status"],
    });
  });

  it("allows mixing valid and invalid updates", async () => {
    const ids = await getRequestIds();

    const request = new Request("http://localhost/api/request", {
      method: "PATCH",
      body: JSON.stringify([
        { id: ids[0], status: RequestStatus.APPROVED },
        { id: "invalid-id", status: RequestStatus.COMPLETED },
        { id: ids[1], status: "unknown" },
      ]),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request);

    const responseData = await response.json();
    expect(responseData.successfulUpdateCount).toBe(1);
    expect(responseData.errors).toHaveLength(2);
    expect(responseData.errors).toEqual([
      { id: "invalid-id", invalidFields: ["id"] },
      { id: ids[1], invalidFields: ["status"] },
    ]);
  });

  it("does not update requests with invalid statuses", async () => {
    const ids = await getRequestIds();

    const originalRequest = await collections.requests.findOne({
      _id: new ObjectId(ids[0]),
    });

    const request = new Request("http://localhost/api/request", {
      method: "PATCH",
      body: JSON.stringify([{ id: ids[0], status: "invalid-status" }]),
      headers: { "Content-Type": "application/json" },
    });

    await PATCH(request);

    const updatedRequest = await collections.requests.findOne({
      _id: new ObjectId(ids[0]),
    });

    expect(updatedRequest?.status).toBe(originalRequest?.status);
    expect(updatedRequest?.lastEditDate).toBe(originalRequest?.lastEditDate);
  });

  it("adds errors if a database update fails", async () => {
    // Mock the updateMany method to simulate a database failure
    const originalUpdateMany = collections.requests.updateMany;
    collections.requests.updateMany = jest.fn().mockResolvedValue({
      acknowledged: false,
      modifiedCount: 0,
    } as any);

    const ids = await getRequestIds();

    const request = new Request("http://localhost/api/request", {
      method: "PATCH",
      body: JSON.stringify([
        { id: ids[0], status: RequestStatus.APPROVED },
        { id: ids[1], status: RequestStatus.APPROVED },
      ]),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request);

    const responseData = await response.json();
    expect(responseData.successfulUpdateCount).toBe(0);
    expect(responseData.errors).toHaveLength(1);
    expect(responseData.errors[0].message).toBe(
      "An unknown error occurred while updating requests with this status."
    );
    expect(responseData.errors[0].status).toBe(RequestStatus.APPROVED);

    // Restore the original method
    collections.requests.updateMany = originalUpdateMany;
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
