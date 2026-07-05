import { useState } from "react";
import { useTreeStore } from "../../store/treeStore";
import { X, Upload, FileDown } from "lucide-react";

type Tab = "import" | "export";

export function ImportModal({ onClose }: { onClose: () => void }) {
  const { selectedTreeID, importTodos, exportTodos } = useTreeStore();
  const [tab, setTab] = useState<Tab>("import");
  const [content, setContent] = useState("");
  const [format, setFormat] = useState("auto");
  const [exportFormat, setExportFormat] = useState("markdown");
  const [exported, setExported] = useState("");
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [loading, setLoading] = useState(false);

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
      const count = await importTodos(content, format);
      setStatus({ ok: true, msg: `Imported ${count} todos.` });
      setContent("");
    } catch (e: any) {
      setStatus({ ok: false, msg: e.message || "Import failed" });
    }
    setLoading(false);
  };

  const handleExport = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const text = await exportTodos(exportFormat);
      setExported(text);
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

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">Import / Export</h3>
          <button onClick={onClose} className="btn btn-ghost btn-sm"><X size={16} /></button>
        </div>

        {/* Tabs */}
        <div role="tablist" className="tabs tabs-bordered mb-4">
          <button
            role="tab"
            className={`tab ${tab === "import" ? "tab-active" : ""}`}
            onClick={() => { setTab("import"); setStatus(null); }}
          >
            <Upload size={14} className="mr-1" /> Import
          </button>
          <button
            role="tab"
            className={`tab ${tab === "export" ? "tab-active" : ""}`}
            onClick={() => { setTab("export"); setStatus(null); setExported(""); }}
          >
            <FileDown size={14} className="mr-1" /> Export
          </button>
        </div>

        {tab === "import" && (
          <div className="space-y-3">
            <p className="text-xs text-base-content/50">
              Paste your todos below. Supports markdown lists (<code>- [x] Task</code>) and indented text.
            </p>

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`- [x] Groceries\n  - Milk\n  - [ ] Eggs\n- Workout`}
              className="textarea textarea-bordered w-full h-48 font-mono text-sm"
            />

            <div className="flex items-center gap-4">
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="select select-bordered select-sm"
              >
                <option value="auto">Auto-detect</option>
                <option value="markdown">Markdown</option>
                <option value="plain">Plain indented</option>
              </select>

              <button
                onClick={handleImport}
                disabled={loading || !content.trim()}
                className="btn btn-primary btn-sm"
              >
                {loading ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  <Upload size={14} />
                )}
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

            <div className="flex items-center gap-4">
              <select
                value={exportFormat}
                onChange={(e) => { setExportFormat(e.target.value); setExported(""); }}
                className="select select-bordered select-sm"
              >
                <option value="markdown">Markdown (checklist)</option>
                <option value="plain">Plain (with checkboxes)</option>
                <option value="plain-simple">Plain (titles only)</option>
                <option value="yaml">YAML</option>
              </select>

              <button
                onClick={handleExport}
                disabled={loading}
                className="btn btn-primary btn-sm"
              >
                {loading ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  <FileDown size={14} />
                )}
                Export
              </button>
            </div>

            {exported && (
              <div className="relative">
                <textarea
                  readOnly
                  value={exported}
                  className="textarea textarea-bordered w-full h-48 font-mono text-sm"
                />
                <button
                  onClick={copyExport}
                  className="btn btn-ghost btn-xs absolute top-2 right-2"
                >
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
