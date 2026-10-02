// AI Assistant Service — calls server-side /api/ai/chat endpoint
// API key is NEVER exposed on the frontend; all AI calls go through the backend.

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  isError?: boolean;
}

export interface AiChatResponse {
  success: boolean;
  data?: {
    reply: string;
    model: string;
  };
  message?: string;
}

export async function sendAiMessage(
  message: string,
  history: ChatMessage[]
): Promise<AiChatResponse> {
  const historyPayload = history
    .filter((msg) => !msg.isError)
    .map((msg) => ({
      role: msg.role,
      text: msg.text,
    }));

  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history: historyPayload }),
  });

  const data = await res.json();
  return data as AiChatResponse;
}

// Suggested quick prompts for the AI assistant
export const AI_QUICK_PROMPTS = [
  'Saya sedang demam, obat apa yang tersedia?',
  'Ada obat untuk sakit kepala?',
  'Saya cari vitamin C, tersedia apa saja?',
  'Apa itu obat yang membutuhkan resep?',
  'Bagaimana cara memesan obat di sini?',
  'Obat flu apa yang ada di katalog?',
  'Ada suplemen untuk daya tahan tubuh?',
  'Bagaimana cara upload resep dokter?',
];