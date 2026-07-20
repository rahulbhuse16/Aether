import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Lock, Eye, EyeOff, Mail, Loader2, ChevronRightCircle, CheckCircle2, MailCheck } from "lucide-react";
import { resetPassword, forgotPassword } from "../services/auth";
import { useNavigate, useSearchParams } from "react-router-dom";

function HeroMark() {
    return (
        <motion.img
            src="/aether_logo.png"
            alt="Aether Logo"
            className="w-full max-w-sm h-40 object-contain drop-shadow-2xl self-center"
            animate={{ y: [0, -8, 0], scale: [1, 1.03, 1] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
    );
}

function Field({
    icon: Icon,
    ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
    icon: React.ComponentType<{ className?: string }>;
}) {
    return (
        <div className="relative">
            <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#55575F]" />
            <input
                {...props}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] py-2.5 pl-10 pr-10 text-[14px] text-[#F4F3EF] placeholder:text-[#55575F] outline-none transition-colors focus:border-white/20 focus:bg-white/[0.04] focus:ring-2 focus:ring-[#8B7FE8]/25"
            />
        </div>
    );
}

export default function ResetPassword() {
    const [params] = useSearchParams();
    const navigate = useNavigate();

    const id = params.get("id");
    const token = params.get("token");
    const hasLink = !!id && !!token;

    /* ---- state for "request a link" flow (no id/token in URL) ---- */
    const [email, setEmail] = useState("");
    const [linkSent, setLinkSent] = useState(false);

    /* ---- state for "set new password" flow (id/token present) ---- */
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [done, setDone] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleRequestLink(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (!email.includes("@")) {
            setError("Enter a valid email address.");
            return;
        }

        try {
            setLoading(true);
            const result = await forgotPassword(email);

            if (!result.success) {
                setError(result.error ?? "Something went wrong. Try again.");
                return;
            }

            setLinkSent(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
        } finally {
            setLoading(false);
        }
    }

    async function handleResetSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        try {
            setLoading(true);
            const result = await resetPassword(id as string, token as string, password);

            if (!result.success) {
                setError(result.error ?? "Failed to reset password.");
                return;
            }

            setDone(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#0A0B0D] p-6">
            <div
                className="pointer-events-none absolute inset-0 opacity-[0.4] lg:opacity-[0.6]"
                style={{
                    background:
                        "radial-gradient(circle at 50% 0%, rgba(139,127,232,0.10) 0%, transparent 55%)",
                }}
            />
            <div className="relative z-10 w-full max-w-[380px]">
                <div className="relative rounded-2xl bg-gradient-to-br from-[#8B7FE8]/25 via-white/[0.06] to-[#22A67D]/25 p-px shadow-2xl shadow-black/50">
                    <div className="rounded-[15px] bg-[#101215]/95 px-7 py-8 backdrop-blur-xl sm:px-9 sm:py-9">
                        <div className="mb-4 hidden flex-col items-center gap-2.5 lg:flex">
                            <HeroMark />
                        </div>

                        <AnimatePresence mode="wait">
                            {!hasLink ? (
                                /* ---------------------------------------------- */
                                /* No token in URL — ask for email, send link      */
                                /* ---------------------------------------------- */
                                linkSent ? (
                                    <motion.div
                                        key="link-sent"
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex flex-col items-center gap-4 text-center"
                                    >
                                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.04] border border-white/[0.08]">
                                            <MailCheck className="h-6 w-6 text-[#22A67D]" />
                                        </div>
                                        <div>
                                            <h2 className="text-[19px] font-medium tracking-tight text-[#F4F3EF]">
                                                Check your inbox
                                            </h2>
                                            <p className="mt-1.5 text-sm text-[#75777E]">
                                                If an account exists for{" "}
                                                <span className="text-[#94969E]">{email}</span>, we've sent a
                                                link to reset your password.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => navigate("/auth")}
                                            className="group mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#8B7FE8] to-[#22A67D] py-2.5 text-[14px] font-medium text-[#0A0B0D] shadow-lg shadow-[#8B7FE8]/10 transition-all hover:shadow-[#22A67D]/20 hover:brightness-[1.05]"
                                        >
                                            Back to sign in
                                            <ChevronRightCircle className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                                        </button>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="request-link"
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                    >
                                        <div className="mb-6 text-center">
                                            <h2 className="text-[19px] font-medium tracking-tight text-[#F4F3EF]">
                                                Forgot Password
                                            </h2>
                                            <p className="mt-1.5 text-sm text-[#75777E]">
                                                Enter your email and we'll send you a reset link.
                                            </p>
                                        </div>

                                        <form onSubmit={handleRequestLink} className="space-y-3">
                                            <Field
                                                icon={Mail}
                                                type="email"
                                                placeholder="Work email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                autoComplete="email"
                                                required
                                            />

                                            {error && <p className="text-sm text-[#E0685F]">{error}</p>}

                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="group mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#8B7FE8] to-[#22A67D] py-2.5 text-[14px] font-medium text-[#0A0B0D] shadow-lg shadow-[#8B7FE8]/10 transition-all hover:shadow-[#22A67D]/20 hover:brightness-[1.05] disabled:opacity-60"
                                            >
                                                {loading ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <>
                                                        Send reset link
                                                        <ChevronRightCircle className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                                                    </>
                                                )}
                                            </button>
                                        </form>
                                    </motion.div>
                                )
                            ) : done ? (
                                /* ---------------------------------------------- */
                                /* Password successfully changed                   */
                                /* ---------------------------------------------- */
                                <motion.div
                                    key="done"
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex flex-col items-center gap-4 text-center"
                                >
                                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.04] border border-white/[0.08]">
                                        <CheckCircle2 className="h-6 w-6 text-[#22A67D]" />
                                    </div>
                                    <div>
                                        <h2 className="text-[19px] font-medium tracking-tight text-[#F4F3EF]">
                                            Password reset
                                        </h2>
                                        <p className="mt-1.5 text-sm text-[#75777E]">
                                            Your password has been changed. You can now sign in.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => navigate("/auth")}
                                        className="group mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#8B7FE8] to-[#22A67D] py-2.5 text-[14px] font-medium text-[#0A0B0D] shadow-lg shadow-[#8B7FE8]/10 transition-all hover:shadow-[#22A67D]/20 hover:brightness-[1.05]"
                                    >
                                        Go to sign in
                                        <ChevronRightCircle className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                                    </button>
                                </motion.div>
                            ) : (
                                /* ---------------------------------------------- */
                                /* Valid link — set new password                   */
                                /* ---------------------------------------------- */
                                <motion.div
                                    key="reset-form"
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                >
                                    <div className="mb-6 text-center">
                                        <h2 className="text-[19px] font-medium tracking-tight text-[#F4F3EF]">
                                            Set a new password
                                        </h2>
                                        <p className="mt-1.5 text-sm text-[#75777E]">
                                            Choose a strong password for your account.
                                        </p>
                                    </div>

                                    <form onSubmit={handleResetSubmit} className="space-y-3">
                                        <div className="relative">
                                            <Field
                                                icon={Lock}
                                                type={showPassword ? "text" : "password"}
                                                placeholder="New password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                autoComplete="new-password"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword((v) => !v)}
                                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#55575F] transition-colors hover:text-[#94969E]"
                                                aria-label={showPassword ? "Hide password" : "Show password"}
                                            >
                                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>

                                        <Field
                                            icon={Lock}
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Confirm new password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            autoComplete="new-password"
                                            required
                                        />

                                        {error && <p className="text-sm text-[#E0685F]">{error}</p>}

                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="group mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#8B7FE8] to-[#22A67D] py-2.5 text-[14px] font-medium text-[#0A0B0D] shadow-lg shadow-[#8B7FE8]/10 transition-all hover:shadow-[#22A67D]/20 hover:brightness-[1.05] disabled:opacity-60"
                                        >
                                            {loading ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <>
                                                    Reset Password
                                                    <ChevronRightCircle className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                                                </>
                                            )}
                                        </button>
                                    </form>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
}