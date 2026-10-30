import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, ThumbsDown, X, MessageSquare, Check, ArrowRight } from 'lucide-react';
import { toast } from './ui/Toast.js';

interface FeedbackPromptV4Props {
  onSwitchToClassic: () => void;
}

const STORAGE_KEY = 'repopulse_design_feedback_state';

export const FeedbackPromptV4: React.FC<FeedbackPromptV4Props> = ({ onSwitchToClassic }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [sentiment, setSentiment] = useState<'positive' | 'negative' | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    // Check if user has already submitted or dismissed the prompt
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return;
      }
      const isForced = new URLSearchParams(window.location.search).get('prompt') === 'true';
      if (isForced) {
        setIsVisible(true);
        return;
      }
      // Delay presentation slightly so it doesn't pop up immediately on first paint
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ dismissed: true, at: new Date().toISOString() }));
  };

  const handleSelectSentiment = (choice: 'positive' | 'negative') => {
    setSentiment(choice);
  };

  const handleSubmitFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        sentiment,
        comment: feedbackText.trim(),
        submittedAt: new Date().toISOString(),
      })
    );
    toast.success('Thank you for helping improve RepoPulse!');
    setTimeout(() => {
      setIsVisible(false);
    }, 2400);
  };

  const handleRevertToClassic = () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        sentiment: 'reverted_to_classic',
        comment: feedbackText.trim() || 'User switched back to classic view',
        submittedAt: new Date().toISOString(),
      })
    );
    setIsVisible(false);
    onSwitchToClassic();
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.96 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        role="region"
        aria-label="Design feedback prompt"
        className="fixed z-40 bottom-20 md:bottom-6 right-4 md:right-6 max-w-sm w-[calc(100vw-2rem)] md:w-84 bg-neutral-1 border border-neutral-5 rounded-md p-3.5 shadow-lg font-sans"
      >
        {isSubmitted ? (
          <div className="flex items-center gap-2.5 text-xs text-neutral-12 py-1 font-sans">
            <span className="flex size-5 items-center justify-center rounded-full bg-verdict-keep-bg text-verdict-keep-text">
              <Check size={12} strokeWidth={2.5} />
            </span>
            <span className="font-medium">Thanks for your feedback!</span>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-neutral-12">
                <MessageSquare size={14} className="text-neutral-9 shrink-0" />
                <span>How's the new design?</span>
              </div>
              <button
                type="button"
                onClick={handleDismiss}
                aria-label="Dismiss feedback prompt"
                className="size-7 flex items-center justify-center rounded-xs text-neutral-8 hover:text-neutral-12 hover:bg-neutral-3 transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            {sentiment === null ? (
              <div className="flex items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => handleSelectSentiment('positive')}
                  className="flex-1 flex items-center justify-center gap-1.5 h-9 px-3 text-xs font-medium rounded-xs border border-neutral-4 bg-neutral-2 hover:bg-neutral-3 hover:text-neutral-12 text-neutral-11 transition-all cursor-pointer touch-manipulation"
                >
                  <ThumbsUp size={13} className="text-verdict-keep-text" />
                  <span>Loving it</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectSentiment('negative')}
                  className="flex-1 flex items-center justify-center gap-1.5 h-9 px-3 text-xs font-medium rounded-xs border border-neutral-4 bg-neutral-2 hover:bg-neutral-3 hover:text-neutral-12 text-neutral-11 transition-all cursor-pointer touch-manipulation"
                >
                  <ThumbsDown size={13} className="text-verdict-retire-text" />
                  <span>Needs work</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitFeedback} className="space-y-2.5 animate-in fade-in duration-normal">
                <input
                  type="text"
                  autoFocus
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder={
                    sentiment === 'positive'
                      ? 'What are you enjoying most? (optional)'
                      : 'What could we improve? (optional)'
                  }
                  aria-label="Feedback comment"
                  className="w-full h-8 px-2.5 text-xs bg-neutral-2 border border-neutral-4 rounded-xs text-neutral-12 placeholder:text-neutral-8 focus:outline-none focus:border-neutral-12"
                />
                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={handleRevertToClassic}
                    className="text-[11px] text-neutral-8 hover:text-neutral-12 underline transition-colors cursor-pointer"
                  >
                    Switch to classic
                  </button>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSentiment(null)}
                      className="h-7 px-2 text-[11px] text-neutral-8 hover:text-neutral-12 rounded-xs transition-colors cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="h-7 px-3 text-[11px] font-medium bg-neutral-12 text-neutral-1 hover:bg-neutral-11 rounded-xs transition-colors cursor-pointer"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}
      </motion.aside>
    </AnimatePresence>
  );
};
