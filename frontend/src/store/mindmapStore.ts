import { create } from "zustand";
import * as mindmapApi from "../api/mindmap";
import type { MindMapPosition, Todo } from "../types";

interface MindMapState {
  positions: Map<string, MindMapPosition>;
  isLoading: boolean;
  loadPositions: (treeID: string) => Promise<void>;
  updatePosition: (todoID: string, treeID: string, x: number, y: number) => Promise<void>;
  batchSave: (treeID: string) => Promise<void>;
  getPosition: (todoID: string) => MindMapPosition | undefined;
  computePositions: (todos: Todo[]) => Map<string, { x: number; y: number }>;
  markDirty: (todoID: string, treeID: string, x: number, y: number) => void;
  dirtyNodes: Map<string, { todo_id: string; tree_id: string; x: number; y: number }>;
}

function flattenTree(todos: Todo[]): { todo: Todo }[] {
  const result: { todo: Todo }[] = [];
  const walk = (items: Todo[]) => {
    for (const t of items) {
      result.push({ todo: t });
      if (t.children) walk(t.children);
    }
  };
  walk(todos);
  return result;
}

export const useMindmapStore = create<MindMapState>((set, get) => ({
  positions: new Map(),
  isLoading: false,
  dirtyNodes: new Map(),

  loadPositions: async (treeID) => {
    set({ isLoading: true });
    const data = await mindmapApi.getPositions(treeID);
    const posMap = new Map<string, MindMapPosition>();
    data.forEach((p) => posMap.set(p.todo_id, p));
    set({ positions: posMap, isLoading: false, dirtyNodes: new Map() });
  },

  updatePosition: async (todoID, treeID, x, y) => {
    await mindmapApi.upsertPosition(todoID, treeID, x, y);
    const positions = new Map(get().positions);
    positions.set(todoID, { todo_id: todoID, tree_id: treeID, x, y, updated_at: new Date().toISOString() });
    set({ positions });
  },

  batchSave: async (treeID) => {
    const dirty = Array.from(get().dirtyNodes.values());
    if (dirty.length === 0) return;
    await mindmapApi.batchSavePositions(treeID, dirty);
    const positions = new Map(get().positions);
    dirty.forEach((d) => positions.set(d.todo_id, { todo_id: d.todo_id, tree_id: d.tree_id, x: d.x, y: d.y, updated_at: new Date().toISOString() }));
    set({ positions, dirtyNodes: new Map() });
  },

  getPosition: (todoID) => {
    return get().positions.get(todoID);
  },

  computePositions: (todos) => {
    const saved = get().positions;
    const result = new Map<string, { x: number; y: number }>();

    // First pass: use saved positions where available
    const flat = flattenTree(todos);
    for (const { todo } of flat) {
      const s = saved.get(todo.id);
      if (s) result.set(todo.id, { x: s.x, y: s.y });
    }

    // Second pass: compute positions for unsaved nodes
    // Roots: compact horizontal row, Children: below parent
    let rootCol = 0;
    const rootSpacing = 260;

    const compute = (items: Todo[], defaultParentX?: number, defaultParentY?: number) => {
      let childOffset = 0;

      for (const todo of items) {
        if (result.has(todo.id)) {
          const pos = result.get(todo.id)!;
          if (todo.children) compute(todo.children, pos.x, pos.y);
          continue;
        }

        let x: number, y: number;

        if (defaultParentX !== undefined && defaultParentY !== undefined) {
          x = defaultParentX + 60;
          y = defaultParentY + 80 + childOffset * 50;
          childOffset++;
        } else {
          x = rootCol * rootSpacing;
          y = 0;
          rootCol++;
        }

        result.set(todo.id, { x, y });
        if (todo.children) compute(todo.children, x, y);
      }
    };

    compute(todos, undefined, undefined);

    return result;
  },

  markDirty: (todoID, treeID, x, y) => {
    const dirty = new Map(get().dirtyNodes);
    dirty.set(todoID, { todo_id: todoID, tree_id: treeID, x, y });
    set({ dirtyNodes: dirty });
  },
}));
