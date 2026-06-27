import { create } from "zustand";
import * as mindmapApi from "../api/mindmap";
import type { MindMapPosition } from "../types";

interface MindMapState {
  positions: Map<string, MindMapPosition>;
  isLoading: boolean;
  loadPositions: (treeID: string) => Promise<void>;
  updatePosition: (todoID: string, treeID: string, x: number, y: number) => Promise<void>;
  batchSave: (treeID: string) => Promise<void>;
  getPosition: (todoID: string) => MindMapPosition | undefined;
  getDefaultPosition: (todoID: string, index: number) => { x: number; y: number };
  markDirty: (todoID: string, treeID: string, x: number, y: number) => void;
  dirtyNodes: Map<string, { todo_id: string; tree_id: string; x: number; y: number }>;
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

  getDefaultPosition: (todoID, index) => {
    const existing = get().positions.get(todoID);
    if (existing) return { x: existing.x, y: existing.y };
    // Auto-layout in a grid pattern
    const cols = 4;
    const col = index % cols;
    const row = Math.floor(index / cols);
    return { x: col * 250 + 100, y: row * 150 + 50 };
  },

  markDirty: (todoID, treeID, x, y) => {
    const dirty = new Map(get().dirtyNodes);
    dirty.set(todoID, { todo_id: todoID, tree_id: treeID, x, y });
    set({ dirtyNodes: dirty });
  },
}));
