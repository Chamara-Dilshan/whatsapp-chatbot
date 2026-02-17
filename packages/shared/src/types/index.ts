import { z } from 'zod';
import { registerSchema, loginSchema } from '../schemas/auth.schema';
import { connectWhatsAppSchema, updateCatalogSchema } from '../schemas/tenant.schema';
import { createProductSchema, updateProductSchema, productQuerySchema, csvImportResultSchema } from '../schemas/product.schema';
import { updatePoliciesSchema } from '../schemas/policy.schema';
import { createTemplateSchema, updateTemplateSchema } from '../schemas/template.schema';
import { conversationQuerySchema, replySchema, assignSchema } from '../schemas/conversation.schema';
import { updateCaseSchema } from '../schemas/case.schema';
import { paginationSchema } from '../schemas/common.schema';

// Auth
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

// Tenant
export type ConnectWhatsAppInput = z.infer<typeof connectWhatsAppSchema>;
export type UpdateCatalogInput = z.infer<typeof updateCatalogSchema>;

// Product
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;
export type CsvImportResult = z.infer<typeof csvImportResultSchema>;

// Policy
export type UpdatePoliciesInput = z.infer<typeof updatePoliciesSchema>;

// Template
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;

// Conversation
export type ConversationQueryInput = z.infer<typeof conversationQuerySchema>;
export type ReplyInput = z.infer<typeof replySchema>;
export type AssignInput = z.infer<typeof assignSchema>;

// Case
export type UpdateCaseInput = z.infer<typeof updateCaseSchema>;

// Pagination
export type PaginationInput = z.infer<typeof paginationSchema>;

// JWT Payload
export interface JwtPayload {
  userId: string;
  tenantId: string;
  role: string;
}

// API Response envelope
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    requestId?: string;
  };
  meta?: {
    total?: number;
    limit?: number;
    offset?: number;
  };
}
