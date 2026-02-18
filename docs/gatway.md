Get Started
AI Gateway offers a unified API to multiple providers with budgets, monitoring, load-balancing, and fallbacks.

1
Install the AI SDK and AI Gateway packages
Install the AI SDK and AI Gateway packages to run TypeScript directly


mkdir demo && cd demo
pnpm init
pnpm install ai dotenv tsx @types/node
2
Set up Authentication
Choose between API key or OIDC token authentication

Option A: API Key
Create an API key and save it to a .env file
.env

AI_GATEWAY_API_KEY=your_api_key_here
Option B: OIDC Token
Link your project and pull environment variables (auto-refreshes every 12 hours)

vercel link
vercel env pull
3
Create and run a script
Save this script as gateway.ts and run it with tsx

gateway.ts

import { streamText } from 'ai';
import 'dotenv/config';

async function main() {
  const result = streamText({
    model: 'openai/gpt-4.1',
    prompt: 'Invent a new holiday and describe its traditions.',
  });

  for await (const textPart of result.textStream) {
    process.stdout.write(textPart);
  }

  console.log();
  console.log('Token usage:', await result.usage);
  console.log('Finish reason:', await result.finishReason);
}

main().catch(console.error);

pnpm tsx gateway.ts

https://vercel.com/rede-uniao-nacionals-projects/leads/ai-gateway/quick-start