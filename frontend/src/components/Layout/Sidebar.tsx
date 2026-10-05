import { useState, useRef } from "react";
import { useTreeStore } from "../../store/treeStore";
import { useAuthStore } from "../../store/authStore";
import { useMindmapStore } from "../../store/mindmapStore";
import { useThemeStore } from "../../store/themeStore";
import { Moon, Sun, Plus, LogOut, X, Upload, FileDown, Pencil, ChevronUp, ChevronDown } from "lucide-react";
import { ImportModal } from "../ImportModal/ImportModal";
import type { Tree } from "../../types";

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { trees, selectedTreeID, selectTree, createTree, renameTree, reorderTree, deleteTree } = useTreeStore();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const loadPositions = useMindmapStore((s) => s.loadPositions);
  const { theme, toggle: toggleTheme } = useThemeStore();
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingTreeID, setEditingTreeID] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const cancelRef = useRef(false);
  const editCancelRef = useRef(false);

  const handleSelect = async (id: string) => {
    await loadPositions(id);
    await selectTree(id);
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setAdding(false);
    const tree = await createTree(newTitle.trim());
    setNewTitle("");
    if (tree) {
      await loadPositions(tree.id);
      await selectTree(tree.id);
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

  const handleRenameStart = (e: React.MouseEvent, tree: Tree) => {
    e.stopPropagation();
    setEditingTreeID(tree.id);
    setEditTitle(tree.title);
  };

  const handleRenameBlur = () => {
    if (editCancelRef.current) {
      editCancelRef.current = false;
      setEditingTreeID(null);
      setEditTitle("");
      return;
    }
    const id = editingTreeID;
    const title = editTitle.trim();
    setEditingTreeID(null);
    setEditTitle("");
    if (id && title) renameTree(id, title);
  };

  const handleReorder = async (e: React.MouseEvent, id: string, direction: "up" | "down") => {
    e.stopPropagation();
    await reorderTree(id, direction);
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
            <h2 className="text-lg font-bold text-primary">budak</h2>
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
            {trees.map((tree, idx) => (
              <div
                key={tree.id}
                className="flex items-center gap-1"
              >
                {editingTreeID === tree.id ? (
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                      if (e.key === "Escape") { editCancelRef.current = true; e.currentTarget.blur(); }
                    }}
                    onBlur={handleRenameBlur}
                    className="input input-bordered input-sm w-full text-sm"
                    autoFocus
                  />
                ) : (
                  <>
                    <button
                      onClick={() => handleSelect(tree.id)}
                      className={`flex-1 flex items-center justify-between px-3 py-2 rounded-btn text-sm text-left transition min-w-0 ${
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
                    <div className="flex items-center shrink-0 gap-0.5">
                      <button
                        onClick={(e) => handleRenameStart(e, tree)}
                        className="btn btn-ghost btn-xs px-1 text-base-content/50 hover:text-primary hover:bg-base-300"
                        title="Rename"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={(e) => handleReorder(e, tree.id, "up")}
                        disabled={idx === 0}
                        className="btn btn-ghost btn-xs px-1 text-base-content/50 hover:text-base-content hover:bg-base-300 disabled:opacity-20"
                        title="Move up"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        onClick={(e) => handleReorder(e, tree.id, "down")}
                        disabled={idx === trees.length - 1}
                        className="btn btn-ghost btn-xs px-1 text-base-content/50 hover:text-base-content hover:bg-base-300 disabled:opacity-20"
                        title="Move down"
                      >
                        <ChevronDown size={14} />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, tree.id)}
                        className="btn btn-ghost btn-xs px-1 text-base-content/50 hover:text-error hover:bg-base-300"
                        title="Delete"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {trees.length === 0 && !adding && (
              <p className="text-xs text-base-content/40 px-3 py-6 text-center">no trees yet</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-base-300 flex flex-col gap-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowImportModal(true)}
              className="btn btn-ghost btn-xs text-base-content/50 hover:text-primary flex-1"
              title="Import / Export"
            >
              <Upload size={12} />
              import
            </button>
            <span className="text-base-content/20">/</span>
            <button
              onClick={() => setShowImportModal(true)}
              className="btn btn-ghost btn-xs text-base-content/50 hover:text-primary flex-1 text-left"
              title="Export"
            >
              <FileDown size={12} />
              export
            </button>
          </div>
          <div className="flex items-center justify-between">
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
        </div>
      </aside>

      {showImportModal && <ImportModal onClose={() => setShowImportModal(false)} />}
    </>
  );
}
