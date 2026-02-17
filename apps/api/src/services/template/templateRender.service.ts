/**
 * Handlebars template rendering service.
 *
 * Renders ReplyTemplate.body strings with supported variables.
 *
 * Supported variables:
 *   {{customer_name}}     - Customer display name (or "there" fallback)
 *   {{business_name}}     - Tenant name
 *   {{product_name}}      - Product name (from context)
 *   {{price}}             - Product price
 *   {{currency}}          - Product currency
 *   {{stock}}             - "In Stock" / "Out of Stock"
 *   {{order_id}}          - Order number
 *   {{hours}}             - Business hours summary
 *   {{location}}          - Business location
 *   {{shipping_policy}}   - TenantPolicies.shippingPolicy
 *   {{returns_policy}}    - TenantPolicies.returnPolicy
 *   {{agent_name}}        - Agent display name
 *   {{today_date}}        - Current date (locale-aware)
 *   {{today_time}}        - Current time (locale-aware)
 *   {{unsubscribe_text}}  - Standard opt-out footer text
 */

import Handlebars from 'handlebars';

// Register a safe helper that returns empty string for missing values
Handlebars.registerHelper('safe', (value: unknown) => {
  if (value === undefined || value === null || value === '') return '';
  return new Handlebars.SafeString(String(value));
});

export interface TemplateVariables {
  customer_name?: string;
  business_name?: string;
  product_name?: string;
  price?: string;
  currency?: string;
  stock?: string;
  order_id?: string;
  hours?: string;
  location?: string;
  shipping_policy?: string;
  returns_policy?: string;
  agent_name?: string;
  today_date?: string;
  today_time?: string;
  unsubscribe_text?: string;
  [key: string]: string | undefined;
}

// Cache compiled templates to avoid re-parsing on every message
const _compiledCache = new Map<string, Handlebars.TemplateDelegate>();

/**
 * Compile and render a Handlebars template body with the given variables.
 * Missing variables are silently replaced with empty strings.
 */
export function renderTemplate(body: string, variables: TemplateVariables): string {
  let compiled = _compiledCache.get(body);
  if (!compiled) {
    try {
      compiled = Handlebars.compile(body, { noEscape: true });
      _compiledCache.set(body, compiled);
    } catch {
      // If Handlebars fails to compile (e.g., malformed template), return as-is
      return body;
    }
  }

  // Fill in defaults for date/time if not provided
  const ctx: TemplateVariables = {
    customer_name: 'there',
    business_name: '',
    unsubscribe_text: 'Reply STOP to unsubscribe.',
    ...variables,
  };

  try {
    return compiled(ctx);
  } catch {
    return body;
  }
}

/**
 * Build the standard template variable set from available context data.
 * Call this before renderTemplate to prepare all variables.
 */
export function buildVariables(opts: {
  customerName?: string | null;
  businessName?: string;
  timezone?: string;
  locale?: string;
  shippingPolicy?: string | null;
  returnPolicy?: string | null;
  businessHours?: Record<string, { open: string; close: string }> | null;
  location?: string;
  agentName?: string;
  // Product context
  productName?: string;
  price?: string | number;
  currency?: string;
  inStock?: boolean;
  // Order context
  orderId?: string;
}): TemplateVariables {
  const timezone = opts.timezone || 'UTC';
  const locale = opts.locale || 'en-US';

  const now = new Date();
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeFormatter = new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
  });

  // Build human-readable business hours string
  let hoursStr = '';
  if (opts.businessHours) {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const lines: string[] = [];
    for (const day of days) {
      const h = opts.businessHours[day];
      if (h) {
        lines.push(`${day.charAt(0).toUpperCase() + day.slice(1)}: ${h.open}–${h.close}`);
      }
    }
    hoursStr = lines.join(', ');
  }

  return {
    customer_name: opts.customerName || 'there',
    business_name: opts.businessName || '',
    shipping_policy: opts.shippingPolicy || '',
    returns_policy: opts.returnPolicy || '',
    hours: hoursStr,
    location: opts.location || '',
    agent_name: opts.agentName || 'our team',
    today_date: dateFormatter.format(now),
    today_time: timeFormatter.format(now),
    product_name: opts.productName || '',
    price: opts.price !== undefined ? String(opts.price) : '',
    currency: opts.currency || 'USD',
    stock: opts.inStock !== undefined ? (opts.inStock ? 'In Stock' : 'Out of Stock') : '',
    order_id: opts.orderId || '',
    unsubscribe_text: 'Reply STOP to unsubscribe.',
  };
}
