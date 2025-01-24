'use client';

import React, { useState } from 'react';
import { useChat } from 'ai/react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

//
// ──────────────────────────────────────────────────────────────────────────────────────────
//   >>> ChatSidebar <<<
// Shows a list of user messages in a collapsible sidebar
// ──────────────────────────────────────────────────────────────────────────────────────────
//
function ChatSidebar({
  isOpen,
  onToggle,
  messages
}: {
  isOpen: boolean;
  onToggle: () => void;
  messages: { id: string; content: string; role: string }[];
}) {
  return (
    <aside
      className={`
        ${isOpen ? 'w-64' : 'w-0'}
        overflow-hidden transition-all duration-300
        bg-gray-50 border-r border-gray-200
      `}
    >
      <div className="p-4 h-full flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-gray-700">Chat History</h2>
          </div>
          <button
            onClick={onToggle}
            aria-label="Toggle Sidebar"
            className="text-gray-500 hover:text-gray-700"
          >
            {isOpen ? '←' : '→'}
          </button>
        </div>

        {/* Chat History */}
        <div className="flex-1 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pr-1">
          {messages.length > 0 ? (
            messages
              // Filter out the assistant messages in the history list
              .filter((m) => m.role === 'user')
              .map((message) => (
                <div
                  key={message.id}
                  className="p-2 text-sm bg-white rounded-lg shadow-sm cursor-pointer hover:bg-gray-100 truncate"
                >
                  {message.content}
                </div>
              ))
          ) : (
            <p className="text-sm text-gray-500">No chat history yet</p>
          )}
        </div>
      </div>
    </aside>
  );
}

//
// ──────────────────────────────────────────────────────────────────────────────────────────
//   >>> MessageBubble <<<
// Renders a single message bubble. If it's from the assistant, we show it on the left;
// if it's from the user, on the right. We parse and display Markdown content.
// ──────────────────────────────────────────────────────────────────────────────────────────
//
function MessageBubble({
  message
}: {
  message: { id: string; role: string; content: string };
}) {
  const isAssistant = message.role === 'assistant';

  // Different background gradients for user vs. assistant
  const bubbleClasses = isAssistant
    ? 'bg-gradient-to-br from-gray-100 to-gray-50 text-gray-800'
    : 'bg-gradient-to-br from-[#09AC75] to-[#07885d] text-white';

  return (
    <motion.div
      key={message.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}
    >
      <div className={`max-w-[80%] p-4 rounded-2xl shadow-sm ${bubbleClasses}`}>
        <p className="text-xs font-medium mb-2 opacity-75">
          {isAssistant ? 'AI Assistant' : 'You'}
        </p>

        {/* 
          Render the message content as Markdown. 
          - remarkGfm allows tables, strikethrough, etc.
          - The "prose" classes come from @tailwindcss/typography for styling
        */}
        <div className="prose prose-sm prose-gray">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
    </motion.div>
  );
}

//
// ──────────────────────────────────────────────────────────────────────────────────────────
//   >>> Chat <<<
// Main component for the chat interface. Manages the sidebar, text input, example prompts,
// and displays streaming messages from the AI model.
// ──────────────────────────────────────────────────────────────────────────────────────────
//
export function Chat() {
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  // Simple event logging for debugging
  const logEvent = (event: string, data: Record<string, unknown> = {}) => {
    console.log({
      timestamp: new Date().toISOString(),
      event,
      ...data,
      level: 'INFO'
    });
  };

  // Error logging utility
  const logError = (error: Error, context: string) => {
    console.error({
      timestamp: new Date().toISOString(),
      context,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      level: 'ERROR'
    });
  };

  /**
   * `useChat` automatically handles streaming from the /api/chat endpoint.
   * As the assistant sends tokens, this hook updates `messages` with each chunk.
   * We'll see headings, bold text, etc. in real time, thanks to ReactMarkdown.
   */
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    onError: (error: Error) => {
      logError(error, 'chat_error');

      // Handle rate limit (429) or quota issues
      if (error.message.includes('429') || error.message.includes('quota')) {
        toast.error('Rate limit reached or insufficient quota. Please try again later.');
      } else {
        toast.error(error.message || 'Failed to send message');
      }
      setLoading(false);
    },
    onFinish: () => {
      logEvent('chat_completed', { messageCount: messages.length });
      setLoading(false);
    }
  });

  /**
   * Handler for form submission
   */
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return; // Avoid empty sends

    setLoading(true);
    logEvent('message_submit', { messageLength: input.length });

    try {
      await handleSubmit(e);
    } catch (error) {
      logError(error as Error, 'submit_error');
      toast.error('Failed to send message. Please try again.');
      setLoading(false);
    }
  };

  // Some example prompts for quick user input
  const examplePrompts = [
    'Should I hire Oussama Zeddam?',
    'How does blockchain work?',
    'Explain quantum computing',
    'What is machine learning?',
    'Describe neural networks'
  ];

  const handleExampleClick = (prompt: string) => {
    logEvent('example_prompt_clicked', { prompt });
    handleInputChange({ target: { value: prompt } } as React.ChangeEvent<HTMLInputElement>);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] max-w-6xl mx-auto bg-gray-50 rounded-lg shadow-sm">
      {/* Sidebar for user messages */}
      <ChatSidebar
        isOpen={isSidebarOpen}
        onToggle={() => setSidebarOpen(!isSidebarOpen)}
        messages={messages}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col p-6">
        {/* Messages Section */}
        <div className="flex-1 overflow-y-auto space-y-6 mb-6 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pr-4">
          <AnimatePresence>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
          </AnimatePresence>
        </div>

        {/* Input & Example Prompts */}
        <div className="space-y-4">
          {/* Chat Input Form */}
          <form
            onSubmit={onSubmit}
            className="relative flex gap-3 bg-white p-4 rounded-xl shadow-sm"
          >
            <input
              value={input}
              onChange={handleInputChange}
              placeholder="Type your message..."
              className="
                flex-1 p-3 bg-gray-50 border border-gray-200 rounded-lg
                focus:outline-none focus:ring-2 focus:ring-[#09AC75]
                focus:border-transparent text-gray-700 placeholder-gray-400
                transition-all duration-200
              "
              disabled={loading || isLoading}
            />
            <button
              type="submit"
              disabled={loading || isLoading || !input.trim()}
              className="
                px-6 py-3 bg-gradient-to-r from-[#09AC75] to-[#07885d] text-white font-medium
                rounded-lg hover:from-[#07885d] hover:to-[#067957]
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-200 shadow-sm hover:shadow
                flex items-center justify-center min-w-[100px]
              "
            >
              {(loading || isLoading) ? (
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Send'
              )}
            </button>
          </form>

          {/* Example Prompts */}
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <p className="text-sm font-medium text-gray-700 mb-3">Example Prompts</p>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
              {examplePrompts.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => handleExampleClick(prompt)}
                  className="
                    px-4 py-2 bg-gray-100 text-sm text-gray-700
                    border border-gray-200 rounded-lg
                    hover:bg-gray-200 hover:border-gray-300
                    whitespace-nowrap transition-all duration-200
                  "
                  disabled={loading || isLoading}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
