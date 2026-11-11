# MVP — Sistema de Gestão de Clínica

> Versão 0.3 — 10/11/2026 — decisões do levantamento de requisitos (detalhes em `primeiros-passos.md`, seção 2)

## 0. Decisões de escopo

| # | Decisão | Situação |
|---|---|---|
| D1 | Clínicas **médicas multiespecialidade**. Especialidades, profissionais, salas e unidades são **cadastrados por cada clínica**, sem quantidade fixa | revisada em 09/11/2026 |
| D2 | Produto para **várias clínicas**, começando por uma. Cada clínica configura as próprias regras (horários, procedimentos, políticas, pagamentos, permissões). O banco já nasce isolado por clínica (`clinica_id` + RLS); o MVP não tem cadastro self-service nem cobrança de assinatura | revisada em 09/11/2026 |
| D3 | Só atendimento **particular** (convênio/TISS fica para depois) | mantida |
| D4 | **Prontuário eletrônico** entra no MVP, com assinatura digital ICP-Brasil por **certificado em nuvem e token A3** | revisada em 10/11/2026 |
| D5 | Comunicação no MVP: **chat interno** + **WhatsApp** com pacientes + confirmação/lembrete. O WhatsApp começa pelo envio gratuito (`wa.me`), evolui para a API oficial e oferece API não oficial como opção da clínica (§3.9) | revisada em 10/11/2026 |
| D6 | **Sistema web** (React + Vite, JavaScript, sem Next.js), instalável no PC e no celular como PWA. Sem app desktop nem servidor na clínica; a única instalação é o assinador A3, só nos PCs dos médicos que usam token (§3.8). Detalhes em `arquitetura.md` | revisada em 10/11/2026 |
| D7 | **Online obrigatório**, hospedado na nuvem (Oracle Cloud Always Free, São Paulo). Contingência: agenda do dia em cache somente leitura e agenda impressa; internet 4G de reserva como recomendação opcional no guia de implantação | revisada em 10/11/2026 |
| D8 | **Tudo configurável pela clínica**: horários (da clínica e de cada profissional), procedimentos e durações, política de desmarcação e faltas, formas de pagamento, caixas, lembretes e **autorizações por usuário** | nova em 10/11/2026 |
| D9 | **Uso em vários computadores e no celular**: todas as telas com layout para celular | nova em 10/11/2026 |
| D10 | **Importação de dados externos** (planilhas e outros sistemas) entra no MVP | nova em 10/11/2026 |

## 1. Objetivo do MVP

Substituir a agenda em papel/planilha, o prontuário em papel, o caixa manual e o WhatsApp no celular da recepção por um único sistema, reduzindo as faltas com confirmação automática.

**Critérios de sucesso (90 dias após a implantação)**

- 100% dos agendamentos e atendimentos registrados no sistema
- Taxa de faltas reduzida em ≥ 30% em relação à linha de base
- Todo o atendimento por WhatsApp feito pelo inbox, quando a clínica usar API (oficial ou não oficial); sem celular avulso na recepção
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

- A tabela acima é o **padrão de fábrica**. As permissões são granulares no código (ex.: `agenda.encaixe`, `prontuario.ler`, `financeiro.desconto`, `caixa.abrir`).
- **Aba Autorizações** (Configurações): o Admin edita o que cada perfil pode fazer e pode dar ou tirar permissões de um **usuário específico** (exceções ao perfil). Ex.: quem pode dar desconto e até quanto, quem abre e fecha cada caixa, quem atende no WhatsApp. Toda mudança de permissão vai para a auditoria.
- **Conteúdo clínico só é acessível a profissionais de saúde.** Admin, Gestor, Recepção e Financeiro não leem prontuário, mesmo com permissão administrativa. Um usuário Admin que também é médico acessa pelo perfil de profissional.

## 3. Escopo funcional

### 3.1 Acesso e administração

