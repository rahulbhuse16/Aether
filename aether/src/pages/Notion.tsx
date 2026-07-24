import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link2, Unlink, RefreshCcw, Search, Plus, ExternalLink, FileText } from "lucide-react";
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
import { notionService } from "../services/notion";

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

  useEffect(() => {
    dispatch(getNotionStatus());
  }, [dispatch]);

  useEffect(() => {
    if (connected) dispatch(getNotionPages({ page: 1, limit: 25 }));
  }, [dispatch, connected]);

  useEffect(() => {
    if (!connected) return;
    const timeout = setTimeout(() => {
      if (query.trim()) {
        dispatch(searchNotion(query.trim()));
      } else {
        dispatch(getNotionPages({ page: 1, limit: 25 }));
      }
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, connected]);

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
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => dispatch(syncNotion())}
                    disabled={syncing}
                  >
                    <RefreshCcw className="h-3.5 w-3.5" />
                    {syncing ? "Syncing..." : "Sync Now"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => dispatch(disconnectNotion())}
                  >
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
        </PageSection>

        {connected && (
          <PageSection label="Knowledge" title={`Synced pages (${total})`} delay={0.05}>
            <div className="mb-3 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#55575F]" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search your Notion pages..."
                  className="w-full rounded-full border border-white/[0.08] bg-white/[0.03] py-2 pl-9 pr-4 text-[13px] text-[#F4F3EF] placeholder:text-[#55575F] focus:border-[#8B7FE8]/40 focus:outline-none"
                />
              </div>
              <Button size="sm" onClick={() => setModalOpen(true)}>
                <Plus className="h-3.5 w-3.5" />
                New Page
              </Button>
            </div>

            <div className="space-y-2">
              {pages.map((page, i) => (
                <motion.div
                  key={page.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.03 * i }}
                >
                  <GlassCard className="flex items-center justify-between py-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-[15px]">
                        {page.icon ?? <FileText className="h-4 w-4 text-[#94969E]" />}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-medium text-[#F4F3EF]">
                          {page.title}
                        </p>
                        <p className="text-[11px] text-[#55575F]">
                          Updated {timeAgo(page.lastEditedTime)}
                        </p>
                      </div>
                    </div>
                    <a href={page.url} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="ghost">
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open in Notion
                      </Button>
                    </a>
                  </GlassCard>
                </motion.div>
              ))}

              {!loading && pages.length === 0 && (
                <GlassCard className="py-10 text-center">
                  <FileText className="mx-auto mb-3 h-6 w-6 text-[#94969E]" />
                  <p className="text-[14px] text-[#F4F3EF]">
                    {query ? "No pages match your search" : "No pages synced yet"}
                  </p>
                  <p className="mt-1 text-[12.5px] text-[#94969E]">
                    {query ? "Try a different search term." : 'Click "Sync Now" to pull in your Notion pages.'}
                  </p>
                </GlassCard>
              )}
            </div>
          </PageSection>
        )}
      </div>

      <CreateNotionPageModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </AppShell>
  );
}