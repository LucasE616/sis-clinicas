# Primeiros passos — sis_Clinicas

> 04/11/2026. Do esboço publicado até o início do desenvolvimento do MVP.
> Referências: [mvp.md](mvp.md) e [arquitetura.md](arquitetura.md).

## Já feito

- [x] MVP detalhado (`mvp.md`)
- [x] Arquitetura web, JavaScript, custo mínimo (`arquitetura.md`)
- [x] Simuladores de telas validando o fluxo (recepção, médico, gestão, administração)
- [x] Esboço em HTML, CSS e JS no GitHub
- [x] Esboço publicado: https://lucase616.github.io/sis-clinicas/

## 1. Começar já: o que demora e não depende dos requisitos

Esses itens têm prazo de aprovação de terceiros. Começar agora evita travar o desenvolvimento depois.

- [ ] **Nome e domínio do produto** — escolher o nome e registrar o `.com.br` no Registro.br (≈ R$ 40/ano)
- [ ] **Empresa (CNPJ)** — confirmar se o produto será vendido por uma empresa já existente; a Meta, a Memed e os provedores de certificado pedem CNPJ
- [ ] **Meta / WhatsApp** — criar a conta no Meta Business Manager, iniciar a verificação da empresa e separar um número de telefone exclusivo para testes
- [ ] **Memed** — pedir o cadastro de parceiro integrador
- [ ] **Certificado em nuvem** — contatar 1 ou 2 provedores (ex.: BirdID, VIDaaS) sobre o acesso à API de assinatura e o ambiente de testes
- [ ] **Jurídico / LGPD** — pedir a um advogado o modelo de **termo de tratamento de dados** (clínica controladora, nós operadores) e os termos de uso
- [ ] **Contas gratuitas** (com o e-mail do produto, não o pessoal):
  - [ ] Oracle Cloud, região **São Paulo**, com alerta de orçamento de R$ 1
  - [ ] Cloudflare (DNS do domínio)
  - [ ] Backblaze B2 (backup)
  - [ ] Brevo (e-mail)
  - [ ] UptimeRobot e Sentry
- [ ] **Cofre de senhas** para guardar as credenciais do projeto (ex.: Bitwarden, plano gratuito)

## 2. Levantamento de requisitos (com você)

### 2.1 Validar o esboço com quem vai usar

- [x] Sessão com uma **recepcionista**: marcar, registrar chegada, receber, fechar o caixa
- [x] Sessão com um **médico**: fila, chamar paciente, registrar consulta, emitir documento
- [x] Sessão com a **gestão**: configurar equipe e serviços, relatórios
  > **Decisão (09/11/2026):** o sistema deve ter todas as funcionalidades citadas acima.
- [ ] Anotar: onde a pessoa travou, o que procurou e não achou, o que sobra na tela

### 2.2 Perguntas que fecham decisões do MVP

**Clínica e agenda**
- [x] Quais especialidades atendem hoje? Quantos médicos e quantas salas?
  > **Decisão:** configurável no sistema. Cada clínica cadastra as próprias especialidades, profissionais e salas, em qualquer quantidade.
- [x] Horário de funcionamento; os médicos têm horários diferentes? Almoço e bloqueios
  > **Decisão:** aba de configuração com o horário da clínica e o horário de atendimento de cada profissional, individualmente.
- [x] Duração de cada tipo de atendimento; há procedimentos além de consulta e retorno?
  > **Decisão:** duração dinâmica e editável por procedimento. Haverá procedimentos diversos, como exames de sangue, fezes, urina, diabetes e exame de vista.
- [ ] Como encaixes e lista de espera funcionam hoje?
  > Em estudo.
- [x] Prazo para desmarcar; política de faltas
  > **Decisão:** editável, conforme a escolha de cada clínica.

**Prontuário**
- [x] Modelo de prontuário de cada especialidade (pedir um exemplo em papel ou do sistema atual)
  > **Decisão (10/11/2026):** ter um modelo padrão do sistema e permitir que cada clínica crie os próprios modelos. Ainda não há um modelo de referência.
- [x] Prontuário compartilhado entre os médicos ou só do autor?
  > **Decisão:** ter as duas opções.
