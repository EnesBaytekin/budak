import { create } from "zustand";
import * as treesApi from "../api/trees";
import * as todosApi from "../api/todos";
import type { Tree, Todo } from "../types";

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
    // Reload current tree
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
}));
