# Arquitetura — sis_Clinicas

> Versão 0.3 — 10/11/2026 — sistema web, JavaScript, custo mínimo
>
> v0.2 substituiu a v0.1 (app desktop com servidor local), porque os primeiros clientes não querem manter servidor dentro da clínica.
> v0.3 incorpora o levantamento de requisitos (`mvp.md` v0.3): **assinador local para token A3** (§3.6), **WhatsApp em três formas**, incluindo API não oficial opcional (§3.7), e **importação de dados** (§3.8).

## 1. Decisões

| # | Decisão | Motivo |
|---|---|---|
| A1 | **Sistema web**: a clínica só precisa de navegador e internet | Nada para instalar nem manter na clínica; o médico acessa de casa ou do celular |
| A2 | **JavaScript** (não TypeScript) no front e no back, com módulos ES | Uma linguagem só, sem etapa de compilação no servidor. A segurança de tipos vem de validação com Zod, testes e JSDoc opcional (§10.1) |
| A3 | Front em **React + Vite** (SPA), **sem Next.js** | Todo o sistema fica atrás de login, então a renderização no servidor do Next não traz ganho; o Vite gera arquivos estáticos simples de hospedar |
| A4 | Back em **Node.js LTS + Fastify** | Leve, rápido, validação e logs embutidos, funciona bem em JS puro (o NestJS depende de decorators do TypeScript) |
| A5 | Banco **PostgreSQL** (não MongoDB) | Ver §3.3: dinheiro com transações, bloqueio de horário duplicado no próprio banco, prontuário imutável, separação por clínica |
| A6 | **Sem Redis**: filas e tarefas agendadas no próprio PostgreSQL (pg-boss) | Um serviço a menos para pagar e manter |
| A7 | **Multi-clínica desde o início** (`clinica_id` + Row-Level Security) | Agora o sistema roda num servidor nosso: a 2ª clínica entra sem nova instalação |
| A8 | Hospedagem no **Oracle Cloud Always Free, região São Paulo**, com **Docker Compose** | Gratuito, com folga para várias clínicas; dados no Brasil; Docker permite mudar de provedor em uma hora (§4) |
| A9 | **Cloudflare (plano gratuito)** na frente: DNS, HTTPS, proteção contra ataques | Gratuito |
| A10 | Backup criptografado num **provedor diferente** do servidor (Backblaze B2) | Se a conta da Oracle tiver problema, os dados estão em outro lugar |
| A11 | **WhatsApp em três formas, escolhidas pela clínica**: `wa.me` gratuito (início), **Cloud API oficial** (objetivo) e **API não oficial** (opcional, desligada por padrão). Cada forma é um módulo com a mesma interface | O perfil dos clientes pede a opção não oficial; isolar em módulos permite trocar sem afetar o resto e desligar se der problema (§3.7) |
| A12 | Pode ser **instalado como app** no PC e no celular (PWA): ícone, janela própria, notificações. Todas as telas com layout para celular | Mesma experiência de "programa instalado" sem instalador, sem custo |
| A13 | **Assinador local** para token A3, instalado só nos PCs dos médicos que usam token. Conexão **de saída** com o servidor, sem porta aberta no PC | O navegador não acessa o token sozinho; a conexão de saída evita os bloqueios dos navegadores a `localhost` (§3.6) |
| A14 | **Importação de dados** processada em fila no servidor, com prévia e opção de desfazer | Clínicas vindas de planilhas ou de outros sistemas (§3.8) |

**Em relação ao `mvp.md`:** D6 é **web**, com a única instalação sendo o assinador A3; D7 é **online obrigatório**, com contingência (§6).

## 2. Visão geral