- [x] Os médicos já têm certificado ICP-Brasil? **Em nuvem ou token A3?**
  > **Decisão:** os médicos podem ter os dois tipos, então o sistema precisa aceitar certificado em nuvem e token A3.
  > ⚠ Muda a arquitetura v0.2, que deixava o A3 fora do MVP: no navegador, o token exige um pequeno programa instalado no PC do médico (§5 de `arquitetura.md`).
- [ ] Usar a Memed para receitas?
  > Em estudo.
- [x] Há registros sigilosos (ex.: psiquiatria)?
  > **Decisão:** sim, há registros sigilosos.

**Financeiro**
- [x] Formas de pagamento aceitas; parcelamento máximo; maquininha usada
  > **Decisão (10/11/2026):** aceitar todas as formas de pagamento; cada clínica escolhe quais usa.
- [ ] Quem pode dar desconto, e até quanto?
  > Em estudo. Direção: uma **aba de autorizações** em que o administrador define quem tem acesso a cada ação, incluindo dar desconto.
- [x] Um caixa ou vários? Quem abre e fecha?
  > **Decisão:** depende de cada clínica (um ou vários caixas). Quem abre e fecha é definido pelas permissões do administrador.
- [ ] Precisa emitir nota fiscal (NFS-e) já no início?
  > Em estudo. Há interesse.

**WhatsApp e comunicação**
- [x] Qual número a clínica usa hoje? É WhatsApp Business no celular?
  > **Decisão (10/11/2026):** no início, a clínica precisa ter o WhatsApp Business.
  - [ ] Verificar se é possível usar um número de WhatsApp comum (não Business) e como fica a migração para a API oficial
- [x] Quantas pessoas respondem pacientes?
  > **Decisão:** varia por clínica: uma, duas ou várias. O sistema deve aceitar qualquer quantidade.
- [x] Quando mandar o lembrete (24 h antes? 48 h?) e qual o texto
  > **Decisão:** livre, configurado por cada clínica (antecedência e texto).
- [x] Começar com a opção grátis (texto pronto, `wa.me`) ou já contratar a API oficial?
  > **Decisão:** começar com a opção gratuita (`wa.me`). O objetivo é usar a API oficial e também oferecer **APIs não oficiais como opção**, por causa do perfil dos clientes.
  > ⚠ APIs não oficiais violam os termos do WhatsApp e podem bloquear o número da clínica. Ver os cuidados em "Lacunas" abaixo.

**Estrutura e dados**
- [x] Quantos computadores, quais navegadores e celulares
  > **Decisão (10/11/2026):** vários computadores. O sistema precisa ter **layout para celular**.
- [x] A internet é estável? Vale um 4G de reserva?
  > **Decisão:** a internet é estável. O 4G de reserva fica como **opção recomendada** no guia de implantação, para a clínica que quiser.
- [x] Usam algum sistema ou planilha hoje? Há dados para migrar (pacientes, agenda futura, prontuários antigos)?
  > **Decisão:** nenhum sistema hoje. Mesmo assim, o sistema terá uma **importação de dados externos**, para clínicas que vierem de outro sistema ou de planilhas.
  - [ ] Estudar o formato da importação (ver proposta em "Lacunas")
- [ ] Relatórios que a gestão olha hoje (ou gostaria de ter)
  > Em estudo. Já citados: financeiros, satisfação, cancelamentos, número de atendimentos, principais especialidades. Ver a proposta completa em "Relatórios propostos", abaixo.

### Relatórios propostos (para estudo)

Marque os que devem entrar. Todos com filtro por período, profissional, especialidade e unidade, exportando para Excel e PDF.

**Financeiro**
- [ ] Faturamento por período, profissional, especialidade, procedimento e forma de pagamento
- [ ] Ticket médio por atendimento
- [ ] Previsão de receita: consultas marcadas × valor de cada procedimento
- [ ] Contas a receber e inadimplência
- [ ] Fechamentos de caixa e diferenças, por caixa e por pessoa
- [ ] Descontos concedidos e devoluções (quem fez, quanto, por quê)

