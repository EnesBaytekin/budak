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
    <div className="w-64 bg-panel border-r border-border flex flex-col h-full shrink-0">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-bold text-lavender">tudo</h2>
        <p className="text-xs text-fg-muted truncate mt-0.5">{user?.username}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs font-medium text-fg-muted uppercase tracking-widest">trees</span>
          <button
            onClick={() => setAdding(true)}
            className="text-xs text-lavender hover:text-lavender/80 font-medium transition"
          >
            + new
          </button>
        </div>

        {adding && (
          <div className="mb-2">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") setAdding(false);
              }}
              placeholder="tree name..."
              className="w-full bg-elevated border border-border rounded-sm px-2.5 py-1.5 text-sm text-fg placeholder:text-fg-muted outline-none focus:border-lavender/50 transition"
              autoFocus
            />
          </div>
        )}

        <div className="space-y-0.5">
          {trees.map((tree) => (
            <div
              key={tree.id}
              onClick={() => handleSelect(tree.id)}
              className={`group flex items-center justify-between px-3 py-2 rounded-sm cursor-pointer text-sm transition ${
                selectedTreeID === tree.id
                  ? "bg-lavender/15 text-lavender border border-lavender/20"
                  : "text-fg-soft hover:bg-hover border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <svg className="w-3.5 h-3.5 shrink-0 text-fg-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                <span className="truncate">{tree.title}</span>
              </div>
              <button
                onClick={(e) => handleDelete(e, tree.id)}
                className="opacity-0 group-hover:opacity-100 text-fg-muted hover:text-danger transition shrink-0"
                title="Delete"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          {trees.length === 0 && !adding && (
            <p className="text-xs text-fg-muted px-3 py-4 text-center">no trees yet</p>
          )}
        </div>
      </div>

      <div className="p-3 border-t border-border">
        <button
          onClick={logout}
          className="w-full text-left text-sm text-fg-muted hover:text-danger px-2 py-1.5 rounded-sm hover:bg-danger-bg transition flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          sign out
        </button>
      </div>
    </div>
  );
}
