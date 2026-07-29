
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Boxes,
  Check,
  Copy,
  DollarSign,
  Gauge,
  GitBranch,
  
  Key,
  LogOut,
  Monitor,
  Plus,
  Shield,
  Terminal,
  Trash2,
  X,
  Zap,
  Link,
} from "lucide-react";

import { AppShell } from "../components/AppShell";
import { GlassCard } from "../components/ui/GlassCard";
import { PageSection } from "../components/ui/PageSection";
import { Button } from "../components/ui/Button";
import { GoBackButton } from "../components/ui/GoBackButton";

import { useAppDispatch, useAppSelector } from "../store/hooks";
import { useNavigate } from "react-router-dom";

import {
  createApiKey,
  deleteApiKey,
  fetchSecuritySettings,
  revokeSession,
  updateTwoFactorAuth,
} from "../services/security";
import { FaGithub } from "react-icons/fa";

type ApiKeyPurpose =
  | "cli"
  | "github_actions"
  | "ci_cd"
  | "custom";

interface CreatedApiKey {
  id: string;
  name: string;
  purpose: ApiKeyPurpose[];
  key: string;
  createdAt: string;
}

const purposeLabels: Record<ApiKeyPurpose, string> = {
  cli: "Aether CLI",
  github_actions: "GitHub Actions",
  ci_cd: "CI/CD Pipeline",
  custom: "Custom Integration",
};

const purposeDescriptions: Record<ApiKeyPurpose, string> = {
  cli: "Use this key with the Aether CLI.",
  github_actions: "Use this key inside GitHub Actions workflows.",
  ci_cd: "Use this key with your CI/CD pipeline.",
  custom: "Use this key for your custom integration.",
};

const purposeOptions = [
  {
    value: "cli" as ApiKeyPurpose,
    label: "Aether CLI",
    description: "Command-line tools",
    icon: Terminal,
  },
  {
    value: "github_actions" as ApiKeyPurpose,
    label: "GitHub Actions",
    description: "Automated workflows",
    icon: FaGithub,
  },
  {
    value: "ci_cd" as ApiKeyPurpose,
    label: "CI/CD Pipeline",
    description: "Deployment automation",
    icon: GitBranch,
  },
  {
    value: "custom" as ApiKeyPurpose,
    label: "Custom Integration",
    description: "Your own application",
    icon: Boxes,
  },
];

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-US").format(value);

const getPercentage = (used: number, limit: number) => {
  if (!limit || limit <= 0) return 0;

  return Math.min(Math.round((used / limit) * 100), 100);
};

const getMaskedKey = (key: string) => {
  if (!key) return "";

  return `${key.slice(0, 18)}••••••••••••`;
};

