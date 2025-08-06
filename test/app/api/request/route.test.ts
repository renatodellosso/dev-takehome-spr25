import { PUT } from "@/app/api/request/route";

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
    expect(response.status).toBe(201);
    const responseData = await response.json();
    expect(responseData.message).toBe("Resource created successfully.");
  });
});
