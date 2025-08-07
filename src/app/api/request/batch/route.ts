import { ServerResponseBuilder } from "@/lib/builders/serverResponseBuilder";
import { collections } from "@/lib/mongo";
import {
  HTTP_STATUS_CODE,
  RESPONSES,
  ResponseType,
} from "@/lib/types/apiResponse";
import { ItemRequestUpdate, RequestStatus } from "@/lib/types/request";
import { isValidRequestStatus } from "@/lib/validation/requests";
import { ObjectId } from "mongodb";

/**
 * Takes an array of updates, where each update has an `id` and a `status` field.
 *
 * Returns 400 Bad Request if the input is not an array. Individual updates can be invalid
 *
 * Returns 200 OK if input is valid, even if no updates were made. Response structure:
 *
 * ```json
 * {
 *  "message": "Requests updated successfully.",
 *  "errors": [
 *    {
 *      "id": "invalid_id",
 *      "invalidFields": ["status"]
 *    },
 *    {
 *      "id": "another_invalid_id",
 *      "invalidFields": ["id", "status"]
 *    },
 *    {
 *      "status": "approved",
 *      "message": "An unknown error occurred while updating requests with this status."
 *    }
 *  ],
 *  "successfulUpdateCount": 5
 *}
 * ```
 *
 * Updates are sorted by status to take advantage of MongoDB's `updateMany` operation.
 * Will update `lastEditDate` to the current date for each updated request.
 *
 * This route performs a find operation to check if the IDs exist before attempting to update them,
 * so it can report non-existent IDs. I consider this a worthwhile trade-off, though it does make
 * the operation slower than a single update query.
 */
export async function PATCH(request: Request) {
  const requestData: ItemRequestUpdate[] = await request.json();

  if (!requestData || !Array.isArray(requestData)) {
    return new ServerResponseBuilder(ResponseType.INVALID_INPUT).build();
  }

  const errors: (
    | {
        id: string;
        invalidFields: (keyof ItemRequestUpdate)[];
      }
    | {
        status: RequestStatus;
        message: string;
      }
  )[] = [];

  let validUpdateRequests = requestData.filter((item) => {
    const error: (typeof errors)[0] = {
      id: item.id,
      invalidFields: [],
    };

    if (!item.id || !ObjectId.isValid(item.id)) {
      error.invalidFields.push("id");
    }

    if (!item.status || !isValidRequestStatus(item.status)) {
      error.invalidFields.push("status");
    }

    if (error.invalidFields.length > 0) {
      errors.push(error);
      return false;
    }

    return true;
  });

  // Find the requests for valid IDs. I don't like the extra DB query here, but I can't think of a better way to detect non-existent IDs
  const existingRequests = await collections.requests
    .find({
      _id: { $in: validUpdateRequests.map((item) => new ObjectId(item.id)) },
    })
    .toArray();

  const existingRequestIds = new Set(
    existingRequests.map((req) => req._id.toString())
  );

  // Filter out requests that do not exist in the database
  validUpdateRequests = validUpdateRequests.filter((item) => {
    if (existingRequestIds.has(item.id)) {
      return true;
    }

    errors.push({
      id: item.id,
      invalidFields: ["id"],
    });
    return false;
  });

  // Sort updates by status to take advantage of updateMany
  const updatesByStatus: Record<RequestStatus, ItemRequestUpdate[]> = {
    [RequestStatus.PENDING]: [],
    [RequestStatus.APPROVED]: [],
    [RequestStatus.COMPLETED]: [],
    [RequestStatus.REJECTED]: [],
  };

  validUpdateRequests.forEach((update) => {
    updatesByStatus[update.status].push({
      id: update.id,
      status: update.status,
    });
  });

  async function updateMany(ids: string[], status: RequestStatus) {
    const result = await collections.requests.updateMany(
      { _id: { $in: ids.map((id) => new ObjectId(id)) } },
      { $set: { status, lastEditDate: new Date().toISOString() } }
    );

    if (!result.acknowledged) {
      errors.push({
        status,
        message:
          "An unknown error occurred while updating requests with this status.",
      });
      return null;
    }

    return result;
  }

  const updatePromises = Object.entries(updatesByStatus).map(
    async ([status, updates]) => {
      if (updates.length > 0) {
        return updateMany(
          updates.map((update) => update.id),
          status as RequestStatus
        );
      }
      return Promise.resolve();
    }
  );

  const updateResults = await Promise.all(updatePromises);

  const successfulUpdateCount = updateResults.reduce(
    (acc, result) => acc + (result?.modifiedCount || 0),
    0
  );

  return new Response(
    JSON.stringify({
      message: "Requests updated successfully.",
      errors,
      successfulUpdateCount,
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
