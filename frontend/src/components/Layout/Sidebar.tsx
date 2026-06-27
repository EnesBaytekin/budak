import { useState, useEffect } from "react";
import { useTreeStore } from "../../store/treeStore";
import { useAuthStore } from "../../store/authStore";
import { useMindmapStore } from "../../store/mindmapStore";

export function Sidebar() {
  const { trees, selectedTreeID, loadTrees, selectTree, createTree, deleteTree } = useTreeStore();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const loadPositions = useMindmapStore((s) => s.loadPositions);
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadTrees();
  }, [loadTrees]);

  const handleSelect = async (id: string) => {
    await selectTree(id);
    await loadPositions(id);
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    await createTree(newTitle.trim());
    setNewTitle("");
    setAdding(false);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Delete this tree and all its todos?")) {
      await deleteTree(id);
    }
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-800">Tudo</h2>
        <p className="text-xs text-gray-500 truncate">{user?.username}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <div className="flex items-center justify-between mb-2 px-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Trees</span>
          <button
            onClick={() => setAdding(true)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            + New
          </button>
        </div>

        {adding && (
          <div className="mb-2 px-1">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") setAdding(false);
              }}
              placeholder="Tree name..."
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 outline-none"
              autoFocus
            />
          </div>
        )}

        <div className="space-y-0.5">
          {trees.map((tree) => (
            <div
              key={tree.id}
              onClick={() => handleSelect(tree.id)}
              className={`group flex items-center justify-between px-3 py-2 rounded-md cursor-pointer text-sm transition ${
                selectedTreeID === tree.id
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                <span className="truncate">{tree.title}</span>
              </div>
              <button
                onClick={(e) => handleDelete(e, tree.id)}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition shrink-0"
                title="Delete"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="p-3 border-t border-gray-200">
        <button
          onClick={logout}
          className="w-full text-left text-sm text-gray-600 hover:text-red-600 px-2 py-1.5 rounded-md hover:bg-red-50 transition flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </button>
      </div>
    </div>
  );
}
