# Plano de ação — sis_Clinicas (PWA)

> Versão 0.1 — 16/11/2026. Do esboço até a implantação na clínica piloto.
> Base: `mvp.md` v0.3 (escopo e sprints), `arquitetura.md` v0.3 (stack e infraestrutura), `pwa.md` (PWA), `primeiros-passos.md` (checklist).

## 1. Objetivo

Colocar o **sis_Clinicas como PWA** em uso na clínica piloto, com 2 devs, em sprints de 2 semanas. O sistema deve substituir agenda, prontuário em papel, caixa manual e WhatsApp avulso.

| Marco | O que a clínica consegue fazer | Data indicativa |
|---|---|---|
| **M0** Esboço instalável | instalar o esboço no PC e no celular e testar com a equipe | 27/11/2026 |
| **M1** Base no ar | entrar com senha e 2 etapas, cadastrar equipe e configurações no ambiente de homologação | 04/12/2026 |
| **M2** Agenda real | marcar, mudar e desmarcar consultas com dados no servidor, em vários PCs ao mesmo tempo | 15/01/2027 |
| **M3** Recepção e caixa | chegada, sala de espera, painel da TV e caixa completos | 12/02/2027 |
| **M4** Comunicação | lembretes, recados e caixa de entrada do WhatsApp (API oficial) | 12/03/2027 |
| **M5** Prontuário assinado | consulta completa assinada com certificado em nuvem e token A3 | 23/04/2027 |
| **M6** Pronto para piloto | importação, relatórios, celular revisado, segurança e backup testados | 04/06/2027 |
| **M7** Clínica piloto usando | implantação assistida e acompanhamento | 18/06/2027 |

As datas consideram início em 23/11/2026, pausa de fim de ano de 21/12/2026 a 01/01/2027 e o Carnaval (08 e 09/02/2027). São estimativas: mudam com as decisões em estudo e com o tamanho da equipe.

## 2. Papéis

| Papel | Quem | Responde por |
|---|---|---|
| **Produto** | você | decisões de escopo, contato com a clínica piloto, contas e contratos (Meta, certificados, Memed, jurídico), aceite de cada entrega |
| **Dev 1** | a definir | front (PWA, telas), agenda, recepção, financeiro |
| **Dev 2** | a definir | API, banco, infraestrutura, WhatsApp, prontuário e assinatura |
| **Clínica piloto** | a definir | sessões de validação, modelos de prontuário, testes em homologação |

## 3. Fase 0 — Preparação (16/11 a 20/11/2026)

### 3.1 Ações imediatas

| # | Ação | Responsável | Prazo |
|---|---|---|---|
| 1 | Escolher nome e registrar o domínio do produto (`.com.br`) | Produto | 20/11 |
| 2 | Criar o e-mail do produto e o cofre de senhas | Produto | 20/11 |
| 3 | Criar as contas gratuitas: Oracle Cloud (São Paulo), Cloudflare, Backblaze B2, Brevo, UptimeRobot, Sentry | Produto | 20/11 |
| 4 | Abrir a conta no Meta Business e **iniciar a verificação da empresa** (é o item que mais demora) | Produto | 20/11 |
| 5 | Contatar 1 ou 2 provedores de certificado em nuvem (BirdID, VIDaaS) pedindo acesso à API de testes | Produto | 20/11 |
| 6 | Pedir ao advogado: termo de tratamento de dados (LGPD), termos de uso e parecer sobre a API não oficial do WhatsApp | Produto | 27/11 |
| 7 | Definir a **clínica piloto** e agendar a primeira sessão com o esboço | Produto | 27/11 |
| 8 | Transformar o **esboço em PWA instalável** (manifest, ícones, service worker simples) | Dev | 27/11 |
| 9 | Proteger a branch `main` do GitHub (mudanças por pull request) e ligar os checks automáticos | Dev | 20/11 |
| 10 | Mover o esboço para `prototipo/` e preparar o monorepo (`apps/web`, `apps/api`, `packages/shared`, `db`, `infra`) | Dev | 27/11 |

