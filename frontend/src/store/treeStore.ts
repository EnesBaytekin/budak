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

async function reloadTree(get: any, set: any) {
  const treeID = get().selectedTreeID;
  if (!treeID) return;
  const res = await treesApi.getTree(treeID);
  set({ todos: res.todos });
}

interface TreeState {
  trees: Tree[];
  selectedTreeID: string | null;
  todos: Todo[];
  isLoading: boolean;
  editingTodoID: string | null;
  activeTodoID: string | null;
  setActiveTodoID: (id: string | null) => void;
  selectNextTodo: () => void;
  selectPrevTodo: () => void;
  loadTrees: () => Promise<void>;
  selectTree: (id: string) => Promise<void>;
  createTree: (title: string) => Promise<Tree>;
  deleteTree: (id: string) => Promise<void>;
  createTodo: (title?: string, parentID?: string | null, beforeID?: string | null) => Promise<string | null>;
  createTodoRaw: (title?: string, parentID?: string | null) => Promise<Todo | null>;
  reloadTodos: () => Promise<void>;
  toggleTodo: (todoID: string, done: boolean) => Promise<void>;
  updateTodoTitle: (todoID: string, title: string) => Promise<void>;
  deleteTodo: (todoID: string) => Promise<void>;
  indentTodo: (todoID: string) => Promise<void>;
  outdentTodo: (todoID: string) => Promise<void>;
  moveTodoToParent: (todoID: string, newParentID: string | null) => Promise<void>;
  disconnectTodo: (todoID: string) => Promise<void>;
  moveBefore: (todoID: string, beforeID: string) => Promise<void>;
  moveUp: (todoID: string) => Promise<void>;
  moveDown: (todoID: string) => Promise<void>;
  importTodos: (content: string, format?: string, config?: any) => Promise<number>;
  exportTodos: (format?: string, config?: any) => Promise<string>;
  setEditingTodoID: (id: string | null) => void;
}

export const useTreeStore = create<TreeState>((set, get) => ({
  trees: [],
  selectedTreeID: null,
  todos: [],
  isLoading: false,
  editingTodoID: null,
  activeTodoID: null,

  setActiveTodoID: (id) => set({ activeTodoID: id }),

  loadTrees: async () => {
    const trees = await treesApi.getTrees();
    set({ trees });
  },

  selectTree: async (id) => {
    set({ selectedTreeID: id, editingTodoID: null, activeTodoID: null });
    const res = await treesApi.getTree(id);
    set({ todos: res.todos });
  },

  createTree: async (title) => {
    const tree = await treesApi.createTree(title);
    await get().loadTrees();
    return tree;
  },

  deleteTree: async (id) => {
    await treesApi.deleteTree(id);
    const state = get();
    if (state.selectedTreeID === id) {
      set({ selectedTreeID: null, todos: [] });
    }
    await get().loadTrees();
  },

  createTodo: async (title = "", parentID = null, beforeID?: string | null) => {
    const treeID = get().selectedTreeID;
    if (!treeID) return null;
    const todo = await todosApi.createTodo(treeID, title, parentID, beforeID);
    await reloadTree(get, set);
    return todo.id;
  },

  createTodoRaw: async (title?: string, parentID?: string | null) => {
    const treeID = get().selectedTreeID;
    if (!treeID) return null;
    return todosApi.createTodo(treeID, title || "", parentID || null, null);
  },

  reloadTodos: async () => {
    await reloadTree(get, set);
  },

  toggleTodo: async (todoID, done) => {
    await todosApi.updateTodo(todoID, { done });
    await reloadTree(get, set);
  },

  updateTodoTitle: async (todoID, title) => {
    await todosApi.updateTodo(todoID, { title });
    await reloadTree(get, set);
  },

  deleteTodo: async (todoID) => {
    await todosApi.deleteTodo(todoID);
    await reloadTree(get, set);
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
    await reloadTree(get, set);
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
    await reloadTree(get, set);
  },

  moveTodoToParent: async (todoID, newParentID) => {
    await todosApi.moveTodo(todoID, newParentID, 0);
    await reloadTree(get, set);
  },

  disconnectTodo: async (todoID) => {
    await todosApi.moveTodo(todoID, null, 0);
    await reloadTree(get, set);
  },

  moveBefore: async (todoID, beforeID) => {
    await todosApi.moveBefore(todoID, beforeID);
    await reloadTree(get, set);
  },

  moveUp: async (todoID) => {
    await todosApi.reorderUp(todoID);
    await reloadTree(get, set);
  },

  moveDown: async (todoID) => {
    await todosApi.reorderDown(todoID);
    await reloadTree(get, set);
  },

  importTodos: async (content, format = "auto", config?) => {
    const treeID = get().selectedTreeID;
    if (!treeID) throw new Error("No tree selected");
    const result = await todosApi.importTodos(treeID, content, format, config);
    await reloadTree(get, set);
    return result.imported;
  },

  exportTodos: async (format = "markdown", config?) => {
    const treeID = get().selectedTreeID;
    if (!treeID) throw new Error("No tree selected");
    return todosApi.exportTodos(treeID, format, config);
  },

  setEditingTodoID: (id) => set({ editingTodoID: id }),

  selectNextTodo: () => {
    const { todos, activeTodoID } = get();
    const flat = flatten(todos);
    if (flat.length === 0) return;
    if (!activeTodoID) { set({ activeTodoID: flat[0].todo.id }); return; }
    const idx = flat.findIndex((f) => f.todo.id === activeTodoID);
    if (idx < flat.length - 1) set({ activeTodoID: flat[idx + 1].todo.id });
  },

  selectPrevTodo: () => {
    const { todos, activeTodoID } = get();
    const flat = flatten(todos);
    if (flat.length === 0) return;
    if (!activeTodoID) { set({ activeTodoID: flat[0].todo.id }); return; }
    const idx = flat.findIndex((f) => f.todo.id === activeTodoID);
    if (idx > 0) set({ activeTodoID: flat[idx - 1].todo.id });
  },
}));
