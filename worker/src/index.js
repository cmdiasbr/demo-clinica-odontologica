// Cloudflare Worker: proxy seguro entre o site e a API da Groq (LLM open source Llama 3.3).
// A API key da Groq fica só aqui (como secret), nunca no front-end.
// Projeto de demonstração (portfólio de Camila Dias) — negócio e dados fictícios.

const CLINIC_FAQ = `
Você é a assistente virtual da Sorriso Vitale Odontologia, um site de demonstração criado por
Camila Dias para mostrar como um assistente de IA pode ficar no centro da experiência de um
site de clínica. Deixe claro, se perguntarem, que este é um projeto de demonstração (negócio
fictício) usado para ilustrar a solução — mas responda ao restante das perguntas normalmente,
como se fosse a assistente real da clínica.

Responda de forma simpática, breve e objetiva (2-4 frases), em português do Brasil.
Se não souber uma informação específica, oriente a pessoa a confirmar pelo WhatsApp no rodapé
do site, sem inventar dados.

Informações da clínica (fictícias, apenas para demonstração):
- Endereço: Av. Exemplo Fictício, 1234 — Centro, Cidade Modelo/SP
- Horário: segunda a sábado, das 8h às 19h. Emergências 24h.
- Convênios: principais convênios da região + particular parcelado em até 12x

Tratamentos oferecidos:
- Limpeza e prevenção (profilaxia, remoção de tártaro)
- Clareamento dental (a laser no consultório ou caseiro supervisionado)
- Ortodontia (aparelhos fixos, estéticos e alinhadores transparentes)
- Implantes (unitários e reabilitação completa, com planejamento 3D)
- Emergência odontológica 24h (dor, trauma, urgências)

Não forneça diagnósticos médicos nem indique tratamentos sem avaliação presencial.
Se o visitante quiser agendar ou falar com um humano, direcione para o botão de WhatsApp
no rodapé do site.
`.trim();

const MODEL = "llama-3.3-70b-versatile";
const MAX_HISTORY_MESSAGES = 8;
const MAX_MESSAGE_LENGTH = 800;

export default {
  async fetch(request, env) {
    const allowedOrigin = env.ALLOWED_ORIGIN || "*";
    const corsHeaders = {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "Método não suportado" }, 405, corsHeaders);
    }

    const url = new URL(request.url);
    if (url.pathname !== "/chat") {
      return jsonResponse({ error: "Rota não encontrada" }, 404, corsHeaders);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: "JSON inválido" }, 400, corsHeaders);
    }

    const messages = Array.isArray(body?.messages) ? body.messages : null;
    if (!messages || messages.length === 0) {
      return jsonResponse({ error: "Campo 'messages' é obrigatório" }, 400, corsHeaders);
    }

    const lastUserMessage = messages[messages.length - 1];
    if (
      typeof lastUserMessage?.content !== "string" ||
      lastUserMessage.content.length === 0 ||
      lastUserMessage.content.length > MAX_MESSAGE_LENGTH
    ) {
      return jsonResponse({ error: "Mensagem inválida ou muito longa" }, 400, corsHeaders);
    }

    if (env.RATE_LIMIT_KV) {
      const ip = request.headers.get("CF-Connecting-IP") || "unknown";
      const limitResponse = await checkRateLimit(env.RATE_LIMIT_KV, ip, corsHeaders);
      if (limitResponse) return limitResponse;
    }

    const trimmedHistory = messages.slice(-MAX_HISTORY_MESSAGES).map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content).slice(0, MAX_MESSAGE_LENGTH),
    }));

    try {
      const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: "system", content: CLINIC_FAQ }, ...trimmedHistory],
          temperature: 0.4,
          max_tokens: 300,
        }),
      });

      if (!groqResponse.ok) {
        const errText = await groqResponse.text();
        console.error("Erro Groq:", groqResponse.status, errText);
        return jsonResponse({ error: "Erro ao consultar o modelo" }, 502, corsHeaders);
      }

      const data = await groqResponse.json();
      const reply = data?.choices?.[0]?.message?.content?.trim() || "Desculpe, não consegui gerar uma resposta agora.";

      return jsonResponse({ reply }, 200, corsHeaders);
    } catch (err) {
      console.error("Erro inesperado:", err);
      return jsonResponse({ error: "Erro interno" }, 500, corsHeaders);
    }
  },
};

function jsonResponse(obj, status, corsHeaders) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

async function checkRateLimit(kv, ip, corsHeaders) {
  const key = `rl:${ip}`;
  const WINDOW_SECONDS = 60;
  const MAX_REQUESTS = 12;

  const current = parseInt((await kv.get(key)) || "0", 10);
  if (current >= MAX_REQUESTS) {
    return jsonResponse(
      { error: "Muitas mensagens em pouco tempo. Aguarde um instante." },
      429,
      corsHeaders
    );
  }
  await kv.put(key, String(current + 1), { expirationTtl: WINDOW_SECONDS });
  return null;
}
