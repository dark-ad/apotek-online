import { GoogleGenerativeAI } from '@google/generative-ai';

export type AiProviderType =
  | 'gemini'
  | 'openai'
  | 'nvidia'
  | 'groq'
  | 'openrouter'
  | 'deepseek'
  | 'mistral'
  | 'anthropic'
  | 'custom';

export interface ProviderMeta {
  type: AiProviderType;
  name: string;
  defaultBaseUrl: string;
  defaultModel: string;
  suggestedModels: string[];
  placeholderKey: string;
  description: string;
}

export const PROVIDER_TEMPLATES: Record<AiProviderType, ProviderMeta> = {
  gemini: {
    type: 'gemini',
    name: 'Google Gemini',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com',
    defaultModel: 'gemini-2.5-flash',
    suggestedModels: [
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-1.5-pro',
    ],
    placeholderKey: 'AIzaSy...',
    description: 'Model multimodal canggih dan sangat cepat dari Google DeepMind.',
  },
  openai: {
    type: 'openai',
    name: 'OpenAI',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    suggestedModels: [
      'gpt-4.1-mini',
      'gpt-4.1',
      'gpt-4o-mini',
      'gpt-4o',
      'o3-mini',
      'gpt-3.5-turbo',
    ],
    placeholderKey: 'sk-proj-...',
    description: 'Model GPT generasi terbaru dari OpenAI dengan penalaran tinggi.',
  },
  nvidia: {
    type: 'nvidia',
    name: 'NVIDIA NIM',
    defaultBaseUrl: 'https://integrate.api.nvidia.com/v1',
    defaultModel: 'meta/llama-3.2-11b-vision-instruct',
    suggestedModels: [
      'meta/llama-3.2-11b-vision-instruct',
      'meta/llama-3.1-70b-instruct',
      'meta/llama-3.1-8b-instruct',
      'mistralai/mistral-large-2-instruct',
    ],
    placeholderKey: 'nvapi-...',
    description: 'Akselerasi inferensi mikroservis NVIDIA NIM berbasis GPU berkinerja tinggi.',
  },
  groq: {
    type: 'groq',
    name: 'Groq',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    suggestedModels: [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'mixtral-8x7b-32768',
      'gemma2-9b-it',
    ],
    placeholderKey: 'gsk_...',
    description: 'Inferensi LPU super cepat dengan latensi ultra rendah.',
  },
  openrouter: {
    type: 'openrouter',
    name: 'OpenRouter',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'meta-llama/llama-3.3-70b-instruct',
    suggestedModels: [
      'meta-llama/llama-3.3-70b-instruct',
      'deepseek/deepseek-chat',
      'google/gemini-2.0-flash-exp:free',
      'anthropic/claude-3.5-sonnet',
    ],
    placeholderKey: 'sk-or-v1-...',
    description: 'Gateway terpadu untuk ratusan model AI dari berbagai provider global.',
  },
  deepseek: {
    type: 'deepseek',
    name: 'DeepSeek',
    defaultBaseUrl: 'https://api.deepseek.com',
    defaultModel: 'deepseek-chat',
    suggestedModels: ['deepseek-chat', 'deepseek-reasoner'],
    placeholderKey: 'sk-...',
    description: 'Model open-weight canggih DeepSeek-V3 & DeepSeek-R1 berkinerja tinggi.',
  },
  mistral: {
    type: 'mistral',
    name: 'Mistral AI',
    defaultBaseUrl: 'https://api.mistral.ai/v1',
    defaultModel: 'mistral-small-latest',
    suggestedModels: [
      'mistral-small-latest',
      'mistral-large-latest',
      'open-mistral-nemo',
      'codestral-latest',
    ],
    placeholderKey: '...',
    description: 'Model AI efisien dan akurat dari laboratorium Mistral AI Eropa.',
  },
  anthropic: {
    type: 'anthropic',
    name: 'Anthropic Claude',
    defaultBaseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-5-haiku-20241022',
    suggestedModels: [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
    ],
    placeholderKey: 'sk-ant-...',
    description: 'Model Claude terkemuka untuk pemahaman konteks mendalam dan keselamatan tinggi.',
  },
  custom: {
    type: 'custom',
    name: 'Custom OpenAI-Compatible API',
    defaultBaseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3',
    suggestedModels: ['llama3', 'mistral', 'qwen2.5:7b', 'phi3'],
    placeholderKey: 'Bearer token / opsional',
    description: 'Koneksi ke endpoint OpenAI-compatible lokal atau server mandiri (Ollama, vLLM, LM Studio).',
  },
};

