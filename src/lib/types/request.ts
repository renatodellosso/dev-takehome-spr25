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
  creationDate: Date;
  lastEditDate: Date;
  status: RequestStatus;
};
