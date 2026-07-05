import { apiRequest } from "./client";
import type { Todo } from "../types";

export function getTodos(treeID: string) {
  return apiRequest<Todo[]>(`/api/v1/trees/${treeID}/todos`);
}

export function createTodo(treeID: string, title: string, parentID: string | null = null, beforeID?: string | null) {
  return apiRequest<Todo>(`/api/v1/trees/${treeID}/todos`, {
    method: "POST",
    body: { title, parent_id: parentID, before_id: beforeID || undefined },
  });
}

export function updateTodo(
  todoID: string,
  data: { title?: string; done?: boolean; note?: string; sort_order?: number }
) {
  return apiRequest<Todo>(`/api/v1/todos/${todoID}`, {
    method: "PUT",
    body: data,
  });
}

export function deleteTodo(todoID: string) {
  return apiRequest<{ status: string }>(`/api/v1/todos/${todoID}`, {
    method: "DELETE",
  });
}

export function moveTodo(todoID: string, newParentID: string | null, sortOrder: number) {
  return apiRequest<{ status: string }>(`/api/v1/todos/${todoID}/move`, {
    method: "PATCH",
    body: { new_parent_id: newParentID, sort_order: sortOrder },
  });
}

export function moveBefore(todoID: string, beforeID: string) {
  return apiRequest<{ status: string }>(`/api/v1/todos/${todoID}/move-before`, {
    method: "PATCH",
    body: { before_id: beforeID },
  });
}

export function reorderUp(todoID: string) {
  return apiRequest<{ status: string }>(`/api/v1/todos/${todoID}/reorder-up`, {
    method: "PATCH",
  });
}

export function reorderDown(todoID: string) {
  return apiRequest<{ status: string }>(`/api/v1/todos/${todoID}/reorder-down`, {
    method: "PATCH",
  });
}

export interface FormatConfig {
  done_prefix?: string;
  undone_prefix?: string;
  indent?: string;
  bullet?: string;
}

export function importTodos(treeID: string, content: string, format = "auto", config?: FormatConfig) {
  return apiRequest<{ imported: number }>(`/api/v1/trees/${treeID}/import`, {
    method: "POST",
    body: { content, format, config },
  });
}

export interface PreviewItem {
  title: string;
  done: boolean;
  depth: number;
}

export interface PreviewResult {
  items: PreviewItem[];
  total: number;
}

export function previewImport(content: string, format = "auto", config?: FormatConfig) {
  return apiRequest<PreviewResult>(`/api/v1/import/preview`, {
    method: "POST",
    body: { content, format, config },
    skipAuth: true,
  });
}

const API_BASE = import.meta.env.VITE_API_URL || "";
const TOKEN_KEY = "budak_token";

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function exportTodos(treeID: string, format = "markdown", config?: FormatConfig): Promise<string> {
  const params = new URLSearchParams({ format });
  if (config?.done_prefix) params.set("done_prefix", config.done_prefix);
  if (config?.undone_prefix) params.set("undone_prefix", config.undone_prefix);
  if (config?.indent) params.set("indent", config.indent);
  if (config?.bullet) params.set("bullet", config.bullet);
  return fetch(`${API_BASE}/api/v1/trees/${treeID}/export?${params}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  }).then((r) => r.text());
}

export function previewExport(treeID: string, format = "markdown", config?: FormatConfig) {
  return apiRequest<{ content: string }>(`/api/v1/trees/${treeID}/export/preview`, {
    method: "POST",
    body: { format, config },
  });
}
