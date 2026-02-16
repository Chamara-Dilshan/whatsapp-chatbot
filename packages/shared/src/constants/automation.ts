export const AUTOMATION_EVENT_TYPE = {
  CONVERSATION_NEEDS_AGENT: 'conversation.needs_agent',
  CONVERSATION_COMPLAINT_DETECTED: 'conversation.complaint_detected',
  CUSTOMER_OPTED_OUT: 'customer.opted_out',
  REPORT_DAILY_SUMMARY: 'report.daily_summary',
  CASE_RESOLVED: 'case.resolved',
  SLA_BREACH: 'sla.breach',
} as const;

export type AutomationEventType = (typeof AUTOMATION_EVENT_TYPE)[keyof typeof AUTOMATION_EVENT_TYPE];

export const AUTOMATION_EVENT_STATUS = {
  PENDING: 'pending',
  DISPATCHED: 'dispatched',
  DELIVERED: 'delivered',
  FAILED: 'failed',
} as const;

export type AutomationEventStatus = (typeof AUTOMATION_EVENT_STATUS)[keyof typeof AUTOMATION_EVENT_STATUS];
