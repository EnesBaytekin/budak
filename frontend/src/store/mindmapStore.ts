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

  computePositions: (todos) => {
    const saved = get().positions;
    const result = new Map<string, { x: number; y: number }>();

    // Phase 1: saved positions from DB (stable, never change)
    const walk = (items: Todo[]) => {
      for (const todo of items) {
        const s = saved.get(todo.id);
        if (s) result.set(todo.id, { x: s.x, y: s.y });
        if (todo.children) walk(todo.children);
      }
    };
    walk(todos);

    // Phase 2: spiral position for nodes WITHOUT saved positions (new nodes etc.)
    const counters = new Map<string, number>();
    const assign = (items: Todo[], parentId?: string, px?: number, py?: number) => {
      for (const todo of items) {
        if (result.has(todo.id)) {
          const p = result.get(todo.id)!;
          if (todo.children) assign(todo.children, todo.id, p.x, p.y);
          continue;
        }
        const key = parentId ?? "ROOT";
        const c = counters.get(key) ?? 0;
        counters.set(key, c + 1);
        let x: number, y: number;
        if (px !== undefined && py !== undefined) {
          x = px + (170 + c * 15) * Math.cos(c * 0.9);
          y = py + (170 + c * 15) * Math.sin(c * 0.9);
        } else {
          x = (200 + c * 40) * Math.cos(c * 1.1);
          y = (200 + c * 40) * Math.sin(c * 1.1);
        }
        result.set(todo.id, { x, y });
        if (todo.children) assign(todo.children, todo.id, x, y);
      }
    };
    assign(todos);
    return result;
  },
}));