- Login com e-mail + senha (Argon2id); 2FA por TOTP **obrigatório** para Admin, Gestor e Profissional; opcional para os demais
- Sessão guardada no servidor, com cookie httpOnly + Secure + SameSite=Strict; expira por inatividade; logout remoto de sessões
- Bloqueio após 5 tentativas erradas (15 min); recuperação de senha por e-mail
- Bloqueio automático da tela após inatividade (configurável, padrão 10 min), exigindo a senha de novo — importante em consultório
- Cadastro de unidades (endereço, feriados), salas e especialidades, em qualquer quantidade
- **Aba Horários**: horário de funcionamento de cada unidade e horário de atendimento de **cada profissional, individualmente** (§3.3)
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
- **Procedimento**: nome, tipo (consulta, retorno, exame, procedimento), **duração livre em minutos, editável**, preço particular, se exige sala específica, orientações de preparo (ex.: jejum, enviadas na confirmação), modelo de prontuário padrão (opcional).
- Além de consultas, a clínica cadastra **exames e procedimentos diversos** (ex.: exames de sangue, fezes, urina, diabetes, exame de vista). O sistema vem sem procedimentos; cada clínica cria os seus.
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
- **Política de desmarcação e faltas, configurável por clínica**:
  - prazo mínimo para o paciente desmarcar sem ser considerado desmarcação tardia (ex.: 24 h);
  - o que acontece após N faltas em um período: só alerta (padrão), exigir confirmação da gestão para agendar, ou bloquear o agendamento pelo WhatsApp;
  - cobrança de taxa de falta ou de desmarcação tardia: **desligada por padrão**; quando ligada, gera uma conta avulsa para o paciente.
- Alerta ao agendar paciente com débito em aberto ou que se enquadre na política de faltas.
- **Lista de espera** *(funcionamento em estudo)*: paciente + procedimento + profissional (opcional) + período desejado. Quando um horário compatível é liberado por cancelamento, a recepção recebe um aviso. As regras de encaixe e de lista de espera podem mudar quando o estudo for concluído.
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
  - **Modelo padrão do sistema** (biblioteca inicial, mantida por nós) + **modelos próprios de cada clínica**. A clínica pode usar o padrão, copiar e ajustar, ou criar do zero, por especialidade.
  - Os modelos são configuráveis sem programar (formulário com campos de texto, número, seleção, checklist, escala). Cada modelo tem **versão**; um registro guarda a versão usada, então mudar o modelo não altera registros antigos.
  - Seções padrão: queixa principal, história da doença atual, exame físico, hipótese diagnóstica (**CID-10** com busca), conduta.
  - **Sinais vitais**: PA, FC, FR, temperatura, saturação, peso e altura (IMC calculado), com gráfico de evolução.
  - Salvamento automático do rascunho a cada poucos segundos.
- **Documentos clínicos** a partir de modelos com variáveis: atestado, declaração de comparecimento, solicitação de exames, encaminhamento, relatório e receita simples. Geram PDF assinado, que pode ser impresso, enviado por WhatsApp/e-mail ou baixado.
- **Prescrição** *(integração com a Memed em estudo)*: no MVP, receita simples por modelo do próprio sistema. Se a Memed for adotada: base de medicamentos, interações, receita de controle especial e validação pela farmácia, com a receita voltando para o prontuário.
- **Anexos**: exames, imagens e laudos (PDF, JPG, PNG, DICOM só como arquivo), com visualizador. Um arquivo que o paciente mandou pelo WhatsApp pode ser movido para o prontuário pelo profissional.
- **Linha do tempo** do paciente: todos os registros, documentos e anexos, com filtro por especialidade/profissional/tipo.