```mermaid
flowchart TB
  subgraph Clinica["Clínica (navegador)"]
    R["PC Recepção"]
    C["PCs Consultórios"]
    A3["Assinador local<br/>(só PCs com token A3)"]
    M["Celular do médico"]
    TV["TV da sala de espera"]
  end
  R & C & M & TV -->|HTTPS + WebSocket| CF["Cloudflare<br/>DNS · HTTPS · proteção<br/>(gratuito)"]
  A3 -->|WebSocket de saída| CF
  subgraph OCI["Oracle Cloud Always Free — São Paulo"]
    CADDY["Caddy<br/>arquivos do front + proxy"]
    API["api<br/>Node.js + Fastify<br/>API · tempo real · tarefas"]
    WAN["mensageria<br/>wa.me · Cloud API · não oficial"]
    DB[("PostgreSQL")]
    CADDY --> API --- DB
    API --- WAN
  end
  CF --> CADDY
  API -->|arquivos| R2["Cloudflare R2<br/>exames e PDFs"]
  API --> EXT["Memed · certificado em nuvem ·<br/>BrasilAPI · e-mail"]
  WAN --> WA["WhatsApp<br/>(Cloud API ou sessão não oficial)"]
  WA -->|webhook| CF
  OCI -->|backup cifrado diário| B2["Backblaze B2"]
```

- A clínica abre `app.sisclinicas.com.br` no navegador (ou no ícone instalado). Não há servidor na clínica.
- Um único servidor atende todas as clínicas. Cada registro tem `clinica_id`, e o banco impede que uma clínica veja dados de outra (RLS).
- O WhatsApp chega direto no servidor, que já é público. Não precisa de túnel.
- O único programa instalado na clínica é o assinador A3, e só nos PCs de quem assina com token.

## 3. Componentes

### 3.1 Front (`apps/web`)

| Item | Escolha |
|---|---|
| Base | React + Vite, JavaScript (JSX) |
| Telas e componentes | Mantine (licença MIT; formulários, datas, avisos e tema claro/escuro prontos), com o visual simples já validado nos simuladores: botões grandes e poucos campos por tela |
| Rotas e dados | React Router + TanStack Query (cache, recarregar ao voltar para a aba) |
| Formulários | Mantine Form + os mesmos esquemas Zod do servidor |
| Agenda | **componente próprio**, igual à grade dos simuladores. Evita os plugins pagos do FullCalendar (a visão por profissional é paga) |
| Tempo real | Socket.IO client: agenda, chegada de paciente, inbox, painel da TV |
| Impressão | página de impressão com CSS próprio (recibo, receita, atestado) e `window.print()` |
| PWA | `vite-plugin-pwa`: instalar como app, notificações, agenda do dia em cache para contingência (§6) |

### 3.2 Back (`apps/api`)

| Item | Escolha |
|---|---|
| Base | Node.js LTS + Fastify, JavaScript com módulos ES |
| Banco | **postgres.js** com SQL escrito à mão; migrações em SQL puro com `node-pg-migrate`. Sem ORM: as regras mais importantes (constraints, triggers, RLS) já são SQL |
| Validação | Zod, com os esquemas em `packages/shared` usados também no front |
| Login | sessão no servidor (tabela `sessao`) com cookie `httpOnly` + `Secure` + `SameSite=Strict`; senha com Argon2id (`@node-rs/argon2`); verificação em duas etapas TOTP (`otplib`), **obrigatória para todos**, porque o sistema agora está na internet |
| Proteção | `@fastify/rate-limit` (tentativas de login), `@fastify/helmet` (cabeçalhos), CSRF por `SameSite` + checagem de origem |
| Tempo real | Socket.IO. Com mais de uma instância, o adaptador oficial para PostgreSQL, ainda sem Redis |
| Tarefas e filas | pg-boss: lembretes, envio de WhatsApp com novas tentativas, expiração de sessões, relatórios agendados |
| PDF | pdfmake (gera no servidor, sem navegador embutido) |
| Assinatura de PDF | `@signpdf` para PAdES, com **certificado em nuvem** (§5) ou **token A3** pelo assinador local (§3.6) |
| Mensageria | um módulo por forma de WhatsApp (`wa.me`, Cloud API, não oficial), todos com a mesma interface: `enviar`, `receber`, `status` (§3.7) |
| Importação | `exceljs` e um leitor de CSV (§3.8) |
| Logs | pino (já vem no Fastify), sem dados pessoais |

