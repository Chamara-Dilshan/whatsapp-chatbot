import { prisma } from '../../lib/prisma';
import { decrypt } from '../../lib/crypto.util';
import { NotFoundError, AppError } from '../../middleware/errorHandler';
import { invalidateCache, cacheKeys } from '../cache/cache.service';

const META_API_VERSION = 'v19.0';
const TEMPLATES_LIMIT = 200;

interface MetaTemplateComponent {
  type: string;
  text?: string;
  format?: string;
}

interface MetaTemplate {
  name: string;
  status: string; // APPROVED | PENDING | REJECTED | PAUSED | DISABLED
  language: string; // e.g. en_US, si, ta_IN
  components: MetaTemplateComponent[];
}

interface MetaTemplatesResponse {
  data: MetaTemplate[];
  paging?: { cursors?: { after?: string }; next?: string };
}

/** Map Meta locale codes → our language codes */
function mapLanguage(lang: string): 'EN' | 'SI' | 'TA' {
  const l = lang.toLowerCase();
  if (l.startsWith('si')) return 'SI';
  if (l.startsWith('ta')) return 'TA';
  return 'EN';
}

/** Extract text from the BODY component */
function extractBody(components: MetaTemplateComponent[]): string {
  return components.find((c) => c.type === 'BODY')?.text ?? '';
}

/**
 * Fetch all message templates from the Meta Graph API for the tenant's WABA
 * and upsert them into the local ReplyTemplate table.
 */
export async function syncMetaTemplates(
  tenantId: string
): Promise<{ synced: number; skipped: number; errors: number }> {
  const connection = await prisma.tenantWhatsApp.findFirst({
    where: { tenantId, isActive: true },
  });

  if (!connection) {
    throw new NotFoundError('No active WhatsApp connection found for this tenant');
  }

  if (!connection.wabaId) {
    throw new AppError(
      'WhatsApp Business Account ID (WABA ID) is not set. ' +
        'Edit your WhatsApp connection and enter the WABA ID to enable template sync.',
      400
    );
  }

  const accessToken = decrypt(connection.accessTokenEnc);

  // Paginate through all templates (Meta paginates at 10 by default; we request up to 200)
  const allTemplates: MetaTemplate[] = [];
  let url: string | null =
    `https://graph.facebook.com/${META_API_VERSION}/${connection.wabaId}/message_templates` +
    `?limit=${TEMPLATES_LIMIT}&fields=name,status,language,components`;

  while (url) {
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!resp.ok) {
      const body = await resp.text();
      throw new AppError(`Meta API error ${resp.status}: ${body}`, 502);
    }

    const json = (await resp.json()) as MetaTemplatesResponse;
    allTemplates.push(...(json.data ?? []));
    url = json.paging?.next ?? null;
  }

  let synced = 0;
  let skipped = 0;
  let errors = 0;

  for (const t of allTemplates) {
    try {
      const body = extractBody(t.components);
      if (!body) {
        skipped++;
        continue; // templates without a BODY component (e.g. media-only) are not renderable as text
      }

      const language = mapLanguage(t.language);

      await prisma.replyTemplate.upsert({
        where: {
          tenantId_intent_language_tone: {
            tenantId,
            intent: t.name,
            language,
            tone: 'FRIENDLY',
          },
        },
        update: {
          name: t.name,
          body,
          metaStatus: t.status,
          // Sync active state with approval status
          isActive: t.status === 'APPROVED',
        },
        create: {
          tenantId,
          intent: t.name,
          language,
          tone: 'FRIENDLY',
          name: t.name,
          body,
          isActive: t.status === 'APPROVED',
          metaStatus: t.status,
        },
      });

      synced++;
    } catch {
      errors++;
    }
  }

  if (synced > 0) {
    await invalidateCache(cacheKeys.templates(tenantId));
  }

  return { synced, skipped, errors };
}
