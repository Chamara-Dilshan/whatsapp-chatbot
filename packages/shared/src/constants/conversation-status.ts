export const CONVERSATION_STATUS = {
  BOT: 'bot',
  NEEDS_AGENT: 'needs_agent',
  AGENT: 'agent',
  CLOSED: 'closed',
} as const;

export type ConversationStatus = (typeof CONVERSATION_STATUS)[keyof typeof CONVERSATION_STATUS];
