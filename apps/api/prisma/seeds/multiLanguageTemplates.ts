/**
 * Multi-language reply template seeds.
 *
 * Seeds 12 intents × 2 languages (EN + SI) × 1 tone (FRIENDLY) = 24 templates.
 * Run with: ts-node prisma/seeds/multiLanguageTemplates.ts
 *
 * Safe to run multiple times — uses upsert.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TemplateSeed {
  intent: string;
  language: string;
  tone: string;
  name: string;
  body: string;
}

const TEMPLATES: TemplateSeed[] = [
  // ── GREETING ──────────────────────────────────────────────────────────────
  {
    intent: 'greeting',
    language: 'EN',
    tone: 'FRIENDLY',
    name: 'Greeting (EN)',
    body: 'Hi {{customer_name}}! 👋 Welcome to {{business_name}}. How can I help you today?',
  },
  {
    intent: 'greeting',
    language: 'SI',
    tone: 'FRIENDLY',
    name: 'Greeting (SI)',
    body: 'හෙලෝ {{customer_name}}! 👋 {{business_name}} වෙත සාදරයෙන් පිළිගනිමු. අද ඔබට කෙසේ සහාය විය හැකිද?',
  },

  // ── PRODUCT INQUIRY ────────────────────────────────────────────────────────
  {
    intent: 'product_inquiry',
    language: 'EN',
    tone: 'FRIENDLY',
    name: 'Product Inquiry (EN)',
    body: "Sure {{customer_name}}! Let me search for that for you. Here's what I found for your query:",
  },
  {
    intent: 'product_inquiry',
    language: 'SI',
    tone: 'FRIENDLY',
    name: 'Product Inquiry (SI)',
    body: '{{customer_name}} ගේ ප්‍රශ්නය සඳහා මම සෙවූ ප්‍රතිඵල මෙන්න:',
  },

  // ── ORDER STATUS ───────────────────────────────────────────────────────────
  {
    intent: 'order_status',
    language: 'EN',
    tone: 'FRIENDLY',
    name: 'Order Status (EN)',
    body: "Let me check on order #{{order_id}} for you, {{customer_name}}! I'll have that info in just a moment.",
  },
  {
    intent: 'order_status',
    language: 'SI',
    tone: 'FRIENDLY',
    name: 'Order Status (SI)',
    body: '{{customer_name}}, ඔබේ ඇණවුම #{{order_id}} ගැන දැන් සොයා බලමි.',
  },

  // ── HOURS & LOCATION ──────────────────────────────────────────────────────
  {
    intent: 'hours_location',
    language: 'EN',
    tone: 'FRIENDLY',
    name: 'Hours & Location (EN)',
    body: "Great question! Here are our business hours:\n\n{{hours}}\n\n📍 Location: {{location}}\n\nFeel free to visit us!",
  },
  {
    intent: 'hours_location',
    language: 'SI',
    tone: 'FRIENDLY',
    name: 'Hours & Location (SI)',
    body: "අපේ ව්‍යාපාර වේලාවන්:\n\n{{hours}}\n\n📍 ස්ථානය: {{location}}\n\nඅපට හමු වීමට ඔබව සාදරයෙන් පිළිගනිමු!",
  },

  // ── REFUND & CANCEL ────────────────────────────────────────────────────────
  {
    intent: 'refund_cancel',
    language: 'EN',
    tone: 'FRIENDLY',
    name: 'Refund & Cancel (EN)',
    body: "Hi {{customer_name}}, I understand your concern about returns/cancellations. Our policy:\n\n{{returns_policy}}\n\nWould you like me to connect you with an agent to assist you further?",
  },
  {
    intent: 'refund_cancel',
    language: 'SI',
    tone: 'FRIENDLY',
    name: 'Refund & Cancel (SI)',
    body: "{{customer_name}}, ආපසු ගෙවීම් / අවලංගු කිරීම් ගැන ඔබේ ගැටලූ තේරුම් ගනිමි. අපේ ප්‍රතිපත්තිය:\n\n{{returns_policy}}\n\nනියෝජිතයෙකු සමඟ සම්බන්ධ කර දෙන්නද?",
  },

  // ── SPEAK TO HUMAN ────────────────────────────────────────────────────────
  {
    intent: 'speak_to_human',
    language: 'EN',
    tone: 'FRIENDLY',
    name: 'Handoff to Agent (EN)',
    body: "Of course {{customer_name}}! I'm connecting you with a human agent right now. Please hold on — someone from {{business_name}} will be with you shortly. 🙏",
  },
  {
    intent: 'speak_to_human',
    language: 'SI',
    tone: 'FRIENDLY',
    name: 'Handoff to Agent (SI)',
    body: '{{customer_name}}, ඔබව නියෝජිතයෙකු සමඟ සම්බන්ධ කිරීමට සූදානම් වෙමු. කරුණාකර රැඳී සිටින්න. 🙏',
  },

  // ── COMPLAINT ─────────────────────────────────────────────────────────────
  {
    intent: 'complaint',
    language: 'EN',
    tone: 'FRIENDLY',
    name: 'Complaint Handler (EN)',
    body: "I'm so sorry to hear that {{customer_name}}. Your feedback is very important to us at {{business_name}}. I'm escalating this to our team right away. Someone will reach out to you shortly.",
  },
  {
    intent: 'complaint',
    language: 'SI',
    tone: 'FRIENDLY',
    name: 'Complaint Handler (SI)',
    body: '{{customer_name}}, ඔබේ ගැටලූ ගැන ඉතාමත් කනගාටු වෙමු. ඔබේ ගැටලූව දැන් අපේ කණ්ඩායමට යොමු කරමු.',
  },

  // ── SHIPPING INFO ─────────────────────────────────────────────────────────
  {
    intent: 'shipping_info',
    language: 'EN',
    tone: 'FRIENDLY',
    name: 'Shipping Info (EN)',
    body: "Here's our shipping policy:\n\n{{shipping_policy}}\n\nFor order tracking, just reply with your order number!",
  },
  {
    intent: 'shipping_info',
    language: 'SI',
    tone: 'FRIENDLY',
    name: 'Shipping Info (SI)',
    body: "අපේ ගෙනයාමේ ප්‍රතිපත්තිය:\n\n{{shipping_policy}}\n\nඇණවුම් ලුහුබැඳීම සඳහා ඔබේ ඇණවුම් අංකය reply කරන්න!",
  },

  // ── RETURNS INFO ──────────────────────────────────────────────────────────
  {
    intent: 'returns_info',
    language: 'EN',
    tone: 'FRIENDLY',
    name: 'Returns Info (EN)',
    body: "Here's our returns policy:\n\n{{returns_policy}}\n\nNeed to start a return? Reply with your order number and I'll help you out.",
  },
  {
    intent: 'returns_info',
    language: 'SI',
    tone: 'FRIENDLY',
    name: 'Returns Info (SI)',
    body: "අපේ ආපසු ලබා දීමේ ප්‍රතිපත්තිය:\n\n{{returns_policy}}\n\nආපසු ලබා දීමක් ආරම්භ කිරීමට ඔබේ ඇණවුම් අංකය reply කරන්න.",
  },

  // ── OPT-OUT CONFIRM ───────────────────────────────────────────────────────
  {
    intent: 'opt_out_confirm',
    language: 'EN',
    tone: 'FRIENDLY',
    name: 'Opt-Out Confirmed (EN)',
    body: "You've been unsubscribed from {{business_name}} messages, {{customer_name}}. We won't message you again. Reply START anytime to re-subscribe.",
  },
  {
    intent: 'opt_out_confirm',
    language: 'SI',
    tone: 'FRIENDLY',
    name: 'Opt-Out Confirmed (SI)',
    body: '{{customer_name}}, {{business_name}} ගේ පණිවිඩ ලැයිස්තුවෙන් ඔබව ඉවත් කළෙමු. නැවත සමත් වීමට START reply කරන්න.',
  },

  // ── OPT-IN CONFIRM ────────────────────────────────────────────────────────
  {
    intent: 'opt_in_confirm',
    language: 'EN',
    tone: 'FRIENDLY',
    name: 'Opt-In Confirmed (EN)',
    body: "Welcome back {{customer_name}}! 🎉 You've been re-subscribed to {{business_name}}. How can I help you today?",
  },
  {
    intent: 'opt_in_confirm',
    language: 'SI',
    tone: 'FRIENDLY',
    name: 'Opt-In Confirmed (SI)',
    body: '{{customer_name}} නැවත සාදරයෙන් පිළිගනිමු! 🎉 {{business_name}} ට නැවත subscribe කළා. අද ඔබට කෙසේ සහාය විය හැකිද?',
  },

  // ── OUT OF HOURS ──────────────────────────────────────────────────────────
  {
    intent: 'out_of_hours',
    language: 'EN',
    tone: 'FRIENDLY',
    name: 'Out of Hours (EN)',
    body: "Hi {{customer_name}}! Thanks for reaching out to {{business_name}}. Our team is currently offline.\n\n🕐 Business Hours: {{hours}}\n\nWe'll get back to you as soon as we're online. Have a great {{today_date}}!",
  },
  {
    intent: 'out_of_hours',
    language: 'SI',
    tone: 'FRIENDLY',
    name: 'Out of Hours (SI)',
    body: '{{customer_name}}, ඔබේ පණිවිඩය ගැන ස්තූතියි! {{business_name}} දැන් offline ය.\n\n🕐 ව්‍යාපාර වේලාවන්: {{hours}}\n\nඅපේ කණ්ඩායම online වූ වහාම ඔබ හා සම්බන්ධ වෙමු.',
  },
];

async function main() {
  // This seed requires a tenant — use the first tenant found
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    console.log('No tenant found. Run the main seed first.');
    return;
  }

  console.log(`Seeding ${TEMPLATES.length} templates for tenant: ${tenant.name} (${tenant.id})`);
  let created = 0;
  let skipped = 0;

  for (const tpl of TEMPLATES) {
    const result = await prisma.replyTemplate.upsert({
      where: {
        tenantId_intent_language_tone: {
          tenantId: tenant.id,
          intent: tpl.intent,
          language: tpl.language,
          tone: tpl.tone,
        },
      },
      create: {
        tenantId: tenant.id,
        intent: tpl.intent,
        language: tpl.language,
        tone: tpl.tone,
        name: tpl.name,
        body: tpl.body,
        isActive: true,
      },
      update: {
        name: tpl.name,
        body: tpl.body,
        isActive: true,
      },
    });

    if (result) created++;
    else skipped++;
  }

  console.log(`Done. Created/updated: ${created}, skipped: ${skipped}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