### 3.3 Banco de dados: PostgreSQL, não MongoDB

| Necessidade do sistema | PostgreSQL | MongoDB |
|---|---|---|
| Impedir dois pacientes no mesmo horário, garantido pelo banco | `EXCLUDE USING gist` (já desenhado no `mvp.md` §5.5) | não tem equivalente; só checando no código, sujeito a corrida entre duas recepcionistas |
| Dinheiro: pagamento, estorno e caixa sempre consistentes | transações ACID maduras | tem transações, mas o modelo de documentos não ajuda |
| Prontuário assinado imutável | trigger que bloqueia alteração e exclusão | não tem triggers no servidor comunitário |
| Separar clínicas no mesmo servidor | Row-Level Security: o banco filtra por `clinica_id` mesmo se o código esquecer | só no código |
| Relatórios (faturamento, faltas, ocupação) | SQL com junções | agregações mais trabalhosas |
| Campos flexíveis (modelos de prontuário por especialidade) | `jsonb` resolve | ponto forte do MongoDB, mas o `jsonb` cobre |
| Licença | PostgreSQL License (livre, inclusive para vender como SaaS) | SSPL, que restringe oferecer o banco como serviço |

Extensões, todas gratuitas: `btree_gist`, `pg_trgm` (busca de pacientes tolerante a erros de digitação), `unaccent`, `pgcrypto`.

**RLS na prática:** a API abre cada requisição com `SET LOCAL app.clinica_id = ...` dentro de uma transação, e todas as tabelas têm a política `clinica_id = current_setting('app.clinica_id')::uuid`. O usuário do banco usado pela API não é dono das tabelas, então não consegue desligar a regra.

### 3.4 Arquivos

Exames, imagens e PDFs assinados ficam no **Cloudflare R2** (compatível com S3, 10 GB grátis, sem cobrança de download), num bucket privado, separados por clínica e paciente. O hash SHA-256 de cada arquivo fica no banco. Para abrir um arquivo, a API confere a permissão, registra a leitura na auditoria e devolve um link temporário de 5 minutos.

### 3.5 Painel da TV

Página `/painel/<código>` aberta em qualquer TV com navegador, Chromecast ou PC velho ligado na TV. Usa um código por sala, sem login de usuário, e só mostra o primeiro nome e a sala.

### 3.6 Assinador local para token A3 (`apps/assinador`)

O navegador não acessa o token A3 sozinho. O assinador é um programa pequeno, instalado **só nos PCs dos médicos que usam token**.

| Item | Escolha |
|---|---|
| Linguagem | JavaScript (Node.js), empacotado como executável único (Node SEA) para Windows; mesma linguagem do resto do sistema |
| Acesso ao token | PKCS#11 com `pkcs11js` (licença MIT), usando o driver do fabricante já instalado no PC (SafeNet, Watchdata, GD etc.) |
| Comunicação | **conexão de saída** (WebSocket seguro) do assinador para o servidor. Não abre porta no PC e não depende de `localhost`, que os navegadores restringem cada vez mais |
| Pareamento | na primeira vez, o médico entra no sistema pelo navegador, que mostra um código; o assinador recebe o código e fica ligado àquele usuário. Pode ser desligado pelo Admin |
| Fluxo | o médico clica em assinar → o servidor gera o resumo (hash) do PDF → envia ao assinador do médico → o assinador pede o PIN do token, assina e devolve → o servidor monta o PDF assinado (PAdES) e confere |
| Instalação | instalador `.exe` gerado no GitHub Actions; inicia com o Windows, fica na bandeja; atualização automática |
| Segurança | a chave privada nunca sai do token; o PIN é digitado no assinador e não vai para o servidor; o assinador só aceita pedidos do usuário pareado e mostra o nome do paciente e o tipo do documento antes de assinar |

**Alternativa:** licenciar um componente pronto (ex.: Web PKI, da Lacuna), que já resolve os drivers e o navegador, mas tem custo de licença. A decisão fica nos pontos em aberto (§14).

