import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, ImagePlus, Plus, Upload, X } from "lucide-react";
import { GlassCard } from "../ui/GlassCard";
import { Button } from "../ui/Button";
import {
  SUPPORTED_SCOPES,
  type OAuthClientSummary,
  type OAuthScope,
  type RegisterClientInput,
} from "../../services/oauth";
import { toast } from "../../utils/toast";
import axios from "axios";
import { API_BASE } from "../../constants/constants";

const MAX_LOGO_SIZE_BYTES = 512 * 1024;
const ACCEPTED_LOGO_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
] as const;

const LOGO_ACCEPT = ACCEPTED_LOGO_TYPES.join(",");

const SCOPE_LABELS: Record<OAuthScope, string> = {
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

const SCOPE_DESCRIPTIONS: Record<OAuthScope, string> = {
  profile: "Read user profile information",
  projects: "Access project data",
  repositories: "Access connected repositories",
  notifications: "Send and read notifications",
  ai_reports: "Generate and read AI reports",
  bugs: "Access bug finder results",
  architecture: "Access architecture diagrams",
  chat: "Use repository chat",
  workflows: "Manage automation workflows",
  usage: "Read usage and billing metrics",
  security: "Access security settings",
};

interface CreateOAuthClientModalProps {
  isOpen: boolean;
  mode: "create" | "edit";
  client?: OAuthClientSummary | null;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (input: RegisterClientInput) => Promise<void>;
}

const inputClassName =
  "w-full rounded-lg border border-white/[0.1] bg-white/[0.02] px-4 py-2.5 text-[13px] text-[#F4F3EF] outline-none placeholder:text-[#55575F] focus:border-[#8B7FE8]/50";

export default function CreateOAuthClientModal({
  isOpen,
  mode,
  client,
  submitting = false,
  onClose,
  onSubmit,
}: CreateOAuthClientModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [redirectUris, setRedirectUris] = useState<string[]>([""]);
  const [newUri, setNewUri] = useState("");
  const [allowedScopes, setAllowedScopes] = useState<OAuthScope[]>(["profile"]);
  const [logo, setLogo] = useState("");
  const [website, setWebsite] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (mode === "edit" && client) {
      setName(client.name);
      setDescription(client.description ?? "");
      setRedirectUris(client.redirectUris.length > 0 ? client.redirectUris : [""]);
      setAllowedScopes(client.allowedScopes as OAuthScope[]);
      setLogo(client.logo ?? "");
      setWebsite(client.website ?? "");
    } else {
      setName("");
      setDescription("");
      setRedirectUris([""]);
      setNewUri("");
      setAllowedScopes(["profile"]);
      setLogo("");
      setWebsite("");
    }

    if (logoInputRef.current) {
      logoInputRef.current.value = "";
    }
  }, [isOpen, mode, client]);

  const clearLogo = () => {
    setLogo("");
    if (logoInputRef.current) {
      logoInputRef.current.value = "";
    }
  };

 const handleLogoSelect = async (
  event: React.ChangeEvent<HTMLInputElement>
) => {
  const file = event.target.files?.[0];
  if (!file) return;

  if (
    !ACCEPTED_LOGO_TYPES.includes(
      file.type as (typeof ACCEPTED_LOGO_TYPES)[number]
    )
  ) {
    toast.error("Please upload a PNG, JPG, WebP, GIF, or SVG image.");
    event.target.value = "";
    return;
  }

  if (file.size > MAX_LOGO_SIZE_BYTES) {
    toast.error("Logo must be 512KB or smaller.");
    event.target.value = "";
    return;
  }

  try {
    setLogoUploading(true);

    const formData = new FormData();
    formData.append("image", file);

    const { data } = await axios.post(
      `${API_BASE}/cloudinary/upload`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    if (data.success) {
      setLogo(data.imageUrl); // Cloudinary URL
      toast.success("Logo uploaded successfully.");
    } else {
      toast.error(data.message || "Upload failed.");
    }
  } catch (error: any) {
    toast.error(
      error?.response?.data?.message || "Failed to upload logo."
    );
  } finally {
    setLogoUploading(false);
    event.target.value = "";
  }
};

  const toggleScope = (scope: OAuthScope) => {
    setAllowedScopes((current) => {
      if (current.includes(scope)) {
        if (current.length === 1) return current;
        return current.filter((item) => item !== scope);
      }
      return [...current, scope];
    });
  };

  const addRedirectUri = () => {
    const trimmed = newUri.trim();
    if (!trimmed) return;
    setRedirectUris((current) => {
      const filtered = current.filter(Boolean);
      if (filtered.includes(trimmed)) return current;
      return [...filtered, trimmed];
    });
    setNewUri("");
  };

  const removeRedirectUri = (index: number) => {
    setRedirectUris((current) => {
      const next = current.filter((_, i) => i !== index);
      return next.length > 0 ? next : [""];
    });
  };

  const updateRedirectUri = (index: number, value: string) => {
    setRedirectUris((current) =>
      current.map((uri, i) => (i === index ? value : uri))
    );
  };

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    const uris = redirectUris.map((uri) => uri.trim()).filter(Boolean);

    if (!trimmedName || uris.length === 0 || allowedScopes.length === 0) return;

    await onSubmit({
      name: trimmedName,
      description: description.trim() || undefined,
      redirectUris: uris,
      allowedScopes,
      logo: logo.trim() || undefined,
      website: website.trim() || undefined,
    });
  };

  const isValid =
    name.trim().length > 0 &&
    redirectUris.some((uri) => uri.trim().length > 0) &&
    allowedScopes.length > 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col"
      >
        <GlassCard className="flex max-h-[90vh] flex-col p-6">
          <div className="relative mb-6 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="absolute right-0 top-0 text-[#55575F] transition hover:text-[#F4F3EF]"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-[16px] font-semibold text-[#F4F3EF]">
              {mode === "create" ? "Create OAuth Application" : "Edit OAuth Application"}
            </h3>

            <p className="mt-1 text-[12px] text-[#55575F]">
              {mode === "create"
                ? "Register a new application to connect with Aether OAuth."
                : "Update your application's settings and permissions."}
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pr-2">
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-[11px] text-[#94969E]">
                  Application Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. My Developer App"
                  className={inputClassName}
                />
              </div>

              <div>
                <label className="mb-2 block text-[11px] text-[#94969E]">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of what this application does"
                  rows={3}
                  className={`${inputClassName} resize-none`}
                />
              </div>

              <div>
                <label className="mb-2 block text-[11px] text-[#94969E]">
                  Redirect URIs
                </label>
                <p className="mb-3 text-[11px] text-[#55575F]">
                  Add the callback URLs where users will be redirected after authorization.
                </p>

                <div className="mb-3 flex gap-2">
                  <input
                    type="url"
                    value={newUri}
                    onChange={(e) => setNewUri(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addRedirectUri();
                      }
                    }}
                    placeholder="https://example.com/oauth/callback"
                    className={inputClassName}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={addRedirectUri}
                    disabled={!newUri.trim()}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add
                  </Button>
                </div>

                <div className="space-y-2">
                  {redirectUris.map((uri, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="url"
                        value={uri}
                        onChange={(e) => updateRedirectUri(index, e.target.value)}
                        placeholder="https://example.com/oauth/callback"
                        className={inputClassName}
                      />
                      {redirectUris.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRedirectUri(index)}
                          className="shrink-0 rounded-lg border border-white/[0.1] px-3 text-[#94969E] transition hover:text-[#F4F3EF]"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <label className="block text-[11px] text-[#94969E]">
                    Allowed Scopes
                  </label>
                  <span className="text-[10px] text-[#55575F]">
                    Select all that apply
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {SUPPORTED_SCOPES.map((scope) => {
                    const isSelected = allowedScopes.includes(scope);

                    return (
                      <motion.button
                        key={scope}
                        type="button"
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => toggleScope(scope)}
                        className={`group relative rounded-xl border p-3 text-left transition-all ${
                          isSelected
                            ? "border-[#8B7FE8]/60 bg-[#8B7FE8]/10 shadow-[0_0_20px_rgba(139,127,232,0.12)]"
                            : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.16] hover:bg-white/[0.04]"
                        }`}
                      >
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

                        <p className="pr-6 text-[13px] font-medium text-[#F4F3EF]">
                          {SCOPE_LABELS[scope]}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#55575F]">
                          {SCOPE_DESCRIPTIONS[scope]}
                        </p>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[11px] text-[#94969E]">
                  Application Logo
                </label>
                <p className="mb-3 text-[11px] text-[#55575F]">
                  Upload from your device. Stored as a base64 data URL (PNG, JPG,
                  WebP, GIF, or SVG — max 512KB).
                </p>

                <input
                  ref={logoInputRef}
                  type="file"
                  accept={LOGO_ACCEPT}
                  className="hidden"
                  onChange={handleLogoSelect}
                />

                {logo ? (
                  <div className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      <div className="relative shrink-0">
                        <img
                          src={logo}
                          alt="Application logo preview"
                          className="h-16 w-16 rounded-xl border border-white/[0.08] object-cover"
                        />
                        <button
                          type="button"
                          onClick={clearLogo}
                          className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-white/[0.1] bg-[#0A0B0D] text-[#94969E] transition hover:text-[#F4F3EF]"
                          aria-label="Remove logo"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>

                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-[#F4F3EF]">
                          Logo ready
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-[#55575F]">
                          Base64 data URL attached
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={logoUploading}
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Replace
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={logoUploading}
                    className="group flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.12] bg-white/[0.02] px-4 py-8 text-center transition hover:border-[#8B7FE8]/40 hover:bg-[#8B7FE8]/5 disabled:opacity-60"
                  >
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-[#8B7FE8]/30 bg-[#8B7FE8]/10 transition group-hover:border-[#8B7FE8]/50 group-hover:bg-[#8B7FE8]/15">
                      {logoUploading ? (
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#8B7FE8]/30 border-t-[#8B7FE8]" />
                      ) : (
                        <ImagePlus className="h-5 w-5 text-[#8B7FE8]" />
                      )}
                    </div>
                    <p className="text-[13px] font-medium text-[#F4F3EF]">
                      {logoUploading ? "Processing image..." : "Upload logo"}
                    </p>
                    <p className="mt-1 text-[11px] text-[#55575F]">
                      Click to choose an image from your device
                    </p>
                  </button>
                )}
              </div>

              <div>
                <label className="mb-2 block text-[11px] text-[#94969E]">
                  Website URL
                </label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://example.com"
                  className={inputClassName}
                />
              </div>
            </div>
          </div>

          <div className="mt-5 shrink-0 border-t border-white/[0.06] pt-5">
            <Button
              variant="primary"
              className="w-full"
              onClick={handleSubmit}
              disabled={submitting || !isValid}
            >
              {submitting
                ? mode === "create"
                  ? "Creating..."
                  : "Saving..."
                : mode === "create"
                  ? "Create Application"
                  : "Save Changes"}
            </Button>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
