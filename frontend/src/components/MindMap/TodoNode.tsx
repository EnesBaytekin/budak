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

  const childCount = todo.children?.length ?? 0;
  const maxDepth = todo.children ? maxNestDepth(todo.children) : 0;

  return (
    <div
      className={`min-w-[150px] max-w-[220px] rounded-lg border shadow-lg transition-all ${
        todo.done
          ? "bg-done-bg border-mint/30 opacity-70"
          : "bg-panel border-border hover:border-lavender/40"
      }`}
      onDoubleClick={handleDoubleClick}
    >
      <Handle type="target" position={Position.Left} className="!bg-line !w-2 !h-2 !border-0" />
      <Handle type="source" position={Position.Right} className="!bg-line !w-2 !h-2 !border-0" />

      <div className="p-2.5">
        <div className="flex items-start gap-2">
          <button
            onClick={handleToggle}
            className={`mt-0.5 w-4 h-4 rounded-sm border shrink-0 flex items-center justify-center transition ${
              todo.done
                ? "bg-mint/30 border-mint/50 text-mint"
                : "bg-elevated border-border hover:border-lavender/50"
            }`}
          >
            {todo.done && (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
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
                className="w-full bg-elevated border border-lavender/50 rounded-sm px-1 py-0.5 text-xs text-fg outline-none"
                autoFocus
              />
            ) : (
              <span
                className={`text-xs block cursor-text leading-relaxed ${
                  todo.done ? "line-through text-fg-muted" : "text-fg"
                }`}
              >
                {todo.title || "untitled"}
              </span>
            )}
          </div>
        </div>

        {childCount > 0 && (
          <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-fg-muted">
            <span className="bg-elevated px-1.5 py-0.5 rounded-sm leading-none">
              {childCount} sub{childCount > 1 ? "s" : ""}
            </span>
            {maxDepth > 0 && (
              <span className="bg-elevated px-1.5 py-0.5 rounded-sm leading-none">
                depth {maxDepth + 1}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

function maxNestDepth(children: Todo[]): number {
  let max = 0;
  for (const c of children) {
    const d = c.children ? 1 + maxNestDepth(c.children) : 0;
    if (d > max) max = d;
  }
  return max;
}

TodoNode.displayName = "TodoNode";