**Custo escondido:** sem um certificado de assinatura de código, o Windows mostra um aviso ao instalar o assinador. Dá para começar assim com a clínica piloto; para distribuir a outras clínicas, o certificado passa a valer a pena (§11).

### 3.7 WhatsApp: três formas de conexão

Cada clínica escolhe a forma em Configurações. O resto do sistema (agenda, lembretes, inbox) fala só com a interface comum `mensageria`, sem saber qual forma está ligada.

| Forma | Como funciona no servidor | Custo | Recursos |
|---|---|---|---|
| **`wa.me`** | nenhum: o navegador da recepção abre o WhatsApp com o texto pronto | R$ 0 | só envio manual; sem inbox |
| **Cloud API (oficial)** | chamadas HTTP para a Meta; mensagens recebidas por webhook | por mensagem de modelo (lembretes); resposta em até 24 h gratuita | envio automático, inbox, botões, status de entrega |
| **Não oficial** | biblioteca que imita o WhatsApp Web, mantendo **uma sessão aberta por clínica** no servidor. Preferir as que falam o protocolo direto (ex.: Baileys), sem navegador embutido, por usarem muito menos memória que as baseadas em Chromium | R$ 0 | envio automático e inbox; sem botões oficiais |

**Cuidados com a forma não oficial:**
- Viola os termos do WhatsApp; o número da clínica pode ser **bloqueado**. Fica **desligada por padrão**. Para ligar, o Admin aceita um termo de ciência, registrado com data e usuário.
- Roda num **processo separado** da API (`mensageria-nao-oficial` no Docker Compose). Se travar ou for bloqueada, a agenda, o prontuário e o caixa não são afetados.
- Os dados de sessão (chaves do WhatsApp da clínica) ficam criptografados no banco.
- Reconexão automática e aviso para a clínica quando a sessão cair, com novo QR Code.
- Volume de envio limitado, com intervalos entre mensagens, para reduzir o risco de bloqueio.
- Precisa de parecer jurídico e de constar no termo de tratamento de dados (LGPD), porque dados de saúde passam por uma biblioteca sem garantia do WhatsApp.
- As bibliotecas quebram quando o WhatsApp muda. Fixar versões e ter um plano de volta para `wa.me`.

### 3.8 Importação de dados

- O Admin baixa o modelo de planilha, preenche e envia. O arquivo vai para o R2, e a tarefa `importacao.processar` (pg-boss) lê, valida e monta a prévia, sem gravar nada ainda.
- A tela mostra a prévia: quantos registros serão criados ou atualizados, os duplicados (mesmo CPF ou celular) e os erros linha a linha.
- Ao confirmar, a gravação acontece **em uma transação por lote**, com `importacao_item` guardando cada registro criado, o que permite **desfazer** a importação enquanto nada foi alterado depois.
- Prontuários antigos (PDF ou imagens) entram como anexos na ficha do paciente.
- Limite inicial: 20 mil linhas por arquivo, para caber com folga na VM gratuita.

## 4. Hospedagem

### 4.1 Recomendação: Oracle Cloud Always Free

| Recurso gratuito (sempre) | Uso |
|---|---|
| VM ARM (Ampere) com até 4 núcleos e 24 GB de RAM | uma VM com tudo: Caddy, API e PostgreSQL. Atende várias clínicas |
| 200 GB de disco | banco e cópias locais do backup |
| 10 TB de tráfego de saída por mês | muito acima do necessário |
| Região **São Paulo** | dados no Brasil, menor atraso |

Cuidados:
- A região escolhida no cadastro é a única com recursos gratuitos: **escolher São Paulo** ao criar a conta. Às vezes falta VM ARM disponível; é só tentar de novo mais tarde.
- Pedem cartão de crédito para verificação. Recomendo **passar a conta para "Pay As You Go"**. Continua sem custo dentro dos limites gratuitos, mas a Oracle não recupera VMs paradas e a conta fica mais estável. Configurar um **alerta de orçamento de R$ 1** para avisar de qualquer cobrança.
- Confirmar os limites atuais na página do Always Free antes de contratar.

