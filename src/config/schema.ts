import { z } from 'zod';

const RuleSeveritySchema = z.enum(['error', 'warn']);

const RuleConfigSchema = z.object({
  severity: RuleSeveritySchema,
  patterns: z.array(z.string()),
  message: z.string().optional(),
});

const RuleConfigOrArraySchema = z.union([RuleConfigSchema, z.array(RuleConfigSchema)]);

export const HermexConfigSchema = z.object({
  includes: z.array(z.string()).optional(),
  excludes: z.array(z.string()).optional(),
  packages: z
    .object({
      internal: z.array(z.string()).optional(),
      ignore: z.array(z.string()).optional(),
      banned: z
        .array(
          z.object({
            name: z.string(),
            severity: RuleSeveritySchema,
            message: z.string().optional(),
          }),
        )
        .optional(),
    })
    .optional(),
  versus: z
    .array(
      z.object({
        name: z.string(),
        packages: z.array(z.string()).min(2),
      }),
    )
    .optional(),
  rules: z
    .object({
      forbid_files: RuleConfigOrArraySchema.optional(),
      require_files: RuleConfigOrArraySchema.optional(),
      allow_files: RuleConfigOrArraySchema.optional(),
    })
    .optional(),
  output: z
    .object({
      summary: z.union([z.literal('log'), z.literal(false)]).optional(),
      components: z.union([z.enum(['table', 'chart']), z.literal(false)]).optional(),
      packages: z.union([z.enum(['table', 'chart']), z.literal(false)]).optional(),
      patterns: z.union([z.enum(['table', 'chart']), z.literal(false)]).optional(),
      details: z.boolean().optional(),
      versus: z.boolean().optional(),
      rules: z.boolean().optional(),
    })
    .optional(),
  releaseAge: z
    .object({
      enabled: z.boolean(),
      registry: z.string().optional(),
      authToken: z.string().optional(),
      thresholds: z
        .object({
          patch: z.number().nullable().optional(),
          minor: z.number().nullable().optional(),
          major: z.number().nullable().optional(),
        })
        .optional(),
    })
    .optional(),
});
