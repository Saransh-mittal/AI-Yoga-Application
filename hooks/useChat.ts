// hooks/useChat.ts
// REPLACE EXISTING FILE
// Enhanced with clarification request handling

import { useState } from 'react';
import {
  Message,
  MessagesConfig,
  VoicePreview,
  SettingsPreview,
  AIModel,
  BreathingSettings,
  AISettingsUpdate,
  convertAISettingsToPartial,
  ClarificationRequest,
} from '@/models/types';
import { aiService } from '@/services/aiService';

/**
 * Enhanced Chat Hook with Clarification Flow
 *
 * NEW FEATURES:
 * - Handles clarification requests from AI
 * - Shows clarification options to user
 * - Sends confirmed choice back to API
 *
 * LEARNING NOTE: Multi-step user confirmation pattern
 * This ensures user intent is clear before taking action
 */
export const useChat = (
  currentMessages: MessagesConfig,
  currentSettings: BreathingSettings,
  aiModel: AIModel,
  onApplyVoicePreview: (
    instructions: MessagesConfig,
    packId: string,
    onProgress: (message: string) => void
  ) => Promise<void>,
  onApplySettingsPreview: (settings: Partial<BreathingSettings>) => void
) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [showVoiceSelection, setShowVoiceSelection] = useState<boolean>(false);
  const [pendingVoicePreview, setPendingVoicePreview] = useState<{
    preview: VoicePreview;
    previewId: string;
  } | null>(null);

  // NEW: Clarification state
  const [pendingClarification, setPendingClarification] = useState<{
    request: ClarificationRequest;
    messageId: string;
  } | null>(null);

  /**
   * Send message to AI
   *
   * ENHANCED: Can include clarification response if user made a choice
   */
  const sendMessage = async (
    userMessage: string,
    clarificationResponse?: {
      selectedOptionId: string;
      originalPrompt: string;
      confirmedAction: any;
    }
  ) => {
    setIsThinking(true);

    const userMsg: Message = {
      role: 'user',
      content: userMessage
    };

    setMessages(prev => [...prev, userMsg]);

    try {
      const conversationHistory = [...messages, userMsg]
        .filter(msg => !msg.preview)
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));

      const response = await aiService.sendMessage({
        userMessage,
        conversationHistory,
        currentMessages,
        currentSettings,
        model: aiModel,
        clarificationResponse, // NEW: Include clarification if present
      });

      // ====================================================================
      // NEW: Handle Clarification Request
      // ====================================================================

      if (response.type === 'clarification_needed' && response.clarification) {
        console.log('❓ Clarification needed, showing options to user');

        const messageId = Date.now().toString();

        // Add AI message with clarification question
        const aiMsg: Message = {
          role: 'assistant',
          content: `${response.clarification.question}\n\n${response.clarification.context}`,
        };

        setMessages(prev => [...prev, aiMsg]);

        // Store clarification request for later
        setPendingClarification({
          request: response.clarification,
          messageId,
        });

        setIsThinking(false);
        return;
      }

      // ====================================================================
      // Handle Settings Update (existing code)
      // ====================================================================

      if (response.type === 'update_settings' && response.settings) {
        const previewId = Date.now().toString();
        const explanation = response.explanation || 'I\'ve updated your app settings.';

        const convertedSettings = convertAISettingsToPartial(response.settings);

        const aiMsg: Message = {
          role: 'assistant',
          content: `Here's a preview of your new settings:\n\n${explanation}`,
          preview: {
            type: 'settings',
            settings: convertedSettings,
            explanation: explanation,
          },
          previewId,
        };
        setMessages(prev => [...prev, aiMsg]);
      }

      // ====================================================================
      // Handle Voice Update (existing code)
      // ====================================================================

      else if (response.type === 'update_messages' && response.instructions) {
        const previewId = Date.now().toString();
        const explanation = response.explanation || 'I\'ve updated the voice guidance.';

        const aiMsg: Message = {
          role: 'assistant',
          content: `Here's a preview of the new voice guidance:\n\n${explanation}`,
          preview: {
            type: 'voice',
            instructions: response.instructions,
            explanation: explanation,
          },
          previewId,
        };
        setMessages(prev => [...prev, aiMsg]);
      }

      // ====================================================================
      // Handle Regular Chat (existing code)
      // ====================================================================

      else if (response.type === 'chat' && response.message) {
        const aiMsg: Message = {
          role: 'assistant',
          content: response.message,
        };
        setMessages(prev => [...prev, aiMsg]);
      }

      // ====================================================================
      // Handle Error (existing code)
      // ====================================================================

      else if (response.type === 'error') {
        const aiMsg: Message = {
          role: 'assistant',
          content: `⚠️ ${response.message || 'An error occurred. Please try again.'}`,
        };
        setMessages(prev => [...prev, aiMsg]);
      }

      // ====================================================================
      // Unexpected Response
      // ====================================================================

      else {
        const aiMsg: Message = {
          role: 'assistant',
          content: '⚠️ Received an unexpected response. Please try rephrasing your request.',
        };
        setMessages(prev => [...prev, aiMsg]);
      }

    } catch (error) {
      console.error('Chat Error:', error);
      const errorMsg: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  /**
   * NEW: Handle clarification option selection
   *
   * FLOW:
   * 1. User selects an option from clarification UI
   * 2. Send confirmed choice back to API
   * 3. API processes the confirmed action
   */
  const handleClarificationChoice = async (optionId: string) => {
    if (!pendingClarification) return;

    const { request } = pendingClarification;
    const selectedOption = request.options.find(opt => opt.id === optionId);

    if (!selectedOption) {
      console.error('Selected option not found:', optionId);
      return;
    }

    // Clear clarification state
    setPendingClarification(null);

    // Add user's choice as a message
    const userChoice: Message = {
      role: 'user',
      content: selectedOption.label,
    };
    setMessages(prev => [...prev, userChoice]);

    // Send clarification response back to API
    await sendMessage(
      request.originalPrompt,
      {
        selectedOptionId: optionId,
        originalPrompt: request.originalPrompt,
        confirmedAction: selectedOption.action,
      }
    );
  };

  /**
   * Cancel clarification (user changed their mind)
   */
  const cancelClarification = () => {
    setPendingClarification(null);

    const cancelMsg: Message = {
      role: 'assistant',
      content: 'No problem! Feel free to ask me anything else.',
    };
    setMessages(prev => [...prev, cancelMsg]);
  };

  /**
   * Apply preview (existing code - unchanged)
   */
  const applyPreview = async (preview: VoicePreview | SettingsPreview, previewId: string) => {
    if (preview.type === 'settings') {
      setMessages(prev =>
        prev.map(msg =>
          msg.previewId === previewId
            ? {
                ...msg,
                content: `${msg.content}\n\n⏳ Applying changes...`,
              }
            : msg
        )
      );

      try {
        onApplySettingsPreview(preview.settings);

        setMessages(prev =>
          prev.map(msg =>
            msg.previewId === previewId
              ? {
                  ...msg,
                  preview: undefined,
                  content: `${preview.explanation}\n\n✅ Settings applied! Your changes are now active.`,
                }
              : msg
          )
        );
      } catch (error) {
        console.error('Failed to apply settings:', error);
        setMessages(prev =>
          prev.map(msg =>
            msg.previewId === previewId
              ? {
                  ...msg,
                  content: `${msg.content}\n\n❌ Failed to apply changes. Please try again.`,
                }
              : msg
          )
        );
      }
    } else if (preview.type === 'voice') {
      setPendingVoicePreview({ preview, previewId });
      setShowVoiceSelection(true);
    }
  };

  /**
   * Handle voice pack selection (existing code - unchanged)
   */
  const handleVoicePackSelected = async (packId: string) => {
    if (!pendingVoicePreview) return;

    const { preview, previewId } = pendingVoicePreview;

    setShowVoiceSelection(false);

    setMessages(prev =>
      prev.map(msg =>
        msg.previewId === previewId
          ? {
              ...msg,
              content: `${msg.content}\n\n⏳ Updating voice pack...`,
            }
          : msg
      )
    );

    try {
      await onApplyVoicePreview(
        preview.instructions,
        packId,
        (progressMessage) => {
          setMessages(prev =>
            prev.map(msg =>
              msg.previewId === previewId
                ? {
                    ...msg,
                    content: `${preview.explanation}\n\n⏳ ${progressMessage}`,
                  }
                : msg
            )
          );
        }
      );

      setMessages(prev =>
        prev.map(msg =>
          msg.previewId === previewId
            ? {
                ...msg,
                preview: undefined,
                content: `${preview.explanation}\n\n✅ Changes applied! Your new voice guidance is now active.`,
              }
            : msg
        )
      );
    } catch (error) {
      console.error('Failed to apply voice preview:', error);

      setMessages(prev =>
        prev.map(msg =>
          msg.previewId === previewId
            ? {
                ...msg,
                content: `${msg.content}\n\n❌ Failed to apply changes. Please try again.`,
              }
            : msg
        )
      );
    } finally {
      setPendingVoicePreview(null);
    }
  };

  const cancelVoiceSelection = () => {
    setShowVoiceSelection(false);
    setPendingVoicePreview(null);
  };

  return {
    messages,
    isThinking,
    showVoiceSelection,
    pendingClarification, // NEW: Expose clarification state
    sendMessage,
    applyPreview,
    handleVoicePackSelected,
    cancelVoiceSelection,
    handleClarificationChoice, // NEW: Handle user's choice
    cancelClarification, // NEW: Cancel clarification
  };
};
