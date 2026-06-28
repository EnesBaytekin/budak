import { memo, useState, useCallback, useEffect, useRef } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { Todo } from "../../types";
import { Check, Plus } from "lucide-react";
import { useTreeStore } from "../../store/treeStore";

type TodoNodeData = {
  todo: Todo;
  onToggle?: (id: string, done: boolean) => void;
  onTitleChange?: (id: string, title: string) => void;
  onAddChild?: (parentId: string) => void;
};

export const TodoNode = memo(({ data }: NodeProps) => {
  const { todo, onToggle, onTitleChange, onAddChild } = data as TodoNodeData;
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const editingTodoID = useTreeStore((s) => s.editingTodoID);
  const setEditingTodoID = useTreeStore((s) => s.setEditingTodoID);

  useEffect(() => {
    setEditTitle(todo.title);
  }, [todo.title]);

  useEffect(() => {
    if (editingTodoID !== todo.id) return;
    setEditTitle(todo.title);
    setIsEditing(true);
    setEditingTodoID(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [editingTodoID, todo.id, todo.title, setEditingTodoID]);

  const handleSave = useCallback(() => {
    if (editTitle.trim() && editTitle !== todo.title && onTitleChange) {
      onTitleChange(todo.id, editTitle.trim());
    }
    setIsEditing(false);
  }, [editTitle, todo.id, todo.title, onTitleChange]);

  const handleDoubleClick = useCallback(() => {
    setEditTitle(todo.title);
    setIsEditing(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [todo.title]);

  const handleToggle = useCallback(() => {
    if (onToggle) onToggle(todo.id, !todo.done);
  }, [todo.id, todo.done, onToggle]);

  const childCount = todo.children?.length ?? 0;

  return (
    <div
      className={`rounded-xl border-2 shadow-md transition-all min-w-[150px] max-w-[230px] ${
        todo.done
          ? "bg-success/5 border-success/20"
          : "bg-base-100 border-base-300 hover:border-primary/40"
      }`}
      onDoubleClick={handleDoubleClick}
    >
      {/* Invisible center handles */}
      <Handle type="target" position={Position.Top} style={{ opacity: 0, pointerEvents: "none" }} />
      <Handle type="source" position={Position.Top} style={{ opacity: 0, pointerEvents: "none" }} />

      <div className="p-3">
        <div className="flex items-start gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); handleToggle(); }}
            className={`mt-0.5 w-5 h-5 rounded-full shrink-0 flex items-center justify-center border-2 transition ${
              todo.done
                ? "bg-success/20 border-success/40 text-success"
                : "bg-base-100 border-base-300 hover:border-primary/40"
            }`}
          >
            {todo.done && <Check size={12} strokeWidth={3} />}
          </button>

          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleSave}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                  if (e.key === "Escape") setIsEditing(false);
                }}
                className="w-full bg-transparent text-sm text-base-content outline-none px-1"
                autoFocus
              />
            ) : (
              <span
                className={`text-sm block cursor-text leading-snug ${
                  todo.done ? "line-through text-base-content/40" : "text-base-content"
                }`}
              >
                {todo.title || "untitled"}
              </span>
            )}
          </div>
        </div>

        {/* Bottom row — child count + add sub button */}
        <div className="mt-2 flex items-center justify-between">
          {childCount > 0 ? (
            <span className="text-[10px] text-base-content/30">{childCount} sub</span>
          ) : (
            <span />
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onAddChild?.(todo.id); }}
            className="btn btn-ghost btn-xs gap-1 text-primary/70 hover:text-primary p-0 h-6 min-h-0"
          >
            <Plus size={12} />
            <span className="text-[10px]">sub</span>
          </button>
        </div>
      </div>
    </div>
  );
});

TodoNode.displayName = "TodoNode";
