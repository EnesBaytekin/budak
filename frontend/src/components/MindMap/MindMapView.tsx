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

  const { getDefaultPosition, markDirty, batchSave, dirtyNodes } = useMindmapStore();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([] as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([] as Edge[]);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoadDone = useRef(false);

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
              animated: true,
              style: { stroke: "#38385a", strokeWidth: 2 },
              markerEnd: { type: MarkerType.ArrowClosed, color: "#38385a" },
            });
            addEdges([child]);
          }
        }
      }
    };
    addEdges(todos);

    setNodes(newNodes);
    setEdges(newEdges);
    initialLoadDone.current = true;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <div className="flex items-center justify-center h-full text-fg-muted">
        <div className="text-center">
          <div className="text-3xl mb-2 text-fg-muted/40">◎</div>
          <p className="text-sm">add some todos in tree view first</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-canvas">
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
        defaultEdgeOptions={{
          style: { stroke: "#38385a", strokeWidth: 2 },
          type: "smoothstep",
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={25} size={1.5} color="#1e1e36" />
        <Controls showInteractive={false} />
        <MiniMap
          nodeStrokeColor="#38385a"
          nodeColor={(n) => ((n.data as any)?.todo?.done ? "#142114" : "#1e1e36")}
          maskColor="rgba(13,13,26,0.7)"
          style={{ background: "#16162a" }}
        />
      </ReactFlow>
    </div>
  );
}
