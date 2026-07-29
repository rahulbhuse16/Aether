import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  Key,
  Plus,
  Search,
  Shield,
  X,
} from "lucide-react";
import { AppShell } from "../components/AppShell";
import { GlassCard } from "../components/ui/GlassCard";
import { PageSection } from "../components/ui/PageSection";
import { Button } from "../components/ui/Button";
import { GoBackButton } from "../components/ui/GoBackButton";
import { Skeleton } from "../components/ui/Skeleton";
import OAuthClientCard from "../components/oauth/OAuthClientCard";
import CreateOAuthClientModal from "../components/oauth/CreateOAuthClientModal";
import { useOAuthClients } from "../hooks/useOAuthClients";
import type { OAuthClientSummary, RegisterClientInput } from "../services/oauth";
import { toast } from "../utils/toast";

function OAuthClientCardSkeleton() {
  return (
    <GlassCard className="p-5">
      <div className="flex items-start gap-4">
        <Skeleton className="h-12 w-12 shrink-0 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-full max-w-sm" />
        </div>
      </div>
      <div className="mt-4 space-y-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-6 w-1/2" />
      </div>
    </GlassCard>
  );
}

type ConfirmAction = {
  type: "delete" | "rotate";
  clientId: string;
  clientName: string;
};

export default function OAuthClients() {
  const {
    clients,
    loading,
    total,
    page,
    limit,
    search,
    fetchClients,
    createClient,
    updateClient,
    toggleClient,
    rotateSecret,
    deleteClient,
    setSearch,
    setPage,
  } = useOAuthClients();

  const [searchInput, setSearchInput] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<OAuthClientSummary | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [secretModal, setSecretModal] = useState<{
    clientSecret: string;
    clientName: string;
  } | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);
  const [secretVisible, setSecretVisible] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput, setSearch, setPage]);

  useEffect(() => {
    if (search !== searchInput && search === "") {
      setSearchInput("");
    }
  }, [search, searchInput]);

  const handleCreate = async (input: RegisterClientInput) => {
    setSubmitting(true);
    try {
      const result = await createClient(input);
      setIsCreateModalOpen(false);
      setSecretModal({
        clientSecret: result.clientSecret,
        clientName: result.name,
      });
      setSecretVisible(false);
      toast.success("OAuth application created successfully");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create application";
      toast.error(message);
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (input: RegisterClientInput) => {
    if (!editingClient) return;

    setSubmitting(true);
    try {
      await updateClient(editingClient.id, input);
      setEditingClient(null);
      toast.success("Application updated successfully");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update application";
      toast.error(message);
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = useCallback(
    async (clientId: string) => {
      try {
        const result = await toggleClient(clientId);
        toast.success(
          result.isActive ? "Application enabled" : "Application disabled"
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to toggle application";
        toast.error(message);
      }
    },
    [toggleClient]
  );

  const handleConfirmAction = async () => {
    if (!confirmAction) return;

    setConfirmLoading(true);
    try {
      if (confirmAction.type === "delete") {
        await deleteClient(confirmAction.clientId);
        toast.success("Application deleted");
      } else {
        const result = await rotateSecret(confirmAction.clientId);
        setSecretModal({
          clientSecret: result.clientSecret,
          clientName: confirmAction.clientName,
        });
        setSecretVisible(false);
        toast.success("Client secret rotated");
      }
      setConfirmAction(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Action failed";
      toast.error(message);
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleCopySecret = async () => {
    if (!secretModal?.clientSecret) return;

    await navigator.clipboard.writeText(secretModal.clientSecret);
    setSecretCopied(true);
    setTimeout(() => setSecretCopied(false), 2000);
  };

  const maskedSecret = secretModal
    ? "•".repeat(Math.min(secretModal.clientSecret.length, 32))
    : "";

  return (
    <AppShell title="OAuth Applications">
      <div className="mx-auto max-w-4xl space-y-8">
        <GoBackButton to="/settings/security" className="mb-2" />

        <PageSection
          label="Developer"
          title="OAuth Applications"
          description="Manage applications that can connect with Aether OAuth."
        >
          <GlassCard>
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#55575F]" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search applications..."
                  className="w-full rounded-lg border border-white/[0.1] bg-white/[0.02] py-2.5 pl-10 pr-4 text-[13px] text-[#F4F3EF] outline-none placeholder:text-[#55575F] focus:border-[#8B7FE8]/50"
                />
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsCreateModalOpen(true)}
                className="shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                Create Client
              </Button>
            </div>

            {loading && clients.length === 0 ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <OAuthClientCardSkeleton key={i} />
                ))}
              </div>
            ) : clients.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/[0.1] py-16 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03]">
                  <Shield className="h-6 w-6 text-[#55575F]" />
                </div>

                <p className="text-[14px] font-medium text-[#F4F3EF]">
                  {search ? "No applications found" : "No OAuth applications yet"}
                </p>

                <p className="mx-auto mt-1 max-w-sm text-[12px] text-[#55575F]">
                  {search
                    ? "Try a different search term or clear the filter."
                    : "Create your first OAuth application to let external apps connect with Aether."}
                </p>

                {!search && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="mt-5"
                    onClick={() => setIsCreateModalOpen(true)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Create Client
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {clients.map((client, index) => (
                    <OAuthClientCard
                      key={client.id}
                      client={client}
                      index={index}
                      onEdit={setEditingClient}
                      onToggle={handleToggle}
                      onRotateSecret={(clientId) => {
                        const target = clients.find((c) => c.id === clientId);
                        if (target) {
                          setConfirmAction({
                            type: "rotate",
                            clientId,
                            clientName: target.name,
                          });
                        }
                      }}
                      onDelete={(clientId) => {
                        const target = clients.find((c) => c.id === clientId);
                        if (target) {
                          setConfirmAction({
                            type: "delete",
                            clientId,
                            clientName: target.name,
                          });
                        }
                      }}
                    />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-between border-t border-white/[0.06] pt-4">
                    <p className="text-[11px] text-[#55575F]">
                      Showing {(page - 1) * limit + 1}–
                      {Math.min(page * limit, total)} of {total}
                    </p>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={page <= 1 || loading}
                        onClick={() => setPage(page - 1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>

                      <span className="min-w-[4rem] text-center text-[12px] text-[#94969E]">
                        {page} / {totalPages}
                      </span>

                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={page >= totalPages || loading}
                        onClick={() => setPage(page + 1)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </GlassCard>
        </PageSection>
      </div>

      <CreateOAuthClientModal
        isOpen={isCreateModalOpen}
        mode="create"
        submitting={submitting}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreate}
      />

      <CreateOAuthClientModal
        isOpen={Boolean(editingClient)}
        mode="edit"
        client={editingClient}
        submitting={submitting}
        onClose={() => setEditingClient(null)}
        onSubmit={handleEdit}
      />

      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md"
          >
            <GlassCard className="p-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>

              <h3 className="text-[16px] font-semibold text-[#F4F3EF]">
                {confirmAction.type === "delete"
                  ? "Delete application?"
                  : "Rotate client secret?"}
              </h3>

              <p className="mt-2 text-[13px] text-[#94969E]">
                {confirmAction.type === "delete" ? (
                  <>
                    <span className="font-medium text-[#F4F3EF]">
                      {confirmAction.clientName}
                    </span>{" "}
                    will be permanently deleted. All active tokens for this
                    application will stop working.
                  </>
                ) : (
                  <>
                    Rotating the secret for{" "}
                    <span className="font-medium text-[#F4F3EF]">
                      {confirmAction.clientName}
                    </span>{" "}
                    will invalidate the current secret immediately. Update your
                    application configuration before continuing.
                  </>
                )}
              </p>

              <div className="mt-5 flex gap-3">
                <Button
                  className="flex-1"
                  variant="ghost"
                  onClick={() => setConfirmAction(null)}
                  disabled={confirmLoading}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                  onClick={handleConfirmAction}
                  disabled={confirmLoading}
                >
                  {confirmLoading
                    ? "Processing..."
                    : confirmAction.type === "delete"
                      ? "Delete"
                      : "Rotate Secret"}
                </Button>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      )}

      {secretModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg"
          >
            <GlassCard className="p-6">
              <div className="relative mb-5">
                <button
                  type="button"
                  onClick={() => {
                    setSecretModal(null);
                    setSecretVisible(false);
                  }}
                  className="absolute right-0 top-0 text-[#55575F] transition hover:text-[#F4F3EF]"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[#22A67D]/10">
                  <Key className="h-5 w-5 text-[#22A67D]" />
                </div>

                <h3 className="text-[16px] font-semibold text-[#F4F3EF]">
                  Client Secret
                </h3>

                <p className="mt-1 text-[12px] text-[#94969E]">
                  Secret for{" "}
                  <span className="font-medium text-[#F4F3EF]">
                    {secretModal.clientName}
                  </span>
                </p>
              </div>

              <div className="rounded-lg border border-[#F0A35E]/20 bg-[#F0A35E]/5 p-3">
                <p className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-[#F0A35E]">
                  <AlertTriangle className="h-3 w-3" />
                  Save this secret now. It will not be shown again.
                </p>

                <div className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 break-all font-mono text-[12px] text-[#F4F3EF]">
                    {secretVisible ? secretModal.clientSecret : maskedSecret}
                  </code>

                  <button
                    type="button"
                    onClick={() => setSecretVisible((v) => !v)}
                    className="shrink-0 rounded-md border border-white/[0.1] p-2 text-[#94969E] transition hover:text-[#F4F3EF]"
                    aria-label={secretVisible ? "Hide secret" : "Show secret"}
                  >
                    {secretVisible ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleCopySecret}
                    className="shrink-0 rounded-md border border-white/[0.1] p-2 text-[#94969E] transition hover:text-[#F4F3EF]"
                    aria-label="Copy secret"
                  >
                    {secretCopied ? (
                      <Check className="h-4 w-4 text-[#22A67D]" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                variant="primary"
                className="mt-5 w-full"
                onClick={() => {
                  setSecretModal(null);
                  setSecretVisible(false);
                }}
              >
                I've saved the secret
              </Button>
            </GlassCard>
          </motion.div>
        </div>
      )}
    </AppShell>
  );
}