**Regras**
- Rascunho → **assinado**. Ao assinar, o registro é travado, recebe um hash do conteúdo e uma assinatura digital ICP-Brasil (§3.8). Depois de assinado, **nada é editado**: correções são feitas por **adendo**, também assinado, que fica ligado ao registro original.
- Rascunho não assinado em 24 h gera alerta para o profissional (e aparece em relatório de pendências para o Gestor).
- Acesso, com **as duas opções**:
  - **Compartilhado**: todos os profissionais da clínica leem o prontuário do paciente (comum em multiespecialidade);
  - **Só do autor**: cada profissional lê apenas os próprios registros.
  - A clínica escolhe o padrão nas configurações (a definir se o profissional também pode escolher para os próprios registros).
- **Registros sigilosos** existem (ex.: psiquiatria): o autor marca o registro como sigiloso, e só ele lê o conteúdo; os demais profissionais veem apenas que existe um registro sigiloso naquela data.
- **Toda leitura do prontuário é registrada** (quem, quando, qual registro), e o paciente pode pedir esse relatório de acessos.
- Retenção mínima de 20 anos, sem exclusão (ver §3.2).
- Impressão do prontuário completo ou de um período, em PDF assinado (para pedido do paciente ou de outro serviço).

**Conformidade (CFM)**
- A Res. CFM 1.821/2007 só permite eliminar o papel quando o sistema atende ao nível de segurança **NGS2** da certificação SBIS/CFM, que exige assinatura ICP-Brasil. A Res. CFM 2.299/2021 regula os documentos médicos digitais (atestados, receitas) com assinatura ICP-Brasil.
- **Recomendação:** desenhar o sistema seguindo os requisitos do NGS2 desde já (auditoria, assinatura, imutabilidade, controle de acesso, carimbo de tempo) e avaliar a **certificação SBIS** depois do MVP, porque é um processo à parte, com custo e prazo próprios. Confirmar com assessoria jurídica como a clínica vai guardar os registros até lá.

### 3.8 Assinatura digital ICP-Brasil

As **duas formas entram no MVP**, porque os médicos podem ter qualquer um dos dois tipos (decisão de 10/11/2026):

| Forma | Como funciona | Onde funciona |
|---|---|---|
| **Certificado em nuvem** (ex.: BirdID, VIDaaS, SafeID) | o médico autoriza a sessão no app do celular uma vez por turno; o sistema assina por API do provedor durante esse período | qualquer PC ou celular |
| **Token/cartão A3** | o navegador não acessa o token sozinho. Um **assinador local** (pequeno programa instalado no PC do médico) lê o token via PKCS#11 e assina o resumo (hash) do documento, que volta para o servidor | só nos PCs com o assinador instalado |

- **Assinador local**: programa leve para Windows, com instalador e atualização automática, que só aceita pedidos do domínio do sistema. Alternativa a avaliar: componente comercial pronto (ex.: Web PKI), que tem custo de licença. Muda a arquitetura v0.2, que deixava o A3 para depois (atualizar `arquitetura.md`).

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

#### 3.9.2 WhatsApp com pacientes

**Formas de conexão**, escolhidas por cada clínica, todas atrás da mesma interface no sistema (um módulo por forma, trocável sem afetar o resto):

| Forma | Como funciona | Situação |
|---|---|---|
| **Envio gratuito (`wa.me`)** | o sistema monta a mensagem e abre o WhatsApp da recepção com o texto pronto; a pessoa toca em enviar. Sem inbox: as respostas chegam no celular | início (já no esboço) |
| **API oficial (WhatsApp Cloud API, Meta)** | envio e recebimento automáticos, inbox completo, templates aprovados pela Meta, custo por mensagem de modelo | objetivo principal |
| **API não oficial** | conecta o WhatsApp da clínica lendo um QR Code, como no WhatsApp Web; inbox completo, sem custo por mensagem | **opcional, desligada por padrão** |

- **Número**: no início, a clínica precisa de um **WhatsApp Business**. A verificar: uso de número comum e como migrar o número para a API oficial sem perder o app no celular.
- **Atendentes**: uma, duas ou várias pessoas, sem limite.
- **API não oficial — cuidados obrigatórios**: viola os termos do WhatsApp e pode levar ao **bloqueio do número**. Para ligar, o Admin aceita um termo de ciência (registrado com data e usuário). O uso precisa constar no termo de tratamento de dados (LGPD). A sessão fica aberta no servidor, com reconexão automática e aviso quando cair.

