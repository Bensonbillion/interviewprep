import "server-only";
import { z } from "zod";

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10),
  ANTHROPIC_API_KEY: z.string().startsWith("sk-ant-"),
  DATA_ENCRYPTION_KEY: z.string().min(32),
});

export const serverEnv = serverEnvSchema.parse(process.env);
