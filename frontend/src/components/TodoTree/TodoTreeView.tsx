import { useState } from "react";
import { useTreeStore } from "../../store/treeStore";
import { TreeNode } from "./TreeNode";

export function TodoTreeView() {
  const { todos, createTodo } = useTreeStore();
  const [newTitle, setNewTitle] = useState("");

  const handleAddRoot = async () => {
    if (!newTitle.trim()) return;
    await createTodo(newTitle.trim(), null);
    setNewTitle("");
  };

  return (
    <div className="h-full flex flex-col">
      {/* Add root todo */}
      <div className="p-3 border-b border-border bg-panel">
        <div className="flex items-center gap-2 max-w-xl">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddRoot();
            }}
            placeholder="add a new todo..."
            className="flex-1 bg-elevated border border-border rounded-sm px-3 py-1.5 text-sm text-fg placeholder:text-fg-muted outline-none focus:border-lavender/50 transition"
          />
          <button
            onClick={handleAddRoot}
            disabled={!newTitle.trim()}
            className="px-4 py-1.5 bg-lavender/20 text-lavender border border-lavender/30 rounded-sm text-sm font-medium hover:bg-lavender/30 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            add
          </button>
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto p-3">
        {todos.length === 0 ? (
          <div className="flex items-center justify-center h-full text-fg-muted">
            <div className="text-center">
              <div className="text-3xl mb-2 text-fg-muted/40">⊞</div>
              <p className="text-sm">no todos yet. add one above!</p>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl">
            {todos.map((todo) => (
              <TreeNode key={todo.id} todo={todo} depth={0} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