**Inbox** (com API oficial ou não oficial), atendido por várias pessoas ao mesmo tempo:

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
- **Janela de 24 horas** (só na API oficial): a Meta só permite texto livre até 24 h depois da última mensagem do paciente. Fora dessa janela, o sistema bloqueia o texto livre e oferece os templates aprovados.
- **Fora do horário de funcionamento**: resposta automática com o horário de atendimento.
- **Sigilo**: documentos clínicos só podem ser enviados por um profissional ou com a permissão `documento.enviar`, e só para o número cadastrado do paciente/responsável.
- **Métricas**: tempo até a primeira resposta, tempo até resolver, volume por atendente e por hora.

#### 3.9.3 Mensagens automáticas

**Antecedência e texto de todas as mensagens são configuráveis por clínica.** Padrão sugerido:

| Quando | Mensagem | Botões |
|---|---|---|
| Ao agendar (se faltar > 2 h) | Confirmação de agendamento: data, hora, profissional, endereço, preparo do exame | — |
| D-1 às 10h | Pedido de confirmação | **Confirmar** · **Remarcar** · **Cancelar** |
| 2 h antes (opcional) | Lembrete curto | — |

- Com `wa.me`, as mensagens não saem sozinhas: a recepção vê a lista de lembretes do dia e envia um a um (como no esboço). Os botões só existem na API oficial; na não oficial, o paciente responde com texto ("1 para confirmar…").

- **Confirmar** → status vira `confirmado` e a agenda é atualizada em tempo real.
- **Cancelar** → status vira `cancelado` (origem paciente, motivo "via WhatsApp"); o horário liberado é verificado na lista de espera.
- **Remarcar** → abre (ou reabre) a conversa no inbox, na fila "não atribuídas", com o agendamento já anexado, para a recepção oferecer novos horários.
- As respostas aos botões e qualquer texto do paciente aparecem na conversa do inbox, então a recepção vê o histórico completo.
- Só envia com consentimento registrado (§3.2) e celular válido.
- Cada envio grava status (enviado, entregue, lido, falhou) via webhook.
- Fallback: se o WhatsApp falhar, envia SMS (opcional, via provedor configurável).

#### 3.9.4 Pesquisa de satisfação

- Depois do atendimento (antecedência configurável, ex.: 2 h depois), o paciente recebe pelo WhatsApp: "De 0 a 10, quanto você recomendaria a clínica?" e um comentário opcional.
- Notas por clínica, profissional e recepção alimentam o relatório de satisfação (§3.11).
- Só envia com consentimento de mensagens (§3.2); pode ser desligada pela clínica.

### 3.10 Financeiro (MVP)

**Conceitos**
- **Conta a receber**: o que o paciente deve; gerada por agendamento (valor = preço do procedimento para aquele profissional) ou avulsa (ex.: venda de produto, taxa de falta).
- **Formas de pagamento**: o sistema aceita **todas** (dinheiro, PIX, débito, crédito à vista e parcelado, boleto, transferência, outras criadas pela clínica). **Cada clínica escolhe quais usa**, o parcelamento máximo e a taxa de cada forma.
- **Pagamento**: uma ou mais formas por conta, com pagamento parcial permitido.
- **Caixas**: cada clínica cadastra **um ou vários caixas** (ex.: "Recepção 1", "Recepção 2", "Laboratório"). Cada abertura gera uma sessão de caixa (saldo inicial → fechamento). **Quem abre e fecha cada caixa é definido na aba Autorizações.**

