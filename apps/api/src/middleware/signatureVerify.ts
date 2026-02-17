import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { decryptVersioned } from '../lib/crypto.keyRotation.util';
import { computeHmacSha256, timingSafeCompare } from '../lib/crypto.util';
import { extractPhoneNumberIdFromRaw } from '../services/whatsapp/parser';
import { logger } from '../lib/logger';

/**
 * Strict webhook signature verification middleware.
 *
 * Security rules:
 * - Unknown phone_number_id → return 200 (log warning, don't process — WhatsApp spec compliance)
 * - Known tenant + INVALID signature → return 403 Forbidden
 * - Known tenant + VALID signature → call next()
 * - Missing signature header → return 403 Forbidden
 * - Missing raw body → return 403 Forbidden
 */
export async function verifyMetaSignature(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const signature = req.headers['x-hub-signature-256'] as string | undefined;

    if (!signature) {
      logger.warn({ requestId: req.requestId }, 'Webhook rejected: missing X-Hub-Signature-256');
      res.status(403).json({ error: 'Missing signature header' });
      return;
    }

    if (!req.rawBody) {
      logger.warn({ requestId: req.requestId }, 'Webhook rejected: raw body not captured');
      res.status(403).json({ error: 'Raw body unavailable' });
      return;
    }

    // Extract phone_number_id (minimal parse, no JSON.parse overhead)
    const phoneNumberId = extractPhoneNumberIdFromRaw(req.rawBody);
    if (!phoneNumberId) {
      logger.warn({ requestId: req.requestId }, 'Could not extract phone_number_id — returning 200 (no processing)');
      // Per WhatsApp spec: always return 200 to prevent retries flooding from unknown sources
      res.status(200).json({ status: 'ok' });
      return;
    }

    // Load tenant's encrypted app secret
    const tenantWa = await prisma.tenantWhatsApp.findUnique({
      where: { phoneNumberId },
      select: { appSecretEnc: true },
    });

    if (!tenantWa) {
      // Unknown tenant: return 200 silently (WhatsApp may send probes to old numbers)
      logger.warn({ phoneNumberId, requestId: req.requestId }, 'Unknown phone_number_id — returning 200, not processing');
      res.status(200).json({ status: 'ok' });
      return;
    }

    // Decrypt app secret (supports versioned key rotation)
    let appSecret: string;
    try {
      appSecret = decryptVersioned(tenantWa.appSecretEnc);
    } catch (err) {
      logger.error({ phoneNumberId, requestId: req.requestId, err }, 'Failed to decrypt app secret — rejecting webhook');
      res.status(403).json({ error: 'Signature verification failed' });
      return;
    }

    // Validate signature format: "sha256=<hex>"
    const expectedPrefix = 'sha256=';
    if (!signature.startsWith(expectedPrefix)) {
      logger.warn({ requestId: req.requestId }, 'Webhook rejected: invalid signature format');
      res.status(403).json({ error: 'Invalid signature format' });
      return;
    }

    const signatureHex = signature.slice(expectedPrefix.length);
    const computedHex = computeHmacSha256(req.rawBody, appSecret);

    if (!timingSafeCompare(signatureHex, computedHex)) {
      logger.error({ requestId: req.requestId, phoneNumberId }, 'Webhook signature MISMATCH — returning 403');
      res.status(403).json({ error: 'Signature mismatch' });
      return;
    }

    logger.debug({ requestId: req.requestId, phoneNumberId }, 'Webhook signature verified ✓');
    next();
  } catch (err) {
    logger.error({ err, requestId: req.requestId }, 'Unexpected error during signature verification');
    res.status(403).json({ error: 'Signature verification error' });
  }
}
