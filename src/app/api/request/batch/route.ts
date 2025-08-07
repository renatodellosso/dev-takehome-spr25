import { ServerResponseBuilder } from "@/lib/builders/serverResponseBuilder";
import { collections } from "@/lib/mongo";
import { HTTP_STATUS_CODE, ResponseType } from "@/lib/types/apiResponse";
import { ItemRequestUpdate, RequestStatus } from "@/lib/types/request";
import { isValidRequestStatus } from "@/lib/validation/requests";
import { ObjectId } from "mongodb";

export async function PATCH(request: Request) {
  const requestData: ItemRequestUpdate[] = await request.json();

  if (!requestData || !Array.isArray(requestData)) {
    return new ServerResponseBuilder(ResponseType.INVALID_INPUT).build();
  }

  const errors: {
    id: string;
    invalidFields: (keyof ItemRequestUpdate)[];
  }[] = [];

  const validUpdateRequests = requestData.filter((item) => {
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

  function updateMany(ids: string[], status: RequestStatus) {
    return collections.requests.updateMany(
      { _id: { $in: ids.map((id) => new ObjectId(id)) } },
      { $set: { status, lastEditDate: new Date().toISOString() } }
    );
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

  let successfulUpdateCount = updateResults.reduce(
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
