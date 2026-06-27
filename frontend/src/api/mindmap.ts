import { apiRequest } from "./client";
import type { MindMapPosition } from "../types";

export function getPositions(treeID: string) {
  return apiRequest<MindMapPosition[]>(`/api/v1/trees/${treeID}/positions`);
}

export function batchSavePositions(treeID: string, positions: { todo_id: string; x: number; y: number }[]) {
  return apiRequest<{ status: string }>(`/api/v1/trees/${treeID}/positions`, {
    method: "POST",
    body: { positions },
  });
}

export function upsertPosition(todoID: string, treeID: string, x: number, y: number) {
  return apiRequest<{ status: string }>(`/api/v1/mindmap/positions/${todoID}`, {
    method: "PUT",
    body: { tree_id: treeID, x, y },
  });
}

export function deletePosition(todoID: string) {
  return apiRequest<{ status: string }>(`/api/v1/mindmap/positions/${todoID}`, {
    method: "DELETE",
  });
}
