import { ServerResponseBuilder } from "@/lib/builders/serverResponseBuilder";
import { PAGINATION_PAGE_SIZE } from "@/lib/constants/config";
import { collections } from "@/lib/mongo";
import { RESPONSES, ResponseType } from "@/lib/types/apiResponse";
import {
  ItemRequest,
  ItemRequestUpdate,
  RequestStatus,
} from "@/lib/types/request";
import {
  isValidItemRequest,
  isValidRequestStatus,
} from "@/lib/validation/requests";
import { Filter, ObjectId } from "mongodb";

/**
 * Takes a body in the following format:
 * ```json
 * {
 *   "requestorName": "Jane Doe",
 *   "itemRequested": "Flashlights"
 * }
 * ```
 * Adds a new item request to the database. The creation date and last edited date are set to the current date
 * and the status is set to pending.
 *
 * Returns a JSON object, like so:
 * ```json
 * {
 *   "message": "Request created successfully.",
 *   "request": {
 *     "id": "unique_request_id",
 *     "requestorName": "Jane Doe",
 *     "itemName": "Sample Item",
 *     "status": "pending",
 *     "creationDate": "2023-10-01T12:00:00Z",
 *     "lastEditDate": "2023-10-01T12:00:00Z"
 *   }
 * }
 * If the database insert fails, returns a 500 Internal Server Error.
 */
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

  const insertResult = await collections.requests.insertOne(itemRequest);

  if (!insertResult.acknowledged) {
    return new ServerResponseBuilder(ResponseType.UNKNOWN_ERROR).build();
  }

  return new Response(
    JSON.stringify({
      message: RESPONSES.CREATED.message,
      request: {
        id: insertResult.insertedId.toString(),
        ...itemRequest,
      },
    }),
    {
      status: RESPONSES.CREATED.code,
    }
  );
}
/**
 * Returns all the item requests in the database in descending order of date created.
 *
 * The data is paginated, using the `page` query parameter to determine which page to return
 * (defaults to page 1 if no page is provided).
 *
 * Specify a `status` query parameter to filter requests by status.
 *
 * @see RequestStatus status - The status to filter requests by. If not provided, all requests are returned.
 * @see PAGINATION_PAGE_SIZE - The number of requests to return per page.
 */
export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const pageRaw = searchParams.get("page") || "1";
  const statusRaw = searchParams.get("status");

  if (isNaN(Number(pageRaw)) || Number(pageRaw) < 1) {
    return new ServerResponseBuilder(ResponseType.INVALID_INPUT).build();
  }

  if (statusRaw && !isValidRequestStatus(statusRaw)) {
    return new ServerResponseBuilder(ResponseType.INVALID_INPUT).build();
  }

  const page = Number(pageRaw);
  const filter: Filter<ItemRequest> = statusRaw
    ? { status: statusRaw as RequestStatus }
    : {};

  const requests = await collections.requests
    .find(filter, {
      sort: { creationDate: -1 }, // Descending order
      skip: (page - 1) * PAGINATION_PAGE_SIZE,
      limit: PAGINATION_PAGE_SIZE,
    })
    .toArray();

  return new Response(JSON.stringify(requests), {
    status: 200,
  });
}

/**
 * Takes in a body of the following format:
 * ```json
 * {
 *   "id": "________",
 *   "status": "approved"
 * }
 * ```
 * and updates the status of the request with the given id. Updates the last edited date of the request.
 *
 * If the database update fails, returns a 500 Internal Server Error.
 */
export async function PATCH(request: Request) {
  const requestData: ItemRequestUpdate = await request.json();

  if (!requestData.id || !ObjectId.isValid(requestData.id)) {
    return new ServerResponseBuilder(ResponseType.INVALID_INPUT).build();
  }

  if (!isValidRequestStatus(requestData.status)) {
    return new ServerResponseBuilder(ResponseType.INVALID_INPUT).build();
  }

  const updateResult = await collections.requests.updateOne(
    { _id: new ObjectId(requestData.id) },
    {
      $set: {
        status: requestData.status,
        lastEditDate: new Date().toISOString(),
      },
    }
  );

  if (!updateResult.acknowledged) {
    return new ServerResponseBuilder(ResponseType.UNKNOWN_ERROR).build();
  }

  if (updateResult.modifiedCount === 0) {
    return new ServerResponseBuilder(ResponseType.NOT_FOUND).build();
  }

  return new ServerResponseBuilder(ResponseType.SUCCESS).build();
}
