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
  type Connection,
  type ReactFlowInstance,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { TodoNode } from "./TodoNode";
import { CustomEdge } from "./CustomEdge";
import { useTreeStore } from "../../store/treeStore";
import { useMindmapStore } from "../../store/mindmapStore";
import { Plus } from "lucide-react";

const nodeTypes: NodeTypes = {
  todoNode: TodoNode,
};

const edgeTypes: EdgeTypes = {
  custom: CustomEdge,
};

export function MindMapView() {
  const todos = useTreeStore((s) => s.todos);
  const toggleTodo = useTreeStore((s) => s.toggleTodo);
  const updateTodoTitle = useTreeStore((s) => s.updateTodoTitle);
  const deleteTodo = useTreeStore((s) => s.deleteTodo);
  const createTodo = useTreeStore((s) => s.createTodo);
  const moveTodoToParent = useTreeStore((s) => s.moveTodoToParent);
  const setEditingTodoID = useTreeStore((s) => s.setEditingTodoID);
  const selectedTreeID = useTreeStore((s) => s.selectedTreeID);

  const { computePositions, markDirty, batchSave, dirtyNodes } = useMindmapStore();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const lastPaneClick = useRef<{ time: number; x: number; y: number } | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Build nodes and edges from todos
  useEffect(() => {
    // Use tree-aware layout for positions
    const positions = computePositions(todos);

    const flatTodos: typeof todos = [];
    const flatten = (items: typeof todos) => {
      for (const t of items) {
        flatTodos.push(t);
        if (t.children) flatten(t.children);
      }
    };
    flatten(todos);

    const newNodes: Node[] = flatTodos.map((todo) => {
      const pos = positions.get(todo.id) ?? { x: 0, y: 0 };
      return {
        id: todo.id,
        type: "todoNode",
        position: { x: pos.x, y: pos.y },
        width: 160,
        height: 80,
        data: {
          todo,
          onToggle: toggleTodo,
          onTitleChange: updateTodoTitle,
          onAddChild: async (parentId: string) => {
            const id = await createTodo("", parentId);
            if (id) setEditingTodoID(id);
          },
        },
      };
    });

    const newEdges: Edge[] = [];
    const addEdges = (items: typeof todos) => {
      for (const t of items) {
        if (t.children) {
          for (const child of t.children) {
            newEdges.push({
              id: `${t.id}-${child.id}`,
              source: t.id,
              target: child.id,
              type: "custom",
              style: { stroke: "var(--color-base-300)", strokeWidth: 2 },
              markerEnd: { type: MarkerType.ArrowClosed, color: "var(--color-base-300)" },
            });
            addEdges([child]);
          }
        }
      }
    };
    addEdges(todos);

    setNodes(newNodes);
    setEdges(newEdges);
  }, [todos, computePositions, toggleTodo, updateTodoTitle, deleteTodo, createTodo, setEditingTodoID, setNodes, setEdges]);

  // Auto-save dirty positions
  useEffect(() => {
    if (dirtyNodes.size > 0 && selectedTreeID) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => batchSave(selectedTreeID!), 2000);
    }
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [dirtyNodes.size, selectedTreeID, batchSave]);

  useEffect(() => {
    return () => {
      if (dirtyNodes.size > 0 && selectedTreeID) batchSave(selectedTreeID);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onNodeDragStop = useCallback(
    (_event: any, node: Node) => {
      if (selectedTreeID) markDirty(node.id, selectedTreeID, node.position.x, node.position.y);
    },
    [selectedTreeID, markDirty]
  );

  // Connect = reparent
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      moveTodoToParent(connection.target, connection.source);
    },
    [moveTodoToParent]
  );

  // Double-click pane → new root
  const onPaneClick = useCallback(
    (event: React.MouseEvent) => {
      if (!selectedTreeID || !rfInstance) return;
      const now = Date.now();
      const last = lastPaneClick.current;
      if (
        last &&
        now - last.time < 300 &&
        Math.abs(event.clientX - last.x) < 10 &&
        Math.abs(event.clientY - last.y) < 10
      ) {
        const pos = rfInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
        createTodo("", null).then((id) => {
          if (!id) return;
          markDirty(id, selectedTreeID, pos.x, pos.y);
          setEditingTodoID(id);
        });
        lastPaneClick.current = null;
      } else {
        lastPaneClick.current = { time: now, x: event.clientX, y: event.clientY };
      }
    },
    [selectedTreeID, rfInstance, createTodo, markDirty, setEditingTodoID]
  );

  const handleAddRoot = async () => {
    const id = await createTodo("", null);
    if (id) setEditingTodoID(id);
  };

  if (todos.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-base-100 text-base-content/40">
        <div className="text-4xl mb-3">◎</div>
        <p className="text-sm mb-2">no todos yet</p>
        <p className="text-xs mb-4 text-base-content/30">double-click canvas or press the button</p>
        <button onClick={handleAddRoot} className="btn btn-primary btn-sm">
          <Plus size={14} />
          add todo
        </button>
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
        onConnect={onConnect}
        onPaneClick={onPaneClick}
        onInit={setRfInstance}
        zoomOnDoubleClick={false}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        attributionPosition="bottom-left"
        minZoom={0.1}
        maxZoom={4}
        connectionLineStyle={{ stroke: "var(--color-primary)", strokeWidth: 2 }}
        connectOnClick={false}
        nodesConnectable={false}
        defaultEdgeOptions={{
          style: { stroke: "var(--color-base-300)", strokeWidth: 2 },
          type: "custom",
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={25} size={1.5} color="var(--color-base-300)" />
        <Controls showInteractive={false} />
        <MiniMap
          nodeStrokeColor="var(--color-base-300)"
          nodeColor={(n) => ((n.data as any)?.todo?.done ? "var(--color-success)" : "var(--color-base-300)")}
          maskColor="var(--color-base-100)"
          style={{ background: "var(--color-base-200)" }}
        />
      </ReactFlow>

      <button
        onClick={handleAddRoot}
        className="btn btn-primary btn-sm fixed bottom-6 right-6 shadow-lg z-10 gap-1"
      >
        <Plus size={14} />
        add todo
      </button>
    </div>
  );
}
