// components/BreathingGuide/ClarificationModal.tsx
// NEW FILE: Elegant clarification UI
// Location: components/BreathingGuide/ClarificationModal.tsx
//
// PURPOSE: Shows clarification options when AI detects ambiguous requests
// DESIGN: Clean, friendly, non-intimidating interface

'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, X, CheckCircle, ChevronRight } from 'lucide-react';
import { ClarificationRequest } from '@/models/types';

interface ClarificationModalProps {
  isOpen: boolean;
  clarification: ClarificationRequest | null;
  onSelect: (optionId: string) => void;
  onCancel: () => void;
}

/**
 * Clarification Modal Component
 *
 * DESIGN PRINCIPLES:
 * - Clear, friendly language
 * - Visual hierarchy (icons, colors, spacing)
 * - Easy to understand options
 * - Non-technical explanations
 *
 * UX GOAL: Make users feel understood, not confused
 */
export const ClarificationModal: React.FC<ClarificationModalProps> = ({
  isOpen,
  clarification,
  onSelect,
  onCancel,
}) => {
  if (!isOpen || !clarification) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
        className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 relative overflow-hidden">
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />

            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{
                    rotate: [0, -10, 10, -10, 0],
                    scale: [1, 1.1, 1.1, 1.1, 1],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <HelpCircle className="text-white" size={28} />
                </motion.div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    Quick Clarification
                  </h3>
                  <p className="text-sm text-white/80">
                    Help me understand what you'd like to change
                  </p>
                </div>
              </div>

              <button
                onClick={onCancel}
                className="p-2 hover:bg-white/20 rounded-full transition-all text-white"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto flex-1">
            {/* Question */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border-2 border-blue-200 dark:border-blue-700">
                <p className="text-gray-800 dark:text-gray-200 text-base leading-relaxed">
                  {clarification.question}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  {clarification.context}
                </p>
              </div>
            </motion.div>

            {/* Options */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                What did you mean?
              </p>

              {clarification.options.map((option, index) => (
                <motion.button
                  key={option.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02, x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelect(option.id)}
                  className="w-full p-4 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 rounded-xl transition-all text-left group"
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                      {option.icon || '⚙️'}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-base">
                          {option.label}
                        </h4>
                        <ChevronRight
                          size={20}
                          className="text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-1 transition-all shrink-0"
                        />
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        {option.description}
                      </p>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Helpful Tip */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-6 bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4"
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl">💡</div>
                <div className="flex-1">
                  <p className="text-xs text-purple-900 dark:text-purple-200 font-semibold mb-1">
                    Pro Tip
                  </p>
                  <p className="text-xs text-purple-800 dark:text-purple-300">
                    Be specific in your requests! For example: "increase hold phase to 7 seconds"
                    or "make session 15 minutes" helps me understand exactly what you need.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Footer */}
          <div className="p-6 bg-gray-50 dark:bg-gray-900 border-t dark:border-gray-700">
            <button
              onClick={onCancel}
              className="w-full px-4 py-2.5 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
            >
              Cancel - I'll ask differently
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
