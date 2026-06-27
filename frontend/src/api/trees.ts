import { apiRequest } from "./client";
import type { Tree, TreeResponse } from "../types";

export function getTrees() {
  return apiRequest<Tree[]>("/api/v1/trees");
}

export function createTree(title: string) {
  return apiRequest<Tree>("/api/v1/trees", {
    method: "POST",
    body: { title },
  });
}

export function getTree(treeID: string) {
  return apiRequest<TreeResponse>(`/api/v1/trees/${treeID}`);
}

export function updateTree(treeID: string, title: string) {
  return apiRequest<{ status: string }>(`/api/v1/trees/${treeID}`, {
    method: "PUT",
    body: { title },
  });
}

export function deleteTree(treeID: string) {
  return apiRequest<{ status: string }>(`/api/v1/trees/${treeID}`, {
    method: "DELETE",
  });
}
