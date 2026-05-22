import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().default(''),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().default(''),
  SUPABASE_SERVICE_ROLE_KEY: z.string().default(''),
  ANTHROPIC_API_KEY: z.string().default(''),
  OPENAI_API_KEY: z.string().default(''),
  NEXT_PUBLIC_DEMO_MODE: z.preprocess(
    (val) => val === 'true' || val === '1' || val === true,
    z.boolean()
  ).default(true),
});

const getParsedEnv = () => {
  const isServer = typeof window === 'undefined';
  
  const rawData = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_SERVICE_ROLE_KEY: isServer ? process.env.SUPABASE_SERVICE_ROLE_KEY : '',
    ANTHROPIC_API_KEY: isServer ? process.env.ANTHROPIC_API_KEY : '',
    OPENAI_API_KEY: isServer ? process.env.OPENAI_API_KEY : '',
    NEXT_PUBLIC_DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE,
  };

  const hasKeys = !!(
    rawData.NEXT_PUBLIC_SUPABASE_URL &&
    rawData.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    (isServer ? rawData.ANTHROPIC_API_KEY : true)
  );

  if (!rawData.NEXT_PUBLIC_DEMO_MODE) {
    rawData.NEXT_PUBLIC_DEMO_MODE = hasKeys ? 'false' : 'true';
  }

  try {
    return envSchema.parse(rawData);
  } catch (error) {
    console.error('Environment validation failed:', error);
    // Return fallback values for safety in case of validation failures
    return {
      NEXT_PUBLIC_SUPABASE_URL: rawData.NEXT_PUBLIC_SUPABASE_URL || '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: rawData.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      SUPABASE_SERVICE_ROLE_KEY: rawData.SUPABASE_SERVICE_ROLE_KEY || '',
      ANTHROPIC_API_KEY: rawData.ANTHROPIC_API_KEY || '',
      OPENAI_API_KEY: rawData.OPENAI_API_KEY || '',
      NEXT_PUBLIC_DEMO_MODE: true,
    };
  }
};

export const env = getParsedEnv();
export const isDemoMode: boolean = env.NEXT_PUBLIC_DEMO_MODE || !env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
