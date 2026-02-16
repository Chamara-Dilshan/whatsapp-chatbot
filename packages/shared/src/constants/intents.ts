export const INTENTS = {
  GREETING: 'greeting',
  PRODUCT_INQUIRY: 'product_inquiry',
  PRICE_INQUIRY: 'price_inquiry',
  AVAILABILITY_STOCK: 'availability_stock',
  ORDER_STATUS: 'order_status',
  DELIVERY_INFO: 'delivery_info',
  REFUND_CANCEL: 'refund_cancel',
  COMPLAINT: 'complaint',
  HOURS_LOCATION: 'hours_location',
  SPEAK_TO_HUMAN: 'speak_to_human',
  OPT_OUT: 'opt_out',
  OPT_IN: 'opt_in',
  OTHER: 'other',
} as const;

export type Intent = (typeof INTENTS)[keyof typeof INTENTS];

export const INTENT_LABELS: Record<Intent, string> = {
  [INTENTS.GREETING]: 'Greeting',
  [INTENTS.PRODUCT_INQUIRY]: 'Product Inquiry',
  [INTENTS.PRICE_INQUIRY]: 'Price Inquiry',
  [INTENTS.AVAILABILITY_STOCK]: 'Availability / Stock',
  [INTENTS.ORDER_STATUS]: 'Order Status',
  [INTENTS.DELIVERY_INFO]: 'Delivery Info',
  [INTENTS.REFUND_CANCEL]: 'Refund / Cancel',
  [INTENTS.COMPLAINT]: 'Complaint',
  [INTENTS.HOURS_LOCATION]: 'Hours / Location',
  [INTENTS.SPEAK_TO_HUMAN]: 'Speak to Human',
  [INTENTS.OPT_OUT]: 'Opt Out',
  [INTENTS.OPT_IN]: 'Opt In',
  [INTENTS.OTHER]: 'Other',
};