### 4.2 Como roda

```
VM (Ubuntu Server LTS)
└─ docker compose
   ├─ caddy      # HTTPS, arquivos do front (build do Vite), proxy para a api
   ├─ api        # Node.js + Fastify + Socket.IO + pg-boss
   ├─ mensageria-nao-oficial   # só sobe se alguma clínica ligar a API não oficial (§3.7)
   ├─ postgres   # PostgreSQL 17, volume no disco da VM
   └─ backup     # restic + pg_dump, agendado
```

- Tudo é descrito em `infra/docker-compose.yml`. Para trocar de provedor, basta criar outra VM, rodar o compose e restaurar o backup.
- Firewall da VM: só as portas 80/443, e só para os IPs da Cloudflare. SSH só por chave.
- Atualizações automáticas de segurança do Ubuntu ligadas.

### 4.3 Plano B (se a Oracle não servir)

| Opção | Custo | Quando |
|---|---|---|
| VPS barata no Brasil (ex.: AWS Lightsail São Paulo, Magalu Cloud) | ≈ US$ 5–10/mês (pesquisar preço atual) | não conseguir VM gratuita ou querer suporte |
| Banco gerenciado gratuito (Neon, Supabase) | grátis com limites (≈ 0,5 GB) e pausa por inatividade | **só para desenvolvimento e demonstração**, não para dados reais |

### 4.4 Ambientes

| Ambiente | Onde | Custo |
|---|---|---|
| Desenvolvimento | PC do dev: Node.js + PostgreSQL (instalado ou Docker) | R$ 0 |
| Homologação | segundo compose na mesma VM, com banco separado e dados fictícios | R$ 0 |
| Produção | VM Oracle | R$ 0 |

## 5. Integrações externas

| Integração | Para quê | Custo | Alternativa gratuita / observação |
|---|---|---|---|
| **WhatsApp `wa.me`** | lembretes e mensagens enviados à mão pela recepção | gratuito | forma inicial: sem inbox nem confirmação automática |
| **WhatsApp Cloud API (Meta)** | lembretes, confirmações, inbox | responder o paciente dentro de 24 h da mensagem dele é gratuito; mensagens de modelo (lembretes) são cobradas por mensagem, em centavos (confirmar a tabela atual da Meta para o Brasil) | objetivo principal. Exige verificação da empresa na Meta. A verificar: usar o número que já está no WhatsApp Business do celular |
| WhatsApp não oficial (ex.: Baileys) | inbox e lembretes automáticos sem custo por mensagem | gratuito | **opcional, desligada por padrão**: viola os termos do WhatsApp e pode bloquear o número. Ver os cuidados em §3.7 |
| **Certificado em nuvem do médico** (BirdID, VIDaaS e outros) | assinar consultas, receitas e atestados | o certificado é do médico; o uso da API pelo integrador costuma ser gratuito (confirmar com cada provedor) | — |
| **Token A3 do médico** | assinar no PC do consultório | o token é do médico; o assinador local é nosso (§3.6) | componente pronto (ex.: Web PKI), com licença paga |
| **Memed** *(em estudo)* | prescrição com base de remédios | gratuita para o médico; a integração exige cadastro como parceiro | receita simples por modelo do próprio sistema (já no MVP) |
| **BrasilAPI / ViaCEP** | CEP, CNPJ, feriados nacionais | gratuitas | — |
| **CID-10** | busca de diagnóstico | tabela pública do DATASUS, importada no banco | — |
| **PIX** | QR Code no pagamento | **QR Code estático com valor (padrão BR Code) gerado pelo próprio sistema: gratuito**, conferência manual no extrato | QR dinâmico com baixa automática exige a API de um banco ou intermediador, que costuma cobrar por transação. Fase posterior |
| **E-mail** | convites, nova senha, cópia de dados (LGPD) | Brevo: 300 e-mails/dia no plano grátis | — |
| **Cloudflare R2** | arquivos | 10 GB grátis; depois, centavos de dólar por GB | — |
| **Backblaze B2** | backup | 10 GB grátis | — |
| **UptimeRobot** | avisar se o sistema cair | plano grátis (checagem a cada 5 min) | — |
| **Sentry** | erros do front e da API | plano grátis para desenvolvedor | configurar para **não enviar dados pessoais** |
| NFS-e *(em estudo)* | nota fiscal | o webservice da prefeitura costuma ser gratuito, com certificado A1 da clínica; o padrão nacional da NFS-e simplifica a integração | candidata a logo depois do MVP |

