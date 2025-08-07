import { ItemRequest, RequestStatus } from "../types/request";

function isValidString(value: any): value is string {
  return (
    typeof value === "string" && value.trim() !== "" && value.length <= 100
  );
}

function isValidDate(value: any): value is string {
  return typeof value === "string" && !isNaN(new Date(value).getTime());
}

export function isValidRequestStatus(
  value: any
): value is ItemRequest["status"] {
  const validStatuses = Object.values(RequestStatus);
  return validStatuses.includes(value);
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
