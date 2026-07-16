import { useEffect, useRef, useState, useCallback, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  MicOff,
  Loader2,
  Code2,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Download,
  Copy,
  Check,
  Folder,
  Package,
} from "lucide-react";
import { AppShell } from "../components/AppShell";
import { GlassCard } from "../components/ui/GlassCard";
import { PageSection } from "../components/ui/PageSection";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  setListening,
  setCurrentTranscript,
  clearError,
} from "../store/slices/voiceSlice";
import { generateVoiceCommand, getVoiceHistory } from "../services/voice";

// ---- Types matching the backend response shape ----
export interface GeneratedFile {
  path: string;
  language: string;
  content: string;
}

// Extend your existing VoiceCommand type (in voiceSlice types) with:
//   output?: string;
//   generatedFiles?: GeneratedFile[];

// ---- Speech recognition types (same as before) ----
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultLike[] & { length: number };
}
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
}

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

// ---- File tree helpers ----
type TreeNode = {
  name: string;
  path: string;
  isFile: boolean;
  children: TreeNode[];
};

function buildTree(files: GeneratedFile[]): TreeNode {
  const root: TreeNode = { name: "root", path: "", isFile: false, children: [] };
  for (const file of files) {
    const parts = file.path.split("/");
    let current = root;
    parts.forEach((part, idx) => {
      const isFile = idx === parts.length - 1;
      const existingPath = parts.slice(0, idx + 1).join("/");
      let next = current.children.find((c) => c.name === part && c.isFile === isFile);
      if (!next) {
        next = { name: part, path: existingPath, isFile, children: [] };
        current.children.push(next);
      }
      current = next;
    });
  }
  return root;
}

