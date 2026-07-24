/*
  Assistente virtual com IA real (Llama 3.3 via Groq), através de um Cloudflare Worker que
  guarda a API key com segurança — o front-end nunca tem acesso à chave.
  Se o Worker estiver indisponível (rede, cold start, etc.), cai para respostas locais por
  palavra-chave, para o chat nunca ficar "morto" numa demonstração pública.
*/
(function () {
  'use strict';

  var CHAT_ENDPOINT = 'https://clinica-odontologica-chat.cmdias.workers.dev/chat';

  var chatWindow = document.getElementById('chatWindow');
  var chatForm = document.getElementById('chatForm');
  var chatInput = document.getElementById('chatInput');
  var quickReplies = document.getElementById('quickReplies');

  var history = [];

  var RULES = [
    {
      keys: ['tratamento', 'servico', 'serviço', 'faz o que', 'oferece'],
      reply: 'Fazemos limpeza e prevenção, clareamento dental, ortodontia (aparelhos e alinhadores), implantes e atendimento de emergência 24h. Quer saber mais sobre algum deles?'
    },
    {
      keys: ['convenio', 'convênio', 'plano'],
      reply: 'Atendemos os principais convênios da região, além de particular com parcelamento em até 12x. Consegue me dizer qual convênio você tem para eu confirmar?'
    },
    {
      keys: ['clareamento', 'branqueamento', 'dente amarelo'],
      reply: 'O clareamento pode ser feito no consultório (a laser, resultado mais rápido) ou em casa com moldeira supervisionada pela nossa equipe. Os dois são seguros para o esmalte dental.'
    },
    {
      keys: ['emergencia', 'emergência', 'urgencia', 'urgência', 'dor', 'doendo', 'quebrei'],
      reply: 'Sinto muito, isso não é legal! 😟 Para emergências atendemos 24h. Me chama agora no WhatsApp que já te encaixamos: clique no botão no rodapé da página.'
    },
    {
      keys: ['preco', 'preço', 'valor', 'quanto custa', 'orcamento', 'orçamento'],
      reply: 'Os valores variam bastante conforme o tratamento e o convênio. Consigo te passar uma faixa aproximada se você me disser qual procedimento tem interesse — ou prefere já agendar uma avaliação gratuita?'
    },
    {
      keys: ['agendar', 'agendamento', 'horario', 'horário', 'marcar consulta'],
      reply: 'Perfeito! Nosso horário de atendimento é de segunda a sábado, das 8h às 19h. Para fechar o melhor horário pra você, é só chamar no WhatsApp da recepção (link no rodapé).'
    },
    {
      keys: ['ortodontia', 'aparelho', 'alinhador', 'invisalign'],
      reply: 'Trabalhamos com aparelhos fixos metálicos, estéticos e alinhadores transparentes. O ideal é uma avaliação para indicar a melhor opção pro seu caso — quer que eu te ajude a agendar?'
    },
    {
      keys: ['implante'],
      reply: 'Fazemos implantes unitários e reabilitação completa, sempre com planejamento por imagem 3D antes da cirurgia. Posso te passar mais detalhes sobre o processo, se quiser.'
    },
    {
      keys: ['endereco', 'endereço', 'onde fica', 'localizacao', 'localização'],
      reply: 'Ficamos na Av. Exemplo Fictício, 1234 — Centro, Cidade Modelo/SP (endereço de demonstração). '
    },
    {
      keys: ['oi', 'ola', 'olá', 'bom dia', 'boa tarde', 'boa noite'],
      reply: 'Oi! 😊 Como posso te ajudar hoje — tratamentos, valores, convênio ou agendamento?'
    },
    {
      keys: ['obrigado', 'obrigada', 'valeu', 'brigado'],
      reply: 'Por nada! Se precisar de mais alguma coisa, é só chamar. 🦷✨'
    }
  ];

  var FALLBACK = [
    'Essa eu preciso confirmar com a equipe para não te passar informação errada — pode me chamar no WhatsApp da recepção (link no rodapé) que te respondemos rapidinho?',
    'Boa pergunta! Ainda não tenho esse detalhe aqui comigo, mas nossa equipe consegue te ajudar direto pelo WhatsApp.'
  ];

  function normalize(str) {
    return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  function findLocalReply(userText) {
    var text = normalize(userText);
    for (var i = 0; i < RULES.length; i++) {
      var rule = RULES[i];
      for (var j = 0; j < rule.keys.length; j++) {
        if (text.indexOf(normalize(rule.keys[j])) !== -1) return rule.reply;
      }
    }
    return FALLBACK[Math.floor(Math.random() * FALLBACK.length)];
  }

  function addMessage(text, who) {
    var el = document.createElement('div');
    el.className = 'msg ' + who;
    el.textContent = text;
    chatWindow.appendChild(el);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    return el;
  }

  function showTyping() {
    var typingEl = document.createElement('div');
    typingEl.className = 'msg bot typing';
    typingEl.innerHTML = '<span></span><span></span><span></span>';
    chatWindow.appendChild(typingEl);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    return typingEl;
  }

  async function fetchAIReply() {
    var res = await fetch(CHAT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history }),
    });
    if (!res.ok) throw new Error('Worker respondeu ' + res.status);
    var data = await res.json();
    if (!data.reply) throw new Error('Resposta sem conteúdo');
    return data.reply;
  }

  async function handleUserMessage(text) {
    text = text.trim();
    if (!text) return;
    addMessage(text, 'user');
    history.push({ role: 'user', content: text });

    var typingEl = showTyping();
    var reply;
    try {
      reply = await fetchAIReply();
    } catch (err) {
      console.error('Falha ao consultar a IA, usando resposta local:', err);
      reply = findLocalReply(text);
    }
    typingEl.remove();
    addMessage(reply, 'bot');
    history.push({ role: 'assistant', content: reply });
  }

  window.AssistantChat = { handleUserMessage: handleUserMessage, addMessage: addMessage };

  if (chatForm) {
    chatForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var text = chatInput.value;
      chatInput.value = '';
      handleUserMessage(text);
    });
  }

  if (quickReplies) {
    quickReplies.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-q]');
      if (!btn) return;
      handleUserMessage(btn.getAttribute('data-q'));
    });
  }
})();
