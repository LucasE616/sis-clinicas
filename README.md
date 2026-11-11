# sis-clinicas

Sistema para clínicas médicas: agenda, recepção, consulta (prontuário), pagamentos, WhatsApp e recados da equipe.

> **Primeiro esboço.** Só front-end, em HTML, CSS e JavaScript puro, sem servidor. Os dados ficam salvos **apenas no navegador** (localStorage). Use com dados de teste, não com dados reais de pacientes.

## Como abrir

Abra o `index.html` no navegador, ou sirva a pasta com qualquer servidor estático:

```bash
python -m http.server 5510
```

e acesse `http://localhost:5510`.

No primeiro acesso, o sistema pede o nome da clínica e o seu nome; você entra como **Gestão**. Depois, siga os **Primeiros passos** da tela inicial:

1. **Configurações → Clínica**: especialidades e salas.
2. **Configurações → Equipe**: médicos (especialidade, sala, CRM, tipo de certificado) e recepção.
3. **Configurações → Horários**: horário de cada médico por dia da semana, almoço e bloqueios.
4. **Configurações → Serviços e exames**: duração livre, valor e preparo.
5. Use **Trocar de usuário** para entrar como cada pessoa.

> Versão 2 do esboço (10/11/2026), de acordo com `docs/mvp.md` v0.3. Os dados da versão 1 não são aproveitados.

## O que já funciona

| Área | Recursos |
|---|---|
| Agenda | marcar em 3 passos, horários livres pelo horário de cada médico, almoço e bloqueios, encaixe (com autorização), mudar horário, desmarcar, confirmar |
| Recepção | chegada do paciente, sala de espera, faltas |
| Consulta | fila do médico, chamar paciente (aparece na TV), **modelos de prontuário** (padrão do sistema + da clínica), sinais vitais, CID-10 (amostra), **registro sigiloso**, documentos, finalizar com **certificado em nuvem ou token A3** (simulado) |
| Pagamentos | **vários caixas**, formas de pagamento escolhidas pela clínica, troco, parcelamento, desconto com limite por pessoa, pagamento parcial, devolução |
| WhatsApp | confirmação, lembretes e pesquisa de satisfação com **texto e antecedência configuráveis**; envio pelo link `wa.me`; escolha entre wa.me, API oficial e API não oficial (esta com termo de risco) |
| Equipe | recados por canal e mensagens diretas |
| Gestão | relatórios por período (atendimentos, faturamento, especialidades, procedimentos, faltas, satisfação/NPS, CSV), histórico de ações |
| Configurações | clínica, horários, equipe, **autorizações** (por perfil e exceções por pessoa), serviços e exames, pagamentos e caixas, **política de desmarcação e faltas**, prontuário (compartilhado ou só do autor), WhatsApp, **importação de pacientes (CSV)** com prévia e desfazer |
| TV | painel de chamada em tela cheia |

Perfis: **Recepção**, **Médico(a)** e **Gestão**, com permissões editáveis. Só médicos veem o prontuário (regra fixa).

**Simulado neste esboço:** assinatura digital, conexão com a API oficial e com a não oficial do WhatsApp (todas as mensagens saem pelo `wa.me`) e respostas da pesquisa de satisfação (registradas à mão).

## Próximas etapas

- API em Node.js + Fastify com PostgreSQL, substituindo o armazenamento no navegador
- Login com senha e verificação em duas etapas
- Assinatura digital ICP-Brasil real: certificado em nuvem e assinador local para token A3
- WhatsApp Cloud API e API não oficial (caixa de entrada integrada)
- Itens em estudo: encaixe e lista de espera, Memed, NFS-e, lista final de relatórios

Detalhes em [docs/mvp.md](docs/mvp.md) e [docs/arquitetura.md](docs/arquitetura.md).

## Estrutura

```
index.html        página única
css/estilo.css    tema claro e escuro
js/app.js         telas, regras e armazenamento local
docs/             MVP e arquitetura
```

## Licença

[MIT](LICENSE)