## 6. Sem internet na clínica

Agora o sistema depende da internet da clínica.

| Medida | Custo |
|---|---|
| **Segunda conexão (opcional):** roteador 4G barato ou um celular roteando, ligado só quando a principal cai. Fica como recomendação no guia de implantação, para a clínica que quiser | chip pré-pago |
| **Agenda do dia em cache (PWA):** se a conexão cair, a recepção ainda vê quem vem hoje, em modo somente leitura, com aviso de "sem conexão". O cache é apagado ao sair do sistema | R$ 0 |
| **Imprimir a agenda do dia** (botão na agenda), para quem preferir papel | R$ 0 |
| Atendimento sem conexão: anotar no papel e lançar depois. Agendar e cobrar offline exigiria sincronização com conflitos, o que não vale a complexidade no MVP | — |

Se o **servidor** cair, o UptimeRobot avisa por e-mail e Telegram. O sistema volta com `docker compose up` ou, no pior caso, restaurando o backup em outra VM (§7).

## 7. Backup e recuperação

| O quê | Como | Onde |
|---|---|---|
| Banco | `pg_dump` a cada 6 horas e arquivamento contínuo do WAL (permite voltar a qualquer minuto) | disco da VM |
| Banco | **restic** (gratuito): criptografado antes de sair da VM, só envia o que mudou, guarda 30 cópias diárias e 12 mensais | **Backblaze B2**, em outro provedor |
| Arquivos | versionamento do bucket R2 + cópia semanal via restic | R2 e B2 |
| Senha do backup | guardada fora do servidor (cofre de senhas do responsável + cópia impressa) | sem ela não há como ler o backup |
| Teste | restauração automática mensal num banco temporário, com o resultado enviado por e-mail | — |

Meta: perder no máximo **minutos** de dados, e voltar ao ar em **até 2 horas** numa VM nova.

## 8. Segurança e LGPD

- **Papéis na LGPD:** a clínica é a **controladora**, e nós (fornecedor do sistema) somos **operadores**. Precisamos de um contrato com cada clínica (termo de tratamento de dados). Oracle, Cloudflare e Backblaze são suboperadores e devem ser listados nesse termo.
- Dados no Brasil (Oracle São Paulo). O backup em B2 fica fora do país, mas criptografado antes de sair, com a chave só conosco; mesmo assim, citar no termo.
- Disco da VM criptografado (padrão na Oracle), backup criptografado (restic), HTTPS em todo o caminho (Cloudflare → Caddy com certificado de origem).
- Verificação em duas etapas obrigatória; bloqueio após erros; sessão expira por inatividade; o admin da clínica pode encerrar sessões de qualquer usuário.
- Permissões checadas na API, nunca só na tela. RLS no banco como segunda barreira entre clínicas.
- `audit_log` só aceita inclusão (o usuário do banco da API não pode alterar nem apagar), inclusive leituras de prontuário.
- Prontuário assinado bloqueado por trigger; correções só por adendo.
- Logs e Sentry sem dados pessoais.
- Acesso administrativo à VM só por SSH com chave e, no futuro, pelo Cloudflare Access (gratuito até 50 usuários).
- **Permissões configuráveis** (aba Autorizações): conferidas sempre na API, a partir do perfil e das exceções do usuário; cada mudança vai para a auditoria.
- **Assinador A3**: chave privada nunca sai do token; PIN digitado só no PC; pareamento por usuário, revogável (§3.6).
- **WhatsApp não oficial**: sessão criptografada no banco, processo isolado, termo de risco aceito pela clínica (§3.7).

