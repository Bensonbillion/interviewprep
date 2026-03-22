"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface VoiceSampleProps {
  sessionId: string;
  answerType: string;
  aiContentSnapshot: string;
  stage: string;
  roleType: string;
  /** Pre-loaded existing voice sample (from page load query) */
  existingVersion?: string;
}

/**
 * "How would you say this?" prompt — collects user rewrites of AI answers.
 * Collapsed by default, expands to a textarea on click.
 * Persists via /api/feedback/voice-sample.
 */
export function VoiceSample({
  sessionId,
  answerType,
  aiContentSnapshot,
  stage,
  roleType,
  existingVersion,
}: VoiceSampleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState(existingVersion ?? "");
  const [saved, setSaved] = useState(!!existingVersion);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync if existingVersion changes (e.g. loaded after mount)
  useEffect(() => {
    if (existingVersion && !text) {
      setText(existingVersion);
      setSaved(true);
    }
  }, [existingVersion, text]);

  // Auto-grow textarea
  const autoGrow = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.max(120, ta.scrollHeight)}px`;
  }, []);

  useEffect(() => {
    if (isOpen) {
      autoGrow();
      textareaRef.current?.focus();
    }
  }, [isOpen, autoGrow]);

  const handleSave = async () => {
    const trimmed = text.trim();
    if (trimmed.length < 10 || isSaving) return;

    setIsSaving(true);
    try {
      await fetch("/api/feedback/voice-sample", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          answerType,
          aiContentSnapshot,
          userVersion: trimmed,
          stage,
          roleType,
        }),
      });
    } catch {
      // fire-and-forget
    }

    setSaved(true);
    setIsSaving(false);
    setShowConfirm(true);
    setTimeout(() => {
      setShowConfirm(false);
      setIsOpen(false);
    }, 1500);
  };

  // Already saved — show their version with edit option
  if (saved && !isOpen) {
    return (
      <div className="mt-4">
        <div className="bg-cream-50 border border-cream-300 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium text-warm-500 uppercase tracking-wide">
              Your version
            </span>
            <button
              onClick={() => { setIsOpen(true); setSaved(false); }}
              className="text-[12px] font-medium text-coral hover:text-coral-dark transition-colors"
            >
              Edit
            </button>
          </div>
          <p className="text-[14px] text-warm-800 leading-relaxed whitespace-pre-wrap">
            {text}
          </p>
        </div>
      </div>
    );
  }

  // Collapsed — show prompt button
  if (!isOpen) {
    return (
      <div className="mt-4">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="text-[13px] font-medium text-coral hover:text-coral-dark transition-colors"
        >
          ✍️ How would you say this?
        </button>
      </div>
    );
  }

  // Expanded — textarea
  return (
    <div className="mt-4">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => { setText(e.target.value); autoGrow(); }}
        placeholder="Put this answer in your own words..."
        className="w-full min-h-[120px] p-3 text-[15px] leading-relaxed text-warm-800 bg-cream-50 border border-cream-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-coral/20 focus:ring-offset-2 focus:border-transparent placeholder:text-warm-500"
      />
      <div className="flex items-center gap-3 mt-2">
        {showConfirm ? (
          <span className="text-[13px] font-medium text-green-600">Saved ✓</span>
        ) : (
          <button
            onClick={handleSave}
            disabled={text.trim().length < 10 || isSaving}
            className="px-4 py-1.5 text-sm font-medium text-white bg-coral hover:bg-coral-dark rounded-full transition-colors disabled:opacity-40"
          >
            {isSaving ? "Saving…" : "Save"}
          </button>
        )}
        <span className="text-[11px] text-warm-500">
          This helps us make future answers sound more like you
        </span>
      </div>
    </div>
  );
}
