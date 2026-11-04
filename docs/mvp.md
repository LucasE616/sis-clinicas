# MVP — Sistema de Gestão de Clínica

> Versão 0.2 — 03/11/2026 — premissas revisadas

## 0. Decisões de escopo

| # | Decisão | Situação |
|---|---|---|
| D1 | Clínica **médica multiespecialidade** de pequeno/médio porte (até ~30 profissionais, 1–3 unidades) | confirmada |
| D2 | Uso inicial por **uma clínica**, com expansão para outras depois. O banco já nasce isolado por clínica (`clinica_id` + RLS), mas o MVP não tem cadastro self-service nem cobrança de assinatura | confirmada |
| D3 | Só atendimento **particular** (convênio/TISS fica para depois) | mantida |
| D4 | **Prontuário eletrônico** entra no MVP, com assinatura digital ICP-Brasil | confirmada |
| D5 | Comunicação no MVP: **chat interno** + **inbox de WhatsApp** com pacientes + confirmação/lembrete automáticos | confirmada |
| D6 | **Sistema web** (React + Vite, JavaScript, sem Next.js), instalável no PC e no celular como PWA. Sem app desktop nem servidor na clínica. Detalhes em `arquitetura.md` | revisada em 04/11/2026 (v0.2) |
| D7 | **Online obrigatório**, hospedado na nuvem (Oracle Cloud Always Free, São Paulo). Contingência: agenda do dia em cache somente leitura, agenda impressa e internet 4G de reserva | revisada em 04/11/2026 (v0.2) |

## 1. Objetivo do MVP

Substituir a agenda em papel/planilha, o prontuário em papel, o caixa manual e o WhatsApp no celular da recepção por um único sistema, reduzindo as faltas com confirmação automática.

**Critérios de sucesso (90 dias após a implantação)**

- 100% dos agendamentos e atendimentos registrados no sistema
- Taxa de faltas reduzida em ≥ 30% em relação à linha de base
- Todo o atendimento por WhatsApp feito pelo inbox (sem celular avulso na recepção)
- Fechamento de caixa diário sem planilha paralela
- Tempo médio de agendamento ≤ 2 min

## 2. Perfis e permissões

| Permissão | Admin | Gestor | Recepção | Profissional | Financeiro |
|---|:-:|:-:|:-:|:-:|:-:|
| Gerenciar usuários, unidades, salas | ✔ | | | | |
| Gerenciar profissionais, grade, procedimentos, preços | ✔ | ✔ | | | |
| Cadastrar/editar pacientes | ✔ | ✔ | ✔ | ver | ver |
| Agendar / remarcar / cancelar | ✔ | ✔ | ✔ | própria agenda | |
| Encaixe (fora da grade ou sobreposto) | ✔ | ✔ | com permissão | própria agenda | |
| Check-in / fila | ✔ | ✔ | ✔ | | |
| Chamar paciente / finalizar atendimento | | | | ✔ | |
| **Ler/escrever prontuário** | | | | ✔ | |
| Gerenciar modelos de prontuário | | com permissão | | com permissão | |
| Receber pagamento | ✔ | ✔ | ✔ | | ✔ |
| Dar desconto acima do limite / estornar | ✔ | ✔ | | | ✔ |
| Abrir/fechar caixa | ✔ | ✔ | ✔ | | ✔ |
| Relatórios financeiros | ✔ | ✔ | | só os próprios | ✔ |
| Chat interno | ✔ | ✔ | ✔ | ✔ | ✔ |
| **Atender no inbox de WhatsApp** | | ✔ | ✔ | com permissão | com permissão |
| Ver log de auditoria | ✔ | | | | |

- As permissões são granulares no código (ex.: `agenda.encaixe`, `prontuario.ler`). Os perfis são conjuntos pré-definidos, editáveis pelo Admin.
- **Conteúdo clínico só é acessível a profissionais de saúde.** Admin, Gestor, Recepção e Financeiro não leem prontuário, mesmo com permissão administrativa. Um usuário Admin que também é médico acessa pelo perfil de profissional.

## 3. Escopo funcional

### 3.1 Acesso e administração

- Login com e-mail + senha (Argon2id); 2FA por TOTP **obrigatório** para Admin, Gestor e Profissional; opcional para os demais
- Sessão guardada no servidor, com cookie httpOnly + Secure + SameSite=Strict; expira por inatividade; logout remoto de sessões
- Bloqueio após 5 tentativas erradas (15 min); recuperação de senha por e-mail
- Bloqueio automático da tela após inatividade (configurável, padrão 10 min), exigindo a senha de novo — importante em consultório
- Cadastro de unidades (endereço, horário de funcionamento, feriados) e salas
- Usuário pode ter acesso a uma ou mais unidades

### 3.2 Pacientes

**Histórias**
- Como recepção, quero cadastrar um paciente em < 1 min só com nome, celular e data de nascimento, completando o resto depois.
- Como recepção, quero achar o paciente digitando parte do nome, CPF ou telefone.

**Regras**
- Obrigatórios: nome, data de nascimento, celular. CPF é opcional, mas único por clínica quando informado (com validação de dígito).
- Nome social, quando informado, é o nome exibido em toda a interface, no painel de chamada e nas mensagens.
- Menor de idade: exige responsável (nome, CPF, parentesco, telefone).
- Busca tolerante a acentos e a erros de digitação (`unaccent` + `pg_trgm`).
- Consentimentos LGPD registrados com data, versão do termo e canal: (a) tratamento de dados, (b) receber mensagens por WhatsApp. Sem (b), nenhuma mensagem **automática** é enviada (o paciente que inicia uma conversa pode ser respondido).
- Detecção de duplicidade ao cadastrar (mesmo nome + nascimento, ou mesmo CPF/celular) com opção de **mesclar** (só Gestor; o prontuário dos dois cadastros é unificado).
- Paciente nunca é apagado de fato; é inativado.
- **Pedido de eliminação (LGPD)**: os dados que não têm obrigação legal de guarda são anonimizados. O **prontuário é mantido** pelo prazo legal (mínimo de 20 anos), conforme a própria LGPD permite para cumprimento de obrigação legal. A ação é de Admin e fica registrada.
- A ficha mostra o histórico de agendamentos, a situação financeira e o histórico de conversas. A parte clínica aparece só para profissionais.

