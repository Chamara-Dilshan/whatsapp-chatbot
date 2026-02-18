/**
 * End-to-end AI pipeline test.
 *
 * Usage:
 *   npx tsx scripts/test-ai.ts
 *
 * Prerequisites:
 *   - Set AI_PROVIDER and the corresponding API key in apps/api/.env
 *   - Enable aiEnabled for the target tenant in TenantPolicies
 *   - Database must be running (docker)
 */

import path from 'path';
import dotenv from 'dotenv';

// Load env BEFORE any app modules
dotenv.config({ path: path.resolve(__dirname, '../apps/api/.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  // Dynamic imports so env vars are loaded first
  const { prisma } = await import('../apps/api/src/lib/prisma');
  const { setAIProvider, detectIntent } = await import('../apps/api/src/services/intent/intentEngine');
  const { createAIProvider } = await import('../apps/api/src/services/intent/providers');
  const { generateAIResponse } = await import('../apps/api/src/services/ai/aiResponse.service');

  console.log('=== AI Pipeline End-to-End Test ===\n');

  // 1. Initialize AI provider
  const provider = createAIProvider();
  setAIProvider(provider);
  console.log(`AI Provider: ${process.env.AI_PROVIDER || 'none'}\n`);

  // 2. Find demo tenant
  const tenant = await prisma.tenant.findFirst({
    where: { slug: 'acme-store' },
    select: { id: true, name: true },
  });

  if (!tenant) {
    console.error('Demo tenant "acme-store" not found. Run prisma:seed first.');
    process.exit(1);
  }
  console.log(`Tenant: ${tenant.name} (${tenant.id})\n`);

  // 3. Check AI is enabled
  const policies = await prisma.tenantPolicies.findUnique({
    where: { tenantId: tenant.id },
    select: { aiEnabled: true },
  });
  console.log(`AI enabled: ${policies?.aiEnabled}\n`);

  // 4. Find a conversation for response generation
  const conversation = await prisma.conversation.findFirst({
    where: { tenantId: tenant.id },
    select: { id: true },
  });

  // ── Test 1: Direct AI provider call (bypasses rules) ─────────────────
  console.log('--- Direct AI Provider Test (bypasses rules) ---\n');

  const directMessages = [
    'Is gift wrapping available?',
    'Which payment methods are accepted?',
    'Could you explain your loyalty program?',
    'What is your exchange policy?',
    'Are there any ongoing promotions?',
  ];

  for (const msg of directMessages) {
    try {
      const result = await provider.detectIntent(msg, {
        tenantId: tenant.id,
        conversationHistory: [],
      });
      console.log(`  "${msg}"`);
      console.log(`    → intent: ${result.intent}, confidence: ${result.confidence}`);
      if (result.extractedQuery) {
        console.log(`    → query: ${result.extractedQuery}`);
      }
      console.log();
    } catch (err) {
      console.error(`  "${msg}" → ERROR:`, (err as Error).message);
      console.log();
    }
  }

  // ── Test 2: Full pipeline (rules + AI) ────────────────────────────────
  // Use single-word messages that won't match the broad order regex
  console.log('--- Full Pipeline Test (rules → AI fallback) ---\n');

  const pipelineMessages = [
    'thanks',          // might match greeting rule
    'bye',             // no rule
    'interesting',     // no rule
    'ok',              // no rule
  ];

  for (const msg of pipelineMessages) {
    try {
      const result = await detectIntent(msg, {
        tenantId: tenant.id,
        conversationHistory: [],
      });
      console.log(`  "${msg}"`);
      console.log(`    → intent: ${result.intent}, confidence: ${result.confidence}`);
      console.log();
    } catch (err) {
      console.error(`  "${msg}" → ERROR:`, (err as Error).message);
      console.log();
    }
  }

  // ── Test 3: AI Response Generation ────────────────────────────────────
  if (conversation) {
    console.log('--- AI Response Generation ---\n');

    const responseTests = [
      { msg: 'Is gift wrapping available?', intent: 'product_inquiry' },
      { msg: 'What are your payment options?', intent: 'other' },
    ];

    for (const { msg, intent } of responseTests) {
      try {
        const response = await generateAIResponse({
          tenantId: tenant.id,
          conversationId: conversation.id,
          intent,
          messageText: msg,
          conversationHistory: [],
        });
        console.log(`  "${msg}" (intent: ${intent})`);
        console.log(`    → response: ${response ?? '(null — fallback would be used)'}`);
        console.log(`    → length: ${response?.length ?? 0} chars`);
        console.log();
      } catch (err) {
        console.error(`  "${msg}" → ERROR:`, (err as Error).message);
        console.log();
      }
    }
  } else {
    console.log('No conversation found — skipping response generation test.\n');
  }

  console.log('=== Test Complete ===');
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('Test failed:', err);
  try {
    const { prisma } = await import('../apps/api/src/lib/prisma');
    await prisma.$disconnect();
  } catch {}
  process.exit(1);
});