### 3.2 Decisões que precisam sair antes de cada sprint

| Decisão em estudo | Impacta a sprint | Precisa até |
|---|---|---|
| Quem pode dar desconto e limites padrão | S5 (financeiro) | 29/01/2027 |
| Encaixes e lista de espera | S4 (recepção) | 15/01/2027 |
| Exames feitos por não médicos: agenda por profissional ou por sala | S2 (cadastros) | 04/12/2026 |
| Compartilhamento do prontuário: só a clínica escolhe ou também o médico | S8 (prontuário I) | 12/03/2027 |
| Memed | S9 (prontuário II) | 26/03/2027 |
| Assinador A3: próprio ou componente pronto | S10 | 26/03/2027 |
| Lista final de relatórios | S11 | 23/04/2027 |
| NFS-e (hoje fora do MVP) | depois do MVP | — |

## 4. Fase 1 — Construção (14 sprints)

Cada sprint termina com uma **demonstração** para a clínica piloto no ambiente de homologação.

| Sprint | Datas | Entrega | PWA nesta sprint |
|---|---|---|---|
| **S1** | 23/11 – 04/12 | Monorepo, CI, Docker; VM Oracle com deploy automático; login com senha e 2 etapas; usuários, perfis e aba Autorizações; clínica, salas, especialidades; auditoria base | manifest, ícones, service worker, botão "Instalar", aviso de nova versão |
| **S2** | 07/12 – 18/12 | Pacientes (cadastro, busca, duplicados, autorizações LGPD); profissionais; serviços e exames com duração livre; aba Horários; bloqueios | layout de celular nas telas novas |
| — | 21/12 – 01/01 | pausa de fim de ano | — |
| **S3** | 04/01 – 15/01 | Agenda: dia, semana e lista; marcar, mudar e desmarcar; sem horário duplicado (garantido pelo banco); tempo real; política de desmarcação e faltas | **agenda do dia sem internet** (somente leitura) |
| **S4** | 18/01 – 29/01 | Estados do atendimento, chegada, sala de espera, painel da TV, lista de espera (conforme o estudo) | TV em tela cheia e sempre acesa |
| **S5** | 01/02 – 12/02 | Financeiro: formas de pagamento, vários caixas, contas, pagamentos, desconto por autorização, devolução, recibo em PDF | impressão de recibo no app instalado |
| **S6** | 15/02 – 26/02 | Recados da equipe; WhatsApp `wa.me` e base da API oficial; mensagens configuráveis | **notificações** (paciente chegou, recados) |
| **S7** | 01/03 – 12/03 | Caixa de entrada do WhatsApp: filas, atribuição, notas, respostas rápidas, janela de 24 h | notificação de mensagem nova e contador no ícone |
| **S8** | 15/03 – 26/03 | Prontuário I: resumo de saúde, modelos (sistema + clínica), sinais vitais, CID-10 completo, anexos, compartilhado/só do autor, sigilosos, auditoria de leitura | — |
| **S9** | 29/03 – 09/04 | Prontuário II: assinatura com certificado em nuvem, PDF/A, observações depois de assinado, documentos clínicos; Memed se aprovada | — |
| **S10** | 12/04 – 23/04 | Assinador A3 (instalador, token, atualização) com os tokens reais dos médicos; API não oficial do WhatsApp (opcional, com termo) | — |
| **S11** | 26/04 – 07/05 | Importação de dados; pesquisa de satisfação; relatórios escolhidos | — |
| **S12** | 10/05 – 21/05 | Revisão do celular tela a tela; ajustes das demonstrações | testes na matriz de navegadores (`pwa.md` §10) |
| **S13** | 24/05 – 04/06 | Segurança (pentest), testes ponta a ponta, teste de restauração do backup, termo LGPD assinado com a clínica | — |
| **S14** | 07/06 – 18/06 | Homologação com a equipe, treinamento, implantação assistida | instalar o app em todos os PCs e celulares da equipe |