### 3.3 Profissionais, procedimentos e grade

- Profissional = usuário + dados profissionais (conselho, número, UF, especialidades, RQE, cor na agenda).
- **Procedimento**: nome, duração padrão, preço particular, se exige sala específica, modelo de prontuário padrão (opcional).
- **Vínculo profissional × procedimento**, com duração e preço opcionais que sobrescrevem o padrão.
- **Grade horária**: por profissional, unidade e dia da semana: início, fim, intervalo do slot, vigência (data início/fim). Mais de uma faixa por dia é permitida (manhã/tarde).
- **Bloqueios**: férias, congresso, horário de almoço avulso, com motivo. Ao criar um bloqueio sobre agendamentos existentes, o sistema lista os afetados para remarcação.

### 3.4 Agenda

**Histórias**
- Como recepção, quero ver a agenda do dia de vários profissionais lado a lado e agendar clicando no horário livre.
- Como recepção, quero encontrar o primeiro horário livre de um procedimento com qualquer profissional que o realize.
- Como recepção, quero agendar direto da conversa de WhatsApp sem trocar de tela.
- Como profissional, quero ver minha agenda do dia no celular.

**Visões**: dia (colunas por profissional), semana (um profissional), lista (pesquisável e filtrável) e "próximos horários livres".

**Regras**
- Um agendamento tem: paciente, profissional, procedimento, unidade, sala (opcional), início, fim, observação, origem (telefone, presencial, WhatsApp, retorno).
- **Sem sobreposição** para o mesmo profissional, nem para a mesma sala, garantido no banco (exclusion constraint, ver §5) e não só na tela.
- **Encaixe**: permite ficar fora da grade e/ou sobrepor; exige a permissão `agenda.encaixe` e fica marcado visualmente. O encaixe é uma flag no agendamento que dispensa a constraint (a constraint é parcial: só vale quando `encaixe = false`).
- Agendar no passado: só com permissão (para registro retroativo).
- Remarcar = cancela o original (motivo "remarcado") e cria um novo, ligado pelo campo `remarcado_de`. Isso mantém o histórico e a estatística de faltas corretos.
- Cancelamento exige motivo e origem (paciente / clínica).
- Alerta ao agendar paciente com débito em aberto ou com ≥ 2 faltas nos últimos 90 dias (só alerta, não bloqueia).
- **Lista de espera**: paciente + procedimento + profissional (opcional) + período desejado. Quando um horário compatível é liberado por cancelamento, a recepção recebe um aviso.
- Atualização em tempo real (WebSocket): duas recepcionistas veem a mesma agenda sem precisar dar refresh.

### 3.5 Máquina de estados do agendamento

```
            ┌──────────── cancelado ◄───────────┐
            │                ▲                  │
 agendado ──┼──► confirmado ─┼──► chegou ──► em_atendimento ──► atendido
     │      │        │                │
     └──────┴────────┴──► faltou      └──► cancelado (desistiu na espera)
```

| De | Para | Quem | Observação |
|---|---|---|---|
| agendado | confirmado | paciente (WhatsApp) / recepção | registra canal e horário |
| agendado, confirmado | chegou | recepção | check-in; registra hora de chegada |
| chegou | em_atendimento | profissional | "chamar paciente"; aciona o painel e abre a tela de atendimento |
| em_atendimento | atendido | profissional | exige registro clínico assinado ou justificativa; gera conta a receber, se ainda não houver |
| agendado, confirmado | faltou | recepção / job | o job do fim do dia só **sugere**; a recepção confirma |
| agendado, confirmado, chegou | cancelado | recepção / paciente | motivo obrigatório |
| atendido, faltou, cancelado | (reabrir) | Gestor | registrado na auditoria; não altera o prontuário já assinado |

Toda transição grava `agendamento_evento` (status anterior, novo, usuário, data/hora, observação).

### 3.6 Recepção

- **Painel do dia**: agendamentos da unidade por status (aguardando chegada → na espera → em atendimento → finalizados), com o tempo de espera de cada paciente.
- **Check-in**: confere/completa o cadastro, opção de cobrar antes (pagamento antecipado), marca "chegou".
- **Chamada**: o profissional clica em "chamar"; a TV da sala de espera (rota pública com token da unidade) mostra o nome abreviado do paciente ("Maria S.") e a sala, com aviso sonoro.
- Impressão: comprovante de agendamento e declaração de comparecimento (modelos com variáveis).

### 3.7 Prontuário eletrônico (PEP)

**Histórias**
- Como médico, quero abrir o atendimento e ver em uma tela o resumo do paciente (alergias, medicamentos em uso, problemas ativos e os últimos atendimentos).
- Como médico, quero preencher a consulta usando o modelo da minha especialidade e assinar com um clique.
- Como médico, quero emitir atestado, solicitação de exames e receita assinados digitalmente e mandar para o paciente pelo WhatsApp.

