import { ItemRequest, RequestStatus } from "../types/request";

function isValidString(value: unknown): value is string {
  return (
    typeof value === "string" && value.trim() !== "" && value.length <= 100
  );
}

function isValidDate(value: unknown): value is string {
  return typeof value === "string" && !isNaN(new Date(value).getTime());
}

export function isValidRequestStatus(
  value: unknown
): value is ItemRequest["status"] {
  if (typeof value !== "string") return false;

  const validStatuses = Object.values(RequestStatus);
  return validStatuses.includes(value as RequestStatus);
}

export function isValidItemRequest(
  request: ItemRequest
): request is ItemRequest {
  if (!request) return false;

  if (!isValidString(request.requestorName)) return false;
  if (!isValidString(request.itemRequested)) return false;

  if (!isValidDate(request.creationDate)) return false;
  if (!isValidDate(request.lastEditDate)) return false;

  if (!isValidRequestStatus(request.status)) return false;

  return true;
}