**Regras**
- Valores sempre em **centavos (inteiro)**; nunca usar ponto flutuante.
- A conta é gerada no check-in (se houver cobrança antecipada) ou ao finalizar o atendimento. Cancelamento e falta só geram conta se a política de faltas da clínica cobrar taxa (§3.4).
- Desconto *(regras em estudo)*: controlado pela aba Autorizações. O Admin define quem pode dar desconto e o limite de cada perfil ou usuário; acima do limite, exige alguém autorizado, com motivo.
- Pagamento em **dinheiro** exige um caixa aberto pelo usuário; os demais vão para o caixa aberto escolhido, se houver.
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
9. Número de atendimentos e ranking de especialidades e procedimentos
10. Satisfação: nota geral (NPS), por profissional e recepção, comentários (§3.9.4)

Todos com filtro de período/unidade/profissional/especialidade e exportação para Excel e PDF. O profissional vê só os dados dele.

**Em estudo:** a lista final. Há uma proposta com cerca de 35 relatórios em `primeiros-passos.md` ("Relatórios propostos"); os escolhidos entram aqui.

### 3.12 Importação de dados externos

Para clínicas que vêm de outro sistema ou de planilhas (decisão D10; formato em estudo).

- **Modelos de planilha** (Excel/CSV) para pacientes, profissionais, procedimentos e agenda futura.
- **Pré-visualização** antes de gravar, com os erros linha a linha (CPF inválido, telefone sem DDD, data errada) e o que será criado ou atualizado.
- **Duplicados**: detecta pelo CPF ou celular e pergunta se mescla ou ignora.
- **Prontuários antigos** entram como anexos (PDF ou imagem digitalizada) na ficha do paciente, sem virar registro clínico assinado.
- Cada importação fica registrada (quem, quando, arquivo, totais) e pode ser **desfeita** enquanto nada foi alterado depois.
- Permissão própria (`dados.importar`), normalmente só do Admin.

## 4. Fora do escopo do MVP

Convênios/TISS, NFS-e (em estudo, há interesse para logo depois do MVP), repasse a profissionais, contas a pagar, estoque, portal do paciente/autoagendamento, teleconsulta, app mobile nativo (o MVP é web responsivo no celular), integração com maquininha, funcionamento offline completo, certificação SBIS (processo à parte), chatbot/IA no WhatsApp, Instagram/e-mail no inbox, cadastro self-service de novas clínicas.

## 5. Modelo de dados

Convenções: PK `id uuid`; todas as tabelas de negócio têm `clinica_id`, `criado_em`, `atualizado_em`; dinheiro em `*_centavos integer`; datas/horas em `timestamptz` (armazenado em UTC, exibido no fuso da unidade).

### 5.1 Administração, cadastros e agenda

