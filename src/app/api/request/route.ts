import { ServerResponseBuilder } from "@/lib/builders/serverResponseBuilder";
import { collections } from "@/lib/mongo";
import { ResponseType } from "@/lib/types/apiResponse";
import { ItemRequest, RequestStatus } from "@/lib/types/request";
import { isValidItemRequest } from "@/lib/validation/requests";

export async function PUT(request: Request) {
  const requestData: Pick<ItemRequest, "requestorName" | "itemRequested"> =
    await request.json();

  const itemRequest: ItemRequest = {
    // Only use the fields that are required for the request - don't let users sneak in extra data.
    requestorName: requestData.requestorName,
    itemRequested: requestData.itemRequested,
    creationDate: new Date(),
    lastEditDate: new Date(),
    status: RequestStatus.PENDING,
  };

  if (!isValidItemRequest(itemRequest)) {
    return new ServerResponseBuilder(ResponseType.INVALID_INPUT).build();
  }

  await collections.requests.insertOne(itemRequest);

  return new ServerResponseBuilder(ResponseType.CREATED).build();
}
