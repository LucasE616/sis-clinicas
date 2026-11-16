# PWA — especificação técnica

> Versão 0.1 — 16/11/2026. Complementa `arquitetura.md` (decisão A12) e `mvp.md` (D6 e D9).

O sis_Clinicas é um **PWA (Progressive Web App)**: um sistema web que pode ser **instalado** no computador e no celular. Ele ganha ícone próprio, abre em janela sem barra do navegador, envia notificações e mostra a agenda do dia quando a internet cai. Tudo isso sem loja de aplicativos, sem instalador e sem custo de distribuição.

## 1. O que o PWA entrega

| Recurso | Para quem | Onde funciona |
|---|---|---|
| **Instalar como app** (ícone, janela própria, abrir com um clique) | todos | Chrome e Edge no Windows, macOS e Android; Safari no iPhone/iPad ("Adicionar à Tela de Início") |
| **Atalhos no ícone** (Agenda, Marcar consulta, WhatsApp) | recepção | Chrome e Edge (clique direito no ícone ou toque longo no Android) |
| **Notificações** (paciente chegou, recado novo, mensagem no WhatsApp) | médicos e recepção | Chrome, Edge e Firefox; iPhone/iPad só com o app instalado na Tela de Início |
| **Contador no ícone** (mensagens e lembretes pendentes) | recepção | onde o navegador suporta (Chrome/Edge no computador e app instalado no iPhone) |
| **Agenda do dia sem internet**, somente leitura | recepção e médicos | todos |
| **Aviso de nova versão** ("Atualizar agora") | todos | todos |
| **Tela da TV sempre acesa** (Wake Lock) e tela cheia | painel de chamada | Chrome e Edge; demais, conforme suporte |
| **Impressão** (recibo, receita, atestado, agenda do dia) | todos | todos, também com o app instalado |

**Não é PWA:** o **assinador A3** (`arquitetura.md` §3.6). Ele é um programa pequeno instalado no Windows, porque o navegador não acessa o token.

## 2. Requisitos para o navegador reconhecer o PWA

| Requisito | Como atendemos |
|---|---|
| HTTPS | Cloudflare + Caddy em produção; `localhost` no desenvolvimento |
| Web App Manifest | `manifest.webmanifest` gerado pelo `vite-plugin-pwa` (§3) |
| Service worker | gerado pelo `vite-plugin-pwa` com Workbox (§4) |
| Ícones 192 e 512 px, inclusive "maskable" | em `apps/web/public/icons/` |

## 3. Manifest

```json
{
  "id": "/",
  "name": "sis_Clinicas",
  "short_name": "sis_Clinicas",
  "description": "Agenda, recepção, consulta, pagamentos e WhatsApp da clínica.",
  "lang": "pt-BR",
  "start_url": "/?origem=app",
  "scope": "/",
  "display": "standalone",
  "orientation": "any",
  "theme_color": "#11252A",
  "background_color": "#F3F6F6",
  "icons": [
    { "src": "/icons/192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "shortcuts": [
    { "name": "Agenda", "url": "/agenda" },
    { "name": "Marcar consulta", "url": "/agenda?marcar=1" },
    { "name": "WhatsApp", "url": "/whatsapp" }
  ],
  "screenshots": [
    { "src": "/telas/agenda-larga.png", "sizes": "1280x800", "type": "image/png", "form_factor": "wide" },
    { "src": "/telas/inicio-celular.png", "sizes": "750x1334", "type": "image/png" }
  ]
}
```

- O **painel da TV** (`/painel/<código>`) fica dentro do mesmo PWA. Na TV, basta abrir o endereço no navegador; não precisa instalar.
- As capturas de tela (`screenshots`) deixam o convite de instalação mais completo no Chrome e no Android.

## 4. Service worker e cache

Ferramenta: **`vite-plugin-pwa`** (licença MIT) com **Workbox**, no modo `injectManifest`. Nesse modo, nós escrevemos o service worker e o plugin só adiciona a lista de arquivos do app. É necessário para tratar as notificações (§6).

| O que | Estratégia | Observação |
|---|---|---|
| Arquivos do app (HTML, JS, CSS, fontes, ícones) | **pré-cache** a cada versão | o app abre mesmo sem internet |
| `GET /api/v1/agenda/hoje` (contingência) | **rede primeiro**, cache como reserva | só a agenda **do dia**, campos mínimos (§5) |
| Demais chamadas da API | **só rede**, nunca em cache | inclui prontuário, financeiro e dados de pacientes |
| Arquivos (exames, PDFs) | **só rede** | os links do R2 expiram em 5 minutos |
| Envio de dados (marcar, receber, assinar) | **só rede**, sem fila offline | decisão D7: sem sincronização com conflitos |

**Atualização de versão** (`registerType: 'prompt'`): quando há versão nova, aparece o aviso "Nova versão disponível — Atualizar agora". A atualização nunca acontece no meio de uma consulta ou de um pagamento: o aviso espera a pessoa fechar a janela aberta.

## 5. Sem internet (contingência)

Decisão D7: o sistema é online. O PWA só garante que a clínica **não fique às cegas** quando a conexão cai.

| Situação | O que a pessoa vê |
|---|---|
| Internet caiu | faixa amarela "Sem conexão — mostrando a agenda de hoje das HH:MM"; botões de ação desligados |
| Agenda do dia | lista somente leitura: horário, primeiro nome e inicial do sobrenome, médico, procedimento, situação |
| Prontuário, pagamentos, WhatsApp | "Disponível quando a conexão voltar" |
| Conexão voltou | faixa some, tela recarrega os dados, aviso "Conectado de novo" |
| Impressão | botão "Imprimir agenda do dia" funciona sem internet, a partir do cache |

