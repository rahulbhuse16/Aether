import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Link2,
  Unlink,
  RefreshCcw,
  Search,
  Plus,
  ExternalLink,
  FileText,
  Pin,
  PinOff,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  List,
  LayoutGrid,
  ArrowUpDown,
  Clock,
  X,
} from "lucide-react";
import { SiNotion } from "react-icons/si";
import { AppShell } from "../components/AppShell";
import { GlassCard } from "../components/ui/GlassCard";
import { PageSection } from "../components/ui/PageSection";
import { Button } from "../components/ui/Button";
import { CreateNotionPageModal } from "../components/notion/CreateNotionPageModal";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  getNotionStatus,
  syncNotion,
  getNotionPages,
  searchNotion,
  disconnectNotion,
} from "../store/slices/notionSlice";
import { notionService,type NotionPage } from "../services/notion";

type ViewMode = "list" | "grid";
type SortMode = "recent" | "alpha";
type FilterTab = "all" | "pinned" | "recent";

const PINNED_KEY = "aether:notion:pinned";
const RECENTS_KEY = "aether:notion:recents";
const PAGE_SIZE_OPTIONS = [10, 25, 50];

function readIds(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString();
}

export default function Notion() {
  const dispatch = useAppDispatch();
  const { connected, workspaceId, workspaceName, lastSyncAt, pages, total, syncing, loading } =
    useAppSelector((s) => s.notion);

  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [syncBanner, setSyncBanner] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [pinnedIds, setPinnedIds] = useState<string[]>(() => readIds(PINNED_KEY));
  const [recentIds, setRecentIds] = useState<string[]>(() => readIds(RECENTS_KEY));

  const searchInputRef = useRef<HTMLInputElement>(null);
  const isSearching = query.trim().length > 0;

  useEffect(() => {
    dispatch(getNotionStatus());
  }, [dispatch]);

  // Load a larger batch when viewing Pinned/Recent so those items are more
  // likely to actually be present client-side (there's no "fetch by ids"
  // endpoint to pull them precisely).
  useEffect(() => {
    if (!connected || isSearching) return;
    const effectiveLimit = filterTab === "all" ? limit : 100;
    const effectivePage = filterTab === "all" ? page : 1;
    dispatch(getNotionPages({ page: effectivePage, limit: effectiveLimit }));
  }, [dispatch, connected, filterTab, page, limit, isSearching]);

  // Debounced search
  useEffect(() => {
    if (!connected) return;
    const t = setTimeout(() => {
      if (isSearching) {
        dispatch(searchNotion(query.trim()));
      } else {
        dispatch(getNotionPages({ page, limit }));
      }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, connected]);

  // "/" focuses search, unless already typing somewhere
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === "INPUT" || target.tagName === "TEXTAREA";
      if (e.key === "/" && !isTyping) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const persistPinned = (next: string[]) => {
    setPinnedIds(next);
    localStorage.setItem(PINNED_KEY, JSON.stringify(next));
  };

  const persistRecents = (next: string[]) => {
    setRecentIds(next);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  };

  const togglePin = (id: string) => {
    persistPinned(
      pinnedIds.includes(id) ? pinnedIds.filter((x) => x !== id) : [id, ...pinnedIds]
    );
  };

  const recordView = (id: string) => {
    persistRecents([id, ...recentIds.filter((x) => x !== id)].slice(0, 10));
  };

  const handleCopyLink = async (page: NotionPage) => {
    try {
      await navigator.clipboard.writeText(page.url);
      setCopiedId(page.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // Clipboard API can fail on non-HTTPS/local contexts — fail silently,
      // the "Open in Notion" link still works as a fallback.
    }
  };

  const handleSync = async () => {
    try {
      const action = await dispatch(syncNotion()).unwrap();
      setSyncBanner(
        `Synced ${action.result.syncedCount} page${action.result.syncedCount === 1 ? "" : "s"}.`
      );
      setTimeout(() => setSyncBanner(null), 4000);
    } catch {
      setSyncBanner("Sync failed — try again in a moment.");
      setTimeout(() => setSyncBanner(null), 4000);
    }
  };

  const visiblePages = useMemo(() => {
    let list = pages;

    if (filterTab === "pinned") {
      list = list.filter((p) => pinnedIds.includes(p.id));
    } else if (filterTab === "recent") {
      const inRecents = list.filter((p) => recentIds.includes(p.id));
      list = inRecents.sort(
        (a, b) => recentIds.indexOf(a.id) - recentIds.indexOf(b.id)
      );
      return list; // already ordered by view recency, skip sortMode
    }

    if (sortMode === "alpha") {
      list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    } else {
      list = [...list].sort(
        (a, b) => new Date(b.lastEditedTime).getTime() - new Date(a.lastEditedTime).getTime()
      );
    }

    return list;
  }, [pages, filterTab, pinnedIds, recentIds, sortMode]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <AppShell title="Notion">
      <div className="mx-auto max-w-3xl space-y-8">
        <PageSection label="Notion" title="Workspace connection">
          <GlassCard>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#8B7FE8] to-[#22A67D] text-[#0A0B0D]">
                <SiNotion className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-[15px] font-medium text-[#F4F3EF]">
                  {connected ? workspaceName ?? "Notion Workspace" : "Not connected"}
                </p>
                <p className="text-[13px] text-[#94969E]">
                  {connected
                    ? `Workspace ID: ${workspaceId ?? "—"} · Last synced: ${timeAgo(lastSyncAt)}`
                    : "Connect your workspace to give Aether access to your team's knowledge."}
                </p>
              </div>
              {connected ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={handleSync} disabled={syncing}>
                    <RefreshCcw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
                    {syncing ? "Syncing..." : "Sync Now"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => dispatch(disconnectNotion())}>
                    <Unlink className="h-3.5 w-3.5" />
                    Disconnect
                  </Button>
                </div>
              ) : (
                <Button size="sm" onClick={() => notionService.connect()}>
                  <Link2 className="h-3.5 w-3.5" />
                  Connect Notion
                </Button>
              )}
            </div>
          </GlassCard>

          <AnimatePresence>
            {syncBanner && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 overflow-hidden"
              >
                <div className="rounded-lg bg-[#22A67D]/10 px-3 py-2 text-[12.5px] text-[#22A67D]">
                  {syncBanner}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </PageSection>

        {connected && (
          <PageSection label="Knowledge" title={`Synced pages (${total})`} delay={0.05}>
            {/* Filter tabs */}
            <div className="mb-3 flex items-center justify-between">
              <div className="flex gap-1 rounded-full bg-white/[0.03] p-1">
                {(
                  [
                    { key: "all", label: "All" },
                    { key: "pinned", label: `Pinned${pinnedIds.length ? ` (${pinnedIds.length})` : ""}` },
                    { key: "recent", label: "Recently viewed" },
                  ] as { key: FilterTab; label: string }[]
                ).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setFilterTab(tab.key)}
                    className={`rounded-full px-3 py-1.5 text-[12.5px] transition-colors ${
                      filterTab === tab.key
                        ? "bg-white/[0.08] text-[#F4F3EF]"
                        : "text-[#94969E] hover:text-[#F4F3EF]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSortMode(sortMode === "recent" ? "alpha" : "recent")}
                  className="flex items-center gap-1 rounded-full p-1.5 text-[#94969E] hover:bg-white/[0.04] hover:text-[#F4F3EF]"
                  title={sortMode === "recent" ? "Sort: recently updated" : "Sort: A–Z"}
                >
                  <ArrowUpDown className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`rounded-full p-1.5 ${viewMode === "list" ? "bg-white/[0.08] text-[#F4F3EF]" : "text-[#94969E] hover:text-[#F4F3EF]"}`}
                >
                  <List className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  className={`rounded-full p-1.5 ${viewMode === "grid" ? "bg-white/[0.08] text-[#F4F3EF]" : "text-[#94969E] hover:text-[#F4F3EF]"}`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Search + create */}
            <div className="mb-4 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#55575F]" />
                <input
                  ref={searchInputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search your Notion pages... (press / to focus)"
                  className="w-full rounded-full border border-white/[0.08] bg-white/[0.03] py-2 pl-9 pr-8 text-[13px] text-[#F4F3EF] placeholder:text-[#55575F] focus:border-[#8B7FE8]/40 focus:outline-none"
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#55575F] hover:text-[#F4F3EF]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <Button size="sm" onClick={() => setModalOpen(true)}>
                <Plus className="h-3.5 w-3.5" />
                New Page
              </Button>
            </div>

            {/* Page list/grid */}
            {loading && visiblePages.length === 0 ? (
              <div className={viewMode === "grid" ? "grid grid-cols-2 gap-2 sm:grid-cols-3" : "space-y-2"}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-[68px] animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.02]"
                  />
                ))}
              </div>
            ) : (
              <div className={viewMode === "grid" ? "grid grid-cols-2 gap-2 sm:grid-cols-3" : "space-y-2"}>
                {visiblePages.map((p, i) => {
                  const isPinned = pinnedIds.includes(p.id);

                  if (viewMode === "grid") {
                    return (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.02 * i }}
                      >
                        <GlassCard className="relative h-full py-4">
                          <button
                            onClick={() => togglePin(p.id)}
                            className={`absolute right-2 top-2 rounded-full p-1 ${isPinned ? "text-[#8B7FE8]" : "text-[#55575F] hover:text-[#F4F3EF]"}`}
                          >
                            {isPinned ? <Pin className="h-3.5 w-3.5 fill-current" /> : <Pin className="h-3.5 w-3.5" />}
                          </button>
                          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-[15px]">
                            {p.icon ?? <FileText className="h-4 w-4 text-[#94969E]" />}
                          </div>
                          <p className="mb-1 line-clamp-2 text-[13.5px] font-medium text-[#F4F3EF]">
                            {p.title}
                          </p>
                          <p className="mb-3 text-[11px] text-[#55575F]">
                            Updated {timeAgo(p.lastEditedTime)}
                          </p>
                          <a
                            href={p.url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={() => recordView(p.id)}
                            className="flex items-center gap-1 text-[11.5px] text-[#94969E] hover:text-[#F4F3EF]"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Open
                          </a>
                        </GlassCard>
                      </motion.div>
                    );
                  }

                  return (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.02 * i }}
                    >
                      <GlassCard className="flex items-center justify-between py-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-[15px]">
                            {p.icon ?? <FileText className="h-4 w-4 text-[#94969E]" />}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[14px] font-medium text-[#F4F3EF]">
                              {p.title}
                            </p>
                            <p className="text-[11px] text-[#55575F]">
                              Updated {timeAgo(p.lastEditedTime)}
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            onClick={() => togglePin(p.id)}
                            className={`rounded-full p-1.5 ${isPinned ? "text-[#8B7FE8]" : "text-[#55575F] hover:text-[#F4F3EF]"}`}
                            title={isPinned ? "Unpin" : "Pin"}
                          >
                            {isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            onClick={() => handleCopyLink(p)}
                            className="rounded-full p-1.5 text-[#55575F] hover:text-[#F4F3EF]"
                            title="Copy link"
                          >
                            {copiedId === p.id ? (
                              <Check className="h-3.5 w-3.5 text-[#22A67D]" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <a href={p.url} target="_blank" rel="noreferrer" onClick={() => recordView(p.id)}>
                            <Button size="sm" variant="ghost">
                              <ExternalLink className="h-3.5 w-3.5" />
                              Open
                            </Button>
                          </a>
                        </div>
                      </GlassCard>
                    </motion.div>
                  );
                })}

                {!loading && visiblePages.length === 0 && (
                  <GlassCard className="col-span-full py-10 text-center">
                    <FileText className="mx-auto mb-3 h-6 w-6 text-[#94969E]" />
                    <p className="text-[14px] text-[#F4F3EF]">
                      {isSearching
                        ? "No pages match your search"
                        : filterTab === "pinned"
                        ? "Nothing pinned yet"
                        : filterTab === "recent"
                        ? "No recently viewed pages"
                        : "No pages synced yet"}
                    </p>
                    <p className="mt-1 text-[12.5px] text-[#94969E]">
                      {isSearching
                        ? "Try a different search term."
                        : filterTab === "pinned"
                        ? "Click the pin icon on a page to keep it here."
                        : filterTab === "recent"
                        ? "Pages you open from here will show up in this tab."
                        : 'Click "Sync Now" to pull in your Notion pages.'}
                    </p>
                  </GlassCard>
                )}
              </div>
            )}

            {/* Pagination — only meaningful for the unfiltered, non-search view */}
            {filterTab === "all" && !isSearching && total > limit && (
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[12px] text-[#55575F]">
                  <span>Rows:</span>
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <button
                      key={n}
                      onClick={() => {
                        setLimit(n);
                        setPage(1);
                      }}
                      className={`rounded px-1.5 py-0.5 ${limit === n ? "bg-white/[0.08] text-[#F4F3EF]" : "hover:text-[#F4F3EF]"}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="rounded-full p-1.5 text-[#94969E] hover:bg-white/[0.04] hover:text-[#F4F3EF] disabled:opacity-30"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-[12px] text-[#94969E]">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="rounded-full p-1.5 text-[#94969E] hover:bg-white/[0.04] hover:text-[#F4F3EF] disabled:opacity-30"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </PageSection>
        )}
      </div>

      <CreateNotionPageModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </AppShell>
  );
}