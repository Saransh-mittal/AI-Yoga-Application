// lib/agents/clarificationAgent.ts
// Clarification Agent with FIXED gpt-5-mini Model - UPDATED
// File Location: lib/agents/clarificationAgent.ts (REPLACE ENTIRE FILE)
//
// KEY CHANGE: Always uses gpt-5-mini for consistent, fast clarification
// REASONING: Ambiguity detection doesn't need expensive models

import { Agent, run } from '@openai/agents';
import { z } from 'zod';

// ============================================================================
// STRUCTURED OUTPUT SCHEMA
// ============================================================================

const ClarificationOutputSchema = z.object({
  needsClarification: z.boolean()
    .describe('Whether the request is ambiguous and needs clarification'),

  clarificationRequest: z.object({
    question: z.string()
      .describe('Clear question to ask the user'),
    context: z.string()
      .describe('Brief explanation of why we need clarification'),
    options: z.array(z.object({
      id: z.string()
        .describe('Unique identifier for this option'),
      label: z.string()
        .describe('Short label (e.g., "Increase breathing phase durations")'),
      description: z.string()
        .describe('Detailed explanation of what this option does'),
      icon: z.string().optional()
        .describe('Emoji or icon to represent this option'),
      settingsChanges: z.record(z.any()).optional()
        .describe('Settings changes for this option'),
    })),
  }).optional(),

  reasoning: z.string()
    .describe('Explanation of why this is or isn\'t ambiguous'),
});

type ClarificationOutput = z.infer<typeof ClarificationOutputSchema>;

// ============================================================================
// CLARIFICATION AGENT (FIXED MODEL)
// ============================================================================

/**
 * Clarification Agent - FIXED at gpt-5-mini
 *
 * ARCHITECTURE DECISION: Always use gpt-5-mini for clarification because:
 * 1. Ambiguity detection is a classification task (doesn't need creativity)
 * 2. Consistent model = predictable, reliable behavior
 * 3. Fast responses = better user experience
 * 4. Cost optimization (mini is sufficient for this task)
 *
 * LEARNING NOTE: Not every task needs the user's model selection
 * Some tasks benefit from having a fixed, optimized model
 */
const clarificationAgent = new Agent({
  name: 'Clarification Agent',
  model: 'gpt-5-mini', // FIXED MODEL - always mini

  instructions: `You are a clarification specialist for a breathing exercise app.

**APP ARCHITECTURE (CRITICAL - READ CAREFULLY):**

The app has these REAL features:
1. **Breathing Phases:** inhale, hold, exhale (each has a duration in seconds)
2. **Session Duration:** Total time for the practice (in minutes)
3. **Voice Guidance:** Voice prompts that play AT THE START of each phase
4. **Voice Speed:** How fast the voice speaks (0.5x to 2.0x)
5. **Mode:** Guided (with phases) or Simple (just timer)

**CRITICAL: What does NOT exist:**
- ❌ NO "pause after voice guidance" feature
- ❌ NO separate delays between voice and breathing
- ❌ Voice is synchronized with phases, not separate
- ❌ NO "gap between cycles" setting

**TIMING ARCHITECTURE:**
- Voice plays at phase START
- Phase duration controls how long you breathe
- "Pause" in breathing = hold phase duration
- "Slower breathing" = increase phase durations
- "Faster breathing" = decrease phase durations

**WHEN USER SAYS "PAUSE" OR "WAIT":**
They almost always mean ONE of these:
1. Increase HOLD phase (the pause between inhale/exhale)
2. Increase ALL phase durations (slower overall breathing)
3. Increase session duration (longer total time)

**NEVER suggest:**
- "Pause after voice guidance" (doesn't exist!)
- "Delay between voice prompts" (doesn't exist!)
- "Gap between voice and breathing" (doesn't exist!)

**AMBIGUOUS SCENARIOS TO CLARIFY:**

1. User says "pause" / "wait" / "break":
   → Ask: Do they want longer HOLD phase, or slower breathing overall?

2. User says "slower":
   → Ask: Slower breathing (phase durations) or slower voice speed?

3. User says "longer":
   → Ask: Longer session, longer phases, or longer hold specifically?

**RESPONSE FORMAT:**
Respond ONLY with valid JSON (no markdown):

{
  "needsClarification": true,
  "clarificationRequest": {
    "question": "What would you like to change?",
    "context": "I want to make sure I understand correctly.",
    "options": [
      {
        "id": "increase-hold",
        "label": "Increase hold phase duration",
        "description": "Make the pause between breaths longer (hold phase)",
        "icon": "⏸️",
        "settingsChanges": {
          "holdDuration": 7
        }
      },
      {
        "id": "slower-breathing",
        "label": "Make breathing slower overall",
        "description": "Increase all phase durations (inhale, hold, exhale)",
        "icon": "🫁",
        "settingsChanges": {
          "inhaleDuration": 7,
          "holdDuration": 7,
          "exhaleDuration": 7
        }
      }
    ]
  },
  "reasoning": "User said 'pause' which could mean longer hold or slower breathing"
}

**EXAMPLE GOOD OPTIONS:**

For "take a pause":
✅ Option 1: Increase hold phase to 7 seconds
✅ Option 2: Increase all phases by 2 seconds
✅ Option 3: Make session 5 minutes longer

For "slower":
✅ Option 1: Slower breathing (longer phases)
✅ Option 2: Slower voice speed (0.8x)

For "longer":
✅ Option 1: Longer session duration
✅ Option 2: Longer breathing phases

**EXAMPLE BAD OPTIONS (NEVER USE THESE):**
❌ "Pause after voice guidance" - doesn't exist!
❌ "Delay between voice prompts" - doesn't exist!
❌ "Gap between voice and breathing" - doesn't exist!

Always provide 2-3 options that correspond to REAL features in the app.
Make options friendly and non-technical.`,
});

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Check if user's request is ambiguous and needs clarification
 *
 * FIXED MODEL: Always uses gpt-5-mini regardless of user's model selection
 * This ensures consistent, fast, and reliable ambiguity detection
 *
 * @param userMessage - The user's request
 * @param currentSettings - Current app settings for context
 */
