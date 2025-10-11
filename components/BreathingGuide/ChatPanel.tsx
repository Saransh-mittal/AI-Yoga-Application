// components/BreathingGuide/ChatPanel.tsx
// Chat Panel with Voice Selection Support - ENHANCED
// File Location: components/BreathingGuide/ChatPanel.tsx (REPLACE ENTIRE FILE)
//
// NEW: Integrated voice selection modal
// NEW: Shows modal when applying voice instruction changes

'use client';

import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send, Loader2, Check, Settings as SettingsIcon, Mic, HelpCircle, Upload, Info, Clock, Timer, Volume2, Bell, Gauge, Play } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Message, VoicePreview, SettingsPreview, AIModel, BreathingSettings, MessagesConfig, VoiceLanguage, ClarificationRequest } from '@/models/types';
import { AI_MODEL_INFO } from '@/models/constants';
import { VoiceSelectionModal } from './VoiceSelectionModal';
import { VoicePackSummary } from '@/services/voicePackService';
import { ClarificationModal } from './ClarificationModal';

interface ChatPanelProps {
  messages: Message[];
  isThinking: boolean;
  inputMessage: string;
  aiModel: AIModel;
  currentSettings: BreathingSettings;
  currentInstructions: MessagesConfig;
  currentLanguage: VoiceLanguage;
  currentVoicePack: { id: string; name: string } | null;
  availableVoicePacks: VoicePackSummary[];
  showVoiceSelection: boolean;
  isApplyingVoice: boolean;
  pendingClarification?: {
    request: ClarificationRequest;
    messageId: string;
  } | null;
  onClarificationChoice?: (optionId: string) => void;
  onCancelClarification?: () => void;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  onModelChange: (model: AIModel) => void;
  onApplyPreview: (preview: VoicePreview | SettingsPreview, previewId: string) => void;
  onVoicePackSelected: (packId: string) => void;
  onCancelVoiceSelection: () => void;
  onVoiceUpload: (file: File, name: string) => void;
  onClose: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  isThinking,
  inputMessage,
  aiModel,
  currentSettings,
  currentInstructions,
  currentLanguage,
  currentVoicePack,
  availableVoicePacks,
  showVoiceSelection,
  isApplyingVoice,
  pendingClarification,
  onClarificationChoice,
  onCancelClarification,
  onInputChange,
  onSendMessage,
  onModelChange,
  onApplyPreview,
  onVoicePackSelected,
  onCancelVoiceSelection,
  onVoiceUpload,
  onClose,
}) => {
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showHelp, setShowHelp] = useState(false);
  const [showVoiceUpload, setShowVoiceUpload] = useState(false);
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [voiceName, setVoiceName] = useState('');

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVoiceFile(file);
      if (!voiceName) {
        const name = file.name.replace(/\.[^/.]+$/, '');
        setVoiceName(name);
      }
    }
  };

  const handleVoiceSubmit = () => {
    if (voiceFile && voiceName.trim()) {
      onVoiceUpload(voiceFile, voiceName.trim());
      setVoiceFile(null);
      setVoiceName('');
      setShowVoiceUpload(false);
    }
  };

  return (
    <>
      {/* Main Chat Panel */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
      />

      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed bottom-0 left-0 right-0 md:top-0 md:right-0 md:left-auto md:bottom-auto h-[70vh] md:h-screen w-full md:w-96 bg-white dark:bg-gray-900 z-50 flex flex-col rounded-t-2xl md:rounded-none shadow-2xl"
      >
        {/* Header - Same as before */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 shrink-0 relative overflow-hidden rounded-t-2xl md:rounded-none"
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          />

          <div className="flex items-center justify-between mb-2 relative z-10">
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Sparkles size={20} className="text-white" />
              </motion.div>
              <div>
                <h2 className="font-bold text-base text-white">AI Assistant</h2>
                <p className="text-xs text-white/80">Voice, Settings & Guidance</p>
              </div>
            </div>

            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowHelp(true)}
                className="hover:bg-white/20 p-2 rounded-full transition-all text-white"
                title="How to use AI chat"
              >
                <HelpCircle size={18} />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowVoiceUpload(true)}
                className="hover:bg-white/20 p-2 rounded-full transition-all text-white"
                title="Upload voice sample"
              >
                <Mic size={18} />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="hover:bg-white/20 p-2 rounded-full transition-all text-white"
              >
                <X size={20} />
              </motion.button>
            </div>
          </div>

          <div className="relative z-10">
            <label className="text-xs text-white/80 block mb-1">AI Model</label>
            <select
              value={aiModel}
              onChange={(e) => onModelChange(e.target.value as AIModel)}
              className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
            >
              {Object.entries(AI_MODEL_INFO).map(([key, info]) => (
                <option key={key} value={key} className="bg-purple-900 text-white">
                  {info.name} - {info.quality}
                </option>
              ))}
            </select>
            <div className="text-xs text-white/70 mt-1">
              {AI_MODEL_INFO[aiModel].warning}
            </div>
          </div>
        </motion.div>

        {/* Messages - Keeping existing implementation */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-800">
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center py-6 text-gray-500 dark:text-gray-400"
            >
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Sparkles className="mx-auto mb-3 text-purple-400" size={40} />
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-sm mb-2 font-medium"
              >
                Hi! I'm your AI assistant
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="text-xs px-4"
              >
                I can help you with:<br />
                <span className="text-purple-600 dark:text-purple-400 font-medium">
                  • Voice instructions<br />
                  • App settings<br />
                  • Voice speed<br />
                  • Yoga guidance
                </span>
              </motion.p>
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowHelp(true)}
                className="mt-3 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg text-xs font-medium flex items-center gap-2 mx-auto"
              >
                <Info size={14} />
                View Quick Guide
              </motion.button>
            </motion.div>
          )}

          {/* Rest of messages implementation - keeping existing code from previous ChatPanel.tsx */}
          <AnimatePresence mode="popLayout">
            {messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: msg.role === 'user' ? 50 : -50, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{
                  type: "spring",
                  damping: 20,
                  stiffness: 150,
                  delay: idx * 0.05,
                }}
              >
                <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className={`max-w-[85%] p-3 rounded-lg text-sm ${
                      msg.role === 'user'
                        ? 'bg-purple-600 text-white'
                        : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow'
                    }`}
                  >
                    <div className={`prose prose-sm max-w-none ${
                      msg.role === 'user'
                        ? 'prose-invert'
                        : 'dark:prose-invert prose-purple'
                    }`}>
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => (
                            <p className="mb-2 last:mb-0">{children}</p>
                          ),
                          ul: ({ children }) => (
                            <ul className="my-2 space-y-1 list-disc pl-4">{children}</ul>
                          ),
                          strong: ({ children }) => (
                            <strong className="font-bold">{children}</strong>
                          ),
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  </motion.div>
                </div>

                {/* Settings Preview - ENHANCED with context */}
{msg.preview && msg.preview.type === 'settings' && (() => {
  // Type guard: At this point we know it's SettingsPreview
  const settingsPreview = msg.preview as SettingsPreview;
  const changedSettings = settingsPreview.settings;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.2 }}
      className="mt-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3 space-y-3"
    >
      <div className="font-semibold text-xs text-blue-900 dark:text-blue-200 flex items-center gap-1">
        <motion.div
          animate={{ rotate: [0, 90, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <SettingsIcon size={14} />
        </motion.div>
        Settings Preview
      </div>

      {/* What's Changing (Highlighted) */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-2">
          📝 What's Changing:
        </p>
        {Object.entries(changedSettings)
          .filter(([_, value]) => value !== undefined && value !== null)
          .map(([key, value]) => {
            const label = key
              .replace(/([A-Z])/g, ' $1')
              .trim()
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(' ');

            const getIcon = () => {
              if (key === 'sessionDuration') return <Clock size={14} />;
              if (key.includes('Duration')) return <Timer size={14} />;
              if (key === 'voiceGuidance') return <Volume2 size={14} />;
              if (key === 'phaseBeeps') return <Bell size={14} />;
              if (key === 'voiceSpeed') return <Gauge size={14} />;
              if (key === 'mode') return <Play size={14} />;
              return <SettingsIcon size={14} />;
            };

            const getColor = () => {
              if (key === 'sessionDuration') return 'text-purple-600 dark:text-purple-400';
              if (key === 'inhaleDuration') return 'text-blue-600 dark:text-blue-400';
              if (key === 'holdDuration') return 'text-indigo-600 dark:text-indigo-400';
              if (key === 'exhaleDuration') return 'text-green-600 dark:text-green-400';
              if (key === 'voiceGuidance') return 'text-orange-600 dark:text-orange-400';
              if (key === 'phaseBeeps') return 'text-amber-600 dark:text-amber-400';
              if (key === 'voiceSpeed') return 'text-pink-600 dark:text-pink-400';
              if (key === 'mode') return 'text-cyan-600 dark:text-cyan-400';
              return 'text-gray-600 dark:text-gray-400';
            };

            // Get current value for comparison
            const currentValue = currentSettings[key as keyof typeof currentSettings];

            let displayValue: string;
            let displayCurrentValue: string;

            if (typeof value === 'boolean') {
              displayValue = value ? '✓ On' : '✗ Off';
              displayCurrentValue = currentValue ? '✓ On' : '✗ Off';
            } else if (key === 'sessionDuration') {
              displayValue = value === 0 ? 'Continuous' : `${value} minutes`;
              displayCurrentValue = currentValue === 0 ? 'Continuous' : `${currentValue} minutes`;
            } else if (key.includes('Duration')) {
              displayValue = `${value} seconds`;
              displayCurrentValue = `${currentValue} seconds`;
            } else if (key === 'voiceSpeed') {
              displayValue = `${value}x speed`;
              displayCurrentValue = `${currentValue}x speed`;
            } else if (key === 'mode') {
              displayValue = value === 'guided' ? 'Guided Breathing' : 'Simple Timer';
              displayCurrentValue = currentValue === 'guided' ? 'Guided Breathing' : 'Simple Timer';
            } else {
              displayValue = String(value);
              displayCurrentValue = String(currentValue);
            }

            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 }}
                className="bg-white dark:bg-gray-800 rounded-lg p-2.5 border-2 border-blue-300 dark:border-blue-600 shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <div className={`shrink-0 ${getColor()}`}>
                    {getIcon()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-700 dark:text-gray-300 text-xs">
                      {label}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400 line-through">
                        {displayCurrentValue}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">→</span>
                      <span className={`${getColor()} font-semibold text-sm`}>
                        {displayValue}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
      </div>

      {/* Current Related Settings (Context) */}
      <div className="border-t border-blue-200 dark:border-blue-700 pt-3 mt-3">
        <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-2">
          📊 Other Current Settings:
        </p>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(currentSettings)
            // Filter out settings that are being changed
            .filter(([key]) => {
              const keyTyped = key as keyof typeof changedSettings;
              return !(keyTyped in changedSettings) || changedSettings[keyTyped] === undefined;
            })
            // Only show relevant settings
            .filter(([key]) => ['mode', 'sessionDuration', 'inhaleDuration', 'holdDuration', 'exhaleDuration', 'voiceGuidance', 'phaseBeeps', 'voiceSpeed'].includes(key))
            .map(([key, value]) => {
              const label = key
                .replace(/([A-Z])/g, ' $1')
                .trim()
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');

              let displayValue: string;

              if (typeof value === 'boolean') {
                displayValue = value ? '✓ On' : '✗ Off';
              } else if (key === 'sessionDuration') {
                displayValue = value === 0 ? 'Continuous' : `${value}min`;
              } else if (key.includes('Duration')) {
                displayValue = `${value}s`;
              } else if (key === 'voiceSpeed') {
                displayValue = `${value}x`;
              } else if (key === 'mode') {
                displayValue = value === 'guided' ? 'Guided' : 'Timer';
              } else {
                displayValue = String(value);
              }

              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="bg-gray-50 dark:bg-gray-800/50 rounded px-2 py-1.5 text-xs"
                >
                  <div className="text-gray-600 dark:text-gray-400 truncate">{label}</div>
                  <div className="text-gray-900 dark:text-gray-100 font-medium">{displayValue}</div>
                </motion.div>
              );
            })}
        </div>
      </div>

      {/* Helpful Context - Check if holdDuration is being changed */}
      {changedSettings.holdDuration !== undefined && (
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-2 mt-2">
          <div className="flex items-start gap-2">
            <div className="text-lg">💡</div>
            <div className="flex-1">
              <p className="text-xs text-purple-900 dark:text-purple-200">
                <strong>Tip:</strong> Hold phase is the "pause" between breaths.
                Current cycle: Inhale {currentSettings.inhaleDuration}s → Hold {changedSettings.holdDuration}s → Exhale {currentSettings.exhaleDuration}s
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Helpful Context - Check if all phases are being changed */}
      {changedSettings.inhaleDuration !== undefined &&
       changedSettings.holdDuration !== undefined &&
       changedSettings.exhaleDuration !== undefined && (
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-2 mt-2">
          <div className="flex items-start gap-2">
            <div className="text-lg">💡</div>
            <div className="flex-1">
              <p className="text-xs text-purple-900 dark:text-purple-200">
                <strong>Tip:</strong> New breathing cycle:
                Inhale {changedSettings.inhaleDuration}s → Hold {changedSettings.holdDuration}s → Exhale {changedSettings.exhaleDuration}s
                (Total: {(changedSettings.inhaleDuration + changedSettings.holdDuration + changedSettings.exhaleDuration) * 2}s per full cycle)
              </p>
            </div>
          </div>
        </div>
      )}

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onApplyPreview(msg.preview!, msg.previewId!)}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all shadow-sm"
      >
        <Check size={14} />
        Apply Settings
      </motion.button>
    </motion.div>
  );
})()}

                {/* Voice Preview */}
                {msg.preview && msg.preview.type === 'voice' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mt-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-3 space-y-2"
                  >
                    <div className="font-semibold text-xs text-purple-900 dark:text-purple-200 flex items-center gap-1">
                      <motion.div
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <Sparkles size={14} />
                      </motion.div>
                      Voice Preview:
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-white/50 dark:bg-gray-800/50 rounded p-2"
                      >
                        <div className="font-medium text-gray-700 dark:text-gray-300">Left Inhale:</div>
                        <div className="text-gray-600 dark:text-gray-400">"{msg.preview.instructions['left-inhale'][0]}"</div>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white/50 dark:bg-gray-800/50 rounded p-2"
                      >
                        <div className="font-medium text-gray-700 dark:text-gray-300">Hold:</div>
                        <div className="text-gray-600 dark:text-gray-400">"{msg.preview.instructions.hold[0]}"</div>
                      </motion.div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onApplyPreview(msg.preview!, msg.previewId!)}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Check size={14} />
                      Apply Changes
                    </motion.button>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {isThinking && (
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="flex justify-start"
            >
              <div className="bg-white dark:bg-gray-700 p-3 rounded-lg shadow">
                <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader2 size={16} />
                  </motion.div>
                  <motion.span
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="text-sm"
                  >
                    Thinking...
                  </motion.span>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input - Same as before */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-4 border-t dark:border-gray-700 bg-white dark:bg-gray-900 shrink-0"
        >
          <div className="flex gap-2">
            <motion.input
              whileFocus={{ scale: 1.02 }}
              type="text"
              value={inputMessage}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Try: 'slower voice' or '5 minute session'..."
              className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm transition-all"
              disabled={isThinking}
            />
            <motion.button
              whileHover={{ scale: 1.1, rotate: -10 }}
              whileTap={{ scale: 0.9, rotate: 10 }}
              onClick={onSendMessage}
              disabled={!inputMessage.trim() || isThinking}
              className="bg-purple-600 hover:bg-purple-700 text-white p-2.5 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Send size={18} />
            </motion.button>
          </div>
        </motion.div>
      </motion.div>

      {/* Voice Selection Modal (NEW) */}
      <VoiceSelectionModal
        isOpen={showVoiceSelection}
        currentVoicePack={currentVoicePack}
        availableVoicePacks={availableVoicePacks}
        isProcessing={isApplyingVoice}
        onSelect={onVoicePackSelected}
        onClose={onCancelVoiceSelection}
      />

      {/* NEW: Clarification Modal */}
      <ClarificationModal
        isOpen={!!pendingClarification}
        clarification={pendingClarification?.request || null}
        onSelect={(optionId) => {
          if (onClarificationChoice) {
            onClarificationChoice(optionId);
          }
        }}
        onCancel={() => {
          if (onCancelClarification) {
            onCancelClarification();
          }
        }}
      />

     {/* Help Modal (NEW) */}
      <AnimatePresence>
        {showHelp && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHelp(false)}
              className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-[90vw] max-w-lg max-h-[80vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <HelpCircle className="text-purple-600" size={24} />
                  How to Use AI Chat
                </h3>
                <button
                  onClick={() => setShowHelp(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
                <div>
                  <h4 className="font-semibold text-purple-600 dark:text-purple-400 mb-2">🎤 Voice Instructions</h4>
                  <div className="space-y-1 text-xs">
                    <p>• "make it shorter" → Concise instructions</p>
                    <p>• "use 2 words" → Ultra-brief guidance</p>
                    <p>• "more calming" → Peaceful tone</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-2">⚙️ App Settings</h4>
                  <div className="space-y-1 text-xs">
                    <p>• "5 minute session" → Duration change</p>
                    <p>• "box breathing" → 4-4-4 timing</p>
                    <p>• "simple mode" → Timer only</p>
                    <p>• "turn off beeps" → Disable sounds</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-orange-600 dark:text-orange-400 mb-2">⚡ Voice Pack Speed</h4>
                  <div className="space-y-1 text-xs">
                    <p>• "make My Voice faster" → Increase speed</p>
                    <p>• "slow down active voice" → Decrease speed</p>
                    <p>• "change speed to 1.5x" → Set specific speed</p>
                    <p>• "normal speed" → Reset to 1.0x</p>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-2 mt-2">
                    <p className="text-xs text-orange-800 dark:text-orange-200">
                      ⚠️ Speed changes regenerate all audio (~3 min)
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-orange-600 dark:text-orange-400 mb-2">🧘 Yoga Guidance</h4>
                  <div className="space-y-1 text-xs">
                    <p>• "benefits of pranayama?" → Learn more</p>
                    <p>• "how to breathe properly?" → Get tips</p>
                    <p>• "what is alternate nostril?" → Explanation</p>
                  </div>
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 mt-4">
                  <h4 className="font-semibold text-purple-900 dark:text-purple-200 mb-2 flex items-center gap-2">
                    <Mic size={16} />
                    Create Voice Pack
                  </h4>
                  <p className="text-xs text-purple-800 dark:text-purple-300">
                    Click the <Mic className="inline" size={14} /> button to upload your voice sample and create a personalized voice pack with AI-generated instructions!
                  </p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">💡 Pro Tips</h4>
                  <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
                    <li>• Use natural language - be conversational!</li>
                    <li>• Check previews before applying changes</li>
                    <li>• Combine requests: "10 min, slow voice, no beeps"</li>
                    <li>• Choose Nano model for speed, Full for quality</li>
                  </ul>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowHelp(false)}
                className="w-full mt-4 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-all"
              >
                Got it!
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Voice Upload Modal (NEW) */}
      <AnimatePresence>
        {showVoiceUpload && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowVoiceUpload(false)}
              className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-[90vw] max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Mic className="text-purple-600" size={24} />
                  Upload Voice Sample
                </h3>
                <button
                  onClick={() => setShowVoiceUpload(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
                    Voice Pack Name
                  </label>
                  <input
                    type="text"
                    value={voiceName}
                    onChange={(e) => setVoiceName(e.target.value)}
                    placeholder="e.g., My Calm Voice"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
                    Audio File (10+ seconds)
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-purple-500 transition-all"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="audio/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    {voiceFile ? (
                      <div className="flex items-center justify-center gap-2 text-purple-600 dark:text-purple-400">
                        <Check size={20} />
                        <span className="text-sm font-medium">{voiceFile.name}</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="mx-auto mb-2 text-gray-400" size={32} />
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Click to browse or drag & drop
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          MP3, WAV, or other audio format
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                  <p className="text-xs text-purple-800 dark:text-purple-300">
                    💡 <strong>Tip:</strong> Record 10-15 seconds of clear speech. Your voice will be cloned for breathing instructions at {currentSettings.voiceSpeed}x speed in {currentLanguage === 'hi' ? 'Hindi' : 'English'}!
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowVoiceUpload(false)}
                    className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleVoiceSubmit}
                    disabled={!voiceFile || !voiceName.trim()}
                    className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Create Voice Pack
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </>
  );
};
