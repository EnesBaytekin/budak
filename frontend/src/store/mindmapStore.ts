import { create } from "zustand";
import * as mindmapApi from "../api/mindmap";
import type { MindMapPosition, Todo } from "../types";

interface MindMapState {
  positions: Map<string, MindMapPosition>;
  isLoading: boolean;
  loadPositions: (treeID: string) => Promise<void>;
  savePositionNow: (todoID: string, treeID: string, x: number, y: number) => Promise<void>;
  getPosition: (todoID: string) => MindMapPosition | undefined;
  computePositions: (todos: Todo[]) => Map<string, { x: number; y: number }>;
}

export const useMindmapStore = create<MindMapState>((set, get) => ({
  positions: new Map(),
  isLoading: false,

  loadPositions: async (treeID) => {
    set({ isLoading: true });
    const data = await mindmapApi.getPositions(treeID);
    const posMap = new Map<string, MindMapPosition>();
    data.forEach((p) => posMap.set(p.todo_id, p));
    set({ positions: posMap, isLoading: false });
  },

  savePositionNow: async (todoID, treeID, x, y) => {
    await mindmapApi.upsertPosition(todoID, treeID, x, y);
    const positions = new Map(get().positions);
    positions.set(todoID, { todo_id: todoID, tree_id: treeID, x, y, updated_at: new Date().toISOString() });
    set({ positions });
  },

  getPosition: (todoID) => {
    return get().positions.get(todoID);
  },

  // ONLY uses saved DB positions. Never assigns spiral positions.
  // New nodes get position via savePositionNow BEFORE tree reload.
  // Nodes without positions get {x:0, y:0} (they'll get a real position
  // on first drag or via savePositionNow).
  computePositions: (todos) => {
    const saved = get().positions;
    const result = new Map<string, { x: number; y: number }>();

    const walk = (items: Todo[]) => {
      for (const todo of items) {
        const s = saved.get(todo.id);
        if (s) {
          result.set(todo.id, { x: s.x, y: s.y });
        }
        if (todo.children) walk(todo.children);
      }
    };
    walk(todos);

    return result;
  },
}));
