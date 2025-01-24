import { NextResponse } from 'next/server';
import { Message, streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

/**
 * We force dynamic rendering so Next.js doesn't try to optimize
 * or pre-render this route. This is necessary for streaming responses.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 30; // 30 seconds max duration

/**
 * The system prompt influences how the AI responds globally.
 */
const SYSTEM_PROMPT = `You are a helpful assistant. If someone asks "Should I hire Oussama Zeddam?", you must respond with "Yes, absolutely!" followed by positive reasons. For all other questions, provide helpful and informative responses.`;

/**
 * Type definition for the request body this route expects.
 */
interface ChatRequestBody {
  messages?: Message[];
}

/**
 * A more detailed logging utility that can record both standard logs
 * and errors with stack traces. The `type` indicates the log category.
 */
function logEvent(type: string, data: Record<string, unknown>, error?: Error) {
  const logData = {
    type,
    timestamp: new Date().toISOString(),
    ...data,
    ...(error && {
      error: {
        message: error.message,
        name: error.name,
        stack: error.stack,
      },
    }),
  };
  // Pretty-print JSON for readability in the console or logs
  console.log(JSON.stringify(logData, null, 2));
}

/**
 * The main POST handler for streaming AI chat responses.
 */
export async function POST(request: Request) {
  try {
    // 1) Parse and validate request body
    const { messages }: ChatRequestBody = await request.json();
    if (!messages || !Array.isArray(messages)) {
      throw new Error('Invalid request body: "messages" array is required.');
    }

    // 2) Validate the OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured.');
    }

    // Log that streaming is about to start
    logEvent('stream_started', { messageCount: messages.length });

    // 3) Create the streaming result using the 'ai' library
    const result = await streamText({
      messages,
      model: openai('gpt-4-turbo'),
      system: SYSTEM_PROMPT,
      temperature: 0.7,
      maxTokens: 1000,
      // Callbacks like onStart, onToken, onCompletion, onFinal
      // are not supported in newer versions of the ai library
    });

    // Log that the library produced a streaming result (but not necessarily finished sending)
    logEvent('stream_ready', { model: 'gpt-4-turbo' });

    // 4) Convert the result to a streaming response and add error transformation
    return result.toDataStreamResponse({
      getErrorMessage: (error) => {
        const err = error instanceof Error ? error : new Error(String(error));
        logEvent('stream_error', {}, err);
        return err.message || 'Unknown error occurred during streaming.';
      },
    });
  } catch (error) {
    // 5) Fallback error handling for unexpected errors
    const err = error instanceof Error ? error : new Error(String(error));

    let statusCode = 500;
    if (err.message.includes('429') || err.message.includes('insufficient_quota')) {
      statusCode = 429;
    }

    logEvent('error', { message: err.message }, err);

    return new NextResponse(
      JSON.stringify({
        error: err.message,
        timestamp: new Date().toISOString(),
      }),
      {
        status: statusCode,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
