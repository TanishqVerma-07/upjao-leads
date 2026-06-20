import { useRef, useState } from "react";
import { apiUpload, downloadFile, apiFetch } from "../api";
import { Paperclip, Download, Trash2, Upload } from "lucide-react";

const KIND_LABEL = { general: "General", grading_report: "Grading Report" };
const KIND_COLORS = {
  general:        { bg: "#F3F4F6", color: "#374151" },
  grading_report: { bg: "#D1FAE5", color: "#065F46" },
};

export default function AttachmentsList({
  attachments = [],       // pre-fetched list
  uploadPath,             // e.g. "/leads/3/attachments"
  defaultKind = "general",
  allowKindSelect = false,
  canUpload = true,
  onUploaded,             // callback(newAttachment)
  onDeleted,              // callback(id)
  currentUserId,
  currentUserRole,
  compact = false,
}) {
  const inputRef   = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");
  const [kind, setKind] = useState(defaultKind);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadErr("");
    setUploading(true);
    try {
      const att = await apiUpload(uploadPath, file, { kind });
      onUploaded?.(att);
    } catch (err) {
      setUploadErr(err.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleDelete(att) {
    if (!confirm(`Delete "${att.file_name}"?`)) return;
    await apiFetch(`/attachments/${att.id}`, { method: "DELETE" });
    onDeleted?.(att.id);
  }

  const canDelete = (att) =>
    att.uploaded_by === currentUserId || currentUserRole === "admin";

  if (attachments.length === 0 && !canUpload) return null;

  return (
    <div style={{ marginTop: compact ? 8 : 12 }}>
      {/* File list */}
      {attachments.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: canUpload ? 8 : 0 }}>
          {attachments.map(att => {
            const kc = KIND_COLORS[att.kind] || KIND_COLORS.general;
            return (
              <div key={att.id} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "5px 8px", background: "#FAFAFA",
                border: "1px solid #F3F4F6", borderRadius: 6,
              }}>
                <Paperclip size={12} color="#9CA3AF" style={{ flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 12, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {att.file_name}
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 10,
                  background: kc.bg, color: kc.color, flexShrink: 0,
                }}>
                  {KIND_LABEL[att.kind] || att.kind}
                </span>
                <span style={{ fontSize: 10, color: "#9CA3AF", flexShrink: 0 }}>{att.uploader_name}</span>
                <button
                  onClick={() => downloadFile(att.id, att.file_name)}
                  title="Download"
                  style={iconBtn}
                >
                  <Download size={12} />
                </button>
                {canDelete(att) && (
                  <button onClick={() => handleDelete(att)} title="Delete" style={{ ...iconBtn, color: "#DC2626" }}>
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Upload row */}
      {canUpload && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {allowKindSelect && (
            <select
              value={kind}
              onChange={e => setKind(e.target.value)}
              style={{
                padding: "3px 8px", fontSize: 12, border: "1px solid #D1FAE5",
                borderRadius: 6, background: "#fff", color: "#134E4A", fontFamily: "inherit",
              }}
            >
              <option value="general">General</option>
              <option value="grading_report">Grading Report</option>
            </select>
          )}
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "4px 10px", fontSize: 12, fontWeight: 600,
              border: "1px solid #D1FAE5", borderRadius: 6,
              background: uploading ? "#F9FAFB" : "#fff",
              color: uploading ? "#9CA3AF" : "#0D9488",
              cursor: uploading ? "not-allowed" : "pointer",
            }}
          >
            <Upload size={11} />
            {uploading ? "Uploading…" : "Attach file"}
          </button>
          <input ref={inputRef} type="file" style={{ display: "none" }} onChange={handleFileChange} />
          {uploadErr && <span style={{ fontSize: 11, color: "#DC2626" }}>{uploadErr}</span>}
        </div>
      )}
    </div>
  );
}

const iconBtn = {
  background: "none", border: "none", cursor: "pointer",
  color: "#6B7280", padding: "2px", display: "flex", alignItems: "center",
  flexShrink: 0,
};
