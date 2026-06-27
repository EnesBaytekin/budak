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
      <div className="p-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2 max-w-xl">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddRoot();
            }}
            placeholder="Add a new todo..."
            className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
          <button
            onClick={handleAddRoot}
            disabled={!newTitle.trim()}
            className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Add
          </button>
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto p-3">
        {todos.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <div className="text-4xl mb-2">🌱</div>
              <p>No todos yet. Add one above!</p>
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