export interface ChatMessage {
  role: 'user' | 'model' | 'assistant';
  text: string;
}

export interface ModelOption {
  id: string;
  name: string;
  description?: string;
}

export interface TestResult {
  success: boolean;
  latencyMs: number;
  message: string;
  sampleReply?: string;
  modelTested?: string;
}

/**
 * Fetch available models dynamically from provider API
 */
export async function fetchProviderModels(
  type: AiProviderType,
  baseUrl: string,
  apiKey: string
): Promise<ModelOption[]> {
  const cleanBase = (baseUrl || PROVIDER_TEMPLATES[type]?.defaultBaseUrl || '').replace(/\/+$/, '');

  try {
    // 1. Google Gemini Model Fetcher
    if (type === 'gemini') {
      const url = `${cleanBase}/v1beta/models?key=${encodeURIComponent(apiKey)}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Gemini API error (HTTP ${res.status}): ${await res.text()}`);
      }

      const data: any = await res.json();
      if (Array.isArray(data.models)) {
        return data.models
          .map((m: any) => ({
            id: m.name ? m.name.replace(/^models\//, '') : '',
            name: m.displayName || m.name || '',
            description: m.description || '',
          }))
          .filter((m: any) => m.id && (m.id.includes('gemini') || m.id.includes('flash') || m.id.includes('pro')));
      }
    }

    // 2. Anthropic Claude Model Fetcher
    if (type === 'anthropic') {
      const url = `${cleanBase}/models`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(url, {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data: any = await res.json();
        if (Array.isArray(data.data)) {
          return data.data.map((m: any) => ({
            id: m.id,
            name: m.display_name || m.id,
            description: 'Model resmi Anthropic Claude',
          }));
        }
      }
      // If endpoint not accessible, return preset models
      return PROVIDER_TEMPLATES.anthropic.suggestedModels.map((id) => ({
        id,
        name: id,
        description: 'Anthropic Claude model',
      }));
    }

    // 3. OpenAI and all OpenAI-Compatible APIs (NVIDIA, Groq, OpenRouter, DeepSeek, Mistral, Custom)
    const modelsUrl = cleanBase.endsWith('/models') ? cleanBase : `${cleanBase}/models`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const res = await fetch(modelsUrl, { headers, signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    }

    const data: any = await res.json();
    const list = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];

    if (list.length > 0) {
      return list
        .map((m: any) => ({
          id: m.id || m.name || '',
          name: m.name || m.id || '',
          description: m.description || (m.owned_by ? `Owner: ${m.owned_by}` : undefined),
        }))
        .filter((m: any) => m.id);
    }
  } catch (err: any) {
    console.warn(`[AI PROVIDER] Live model fetch failed for ${type}:`, err?.message);
  }

  // Fallback to template suggested models if API call fails
  const suggested = PROVIDER_TEMPLATES[type]?.suggestedModels || [];
  return suggested.map((id) => ({
    id,
    name: id,
    description: `Model bawaan rekomendasi untuk ${PROVIDER_TEMPLATES[type]?.name || type}`,
  }));
}

/**
 * Test connection to the AI provider with live ping & latency measurement
 */
