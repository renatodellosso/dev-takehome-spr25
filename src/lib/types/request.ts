import { PAGINATION_PAGE_SIZE } from "../constants/config";

export enum RequestStatus {
  PENDING = "pending",
  APPROVED = "approved",
  COMPLETED = "completed",
  REJECTED = "rejected",
}

/**
 * I wanted to do Request, but it collided with the Next.js Request type.
 */
export type ItemRequest = {
  requestorName: string;
  itemRequested: string;
  /**
   * Datestring saved as a string to avoid issues with Mongo saving Date objects as strings.
   */
  creationDate: string;
  /**
   * Datestring saved as a string to avoid issues with Mongo saving Date objects as strings.
   */
  lastEditDate: string;
  status: RequestStatus;
};

export type ItemRequestUpdate = Pick<ItemRequest, "status"> & {
  id: string;
};

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
 * @returns An array of ItemRequest objects for seeding purposes.
 */
export function getSeedRequests(): ItemRequest[] {
  /**
   *  Edit dates are in reverse order of creation dates to test sorting
   */
  const requests: ItemRequest[] = Array.from(
    { length: PAGINATION_PAGE_SIZE * Object.values(RequestStatus).length * 2 }, // 2 pages of each status
    (_, i) => newItemRequest(i)
  );

  return requests;
}
