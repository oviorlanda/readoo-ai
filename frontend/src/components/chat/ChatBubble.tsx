import React from 'react';
import type { ChatMessage } from '../../types';

interface ChatBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  isStreaming = false,
}) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={isUser ? 'message-bubble-user' : 'message-bubble-ai'}>
        <p className="whitespace-pre-wrap">
          {message.content || (isStreaming ? '...' : '')}
        </p>
      </div>
    </div>
  );
};