**Estrutura**
- **Resumo de saúde** (sempre visível no topo, com destaque para alergias): alergias, medicamentos em uso, comorbidades/problemas ativos, antecedentes pessoais e familiares, hábitos.
- **Registro clínico** por atendimento:
  - Modelos por especialidade, configuráveis sem programar (formulário com campos de texto, número, seleção, checklist, escala). Cada modelo tem **versão**; um registro guarda a versão usada, então mudar o modelo não altera registros antigos.
  - Seções padrão: queixa principal, história da doença atual, exame físico, hipótese diagnóstica (**CID-10** com busca), conduta.
  - **Sinais vitais**: PA, FC, FR, temperatura, saturação, peso e altura (IMC calculado), com gráfico de evolução.
  - Salvamento automático do rascunho a cada poucos segundos.
- **Documentos clínicos** a partir de modelos com variáveis: atestado, declaração de comparecimento, solicitação de exames, encaminhamento, relatório e receita simples. Geram PDF assinado, que pode ser impresso, enviado por WhatsApp/e-mail ou baixado.
- **Prescrição** via integração com a **Memed** (base de medicamentos, interações, receita de controle especial e validação pela farmácia). A receita emitida volta para o prontuário.
- **Anexos**: exames, imagens e laudos (PDF, JPG, PNG, DICOM só como arquivo), com visualizador. Um arquivo que o paciente mandou pelo WhatsApp pode ser movido para o prontuário pelo profissional.
- **Linha do tempo** do paciente: todos os registros, documentos e anexos, com filtro por especialidade/profissional/tipo.

**Regras**
- Rascunho → **assinado**. Ao assinar, o registro é travado, recebe um hash do conteúdo e uma assinatura digital ICP-Brasil (§3.8). Depois de assinado, **nada é editado**: correções são feitas por **adendo**, também assinado, que fica ligado ao registro original.
- Rascunho não assinado em 24 h gera alerta para o profissional (e aparece em relatório de pendências para o Gestor).
- Acesso: por padrão, todos os profissionais da clínica podem ler o prontuário de um paciente (comum em multiespecialidade). Registros podem ser marcados como **sigilosos** pelo autor (ex.: psiquiatria), e aí só o autor os lê. Isso é configurável por clínica.
- **Toda leitura do prontuário é registrada** (quem, quando, qual registro), e o paciente pode pedir esse relatório de acessos.
- Retenção mínima de 20 anos, sem exclusão (ver §3.2).
- Impressão do prontuário completo ou de um período, em PDF assinado (para pedido do paciente ou de outro serviço).

**Conformidade (CFM)**
- A Res. CFM 1.821/2007 só permite eliminar o papel quando o sistema atende ao nível de segurança **NGS2** da certificação SBIS/CFM, que exige assinatura ICP-Brasil. A Res. CFM 2.299/2021 regula os documentos médicos digitais (atestados, receitas) com assinatura ICP-Brasil.
- **Recomendação:** desenhar o sistema seguindo os requisitos do NGS2 desde já (auditoria, assinatura, imutabilidade, controle de acesso, carimbo de tempo) e avaliar a **certificação SBIS** depois do MVP, porque é um processo à parte, com custo e prazo próprios. Confirmar com assessoria jurídica como a clínica vai guardar os registros até lá.

### 3.8 Assinatura digital ICP-Brasil

Duas formas, para cobrir os médicos que já têm certificado:

| Forma | Como funciona | Onde funciona |
|---|---|---|
| **Certificado em nuvem** (ex.: BirdID, VIDaaS, SafeID) | o médico autoriza a sessão no app do celular uma vez por turno; o sistema assina por API do provedor durante esse período | **forma do MVP** |
| **Token/cartão A3** | o navegador não acessa o token sozinho; exige um pequeno programa local no PC do médico | **fase posterior** |

- Documentos em PDF são assinados no padrão **PAdES**; registros clínicos geram um PDF/A assinado.
- Carimbo de tempo de uma Autoridade de Carimbo do Tempo (ACT), quando contratado.
- O sistema guarda os metadados do certificado (titular, CPF, emissor, validade, número de série) e o resultado da verificação. Os documentos podem ser validados no validador oficial do ITI.
- Certificado A1 em arquivo **não** é armazenado no servidor no MVP (risco alto de segurança).

### 3.9 Comunicação

#### 3.9.1 Chat interno

