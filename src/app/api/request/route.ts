import { ServerResponseBuilder } from "@/lib/builders/serverResponseBuilder";
import { PAGINATION_PAGE_SIZE } from "@/lib/constants/config";
import { collections } from "@/lib/mongo";
import { ResponseType } from "@/lib/types/apiResponse";
import { ItemRequest, RequestStatus } from "@/lib/types/request";
import { isValidItemRequest } from "@/lib/validation/requests";
import { stat } from "fs";

export async function PUT(request: Request) {
  const requestData: Pick<ItemRequest, "requestorName" | "itemRequested"> =
    await request.json();

  const itemRequest: ItemRequest = {
    // Only use the fields that are required for the request - don't let users sneak in extra data.
    requestorName: requestData.requestorName,
    itemRequested: requestData.itemRequested,
    creationDate: new Date().toISOString(),
    lastEditDate: new Date().toISOString(),
    status: RequestStatus.PENDING,
  };

  if (!isValidItemRequest(itemRequest)) {
    return new ServerResponseBuilder(ResponseType.INVALID_INPUT).build();
  }

  await collections.requests.insertOne(itemRequest);

  return new ServerResponseBuilder(ResponseType.CREATED).build();
}

export async function GET(request: Request) {
  const pageRaw = new URL(request.url).searchParams.get("page") || "1";

  if (isNaN(Number(pageRaw)) || Number(pageRaw) < 1) {
    return new ServerResponseBuilder(ResponseType.INVALID_INPUT).build();
  }

  const page = Number(pageRaw);

  const requests = await collections.requests
    .find({
      sort: { creationDate: -1 }, // Descending order
      skip: (page - 1) * PAGINATION_PAGE_SIZE,
      limit: PAGINATION_PAGE_SIZE,
    })
    .toArray();

  return new Response(JSON.stringify(requests), {
    status: 200,
  });
}
