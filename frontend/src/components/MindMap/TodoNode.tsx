import { memo, useState, useCallback, useEffect, useRef } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { Todo } from "../../types";

type TodoNodeData = {
  todo: Todo;
  onToggle?: (id: string, done: boolean) => void;
  onTitleChange?: (id: string, title: string) => void;
};

export const TodoNode = memo(({ data }: NodeProps) => {
  const { todo, onToggle, onTitleChange } = data as TodoNodeData;
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditTitle(todo.title);
  }, [todo.title]);

  const handleDoubleClick = useCallback(() => {
    setEditTitle(todo.title);
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [todo.title]);

  const handleSave = useCallback(() => {
    if (editTitle.trim() && editTitle !== todo.title && onTitleChange) {
      onTitleChange(todo.id, editTitle.trim());
    }
    setIsEditing(false);
  }, [editTitle, todo.id, todo.title, onTitleChange]);

  const handleToggle = useCallback(() => {
    if (onToggle) onToggle(todo.id, !todo.done);
  }, [todo.id, todo.done, onToggle]);

  return (
    <div
      className={`min-w-[160px] max-w-[240px] rounded-xl border-2 shadow-md transition-all ${
        todo.done
          ? "bg-green-50 border-green-300 opacity-75"
          : "bg-white border-blue-200 hover:shadow-lg"
      }`}
      onDoubleClick={handleDoubleClick}
    >
      <Handle type="target" position={Position.Left} className="!bg-gray-400" />
      <Handle type="source" position={Position.Right} className="!bg-gray-400" />

      <div className="p-3">
        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={todo.done}
            onChange={handleToggle}
            className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
          />
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
                className="w-full px-1 py-0.5 text-sm border border-blue-400 rounded outline-none"
                autoFocus
              />
            ) : (
              <span
                className={`text-sm block cursor-text ${
                  todo.done ? "line-through text-gray-400" : "text-gray-800"
                }`}
              >
                {todo.title || "Untitled"}
              </span>
            )}
            {todo.note && (
              <p className="text-xs text-gray-400 mt-1 truncate">{todo.note}</p>
            )}
          </div>
        </div>

        {/* Children count badge */}
        {todo.children && todo.children.length > 0 && (
          <div className="mt-1.5 text-xs text-gray-400 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {todo.children.length} sub-task{todo.children.length > 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
});

TodoNode.displayName = "TodoNode";
