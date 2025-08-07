import { ServerResponseBuilder } from "@/lib/builders/serverResponseBuilder";
import { collections } from "@/lib/mongo";
import { HTTP_STATUS_CODE, ResponseType } from "@/lib/types/apiResponse";
import { RequestStatus } from "@/lib/types/request";
import { isValidRequestStatus } from "@/lib/validation/requests";
import { ObjectId } from "mongodb";

/**
 * Takes an `ids` array and a `status` string in the request body.
 *
 * Returns 400 Bad Request if `ids` is not an array or `status` is not a valid Request Status. Individual updates can be invalid
 *
 * Returns 500 Internal Server Error if the database update fails. I'd like to add a check for if the find fails, but I haven't
 * found a way yet.
 *
 * Returns 200 OK if input is valid, even if no updates were made. Response structure:
 *
 * ```json
 * {
 *  "message": "Requests updated successfully.",
 *  "invalidIds": ["invalid_id_1", "invalid_id_2"],
 *}
 * ```
 * IDs are considered invalid if they are not valid ObjectId strings or if they do not correspond to existing requests in the database.
 *
 * This route performs a find operation to check if the IDs exist before attempting to update them,
 * so it can report non-existent IDs. I consider being able to detect non-existent IDs worth the extra database query.
 *
 * I originally had this method take an array of updates, where each update has an `id` and a `status` field, but I
 * found that it was more convenient to just take an array of IDs and a single status string. That way, I can return
 * 500 Internal Server Error if the update fails for any reason.
 *
 * @see RequestStatus
 */
export async function PATCH(request: Request) {
  const {
    ids,
    status,
  }: {
    ids: string[];
    status: RequestStatus;
  } = await request.json();

  if (!ids || !Array.isArray(ids)) {
    return new ServerResponseBuilder(ResponseType.INVALID_INPUT).build();
  }

  if (!isValidRequestStatus(status)) {
    return new ServerResponseBuilder(ResponseType.INVALID_INPUT).build();
  }

  const invalidIds: string[] = [];
  const validIds: string[] = [];

  ids.forEach((id) => {
    if (!ObjectId.isValid(id)) {
      invalidIds.push(id);
    } else {
      validIds.push(id);
    }
  });

  // Find existing requests to check if the IDs are valid
  const existingRequests = await collections.requests
    .find({ _id: { $in: validIds.map((id) => new ObjectId(id)) } })
    .toArray();

  const existingIds = existingRequests.map((req) => req._id.toString());
  invalidIds.push(...validIds.filter((id) => !existingIds.includes(id)));

  const updateResult = await collections.requests.updateMany(
    { _id: { $in: existingIds.map((id) => new ObjectId(id)) } },
    {
      $set: {
        status,
        lastEditDate: new Date().toISOString(),
      },
    }
  );

  if (!updateResult.acknowledged) {
    return new ServerResponseBuilder(ResponseType.UNKNOWN_ERROR).build();
  }

  return new Response(
    JSON.stringify({
      message: "Requests updated successfully.",
      invalidIds,
    }),
    {
      status: HTTP_STATUS_CODE.OK,
    }
  );
}

/**
 * Takes an array of IDs to delete. Returns 400 Bad Request if the input is not an array.
 *
 * Returns 200 OK if input is valid, even if no requests were deleted. Response structure:
 *
 * ```json
 * {
 *  "message": "Requests deleted successfully.",
 *  "invalidIds": ["invalid_id_1", "invalid_id_2"],
 *  "successfulDeleteCount": 3
 * }
 * ```
 * If the database delete fails, returns a 500 Internal Server Error.
 */
export async function DELETE(request: Request) {
  const requestData: string[] = await request.json();

  if (!requestData || !Array.isArray(requestData)) {
    return new ServerResponseBuilder(ResponseType.INVALID_INPUT).build();
  }

  const invalidIds: string[] = [];
  const validIds: string[] = [];

  requestData.forEach((id) => {
    if (!ObjectId.isValid(id)) {
      invalidIds.push(id);
    } else {
      validIds.push(id);
    }
  });

  const deleteResult = await collections.requests.deleteMany({
    _id: { $in: validIds.map((id) => new ObjectId(id)) },
  });

  if (!deleteResult.acknowledged) {
    return new ServerResponseBuilder(ResponseType.UNKNOWN_ERROR).build();
  }

  return new Response(
    JSON.stringify({
      message: "Requests deleted successfully.",
      invalidIds,
      successfulDeleteCount: deleteResult.deletedCount,
    }),
    {
      status: HTTP_STATUS_CODE.OK,
    }
  );
}
