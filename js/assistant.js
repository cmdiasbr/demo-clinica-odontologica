/*
  Assistente virtual simulado — respostas por palavra-chave, sem chamada externa de IA.
  Este é um projeto de demonstração; em produção, este mesmo front-end conversaria com um
  backend seguro (ex: Cloudflare Worker) que chama um LLM real (ex: Groq/Llama), como no
  projeto https://espacomariamariiah.github.io/.
*/
(function () {
  'use strict';

  var chatWindow = document.getElementById('chatWindow');
  var chatForm = document.getElementById('chatForm');
  var chatInput = document.getElementById('chatInput');
  var quickReplies = document.getElementById('quickReplies');

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

  function findReply(userText) {
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

  function showTypingThenReply(userText) {
    var typingEl = document.createElement('div');
    typingEl.className = 'msg bot typing';
    typingEl.innerHTML = '<span></span><span></span><span></span>';
    chatWindow.appendChild(typingEl);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    var delay = 500 + Math.random() * 700;
    setTimeout(function () {
      typingEl.remove();
      addMessage(findReply(userText), 'bot');
    }, delay);
  }

  function handleUserMessage(text) {
    text = text.trim();
    if (!text) return;
    addMessage(text, 'user');
    showTypingThenReply(text);
  }

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
