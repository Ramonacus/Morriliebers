import { z } from 'zod';

/**
 * Schema for Bluesky login response
 */
export const BlueskyLoginResponseSchema = z.object({
  did: z.string().optional(),
  handle: z.string().optional(),
  email: z.string().optional(),
  accessJwt: z.string().optional(),
  refreshJwt: z.string().optional()
});

/**
 * Schema for Bluesky post response
 */
export const BlueskyPostResponseSchema = z.object({
  uri: z.string().min(1, 'Post URI must not be empty'),
  cid: z.string().min(1, 'Post CID must not be empty')
});

/**
 * Schema for Google Gemini generateText response
 */
export const GeminiTextResponseSchema = z.object({
  text: z.string().min(1, 'Generated text must not be empty'),
  finishReason: z.string().optional(),
  usage: z.object({
    promptTokens: z.number().optional(),
    completionTokens: z.number().optional(),
    totalTokens: z.number().optional()
  }).optional()
});

export type BlueskyLoginResponse = z.infer<typeof BlueskyLoginResponseSchema>;
export type BlueskyPostResponse = z.infer<typeof BlueskyPostResponseSchema>;
export type GeminiTextResponse = z.infer<typeof GeminiTextResponseSchema>;
