import type { AIProviderAdapter } from './providerAdapter';
import { AnthropicAdapter } from './anthropicAdapter';
import { OpenAIAdapter } from './openaiAdapter';
import { ProviderNotConfiguredError } from './providerAdapter';

const adapterCache = new Map<string, AIProviderAdapter>();

export function getProviderAdapter(providerName: string): AIProviderAdapter {
  console.log('[PROVIDER FACTORY] Getting adapter for provider', {
    provider: providerName,
    cached: adapterCache.has(providerName),
  });

  if (adapterCache.has(providerName)) {
    console.log('[PROVIDER FACTORY] Returning cached adapter', {
      provider: providerName,
    });
    return adapterCache.get(providerName)!;
  }

  let adapter: AIProviderAdapter;

  console.log('[PROVIDER FACTORY] Creating new adapter instance', {
    provider: providerName.toLowerCase(),
  });

  switch (providerName.toLowerCase()) {
    case 'anthropic':
      adapter = new AnthropicAdapter();
      console.log('[PROVIDER FACTORY] Anthropic adapter created');
      break;
    case 'openai':
      adapter = new OpenAIAdapter();
      console.log('[PROVIDER FACTORY] OpenAI adapter created');
      break;
    case 'perplexity':
      console.error('[PROVIDER FACTORY] Perplexity adapter not implemented');
      throw new ProviderNotConfiguredError('perplexity');
    default:
      console.error('[PROVIDER FACTORY] Unknown provider requested', {
        provider: providerName,
      });
      throw new ProviderNotConfiguredError(providerName);
  }

  adapterCache.set(providerName, adapter);
  console.log('[PROVIDER FACTORY] Adapter cached', {
    provider: providerName,
  });
  return adapter;
}

export function clearAdapterCache(): void {
  adapterCache.clear();
}
