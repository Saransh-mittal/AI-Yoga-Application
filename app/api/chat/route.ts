// app/api/chat/route.ts
// Enhanced Chat API with User Model Selection - UPDATED
// File Location: app/api/chat/route.ts (REPLACE EXISTING)
//
// KEY CHANGE: Creates agents dynamically using user's selected model
// ARCHITECTURE: Triage uses fixed model, specialized agents use user's choice

import { NextRequest, NextResponse } from 'next/server';
import { run } from '@openai/agents';
import {
  createTriageAgent,
  createYogaGuideAgent,
  createVoiceCustomizationAgent,
  createSettingsControlAgent,
  YogaAgentContext,
  isVoiceCustomizationOutput,
  isSettingsControlOutput,
} from '@/lib/agents/yogaAgents';
import {
  checkForAmbiguity,
  formatClarificationForFrontend,
} from '@/lib/agents/clarificationAgent';
import { AIModel } from '@/models/types';

/**
 * Enhanced Chat API with Dynamic Model Support
 *
 * LEARNING NOTE: This demonstrates the Factory Pattern in action:
 * - Triage agent stays efficient with fixed model
 * - Specialized agents use user's model choice
 * - Clean separation of routing logic and content generation
 *
 * ARCHITECTURE BENEFITS:
 * 1. Cost optimization (fast routing, quality responses)
 * 2. User control (respects model preferences)
 * 3. Maintainability (agent creation logic centralized)
 *
 * FLOW:
 * 1. Extract user's model preference from request
 * 2. Create specialized agents with that model
 * 3. Create triage agent with those specialized agents
 * 4. Run workflow with user's preferences respected
 */
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ type: 'error', message: 'Unauthorized' }, { status: 401 });
  }

  // Rate limiting (e.g., 30 requests per minute per user)
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const rateLimitResult = rateLimit(`${session.user?.email || ip}-chat`, 30, 60 * 1000);
  
  if (!rateLimitResult.success) {
    return NextResponse.json({ type: 'error', message: 'Too many requests' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const {
      userMessage,
      conversationHistory,
      currentMessages,
      currentSettings,
      model, // NEW: Extract user's selected model
      clarificationResponse,
    } = body;

    if (!userMessage || !currentMessages || !currentSettings) {
      return NextResponse.json(
        {
          type: 'error',
          message: 'Missing required fields: userMessage, currentMessages, or currentSettings',
        },
        { status: 400 }
      );
    }

    // Validate and default the model
    const userModel: AIModel = model || 'gpt-5-nano';
    console.log(`🎯 User selected model: ${userModel}`);

    // Set agent context (unchanged)
    const agentContext: YogaAgentContext = {
      currentMessages,
      currentSettings,
      conversationHistory,
      userLanguage: 'en',
    };

    // ========================================================================
    // STEP 1: Handle Clarification Response (unchanged)
    // ========================================================================

    if (clarificationResponse) {
      console.log('✅ Processing clarification response:', clarificationResponse.selectedOptionId);

      const { confirmedAction } = clarificationResponse;

      if (confirmedAction.type === 'update_settings') {
        return NextResponse.json({
          type: 'update_settings',
          settings: confirmedAction.payload,
          explanation: `I've updated your settings as requested.`,
        });
      }

      if (confirmedAction.type === 'update_messages') {
        return NextResponse.json({
          type: 'update_messages',
          instructions: confirmedAction.payload,
          explanation: `I've updated your voice guidance as requested.`,
        });
      }
    }

    // ========================================================================
    // STEP 2: Check for Ambiguity (uses fixed gpt-5-mini)
    // ========================================================================

    console.log('🔍 Checking for ambiguous request...');

    const ambiguityCheck = await checkForAmbiguity(
      userMessage,
      currentSettings
      // Note: Clarification always uses gpt-5-mini for consistent, fast detection
    );

    if (ambiguityCheck.needsClarification) {
      console.log('❓ Ambiguous request detected, requesting clarification');
      console.log('   Reasoning:', ambiguityCheck.reasoning);

      const clarificationRequest = formatClarificationForFrontend(
        ambiguityCheck,
        userMessage
      );

      if (clarificationRequest) {
        return NextResponse.json({
          type: 'clarification_needed',
          clarification: clarificationRequest,
        });
      }
    }

    console.log('✅ Request is clear, proceeding to agents...');

    // ========================================================================
    // STEP 3: CREATE AGENTS WITH USER'S MODEL (NEW!)
    // ========================================================================

    console.log(`🏭 Creating specialized agents with model: ${userModel}`);

    /**
     * Factory Pattern in Action:
     *
     * Each specialized agent is created with the user's selected model.
     * This ensures responses match the quality level the user expects.
     *
     * PERFORMANCE NOTE: Agent creation is lightweight - the model name
     * is just a string parameter. No actual model loading happens here.
     */
    const specializedAgents = {
      settingsAgent: createSettingsControlAgent(userModel, agentContext),
      voiceAgent: createVoiceCustomizationAgent(userModel, agentContext),
      yogaAgent: createYogaGuideAgent(userModel, agentContext),
    };

    /**
     * Create Triage Agent with Specialized Agents
     *
     * CRITICAL: The triage agent uses a fixed efficient model (gpt-5-mini)
     * because routing doesn't benefit from higher quality models.
     *
     * The specialized agents (handoffs) use the user's model, so when
     * triage hands off control, the response is generated with the
     * user's preferred quality/speed trade-off.
     */
    const triageAgent = createTriageAgent(specializedAgents);

    console.log('✅ Agents created successfully');
    console.log(`   - Triage: gpt-5-mini (fixed, efficient routing)`);
    console.log(`   - Specialized agents: ${userModel} (user's choice)`);

    // ========================================================================
    // STEP 4: Run Agent Workflow (unchanged)
    // ========================================================================

    // IMPORTANT: Only send the current message to the triage agent.
    // Conversation history was drowning the routing signal and biasing
    // the triage toward whichever agent handled the previous turn.
    // The @openai/agents SDK automatically passes conversation context
    // to the specialized agent on handoff.
    console.log('🤖 Running agent workflow...');

    const result = await run(triageAgent, userMessage);

    console.log('✅ Agent workflow completed');

    const agentName = result.lastAgent?.name || 'Unknown';
    const output = result.finalOutput;

    // Structured diagnostic log for routing decisions
    console.log(JSON.stringify({
      event: 'triage_result',
      userMessage: userMessage.substring(0, 120),
      routedTo: agentName,
      outputType: typeof output,
      isStructuredOutput: typeof output === 'object' && output !== null,
      userModel,
    }));

    // ========================================================================
    // SAFETY CHECK: Detect Triage Agent Output (unchanged)
    // ========================================================================

    if (agentName === 'Triage Agent') {
      console.warn('⚠️  Triage Agent produced output instead of handing off');

      const outputStr = typeof output === 'string' ? output.toLowerCase() : '';
      const isHandoffMessage =
        outputStr.includes('handoff') ||
        outputStr.includes('routing') ||
        outputStr.includes('transferring') ||
        outputStr.includes('forwarding');

      if (isHandoffMessage) {
        return NextResponse.json({
          type: 'error',
          message: 'I had trouble processing your request. Could you please try asking again?',
        });
      }
    }

    // ========================================================================
    // Handle Agent Responses (unchanged)
    // ========================================================================

    if (agentName === 'Settings Control Agent') {
      if (isSettingsControlOutput(output)) {
        console.log('⚙️  Settings update requested (structured output)');

        return NextResponse.json({
          type: output.type,
          settings: output.settings,
          explanation: output.explanation,
        });
      } else {
        console.error('❌ Settings Control output validation failed');

        return NextResponse.json({
          type: 'chat',
          message: 'I had trouble updating the settings. Could you rephrase your request?',
        });
      }
    }

    if (agentName === 'Voice Customization Agent') {
      if (isVoiceCustomizationOutput(output)) {
        console.log('🎤 Voice instructions updated (structured output)');

        return NextResponse.json({
          type: output.type,
          instructions: output.instructions,
          explanation: output.explanation,
        });
      } else {
        console.error('❌ Voice Customization output validation failed');

        return NextResponse.json({
          type: 'chat',
          message: 'I had trouble updating the voice guidance. Could you rephrase your request?',
        });
      }
    }

    if (agentName === 'Yoga Guide Agent' || agentName === 'Boundary Agent') {
      console.log(`💬 Response from ${agentName}`);

      const messageText = typeof output === 'string'
        ? output
        : 'I received your message but had trouble processing it.';

      return NextResponse.json({
        type: 'chat',
        message: messageText,
      });
    }

    // ========================================================================
    // Handle Unexpected Cases (unchanged)
    // ========================================================================

    console.warn('⚠️  Unexpected agent:', agentName);

    const fallbackMessage = typeof output === 'string'
      ? output
      : 'I received your message but had trouble processing it. Could you try rephrasing?';

    return NextResponse.json({
      type: 'chat',
      message: fallbackMessage,
    });

  } catch (error) {
    console.error('❌ Agent workflow error:', error);

    const errorMessage = error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      {
        type: 'error',
        message: 'Sorry, I encountered an error processing your request. Please try again.',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}
