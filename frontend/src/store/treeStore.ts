import { create } from "zustand";
import * as treesApi from "../api/trees";
import * as todosApi from "../api/todos";
import type { Tree, Todo } from "../types";

function flatten(todos: Todo[]): { todo: Todo; parentId: string | null }[] {
  const result: { todo: Todo; parentId: string | null }[] = [];
  const walk = (items: Todo[], pid: string | null) => {
    for (const t of items) {
      result.push({ todo: t, parentId: pid });
      if (t.children) walk(t.children, t.id);
    }
  };
  walk(todos, null);
  return result;
}

interface TreeState {
  trees: Tree[];
  selectedTreeID: string | null;
  todos: Todo[];
  isLoading: boolean;
  loadTrees: () => Promise<void>;
  selectTree: (id: string) => Promise<void>;
  createTree: (title: string) => Promise<void>;
  deleteTree: (id: string) => Promise<void>;
  createTodo: (title: string, parentID?: string | null) => Promise<void>;
  toggleTodo: (todoID: string, done: boolean) => Promise<void>;
  updateTodoTitle: (todoID: string, title: string) => Promise<void>;
  deleteTodo: (todoID: string) => Promise<void>;
  indentTodo: (todoID: string) => Promise<void>;
  outdentTodo: (todoID: string) => Promise<void>;
}

export const useTreeStore = create<TreeState>((set, get) => ({
  trees: [],
  selectedTreeID: null,
  todos: [],
  isLoading: false,

  loadTrees: async () => {
    const trees = await treesApi.getTrees();
    set({ trees });
  },

  selectTree: async (id) => {
    set({ selectedTreeID: id });
    const res = await treesApi.getTree(id);
    set({ todos: res.todos });
  },

  createTree: async (title) => {
    await treesApi.createTree(title);
    await get().loadTrees();
  },

  deleteTree: async (id) => {
    await treesApi.deleteTree(id);
    const state = get();
    if (state.selectedTreeID === id) {
      set({ selectedTreeID: null, todos: [] });
    }
    await get().loadTrees();
  },

  createTodo: async (title, parentID = null) => {
    const treeID = get().selectedTreeID;
    if (!treeID) return;
    await todosApi.createTodo(treeID, title, parentID);
    const res = await treesApi.getTree(treeID);
    set({ todos: res.todos });
  },

  toggleTodo: async (todoID, done) => {
    await todosApi.updateTodo(todoID, { done });
    const treeID = get().selectedTreeID;
    if (treeID) {
      const res = await treesApi.getTree(treeID);
      set({ todos: res.todos });
    }
  },

  updateTodoTitle: async (todoID, title) => {
    await todosApi.updateTodo(todoID, { title });
    const treeID = get().selectedTreeID;
    if (treeID) {
      const res = await treesApi.getTree(treeID);
      set({ todos: res.todos });
    }
  },

  deleteTodo: async (todoID) => {
    await todosApi.deleteTodo(todoID);
    const treeID = get().selectedTreeID;
    if (treeID) {
      const res = await treesApi.getTree(treeID);
      set({ todos: res.todos });
    }
  },

  indentTodo: async (todoID) => {
    const treeID = get().selectedTreeID;
    if (!treeID) return;
    const flat = flatten(get().todos);
    const idx = flat.findIndex((f) => f.todo.id === todoID);
    if (idx < 1) return;
    const current = flat[idx];
    const siblings = flat.filter((f) => f.parentId === current.parentId);
    const sibIdx = siblings.findIndex((s) => s.todo.id === todoID);
    if (sibIdx < 1) return;
    const newParentId = siblings[sibIdx - 1].todo.id;
    await todosApi.moveTodo(todoID, newParentId, 0);
    const res = await treesApi.getTree(treeID);
    set({ todos: res.todos });
  },

  outdentTodo: async (todoID) => {
    const treeID = get().selectedTreeID;
    if (!treeID) return;
    const flat = flatten(get().todos);
    const item = flat.find((f) => f.todo.id === todoID);
    if (!item || !item.parentId) return;
    const parent = flat.find((f) => f.todo.id === item.parentId);
    const newParentId = parent?.parentId ?? null;
    await todosApi.moveTodo(todoID, newParentId, 0);
    const res = await treesApi.getTree(treeID);
    set({ todos: res.todos });
  },
}));
