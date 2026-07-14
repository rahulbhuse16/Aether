
/**
 * AuthPage — Aether
 *
 * Requires:
 *   npm install framer-motion lucide-react
 *
 * Recommended fonts (next/font/google or the `geist` package):
 *   Display / body : Geist Sans      -> --font-sans
 *   Mono (readouts): Geist Mono      -> --font-mono
 * Falls back to system sans/mono if not configured.
 *
 * Brand tokens used inline (no tailwind.config changes required):
 *   bg base        #0A0B0D
 *   card surface   #101215
 *   border         white/8-10%
 *   text primary   #F4F3EF
 *   text secondary #94969E
 *   text muted     #55575F
 *   accent purple  #8B7FE8
 *   accent teal    #22A67D
 */

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
    Mail,
    Loader2,
    ChevronRightCircle,

} from "lucide-react";
import { resetPassword } from "../services/auth";
import { useNavigate } from "react-router-dom";




/* ---------------------------------------------------------------- */
/* Static mark — used small, at the top of the auth card             */
/* ---------------------------------------------------------------- */

function AetherMark({ size = 36 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
            <defs>
                <linearGradient id="aetherGradSmall" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#8B7FE8" />
                    <stop offset="100%" stopColor="#22A67D" />
                </linearGradient>
            </defs>
            <polygon
                points="50,6 91,28 91,72 50,94 9,72 9,28"
                fill="none"
                stroke="url(#aetherGradSmall)"
                strokeWidth="2.5"
                strokeLinejoin="round"
            />
            <path d="M28,36 Q40,20 50,15" fill="none" stroke="url(#aetherGradSmall)" strokeWidth="1.6" />
            <path d="M72,36 Q60,20 50,15" fill="none" stroke="url(#aetherGradSmall)" strokeWidth="1.6" />
            <path d="M50,15 Q42,42 38,58" fill="none" stroke="url(#aetherGradSmall)" strokeWidth="3.2" strokeLinecap="round" />
            <path d="M50,15 Q58,42 62,58" fill="none" stroke="url(#aetherGradSmall)" strokeWidth="3.2" strokeLinecap="round" />
            <line x1="42" y1="43" x2="58" y2="43" stroke="url(#aetherGradSmall)" strokeWidth="2.6" strokeLinecap="round" />
            <circle cx="50" cy="15" r="4.5" fill="url(#aetherGradSmall)" />
            <circle cx="28" cy="36" r="3" fill="url(#aetherGradSmall)" />
            <circle cx="72" cy="36" r="3" fill="url(#aetherGradSmall)" />
            <circle cx="38" cy="58" r="3" fill="url(#aetherGradSmall)" />
            <circle cx="62" cy="58" r="3" fill="url(#aetherGradSmall)" />
        </svg>
    );
}

/* ---------------------------------------------------------------- */
/* Hero mark — large, with data flowing along the connecting lines   */
/* ---------------------------------------------------------------- */

function HeroMark() {


    return (
        <motion.img
            src="/aether_logo.svg"
            alt="Aether Logo"
            className="w-full max-w-sm h-auto object-contain drop-shadow-2xl self-center"
            animate={{
                y: [0, -8, 0],
                scale: [1, 1.03, 1],
            }}
            transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut",
            }}
        />
    );
}

/* ---------------------------------------------------------------- */
/* Boot log — literal "operating system" signature detail            */
/* ---------------------------------------------------------------- */



/* ---------------------------------------------------------------- */
/* Brand panel                                                       */
/* ---------------------------------------------------------------- */

function BrandPanel() {
    return (
        <div className="relative hidden h-full w-full flex-col justify-center gap-12 overflow-hidden bg-[#0A0B0D] px-14 py-12 lg:flex">
            <div
                className="pointer-events-none absolute inset-0 opacity-[0.05]"
                style={{
                    backgroundImage:
                        "radial-gradient(rgba(244,243,239,0.6) 1px, transparent 1px)",
                    backgroundSize: "26px 26px",
                }}
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0A0B0D] to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#0A0B0D] to-transparent" />

            <HeroMark />

            <div className="max-w-md space-y-4 text-center self-center">
                <span className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-[#22A67D]">
                    AI engineering operating system
                </span>
                <h1 className="text-[34px] font-medium leading-[1.15] tracking-tight text-[#F4F3EF]">
                    Engineering runs on Aether
                </h1>
                <p className="mx-auto max-w-sm text-[15px] leading-relaxed text-[#94969E]">
                    Aether reviews your code, understands your repository, and turns
                    AI suggestions into pull requests and tickets you can actually
                    merge.
                </p>
            </div>

        </div>
    );
}

/* ---------------------------------------------------------------- */
/* Field primitive                                                   */
/* ---------------------------------------------------------------- */

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
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] py-2.5 pl-10 pr-3.5 text-[14px] text-[#F4F3EF] placeholder:text-[#55575F] outline-none transition-colors focus:border-white/20 focus:bg-white/[0.04] focus:ring-2 focus:ring-[#8B7FE8]/25"
            />
        </div>
    );
}

/* ---------------------------------------------------------------- */
/* Main component                                                    */
/* ---------------------------------------------------------------- */

export default function ForgotPwd() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [email, setEmail] = useState("");

    const navigate=useNavigate()



    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

       
        if (!email.includes("@")) {
            setError("Enter a valid email address.");
            return;
        }
       

        try {
            setLoading(true);
            await resetPassword(email)
            navigate("/auth")
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
              
                <div>
                    <div className="relative rounded-2xl bg-gradient-to-br from-[#8B7FE8]/25 via-white/[0.06] to-[#22A67D]/25 p-px shadow-2xl shadow-black/50">
                        <div className="rounded-[15px] bg-[#101215]/95 px-7 py-8 backdrop-blur-xl sm:px-9 sm:py-9">
                            <div className="mb-4 hidden flex-col items-center gap-2.5 lg:flex">
                                  <HeroMark />
                            </div>

                            <div className="mb-6 text-center">
                                <h2 className="text-[19px] font-medium tracking-tight text-[#F4F3EF]">
                                    {"Forgot Password"}
                                </h2>
                                <p className="mt-1.5 text-sm text-[#75777E]">
                                    {
                                        "Send reset password link on your email"
                                       }
                                </p>
                            </div>

                          

                          
                           

                           

                            <AnimatePresence mode="wait">
                                <motion.form
                                    onSubmit={handleSubmit}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -6 }}
                                    transition={{ duration: 0.18 }}
                                    className="space-y-3"
                                >
                                    

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
                                                {"Continue"}
                                                <ChevronRightCircle className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                                            </>
                                        )}
                                    </button>


                                </motion.form>
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}