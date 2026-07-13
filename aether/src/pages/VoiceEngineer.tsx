import { motion } from "framer-motion";
import { Mic, MicOff, Loader2, Code2, CheckCircle2 } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { GlassCard } from "../components/ui/GlassCard";
import { PageSection } from "../components/ui/PageSection";
import { Button } from "../components/ui/Button";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  setListening,
  setCurrentTranscript,
  addCommand,
  updateCommandStatus,
} from "../store/slices/voiceSlice";

const DEMO_TRANSCRIPT =
  "Create authentication using JWT. Store token in cookies. Generate React page with Tailwind.";

export default function VoiceEngineer() {
  const dispatch = useAppDispatch();
  const { isListening, commands, currentTranscript } = useAppSelector((s) => s.voice);

  const toggleListening = () => {
    if (isListening) {
      dispatch(setListening(false));
      return;
    }
    dispatch(setListening(true));
    dispatch(setCurrentTranscript(""));

    let charIndex = 0;
    const interval = setInterval(() => {
      charIndex += 3;
      if (charIndex >= DEMO_TRANSCRIPT.length) {
        clearInterval(interval);
        dispatch(setCurrentTranscript(DEMO_TRANSCRIPT));
        dispatch(setListening(false));

        const cmdId = `v-${Date.now()}`;
        dispatch(
          addCommand({
            id: cmdId,
            transcript: DEMO_TRANSCRIPT,
            status: "building",
          })
        );

        setTimeout(() => {
          dispatch(
            updateCommandStatus({
              id: cmdId,
              status: "complete",
              output:
                "Generated: AuthProvider.tsx, LoginPage.tsx, authSlice.ts, jwt middleware, cookie config, and 12 unit tests.",
            })
          );
        }, 3000);
      } else {
        dispatch(setCurrentTranscript(DEMO_TRANSCRIPT.slice(0, charIndex)));
      }
    }, 50);
  };

  return (
    <AppShell title="Voice engineer">
      <div className="mx-auto max-w-3xl space-y-8">
        <PageSection
          label="Voice-to-code"
          title="Speak your feature into existence"
          description="Press the microphone and describe what to build. AI generates frontend, backend, tests, and deployment config."
        />

        <GlassCard highlight className="flex flex-col items-center py-16 text-center">
          <motion.button
            onClick={toggleListening}
            animate={isListening ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 1.5, repeat: isListening ? Infinity : 0 }}
            className={`mb-6 flex h-24 w-24 items-center justify-center rounded-full border-2 transition-colors ${
              isListening
                ? "border-[#E0685F] bg-[#E0685F]/10"
                : "border-[#8B7FE8]/40 bg-gradient-to-br from-[#8B7FE8]/20 to-[#22A67D]/20 hover:border-[#8B7FE8]/60"
            }`}
          >
            {isListening ? (
              <MicOff className="h-10 w-10 text-[#E0685F]" />
            ) : (
              <Mic className="h-10 w-10 text-[#8B7FE8]" />
            )}
          </motion.button>

          <h3 className="mb-2 text-[16px] font-medium text-[#F4F3EF]">
            {isListening ? "Listening..." : "Tap to start speaking"}
          </h3>

          {currentTranscript && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-md text-[14px] leading-relaxed text-[#94969E]"
            >
              "{currentTranscript}"
            </motion.p>
          )}

          {!isListening && !currentTranscript && (
            <p className="max-w-sm text-[13px] text-[#55575F]">
              Try: "Build authentication module with JWT, cookies, React page, and Tailwind"
            </p>
          )}
        </GlassCard>

        <PageSection label="Build history" delay={0.1}>
          <div className="space-y-4">
            {commands.map((cmd, i) => (
              <motion.div
                key={cmd.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
              >
                <GlassCard>
                  <div className="mb-3 flex items-start justify-between">
                    <p className="text-[13.5px] text-[#F4F3EF]">"{cmd.transcript}"</p>
                    {cmd.status === "complete" ? (
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-[#22A67D]" />
                    ) : (
                      <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-[#8B7FE8]" />
                    )}
                  </div>
                  {cmd.status === "building" && (
                    <p className="text-[12px] text-[#8B7FE8]">Building modules...</p>
                  )}
                  {cmd.output && (
                    <div className="flex items-start gap-2 rounded-lg border border-[#22A67D]/20 bg-[#22A67D]/[0.06] p-3">
                      <Code2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#22A67D]" />
                      <p className="text-[13px] text-[#F4F3EF]">{cmd.output}</p>
                    </div>
                  )}
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </PageSection>
      </div>
    </AppShell>
  );
}
