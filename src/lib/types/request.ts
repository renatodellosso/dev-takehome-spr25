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
