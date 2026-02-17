'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';

export default function InboxPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConv, setSelectedConv] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  useEffect(() => {
    loadInbox();
    loadStats();
  }, []);

  const loadInbox = async () => {
    try {
      const data = await api.getInboxConversations({ limit: 50 });
      setConversations(data.conversations || []);
    } catch (error) {
      console.error('Failed to load inbox:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await api.getInboxStats(user?.id);
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const loadConversation = async (conv: any) => {
    try {
      const data = await api.getConversation(conv.id);
      setSelectedConv(data);
      setMessages(data.messages || []);
      setMobileView('chat'); // Switch to chat view on mobile
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const sendReply = async () => {
    if (!selectedConv || !replyText.trim()) return;

    try {
      await api.sendAgentReply(selectedConv.id, replyText);
      setReplyText('');
      // Reload conversation
      await loadConversation(selectedConv);
    } catch (error) {
      console.error('Failed to send reply:', error);
    }
  };

  const assignToMe = async () => {
    if (!selectedConv || !user) return;

    try {
      await api.assignConversation(selectedConv.id, user.id);
      await loadConversation(selectedConv);
      await loadInbox();
    } catch (error) {
      console.error('Failed to assign:', error);
    }
  };

  const closeConv = async () => {
    if (!selectedConv) return;

    try {
      await api.closeConversation(selectedConv.id);
      setSelectedConv(null);
      setMessages([]);
      await loadInbox();
    } catch (error) {
      console.error('Failed to close:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-gray-600">Loading inbox...</div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header with stats */}
      <div className="border-b bg-white p-4">
        <h1 className="text-xl font-bold text-gray-900 md:text-2xl">Inbox</h1>
        {stats && (
          <div className="mt-2 flex flex-wrap gap-3 text-xs md:gap-4 md:text-sm">
            <div className="text-gray-600">
              Total: <span className="font-semibold">{stats.total}</span>
            </div>
            <div className="text-gray-600">
              Unassigned: <span className="font-semibold">{stats.unassigned}</span>
            </div>
            <div className="text-gray-600">
              My Assigned: <span className="font-semibold">{stats.myAssigned}</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Conversation List */}
        <div className={`w-full overflow-y-auto border-r bg-white md:w-80 ${
          mobileView === 'list' ? 'block' : 'hidden md:block'
        }`}>
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No conversations</div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => loadConversation(conv)}
                className={`cursor-pointer border-b p-4 hover:bg-gray-50 ${
                  selectedConv?.id === conv.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="font-medium text-gray-900">
                    {conv.customer?.name || conv.customer?.waId || 'Unknown'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {conv.status === 'needs_agent' && (
                      <span className="rounded bg-yellow-100 px-2 py-1 text-yellow-800">
                        Needs Agent
                      </span>
                    )}
                    {conv.status === 'agent' && (
                      <span className="rounded bg-green-100 px-2 py-1 text-green-800">
                        In Progress
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  {conv.messages?.[0]?.body?.substring(0, 60) || 'No messages'}
                </div>
                {conv.cases?.[0] && (
                  <div className="mt-1 text-xs text-gray-500">
                    Case: {conv.cases[0].subject?.substring(0, 40)}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Chat View */}
        <div className={`flex flex-1 flex-col bg-gray-50 ${
          mobileView === 'chat' ? 'block' : 'hidden md:block'
        }`}>
          {!selectedConv ? (
            <div className="flex flex-1 items-center justify-center text-gray-500">
              Select a conversation to view messages
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="border-b bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Mobile back button */}
                    <button
                      onClick={() => setMobileView('list')}
                      className="rounded-md p-2 text-gray-500 hover:bg-gray-100 md:hidden"
                      aria-label="Back to conversations"
                    >
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                    </button>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {selectedConv.customer?.name || selectedConv.customer?.waId}
                      </div>
                      <div className="text-sm text-gray-500">
                        {selectedConv.customer?.phone}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedConv.assignedToUserId !== user?.id && (
                      <button
                        onClick={assignToMe}
                        className="rounded bg-blue-600 px-3 py-2 text-xs text-white hover:bg-blue-700 md:px-3 md:py-1 md:text-sm"
                      >
                        Assign to Me
                      </button>
                    )}
                    <button
                      onClick={closeConv}
                      className="rounded bg-gray-600 px-3 py-2 text-xs text-white hover:bg-gray-700 md:px-3 md:py-1 md:text-sm"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 space-y-4 overflow-y-auto p-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.direction === 'outbound' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-md rounded-lg px-4 py-2 ${
                        msg.direction === 'outbound'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-900 shadow'
                      }`}
                    >
                      <div className="text-sm">{msg.body}</div>
                      <div
                        className={`mt-1 text-xs ${
                          msg.direction === 'outbound'
                            ? 'text-blue-100'
                            : 'text-gray-500'
                        }`}
                      >
                        {new Date(msg.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply Input */}
              <div className="border-t bg-white p-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendReply()}
                    placeholder="Type a message..."
                    className="flex-1 rounded-lg border px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none md:py-2"
                  />
                  <button
                    onClick={sendReply}
                    className="rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700 md:py-2"
                  >
                    Send
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
