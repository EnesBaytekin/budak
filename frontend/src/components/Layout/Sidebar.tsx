import { useState, useEffect, useRef } from "react";
import { useTreeStore } from "../../store/treeStore";
import { useAuthStore } from "../../store/authStore";
import { useMindmapStore } from "../../store/mindmapStore";
import { useThemeStore } from "../../store/themeStore";
import { Moon, Sun, Plus, LogOut, X } from "lucide-react";

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { trees, selectedTreeID, loadTrees, selectTree, createTree, deleteTree } = useTreeStore();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const loadPositions = useMindmapStore((s) => s.loadPositions);
  const { theme, toggle: toggleTheme } = useThemeStore();
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const cancelRef = useRef(false);

  useEffect(() => {
    loadTrees();
  }, [loadTrees]);

  const handleSelect = async (id: string) => {
    await selectTree(id);
    await loadPositions(id);
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setAdding(false);
    const tree = await createTree(newTitle.trim());
    setNewTitle("");
    if (tree) {
      await selectTree(tree.id);
      await loadPositions(tree.id);
    }
  };

  const handleBlur = async () => {
    if (cancelRef.current) { cancelRef.current = false; return; }
    if (newTitle.trim()) {
      await handleCreate();
    } else {
      setAdding(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Delete this tree and all its todos?")) {
      await deleteTree(id);
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {!collapsed && (
        <div className="fixed inset-0 bg-black/30 z-20 lg:hidden" onClick={onToggle} />
      )}

      <aside
        className={`${
          collapsed ? "-translate-x-full" : "translate-x-0"
        } lg:translate-x-0 fixed lg:static z-30 inset-y-0 left-0 w-64 bg-base-200 border-r border-base-300 flex flex-col h-dvh transition-transform duration-200`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <div>
            <h2 className="text-lg font-bold text-primary">tudo</h2>
            <p className="text-xs text-base-content/50 truncate mt-0.5">{user?.username}</p>
          </div>
          <button onClick={onToggle} className="btn btn-ghost btn-sm lg:hidden">
            <X size={16} />
          </button>
        </div>

        {/* Trees */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-medium text-base-content/50 uppercase tracking-widest">trees</span>
            <button
              onClick={() => setAdding(true)}
              className="btn btn-ghost btn-xs text-primary"
            >
              <Plus size={12} />
              new
            </button>
          </div>

          {adding && (
            <div className="mb-2">
              <div className="flex gap-1">
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate();
                    if (e.key === "Escape") { cancelRef.current = true; setAdding(false); setNewTitle(""); }
                  }}
                  onBlur={handleBlur}
                  placeholder="tree name..."
                  className="input input-bordered input-sm w-full text-sm"
                  autoFocus
                />
                <button onMouseDown={() => { cancelRef.current = true; }} onClick={() => { setAdding(false); setNewTitle(""); cancelRef.current = false; }} className="btn btn-ghost btn-sm">
                  <X size={14} />
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-0.5">
            {trees.map((tree) => (
              <div
                key={tree.id}
                className="group flex items-center"
              >
                <button
                  onClick={() => handleSelect(tree.id)}
                  className={`flex-1 flex items-center justify-between px-3 py-2 rounded-btn text-sm text-left transition ${
                    selectedTreeID === tree.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-base-content/70 hover:bg-base-300"
                  }`}
                >
                  <span className="truncate flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 shrink-0 text-base-content/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    {tree.title}
                  </span>
                </button>
                <button
                  onClick={(e) => handleDelete(e, tree.id)}
                  className="opacity-0 group-hover:opacity-100 hover:text-error transition shrink-0 btn btn-ghost btn-xs"
                  title="Delete"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            {trees.length === 0 && !adding && (
              <p className="text-xs text-base-content/40 px-3 py-6 text-center">no trees yet</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-base-300 flex items-center justify-between">
          <button
            onClick={logout}
            className="btn btn-ghost btn-sm text-base-content/50 hover:text-error"
          >
            <LogOut size={14} />
            sign out
          </button>
          <button
            onClick={toggleTheme}
            className="btn btn-ghost btn-sm text-base-content/50"
            title={`Switch to ${theme === "cupcake" ? "dark" : "light"}`}
          >
            {theme === "cupcake" ? <Moon size={14} /> : <Sun size={14} />}
          </button>
        </div>
      </aside>
    </>
  );
}
