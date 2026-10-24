import { z } from 'zod';

export const postCommentSchema = z.object({
  body: z.string().min(1).max(10_000),
  parentId: z.string().length(26).optional(),
});
export type PostCommentInput = z.infer<typeof postCommentSchema>;
