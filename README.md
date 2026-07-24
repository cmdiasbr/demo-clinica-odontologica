# Sorriso Vitale Odontologia (projeto de demonstração)

Site modelo de clínica odontológica, criado como parte do [portfólio de Camila Dias](https://cmdiasbr.github.io/negocios.html)
para demonstrar como um **assistente virtual de IA** pode ser o ponto central da experiência
de um site — e não apenas um chat escondido no canto da tela.

**Negócio, endereço e dados de contato são fictícios.** Nenhuma informação aqui representa uma clínica real.

## O que este projeto demonstra

- Site institucional simples, responsivo, com HTML/CSS/JS puro (sem frameworks).
- Assistente virtual embutido no centro da página inicial, com **IA real** (Llama 3.3 via Groq)
  respondendo perguntas sobre tratamentos, convênios, valores, emergência e agendamento.
- Indicador de "digitando..." para simular uma conversa natural.

## Arquitetura: front-end + Cloudflare Worker + Groq

O front-end (`js/assistant.js`) nunca tem acesso a nenhuma chave de API. Ele envia o histórico
da conversa para um [Cloudflare Worker](worker/) (`worker/src/index.js`), que guarda a API key
da Groq como *secret* e faz a chamada ao modelo `llama-3.3-70b-versatile`. Esse é o mesmo padrão
usado em [espacomariamariiah.github.io](https://espacomariamariiah.github.io/).

Se o Worker estiver indisponível (rede, cold start etc.), o front-end cai automaticamente
para respostas locais por palavra-chave, para o chat nunca ficar "morto" numa demonstração pública.

Para rodar o Worker localmente: use `wrangler dev` dentro da pasta `worker/`, com uma
`worker/.dev.vars` local (não versionada) baseada em `worker/.dev.vars.example`.

## Quer algo assim para o seu negócio?

Fale com [Camila Dias](https://cmdiasbr.github.io/negocios.html) — desenvolvimento de sites
e assistentes de IA sob medida para captar e atender mais clientes.
