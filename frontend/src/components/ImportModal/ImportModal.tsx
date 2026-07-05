import { useState, useEffect, useCallback } from "react";
import { useTreeStore } from "../../store/treeStore";
import { X, Upload, FileDown, Eye } from "lucide-react";
import * as todosApi from "../../api/todos";
import type { FormatConfig, PreviewItem } from "../../types";

export function ImportModal({ onClose }: { onClose: () => void }) {
  const { selectedTreeID, importTodos, exportTodos } = useTreeStore();
  const [tab, setTab] = useState<"import" | "export">("import");
  const [content, setContent] = useState("");
  const [format, setFormat] = useState("auto");
  const [preview, setPreview] = useState<PreviewItem[] | null>(null);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // Custom config fields
  const [donePrefix, setDonePrefix] = useState("[x]");
  const [undonePrefix, setUndonePrefix] = useState("[ ]");
  const [indent, setIndent] = useState("  ");
  const [bullet, setBullet] = useState("- ");

  // Export specific
  const [exportFormat, setExportFormat] = useState("markdown");
  const [exported, setExported] = useState("");

  const getConfig = useCallback((): FormatConfig | undefined => {
    if (format === "custom") {
      return {
        done_prefix: donePrefix || undefined,
        undone_prefix: undonePrefix || undefined,
        indent: indent || undefined,
        bullet: bullet || undefined,
      };
    }
    return undefined;
  }, [format, donePrefix, undonePrefix, indent, bullet]);

  // Auto-preview when content or config changes (debounced)
  useEffect(() => {
    if (!content.trim()) { setPreview(null); return; }
    const timer = setTimeout(async () => {
      try {
        const result = await todosApi.previewImport(content, format, getConfig());
        setPreview(result.items);
      } catch { setPreview(null); }
    }, 300);
    return () => clearTimeout(timer);
  }, [content, format, donePrefix, undonePrefix, indent, bullet, getConfig]);

  if (!selectedTreeID) {
    return (
      <div className="modal modal-open">
        <div className="modal-box">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg">Import / Export</h3>
            <button onClick={onClose} className="btn btn-ghost btn-sm"><X size={16} /></button>
          </div>
          <p className="text-sm text-base-content/60">Select a tree first.</p>
        </div>
        <div className="modal-backdrop" onClick={onClose} />
      </div>
    );
  }

  const handleImport = async () => {
    if (!content.trim()) return;
    setLoading(true);
    setStatus(null);
    try {
      const count = await importTodos(content, format, getConfig());
      setStatus({ ok: true, msg: `Imported ${count} todos.` });
      setContent("");
      setPreview(null);
    } catch (e: any) {
      setStatus({ ok: false, msg: e.message || "Import failed" });
    }
    setLoading(false);
  };

  const handleExport = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const config = getConfig();
      const text = await exportTodos(exportFormat, config);
      setExported(text);
      // Also get preview
      if (selectedTreeID) {
        try {
          const r = await todosApi.previewExport(selectedTreeID, exportFormat, config);
          setExported(r.content);
        } catch {}
      }
      setStatus({ ok: true, msg: "Export ready. Copy the text below." });
    } catch (e: any) {
      setStatus({ ok: false, msg: e.message || "Export failed" });
    }
    setLoading(false);
  };

  const copyExport = () => {
    navigator.clipboard.writeText(exported);
    setStatus({ ok: true, msg: "Copied to clipboard!" });
  };

  const previewSample = preview?.slice(0, 6) ?? [];

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-3xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">Import / Export</h3>
          <button onClick={onClose} className="btn btn-ghost btn-sm"><X size={16} /></button>
        </div>

        {/* Tabs */}
        <div role="tablist" className="tabs tabs-bordered mb-4">
          <button role="tab" className={`tab ${tab === "import" ? "tab-active" : ""}`}
            onClick={() => { setTab("import"); setStatus(null); }}>
            <Upload size={14} className="mr-1" /> Import
          </button>
          <button role="tab" className={`tab ${tab === "export" ? "tab-active" : ""}`}
            onClick={() => { setTab("export"); setStatus(null); setExported(""); }}>
            <FileDown size={14} className="mr-1" /> Export
          </button>
        </div>

        {tab === "import" && (
          <div className="space-y-3">
            <p className="text-xs text-base-content/50">
              Paste your todos below. Supports markdown lists (<code>- [x] Task</code>) and indented text.
            </p>

            {/* Format selector */}
            <select value={format} onChange={(e) => setFormat(e.target.value)}
              className="select select-bordered select-sm w-full max-w-xs">
              <option value="auto">Auto-detect format</option>
              <option value="markdown">Markdown (<code>- [x]</code>)</option>
              <option value="plain">Plain indented (<code>[x]</code>)</option>
              <option value="custom">Custom format...</option>
            </select>

            {format === "custom" && (
              <div className="flex flex-wrap gap-3 p-3 bg-base-200 rounded-box">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium">Done prefix</span>
                  <input value={donePrefix} onChange={(e) => setDonePrefix(e.target.value)}
                    className="input input-bordered input-sm w-24 font-mono" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium">Undone prefix</span>
                  <input value={undonePrefix} onChange={(e) => setUndonePrefix(e.target.value)}
                    className="input input-bordered input-sm w-24 font-mono" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium">Indent string</span>
                  <input value={indent} onChange={(e) => setIndent(e.target.value)}
                    className="input input-bordered input-sm w-24 font-mono" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium">Bullet marker</span>
                  <input value={bullet} onChange={(e) => setBullet(e.target.value)}
                    className="input input-bordered input-sm w-24 font-mono" />
                </label>
              </div>
            )}

            {/* Content textarea */}
            <textarea value={content} onChange={(e) => setContent(e.target.value)}
              placeholder={`- [x] Groceries\n  - Milk\n  - [ ] Eggs\n- Workout`}
              className="textarea textarea-bordered w-full h-36 font-mono text-sm"
            />

            {/* Preview */}
            {previewSample.length > 0 && (
              <div className="border border-base-300 rounded-box p-3 bg-base-200/50">
                <div className="flex items-center gap-1 text-xs text-base-content/50 mb-2">
                  <Eye size={12} />
                  Preview ({preview?.length || 0} items detected)
                </div>
                <div className="space-y-0.5 font-mono text-sm max-h-32 overflow-y-auto">
                  {previewSample.map((item, i) => (
                    <div key={i} className="flex items-center gap-2"
                      style={{ paddingLeft: `${item.depth * 16}px` }}>
                      <span className={item.done ? "text-success" : "text-base-content/30"}>
                        {item.done ? "✓" : "○"}
                      </span>
                      <span className={item.done ? "line-through text-base-content/60" : ""}>
                        {item.title}
                      </span>
                      {item.depth === 0 && previewSample[i+1]?.depth > item.depth && (
                        <span className="text-xs text-base-content/30">↳ {previewSample.filter((_, j) => j > i && _.depth > item.depth).length} child</span>
                      )}
                    </div>
                  ))}
                  {(preview?.length ?? 0) > 6 && (
                    <div className="text-xs text-base-content/40 pl-2">... and {preview!.length - 6} more</div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center">
              <div className="text-xs text-base-content/40">
                {content.trim() ? `${content.trim().split('\n').length} lines` : ''}
              </div>
              <button onClick={handleImport} disabled={loading || !content.trim()}
                className="btn btn-primary btn-sm">
                {loading ? <span className="loading loading-spinner loading-xs" /> : <Upload size={14} />}
                Import
              </button>
            </div>
          </div>
        )}

        {tab === "export" && (
          <div className="space-y-3">
            <p className="text-xs text-base-content/50">
              Export your todos in various formats.
            </p>

            <div className="flex items-center gap-4 flex-wrap">
              <select value={exportFormat} onChange={(e) => { setExportFormat(e.target.value); setExported(""); }}
                className="select select-bordered select-sm">
                <option value="markdown">Markdown (checklist)</option>
                <option value="plain">Plain (with checkboxes)</option>
                <option value="plain-simple">Plain (titles only)</option>
                <option value="yaml">YAML</option>
                <option value="custom">Custom format...</option>
              </select>
            </div>

            {exportFormat === "custom" && (
              <div className="flex flex-wrap gap-3 p-3 bg-base-200 rounded-box">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium">Done prefix</span>
                  <input value={donePrefix} onChange={(e) => setDonePrefix(e.target.value)}
                    className="input input-bordered input-sm w-24 font-mono" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium">Undone prefix</span>
                  <input value={undonePrefix} onChange={(e) => setUndonePrefix(e.target.value)}
                    className="input input-bordered input-sm w-24 font-mono" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium">Indent string</span>
                  <input value={indent} onChange={(e) => setIndent(e.target.value)}
                    className="input input-bordered input-sm w-24 font-mono" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium">Bullet marker</span>
                  <input value={bullet} onChange={(e) => setBullet(e.target.value)}
                    className="input input-bordered input-sm w-24 font-mono" />
                </label>
              </div>
            )}

            <button onClick={handleExport} disabled={loading}
              className="btn btn-primary btn-sm">
              {loading ? <span className="loading loading-spinner loading-xs" /> : <FileDown size={14} />}
              Generate Export
            </button>

            {exported && (
              <div className="relative mt-2">
                <p className="text-xs text-base-content/50 mb-1 flex items-center gap-1">
                  <Eye size={12} /> Export preview:
                </p>
                <textarea readOnly value={exported}
                  className="textarea textarea-bordered w-full h-48 font-mono text-sm" />
                <button onClick={copyExport}
                  className="btn btn-ghost btn-xs absolute top-7 right-2">
                  Copy
                </button>
              </div>
            )}
          </div>
        )}

        {status && (
          <div className={`mt-3 text-sm ${status.ok ? "text-success" : "text-error"}`}>
            {status.msg}
          </div>
        )}
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
}
