import { z } from 'zod';

export const createLabelSchema = z.object({
  name: z.string().min(1, 'Label name is required').max(50).trim(),
  color: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Color must be a valid hex string (e.g. #3B82F6)'),
  description: z.string().max(200).optional(),
  clientId: z.string().uuid('Invalid client ID')
});

export const updateLabelSchema = z.object({
  name: z.string().min(1).max(50).trim().optional(),
  color: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/).optional(),
  description: z.string().max(200).optional().nullable()
});

export type CreateLabelInput = z.infer<typeof createLabelSchema>;
export type UpdateLabelInput = z.infer<typeof updateLabelSchema>;
