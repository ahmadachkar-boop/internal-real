import React, { memo } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { getMessageStatusDisplay } from '../../messageStatusUtils';

// Memoized individual message bubble component
const MessageBubble = memo(({ msg, viewMode }) => {
  const isOwnMessage =
    (viewMode === 'navigator' && msg.sender === 'navigator') ||
    (viewMode === 'couch' && msg.sender === 'couch');

  const status = getMessageStatusDisplay(msg, viewMode);

  return (
    <div
      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          viewMode === 'navigator' && msg.sender === 'navigator'
            ? 'bg-blue-600 text-white'
            : viewMode === 'couch' && msg.sender === 'couch'
            ? 'bg-[#79F200] text-gray-900'
            : 'bg-white border border-gray-200 text-gray-900'
        }`}
      >
        <p className="text-xs font-semibold mb-1 opacity-70">
          {isOwnMessage
            ? 'You' + (viewMode === 'couch' ? ' (Couch)' : '')
            : msg.senderName}
        </p>
        <p className="text-sm">{msg.message}</p>
        <div className="flex items-center justify-between gap-2 mt-1">
          <p className="text-xs opacity-60">
            {msg.timestamp?.toLocaleTimeString()}
          </p>
          {status && (
            <span
              className={`text-xs ${status.color}`}
              title={status.tooltip}
            >
              {status.icon}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for optimal performance
  // Return true if props are equal (no re-render needed)
  return (
    prevProps.msg.id === nextProps.msg.id &&
    prevProps.msg.message === nextProps.msg.message &&
    prevProps.msg.sender === nextProps.msg.sender &&
    prevProps.msg.senderName === nextProps.msg.senderName &&
    prevProps.msg.status === nextProps.msg.status &&
    prevProps.msg.synced === nextProps.msg.synced &&
    prevProps.msg.error === nextProps.msg.error &&
    prevProps.viewMode === nextProps.viewMode
  );
});
MessageBubble.displayName = 'MessageBubble';

// Memoized messages container component
const MessagesDisplay = memo(({ messages, messagesEndRef, viewMode }) => {
  return (
    <div className="h-80 overflow-y-auto mb-4 space-y-3 p-4 bg-gray-50 rounded-xl">
      {messages.length === 0 ? (
        <p className="text-center text-gray-500 py-8">No messages yet</p>
      ) : (
        messages.map(msg => (
          <MessageBubble key={msg.id} msg={msg} viewMode={viewMode} />
        ))
      )}
      <div ref={messagesEndRef} />
    </div>
  );
});
MessagesDisplay.displayName = 'MessagesDisplay';

/**
 * Component for chat messaging between couch and navigators
 */
const ChatBox = ({
  selectedCar,
  messages,
  messagesEndRef,
  viewMode,
  isOtherTyping,
  newMessage,
  onMessageChange,
  onMessageBlur,
  onSendMessage,
  sendingMessage,
  isHistoricalView
}) => {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 sm:p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <MessageSquare size={20} />
        Messages with {viewMode === 'navigator' ? 'Couch' : `Car ${selectedCar}`}
      </h3>

      <MessagesDisplay
        messages={messages}
        messagesEndRef={messagesEndRef}
        viewMode={viewMode}
      />

      {/* Typing indicator */}
      {isOtherTyping && (
        <div className="text-xs text-gray-500 italic mb-2 px-4">
          {viewMode === 'navigator' ? 'Couch' : 'Navigator'} is typing...
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={onMessageChange}
          onKeyPress={(e) => e.key === 'Enter' && !isHistoricalView && onSendMessage()}
          onBlur={onMessageBlur}
          placeholder={isHistoricalView ? "Read-only mode" : "Type a message..."}
          disabled={isHistoricalView}
          className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        <button
          onClick={onSendMessage}
          disabled={sendingMessage || !newMessage.trim() || isHistoricalView}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {sendingMessage ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Send size={18} />
          )}
        </button>
      </div>
    </div>
  );
};

export default ChatBox;