**Proteção dos dados guardados (LGPD):**
- Só a agenda do dia, sem CPF, telefone, alergias ou dados clínicos.
- Guardada no **Cache Storage** do navegador, com validade até 23:59 do dia.
- **Apagada ao sair** do sistema, ao trocar de usuário e quando a sessão expira.
- Só fica guardada em computadores marcados como "computador da clínica" no primeiro acesso. No celular pessoal, nada fica guardado.

## 6. Notificações (Web Push)

| Item | Escolha |
|---|---|
| Padrão | **Web Push** com chaves **VAPID**, biblioteca `web-push` (gratuita) no servidor |
| Permissão | pedida **depois** de o usuário entrar e só quando fizer sentido ("Quer ser avisado quando o paciente chegar?"), nunca na primeira tela |
| Tabela | `push_inscricao (id, usuario_id, endpoint, chaves jsonb, dispositivo, criado_em, ultimo_envio_em)` |
| Conteúdo | **sem dados de saúde**: "Paciente chegou: Maria S. — Consultório 1"; "Novo recado de Carla"; "2 mensagens no WhatsApp" |
| Ao tocar | abre o app na tela certa (consulta, recados, WhatsApp) |
| iPhone/iPad | só funciona com o app instalado na Tela de Início; o sistema mostra o passo a passo |

| Evento | Quem recebe |
|---|---|
| Paciente chegou | médico daquele atendimento |
| Paciente esperando há mais de 30 min | recepção e gestão |
| Recado direto ou menção | a pessoa citada |
| Mensagem nova no WhatsApp (com API) | quem atende o WhatsApp |
| Caixa aberto desde ontem | quem tem permissão de caixa |

## 7. Instalação pelos usuários

- **Botão "Instalar o app"** no menu do usuário, quando o navegador oferece a instalação (evento `beforeinstallprompt` no Chrome e Edge).
- **iPhone/iPad:** tela com o passo a passo (Compartilhar → Adicionar à Tela de Início), porque o Safari não tem botão automático.
- **Computadores da clínica:** o guia de implantação inclui instalar o app em cada PC e fixar na barra de tarefas.
- Detectar se já está instalado (`display-mode: standalone`) para não mostrar o convite de novo.

## 8. Layout e uso no celular (D9)

- Todas as telas funcionam de 360 px de largura para cima, sem rolagem lateral.
- Menu inferior no celular, lateral no computador (como no esboço).
- Alvos de toque com pelo menos 44 px; campos com `inputmode` certo (telefone, número, e-mail).
- Respeitar as áreas seguras do iPhone (`env(safe-area-inset-*)`).
- Tema claro e escuro conforme o sistema do aparelho.

## 9. Segurança específica do PWA

- O service worker só controla o próprio domínio (`scope: /`) e é servido com `Cache-Control: no-cache`, para as correções chegarem rápido.
- Política de segurança de conteúdo (CSP) restritiva no Caddy: scripts só do próprio domínio.
- Sessão por cookie `httpOnly`: o token nunca fica acessível ao JavaScript nem ao cache.
- Bloqueio da tela por inatividade também no app instalado.

## 10. Testes

| O que testar | Como |
|---|---|
| Instalação, ícone, atalhos, janela própria | manual, em cada navegador da matriz abaixo |
| Funcionamento sem internet | Playwright com `context.setOffline(true)` + teste manual tirando o cabo de rede |
| Atualização de versão | publicar duas versões em homologação e conferir o aviso |
| Notificações | Playwright (Chromium) + teste manual em Android e iPhone |
| Manifest e service worker | painel "Application" das ferramentas de desenvolvedor do Chrome |
| Acessibilidade e desempenho | Lighthouse (as notas de PWA saíram do Lighthouse; a checagem de instalação é a do item acima) |

**Matriz mínima:** Chrome e Edge no Windows 10/11, Chrome no Android, Safari no iPhone (iOS atual e o anterior), Firefox no Windows (só navegador, sem instalação).

## 11. Como fica no código

```
apps/web/
├─ public/
│  ├─ icons/            # 192, 512, maskable, favicon
│  └─ telas/            # screenshots do manifest
├─ src/
│  ├─ sw.js             # service worker (Workbox + push + cache da agenda do dia)
│  ├─ pwa/
│  │  ├─ instalar.js    # botão de instalar e passo a passo do iPhone
│  │  ├─ atualizar.js   # aviso de nova versão
│  │  ├─ conexao.js     # faixa "sem conexão" e modo somente leitura
│  │  └─ notificacoes.js# permissão, inscrição e envio da inscrição ao servidor
│  └─ ...
└─ vite.config.js       # VitePWA({ strategies: 'injectManifest', registerType: 'prompt', manifest })

apps/api/src/modulos/notificacoes/   # chaves VAPID, inscrições, envio (web-push)
```

## 12. Primeiro passo possível já

O **esboço atual** (HTML, CSS e JS no GitHub Pages) pode virar PWA instalável em pouco tempo: manifest, ícones e um service worker simples. Assim a clínica testa a instalação no PC e no celular antes do sistema definitivo. Ver a Fase 0 do `plano-de-acao.md`.