## 9. Entrega contínua

- **GitHub** (repositório privado, gratuito) + **GitHub Actions** (2.000 minutos/mês grátis para repositório privado): lint, testes com PostgreSQL real e build a cada mudança.
- Deploy: ao criar uma versão (tag), o Actions gera a imagem Docker, envia ao GitHub Container Registry e, por SSH, roda na VM: **backup → migrações → `docker compose up -d`**.
- O front é versionado junto. Ao publicar, quem está com o sistema aberto vê "Nova versão disponível, clique para atualizar".
- O sistema em si não tem instalador. A exceção é o **assinador A3**: o Actions gera o `.exe` num runner Windows a cada versão, e o assinador se atualiza sozinho.

## 10. Desenvolvimento (tudo gratuito)

### 10.1 JavaScript sem TypeScript: como manter a segurança

| Risco do JS puro | Como cobrir |
|---|---|
| Dados errados chegando na API | Zod valida toda entrada da API; os mesmos esquemas validam os formulários |
| Erro bobo de nome ou tipo | ESLint + Prettier; `// @ts-check` com JSDoc nos arquivos de regra de negócio, se a equipe quiser (o VS Code checa sem compilar nada) |
| Regras críticas quebrando | testes automatizados obrigatórios em agenda, estados do atendimento, dinheiro e prontuário |
| Banco aceitar algo inválido | constraints, triggers e RLS no PostgreSQL: a última barreira não depende do JS |

### 10.2 Ferramentas

| Ferramenta | Uso |
|---|---|
| VS Code, Git, GitHub | código e versões |
| Node.js LTS + **npm workspaces** | monorepo, sem ferramenta extra |
| PostgreSQL (instalado ou Docker Desktop, gratuito para empresas pequenas) | banco local |
| Vitest | testes de unidade e de API (com banco real de teste) |
| Playwright | testes ponta a ponta dos fluxos principais |
| ESLint + Prettier | padrão de código |

### 10.3 Estrutura do repositório

```
sis_Clinicas/
├─ apps/
│  ├─ web/            # React + Vite (JSX), PWA
│  │  └─ src/telas/   # inicio, agenda, recepcao, consulta, whatsapp, pagamentos,
│  │                  # pacientes, recados, relatorios, configuracoes, importacao, painel-tv
│  ├─ api/            # Fastify
│  │  └─ src/modulos/ # auth, autorizacoes, clinica, pacientes, profissionais, agenda,
│  │                  # recepcao, prontuario, assinatura, financeiro, chat, inbox,
│  │                  # mensageria/{wame,cloud-api,nao-oficial}, pesquisas, importacao,
│  │                  # relatorios, auditoria
│  ├─ mensageria-nao-oficial/  # processo separado da sessão não oficial (§3.7)
│  └─ assinador/      # assinador local para token A3, Windows (§3.6)
├─ packages/
│  └─ shared/         # esquemas Zod, status, regras puras (dinheiro em centavos, horários)
├─ db/
│  ├─ migrations/     # SQL: tabelas, constraints, triggers, RLS
│  └─ seed/           # CID-10, clínica e usuários de exemplo
├─ infra/
│  ├─ docker-compose.yml
│  ├─ Caddyfile
│  └─ backup/         # scripts restic e pg_dump
└─ docs/
```

## 11. Custos

| Item | Quando | Custo |
|---|---|---|
| Ferramentas e bibliotecas | sempre | **R$ 0** (todas de código aberto) |
| Servidor (Oracle Always Free) | por mês | **R$ 0** |
| Cloudflare, R2 até 10 GB, B2 até 10 GB, Brevo, UptimeRobot, Sentry, GitHub | por mês | **R$ 0** nos planos gratuitos |
| Domínio do produto (ex.: `sisclinicas.com.br`) | por ano | ≈ R$ 40 |
| WhatsApp: lembretes automáticos (Cloud API) | por mês | por mensagem de modelo enviada; responder o paciente em até 24 h é gratuito. **Fase 0 com `wa.me`: R$ 0** |
| WhatsApp não oficial | por mês | **R$ 0** (usa memória da mesma VM) |
| Certificado digital | — | do médico (nuvem ou token A3) |
| Certificado de assinatura de código (para o instalador do assinador A3 não gerar aviso no Windows) | por ano | opcional na clínica piloto; recomendado ao distribuir para outras clínicas (pesquisar preço) |
| Componente pronto para A3 (ex.: Web PKI) | por ano | só se decidirmos não desenvolver o assinador próprio (§14) |
| Na clínica | uma vez | **R$ 0** (usa os PCs e a internet que já existem); roteador 4G de reserva opcional |

