import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, SkipForward } from "lucide-react";
import { Button } from "./Button";

export interface WalkthroughStep {
  target: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
}

interface WalkthroughTooltipProps {
  steps: WalkthroughStep[];
  currentStep: number;
  onNext: () => void;
  onSkip: () => void;
  onClose: () => void;
  targetPositions: Map<string, { top: number; left: number; width: number; height: number }>;
}

export function WalkthroughTooltip({
  steps,
  currentStep,
  onNext,
  onSkip,
  onClose,
  targetPositions,
}: WalkthroughTooltipProps) {
  const currentStepData = steps[currentStep];
  const targetPos = targetPositions.get(currentStepData.target);

  if (!targetPos) return null;

  const isLastStep = currentStep === steps.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 pointer-events-none"
      >
        {/* Highlight overlay */}
        <div className="absolute inset-0 bg-black/10" />

        {/* Highlighted element */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute border-2 border-[#8B7FE8] rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] pointer-events-none"
          style={{
            top: targetPos.top - 4,
            left: targetPos.left - 4,
            width: targetPos.width + 8,
            height: targetPos.height + 8,
          }}
        />

        {/* Tooltip card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="absolute pointer-events-auto"
          style={{
            top: targetPos.top + targetPos.height + 16,
            left: targetPos.left,
            maxWidth: Math.min(320, window.innerWidth - 32),
          }}
        >
          <div className="p-5 bg-white rounded-lg border border-[#8B7FE8]/30 shadow-2xl">
            {/* Header with icon and close */}
            <div className="mb-3 flex items-center gap-3">
              {currentStepData.icon && (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#8B7FE8]/10 to-[#22A67D]/10">
                  <div className="text-[#8B7FE8]">
                    {currentStepData.icon}
                  </div>
                </div>
              )}
              <div className="flex-1">
                <div className="flex gap-1 mb-1">
                
                </div>
              </div>
              <button
                onClick={onClose}
                className="ml-auto text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="mb-4">
              <h3 className="mb-2 text-[15px] font-medium text-gray-900">
                {currentStepData.title}
              </h3>
              <p className="text-[13px] leading-relaxed text-gray-600">
                {currentStepData.description}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant="ghost"
                onClick={onSkip}
                className="flex-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <SkipForward className="h-3.5 w-3.5" />
                Skip tour
              </Button>
              <Button
                size="sm"
                variant='primary'
                onClick={onNext}
                className="flex-1 border-0"
              >
                {isLastStep ? (
                  "Finish"
                ) : (
                  <>
                    Next
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