function downloadFile(file: GeneratedFile) {
  const blob = new Blob([file.content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.path.split("/").pop() || "file.txt";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function downloadAllAsZip(files: GeneratedFile[], zipName: string) {
  
}

// ---- File tree UI ----
function FileTreeNode({
  node,
  depth,
  activePath,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  activePath: string | null;
  onSelect: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  if (node.isFile) {
    const active = node.path === activePath;
    return (
      <button
        onClick={() => onSelect(node.path)}
        className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px] transition-colors ${
          active
            ? "bg-[#8B7FE8]/15 text-[#F4F3EF]"
            : "text-[#94969E] hover:bg-white/5 hover:text-[#F4F3EF]"
        }`}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
      >
        <FileCode className="h-3.5 w-3.5 flex-shrink-0 text-[#8B7FE8]" />
        <span className="truncate">{node.name}</span>
      </button>
    );
  }

  return (
    <div>
      {depth > 0 && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px] text-[#94969E] hover:bg-white/5"
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
        >
          <Folder stroke="#D88A00" fill="#F6B73C" className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate">{node.name}</span>
        </button>
      )}
      {expanded &&
        node.children
          .sort((a, b) => (a.isFile === b.isFile ? a.name.localeCompare(b.name) : a.isFile ? 1 : -1))
          .map((child) => (
            <FileTreeNode
              key={child.path + child.name}
              node={child}
              depth={depth + 1}
              activePath={activePath}
              onSelect={onSelect}
            />
          ))}
    </div>
  );
}

// ---- Generated files panel (per build) ----
function GeneratedFilesPanel({ files, buildId }: { files: GeneratedFile[]; buildId: string }) {
  const [activePath, setActivePath] = useState<string | null>(files[0]?.path ?? null);
  const [copied, setCopied] = useState(false);

  const activeFile = files.find((f) => f.path === activePath) || files[0];
  const tree = buildTree(files);

  const handleCopy = async () => {
    if (!activeFile) return;
    try {
      await navigator.clipboard.writeText(activeFile.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — ignore
    }
  };

  if (!files.length) return null;

  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-white/10">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-3 py-2">
        <div className="flex items-center gap-2 text-[12px] text-[#94969E]">
          <Code2 className="h-3.5 w-3.5" />
          <span>{files.length} file{files.length !== 1 ? "s" : ""} generated</span>
        </div>
       
      </div>

      <div className="flex" style={{ minHeight: 280, maxHeight: 420 }}>
        {/* File tree sidebar */}
        <div className="w-[220px] flex-shrink-0 overflow-y-auto border-r border-white/10 bg-black/20 p-2">
          <FileTreeNode node={tree} depth={0} activePath={activePath} onSelect={setActivePath} />
        </div>

        {/* Code viewer */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {activeFile && (
            <>
              <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5">
                <span className="truncate text-[11.5px] text-[#94969E]">{activeFile.path}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 rounded px-1.5 py-1 text-[11px] text-[#94969E] hover:bg-white/5 hover:text-[#F4F3EF]"
                  >
                    {copied ? (
                      <Check className="h-3 w-3 text-[#22A67D]" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    {copied ? "Copied" : "Copy"}
                  </button>
                  <button
                    onClick={() => downloadFile(activeFile)}
                    className="flex items-center gap-1 rounded px-1.5 py-1 text-[11px] text-[#94969E] hover:bg-white/5 hover:text-[#F4F3EF]"
                  >
                    <Download className="h-3 w-3" />
                    Save
                  </button>
                </div>
              </div>
              <pre className="flex-1 overflow-auto p-3 text-[12px] leading-relaxed text-[#D4D4D8]">
                <code>{activeFile.content}</code>
              </pre>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VoiceEngineer() {
  const dispatch = useAppDispatch();
  const { isListening, commands, currentTranscript, isGenerating, error } = useAppSelector((s) => s.voice);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalTranscriptRef = useRef("");
  const [micError, setMicError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    const SpeechRecognitionCtor = getSpeechRecognition();
    if (!SpeechRecognitionCtor) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) {
          finalTranscriptRef.current += text + " ";
        } else {
          interim += text;
        }
      }
      dispatch(setCurrentTranscript((finalTranscriptRef.current + interim).trim()));
    };

    recognition.onerror = (event: any) => {
      const code = event?.error ?? "unknown";
      if (code === "no-speech") return;
      setMicError(
        code === "not-allowed" || code === "permission-denied"
          ? "Microphone access was denied. Please allow mic permissions and try again."
          : `Speech recognition error: ${code}`
      );
      dispatch(setListening(false));
    };

    recognition.onend = () => {
      dispatch(setListening(false));
      const transcript = finalTranscriptRef.current.trim();
      if (transcript) {
        dispatch(setCurrentTranscript(transcript));
        dispatch(generateVoiceCommand({ transcript }));
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.abort();
    };
  }, [dispatch]);

  const toggleListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      setMicError("Speech recognition isn't supported in this browser. Try Chrome or Edge.");
      return;
    }

    if (isListening) {
      recognition.stop();
      return;
    }

    setMicError(null);
    finalTranscriptRef.current = "";
    dispatch(setCurrentTranscript(""));
    dispatch(setListening(true));

    try {
      recognition.start();
    } catch {
      setMicError("Couldn't start the microphone. Please try again.");
      dispatch(setListening(false));
    }
  }, [isListening, dispatch]);

  const loadVoiceHistory=async()=>{
    await dispatch(getVoiceHistory({userId : localStorage.getItem('userId') as string}))

  }

  useEffect(()=>{
    loadVoiceHistory()
  },[])

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => dispatch(clearError()), 5000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  useEffect(() => {
    if (micError) {
      const timer = setTimeout(() => setMicError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [micError]);

  const displayError = micError || error;

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
            disabled={isGenerating || !isSupported}
            animate={isListening ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 1.5, repeat: isListening ? Infinity : 0 }}
            className={`mb-6 flex h-24 w-24 items-center justify-center rounded-full border-2 transition-colors ${
              isListening || isGenerating
                ? "border-[#E0685F] bg-[#E0685F]/10"
                : "border-[#8B7FE8]/40 bg-gradient-to-br from-[#8B7FE8]/20 to-[#22A67D]/20 hover:border-[#8B7FE8]/60"
            } ${isGenerating || !isSupported ? "cursor-not-allowed opacity-70" : ""}`}
          >
            {isGenerating ? (
              <Loader2 className="h-10 w-10 animate-spin text-[#E0685F]" />
            ) : isListening ? (
              <MicOff className="h-10 w-10 text-[#E0685F]" />
            ) : (
              <Mic className="h-10 w-10 text-[#8B7FE8]" />
            )}
          </motion.button>

          <h3 className="mb-2 text-[16px] font-medium text-[#F4F3EF]">
            {!isSupported
              ? "Speech recognition not supported in this browser"
              : isGenerating
              ? "Generating implementation plan..."
              : isListening
              ? "Listening..."
              : "Tap to start speaking"}
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

          {displayError && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 flex items-center gap-2 rounded-lg border border-[#E0685F]/20 bg-[#E0685F]/[0.06] px-4 py-2"
            >
              <AlertCircle className="h-4 w-4 text-[#E0685F]" />
              <p className="text-[13px] text-[#E0685F]">{displayError}</p>
            </motion.div>
          )}

          {!isListening && !currentTranscript && !isGenerating && isSupported && (
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

                  <AnimatePresence>
                    {cmd.generatedFiles && cmd.generatedFiles.length > 0 && (
                      <GeneratedFilesPanel files={cmd.generatedFiles} buildId={cmd.id} />
                    )}
                  </AnimatePresence>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </PageSection>
      </div>
    </AppShell>
  );
}