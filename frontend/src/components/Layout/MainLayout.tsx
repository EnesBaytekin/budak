import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "./Sidebar";
import { TodoTreeView } from "../TodoTree/TodoTreeView";
import { MindMapView } from "../MindMap/MindMapView";
import { useTreeStore } from "../../store/treeStore";
import { useMindmapStore } from "../../store/mindmapStore";
import { Menu } from "lucide-react";
import { getPrefs, savePrefs, type UserPrefs } from "../../api/prefs";

type View = "tree" | "mindmap";

export function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [view, setView] = useState<View>("tree");
  const selectedTreeID = useTreeStore((s) => s.selectedTreeID);
  const selectTree = useTreeStore((s) => s.selectTree);
  const loadTrees = useTreeStore((s) => s.loadTrees);
  const reset = useTreeStore((s) => s.reset);
  const loadPositions = useMindmapStore((s) => s.loadPositions);

  // Restore last session on mount: preferred tree + view, else first tree.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      reset();
      const trees = await loadTrees();
      const prefs = await getPrefs().catch(() => ({} as UserPrefs));
      if (cancelled) return;
      if (prefs.view) setView(prefs.view);

      const target =
        prefs.selected_tree_id && trees.some((t) => t.id === prefs.selected_tree_id)
          ? prefs.selected_tree_id
          : trees[0]?.id ?? null;

      if (target) {
        await loadPositions(target);
        if (!cancelled) await selectTree(target);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reset, loadTrees, loadPositions, selectTree]);

  // Save view when switching tabs
  const handleViewChange = useCallback((newView: View) => {
    setView(newView);
    savePrefs({ selected_tree_id: selectedTreeID || undefined, view: newView }).catch(() => {});
  }, [selectedTreeID]);

  // Save selection when tree or view changes
  useEffect(() => {
    if (selectedTreeID) {
      savePrefs({ selected_tree_id: selectedTreeID, view }).catch(() => {});
    }
  }, [selectedTreeID, view]);

  const tabs: { id: View; label: string }[] = [
    { id: "tree", label: "tree" },
    { id: "mindmap", label: "mind map" },
  ];

  return (
    <div className="flex h-dvh bg-base-100 overflow-hidden">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="bg-base-200 border-b border-base-300 px-3 py-2 flex items-center gap-2 shrink-0">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="btn btn-ghost btn-sm lg:hidden"
          >
            <Menu size={16} />
          </button>

          <div className="join">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleViewChange(tab.id)}
                className={`join-item btn btn-sm ${
                  view === tab.id ? "btn-primary" : "btn-ghost"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {!selectedTreeID && (
            <span className="ml-auto text-xs text-base-content/40 italic hidden sm:block">
              select a tree from the sidebar
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {!selectedTreeID ? (
            <div className="flex items-center justify-center h-full text-base-content/40">
              <div className="text-center">
                <div className="text-5xl mb-3 opacity-30">⊞</div>
                <p className="text-sm">select or create a tree to get started</p>
              </div>
            </div>
          ) : view === "tree" ? (
            <TodoTreeView />
          ) : (
            <MindMapView />
          )}
        </div>
      </div>
    </div>
  );
}