export async function testProviderConnection(
  type: AiProviderType,
  baseUrl: string,
  apiKey: string,
  modelId: string
): Promise<TestResult> {
  const startTime = Date.now();
  const cleanBase = (baseUrl || PROVIDER_TEMPLATES[type]?.defaultBaseUrl || '').replace(/\/+$/, '');
  const targetModel = modelId || PROVIDER_TEMPLATES[type]?.defaultModel;

  if (!apiKey && type !== 'custom') {
    return {
      success: false,
      latencyMs: 0,
      message: 'API Key wajib diisi untuk melakukan pengujian koneksi.',
    };
  }

  try {
    // 1. Google Gemini Test
    if (type === 'gemini') {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: targetModel });
      const prompt = 'Halo! Respon secara singkat (1 kalimat ramah) konfirmasi bahwa Anda siap melayani Apotek Sehat AI.';

      const result = await model.generateContent(prompt);
      const latencyMs = Date.now() - startTime;
      const text = result.response.text();

      return {
        success: true,
        latencyMs,
        message: `Koneksi Google Gemini berhasil! (${latencyMs} ms)`,
        sampleReply: text.trim(),
        modelTested: targetModel,
      };
    }

    // 2. Anthropic Claude Test
    if (type === 'anthropic') {
      const url = `${cleanBase}/messages`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: targetModel,
          max_tokens: 60,
          messages: [{ role: 'user', content: 'Halo! Konfirmasi singkat siap melayani Apotek Sehat AI.' }],
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const latencyMs = Date.now() - startTime;
      if (!res.ok) {
        const errText = await res.text();
        return {
          success: false,
          latencyMs,
          message: `Gagal terhubung ke Anthropic (HTTP ${res.status}): ${errText.slice(0, 200)}`,
        };
      }

      const data: any = await res.json();
      const reply = data.content?.[0]?.text || 'Terhubung';

      return {
        success: true,
        latencyMs,
        message: `Koneksi Anthropic Claude berhasil! (${latencyMs} ms)`,
        sampleReply: reply.trim(),
        modelTested: targetModel,
      };
    }

    // 3. OpenAI and all OpenAI-Compatible APIs (NVIDIA, Groq, OpenRouter, DeepSeek, Mistral, Custom)
    const chatUrl = `${cleanBase}/chat/completions`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const res = await fetch(chatUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: targetModel,
        messages: [
          {
            role: 'user',
            content: 'Halo! Konfirmasi singkat (1 kalimat) siap melayani konsultasi Apotek Sehat AI.',
          },
        ],
        max_tokens: 60,
        temperature: 0.2,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const latencyMs = Date.now() - startTime;
    if (!res.ok) {
      const errText = await res.text();
      return {
        success: false,
        latencyMs,
        message: `Koneksi ke endpoint gagal (HTTP ${res.status}): ${errText.slice(0, 200)}`,
      };
    }

    const data: any = await res.json();
    const reply = data.choices?.[0]?.message?.content || 'Koneksi berhasil';

    return {
      success: true,
      latencyMs,
      message: `Koneksi ke ${PROVIDER_TEMPLATES[type]?.name || type} berhasil! (${latencyMs} ms)`,
      sampleReply: reply.trim(),
      modelTested: targetModel,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    console.error(`[AI PROVIDER] Test connection failed for ${type}:`, err);
    return {
      success: false,
      latencyMs,
      message: err.name === 'AbortError'
        ? 'Batas waktu koneksi habis (Timeout > 12 detik). Periksa URL atau koneksi jaringan.'
        : `Kesalahan jaringan: ${err.message || 'Tidak dapat menghubungi server'}`,
    };
  }
}

/**
 * Dispatch chat completion to the configured provider
 */
export async function dispatchProviderChat(
  type: AiProviderType,
  baseUrl: string,
  apiKey: string,
  modelId: string,
  systemPrompt: string,
  userMessage: string,
  history: ChatMessage[] = []
): Promise<string> {
  const cleanBase = (baseUrl || PROVIDER_TEMPLATES[type]?.defaultBaseUrl || '').replace(/\/+$/, '');
  const targetModel = modelId || PROVIDER_TEMPLATES[type]?.defaultModel;

  // 1. Google Gemini Chat Dispatcher
  if (type === 'gemini') {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: targetModel,
      systemInstruction: systemPrompt,
    });

    const geminiHistory = history.slice(-12).map((msg) => ({
      role: msg.role === 'model' || msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.text }],
    }));

    const chat = model.startChat({ history: geminiHistory });
    const result = await chat.sendMessage(userMessage);
    const text = result.response.text();
    if (!text) throw new Error('Gemini mengembalikan respon kosong.');
    return text;
  }

  // 2. Anthropic Claude Chat Dispatcher
  if (type === 'anthropic') {
    const url = `${cleanBase}/messages`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const messages = history.slice(-12).map((msg) => ({
      role: msg.role === 'model' || msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.text,
    }));
    messages.push({ role: 'user', content: userMessage });

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: targetModel,
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Anthropic error (${res.status}): ${await res.text()}`);
    }

    const data: any = await res.json();
    const content = data.content?.[0]?.text;
    if (!content) throw new Error('Anthropic mengembalikan respon kosong.');
    return content;
  }

  // 3. OpenAI & OpenAI-Compatible Dispatcher
  const chatUrl = `${cleanBase}/chat/completions`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
  ];

  for (const msg of history.slice(-12)) {
    messages.push({
      role: msg.role === 'model' || msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.text,
    });
  }
  messages.push({ role: 'user', content: userMessage });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const res = await fetch(chatUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: targetModel,
      messages,
      max_tokens: 1024,
      temperature: 0.2,
    }),
    signal: controller.signal,
  });
  clearTimeout(timeoutId);

  if (!res.ok) {
    throw new Error(`API error (${res.status}): ${await res.text()}`);
  }

  const data: any = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Model mengembalikan respon kosong.');
  return content;
}

