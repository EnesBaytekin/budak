import { useCallback, useEffect, useRef } from "react";
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
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { TodoNode } from "./TodoNode";
import { useTreeStore } from "../../store/treeStore";
import { useMindmapStore } from "../../store/mindmapStore";

const nodeTypes: NodeTypes = {
  todoNode: TodoNode,
};

export function MindMapView() {
  const todos = useTreeStore((s) => s.todos);
  const toggleTodo = useTreeStore((s) => s.toggleTodo);
  const updateTodoTitle = useTreeStore((s) => s.updateTodoTitle);
  const selectedTreeID = useTreeStore((s) => s.selectedTreeID);

  const {
    getDefaultPosition,
    markDirty,
    batchSave,
    dirtyNodes,
  } = useMindmapStore();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Build nodes and edges from todos
  useEffect(() => {
    const flatTodos: typeof todos = [];
    const flatten = (items: typeof todos) => {
      for (const t of items) {
        flatTodos.push(t);
        if (t.children) flatten(t.children);
      }
    };
    flatten(todos);

    const newNodes: Node[] = flatTodos.map((todo, index) => {
      const pos = getDefaultPosition(todo.id, index);
      return {
        id: todo.id,
        type: "todoNode",
        position: { x: pos.x, y: pos.y },
        data: {
          todo,
          onToggle: toggleTodo,
          onTitleChange: updateTodoTitle,
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
              type: "smoothstep",
              animated: false,
              style: { stroke: "#94a3b8", strokeWidth: 2 },
              markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
            });
            addEdges([child]);
          }
        }
      }
    };
    addEdges(todos);

    setNodes(newNodes);
    setEdges(newEdges);
  }, [todos, getDefaultPosition, toggleTodo, updateTodoTitle, setNodes, setEdges]);

  // Save dirty positions periodically
  useEffect(() => {
    if (dirtyNodes.size > 0 && selectedTreeID) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        batchSave(selectedTreeID!);
      }, 2000);
    }
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [dirtyNodes.size, selectedTreeID, batchSave]);

  // Save on unmount
  useEffect(() => {
    return () => {
      if (dirtyNodes.size > 0 && selectedTreeID) {
        batchSave(selectedTreeID);
      }
    };
  }, []);

  const onNodeDragStop = useCallback(
    (_event: any, node: Node) => {
      if (selectedTreeID) {
        markDirty(node.id, selectedTreeID, node.position.x, node.position.y);
      }
    },
    [selectedTreeID, markDirty]
  );

  if (todos.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <div className="text-center">
          <div className="text-4xl mb-2">🧠</div>
          <p>Add some todos in Tree view first</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
        minZoom={0.1}
        maxZoom={4}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e2e8f0" />
        <Controls />
        <MiniMap
          nodeStrokeColor="#6366f1"
          nodeColor={(n: Node) => ((n.data as any)?.todo?.done ? "#bbf7d0" : "#ffffff")}
          maskColor="rgba(0,0,0,0.1)"
          style={{ border: "1px solid #e2e8f0", borderRadius: "8px" }}
        />
      </ReactFlow>
    </div>
  );
}