**Atendimentos e agenda**
- [ ] Número de atendimentos por dia, semana e mês, por profissional e especialidade
- [ ] Ocupação da agenda: horários usados × disponíveis
- [ ] Horários e dias de maior procura
- [ ] Tempo médio de espera na recepção (chegada até a chamada)
- [ ] Duração real × prevista das consultas
- [ ] Prazo entre marcar e ser atendido (quantos dias o paciente espera por vaga)
- [ ] Encaixes por profissional

**Faltas e cancelamentos**
- [ ] Taxa de faltas por profissional, dia da semana e horário
- [ ] Cancelamentos por motivo e por antecedência
- [ ] Remarcações
- [ ] Efeito dos lembretes: faltas de quem confirmou × de quem não respondeu

**Especialidades e procedimentos**
- [ ] Ranking de especialidades e procedimentos por volume e por faturamento
- [ ] Demanda sem vaga: procura maior que a agenda disponível (lista de espera)
- [ ] Diagnósticos mais frequentes (CID-10), sem identificar pacientes

**Pacientes**
- [ ] Pacientes novos × recorrentes
- [ ] Pacientes que não voltaram para o retorno indicado
- [ ] Perfil: faixa etária, sexo, bairro e cidade
- [ ] Origem do agendamento: telefone, WhatsApp, presencial
- [ ] Aniversariantes do mês

**Satisfação** (exige uma pesquisa após a consulta, ver "Lacunas")
- [ ] Nota geral da clínica (NPS: "de 0 a 10, quanto recomendaria?")
- [ ] Nota por profissional e pela recepção
- [ ] Comentários dos pacientes

**Comunicação**
- [ ] Taxa de confirmação dos lembretes
- [ ] Tempo de primeira resposta no WhatsApp e volume de conversas por atendente
- [ ] Custo das mensagens da API oficial

**Qualidade e segurança**
- [ ] Consultas não finalizadas e atendimentos sem registro no prontuário
- [ ] Documentos emitidos por profissional
- [ ] Acessos a prontuários (quem abriu, quando), exigido pela LGPD
- [ ] Atividade por usuário

### 2.3 Fechamento

- [x] Atualizar `mvp.md` com as respostas e fechar os pontos em aberto (§12)
  > Feito em 10/11/2026 (`mvp.md` v0.3). Os itens "em estudo" seguem listados no §12 do MVP.
- [x] Atualizar `arquitetura.md` (§14)
  > Feito em 10/11/2026 (`arquitetura.md` v0.3): assinador A3, WhatsApp em três formas e importação.
- [ ] Revisar o plano de sprints com a prioridade real da clínica
- [ ] Definir a **clínica piloto** e a data-alvo de implantação

## 3. Fundação técnica (pode começar em paralelo ao levantamento)

Não depende das respostas acima, só da arquitetura aprovada.

- [ ] Monorepo com npm workspaces: `apps/web`, `apps/api`, `packages/shared`, `db/`, `infra/`
- [ ] `apps/web`: React + Vite em JavaScript, reaproveitando o visual e as telas do esboço
- [ ] `apps/api`: Fastify + postgres.js, rota de saúde (`/api/v1/saude`)
- [ ] `packages/shared`: esquemas Zod e regras puras (dinheiro em centavos, horários, estados da consulta)
- [ ] `db/migrations`: primeiras tabelas (clínica, usuário, sessão, auditoria) com RLS por `clinica_id`
- [ ] Docker Compose local com PostgreSQL
- [ ] ESLint + Prettier, Vitest com banco de teste
- [ ] GitHub Actions: lint e testes a cada envio
- [ ] Proteger a branch `main` (mudanças por pull request)
- [ ] Decidir o destino do esboço atual: mover para `prototipo/` quando o app React substituir

## 4. Infraestrutura (depois da conta Oracle aprovada)

- [ ] VM ARM em São Paulo com Ubuntu Server LTS, SSH só por chave, atualizações automáticas
- [ ] Docker Compose de produção: Caddy + API + PostgreSQL
- [ ] Domínio na Cloudflare apontando para a VM; firewall liberando só a Cloudflare
- [ ] Ambiente de homologação separado, com dados fictícios
- [ ] Backup restic para o Backblaze B2 e **primeiro teste de restauração**
- [ ] UptimeRobot avisando se o sistema cair
- [ ] Deploy automático por tag no GitHub Actions (backup → migrações → subir)