export async function checkForAmbiguity(
  userMessage: string,
  currentSettings: any
): Promise<ClarificationOutput> {
  const messageLower = userMessage.toLowerCase();

  console.log('🔍 Clarification check using fixed model: gpt-5-mini');

  // ========================================================================
  // STEP 1: Skip Voice Content Requests (ALWAYS)
  // ========================================================================

  const voiceContentKeywords = [
    'guidance', 'instructions', 'words', 'say', 'speak',
    'style', 'tone', 'manner', 'approach',
    'vitality', 'healing', 'calm', 'peace', 'energy',
    'spiritual', 'mindful', 'divine', 'prana',
    'stress release', 'like ravi', 'like deepak', 'like tony',
    'ravishankar', 'ravi shankar', 'chopra', 'robbins'
  ];

  const hasVoiceKeyword = voiceContentKeywords.some(keyword =>
    messageLower.includes(keyword)
  );

  if (hasVoiceKeyword) {
    console.log('✅ Voice content request - skipping clarification');
    return {
      needsClarification: false,
      reasoning: 'Voice instruction request - let agent handle it',
    };
  }

  // ========================================================================
  // STEP 2: Skip Clear Requests (ALWAYS)
  // ========================================================================

  const hasExactTiming = /\d+\s*(second|minute|hour|s|min|m|sec)\b/.test(messageLower);
  const hasExactSetting = /(hold|inhale|exhale|session)\s+(phase|duration|time|to)/.test(messageLower);
  const hasExactToggle = /(turn|switch|enable|disable|set)\s+(on|off|to)/.test(messageLower);

  if (hasExactTiming || hasExactSetting || hasExactToggle) {
    console.log('✅ Clear specific request - skipping clarification');
    return {
      needsClarification: false,
      reasoning: 'Request is specific and clear',
    };
  }

  // ========================================================================
  // STEP 3: Skip Questions
  // ========================================================================

  if (messageLower.includes('?') ||
      messageLower.startsWith('what') ||
      messageLower.startsWith('how') ||
      messageLower.startsWith('why') ||
      messageLower.startsWith('can') ||
      messageLower.startsWith('is')) {
    console.log('✅ Question detected - skipping clarification');
    return {
      needsClarification: false,
      reasoning: 'Question - let Yoga Guide handle it',
    };
  }

  // ========================================================================
  // STEP 4: Only Clarify TRULY Ambiguous Requests
  // ========================================================================

  const highlyAmbiguousWords = ['pause', 'slower', 'faster', 'longer', 'shorter'];
  const words = messageLower.split(/\s+/);

  const isSingleAmbiguousWord =
    words.length <= 2 &&
    highlyAmbiguousWords.some(word => messageLower.includes(word));

  if (!isSingleAmbiguousWord) {
    console.log('✅ Request has enough context - skipping clarification');
    return {
      needsClarification: false,
      reasoning: 'Request has sufficient context for agent to interpret',
    };
  }

  // ========================================================================
  // STEP 5: For truly ambiguous single words, ask agent
  // ========================================================================

  console.log('❓ Single ambiguous word detected, checking with gpt-5-mini...');

  const prompt = `
Analyze this user request:

User message: "${userMessage}"

Current settings:
- Mode: ${currentSettings.mode}
- Session: ${currentSettings.sessionDuration} min
- Inhale: ${currentSettings.inhaleDuration}s
- Hold: ${currentSettings.holdDuration}s
- Exhale: ${currentSettings.exhaleDuration}s
- Voice guidance: ${currentSettings.voiceGuidance ? 'on' : 'off'}

**CRITICAL INSTRUCTION:**

You should ONLY say clarification is needed if there are MULTIPLE reasonable interpretations that would lead to VERY DIFFERENT outcomes.

For example:
- "pause" could mean: (1) increase hold phase, (2) increase all phases, (3) longer session
  → Multiple very different interpretations → CLARIFY

- "make it better" could mean many things
  → But agent can interpret → NO CLARIFICATION

- "more time" could mean session or phases
  → Context usually clear → NO CLARIFICATION

**BE FORGIVING:**
- If there's ONE most likely interpretation → DON'T clarify
- If user's intent is somewhat clear → DON'T clarify
- If agent can make a reasonable guess → DON'T clarify

Only clarify if truly stuck between multiple equally-valid interpretations.

Respond with JSON:
{
  "needsClarification": true/false,
  "clarificationRequest": { ... } (only if needed),
  "reasoning": "explanation"
}
`;

  try {
    const result = await run(clarificationAgent, prompt);

    const responseText = typeof result.finalOutput === 'string'
      ? result.finalOutput
      : JSON.stringify(result.finalOutput);

    const cleanedResponse = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const parsed = JSON.parse(cleanedResponse);
    const validated = ClarificationOutputSchema.parse(parsed);

    // Extra validation: Ensure we have enough valid options
    if (validated.needsClarification && validated.clarificationRequest) {
      const optionCount = validated.clarificationRequest.options.length;

      if (optionCount < 2) {
        console.log('⚠️  Only 1 option provided, skipping clarification');
        return {
          needsClarification: false,
          reasoning: 'Not enough distinct options to warrant clarification',
        };
      }

      const validOptions = validated.clarificationRequest.options.filter(opt => {
        if (!opt.settingsChanges) return true;

        const keys = Object.keys(opt.settingsChanges);
        const validKeys = [
          'mode', 'sessionDuration', 'inhaleDuration', 'holdDuration',
          'exhaleDuration', 'voiceGuidance', 'phaseBeeps', 'voiceSpeed'
        ];

        return keys.every(key => validKeys.includes(key));
      });

      if (validOptions.length < 2) {
        console.log('⚠️  Not enough valid options, skipping clarification');
        return {
          needsClarification: false,
          reasoning: 'Invalid or insufficient options',
        };
      }

      validated.clarificationRequest.options = validOptions;
    }

    console.log(validated.needsClarification ? '❓ Clarification needed' : '✅ No clarification needed');

    return validated;

  } catch (error) {
    console.error('❌ Clarification check error:', error);

    return {
      needsClarification: false,
      reasoning: 'Error in clarification check, proceeding without clarification',
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function formatClarificationForFrontend(
  output: ClarificationOutput,
  originalPrompt: string
) {
  if (!output.needsClarification || !output.clarificationRequest) {
    return null;
  }

  return {
    question: output.clarificationRequest.question,
    context: output.clarificationRequest.context,
    originalPrompt,
    options: output.clarificationRequest.options.map(opt => ({
      id: opt.id,
      label: opt.label,
      description: opt.description,
      icon: opt.icon || '⚙️',
      action: {
        type: 'update_settings' as const,
        payload: opt.settingsChanges || {},
      },
    })),
  };
}
