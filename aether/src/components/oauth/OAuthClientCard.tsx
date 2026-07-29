import { useState } from "react";
import { motion } from "framer-motion";
import {
  Edit2,
  Trash2,
  RefreshCw,
  Power,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";
import { GlassCard } from "../ui/GlassCard";
import { Button } from "../ui/Button";
import type { OAuthClientSummary } from "../../services/oauth";

interface OAuthClientCardProps {
  client: OAuthClientSummary;
  onEdit: (client: OAuthClientSummary) => void;
  onToggle: (clientId: string) => void;
  onRotateSecret: (clientId: string) => void;
  onDelete: (clientId: string) => void;
  index: number;
}

const SCOPE_LABELS: Record<string, string> = {
  profile: "Profile",
  projects: "Projects",
  repositories: "Repositories",
  notifications: "Notifications",
  ai_reports: "AI Reports",
  bugs: "Bugs",
  architecture: "Architecture",
  chat: "Chat",
  workflows: "Workflows",
  usage: "Usage",
  security: "Security",
};

export default function OAuthClientCard({
  client,
  onEdit,
  onToggle,
  onRotateSecret,
  onDelete,
  index,
}: OAuthClientCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyClientId = async () => {
    await navigator.clipboard.writeText(client.clientId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * index }}
    >
      <GlassCard className="p-5">
        {/* HEADER */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4 min-w-0 flex-1">
            {client.logo ? (
              <img
                src={client.logo}
                alt={client.name}
                className="h-12 w-12 rounded-lg border border-white/[0.08] object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03]">
                <span className="text-[18px] font-semibold text-[#8B7FE8]">
                  {client.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-[14px] font-semibold text-[#F4F3EF]">
                  {client.name}
                </h3>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    client.isActive
                      ? "bg-[#22A67D]/15 text-[#22A67D]"
                      : "bg-white/[0.08] text-[#94969E]"
                  }`}
                >
                  {client.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              {client.description && (
                <p className="mt-1 text-[12px] text-[#94969E] line-clamp-2">
                  {client.description}
                </p>
              )}

              {client.website && (
                <a
                  href={client.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex items-center gap-1 text-[11px] text-[#8B7FE8] hover:text-[#A69DF0]"
                >
                  <ExternalLink className="h-3 w-3" />
                  {client.website}
                </a>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEdit(client)}
              aria-label="Edit application"
              title="Edit"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onToggle(client.id)}
              aria-label={client.isActive ? "Disable application" : "Enable application"}
              title={client.isActive ? "Disable" : "Enable"}
            >
              <Power className={`h-3.5 w-3.5 ${client.isActive ? "text-[#22A67D]" : ""}`} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onRotateSecret(client.id)}
              aria-label="Rotate client secret"
              title="Rotate secret"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(client.id)}
              aria-label="Delete application"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5 text-red-400" />
            </Button>
          </div>
        </div>

        {/* DETAILS */}
        <div className="mt-4 space-y-3">
          {/* CLIENT ID */}
          <div>
            <p className="mb-1 text-[10px] text-[#55575F]">Client ID</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 font-mono text-[11px] text-[#F4F3EF]">
                {client.clientId}
              </code>
              <button
                type="button"
                onClick={handleCopyClientId}
                className="shrink-0 rounded border border-white/[0.1] p-1.5 text-[#94969E] transition hover:text-[#F4F3EF]"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-[#22A67D]" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* REDIRECT URIS */}
          <div>
            <p className="mb-1 text-[10px] text-[#55575F]">Redirect URIs</p>
            <div className="flex flex-wrap gap-1.5">
              {client.redirectUris.map((uri, idx) => (
                <span
                  key={idx}
                  className="rounded-full border border-white/[0.08] bg-white/[0.02] px-2 py-0.5 text-[10px] text-[#94969E]"
                >
                  {uri}
                </span>
              ))}
            </div>
          </div>

          {/* SCOPES */}
          <div>
            <p className="mb-1 text-[10px] text-[#55575F]">Allowed Scopes</p>
            <div className="flex flex-wrap gap-1.5">
              {client.allowedScopes.map((scope) => (
                <span
                  key={scope}
                  className="rounded-full border border-[#8B7FE8]/20 bg-[#8B7FE8]/10 px-2 py-0.5 text-[10px] text-[#A69DF0]"
                >
                  {SCOPE_LABELS[scope] || scope}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-[#55575F]">
          <span>
            Created: {new Date(client.createdAt).toLocaleDateString()}
          </span>
          <span>
            Updated: {new Date(client.updatedAt).toLocaleDateString()}
          </span>
        </div>
      </GlassCard>
    </motion.div>
  );
}