## 5. Primeiras entregas do MVP (sprints 1 e 2)

- [ ] Login com senha (Argon2id) e verificação em duas etapas obrigatória
- [ ] Usuários, perfis e permissões checadas na API
- [ ] Clínica, salas, serviços e valores
- [ ] Auditoria (registro do que cada um fez, sem permitir apagar)
- [ ] Pacientes: cadastro, busca, duplicidade, consentimentos LGPD
- [ ] Médicos: grade de horários, almoço e bloqueios
- [ ] Tabela CID-10 completa do DATASUS importada

## Lacunas já percebidas no esboço

Entram no MVP; anotar o que a clínica disser sobre cada uma.

- [ ] Bloqueios de agenda (almoço, férias, reuniões)
- [ ] Horário de atendimento individual por profissional (o esboço só tem o horário da clínica)
- [ ] Duração livre por procedimento (o esboço só oferece 30 min ou 1 hora) e cadastro de exames
- [ ] Especialidades e salas como cadastros próprios (no esboço são campos de texto do médico)
- [ ] Política de desmarcação e faltas configurável por clínica
- [ ] Modelos de prontuário: padrão do sistema + modelos de cada clínica (o esboço tem um formulário fixo)
- [ ] Opção de prontuário compartilhado ou só do autor (o esboço sempre compartilha)
- [ ] Marcar um registro como sigiloso (o esboço respeita o sigilo, mas não tem como marcar)
- [ ] Assinatura com certificado em nuvem **e** token A3 (programa local para o A3)
- [ ] Formas de pagamento configuráveis por clínica (o esboço tem quatro fixas)
- [ ] Vários caixas por clínica (o esboço tem um só)
- [ ] Aba de autorizações: o administrador define quem pode cada ação, como dar desconto e abrir ou fechar o caixa (o esboço tem regras fixas por papel)
- [ ] Antecedência e texto dos lembretes configuráveis por clínica (o esboço manda só na véspera, com texto fixo)
- [ ] WhatsApp com três formas de envio, escolhidas pela clínica: `wa.me` (já no esboço), API oficial e API não oficial
  - [ ] Isolar cada forma num módulo próprio, com a mesma interface, para trocar sem mexer no resto do sistema
  - [ ] API não oficial **desligada por padrão**; a clínica liga e aceita um termo de ciência do risco de bloqueio do número
  - [ ] Avaliar o impacto na LGPD (dados de saúde passando por biblioteca sem garantia do WhatsApp) e incluir no termo de tratamento de dados
  - [ ] A API não oficial mantém uma sessão do WhatsApp Web aberta no servidor: prever memória extra na VM e reconexão automática
- [ ] Layout para celular revisado tela a tela (o esboço já se adapta, mas não foi testado com usuários no celular)
- [ ] Importação de dados externos
  - [ ] Modelos de planilha (Excel/CSV) para pacientes, profissionais, procedimentos e agenda futura
  - [ ] Pré-visualização antes de importar, com os erros linha a linha (CPF inválido, telefone sem DDD, data errada)
  - [ ] Detecção de duplicados (mesmo CPF ou mesmo celular)
  - [ ] Prontuários antigos entram como anexos (PDF ou imagem digitalizada) na ficha do paciente
  - [ ] Registro na auditoria de quem importou e quando, com opção de desfazer a importação
- [ ] Pesquisa de satisfação após a consulta, enviada pelo WhatsApp, para alimentar o relatório de satisfação
- [ ] Relatórios além do resumo do dia (o esboço só mostra os números de hoje)
- [ ] Senha e verificação em duas etapas (o esboço não tem)
- [ ] Dados compartilhados entre os computadores (o esboço salva só no navegador)
- [ ] Assinatura digital ICP-Brasil (o esboço só trava a consulta)
- [ ] Caixa de entrada do WhatsApp (o esboço só envia, não recebe)
- [ ] Lista de espera