## 5. Fase 2 — Implantação na clínica piloto

| Etapa | O que fazer |
|---|---|
| Antes (S13) | importar pacientes e agenda futura; cadastrar equipe, horários, serviços, caixas e permissões; configurar o WhatsApp; testar a impressora |
| Treinamento (S14) | 1 sessão por perfil (recepção, médicos, gestão), usando o próprio sistema da clínica em homologação |
| Primeira semana | acompanhamento presencial ou por chamada no horário de abertura; canal direto para dúvidas |
| 30 dias | revisar faltas, tempo de agendamento e uso do WhatsApp contra a linha de base (`mvp.md` §1) |
| 90 dias | avaliar os critérios de sucesso do MVP e decidir os próximos passos (NFS-e, novas clínicas) |

## 6. Como trabalhar

- **Quadro de tarefas:** GitHub Projects (gratuito), uma coluna por estado: A fazer, Fazendo, Em revisão, Em homologação, Pronto.
- **Cada mudança:** pull request com testes passando no GitHub Actions; revisão do outro dev.
- **Homologação:** cada pull request aprovado vai para o ambiente de homologação; a demo da sprint é feita lá.
- **Versões:** uma tag por sprint (ex.: `v0.1.0` na S1); produção só recebe versões aprovadas pelo Produto.
- **Documentos:** decisões novas entram no `mvp.md` e, se mudarem a técnica, no `arquitetura.md` ou no `pwa.md`.

### Definição de pronto (vale para toda tarefa)

- [ ] Funciona no computador **e** no celular (360 px)
- [ ] Permissão conferida na API, não só na tela
- [ ] Testes das regras importantes (agenda, dinheiro, prontuário) passando
- [ ] Ação registrada na auditoria, quando mexe em dados
- [ ] Sem dados pessoais nos logs nem nas notificações
- [ ] Demonstrado em homologação e aceito pelo Produto

### Critérios para entrar em produção (go-live)

- [ ] Backup diário funcionando e **restauração testada**
- [ ] Pentest sem falhas graves abertas
- [ ] Termo de tratamento de dados assinado com a clínica
- [ ] Verificação em duas etapas ativa para todos os usuários
- [ ] App instalado e testado em todos os computadores da clínica
- [ ] Plano de contingência impresso (sem internet: agenda do dia; servidor fora: contato e prazo de retorno)

## 7. Dependências externas

| Dependência | Prazo típico | Começar | Sem ela |
|---|---|---|---|
| Verificação da empresa na Meta + templates aprovados | dias a semanas | Fase 0 | lembretes só por `wa.me` |
| API de testes dos provedores de certificado em nuvem | semanas | Fase 0 | assinatura atrasa (S9) |
| Tokens A3 reais dos médicos para teste | — | S8 | assinador A3 atrasa (S10) |
| Parecer jurídico (LGPD e API não oficial) | semanas | Fase 0 | API não oficial não é liberada |
| Cadastro de parceiro Memed (se aprovada) | semanas | assim que decidir | receita só pelo modelo do sistema |
| Conta Oracle com VM ARM disponível | dias | Fase 0 | plano B: VPS paga (`arquitetura.md` §4.3) |

## 8. Riscos do plano

| Risco | Efeito | Resposta |
|---|---|---|
| Só 1 dev disponível | prazo quase dobra | priorizar M1 a M3 e M5; deixar API não oficial, importação e satisfação para depois |
| Decisões em estudo atrasarem | sprint começa sem escopo fechado | a sprint pega o próximo item pronto da lista; a decisão entra na sprint seguinte |
| Meta demorar a verificar a empresa | sem lembretes automáticos | começar com `wa.me`, como já está no esboço |
| Mudanças grandes nas demonstrações | retrabalho | demonstrar cedo (esboço e homologação) e registrar no `mvp.md` antes de construir |
| iPhone limita recursos do PWA | notificações só com o app na Tela de Início | tela de instalação com passo a passo; recepção em PC |