```
clinica            (id, nome, cnpj, fuso_horario, config jsonb)
                    -- config: política de desmarcação e faltas, compartilhamento do prontuário,
                    --         antecedência e textos das mensagens, pesquisa de satisfação ligada
unidade            (id, clinica_id, nome, endereco jsonb, telefone, horario_funcionamento jsonb, ativo)
sala               (id, unidade_id, nome, ativo)
feriado            (id, clinica_id, unidade_id?, data, descricao)

usuario            (id, clinica_id, nome, email, senha_hash, totp_secret?, ativo, ultimo_login_em)
papel              (id, clinica_id, nome, permissoes text[])
usuario_papel      (usuario_id, papel_id)
usuario_permissao  (usuario_id, permissao, concedida bool, limite jsonb?)  -- exceções ao perfil
                    -- ex.: ('financeiro.desconto', true, {"max_percentual": 15})
usuario_unidade    (usuario_id, unidade_id)
sessao             (id, usuario_id, token_hash, ip, user_agent, ultimo_uso_em,
                    expira_em, revogada_em)

profissional       (id, usuario_id, conselho, numero_conselho, uf_conselho, rqe?, cor, ativo)
especialidade      (id, clinica_id, nome)
profissional_especialidade (profissional_id, especialidade_id)
procedimento       (id, clinica_id, nome, tipo [consulta|retorno|exame|procedimento],
                    duracao_min, preco_centavos, exige_sala, preparo?,
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
modelo_prontuario  (id, clinica_id?, especialidade_id?, nome, versao, schema jsonb, ativo, criado_por,
                    copiado_de?)   -- clinica_id nulo = modelo padrão do sistema

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
forma_pagamento    (id, clinica_id, tipo [dinheiro|pix|debito|credito|boleto|transferencia|outra],
                    nome, ativa, parcelas_max, taxas jsonb)
caixa              (id, clinica_id, unidade_id, nome, ativo)          -- um ou vários por clínica
caixa_sessao       (id, caixa_id, aberto_por, aberto_em, saldo_inicial_centavos,
                    fechado_por?, fechado_em?, conferencia jsonb?, diferenca_centavos?)
pagamento          (id, conta_receber_id, caixa_sessao_id?, forma_pagamento_id, valor_centavos, parcelas?,
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
whatsapp_conexao   (id, clinica_id, provedor [wame|cloud_api|nao_oficial], numero, status,
                    config jsonb, termo_risco_aceito_por?, termo_risco_aceito_em?, conectado_em?)
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
pesquisa_satisfacao(id, clinica_id, agendamento_id, paciente_id, profissional_id, nota?, comentario?,
                    enviada_em, respondida_em?)

-- importação
importacao         (id, clinica_id, tipo [pacientes|profissionais|procedimentos|agenda|anexos],
                    arquivo_id, status [validando|pronta|importada|desfeita|erro], totais jsonb,
                    erros jsonb, importado_por, importado_em?, desfeita_em?)
importacao_item    (importacao_id, entidade, entidade_id, acao [criado|atualizado])

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
CRUD   /especialidades | /unidades | /salas
GET    /configuracoes               PATCH /configuracoes      (políticas, mensagens, prontuário)
GET    /autorizacoes                PUT /autorizacoes/perfis/:id | /autorizacoes/usuarios/:id

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
POST   /assinatura/a3/preparar | /assinatura/a3/concluir   (o assinador local assina o hash)

# financeiro
GET    /contas-receber?status=&paciente=     POST /contas-receber
POST   /contas-receber/:id/pagamentos        POST /pagamentos/:id/estornar
GET    /contas-receber/:id/recibo.pdf
CRUD   /formas-pagamento            CRUD /caixas
POST   /caixas/:id/abrir    GET /caixas/sessoes/atuais    POST /caixas/sessoes/:id/fechar

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
CRUD   /whatsapp/conexoes                    POST /whatsapp/conexoes/:id/qrcode   (não oficial)
GET    /lembretes/pendentes                  (envio manual na forma wa.me)

GET    /pesquisas?inicio=&fim=&profissional=
POST   /importacoes                          (envia a planilha; valida e devolve a prévia)
POST   /importacoes/:id/confirmar | /desfazer
GET    /importacoes/modelos/:tipo.xlsx

GET    /relatorios/:tipo?inicio=&fim=&unidade=&formato=xlsx|pdf
GET    /auditoria?entidade=&usuario=
```

**WebSocket** (Socket.IO, autenticado, salas por unidade/conversa/usuário): `agenda.atualizada`, `recepcao.painel`, `chamada.paciente`, `chat.mensagem`, `chat.digitando`, `chat.presenca`, `inbox.mensagem`, `inbox.atendimento.atualizado`, `notificacao`.

## 7. Jobs (pg-boss)

