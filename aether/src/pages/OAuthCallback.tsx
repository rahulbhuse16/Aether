import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  LogIn,
  Sparkles,
} from "lucide-react";

type AuthStatus = "loading" | "success" | "error";

export default function OAuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState<AuthStatus>("loading");

  const token = params.get("token");
  const userId = params.get("userId");
  const error = params.get("error");
  const source = params.get("source");
  const provider = params.get("provider");

  const providerName = useMemo(() => {
    switch (provider) {
      case "google":
        return "Google";

      case "github":
        return "GitHub";

      default:
        return "your account";
    }
  }, [provider]);

  const errorMessage = useMemo(() => {
    if (!error) return "We couldn't complete the authentication process.";

    switch (error) {
      case "access_denied":
        return "Authentication was cancelled before it could be completed.";

      case "oauth_failed":
        return "The authentication provider could not complete your sign-in.";

      case "server_error":
        return "Something went wrong on our server while signing you in.";

      default:
        return error.replace(/_/g, " ");
    }
  }, [error]);

  useEffect(() => {
    // Onboarding flow
    if (source === "onboarding") {
      navigate("/onboarding?success=true", { replace: true });
      return;
    }

    // OAuth error
    if (error || !token || !userId) {
      setStatus("error");
      return;
    }

    // Save authentication data
    localStorage.setItem("userId", userId);
    localStorage.setItem("token", token);

    // Show success state
    const timer = setTimeout(() => {
      setStatus("success");

      const redirectTimer = setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 1200);

      return () => clearTimeout(redirectTimer);
    }, 800);

    return () => clearTimeout(timer);
  }, [error, navigate, source, token, userId]);

  const handleLoginAgain = () => {
    navigate("/auth", { replace: true });
  };

  const handleGoHome = () => {
    navigate("/", { replace: true });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#08090C] px-6 text-[#F4F3EF]">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className={`absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[150px] transition-colors duration-700 ${
            status === "error"
              ? "bg-red-500/10"
              : status === "success"
                ? "bg-[#22A67D]/10"
                : "bg-[#8B7FE8]/10"
          }`}
        />

        <div className="absolute left-[15%] top-[20%] h-1 w-1 rounded-full bg-white/70 shadow-[0_0_20px_8px_rgba(255,255,255,0.12)]" />

        <div className="absolute right-[18%] top-[30%] h-1 w-1 rounded-full bg-white/70 shadow-[0_0_20px_8px_rgba(255,255,255,0.12)]" />

        <div className="absolute bottom-[20%] left-[25%] h-1 w-1 rounded-full bg-white/70 shadow-[0_0_20px_8px_rgba(255,255,255,0.12)]" />
      </div>

      {/* Grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-8 text-center shadow-2xl backdrop-blur-2xl">
          {/* Icon */}
          <AnimatePresence mode="wait">
            {status === "loading" && (
              <motion.div
                key="loading"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="mx-auto mb-7 flex h-20 w-20 items-center justify-center rounded-3xl border border-[#8B7FE8]/20 bg-[#8B7FE8]/10"
              >
                <Loader2 className="h-8 w-8 animate-spin text-[#8B7FE8]" />
              </motion.div>
            )}

            {status === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="mx-auto mb-7 flex h-20 w-20 items-center justify-center rounded-3xl border border-[#22A67D]/20 bg-[#22A67D]/10"
              >
                <CheckCircle2 className="h-9 w-9 text-[#22A67D]" />
              </motion.div>
            )}

            {status === "error" && (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="mx-auto mb-7 flex h-20 w-20 items-center justify-center rounded-3xl border border-red-400/20 bg-red-400/10"
              >
                <AlertCircle className="h-9 w-9 text-red-400" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Content */}
          <AnimatePresence mode="wait">
            {status === "loading" && (
              <motion.div
                key="loading-content"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <p className="mb-3 text-xs font-medium uppercase tracking-[0.3em] text-[#8B7FE8]">
                  Authenticating
                </p>

                <h1 className="text-2xl font-medium tracking-tight">
                  Welcome to Aether
                </h1>

                <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-[#94969E]">
                  Securely signing you in with {providerName}. Your workspace
                  is being prepared.
                </p>

                <div className="mx-auto mt-7 flex w-fit items-center gap-3 rounded-full border border-white/[0.08] bg-white/[0.035] px-4 py-2.5">
                  <Loader2 className="h-4 w-4 animate-spin text-[#8B7FE8]" />

                  <span className="text-xs text-[#94969E]">
                    Establishing secure session
                  </span>
                </div>
              </motion.div>
            )}

            {status === "success" && (
              <motion.div
                key="success-content"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <p className="mb-3 text-xs font-medium uppercase tracking-[0.3em] text-[#22A67D]">
                  Authentication complete
                </p>

                <h1 className="text-2xl font-medium tracking-tight">
                  You're in.
                </h1>

                <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-[#94969E]">
                  Your Aether workspace is ready. Taking you to your dashboard.
                </p>

                <div className="mx-auto mt-7 flex w-fit items-center gap-3 rounded-full border border-[#22A67D]/20 bg-[#22A67D]/10 px-4 py-2.5">
                  <CheckCircle2 className="h-4 w-4 text-[#22A67D]" />

                  <span className="text-xs text-[#94969E]">
                    Session established
                  </span>
                </div>
              </motion.div>
            )}

            {status === "error" && (
              <motion.div
                key="error-content"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <p className="mb-3 text-xs font-medium uppercase tracking-[0.3em] text-red-400">
                  Authentication failed
                </p>

                <h1 className="text-2xl font-medium tracking-tight">
                  We couldn't sign you in
                </h1>

                <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-[#94969E]">
                  {errorMessage}
                </p>

                {/* Error Details */}
                <div className="mt-5 rounded-xl border border-red-400/10 bg-red-400/[0.04] px-4 py-3 text-left">
                  <div className="flex gap-3">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />

                    <p className="text-xs leading-5 text-[#94969E]">
                      Your account was not changed. You can safely try signing
                      in again.
                    </p>
                  </div>
                </div>

                {/* CTA */}
                <button
                  onClick={handleLoginAgain}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#F4F3EF] px-5 py-3 text-sm font-medium text-[#08090C] transition hover:bg-white hover:shadow-[0_0_30px_rgba(244,243,239,0.12)]"
                >
                  <LogIn className="h-4 w-4" />
                  Try signing in again
                </button>

                <button
                  onClick={handleGoHome}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-3 text-sm text-[#94969E] transition hover:bg-white/[0.06] hover:text-[#F4F3EF]"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to home
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer */}
          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-[#55575F]">
            <Sparkles className="h-3.5 w-3.5 text-[#8B7FE8]" />
            <span>Intelligence, connected.</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}