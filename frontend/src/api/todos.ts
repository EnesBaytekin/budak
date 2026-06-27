import { apiRequest } from "./client";
import type { Todo } from "../types";

export function getTodos(treeID: string) {
  return apiRequest<Todo[]>(`/api/v1/trees/${treeID}/todos`);
}

export function createTodo(treeID: string, title: string, parentID: string | null = null) {
  return apiRequest<Todo>(`/api/v1/trees/${treeID}/todos`, {
    method: "POST",
    body: { title, parent_id: parentID },
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