| Job | Quando | O que faz |
|---|---|---|
| `whatsapp.webhook` | fila | processa cada evento recebido da Meta fora da requisição (responde 200 imediatamente) |
| `whatsapp.midia` | fila | baixa a mídia recebida e guarda no armazenamento próprio |
| `whatsapp.enviar` | fila | envio com retry exponencial (3x) e depois fallback para SMS |
| `whatsapp.confirmacao` | a cada 15 min | pedido de confirmação para os agendamentos que entraram na antecedência configurada pela clínica |
| `whatsapp.sessao` | a cada 1 min | API não oficial: verifica a conexão, reconecta e avisa a clínica se cair |
| `pesquisa.enviar` | a cada 15 min | pesquisa de satisfação para os atendimentos finalizados, conforme a antecedência configurada |
| `importacao.processar` | fila | valida a planilha, monta a prévia e, após a confirmação, grava em lote |
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
12. Configurações — clínica, unidades, salas, especialidades, feriados, **horários** (clínica e cada profissional), profissionais, procedimentos e exames, preços, **política de desmarcação e faltas**, **formas de pagamento**, **caixas**, usuários e perfis, **autorizações**, modelos de prontuário e de documentos, mensagens automáticas e respostas rápidas, **conexão do WhatsApp**, pesquisa de satisfação, Memed, assinatura
13. Auditoria
14. **Importação de dados** — modelos de planilha, envio, prévia com erros, confirmação, histórico com opção de desfazer

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
- Hospedagem no Brasil (Oracle Cloud São Paulo, ver `arquitetura.md`)

**Desempenho**
- Agenda do dia com 20 profissionais carregando em < 1 s
- Busca de paciente < 300 ms com 100 mil cadastros
- Abertura da tela de atendimento (resumo + últimos 10 registros) < 1,5 s
- Mensagem de WhatsApp aparecendo no inbox < 3 s após chegar na Meta