Comparado à v0.1, sai o mini PC e o nobreak da clínica. Comparado à v0.2, volta a possibilidade de pagar um certificado de assinatura de código, por causa do assinador A3.

## 12. Evolução

| Fase | O que muda | Custo extra |
|---|---|---|
| 1 clínica | VM gratuita única | ≈ R$ 40/ano |
| 2 a ~20 clínicas | mesma VM; cada clínica é um registro novo (já multi-clínica) | R$ 0 enquanto couber na VM gratuita (acompanhar uso de CPU, RAM e disco) |
| Crescimento | banco gerenciado ou VM paga maior; API em mais de uma instância (Socket.IO com adaptador PostgreSQL) | conforme o número de clínicas, coberto pela mensalidade |
| App de celular | a própria PWA instalada no celular; app nativo só se houver necessidade real | R$ 0 |
| Muitas clínicas na API não oficial | mover `mensageria-nao-oficial` para uma VM própria | conforme o número de sessões |
| NFS-e | integração com o padrão nacional da NFS-e | em estudo |

## 13. Riscos

| Risco | Como reduzir |
|---|---|
| Oracle encerrar a conta gratuita ou mudar as regras | conta Pay As You Go, backup em outro provedor, infraestrutura em Docker Compose para subir em outra VM em até 2 horas |
| Internet da clínica cair | segunda conexão 4G, agenda do dia em cache, agenda impressa |
| Invasão (o sistema agora está na internet) | duas etapas obrigatória, limite de tentativas, Cloudflare na frente, firewall só para a Cloudflare, atualizações automáticas, RLS e auditoria |
| Erro de tipo por usar JS puro | Zod, testes nas regras críticas, constraints no banco (§10.1) |
| Custo do WhatsApp crescer | começar com `wa.me`; usar a API só para lembretes que reduzem faltas e mostrar o custo nos relatórios |
| **Número da clínica bloqueado** pela API não oficial | desligada por padrão, termo de risco, limite de volume, processo isolado, volta rápida para `wa.me` ou API oficial |
| Biblioteca não oficial parar de funcionar após mudança do WhatsApp | versões fixadas, monitoramento da sessão, plano de volta para outra forma de envio |
| Assinador A3 não reconhecer algum token | testar com os tokens reais dos médicos antes da implantação; lista de drivers suportados; alternativa de componente pronto |
| Mudança de preço ou regra das APIs gratuitas | cada integração isolada num módulo próprio, fácil de trocar |
| Atualização quebrar o banco | backup automático antes de todo deploy e migrações testadas no GitHub Actions |

## 14. Pontos em aberto

Resolvidos no levantamento (10/11/2026): WhatsApp começa por `wa.me`, com Cloud API e API não oficial como opções (§3.7); os médicos podem ter certificado em nuvem e token A3, então o A3 entra no MVP (§3.6); a internet é estável, com 4G opcional (§6).

1. Nome e domínio do produto (ex.: `sisclinicas.com.br`)?
2. Criar a conta na Oracle Cloud (São Paulo) agora ou começar só com o ambiente local?
3. Assinador A3: desenvolver o próprio (§3.6) ou licenciar um componente pronto?
4. API não oficial: parecer jurídico e texto do termo de ciência de risco antes de liberar para clientes.
5. Número de WhatsApp: confirmar se o número do WhatsApp Business pode ser usado na Cloud API sem perder o app no celular.
