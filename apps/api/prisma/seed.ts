import { PrismaClient } from '@prisma/client';
import { hashSync } from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Simple encryption for seed data (matches crypto.util.ts pattern in Phase 2)
function encryptPlaceholder(text: string): string {
  // In production, use AES-256-GCM. For seed, we prefix with enc: to mark as "encrypted"
  return `enc:${Buffer.from(text).toString('base64')}`;
}

async function main() {
  console.log('Seeding database...');

  // 1. Create demo tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'acme-store' },
    update: {},
    create: {
      id: 'tenant_demo_001',
      name: 'Acme Store',
      slug: 'acme-store',
      plan: 'pro',
    },
  });
  console.log(`  Created tenant: ${tenant.name} (${tenant.id})`);

  // 2. Create owner user
  const owner = await prisma.tenantUser.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'owner@acme.test' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'owner@acme.test',
      passwordHash: hashSync('password123', 12),
      name: 'Acme Owner',
      role: 'owner',
    },
  });
  console.log(`  Created owner: ${owner.email}`);

  // 3. Create agent user
  const agent = await prisma.tenantUser.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'agent@acme.test' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'agent@acme.test',
      passwordHash: hashSync('password123', 12),
      name: 'Acme Agent',
      role: 'agent',
    },
  });
  console.log(`  Created agent: ${agent.email}`);

  // 4. Create demo WhatsApp connection
  await prisma.tenantWhatsApp.upsert({
    where: { phoneNumberId: 'DEMO_PHONE_NUMBER_ID' },
    update: {},
    create: {
      tenantId: tenant.id,
      phoneNumberId: 'DEMO_PHONE_NUMBER_ID',
      displayPhone: '+1234567890',
      wabaId: 'DEMO_WABA_ID',
      accessTokenEnc: encryptPlaceholder('DEMO_ACCESS_TOKEN'),
      appSecretEnc: encryptPlaceholder('DEMO_APP_SECRET'),
      webhookVerifyToken: 'my-webhook-verify-token',
      catalogId: null,
    },
  });
  console.log('  Created demo WhatsApp connection');

  // 5. Create tenant policies
  await prisma.tenantPolicies.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      returnPolicy: 'We accept returns within 30 days of purchase. Items must be unused and in original packaging.',
      shippingPolicy: 'Free shipping on orders over $50. Standard delivery takes 3-5 business days.',
      faqContent: 'Q: How do I track my order?\nA: Use your order number on our tracking page.\n\nQ: Do you ship internationally?\nA: Yes, we ship to over 50 countries.',
      businessHours: {
        mon: { open: '09:00', close: '17:00' },
        tue: { open: '09:00', close: '17:00' },
        wed: { open: '09:00', close: '17:00' },
        thu: { open: '09:00', close: '17:00' },
        fri: { open: '09:00', close: '17:00' },
        sat: { open: '10:00', close: '14:00' },
        sun: { open: 'closed', close: 'closed' },
      },
      timezone: 'America/New_York',
    },
  });
  console.log('  Created tenant policies');

  // 6. Create products
  const products = [
    { retailerId: 'SKU001', name: 'Wireless Mouse', description: 'Ergonomic wireless mouse with USB-C receiver', price: 29.99, currency: 'USD', category: 'Electronics', keywords: ['mouse', 'wireless', 'ergonomic', 'usb-c'] },
    { retailerId: 'SKU002', name: 'Mechanical Keyboard', description: 'RGB mechanical keyboard with Cherry MX switches', price: 89.99, currency: 'USD', category: 'Electronics', keywords: ['keyboard', 'mechanical', 'rgb', 'cherry mx'] },
    { retailerId: 'SKU003', name: 'USB-C Hub', description: '7-in-1 USB-C hub with HDMI, SD card reader', price: 45.99, currency: 'USD', category: 'Electronics', keywords: ['usb-c', 'hub', 'hdmi', 'adapter'] },
    { retailerId: 'SKU004', name: 'Laptop Stand', description: 'Adjustable aluminum laptop stand', price: 39.99, currency: 'USD', category: 'Accessories', keywords: ['laptop', 'stand', 'aluminum', 'adjustable'] },
    { retailerId: 'SKU005', name: 'Webcam HD 1080p', description: 'Full HD webcam with built-in microphone', price: 59.99, currency: 'USD', category: 'Electronics', keywords: ['webcam', 'hd', '1080p', 'camera', 'microphone'] },
    { retailerId: 'SKU006', name: 'Desk Pad', description: 'Large leather desk pad, 36x17 inches', price: 24.99, currency: 'USD', category: 'Accessories', keywords: ['desk', 'pad', 'leather', 'mat'] },
    { retailerId: 'SKU007', name: 'Monitor Light Bar', description: 'LED monitor light bar with adjustable brightness', price: 34.99, currency: 'USD', category: 'Accessories', keywords: ['monitor', 'light', 'led', 'lamp'] },
    { retailerId: 'SKU008', name: 'Bluetooth Speaker', description: 'Portable Bluetooth 5.0 speaker, waterproof', price: 49.99, currency: 'USD', category: 'Audio', keywords: ['speaker', 'bluetooth', 'portable', 'waterproof'] },
    { retailerId: 'SKU009', name: 'Noise Cancelling Headphones', description: 'Over-ear ANC headphones with 30h battery', price: 149.99, currency: 'USD', category: 'Audio', keywords: ['headphones', 'noise cancelling', 'anc', 'wireless', 'over-ear'] },
    { retailerId: 'SKU010', name: 'Wireless Earbuds', description: 'True wireless earbuds with charging case', price: 79.99, currency: 'USD', category: 'Audio', keywords: ['earbuds', 'wireless', 'true wireless', 'bluetooth'] },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: {
        tenantId_retailerId: { tenantId: tenant.id, retailerId: product.retailerId },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        ...product,
      },
    });
  }
  console.log(`  Created ${products.length} products`);

  // 7. Create reply templates for intents
  const templates = [
    {
      intent: 'greeting',
      name: 'Welcome Greeting',
      body: 'Hello! Welcome to {{tenantName}}. How can I help you today? You can ask about our products, check order status, or request to speak with an agent.',
    },
    {
      intent: 'product_inquiry',
      name: 'Product Inquiry',
      body: "I'd be happy to help you find a product! Could you tell me what you're looking for? You can describe the product or ask about a specific category.",
    },
    {
      intent: 'price_inquiry',
      name: 'Price Inquiry',
      body: "I can help you with pricing! Could you tell me which product you're interested in? I'll look up the current price for you.",
    },
    {
      intent: 'availability_stock',
      name: 'Availability Check',
      body: "Let me check that for you! Which product are you wondering about? I'll verify if it's currently in stock.",
    },
    {
      intent: 'order_status',
      name: 'Order Status',
      body: "I'd like to help you track your order. Could you please provide your order number? You can also check your order status on our website.",
    },
    {
      intent: 'delivery_info',
      name: 'Delivery Information',
      body: 'We offer free shipping on orders over $50. Standard delivery takes 3-5 business days. Express delivery (1-2 days) is available for an additional fee. Would you like more details?',
    },
    {
      intent: 'refund_cancel',
      name: 'Refund/Cancel',
      body: "I understand you'd like to request a refund or cancellation. We accept returns within 30 days of purchase. Let me connect you with an agent who can help process this for you.",
    },
    {
      intent: 'complaint',
      name: 'Complaint Response',
      body: "I'm sorry to hear you're having an issue. Your concern is important to us. Let me connect you with a support agent who can help resolve this right away.",
    },
    {
      intent: 'hours_location',
      name: 'Business Hours',
      body: 'Our business hours are:\nMon-Fri: 9:00 AM - 5:00 PM\nSat: 10:00 AM - 2:00 PM\nSun: Closed\n\nIs there anything else I can help with?',
    },
    {
      intent: 'speak_to_human',
      name: 'Agent Handoff',
      body: "I'm connecting you with a human agent right away. Please hold on, someone will be with you shortly.",
    },
    {
      intent: 'other',
      name: 'Default Fallback',
      body: "Thanks for your message! I'm not sure I understand what you need. Here's what I can help with:\n- Product information\n- Order status\n- Delivery info\n- Returns & refunds\n- Business hours\n\nOr type \"agent\" to speak with a human.",
    },
  ];

  for (const template of templates) {
    await prisma.replyTemplate.upsert({
      where: {
        tenantId_intent: { tenantId: tenant.id, intent: template.intent },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        ...template,
      },
    });
  }
  console.log(`  Created ${templates.length} reply templates`);

  console.log('\nSeed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
