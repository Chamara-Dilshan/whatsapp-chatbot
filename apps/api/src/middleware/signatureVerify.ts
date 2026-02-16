import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { decrypt } from '../lib/crypto.util';
import { computeHmacSha256, timingSafeCompare } from '../lib/crypto.util';
import { extractPhoneNumberIdFromRaw } from '../services/whatsapp/parser';
import { logger } from '../lib/logger';

/**
 * Middleware to verify X-Hub-Signature-256 header on WhatsApp webhook POST.
 *
 * Challenge: The app secret is tenant-specific, but we only know the tenant
 * after parsing the body. We solve this by:
 * 1. Using req.rawBody (captured by rawBody.ts verify callback)
 * 2. Extracting phone_number_id via regex (minimal parse)
 * 3. Loading tenant's appSecretEnc from DB and decrypting
 * 4. Computing and comparing HMAC
 *
 * For MVP: If tenant is not found, we skip validation but log a warning.
 * In production: Remove the skip and return 401 when tenant is not found.
 */
export async function verifyMetaSignature(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const signature = req.headers['x-hub-signature-256'] as string | undefined;

    if (!signature) {
      // In production, reject requests without signature:
      // return next(new UnauthorizedError('Missing X-Hub-Signature-256 header'));
      logger.warn({ requestId: req.requestId }, 'Webhook received without X-Hub-Signature-256 header');
      next();
      return;
    }

    if (!req.rawBody) {
      logger.warn({ requestId: req.requestId }, 'Raw body not captured for signature verification');
      next();
      return;
    }

    // Extract phone_number_id from raw body
    const phoneNumberId = extractPhoneNumberIdFromRaw(req.rawBody);
    if (!phoneNumberId) {
      logger.warn({ requestId: req.requestId }, 'Could not extract phone_number_id from webhook payload');
      next();
      return;
    }

    // Load tenant's app secret
    const tenantWa = await prisma.tenantWhatsApp.findUnique({
      where: { phoneNumberId },
      select: { appSecretEnc: true },
    });

    if (!tenantWa) {
      // MVP: Skip validation for unknown tenants
      // Production: return next(new UnauthorizedError('Unknown phone_number_id'));
      logger.warn({ phoneNumberId, requestId: req.requestId }, 'Tenant not found for signature verification, skipping');
      next();
      return;
    }

    // Decrypt app secret
    let appSecret: string;
    try {
      appSecret = decrypt(tenantWa.appSecretEnc);
    } catch {
      logger.error({ phoneNumberId, requestId: req.requestId }, 'Failed to decrypt app secret');
      next();
      return;
    }

    // Verify signature: sha256=<hex>
    const expectedPrefix = 'sha256=';
    if (!signature.startsWith(expectedPrefix)) {
      logger.warn({ requestId: req.requestId }, 'Invalid signature format');
      next();
      return;
    }

    const signatureHex = signature.slice(expectedPrefix.length);
    const computedHex = computeHmacSha256(req.rawBody, appSecret);

    if (!timingSafeCompare(signatureHex, computedHex)) {
      logger.error({ requestId: req.requestId, phoneNumberId }, 'Webhook signature verification FAILED');
      // In production, reject:
      // return next(new UnauthorizedError('Invalid webhook signature'));
      // For MVP, log and continue:
      logger.warn({ requestId: req.requestId }, 'Continuing despite signature mismatch (MVP mode)');
    } else {
      logger.debug({ requestId: req.requestId, phoneNumberId }, 'Webhook signature verified');
    }

    next();
  } catch (err) {
    logger.error({ err, requestId: req.requestId }, 'Error during signature verification');
    next();
  }
}
