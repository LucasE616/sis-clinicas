# sis-clinicas

Sistema para clínicas médicas: agenda, recepção, consulta (prontuário), pagamentos, WhatsApp e recados da equipe.

> **Primeiro esboço.** Só front-end, em HTML, CSS e JavaScript puro, sem servidor. Os dados ficam salvos **apenas no navegador** (localStorage). Use com dados de teste, não com dados reais de pacientes.

## Como abrir

Abra o `index.html` no navegador, ou sirva a pasta com qualquer servidor estático:

```bash
python -m http.server 5510
```

e acesse `http://localhost:5510`.

No primeiro acesso, o sistema pede o nome da clínica e o seu nome; você entra como **Gestão**. Depois:

1. Em **Configurações → Equipe**, cadastre os médicos e a recepção.
2. Em **Configurações → Serviços e valores**, cadastre os serviços (ex.: Consulta, Retorno).
3. Use **Trocar de usuário** para entrar como cada pessoa.

## O que já funciona

| Área | Recursos |
|---|---|
| Agenda | marcar em 3 passos, horários livres por médico, encaixe, mudar horário, desmarcar, confirmar |
| Recepção | chegada do paciente, sala de espera, faltas |
| Consulta | fila do médico, chamar paciente (aparece na TV), registro, sinais vitais, CID-10 (amostra), documentos, finalizar e travar o registro, observações depois de finalizada |
| Pagamentos | abrir e fechar caixa, receber (PIX, dinheiro com troco, débito, crédito parcelado), desconto, pagamento parcial, devolução pela gestão |
| WhatsApp | confirmação, lembrete de amanhã, recibo e documentos abrem o WhatsApp com o texto pronto (link `wa.me`) |
| Equipe | recados por canal e mensagens diretas |
| Gestão | relatórios do dia, histórico de ações, configurações da clínica, equipe e serviços |
| TV | painel de chamada em tela cheia |

Permissões por papel: **Recepção**, **Médico(a)** e **Gestão**. Só médicos veem o prontuário.

## Próximas etapas

- API em Node.js + Fastify com PostgreSQL, substituindo o armazenamento no navegador
- Login com senha e verificação em duas etapas
- Assinatura digital ICP-Brasil (certificado em nuvem)
- WhatsApp Cloud API (caixa de entrada integrada)

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
