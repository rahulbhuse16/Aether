import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "../ui/Button";
import { useAppDispatch } from "../../store/hooks";
import { createNotionPage } from "../../store/slices/notionSlice";

interface CreateNotionPageModalProps {
  open: boolean;
  onClose: () => void;
  /** Pre-fill when opened from an AI feature (meeting summary, ADR, bug report). */
  initialTitle?: string;
  initialContent?: string;
  /** Required until a default parent page is configured server-side. */
  parentPageId?: string;
}

export function CreateNotionPageModal({
  open,
  onClose,
  initialTitle = "",
  initialContent = "",
  parentPageId,
}: CreateNotionPageModalProps) {
  const dispatch = useAppDispatch();
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleCreate = async () => {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!parentPageId) {
      setError("No parent page configured — pick one in Notion settings first.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await dispatch(
        createNotionPage({ title: title.trim(), content: content.trim(), parentPageId })
      ).unwrap();
      setTitle("");
      setContent("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create page.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#111214] p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[15px] font-medium text-[#F4F3EF]">New Notion page</p>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-[#94969E] hover:bg-white/[0.06] hover:text-[#F4F3EF]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[12px] text-[#94969E]">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. ADR: Redis to Kafka Migration"
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[13.5px] text-[#F4F3EF] placeholder:text-[#55575F] focus:border-[#8B7FE8]/40 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-[12px] text-[#94969E]">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              placeholder="Write or paste the page content..."
              className="w-full resize-none rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[13.5px] text-[#F4F3EF] placeholder:text-[#55575F] focus:border-[#8B7FE8]/40 focus:outline-none"
            />
          </div>

          {error && <p className="text-[12.5px] text-[#E8877F]">{error}</p>}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleCreate} disabled={submitting}>
            {submitting ? "Creating..." : "Create in Notion"}
          </Button>
        </div>
      </div>
    </div>
  );
}