- **Canais** (ex.: #recepção-unidade-centro, #financeiro) e **mensagens diretas** 1:1 e em grupo.
- Texto, emoji, menção (@usuário, @canal), anexo de imagem/PDF (até 10 MB).
- **Cartão de contexto**: dá para anexar um agendamento, paciente ou conversa de WhatsApp na mensagem (ex.: "@dra.ana paciente chegou com exame novo"), que aparece como card clicável. Isso evita digitar CPF no chat.
- Indicador de não lidas, "digitando…", presença (online/ausente), notificação do navegador (também com o sistema instalado como app).
- Mensagens podem ser editadas por 15 min e apagadas pelo autor (o conteúdo continua na auditoria).
- Canal de sistema **#avisos**, onde o sistema posta eventos (ex.: "Horário liberado na agenda da Dra. Ana compatível com a lista de espera").
- Busca por texto nas conversas.

#### 3.9.2 Inbox de WhatsApp com pacientes

Usa a **WhatsApp Cloud API (Meta)** com o número oficial da clínica, atendido por várias pessoas ao mesmo tempo.

**Histórias**
- Como recepção, quero ver todas as conversas com pacientes em um só lugar, saber quais estão sem resposta e quem está atendendo cada uma.
- Como recepção, quero agendar, remarcar ou mandar o recibo sem sair da conversa.

**Funcionalidades**
- **Filas**: não atribuídas, minhas, do meu setor, todas. Ordenadas pelo tempo de espera do paciente.
- **Estados da conversa**: nova → em atendimento (atribuída a alguém) → aguardando paciente → resolvida. Nova mensagem do paciente reabre a conversa.
- **Atribuição e transferência** entre atendentes ou setores (recepção, financeiro, enfermagem), com histórico.
- **Notas internas** dentro da conversa, visíveis só para a equipe.
- **Identificação automática** do paciente pelo número. Número desconhecido aparece como "contato não identificado", com botões para vincular a um paciente existente ou cadastrar um novo. Um mesmo número pode estar ligado a mais de um paciente (ex.: mãe e filhos); a atendente escolhe o paciente do assunto.
- **Painel lateral** com os dados do paciente, próximos agendamentos e débitos em aberto, mais as ações agendar, remarcar, cancelar, confirmar e enviar recibo/documento.
- **Respostas rápidas**: digitar `/` abre a lista de textos prontos com variáveis (nome, data, endereço).
- **Mídia**: recebe e envia imagem, PDF e áudio (com player). Os arquivos são baixados da Meta e guardados no nosso armazenamento, porque os links da Meta expiram.
- **Janela de 24 horas**: a Meta só permite texto livre até 24 h depois da última mensagem do paciente. Fora dessa janela, o sistema bloqueia o texto livre e oferece os templates aprovados.
- **Fora do horário de funcionamento**: resposta automática com o horário de atendimento.
- **Sigilo**: documentos clínicos só podem ser enviados por um profissional ou com a permissão `documento.enviar`, e só para o número cadastrado do paciente/responsável.
- **Métricas**: tempo até a primeira resposta, tempo até resolver, volume por atendente e por hora.

#### 3.9.3 Mensagens automáticas

| Quando | Mensagem | Botões |
|---|---|---|
| Ao agendar (se faltar > 2 h) | Confirmação de agendamento: data, hora, profissional, endereço | — |
| D-1 às 10h (configurável) | Pedido de confirmação | **Confirmar** · **Remarcar** · **Cancelar** |
| 2 h antes (opcional) | Lembrete curto | — |

- **Confirmar** → status vira `confirmado` e a agenda é atualizada em tempo real.
- **Cancelar** → status vira `cancelado` (origem paciente, motivo "via WhatsApp"); o horário liberado é verificado na lista de espera.
- **Remarcar** → abre (ou reabre) a conversa no inbox, na fila "não atribuídas", com o agendamento já anexado, para a recepção oferecer novos horários.
- As respostas aos botões e qualquer texto do paciente aparecem na conversa do inbox, então a recepção vê o histórico completo.
- Só envia com consentimento registrado (§3.2) e celular válido.
- Cada envio grava status (enviado, entregue, lido, falhou) via webhook.
- Fallback: se o WhatsApp falhar, envia SMS (opcional, via provedor configurável).

### 3.10 Financeiro (MVP)

**Conceitos**
- **Conta a receber**: o que o paciente deve; gerada por agendamento (valor = preço do procedimento para aquele profissional) ou avulsa (ex.: venda de produto).
- **Pagamento**: uma ou mais formas por conta (dinheiro, PIX, débito, crédito à vista / parcelado), com pagamento parcial permitido.
- **Caixa**: sessão de caixa por usuário/unidade, com abertura (saldo inicial) e fechamento.

**Regras**
- Valores sempre em **centavos (inteiro)**; nunca usar ponto flutuante.
- A conta é gerada no check-in (se houver cobrança antecipada) ou ao finalizar o atendimento. Cancelamento/falta não gera conta (cobrança de falta fica fora do MVP).
- Desconto: até X% (configurável) pela recepção; acima disso, só Gestor/Financeiro, com motivo.
- Pagamento em **dinheiro** exige caixa aberto do usuário; os demais vão para o caixa aberto, se houver.
- **Estorno** não apaga nada: cria um lançamento negativo vinculado, com motivo e permissão.
- **Fechamento de caixa**: o sistema mostra o total esperado por forma de pagamento; o usuário informa o valor contado; a diferença fica registrada e o caixa fechado não aceita alterações.
- Cartão: registra bandeira, nº de parcelas e NSU/código de autorização (sem integração com maquininha no MVP). A taxa da operadora é configurável por bandeira/parcelas para o cálculo do valor líquido.
- PIX: registro manual no MVP; um QR Code dinâmico via gateway é *stretch goal*.
- **Recibo** em PDF (com dados da clínica, paciente, procedimento, valor e forma de pagamento), por impressão ou envio via WhatsApp a partir do inbox.
- Status da conta: `aberta` → `parcial` → `paga` | `cancelada`.

### 3.11 Relatórios do MVP

1. Agenda: ocupação (% de slots usados) por profissional e período
2. Faltas e cancelamentos por profissional, procedimento e dia da semana
3. Taxa de confirmação por WhatsApp
4. Inbox: tempo de primeira resposta, volume, conversas por atendente
5. Faturamento por período, profissional, procedimento e forma de pagamento (bruto e líquido)
6. Contas em aberto (inadimplência)
7. Fechamentos de caixa com diferenças
8. Prontuário: registros não assinados e atendimentos sem registro (pendências)

Todos com filtro de período/unidade e exportação para CSV/Excel. O profissional vê só os dados dele.

## 4. Fora do escopo do MVP

Convênios/TISS, NFS-e, repasse a profissionais, contas a pagar, estoque, portal do paciente/autoagendamento, teleconsulta, app mobile nativo (o MVP é web responsivo no celular), integração com maquininha, funcionamento offline completo, certificação SBIS (processo à parte), chatbot/IA no WhatsApp, Instagram/e-mail no inbox, cadastro self-service de novas clínicas.

## 5. Modelo de dados

Convenções: PK `id uuid`; todas as tabelas de negócio têm `clinica_id`, `criado_em`, `atualizado_em`; dinheiro em `*_centavos integer`; datas/horas em `timestamptz` (armazenado em UTC, exibido no fuso da unidade).

### 5.1 Administração, cadastros e agenda

```
clinica            (id, nome, cnpj, fuso_horario, config jsonb)
unidade            (id, clinica_id, nome, endereco jsonb, telefone, horario_funcionamento jsonb, ativo)
sala               (id, unidade_id, nome, ativo)
feriado            (id, clinica_id, unidade_id?, data, descricao)

usuario            (id, clinica_id, nome, email, senha_hash, totp_secret?, ativo, ultimo_login_em)
papel              (id, clinica_id, nome, permissoes text[])
usuario_papel      (usuario_id, papel_id)
usuario_unidade    (usuario_id, unidade_id)
sessao             (id, usuario_id, token_hash, ip, user_agent, ultimo_uso_em,
                    expira_em, revogada_em)

profissional       (id, usuario_id, conselho, numero_conselho, uf_conselho, rqe?, cor, ativo)
especialidade      (id, clinica_id, nome)
profissional_especialidade (profissional_id, especialidade_id)
procedimento       (id, clinica_id, nome, duracao_min, preco_centavos, exige_sala,
                    modelo_prontuario_id?, ativo)
profissional_procedimento  (profissional_id, procedimento_id, duracao_min?, preco_centavos?)
grade_horaria      (id, profissional_id, unidade_id, dia_semana, hora_inicio, hora_fim,
                    intervalo_min, vigencia_inicio, vigencia_fim?)
bloqueio           (id, profissional_id, unidade_id?, inicio, fim, motivo, criado_por)

paciente           (id, clinica_id, nome, nome_social?, nascimento, cpf?, sexo?, celular,
                    email?, endereco jsonb?, responsavel jsonb?, observacoes, ativo,
                    anonimizado_em?)
consentimento      (id, paciente_id, tipo, versao_termo, aceito, canal, registrado_por, registrado_em)

agendamento        (id, clinica_id, unidade_id, paciente_id, profissional_id, procedimento_id,
                    sala_id?, periodo tstzrange, status, encaixe bool, origem,
                    observacao, remarcado_de?, motivo_cancelamento?, cancelado_por_origem?,
                    chegou_em?, chamado_em?, finalizado_em?, criado_por)
agendamento_evento (id, agendamento_id, status_de, status_para, usuario_id?, canal, observacao, em)
lista_espera       (id, paciente_id, procedimento_id, profissional_id?, unidade_id,
                    periodo_desejado jsonb, status, criado_em)
```

### 5.2 Prontuário e assinatura

```
paciente_saude     (paciente_id, alergias jsonb, medicamentos_uso jsonb, problemas jsonb,
                    antecedentes jsonb, habitos jsonb, atualizado_por, atualizado_em)
                    -- cada alteração também gera um registro_clinico do tipo 'resumo'
modelo_prontuario  (id, clinica_id, especialidade_id?, nome, versao, schema jsonb, ativo, criado_por)

registro_clinico   (id, clinica_id, paciente_id, profissional_id, agendamento_id?,
                    tipo [anamnese|evolucao|resumo|adendo], modelo_id?, modelo_versao?,
                    conteudo jsonb, sinais_vitais jsonb?, cid10 text[], sigiloso bool,
                    status [rascunho|assinado], adendo_de?, hash_conteudo?, assinatura_id?,
                    pdf_arquivo_id?, assinado_em?)
documento_clinico  (id, clinica_id, paciente_id, profissional_id, registro_id?,
                    tipo [atestado|declaracao|exames|encaminhamento|relatorio|receita|receita_memed],
                    conteudo jsonb, status [rascunho|assinado|cancelado], pdf_arquivo_id?,
                    assinatura_id?, memed_id?, assinado_em?)
assinatura         (id, usuario_id, metodo [nuvem|token_a3], provedor?, certificado_titular,
                    certificado_cpf, certificado_serial, certificado_emissor, certificado_validade,
                    hash_documento, carimbo_tempo jsonb?, verificacao jsonb, em)
arquivo            (id, clinica_id, chave_armazenamento, nome, mime, tamanho, sha256,
                    enviado_por?, origem [upload|whatsapp|gerado], criado_em)
anexo_paciente     (id, paciente_id, arquivo_id, contexto [administrativo|clinico],
                    registro_id?, descricao, movido_por?, movido_em?)
cid10              (codigo, descricao, categoria)   -- tabela de referência
```

### 5.3 Financeiro

```
conta_receber      (id, clinica_id, unidade_id, paciente_id, agendamento_id?, descricao,
                    valor_bruto_centavos, desconto_centavos, motivo_desconto?, status, vencimento)
caixa              (id, unidade_id, usuario_id, aberto_em, saldo_inicial_centavos,
                    fechado_em?, conferencia jsonb?, diferenca_centavos?)
pagamento          (id, conta_receber_id, caixa_id?, forma, valor_centavos, parcelas?,
                    bandeira?, nsu?, taxa_centavos, estorno_de?, motivo_estorno?, recebido_por, recebido_em)
```

### 5.4 Comunicação

```
-- chat interno
conversa           (id, clinica_id, tipo [canal|direta|sistema], nome?, unidade_id?)
conversa_membro    (conversa_id, usuario_id, ultima_leitura_em, silenciada)
mensagem           (id, conversa_id, autor_id?, texto, anexos jsonb, referencia jsonb?,
                    editada_em?, apagada_em?, criado_em)

-- WhatsApp
contato_externo    (id, clinica_id, canal [whatsapp|sms], identificador, nome_perfil?)
contato_paciente   (contato_id, paciente_id, relacao [proprio|responsavel])
atendimento_externo(id, clinica_id, contato_id, paciente_id?, status, atribuido_a?, setor?,
                    ultima_msg_paciente_em, janela_expira_em, aberto_em, resolvido_em?)
mensagem_externa   (id, atendimento_id, direcao [entrada|saida|nota_interna],
                    tipo [texto|imagem|documento|audio|template|botao|sistema],
                    conteudo jsonb, arquivo_id?, template?, agendamento_id?, autor_id?,
                    status [pendente|enviada|entregue|lida|falhou], provedor_id?, erro?, criado_em)
atendimento_evento (id, atendimento_id, acao [atribuir|transferir|resolver|reabrir], de?, para?,
                    usuario_id?, em)
resposta_rapida    (id, clinica_id, atalho, texto, setor?)
modelo_documento   (id, clinica_id, tipo, nome, conteudo)

audit_log          (id, clinica_id, usuario_id?, acao, entidade, entidade_id, antes jsonb?,
                    depois jsonb?, ip, plataforma, em)        -- particionada por mês
                    -- inclui as leituras de prontuário (acao = 'ler')
```

### 5.5 Restrições importantes (PostgreSQL)

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- agenda sem sobreposição
ALTER TABLE agendamento ADD CONSTRAINT agendamento_sem_sobreposicao_profissional
  EXCLUDE USING gist (profissional_id WITH =, periodo WITH &&)
  WHERE (status NOT IN ('cancelado', 'faltou') AND NOT encaixe);

ALTER TABLE agendamento ADD CONSTRAINT agendamento_sem_sobreposicao_sala
  EXCLUDE USING gist (sala_id WITH =, periodo WITH &&)
  WHERE (sala_id IS NOT NULL AND status NOT IN ('cancelado', 'faltou') AND NOT encaixe);

-- registro clínico assinado é imutável (vale também para quem acessar o banco direto)
CREATE FUNCTION impedir_alteracao_assinado() RETURNS trigger AS $$
BEGIN
  IF OLD.status = 'assinado' THEN
    RAISE EXCEPTION 'registro assinado não pode ser alterado ou excluído; use um adendo';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$ LANGUAGE plpgsql;

CREATE TRIGGER registro_clinico_imutavel
  BEFORE UPDATE OR DELETE ON registro_clinico
  FOR EACH ROW EXECUTE FUNCTION impedir_alteracao_assinado();
```

- **Isolamento entre clínicas**: Row-Level Security com `clinica_id = current_setting('app.clinica_id')`, definido por requisição. Mesmo que o código esqueça um filtro, uma clínica não enxerga dados de outra.
- O usuário do banco usado pela aplicação não tem permissão de `DELETE` em `registro_clinico`, `documento_clinico`, `assinatura` e `audit_log`.

## 6. API (principais rotas)

REST, JSON, prefixo `/api/v1`. Validação com schemas Zod compartilhados entre front e back. Paginação por cursor. A API atende a web (navegador ou PWA instalada no PC e no celular).

```
POST   /auth/login | /auth/refresh | /auth/logout | /auth/2fa/verify | /auth/desbloquear
GET    /me

GET    /pacientes?busca=            POST /pacientes
GET    /pacientes/:id               PATCH /pacientes/:id
GET    /pacientes/:id/historico     POST /pacientes/:id/consentimentos
POST   /pacientes/:id/mesclar       POST /pacientes/:id/anonimizar

GET    /profissionais               CRUD /procedimentos
CRUD   /profissionais/:id/grade     CRUD /profissionais/:id/bloqueios

GET    /agenda?unidade=&data=&profissionais=      (visão dia/semana)
GET    /agenda/horarios-livres?procedimento=&profissional?=&a-partir-de=
POST   /agendamentos                PATCH /agendamentos/:id
POST   /agendamentos/:id/confirmar | /check-in | /chamar | /finalizar
POST   /agendamentos/:id/cancelar | /faltou | /remarcar | /reabrir
CRUD   /lista-espera

GET    /recepcao/painel?unidade=
GET    /painel-chamada/:token       (público, TV da sala de espera; via WebSocket)

# prontuário (só profissionais; toda leitura é auditada)
GET    /pacientes/:id/prontuario?tipo=&profissional=&cursor=   (linha do tempo)
GET    /pacientes/:id/saude         PUT /pacientes/:id/saude
POST   /registros                   PATCH /registros/:id          (só rascunho)
POST   /registros/:id/assinar       POST /registros/:id/adendos
CRUD   /modelos-prontuario          GET /cid10?busca=
POST   /documentos-clinicos         GET /documentos-clinicos/:id.pdf
POST   /documentos-clinicos/:id/assinar | /enviar
POST   /memed/token                 (token da sessão do prescritor para o widget)
POST   /arquivos/upload-url         GET /arquivos/:id
POST   /anexos/:id/mover-para-prontuario
GET    /pacientes/:id/prontuario/acessos     (relatório de quem acessou)
POST   /assinatura/nuvem/autorizar  (fluxo OAuth com o provedor do certificado)

# financeiro
GET    /contas-receber?status=&paciente=     POST /contas-receber
POST   /contas-receber/:id/pagamentos        POST /pagamentos/:id/estornar
GET    /contas-receber/:id/recibo.pdf
POST   /caixas/abrir    GET /caixas/atual    POST /caixas/:id/fechar

# chat interno
GET    /conversas       POST /conversas
GET    /conversas/:id/mensagens?antes=       POST /conversas/:id/mensagens
POST   /conversas/:id/lida

# inbox WhatsApp
GET    /inbox?fila=nao_atribuidas|minhas|setor|todas&status=
GET    /inbox/:id/mensagens?antes=           POST /inbox/:id/mensagens   (texto, mídia, template, nota)
POST   /inbox/:id/atribuir | /transferir | /resolver
POST   /contatos/:id/vincular-paciente
CRUD   /respostas-rapidas                    GET /whatsapp/templates
POST   /inbox/iniciar                        (nova conversa com paciente, via template)
POST   /webhooks/whatsapp                    (verificação de assinatura da Meta)

GET    /relatorios/:tipo?inicio=&fim=&unidade=&formato=csv|xlsx
GET    /auditoria?entidade=&usuario=
```

**WebSocket** (Socket.IO, autenticado, salas por unidade/conversa/usuário): `agenda.atualizada`, `recepcao.painel`, `chamada.paciente`, `chat.mensagem`, `chat.digitando`, `chat.presenca`, `inbox.mensagem`, `inbox.atendimento.atualizado`, `notificacao`.

## 7. Jobs (BullMQ)

| Job | Quando | O que faz |
|---|---|---|
| `whatsapp.webhook` | fila | processa cada evento recebido da Meta fora da requisição (responde 200 imediatamente) |
| `whatsapp.midia` | fila | baixa a mídia recebida e guarda no armazenamento próprio |
| `whatsapp.enviar` | fila | envio com retry exponencial (3x) e depois fallback para SMS |
| `whatsapp.confirmacao` | a cada 15 min | pedido de confirmação para os agendamentos de D-1 que entraram na janela configurada |
| `whatsapp.lembrete` | a cada 5 min | lembrete de 2 h antes |
| `inbox.fora-horario` | evento | resposta automática fora do horário de funcionamento |
| `agenda.sugerir-faltas` | diário 20h | lista os agendamentos não finalizados do dia para a recepção revisar |
| `lista-espera.verificar` | evento de cancelamento | procura candidatos e notifica #avisos |
| `prontuario.pendencias` | a cada hora | avisa sobre rascunhos não assinados há mais de 24 h |
| `documento.gerar-pdf` | fila | gera PDF/A de registros e documentos para assinatura |
| `relatorio.exportar` | fila | gera arquivos grandes e avisa quando estiverem prontos |
| `manutencao.backup-check` | diário | verifica se o último backup existe e pode ser restaurado |

Todos idempotentes (ex.: a chave `agendamento_id + tipo` impede lembrete duplicado; o `id` da Meta impede processar a mesma mensagem duas vezes).

## 8. Telas

1. Login / 2FA / desbloqueio de tela / recuperar senha
2. **Agenda** (dia multi-profissional, semana, lista, busca de horário livre), com modal de agendar/editar
3. **Recepção** — painel do dia com colunas por status
4. Painel de chamada (TV, tela cheia, sem login)
5. Pacientes — lista/busca e ficha (dados, consentimentos, histórico, financeiro, conversas)
6. **Atendimento (prontuário)** — resumo de saúde no topo, formulário do modelo, sinais vitais, CID, documentos, prescrição Memed, linha do tempo ao lado, botão assinar
7. **Inbox de WhatsApp** — filas à esquerda, conversa ao centro, painel do paciente à direita
8. **Caixa** — abrir, receber pagamento, lançamentos do dia, fechar
9. Contas a receber — lista com filtros
10. **Chat interno** — acessível de qualquer tela como gaveta lateral
11. Relatórios
12. Configurações — clínica, unidades, salas, feriados, profissionais, grade, procedimentos, preços, usuários e perfis, modelos de prontuário e de documentos, respostas rápidas, integração WhatsApp, Memed, assinatura
13. Auditoria

## 9. Requisitos não funcionais

**Segurança e LGPD**
- HTTPS obrigatório; criptografia em repouso (disco/banco/arquivos) e de campos sensíveis (CPF) na aplicação
- Auditoria de **leitura** de prontuário e da ficha do paciente, além das alterações
- Princípio do menor privilégio; logs da aplicação sem dados pessoais nem conteúdo clínico (mascarar CPF/telefone)
- Política de retenção configurável (conversas, logs); prontuário com retenção mínima de 20 anos
- Exportação dos dados do titular (portabilidade) e relatório de acessos ao prontuário
- Termo de uso e política de privacidade versionados; registro de qual versão cada usuário/paciente aceitou
- Teste de invasão (pentest) antes da implantação

**Disponibilidade e dados**
- Backup diário completo + WAL contínuo (recuperação a um ponto no tempo), retenção de 30 dias, cópia em outra região; arquivos com versionamento; **teste de restauração mensal**
- Meta de disponibilidade: 99,5% em horário comercial
- Hospedagem no Brasil (ex.: AWS sa-east-1 ou equivalente)

**Desempenho**
- Agenda do dia com 20 profissionais carregando em < 1 s
- Busca de paciente < 300 ms com 100 mil cadastros
- Abertura da tela de atendimento (resumo + últimos 10 registros) < 1,5 s
- Mensagem de WhatsApp aparecendo no inbox < 3 s após chegar na Meta

**Usabilidade**
- Responsivo (recepção em desktop, profissional também no celular)
- Atalhos de teclado na agenda, no inbox e no caixa
- Português do Brasil, com formatos de data/moeda brasileiros

**Qualidade**
- Testes unitários nas regras de negócio (agenda, estados, financeiro, imutabilidade do prontuário), testes de integração na API com banco real (Vitest + PostgreSQL de teste) e E2E (Playwright) nos fluxos principais
- CI rodando lint, testes e build a cada PR; deploy por tag com backup antes das migrações

## 10. Plataformas e stack

Resumo; os detalhes, custos e hospedagem estão em `arquitetura.md` (v0.2).

### 10.1 Web, instalável como app

| | |
|---|---|
| Como usa | navegador (Chrome, Edge, Firefox recentes) ou **instalado como app (PWA)**: ícone na área de trabalho, janela própria, notificações |
| Onde | recepção e consultórios no PC; médico e gestor também no celular ou de casa |
| Impressão | página de impressão com CSS próprio (recibo, receita, atestado, etiqueta) |
| Internet | necessária (D7). Contingência: agenda do dia em cache somente leitura, agenda impressa e 4G de reserva |

**Por que online obrigatório:** permitir agendar ou cobrar sem internet exigiria sincronização com resolução de conflitos (dois agendamentos no mesmo horário feitos offline, caixa divergente). Isso multiplica a complexidade e o risco.

### 10.2 Stack

| Camada | Escolha |
|---|---|
| Linguagem | **JavaScript** (módulos ES) no front e no back; Zod, ESLint, testes e JSDoc opcional no lugar do TypeScript |
| Monorepo | npm workspaces |
| Front | React + Vite (SPA, **sem Next.js**), React Router + TanStack Query, Mantine, agenda própria (sem plugins pagos do FullCalendar), `vite-plugin-pwa` |
| Back | Node.js LTS + **Fastify**, postgres.js (SQL escrito à mão), migrações SQL com `node-pg-migrate`, Zod |
| Tempo real | Socket.IO (adaptador PostgreSQL se houver mais de uma instância) |
| Filas | pg-boss, no próprio PostgreSQL (sem Redis) |
| Banco | PostgreSQL 17 (`btree_gist`, `pg_trgm`, `unaccent`, `pgcrypto`) |
| Arquivos | Cloudflare R2 (compatível com S3), bucket privado com links temporários |
| PDF e assinatura | pdfmake no servidor; assinatura PAdES com `@signpdf` e certificado em nuvem |
| Integrações | WhatsApp Cloud API (Fase 0 com `wa.me`), Memed, provedores de certificado em nuvem, BrasilAPI, Brevo |
| Infra | Docker Compose (Caddy + api + PostgreSQL + backup) numa VM Oracle Cloud Always Free em São Paulo, Cloudflare na frente, backup restic no Backblaze B2, UptimeRobot e Sentry gratuitos |

> Next.js fica de fora: todo o sistema está atrás de login, então a renderização no servidor não traz ganho, e o build estático do Vite é mais simples de hospedar.

### 10.3 Estrutura do repositório

```
sis_Clinicas/
├─ apps/
│  ├─ web/             # React + Vite (JSX), PWA
│  └─ api/             # Fastify
│     └─ src/modulos/  # auth, clinica, pacientes, profissionais, agenda, recepcao,
│                      # prontuario, assinatura, financeiro, chat, inbox, mensageria,
│                      # relatorios, auditoria
├─ packages/
│  └─ shared/          # esquemas Zod, status, utilitários de dinheiro/data
├─ db/                 # migrations/ (SQL) e seed/ (CID-10, dados de exemplo)
├─ infra/              # docker-compose, Caddyfile, backup
└─ docs/
```

## 11. Plano de entrega

Estimativa para **2 devs full-stack**, sprints de 2 semanas.

| Sprint | Entrega |
|---|---|
| S1 | Monorepo, CI, Docker; VM na Oracle com deploy automático (validar cedo); auth + 2FA; usuários/perfis; clínica/unidades/salas; auditoria base |
| S2 | Pacientes (CRUD, busca, duplicidade, consentimentos); profissionais, procedimentos, grade, bloqueios |
| S3 | Agenda: visões dia/semana/lista, agendar/remarcar/cancelar, constraint de sobreposição, tempo real, horários livres |
| S4 | Máquina de estados, recepção/check-in, painel de chamada, lista de espera |
| S5 | Financeiro: contas a receber, pagamentos, caixa, estorno, recibo PDF |
| S6 | Chat interno; base do WhatsApp (webhook, mídia, templates, envio); confirmação e lembrete |
| S7 | Inbox: filas, atribuição, notas, respostas rápidas, janela de 24 h, painel do paciente, métricas |
| S8 | Prontuário I: resumo de saúde, modelos configuráveis, registros, sinais vitais, CID-10, anexos, linha do tempo, auditoria de leitura |
| S9 | Prontuário II: assinatura com certificado em nuvem, PDF/A, adendos, imutabilidade, documentos clínicos, Memed |
| S10 | PWA: instalação, notificações, agenda do dia em cache, páginas de impressão; relatórios |
| S11 | Hardening, pentest, E2E, teste de restauração do backup, termo LGPD com a clínica, migração de dados |
| S12 | Homologação com a equipe da clínica, treinamento, implantação assistida |

≈ **24 semanas** com 2 devs. Com **3 devs** (um dedicado ao prontuário/assinatura a partir da S3) dá para chegar a ~16–18 semanas.

**Riscos que afetam o prazo**
- Verificação da empresa e aprovação dos templates na Meta (começar na S1)
- Contratos e credenciais da Memed e dos provedores de certificado em nuvem (começar na S1)
- Modelos de prontuário de cada especialidade: precisam ser definidos com os médicos (começar a coletar na S2)
- Migração de dados de sistema/planilha anterior
- Mudanças de escopo durante a homologação

## 12. Pontos em aberto

1. Aprovar D6 (web em JavaScript, sem Next.js) e D7 (online obrigatório na Oracle Cloud, com contingência)
2. Navegadores e celulares usados na clínica (para testar a PWA neles)
3. Prontuário compartilhado entre os profissionais (padrão proposto) ou só do autor?
4. Os médicos já têm certificado ICP-Brasil? Em nuvem ou token A3?
5. Usar Memed para prescrição?
6. Certificação SBIS: avaliar depois do MVP — alinhar com o jurídico como a clínica guarda os registros até lá
7. Quais especialidades atendem hoje (para preparar os modelos de prontuário iniciais)?
8. Migração: há sistema ou planilha atual? Há prontuários antigos (digitalizar e importar como anexo)?
9. Quantas pessoas vão atender no inbox, e em quais setores?
10. Já existe número de WhatsApp Business? (a Cloud API exige um número que não esteja em uso no app comum do WhatsApp)
11. Cobrar falta/no-show? (não está no MVP)
12. Limite padrão de desconto da recepção
13. Horários dos lembretes e texto dos templates de WhatsApp
14. Quem hospeda e opera (própria clínica, fornecedor, nuvem)?
