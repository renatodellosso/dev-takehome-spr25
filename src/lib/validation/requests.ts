import { ItemRequest, RequestStatus } from "../types/request";

function isValidString(
  value: unknown,
  minLength: number,
  maxLength: number
): value is string {
  return (
    typeof value === "string" &&
    value.length >= minLength &&
    value.length <= maxLength
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

  if (!isValidString(request.requestorName, 3, 30)) return false;
  if (!isValidString(request.itemRequested, 2, 100)) return false;

  if (!isValidDate(request.creationDate)) return false;
  if (!isValidDate(request.lastEditDate)) return false;

  if (!isValidRequestStatus(request.status)) return false;

  return true;
}