export default function SecuritySettings() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const userId = localStorage.getItem("userId") as string;

  const {
    twoFactorEnabled,
    apiKeys,
    sessions,
    loading,
  } = useAppSelector((state) => state.security);

  const [isCreateModalOpen, setIsCreateModalOpen] =
    useState(false);

  const [newKeyName, setNewKeyName] = useState("");

  const [keyPurposes, setKeyPurposes] =
    useState<ApiKeyPurpose[]>(["custom"]);

  const [tokenLimit, setTokenLimit] =
    useState(100000);

  const [spendingLimit, setSpendingLimit] =
    useState(500);

  const [rateLimit, setRateLimit] =
    useState(60);

  const [createdApiKey, setCreatedApiKey] =
    useState<CreatedApiKey | null>(null);

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (userId) {
      dispatch(fetchSecuritySettings({ userId }));
    }
  }, [dispatch, userId]);

  const handleToggle2FA = () => {
    dispatch(
      updateTwoFactorAuth({
        userId,
        twoFactorEnabled: !twoFactorEnabled,
      })
    );
  };

  const togglePurpose = (purpose: ApiKeyPurpose) => {
    setKeyPurposes((current) => {
      if (current.includes(purpose)) {
        if (current.length === 1) {
          return current;
        }

        return current.filter(
          (item) => item !== purpose
        );
      }

      return [...current, purpose];
    });
  };

  const resetCreateForm = () => {
    setNewKeyName("");
    setKeyPurposes(["custom"]);
    setTokenLimit(100000);
    setSpendingLimit(500);
    setRateLimit(60);
  };

  const handleCreateApiKey = async () => {
    if (!newKeyName.trim()) return;

    const result = await dispatch(
      createApiKey({
        userId,
        name: newKeyName.trim(),
        purpose: keyPurposes,
        tokenLimit,
        spendingLimit,
        rateLimit,
      })
    );

    if (createApiKey.fulfilled.match(result)) {
      const newKey = result.payload.data.apiKey;

      setCreatedApiKey(newKey);
      setIsCreateModalOpen(false);

      resetCreateForm();
    }
  };

  const handleDeleteApiKey = (apiKeyId: string) => {
    dispatch(
      deleteApiKey({
        userId,
        apiKeyId,
      })
    );
  };

  const handleRevokeSession = (sessionId: string) => {
    dispatch(
      revokeSession({
        userId,
        sessionId,
      })
    );
  };

  const handleCopyKey = async () => {
    if (!createdApiKey?.key) return;

    await navigator.clipboard.writeText(
      createdApiKey.key
    );

    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <AppShell title="Security">
      <div className="mx-auto max-w-4xl space-y-8">
        <GoBackButton to="/settings" className="mb-2" />

        {/* TWO FACTOR AUTHENTICATION */}
        <PageSection
          label="Authentication"
          title="Two-Factor Authentication"
        >
          <GlassCard>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03]">
                  <Shield className="h-5 w-5 text-[#8B7FE8]" />
                </div>

                <div>
                  <p className="text-[14px] font-medium text-[#F4F3EF]">
                    Two-Factor Authentication
                  </p>

                  <p className="text-[12px] text-[#55575F]">
                    Add an extra layer of security to your Aether account
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggle2FA}
                disabled={loading}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  twoFactorEnabled
                    ? "bg-[#22A67D]"
                    : "bg-white/[0.1]"
                }`}
              >
                <motion.div
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                    twoFactorEnabled
                      ? "translate-x-6"
                      : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="mt-4 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="text-[12px] text-[#94969E]">
                2FA protects your account even if your password is compromised.
              </p>
            </div>
          </GlassCard>
        </PageSection>

        {/* API KEYS */}
        <PageSection
          label="Developer Access"
          title="API Keys"
          delay={0.05}
        >
          <GlassCard>
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-[13px] text-[#94969E]">
                  Create keys for CLI tools, GitHub Actions, CI/CD pipelines,
                  and custom integrations.
                </p>

                <p className="mt-2 text-[11px] text-[#55575F]">
                  Each API key has independent token, spending, and rate limits.
                </p>
              </div>

              <Button
                size="sm"
                onClick={() => setIsCreateModalOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Create Key
              </Button>
            </div>

            {apiKeys.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/[0.1] py-12 text-center">
                <Key className="mx-auto mb-3 h-7 w-7 text-[#55575F]" />

                <p className="text-[13px] text-[#94969E]">
                  No API keys created yet
                </p>

                <p className="mt-1 text-[11px] text-[#55575F]">
                  Create your first key to connect Aether with external tools.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {apiKeys.map((key, index) => {
                  const tokenPercentage = getPercentage(
                    key.tokensUsed,
                    key.tokenLimit
                  );

                  const spendingPercentage = getPercentage(
                    key.spendingUsed,
                    key.spendingLimit
                  );

                  return (
                    <motion.div
                      key={key.id}
                      initial={{
                        opacity: 0,
                        y: 8,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      transition={{
                        delay: 0.05 * index,
                      }}
                    >
                      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                        {/* HEADER */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03]">
                              <Key className="h-4 w-4 text-[#8B7FE8]" />
                            </div>

                            <div>
                              <p className="text-[13px] font-medium text-[#F4F3EF]">
                                {key.name}
                              </p>

                              <div className="mt-1 flex flex-wrap gap-1.5">
                                {key.purpose.map((purpose) => (
                                  <span
                                    key={purpose}
                                    className="rounded-full bg-[#8B7FE8]/10 px-2 py-0.5 text-[10px] text-[#A69DF0]"
                                  >
                                    {purposeLabels[purpose]}
                                  </span>
                                ))}
                              </div>

                              <p className="mt-2 font-mono text-[11px] text-[#55575F]">
                                {getMaskedKey(key.key)}
                              </p>
                            </div>
                          </div>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              handleDeleteApiKey(key.id)
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-400" />
                          </Button>
                        </div>

                        {/* USAGE */}
                        <div className="mt-5 grid gap-4 md:grid-cols-3">
                          {/* TOKENS */}
                          <div>
                            <div className="mb-2 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Zap className="h-3.5 w-3.5 text-[#8B7FE8]" />

                                <span className="text-[11px] text-[#94969E]">
                                  Tokens
                                </span>
                              </div>

                              <span className="text-[11px] text-[#F4F3EF]">
                                {formatNumber(key.tokensUsed)}/
                                {formatNumber(key.tokenLimit)}
                              </span>
                            </div>

                            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                              <div
                                className="h-full rounded-full bg-[#8B7FE8] transition-all"
                                style={{
                                  width: `${tokenPercentage}%`,
                                }}
                              />
                            </div>

                            <p className="mt-1 text-[10px] text-[#55575F]">
                              {tokenPercentage}% used
                            </p>
                          </div>

                          {/* SPENDING */}
                          <div>
                            <div className="mb-2 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-3.5 w-3.5 text-[#22A67D]" />

                                <span className="text-[11px] text-[#94969E]">
                                  Spending
                                </span>
                              </div>

                              <span className="text-[11px] text-[#F4F3EF]">
                                ${(key.spendingUsed / 100).toFixed(2)}/$
                                {(key.spendingLimit / 100).toFixed(2)}
                              </span>
                            </div>

                            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                              <div
                                className="h-full rounded-full bg-[#22A67D] transition-all"
                                style={{
                                  width: `${spendingPercentage}%`,
                                }}
                              />
                            </div>

                            <p className="mt-1 text-[10px] text-[#55575F]">
                              {spendingPercentage}% used
                            </p>
                          </div>

                          {/* RATE LIMIT */}
                          <div>
                            <div className="mb-2 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Gauge className="h-3.5 w-3.5 text-[#F0A35E]" />

                                <span className="text-[11px] text-[#94969E]">
                                  Rate Limit
                                </span>
                              </div>

                              <span className="text-[11px] text-[#F4F3EF]">
                                {key.rateLimit}/min
                              </span>
                            </div>

                            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                              <div className="h-full w-full rounded-full bg-[#F0A35E]" />
                            </div>

                            <p className="mt-1 text-[10px] text-[#55575F]">
                              Requests per minute
                            </p>
                          </div>
                        </div>

                        {/* FOOTER */}
                        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-[#55575F]">
                          <span>
                            Created:{" "}
                            {new Date(
                              key.createdAt
                            ).toLocaleDateString()}
                          </span>

                          {key.lastUsed && (
                            <span>
                              Last used:{" "}
                              {new Date(
                                key.lastUsed
                              ).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </GlassCard>
        </PageSection>

        {/* OAUTH CLIENTS */}
        <PageSection
          label="OAuth"
          title="OAuth Applications"
          delay={0.08}
        >
          <GlassCard>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03]">
                  <Link className="h-5 w-5 text-[#8B7FE8]" />
                </div>

                <div>
                  <p className="text-[14px] font-medium text-[#F4F3EF]">
                    OAuth Applications
                  </p>

                  <p className="text-[12px] text-[#55575F]">
                    Manage applications that can connect with Aether OAuth
                  </p>
                </div>
              </div>

              <Button
                size="sm"
                onClick={() => navigate("/settings/security/oauth")}
              >
                <Plus className="h-3.5 w-3.5" />
                Manage
              </Button>
            </div>
          </GlassCard>
        </PageSection>

        {/* ACTIVE SESSIONS */}
        <PageSection
          label="Sessions"
          title="Active Sessions"
          delay={0.1}
        >
          <GlassCard>
            <div className="mb-4">
              <p className="text-[13px] text-[#94969E]">
                Manage your active sessions across devices.
              </p>
            </div>

            {sessions.length === 0 ? (
              <div className="py-6 text-center text-[13px] text-[#94969E]">
                No active sessions
              </div>
            ) : (
              <div className="space-y-2">
                {sessions.map((session, index) => (
                  <motion.div
                    key={session.id}
                    initial={{
                      opacity: 0,
                      y: 8,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    transition={{
                      delay: 0.05 * index,
                    }}
                  >
                    <GlassCard className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03]">
                          <Monitor className="h-4 w-4 text-[#94969E]" />
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-[13px] font-medium text-[#F4F3EF]">
                              {session.device}
                            </p>

                            {session.current && (
                              <span className="rounded-full bg-[#22A67D]/15 px-2 py-0.5 text-[10px] font-medium text-[#22A67D]">
                                Current
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] text-[#55575F]">
                            {session.browser} • {session.ip}
                          </p>

                          <p className="text-[11px] text-[#55575F]">
                            Last active:{" "}
                            {new Date(
                              session.lastActive
                            ).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {!session.current && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            handleRevokeSession(session.id)
                          }
                        >
                          <LogOut className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
            )}
          </GlassCard>
        </PageSection>
      </div>

      {/* CREATE API KEY MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <motion.div
            initial={{
              opacity: 0,
              scale: 0.96,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            className="flex max-h-[90vh] w-full max-w-lg flex-col"
          >
            <GlassCard className="flex max-h-[90vh] flex-col p-6">
              {/* HEADER */}
              <div className="relative mb-6 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="absolute right-0 top-0 text-[#55575F] transition hover:text-[#F4F3EF]"
                >
                  <X className="h-4 w-4" />
                </button>

                <h3 className="text-[16px] font-semibold text-[#F4F3EF]">
                  Create API Key
                </h3>

                <p className="mt-1 text-[12px] text-[#55575F]">
                  Configure how this key can access Aether.
                </p>
              </div>

              {/* SCROLLABLE CONTENT */}
              <div className="min-h-0 flex-1 overflow-y-auto pr-2">
                <div className="space-y-5">
                  {/* NAME */}
                  <div>
                    <label className="mb-2 block text-[11px] text-[#94969E]">
                      Key Name
                    </label>

                    <input
                      type="text"
                      value={newKeyName}
                      onChange={(e) =>
                        setNewKeyName(e.target.value)
                      }
                      placeholder="e.g. Production GitHub Actions"
                      className="w-full rounded-lg border border-white/[0.1] bg-white/[0.02] px-4 py-2.5 text-[13px] text-[#F4F3EF] outline-none placeholder:text-[#55575F] focus:border-[#8B7FE8]/50"
                    />
                  </div>

                  {/* PURPOSE */}
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <label className="block text-[11px] text-[#94969E]">
                        Integration Purpose
                      </label>

                      <span className="text-[10px] text-[#55575F]">
                        Select all that apply
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {purposeOptions.map((purpose) => {
                        const Icon = purpose.icon;

                        const isSelected =
                          keyPurposes.includes(
                            purpose.value
                          );

                        return (
                          <motion.button
                            key={purpose.value}
                            type="button"
                            whileHover={{
                              y: -2,
                            }}
                            whileTap={{
                              scale: 0.98,
                            }}
                            onClick={() =>
                              togglePurpose(
                                purpose.value
                              )
                            }
                            className={`group relative rounded-xl border p-3 text-left transition-all ${
                              isSelected
                                ? "border-[#8B7FE8]/60 bg-[#8B7FE8]/10 shadow-[0_0_20px_rgba(139,127,232,0.12)]"
                                : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.16] hover:bg-white/[0.04]"
                            }`}
                          >
                            {/* CHECKBOX */}
                            <div
                              className={`absolute right-3 top-3 flex h-4 w-4 items-center justify-center rounded-md border transition-all ${
                                isSelected
                                  ? "border-[#8B7FE8] bg-[#8B7FE8]"
                                  : "border-white/[0.15] bg-white/[0.03]"
                              }`}
                            >
                              {isSelected && (
                                <Check className="h-2.5 w-2.5 text-white" />
                              )}
                            </div>

                            {/* ICON */}
                            <div
                              className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                                isSelected
                                  ? "bg-[#8B7FE8]/20 text-[#A69DF0]"
                                  : "bg-white/[0.06] text-[#777983] group-hover:text-[#A69DF0]"
                              }`}
                            >
                              <Icon className="h-4 w-4" />
                            </div>

                            {/* CONTENT */}
                            <p
                              className={`text-[12px] font-medium ${
                                isSelected
                                  ? "text-[#F4F3EF]"
                                  : "text-[#C5C5CA]"
                              }`}
                            >
                              {purpose.label}
                            </p>

                            <p className="mt-1 text-[10px] text-[#55575F]">
                              {purpose.description}
                            </p>
                          </motion.button>
                        );
                      })}
                    </div>

                    {/* SELECTED PURPOSES */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {keyPurposes.map((purpose) => (
                        <span
                          key={purpose}
                          className="rounded-full border border-[#8B7FE8]/20 bg-[#8B7FE8]/10 px-2.5 py-1 text-[10px] text-[#A69DF0]"
                        >
                          {purposeLabels[purpose]}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* TOKEN LIMIT */}
                  <div>
                    <label className="mb-2 block text-[11px] text-[#94969E]">
                      Monthly Token Limit
                    </label>

                    <input
                      type="number"
                      min={1000}
                      value={tokenLimit}
                      onChange={(e) =>
                        setTokenLimit(
                          Number(e.target.value)
                        )
                      }
                      className="w-full rounded-lg border border-white/[0.1] bg-white/[0.02] px-4 py-2.5 text-[13px] text-[#F4F3EF] outline-none"
                    />

                    <p className="mt-1 text-[10px] text-[#55575F]">
                      Maximum AI tokens this key can consume.
                    </p>
                  </div>

                  {/* SPENDING LIMIT */}
                  <div>
                    <label className="mb-2 block text-[11px] text-[#94969E]">
                      Monthly Spending Limit
                    </label>

                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-[#55575F]">
                        $
                      </span>

                      <input
                        type="number"
                        min={1}
                        step={0.01}
                        value={spendingLimit / 100}
                        onChange={(e) =>
                          setSpendingLimit(
                            Math.round(
                              Number(e.target.value) * 100
                            )
                          )
                        }
                        className="w-full rounded-lg border border-white/[0.1] bg-white/[0.02] py-2.5 pl-8 pr-4 text-[13px] text-[#F4F3EF] outline-none"
                      />
                    </div>

                    <p className="mt-1 text-[10px] text-[#55575F]">
                      API requests will be blocked after this limit.
                    </p>
                  </div>

                  {/* RATE LIMIT */}
                  <div>
                    <label className="mb-2 block text-[11px] text-[#94969E]">
                      Rate Limit
                    </label>

                    <div className="relative">
                      <input
                        type="number"
                        min={1}
                        value={rateLimit}
                        onChange={(e) =>
                          setRateLimit(
                            Number(e.target.value)
                          )
                        }
                        className="w-full rounded-lg border border-white/[0.1] bg-white/[0.02] px-4 py-2.5 pr-20 text-[13px] text-[#F4F3EF] outline-none"
                      />

                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#55575F]">
                        req/min
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* FOOTER */}
              <div className="mt-5 shrink-0 border-t border-white/[0.06] pt-5">
                <Button
                  className="w-full"
                  onClick={handleCreateApiKey}
                  disabled={
                    loading ||
                    !newKeyName.trim() ||
                    keyPurposes.length === 0
                  }
                >
                  <Plus className="h-4 w-4" />
                  Create API Key
                </Button>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      )}

      {/* CREATED KEY MODAL */}
      {createdApiKey && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <motion.div
            initial={{
              opacity: 0,
              scale: 0.96,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            className="w-full max-w-lg"
          >
            <GlassCard className="p-6">
              <div className="mb-5">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[#22A67D]/10">
                  <Key className="h-5 w-5 text-[#22A67D]" />
                </div>

                <h3 className="text-[16px] font-semibold text-[#F4F3EF]">
                  API Key Created
                </h3>

                <p className="mt-1 text-[12px] text-[#94969E]">
                  Copy this key now. You will not be able to view the full key
                  again.
                </p>
              </div>

              <div className="rounded-lg border border-[#F0A35E]/20 bg-[#F0A35E]/5 p-3">
                <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-[#F0A35E]">
                  Secret API Key
                </p>

                <div className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 break-all font-mono text-[12px] text-[#F4F3EF]">
                    {createdApiKey.key}
                  </code>

                  <button
                    type="button"
                    onClick={handleCopyKey}
                    className="shrink-0 rounded-md border border-white/[0.1] p-2 text-[#94969E] transition hover:text-[#F4F3EF]"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-[#22A67D]" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                className="mt-5 w-full"
                onClick={() => setCreatedApiKey(null)}
              >
                I've copied the key
              </Button>
            </GlassCard>
          </motion.div>
        </div>
      )}
    </AppShell>
  );
}