**Usabilidade**
- **Todas as telas com layout para celular** (D9), além do uso em vários computadores ao mesmo tempo
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
| Internet | necessária (D7). Contingência: agenda do dia em cache somente leitura e agenda impressa; 4G de reserva opcional |
| Assinador A3 | único programa instalado, e só nos PCs dos médicos que usam token A3 (§3.8) |

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
| PDF e assinatura | pdfmake no servidor; assinatura PAdES com `@signpdf`, por certificado em nuvem ou pelo assinador local A3 (PKCS#11) |
| Integrações | WhatsApp: `wa.me`, Cloud API e API não oficial (opcional), cada uma num módulo; Memed (em estudo), provedores de certificado em nuvem, BrasilAPI, Brevo |
| Importação | leitura de Excel/CSV no servidor (ex.: SheetJS ou exceljs) |
| Infra | Docker Compose (Caddy + api + PostgreSQL + backup) numa VM Oracle Cloud Always Free em São Paulo, Cloudflare na frente, backup restic no Backblaze B2, UptimeRobot e Sentry gratuitos |

> Next.js fica de fora: todo o sistema está atrás de login, então a renderização no servidor não traz ganho, e o build estático do Vite é mais simples de hospedar.

### 10.3 Estrutura do repositório

```
sis_Clinicas/
├─ apps/
│  ├─ web/             # React + Vite (JSX), PWA
│  ├─ assinador/       # assinador local para token A3 (Windows)
│  └─ api/             # Fastify
│     └─ src/modulos/  # auth, autorizacoes, clinica, pacientes, profissionais, agenda,
│                      # recepcao, prontuario, assinatura, financeiro, chat, inbox,
│                      # mensageria (wame | cloud-api | nao-oficial), pesquisas,
│                      # importacao, relatorios, auditoria
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
| S1 | Monorepo, CI, Docker; VM na Oracle com deploy automático (validar cedo); auth + 2FA; usuários, perfis e **aba Autorizações**; clínica, unidades, salas, especialidades; auditoria base |
| S2 | Pacientes (CRUD, busca, duplicidade, consentimentos); profissionais, procedimentos e exames com duração livre, **aba Horários** (clínica e profissional), bloqueios |
| S3 | Agenda: visões dia/semana/lista, agendar/remarcar/cancelar, constraint de sobreposição, tempo real, horários livres, **política de desmarcação e faltas** |
| S4 | Máquina de estados, recepção/check-in, painel de chamada, lista de espera (conforme o estudo) |
| S5 | Financeiro: formas de pagamento configuráveis, **vários caixas**, contas a receber, pagamentos, descontos por autorização, estorno, recibo PDF |
| S6 | Chat interno; mensageria com módulos trocáveis: `wa.me` (lembretes manuais) e base da Cloud API (webhook, mídia, templates); mensagens configuráveis |
| S7 | Inbox: filas, atribuição, notas, respostas rápidas, janela de 24 h, painel do paciente, métricas |
| S8 | Prontuário I: resumo de saúde, **modelos padrão do sistema + modelos da clínica**, registros, sinais vitais, CID-10, anexos, linha do tempo, compartilhado/só do autor, sigilosos, auditoria de leitura |
| S9 | Prontuário II: assinatura com certificado em nuvem, PDF/A, adendos, imutabilidade, documentos clínicos; Memed se aprovada |
| S10 | **Assinador local A3** (instalador, PKCS#11, atualização) e testes com tokens reais; API não oficial do WhatsApp (opcional, com termo de risco) |
| S11 | **Importação de dados externos**; pesquisa de satisfação; relatórios (lista final escolhida) |
| S12 | Layout para celular revisado tela a tela; PWA: instalação, notificações, agenda do dia em cache, páginas de impressão |
| S13 | Hardening, pentest, E2E, teste de restauração do backup, termo LGPD com a clínica |
| S14 | Homologação com a equipe da clínica, treinamento, implantação assistida |

≈ **28 semanas** com 2 devs (eram 24 na v0.2; o aumento vem do A3, da importação, da API não oficial, da pesquisa de satisfação e das configurações por clínica). Com **3 devs** (um dedicado ao prontuário/assinatura a partir da S3) dá para chegar a ~19–21 semanas.

**Riscos que afetam o prazo**
- Verificação da empresa e aprovação dos templates na Meta (começar na S1)
- Contratos e credenciais dos provedores de certificado em nuvem e, se aprovada, da Memed (começar na S1)
- **Assinador A3**: drivers diferentes por fabricante de token; testar com os tokens que os médicos realmente usam
- **API não oficial do WhatsApp**: bibliotecas mudam quando o WhatsApp muda; risco de bloqueio do número da clínica
- Modelos de prontuário: ainda não há um modelo de referência; o padrão do sistema precisa ser definido com médicos (começar na S2)
- Itens em estudo (encaixe e lista de espera, desconto, Memed, NFS-e, relatórios) podem mudar o escopo das S4, S5, S9 e S11
- Mudanças de escopo durante a homologação

## 12. Pontos em aberto

**Em estudo (decisão do levantamento de 09–10/11/2026)**
1. Encaixes e lista de espera: como devem funcionar
2. Memed para prescrição
3. Quem pode dar desconto e os limites padrão de cada perfil
4. NFS-e (há interesse; hoje fora do MVP)
5. Relatórios: escolher da lista proposta em `primeiros-passos.md`
6. Importação: formato final das planilhas

**A definir**
7. Aprovar D6 (web em JavaScript, sem Next.js) e D7 (online obrigatório na Oracle Cloud, com contingência)
8. Compartilhamento do prontuário: a escolha é só da clínica ou cada profissional também escolhe para os próprios registros?
9. Registro sigiloso: confirmar que os outros profissionais veem só que o registro existe, sem o conteúdo
10. WhatsApp: é possível usar número comum (não Business)? Como migrar o número para a API oficial mantendo o app no celular?
11. API não oficial: parecer jurídico (termos do WhatsApp e LGPD) e texto do termo de ciência de risco
12. Assinador A3: desenvolver o próprio ou licenciar um componente pronto (ex.: Web PKI)?
13. Exames feitos por não médicos (ex.: técnico de coleta): entram na agenda como profissionais ou por sala?
14. Certificação SBIS: avaliar depois do MVP; alinhar com o jurídico como a clínica guarda os registros até lá
