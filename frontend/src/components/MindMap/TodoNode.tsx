import { memo, useState, useCallback, useEffect, useRef } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { Todo } from "../../types";
import { Check, Plus, Link2, Trash2 } from "lucide-react";
import { useTreeStore } from "../../store/treeStore";

type TodoNodeData = {
  todo: Todo;
  isRoot?: boolean;
  onToggle?: (id: string, done: boolean) => void;
  onTitleChange?: (id: string, title: string) => void;
  onAddChild?: (parentId: string) => void;
  onConnectStart?: (nodeId: string) => void;
  onDelete?: (id: string) => void;
};

export const TodoNode = memo(({ data }: NodeProps) => {
  const { todo, isRoot, onToggle, onTitleChange, onAddChild, onConnectStart, onDelete } = data as TodoNodeData;
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const editingTodoID = useTreeStore((s) => s.editingTodoID);
  const setEditingTodoID = useTreeStore((s) => s.setEditingTodoID);

  useEffect(() => { setEditTitle(todo.title); }, [todo.title]);

  useEffect(() => {
    if (editingTodoID !== todo.id) return;
    setEditTitle(todo.title);
    setIsEditing(true);
    setEditingTodoID(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [editingTodoID, todo.id, todo.title, setEditingTodoID]);

  const handleSave = useCallback(() => {
    if (editTitle.trim() && editTitle !== todo.title && onTitleChange) onTitleChange(todo.id, editTitle.trim());
    setIsEditing(false);
  }, [editTitle, todo.id, todo.title, onTitleChange]);

  const handleDoubleClick = useCallback(() => {
    setEditTitle(todo.title);
    setIsEditing(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [todo.title]);

  const handleToggle = useCallback(() => { if (onToggle) onToggle(todo.id, !todo.done); }, [todo.id, todo.done, onToggle]);

  const childCount = todo.children?.length ?? 0;
  const isLeaf = childCount === 0 && !isRoot;
  const isDone = todo.done;

  // Background tint for root / leaf / done nodes
  let nodeBg = "bg-base-100";
  if (isDone) {
    nodeBg = "node-done";
  } else if (isRoot) {
    nodeBg = "node-root";
  } else if (isLeaf) {
    nodeBg = "node-leaf";
  }

  return (
    <div
      onDoubleClick={handleDoubleClick}
      className={`min-w-[160px] max-w-[240px] rounded-2xl transition-all duration-200 ${nodeBg} shadow-lg hover:shadow-xl`}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0, pointerEvents: "none" }} />
      <Handle type="source" position={Position.Top} style={{ opacity: 0, pointerEvents: "none" }} />

      <div className="p-3.5">
        <div className="flex items-start gap-2.5">
          <button onClick={(e) => { e.stopPropagation(); handleToggle(); }}
            className={`mt-0.5 w-5 h-5 rounded-full shrink-0 flex items-center justify-center border-2 transition-all ${
              todo.done
                ? "bg-success/40 border-success/60 text-success-content"
                : "bg-base-100 border-base-300 hover:border-primary/50"
            }`}>
            {todo.done && <Check size={12} strokeWidth={3} />}
          </button>
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input ref={inputRef} type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleSave} onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setIsEditing(false); }}
                className="w-full bg-base-200 text-sm text-base-content outline-none px-2 py-0.5 rounded" autoFocus />
            ) : (
              <span className={`text-sm block cursor-text leading-snug ${
                todo.done ? "line-through text-base-content/50" : "text-base-content"
              }`}>
                {todo.title || "untitled"}
              </span>
            )}
          </div>
        </div>

        <div className="mt-2.5 flex items-center justify-between pt-1.5 border-t border-base-200">
          <div className="flex items-center gap-1">
            <button onClick={(e) => { e.stopPropagation(); onConnectStart?.(todo.id); }}
              className="btn btn-ghost btn-xs p-0 w-5 h-5 min-h-0 text-base-content/40 hover:text-secondary" title="Connect">
              <Link2 size={11} />
            </button>
            {(childCount > 0) ? (
              <span className="text-[10px] font-medium text-base-content/40 ml-1 bg-base-300 px-1.5 py-0.5 rounded-full">
                {childCount}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={(e) => { e.stopPropagation(); onAddChild?.(todo.id); }}
              className="btn btn-ghost btn-xs p-0 w-5 h-5 min-h-0 text-base-content/40 hover:text-primary" title="Add child">
              <Plus size={12} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); if (confirm("Delete?")) onDelete?.(todo.id); }}
              className="btn btn-ghost btn-xs p-0 w-5 h-5 min-h-0 text-base-content/40 hover:text-error" title="Delete">
              <Trash2 size={10} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

TodoNode.displayName = "TodoNode";
