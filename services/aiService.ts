// services/aiService.ts

import { APIRequest, APIResponse, AIModel, AISettingsUpdate  } from '@/models/types';

class AIService {
  /**
   * Send a chat message to the AI
   */
  async sendMessage(request: APIRequest): Promise<APIResponse> {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data: APIResponse = await response.json();

      // Type guard for settings response (existing)
      if (data.type === 'update_settings' && data.settings) {
        const settings = data.settings as AISettingsUpdate;
        return {
          ...data,
          settings,
        };
      }

      return data;
    } catch (error) {
      console.error('AI Service Error:', error);
      return {
        type: 'error',
        message: 'Failed to communicate with AI. Please try again.',
      };
    }
  }

  /**
   * Get token usage estimate (approximate)
   */
  estimateTokenUsage(
    userMessage: string,
    model: AIModel
  ): { estimated: number; costMultiplier: number } {
    // Rough estimation: 1 token ≈ 4 characters
    const baseTokens = Math.ceil(userMessage.length / 4) + 500; // +500 for system prompt

    const multipliers: Record<AIModel, number> = {
      'gpt-5-nano': 1,
      'gpt-5-mini': 2.5,
      'gpt-5': 15,
    };

    return {
      estimated: baseTokens,
      costMultiplier: multipliers[model],
    };
  }
}

// Export singleton instance
export const aiService = new AIService();
