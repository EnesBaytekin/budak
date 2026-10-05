import { apiRequest } from "./client";

export interface UserPrefs {
  selected_tree_id?: string;
  view?: "tree" | "mindmap";
  mindmap_zoom?: number;
  mindmap_pan_x?: number;
  mindmap_pan_y?: number;
}

export function getPrefs() {
  return apiRequest<UserPrefs>("/api/v1/prefs");
}

export function savePrefs(prefs: UserPrefs) {
  return apiRequest<UserPrefs>("/api/v1/prefs", {
    method: "PUT",
    body: prefs,
  });
}
