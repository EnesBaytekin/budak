import { useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  type Node,
  type Edge,
  type NodeTypes,
  type EdgeTypes,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { TodoNode } from "./TodoNode";
import { CustomEdge } from "./CustomEdge";
import { useTreeStore } from "../../store/treeStore";
import { useMindmapStore } from "../../store/mindmapStore";
import { Plus, X } from "lucide-react";

const nodeTypes: NodeTypes = { todoNode: TodoNode };
const edgeTypes: EdgeTypes = { custom: CustomEdge };

export function MindMapView() {
  const todos = useTreeStore((s) => s.todos);
  const toggleTodo = useTreeStore((s) => s.toggleTodo);
  const updateTodoTitle = useTreeStore((s) => s.updateTodoTitle);
  const createTodoRaw = useTreeStore((s) => s.createTodoRaw);
  const reloadTodos = useTreeStore((s) => s.reloadTodos);
  const moveTodoToParent = useTreeStore((s) => s.moveTodoToParent);
  const disconnectTodo = useTreeStore((s) => s.disconnectTodo);
  const deleteTodo = useTreeStore((s) => s.deleteTodo);
  const setEditingTodoID = useTreeStore((s) => s.setEditingTodoID);
  const selectedTreeID = useTreeStore((s) => s.selectedTreeID);

  const { computePositions, savePositionNow } = useMindmapStore();
  const storedPositions = useMindmapStore((s) => s.positions);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const lastPaneClick = useRef<{ time: number; x: number; y: number } | null>(null);

  // Connection mode
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [connectMouse, setConnectMouse] = useState<{ x: number; y: number } | null>(null);

  // Context menu
  const [ctxMenu, setCtxMenu] = useState<{ nodeId: string; x: number; y: number } | null>(null);

  // Build nodes/edges
  useEffect(() => {
    const positions = computePositions(todos);
    const flat: typeof todos = [];
    const fl = (items: typeof todos) => { for (const t of items) { flat.push(t); if (t.children) fl(t.children); } };
    fl(todos);

    const newNodes: Node[] = flat.map((todo) => {
      const pos = positions.get(todo.id) ?? { x: 0, y: 0 };
      return {
        id: todo.id, type: "todoNode",
        position: { x: pos.x, y: pos.y }, width: 160, height: 80,
        data: {
          todo,
          onToggle: toggleTodo,
          onTitleChange: updateTodoTitle,
          onDelete: (id: string) => { if (confirm("Delete?")) deleteTodo(id); },
          onAddChild: async (parentId: string) => {
            const todo = await createTodoRaw("", parentId);
            if (!todo || !selectedTreeID) return;
            const pn = nodes.find(n => n.id === parentId);
            const px = pn ? pn.position.x + 120 : 0;
            const py = pn ? pn.position.y + 40 : 0;
            await savePositionNow(todo.id, selectedTreeID, px, py);
            await reloadTodos();
            setEditingTodoID(todo.id);
          },
          onConnectStart: (nodeId: string) => {
            setConnectingFrom(nodeId);
            setConnectMouse(null);
          },
        },
      };
    });

    const newEdges: Edge[] = [];
    const ae = (items: typeof todos) => {
      for (const t of items) {
        if (t.children) for (const c of t.children) {
          newEdges.push({
            id: `${t.id}-${c.id}`, source: t.id, target: c.id, type: "custom",
            style: { stroke: "var(--budak-edge)", strokeWidth: 3 },
          });
          ae([c]);
        }
      }
    };
    ae(todos);
    setNodes(newNodes);
    setEdges(newEdges);
  }, [todos, computePositions, toggleTodo, updateTodoTitle, createTodoRaw, reloadTodos, deleteTodo, setEditingTodoID, setNodes, setEdges, selectedTreeID, savePositionNow, storedPositions]);

  // Drag stop → save position immediately
  const onNodeDragStop = useCallback((_event: any, node: Node) => {
    if (selectedTreeID) savePositionNow(node.id, selectedTreeID, node.position.x, node.position.y);
  }, [selectedTreeID, savePositionNow, storedPositions]);

  // Pane double-click → new root at click position
  const onPaneClick = useCallback((event: React.MouseEvent) => {
    if (!selectedTreeID || !rfInstance) return;
    const now = Date.now();
    const last = lastPaneClick.current;
    if (last && now - last.time < 300 && Math.abs(event.clientX - last.x) < 10 && Math.abs(event.clientY - last.y) < 10) {
      const pos = rfInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
      createTodoRaw("", null).then(async (todo) => { if (!todo || !selectedTreeID) return; await savePositionNow(todo.id, selectedTreeID, pos.x, pos.y); await reloadTodos(); setEditingTodoID(todo.id); });
      lastPaneClick.current = null;
    } else {
      lastPaneClick.current = { time: now, x: event.clientX, y: event.clientY };
    }
  }, [selectedTreeID, rfInstance, createTodoRaw, reloadTodos, savePositionNow, setEditingTodoID]);

  // Track mouse during connection
  useEffect(() => {
    if (!connectingFrom) return;
    const onMove = (e: PointerEvent) => {
      if (!rfInstance) return;
      setConnectMouse(rfInstance.screenToFlowPosition({ x: e.clientX, y: e.clientY }));
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [connectingFrom, rfInstance]);

  // Node click in connection mode → connect
  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (!connectingFrom || !selectedTreeID) return;
    if (node.id === connectingFrom) return;
    const isCirc = (childId: string, parentId: string): boolean => {
      if (childId === parentId) return true;
      for (const e of edges) { if (e.source === childId && isCirc(e.target, parentId)) return true; }
      return false;
    };
    if (!isCirc(node.id, connectingFrom)) {
      moveTodoToParent(node.id, connectingFrom);
    }
    setConnectingFrom(null);
    setConnectMouse(null);
  }, [connectingFrom, selectedTreeID, edges, moveTodoToParent]);

  const onPaneClickConn = useCallback(() => {
    setCtxMenu(null);
    if (connectingFrom) { setConnectingFrom(null); setConnectMouse(null); }
  }, [connectingFrom]);

  const handleAddRoot = async () => {
    if (!rfInstance || !selectedTreeID) return;
    const vp = rfInstance.getViewport();
    const cx = (-vp.x + window.innerWidth / 2) / vp.zoom;
    const cy = (-vp.y + window.innerHeight / 2) / vp.zoom;
    const todo = await createTodoRaw("", null);
    if (todo && selectedTreeID) { await savePositionNow(todo.id, selectedTreeID, cx, cy); await reloadTodos(); setEditingTodoID(todo.id); }
  };

  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    setCtxMenu({ nodeId: node.id, x: event.clientX, y: event.clientY });
  }, []);

  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    window.addEventListener("click", close, { once: true });
    return () => window.removeEventListener("click", close);
  }, [ctxMenu]);

  const connLineData = connectingFrom && connectMouse ? (() => {
    const sn = nodes.find((n) => n.id === connectingFrom);
    if (!sn || !rfInstance) return null;
    const sx = sn.position.x + (sn.width ?? 160) / 2;
    const sy = sn.position.y + (sn.height ?? 80) / 2;
    const vp = rfInstance.getViewport();
    return { sx, sy, mx: connectMouse.x, my: connectMouse.y, zoom: vp.zoom, vx: vp.x, vy: vp.y };
  })() : null;

  if (todos.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-base-100 text-base-content/40">
        <div className="text-4xl mb-3">◎</div>
        <p className="text-sm mb-2">no todos yet</p>
        <button onClick={handleAddRoot} className="btn btn-primary btn-sm"><Plus size={14} />add todo</button>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-base-200">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onPaneClick={connectingFrom ? onPaneClickConn : onPaneClick}
        onNodeClick={connectingFrom ? onNodeClick : undefined}
        onNodeContextMenu={onNodeContextMenu}
        onInit={setRfInstance}
        zoomOnDoubleClick={false}
        nodeDragThreshold={8}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        attributionPosition="bottom-left"
        minZoom={0.1}
        maxZoom={4}
        defaultEdgeOptions={{ style: { stroke: "var(--budak-edge)", strokeWidth: 3 }, type: "custom" }}
      >
        <Background variant={BackgroundVariant.Dots} gap={25} size={1.5} color="var(--color-base-300)" />
        <Controls showInteractive={false} />
        <MiniMap
          nodeStrokeColor="var(--color-base-300)"
          nodeColor={(n) => ((n.data as any)?.todo?.done ? "var(--color-success)" : "var(--color-base-300)")}
          maskColor="var(--color-base-100)"
          style={{ background: "var(--color-base-200)" }}
        />
        {connLineData && (
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 1000 }}>
            <g transform={`translate(${connLineData.vx}, ${connLineData.vy}) scale(${connLineData.zoom})`}>
              <path
                d={`M ${connLineData.sx} ${connLineData.sy} C ${connLineData.sx + (connLineData.mx - connLineData.sx) * 0.4} ${connLineData.sy}, ${connLineData.sx + (connLineData.mx - connLineData.sx) * 0.6} ${connLineData.my}, ${connLineData.mx} ${connLineData.my}`}
                fill="none"
                stroke="var(--budak-edge)"
                strokeWidth={3 / connLineData.zoom}
                strokeDasharray={`${8 / connLineData.zoom} ${4 / connLineData.zoom}`}
                opacity={0.8}
              />
            </g>
          </svg>
        )}
      </ReactFlow>

      <button onClick={handleAddRoot} className="btn btn-primary btn-sm fixed bottom-6 right-6 shadow-lg z-10 gap-1">
        <Plus size={14} />add todo
      </button>

      {connectingFrom && (
        <div className="fixed bottom-16 right-6 z-10 bg-base-100 border border-base-300 rounded-lg px-3 py-1.5 text-xs text-base-content/60 shadow-lg flex items-center gap-2">
          click a node to make it child
          <button onClick={() => { setConnectingFrom(null); setConnectMouse(null); }} className="btn btn-ghost btn-xs p-0 w-4 h-4"><X size={12} /></button>
        </div>
      )}

      {ctxMenu && (
        <div className="fixed z-50 bg-base-100 border border-base-300 rounded-xl shadow-xl py-1 min-w-[180px]"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}>
          <button
            onClick={() => { disconnectTodo(ctxMenu.nodeId); setCtxMenu(null); }}
            className="w-full text-left px-4 py-2 text-sm text-base-content/70 hover:bg-base-300 transition">
            Disconnect from parent
          </button>
          <div className="border-t border-base-300 my-1" />
          <button
            onClick={() => { if (confirm("Delete?")) deleteTodo(ctxMenu.nodeId); setCtxMenu(null); }}
            className="w-full text-left px-4 py-2 text-sm text-error/80 hover:bg-base-300 transition">
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
