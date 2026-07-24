import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, CheckCircle2, Loader2, ClipboardList } from "lucide-react";
import { Button } from "../ui/Button";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  analyzeMeetingNotes,
  confirmMeetingActionItems,
  updateMeetingActionItem,
  removeMeetingActionItem,
  clearMeetingNotesState,
} from "../../store/slices/notionSlice";
import type { ActionItem } from "../../services/notion";

interface MeetingNotesActionItemsProps {
  open: boolean;
  onClose: () => void;
  notionPageId: string | null;
  pageTitle: string;
}

const PRIORITY_OPTIONS: ActionItem["priority"][] = ["low", "medium", "high"];

export function MeetingNotesActionItems({
  open,
  onClose,
  notionPageId,
  pageTitle,
}: MeetingNotesActionItemsProps) {
  const dispatch = useAppDispatch();
  const { items, analyzing, confirming, confirmedCount, error, sourcePageId, sourcePageTitle } =
    useAppSelector((s) => s.notion.meetingNotes);

  const [excludedIndexes, setExcludedIndexes] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (open && notionPageId) {
      setExcludedIndexes(new Set());
      dispatch(analyzeMeetingNotes(notionPageId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, notionPageId]);

  const handleClose = () => {
    dispatch(clearMeetingNotesState());
    onClose();
  };

  const toggleExclude = (i: number) => {
    setExcludedIndexes((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const handleConfirm = () => {
    const included = items.filter((_, i) => !excludedIndexes.has(i));
    if (included.length === 0 || !sourcePageId) return;

    dispatch(
      confirmMeetingActionItems({
        sourcePageId,
        sourcePageTitle: sourcePageTitle ?? pageTitle,
        items: included,
      })
    );
  };

  if (!open) return null;

  const includedCount = items.length - excludedIndexes.size;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-white/[0.08] bg-[#111214] shadow-xl">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-[#8B7FE8]" />
            <p className="text-[15px] font-medium text-[#F4F3EF]">Action items</p>
          </div>
          <button
            onClick={handleClose}
            className="rounded-full p-1 text-[#94969E] hover:bg-white/[0.06] hover:text-[#F4F3EF]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="mb-4 text-[12.5px] text-[#94969E]">
            Extracted from <span className="text-[#F4F3EF]">{sourcePageTitle ?? pageTitle}</span>.
            Review, edit, or remove items before creating tasks — nothing is created yet.
          </p>

          {analyzing && (
            <div className="flex flex-col items-center gap-2 py-10 text-[#94969E]">
              <Loader2 className="h-5 w-5 animate-spin" />
              <p className="text-[13px]">Reading the notes and pulling out action items...</p>
            </div>
          )}

          {!analyzing && error && (
            <p className="rounded-lg bg-[#E8877F]/10 px-3 py-2 text-[12.5px] text-[#E8877F]">
              {error}
            </p>
          )}

          {!analyzing && !error && items.length === 0 && confirmedCount === null && (
            <p className="py-8 text-center text-[13px] text-[#94969E]">
              No action items found in these notes.
            </p>
          )}

          {!analyzing && confirmedCount !== null && (
            <div className="flex flex-col items-center gap-2 py-8 text-[#22A67D]">
              <CheckCircle2 className="h-6 w-6" />
              <p className="text-[13.5px]">
                Created {confirmedCount} task{confirmedCount === 1 ? "" : "s"} in Aether.
              </p>
            </div>
          )}

          {!analyzing && items.length > 0 && confirmedCount === null && (
            <div className="space-y-3">
              <AnimatePresence>
                {items.map((item, i) => {
                  const excluded = excludedIndexes.has(i);
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: excluded ? 0.4 : 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3"
                    >
                      <div className="mb-2 flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={!excluded}
                          onChange={() => toggleExclude(i)}
                          className="mt-1 h-3.5 w-3.5 accent-[#8B7FE8]"
                        />
                        <input
                          value={item.title}
                          onChange={(e) =>
                            dispatch(
                              updateMeetingActionItem({
                                index: i,
                                item: { ...item, title: e.target.value },
                              })
                            )
                          }
                          className="flex-1 bg-transparent text-[13.5px] font-medium text-[#F4F3EF] focus:outline-none"
                        />
                        <button
                          onClick={() => dispatch(removeMeetingActionItem(i))}
                          className="text-[#55575F] hover:text-[#E8877F]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {item.description && (
                        <p className="mb-2 pl-5 text-[12px] text-[#94969E]">{item.description}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 pl-5">
                        <select
                          value={item.priority ?? "medium"}
                          onChange={(e) =>
                            dispatch(
                              updateMeetingActionItem({
                                index: i,
                                item: { ...item, priority: e.target.value as ActionItem["priority"] },
                              })
                            )
                          }
                          className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[11px] text-[#F4F3EF]"
                        >
                          {PRIORITY_OPTIONS.map((p) => (
                            <option key={p} value={p ?? "medium"} className="bg-[#111214]">
                              {p}
                            </option>
                          ))}
                        </select>

                        <input
                          value={item.assignee ?? ""}
                          onChange={(e) =>
                            dispatch(
                              updateMeetingActionItem({
                                index: i,
                                item: { ...item, assignee: e.target.value || null },
                              })
                            )
                          }
                          placeholder="Assignee"
                          className="w-28 rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[11px] text-[#F4F3EF] placeholder:text-[#55575F] focus:outline-none"
                        />

                        <input
                          type="date"
                          value={item.dueDate ?? ""}
                          onChange={(e) =>
                            dispatch(
                              updateMeetingActionItem({
                                index: i,
                                item: { ...item, dueDate: e.target.value || null },
                              })
                            )
                          }
                          className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[11px] text-[#F4F3EF] focus:outline-none"
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {!analyzing && items.length > 0 && confirmedCount === null && (
          <div className="flex items-center justify-between border-t border-white/[0.06] px-5 py-4">
            <p className="text-[12px] text-[#55575F]">
              {includedCount} of {items.length} selected
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleConfirm} disabled={includedCount === 0 || confirming}>
                {confirming ? "Creating..." : `Create ${includedCount} task${includedCount === 1 ? "" : "s"}`}
              </Button>
            </div>
          </div>
        )}

        {confirmedCount !== null && (
          <div className="flex justify-end border-t border-white/[0.06] px-5 py-4">
            <Button size="sm" onClick={handleClose}>
              Done
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}