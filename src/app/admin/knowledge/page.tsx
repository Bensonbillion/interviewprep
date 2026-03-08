"use client";

import { useEffect, useState, useRef } from "react";
import { PlusIcon, TrashIcon, ArrowPathIcon, DocumentTextIcon, LinkIcon, PencilSquareIcon } from "@heroicons/react/24/outline";

interface KnowledgeSource {
  id: string;
  title: string;
  source_type: "file_upload" | "url" | "text_paste";
  category: string;
  status: "processing" | "ready" | "error";
  chunk_count?: number;
  created_at: string;
  error_message?: string;
}

const STATUS_BADGE: Record<string, string> = {
  processing: "bg-blue-100 text-blue-800",
  ready: "bg-green-100 text-green-800",
  error: "bg-red-100 text-red-800",
};

const CATEGORIES = [
  { value: "sales_methodology", label: "Sales Methodology" },
  { value: "interview_guide", label: "Interview Guide" },
  { value: "objection_handling", label: "Objection Handling" },
  { value: "role_guide", label: "Role Guide" },
  { value: "company_research", label: "Company Research" },
  { value: "general", label: "General" },
];

type ModalTab = "file_upload" | "url" | "text_paste";

export default function KnowledgeSourcesPage() {
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<ModalTab>("file_upload");
  const [submitting, setSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("general");
  const [urlValue, setUrlValue] = useState("");
  const [textValue, setTextValue] = useState("");
  const [file, setFile] = useState<File | null>(null);

  async function fetchSources() {
    setLoading(true);
    const res = await fetch("/api/admin/knowledge");
    const json = await res.json();
    setSources(json.sources ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchSources(); }, []);

  function resetModal() {
    setTitle("");
    setCategory("general");
    setUrlValue("");
    setTextValue("");
    setFile(null);
    setActiveTab("file_upload");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);

    try {
      let sourceId: string;

      if (activeTab === "file_upload" && file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("title", title);
        formData.append("category", category);
        const uploadRes = await fetch("/api/admin/knowledge/upload", { method: "POST", body: formData });
        const uploadJson = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadJson.error ?? "Upload failed");
        sourceId = uploadJson.source.id;
      } else if (activeTab === "url") {
        const res = await fetch("/api/admin/knowledge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, category, source_type: "url", original_url: urlValue }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to add URL");
        sourceId = json.source.id;
        // Trigger processing
        await processSource(sourceId);
        return;
      } else {
        const res = await fetch("/api/admin/knowledge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, category, source_type: "text_paste", raw_content: textValue }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to add text");
        sourceId = json.source.id;
        // Trigger processing
        await processSource(sourceId);
        return;
      }

      setShowModal(false);
      resetModal();
      await fetchSources();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error adding source");
    } finally {
      setSubmitting(false);
    }
  }

  async function processSource(id: string) {
    setShowModal(false);
    resetModal();
    setSubmitting(false);
    setProcessingId(id);
    await fetchSources();
    try {
      const res = await fetch("/api/admin/knowledge/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Processing failed");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Processing error");
    } finally {
      setProcessingId(null);
      await fetchSources();
    }
  }

  async function deleteSource(id: string) {
    if (!confirm("Delete this knowledge source and all its chunks?")) return;
    await fetch("/api/admin/knowledge", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await fetchSources();
  }

  const tabClass = (t: ModalTab) =>
    `px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
      activeTab === t
        ? "border-indigo-600 text-indigo-600"
        : "border-transparent text-gray-500 hover:text-gray-700"
    }`;

  const TAB_LABELS: Record<ModalTab, string> = {
    file_upload: "File Upload",
    url: "URL",
    text_paste: "Paste Text",
  };

  const SOURCE_ICON = (type: string) => {
    if (type === "file_upload") return <DocumentTextIcon className="w-4 h-4" />;
    if (type === "url") return <LinkIcon className="w-4 h-4" />;
    return <PencilSquareIcon className="w-4 h-4" />;
  };

  const SOURCE_LABEL: Record<string, string> = {
    file_upload: "File",
    url: "URL",
    text_paste: "Text",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Knowledge Sources</h1>
          <p className="text-sm text-gray-500 mt-1">Upload files, URLs, or text that gets embedded for RAG retrieval.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          <PlusIcon className="w-4 h-4" />
          Add Source
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : sources.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
          <DocumentTextIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No knowledge sources yet</p>
          <p className="text-sm text-gray-400 mt-1">Add a file, URL, or text snippet to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Title</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Category</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Chunks</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Added</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sources.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{s.title}</td>
                  <td className="px-4 py-3 text-gray-500">
                    <span className="flex items-center gap-1">
                      {SOURCE_ICON(s.source_type)}
                      {SOURCE_LABEL[s.source_type] ?? s.source_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 capitalize">{s.category.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[s.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {processingId === s.id ? "processing…" : s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{s.chunk_count ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-400">{new Date(s.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      {(s.status === "error" || s.status === "ready") && (
                        <button
                          onClick={() => processSource(s.id)}
                          disabled={processingId === s.id}
                          title={s.status === "error" ? "Retry processing" : "Reprocess"}
                          className="text-gray-400 hover:text-blue-600 disabled:opacity-40"
                        >
                          <ArrowPathIcon className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteSource(s.id)}
                        title="Delete"
                        className="text-gray-400 hover:text-red-600"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Source Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Add Knowledge Source</h2>

            <div className="mb-4 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title*</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Salesforce Pitch Guide Q1"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category*</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-4">
              {(["file_upload", "url", "text_paste"] as ModalTab[]).map((t) => (
                <button key={t} className={tabClass(t)} onClick={() => setActiveTab(t)}>
                  {TAB_LABELS[t]}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit}>
              {activeTab === "file_upload" && (
                <div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.docx,.txt,.md"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700 file:font-medium hover:file:bg-indigo-100"
                  />
                  <p className="text-xs text-gray-400 mt-2">Supports PDF, DOCX, TXT, MD</p>
                </div>
              )}
              {activeTab === "url" && (
                <div>
                  <input
                    type="url"
                    value={urlValue}
                    onChange={(e) => setUrlValue(e.target.value)}
                    placeholder="https://…"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-gray-400 mt-2">The page content will be scraped and embedded.</p>
                </div>
              )}
              {activeTab === "text_paste" && (
                <div>
                  <textarea
                    value={textValue}
                    onChange={(e) => setTextValue(e.target.value)}
                    rows={6}
                    placeholder="Paste your text content here…"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetModal(); }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    submitting || !title.trim() ||
                    (activeTab === "file_upload" && !file) ||
                    (activeTab === "url" && !urlValue.trim()) ||
                    (activeTab === "text_paste" && !textValue.trim())
                  }
                  className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? "Adding…" : "Add & Process"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
