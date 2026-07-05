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

export function importTodos(treeID: string, content: string, format = "auto") {
  return apiRequest<{ imported: number }>(`/api/v1/trees/${treeID}/import`, {
    method: "POST",
    body: { content, format },
  });
}

export function exportTodos(treeID: string, format = "markdown"): Promise<string> {
  return fetch(
    `${import.meta.env.VITE_API_URL || ""}/api/v1/trees/${treeID}/export?format=${format}`,
    { headers: { Authorization: `Bearer ${localStorage.getItem("budak_token")}` } }
  ).then((r) => r.text());
}
