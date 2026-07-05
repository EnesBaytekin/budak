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

    // Second pass: Archimedean spiral for unsaved nodes
    // Roots spiral outward from (0, 0).
    // Children spiral outward from their parent's position.
    const rootSpacing = 220;
    const rootAngleStep = 1.1;       // radians (~63°) — fills evenly
    const childSpacing = 190;
    const childAngleStep = 0.9;

    let rootCount = 0;
    let childCount = 0;

    const compute = (items: Todo[], parentX?: number, parentY?: number, isRoot?: boolean) => {
      for (const todo of items) {
        if (result.has(todo.id)) {
          const pos = result.get(todo.id)!;
          if (todo.children) compute(todo.children, pos.x, pos.y, false);
          continue;
        }

        let x: number, y: number;

        if (parentX !== undefined && parentY !== undefined && !isRoot) {
          // Child node — small spiral from parent
          const angle = childCount * childAngleStep;
          const radius = childSpacing + childCount * 12;
          x = parentX + radius * Math.cos(angle);
          y = parentY + radius * Math.sin(angle);
          childCount++;
        } else {
          // Root node — main spiral from origin
          const angle = rootCount * rootAngleStep;
          const radius = rootSpacing + rootCount * 35;
          x = radius * Math.cos(angle);
          y = radius * Math.sin(angle);
          rootCount++;
        }

        result.set(todo.id, { x, y });
        if (todo.children) compute(todo.children, x, y, false);
      }
    };

    compute(todos, undefined, undefined, true);

    return result;
  },

  markDirty: (todoID, treeID, x, y) => {
    const dirty = new Map(get().dirtyNodes);
    dirty.set(todoID, { todo_id: todoID, tree_id: treeID, x, y });
    set({ dirtyNodes: dirty });
  },
}));
