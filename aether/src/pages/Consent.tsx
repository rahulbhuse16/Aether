import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  User,
  FolderKanban,
  GitBranch,
  Bell,
  Sparkles,
  Bug,
  Boxes,
  MessageSquare,
  Workflow,
  BarChart3,
  Shield,
  Loader2,
  AlertTriangle,
  ExternalLink,
  Lock,
  CheckCircle2,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { GlassCard } from "../components/ui/GlassCard";
import  {type ConsentDetails,oauthService } from "../services/oauth";


const SCOPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  profile: User,
  projects: FolderKanban,
  repositories: GitBranch,
  notifications: Bell,
  ai_reports: Sparkles,
  bugs: Bug,
  architecture: Boxes,
  chat: MessageSquare,
  workflows: Workflow,
  usage: BarChart3,
  security: Shield,
};

export default function Consent() {
  const { requestId = "" } = useParams<{ requestId: string }>();

  const [details, setDetails] = useState<ConsentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<"authorize" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await oauthService.getConsent(requestId);
        if (!cancelled) setDetails(data);
      } catch (err:any) {
        if (!cancelled) {
          setError(
             err.response?.data?.message
              ?? "This authorization request is invalid or has expired."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [requestId]);

  const respond = async (approve: boolean) => {
    setSubmitting(approve ? "authorize" : "cancel");
    try {
      const { redirectUrl } = await oauthService.submitConsent(requestId, approve);
      window.location.href = redirectUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      setSubmitting(null);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0B0D] p-4 relative overflow-hidden">
      {/* Background gradient effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#8B7FE8]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#22A67D]/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-2xl relative z-10"
      >
        <GlassCard className="p-8 border border-white/[0.08] shadow-2xl">
          {loading && (
            <div className="flex flex-col items-center gap-4 py-12 text-[#94969E]">
              <div className="relative">
                <Loader2 className="h-8 w-8 animate-spin text-[#8B7FE8]" />
                <div className="absolute inset-0 h-8 w-8 animate-ping rounded-full bg-[#8B7FE8]/20" />
              </div>
              <p className="text-[14px] font-medium">Loading authorization request...</p>
            </div>
          )}

          {!loading && error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-4 py-12 text-center"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#E8877F]/10 border border-[#E8877F]/20">
                <AlertTriangle className="h-8 w-8 text-[#E8877F]" />
              </div>
              <div>
                <p className="text-[16px] font-semibold text-[#F4F3EF]">Couldn't load this request</p>
                <p className="mt-2 text-[13px] text-[#94969E]">{error}</p>
              </div>
            </motion.div>
          )}

          {!loading && !error && details && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {/* Client Header */}
              <div className="mb-8 flex flex-col items-center text-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="relative mb-4"
                >
                  {details.client.logo ? (
                    <img
                      src={details.client.logo}
                      alt={details.client.name}
                      className="h-20 w-20 rounded-2xl border-2 border-white/[0.1] object-cover shadow-lg"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8B7FE8] via-[#A69DF0] to-[#22A67D] text-[28px] font-bold text-white shadow-lg border border-white/[0.1]">
                      {details.client.name[0]}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#22A67D] border-2 border-[#0A0B0D]">
                    <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                  </div>
                </motion.div>

                <h1 className="text-[20px] font-bold text-[#F4F3EF]">{details.client.name}</h1>
                <p className="mt-2 text-[14px] text-[#dedede]">
                  wants to access your Aether account
                </p>
                {details.client.website && (
                  <a
                    href={details.client.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 flex items-center gap-1 text-[12px] text-[#8B7FE8] hover:text-[#A69DF0] transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {details.client.website}
                  </a>
                )}
                {details.client.description && (
                  <p className="mt-3 text-[13px] text-[#fff] leading-relaxed max-w-sm">
                    {details.client.description}
                  </p>
                )}
              </div>

              {/* Scopes Section */}
              <div className="mb-6">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#8B7FE8]/10 border border-[#8B7FE8]/20">
                    <Lock className="h-4 w-4 text-[#8B7FE8]" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-[#F4F3EF]">
                      Permissions requested
                    </p>
                    <p className="text-[11px] text-[#55575F]">
                      {details.scopes.length} permission{details.scopes.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {details.scopes.map(({ scope, label }, index) => {
                    const Icon = SCOPE_ICONS[scope] ?? ShieldCheck;
                    return (
                      <motion.div
                        key={scope}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + (index * 0.05) }}
                        className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 hover:bg-white/[0.04] transition-colors"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#8B7FE8]/10 border border-[#8B7FE8]/20">
                          <Icon className="h-4.5 w-4.5 text-[#A69DF0]" />
                        </div>
                        <p className="flex-1 text-[13px] text-[#DADBE1]">{label}</p>
                        <CheckCircle2 className="h-4 w-4 text-[#22A67D]" />
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Security Notice */}
              <div className="mb-8 rounded-xl border border-[#22A67D]/20 bg-[#22A67D]/5 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#22A67D]/10">
                    <ShieldCheck className="h-4 w-4 text-[#22A67D]" />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-[#22A67D] mb-1">
                      Secure connection
                    </p>
                    <p className="text-[11px] leading-relaxed text-[#94969E]">
                      Aether will share the permissions above with {details.client.name}. 
                      You can revoke access at any time from your OAuth settings. 
                      Your password is never shared with third-party applications.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  className="flex-1"
                  variant="ghost"
                  onClick={() => respond(false)}
                  disabled={submitting !== null}
                >
                  {submitting === "cancel" ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cancelling...
                    </span>
                  ) : (
                    "Cancel"
                  )}
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => respond(true)}
                  disabled={submitting !== null}
                >
                  {submitting === "authorize" ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Authorizing...
                    </span>
                  ) : (
                    "Authorize"
                  )}
                </Button>
              </div>

              {/* Footer */}
              <div className="mt-6 text-center">
                <p className="text-[10px] text-[#55575F]">
                  By authorizing, you agree to Aether's Terms of Service and Privacy Policy
                </p>
              </div>
            </motion.div>
          )}
        </GlassCard>
      </motion.div>
    </div>
  );
}