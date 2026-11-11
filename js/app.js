'use strict';
/* sis_Clinicas — esboço navegável (v2, de acordo com mvp.md v0.3).
   Só front-end (HTML, CSS e JS puro): os dados ficam salvos no navegador (localStorage).
   A API em Node.js + PostgreSQL substitui esse armazenamento na próxima etapa (ver docs/arquitetura.md). */

const KEY='sis-clinicas-v2';
const ROLES={recepcao:'Recepção',medico:'Médico(a)',gestor:'Gestão'};
const VIEWS={inicio:['Início','home'],consulta:['Consulta','file'],agenda:['Agenda','cal'],whatsapp:['WhatsApp','wpp'],pagamentos:['Pagamentos','card'],pacientes:['Pacientes','users'],recados:['Recados','chat'],relatorios:['Relatórios','bars'],historico:['Histórico','shield'],config:['Configurações','gear'],tv:['Tela da TV','tv']};
/* autorizações: o que cada perfil pode fazer (editável na aba Autorizações) */
const PERMS=[
  ['agenda.marcar','Marcar, mudar e desmarcar consultas'],
  ['agenda.encaixe','Fazer encaixe em horário ocupado'],
  ['recepcao.chegada','Registrar chegada e faltas'],
  ['pagamento.receber','Receber pagamentos'],
  ['pagamento.desconto','Dar desconto'],
  ['pagamento.devolver','Devolver pagamento'],
  ['caixa.operar','Abrir e fechar caixa'],
  ['whatsapp.usar','Usar o WhatsApp'],
  ['relatorios.ver','Ver relatórios'],
  ['historico.ver','Ver o histórico de ações'],
  ['config.gerenciar','Configurações e autorizações'],
  ['dados.importar','Importar dados']
];
const PERFIS_PADRAO={
  recepcao:{'agenda.marcar':true,'agenda.encaixe':true,'recepcao.chegada':true,'pagamento.receber':true,'pagamento.desconto':true,'caixa.operar':true,'whatsapp.usar':true,descMax:10},
  medico:{'agenda.marcar':true,descMax:0},
  gestor:Object.assign(Object.fromEntries(PERMS.map(p=>[p[0],true])),{descMax:100})
};
const STATUS={agendado:['Marcado','neutral'],confirmado:['Confirmado','info'],chegou:['Chegou','warn'],em_atendimento:['Em consulta','accent'],atendido:['Atendido','ok'],faltou:['Faltou','bad'],cancelado:['Desmarcado','neutral']};
const TIPOS_SERV={consulta:'Consulta',retorno:'Retorno',exame:'Exame',procedimento:'Procedimento'};
const TIPOS_FORMA={dinheiro:'Dinheiro',pix:'PIX',debito:'Cartão de débito',credito:'Cartão de crédito',boleto:'Boleto',transferencia:'Transferência',outra:'Outra'};
const CERTS={nuvem:'Certificado em nuvem',a3:'Token A3',nenhum:'Ainda não tem'};
const WA_FORMAS={wame:['Envio gratuito (wa.me)','O sistema abre o WhatsApp com o texto pronto; a pessoa toca em enviar. Sem caixa de entrada.'],oficial:['API oficial (Meta)','Envio automático, caixa de entrada e botões. Custo por mensagem de lembrete.'],naooficial:['API não oficial','Envio automático e caixa de entrada sem custo por mensagem. Pode levar ao bloqueio do número.']};
const SEMANA=['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
const MESES=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
/* Amostra da CID-10. A tabela completa do DATASUS entra junto com o banco de dados. */
const CID=[['J06.9','Infecção das vias aéreas superiores'],['J02.9','Faringite aguda'],['R50.9','Febre'],['I10','Hipertensão'],['R51','Dor de cabeça'],['E11.9','Diabetes tipo 2'],['M54.5','Dor lombar'],['L30.9','Dermatite'],['I49.9','Arritmia'],['Z00.0','Exame de rotina'],['H52.1','Miopia'],['D64.9','Anemia']];
const MOTIVOS=['O paciente pediu','O médico não poderá atender','Marcado por engano'];
/* modelos de prontuário do sistema (a clínica pode copiar e ajustar) */
const MODELOS_SIS=[
  {id:'sis-geral',nome:'Consulta geral',espId:null,sistema:true,secoes:['Queixa principal','História da doença atual','Exame físico','Conduta e orientações']},
  {id:'sis-retorno',nome:'Retorno',espId:null,sistema:true,secoes:['Evolução desde a última consulta','Resultados de exames','Conduta']},
  {id:'sis-exame',nome:'Exame / procedimento',espId:null,sistema:true,secoes:['Exame realizado','Achados','Observações']}
];
const DOCS={
  atestado:['Atestado',p=>`Atesto, para os devidos fins, que ${p.nome} esteve sob meus cuidados nesta data e necessita de ___ dia(s) de afastamento de suas atividades, a partir de ${dmy(hoje())}.`],
  exames:['Pedido de exames',p=>`Solicito para ${p.nome}:\n\n• `],
  receita:['Receita',()=>`Uso oral\n\n1. `],
  declaracao:['Declaração de comparecimento',p=>`Declaro que ${p.nome} compareceu a esta clínica em ${dmy(hoje())} para atendimento médico.`]
};
const VARS_MSG='{paciente} {medico} {procedimento} {data} {hora} {preparo} {endereco} {clinica}';
const ICONS={
  home:'<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  cal:'<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
  users:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  wpp:'<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
  chat:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  card:'<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>',
  bars:'<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>',
  shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  tv:'<rect x="2" y="7" width="20" height="15" rx="2"/><polyline points="17 2 12 7 7 2"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  search:'<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  plus:'<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  left:'<polyline points="15 18 9 12 15 6"/>',
  x:'<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  lock:'<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  send:'<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
  alert:'<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  pen:'<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  check:'<polyline points="20 6 9 17 4 12"/>',
  login:'<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>',
  speaker:'<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>',
  userplus:'<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>',
  clock:'<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  star:'<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  upload:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  max:'<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>'
};
const ic=(n,s=20)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;
const logo=(s=30)=>`<svg width="${s}" height="${s}" viewBox="0 0 30 30" aria-hidden="true"><rect width="30" height="30" rx="8" fill="#2BA597"/><path d="M15 8v14M8 15h14" stroke="#FFFFFF" stroke-width="3.2" stroke-linecap="round"/></svg>`;

/* ---------- utilitários ---------- */
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const fmt=t=>{t=Math.max(0,t);return pad(Math.floor(t/60))+':'+pad(t%60);};
const brl=c=>{const neg=c<0;c=Math.abs(Math.round(c));const p=(c/100).toFixed(2).split('.');return (neg?'− ':'')+'R$ '+p[0].replace(/\B(?=(\d{3})+(?!\d))/g,'.')+','+p[1];};
const parseBRL=t=>{const n=parseFloat(String(t||'').replace(/R\$|\s/g,'').replace(/\./g,'').replace(',','.'));return isFinite(n)?Math.round(n*100):0;};
const c2t=c=>(c/100).toFixed(2).replace('.',',');
const uid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const abrev=n=>{const p=n.split(' ');return p[0]+(p.length>1?' '+p[p.length-1][0]+'.':'');};
const iniciais=n=>String(n||'?').replace(/^Dra?\.\s/,'').split(' ').filter(Boolean).map(x=>x[0]).slice(0,2).join('').toUpperCase();
const curto=n=>{const p=String(n||'').split(' ');return /^Dra?\.$/.test(p[0])&&p[1]?p[0]+' '+p[1]:p[0];};
const plural=(n,s,p)=>n+' '+(n===1?s:p);
const pill=s=>`<span class="pill ${STATUS[s][1]}">${STATUS[s][0]}</span>`;
const durTxt=m=>m%60===0?(m===60?'1 hora':m/60+' horas'):m>60?Math.floor(m/60)+' h '+(m%60)+' min':m+' min';
function cpfValido(c){c=String(c).replace(/\D/g,'');if(c.length!==11||/^(\d)\1+$/.test(c))return false;for(let j=9;j<11;j++){let s=0;for(let i=0;i<j;i++)s+=+c[i]*(j+1-i);let d=(s*10)%11;if(d===10)d=0;if(d!==+c[j])return false;}return true;}
const dataValida=s=>{const m=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s||'');if(!m)return false;const d=new Date(+m[3],+m[2]-1,+m[1]);return d.getDate()===+m[1]&&d.getMonth()===+m[2]-1&&+m[3]>1900;};

/* datas: o dia é guardado como 'aaaa-mm-dd' e a hora em minutos desde 00:00 */
const isoDe=dt=>dt.getFullYear()+'-'+pad(dt.getMonth()+1)+'-'+pad(dt.getDate());
const dataDe=d=>{const [y,m,dd]=d.split('-').map(Number);return new Date(y,m-1,dd);};
const hoje=()=>isoDe(new Date());
const somaDias=(d,n)=>{const x=dataDe(d);x.setDate(x.getDate()+n);return isoDe(x);};
const difDias=(a,b)=>Math.round((dataDe(b)-dataDe(a))/864e5);
const now=()=>{const x=new Date();return x.getHours()*60+x.getMinutes();};
const dm=d=>d.slice(8,10)+'/'+d.slice(5,7);
const dmy=d=>d.slice(8,10)+'/'+d.slice(5,7)+'/'+d.slice(0,4);
const rotDia=d=>d===hoje()?'Hoje':d===somaDias(hoje(),1)?'Amanhã':SEMANA[dataDe(d).getDay()].slice(0,3)+', '+dm(d);
const rotLongo=d=>{const x=dataDe(d);return SEMANA[x.getDay()]+', '+x.getDate()+' de '+MESES[x.getMonth()];};
const diasAgenda=()=>Array.from({length:14},(_,i)=>somaDias(hoje(),i));
const quando=(d,t)=>{const r=rotDia(d);return r+(r==='Hoje'||r==='Amanhã'?' às ':', ')+fmt(t);};
const carimbo=()=>dm(hoje())+' às '+fmt(now());
const hhmm=v=>{const m=/^(\d{1,2}):(\d{2})$/.exec(v||'');return m?(+m[1])*60+(+m[2]):null;};
function idade(p){if(!dataValida(p.nasc))return null;const m=p.nasc.split('/').map(Number);const t=new Date();let i=t.getFullYear()-m[2];if(t.getMonth()+1<m[1]||(t.getMonth()+1===m[1]&&t.getDate()<m[0]))i--;return i>=0&&i<130?i:null;}
const idTxt=p=>{const i=idade(p);return i!=null?i+' anos · ':'';};
const minAte=a=>difDias(hoje(),a.dia)*1440+a.t-now();

/* ---------- estado ---------- */
function uiBase(){return {view:'inicio',dia:null,agProf:'todos',sheet:null,toast:null,conv:null,convAberta:false,rasc:{},recSel:'recepcao',recRasc:'',pacBusca:'',pacSel:null,editPac:false,cidBusca:'',adendo:'',histBusca:'',consulta:null,fim:null,
  cfgTab:'clinica',novoU:null,novoS:null,novoEsp:'',novaSala:'',novoCaixa:'',novaForma:'',horProf:null,novoBloq:null,modeloEd:null,authUser:null,imp:null,relPer:'hoje',
  setup:{clinica:'',nome:''},apagarArmado:false,erro:''};}
const novoUForm=()=>({id:null,nome:'',role:'recepcao',espId:'',salaId:'',crm:'',cert:'nuvem'});
const novoSForm=()=>({id:null,nome:'',tipo:'consulta',dur:'30',preco:'',preparo:''});
function clinicaBase(nome){return {nome,endereco:'',fone:'',abre:480,fecha:1080,intervalo:30,
  politica:{prazoHoras:24,faltasN:2,faltasDias:90,acaoFaltas:'alerta',cobrarFalta:false,cobrarTardia:false,taxa:''},
  prontuario:{modo:'compartilhado'},
  msgs:{confirmacao:'Olá, {paciente}! Sua consulta de {procedimento} com {medico} está marcada para {data}, às {hora}. {preparo} {endereco} {clinica}',
    lembrete:'Olá, {paciente}! Lembrete: {procedimento} com {medico} em {data}, às {hora}. {preparo} Pode confirmar respondendo esta mensagem? {clinica}',
    lembreteDias:1,pesquisa:true,pesquisaTexto:'Olá, {paciente}! Como foi seu atendimento com {medico}? De 0 a 10, quanto você recomendaria a {clinica}? Se quiser, deixe um comentário.'},
  whatsapp:{forma:'wame',termo:null}};}
function novo(){return {v:2,clinica:null,users:[],user:null,perfis:JSON.parse(JSON.stringify(PERFIS_PADRAO)),especialidades:[],salas:[],servicos:[],
  formas:[['dinheiro','Dinheiro',true],['pix','PIX',true],['debito','Cartão de débito',true],['credito','Cartão de crédito',true],['boleto','Boleto',false],['transferencia','Transferência',false]].map(([t,n,a])=>({id:uid('f'),tipo:t,nome:n,ativa:a,parcMax:t==='credito'?3:1})),
  caixas:[{id:uid('cx'),nome:'Caixa principal'}],sessoes:[],bloqs:[],modelos:[],pacs:[],appts:[],contas:[],pays:[],regs:[],convs:[],pesquisas:[],importacoes:[],
  chat:{canais:{recepcao:{nome:'Recepção',nl:0,msgs:[]},financeiro:{nome:'Financeiro',nl:0,msgs:[]},avisos:{nome:'Avisos do sistema',sistema:true,nl:0,msgs:[]}},dms:{}},
  chamadas:[],audit:[],ui:uiBase()};}
let S;
function load(){try{const raw=localStorage.getItem(KEY);if(raw){const o=JSON.parse(raw);if(o&&o.v===2){o.ui=Object.assign(uiBase(),o.ui||{},{sheet:null,toast:null,apagarArmado:false,erro:'',imp:null});return o;}}}catch(e){}return novo();}
function save(){try{const ui=Object.assign({},S.ui,{sheet:null,toast:null,apagarArmado:false,imp:null});localStorage.setItem(KEY,JSON.stringify(Object.assign({},S,{ui})));}catch(e){}}

const getUser=id=>S.users.find(u=>u.id===id);
const me=()=>getUser(S.user);
const role=()=>me().role;
const front=()=>role()!=='medico';
const profs=()=>S.users.filter(u=>u.role==='medico');
const espNome=id=>(S.especialidades.find(e=>e.id===id)||{}).nome||'';
const salaNome=id=>(S.salas.find(e=>e.id===id)||{}).nome||'';
const papel=u=>u.role==='medico'?(espNome(u.espId)||'Médico(a)'):ROLES[u.role];
const getPac=id=>S.pacs.find(p=>p.id===id);
const getAppt=id=>S.appts.find(a=>a.id===id);
const getServ=id=>S.servicos.find(s=>s.id===id);
const getForma=id=>S.formas.find(f=>f.id===id);
const formaNome=id=>(getForma(id)||{}).nome||'—';
const pacNome=id=>{const p=getPac(id);return p?p.nome:'—';};
const profNome=id=>{const p=getUser(id);return p?p.nome:'—';};
const salaDe=id=>{const p=getUser(id);return (p&&salaNome(p.salaId))||'Consultório';};
const caixaNome=id=>(S.caixas.find(c=>c.id===id)||{}).nome||'Caixa';
function can(p){const u=me();if(!u)return false;if(u.perms&&typeof u.perms[p]==='boolean')return u.perms[p];return !!(S.perfis[u.role]||{})[p];}
const descMax=()=>{const u=me();return u.descMax!=null&&u.descMax!==''?+u.descMax:+((S.perfis[u.role]||{}).descMax||0);};
function views(){const v=['inicio'];if(role()==='medico')v.push('consulta');v.push('agenda');if(can('whatsapp.usar'))v.push('whatsapp');if(can('pagamento.receber')||can('caixa.operar'))v.push('pagamentos');v.push('pacientes','recados');if(can('relatorios.ver'))v.push('relatorios');if(can('historico.ver'))v.push('historico');if(can('config.gerenciar')||can('dados.importar'))v.push('config');if(can('recepcao.chegada'))v.push('tv');return v;}
function log(a){S.audit.unshift({d:hoje(),t:now(),u:me()?me().nome:'Sistema',a});if(S.audit.length>2000)S.audit.length=2000;}
function aviso(texto){const c=S.chat.canais.avisos;c.msgs.push({autor:'sis_Clinicas',hora:carimbo(),texto});if(!(S.ui.view==='recados'&&S.ui.recSel==='avisos'))c.nl=(c.nl||0)+1;}
function evento(a,t,q){a.evs.push({t,q:carimbo()+(q?' · '+q:'')});}
let toastTimer=null;
function toast(msg,kind){S.ui.toast={msg,kind:kind||'ok'};clearTimeout(toastTimer);toastTimer=setTimeout(()=>{S.ui.toast=null;render();},7000);}

/* financeiro */
const pagoConta=c=>(c.pagoAntes||0)+S.pays.filter(p=>p.conta===c.id).reduce((s,p)=>s+p.valor,0);
const faltaConta=c=>c.bruto-c.desconto-pagoConta(c);
const contaDe=a=>S.contas.find(c=>c.appt===a.id);
const abertas=()=>S.contas.filter(c=>faltaConta(c)>0);
const devendo=pac=>S.contas.filter(c=>c.pac===pac&&faltaConta(c)>0).reduce((s,c)=>s+faltaConta(c),0);
function ensureConta(a){if(!a.preco)return null;let c=contaDe(a);if(!c){c={id:uid('k'),pac:a.pac,appt:a.id,desc:a.proc+' · '+profNome(a.prof),bruto:a.preco,desconto:0,pagoAntes:0};S.contas.push(c);}return c;}
function contaAvulsa(pac,desc,valor){if(valor<=0)return null;const c={id:uid('k'),pac,appt:null,desc,bruto:valor,desconto:0,pagoAntes:0};S.contas.push(c);return c;}
const sessoesAbertas=()=>S.sessoes.filter(s=>s.aberto);
const sessaoDe=cx=>S.sessoes.find(s=>s.caixa===cx&&s.aberto);
const formasAtivas=()=>S.formas.filter(f=>f.ativa);

/* horários: cada profissional tem o próprio horário por dia da semana, com almoço; bloqueios avulsos */
function horarioPadrao(){const c=S.clinica,h={};for(let i=0;i<7;i++)h[i]={on:i>=1&&i<=5,ini:c.abre,fim:c.fecha,almIni:720,almFim:780};return h;}
const hDia=(prof,d)=>{const u=getUser(prof);return u&&u.horario?u.horario[dataDe(d).getDay()]:null;};
function blocosDia(prof,d){const h=hDia(prof,d),r=[];if(h&&h.on&&h.almFim>h.almIni)r.push({ini:h.almIni,fim:h.almFim,motivo:'Almoço'});S.bloqs.filter(b=>b.prof===prof&&b.dia===d).forEach(b=>r.push({ini:b.ini,fim:b.fim,motivo:b.motivo||'Bloqueio'}));return r.sort((a,b)=>a.ini-b.ini);}
function conflitoAgenda(prof,d,t,dur,ignore){const a=S.appts.find(x=>x.id!==ignore&&x.prof===prof&&x.dia===d&&!['cancelado','faltou'].includes(x.status)&&!x.encaixe&&x.t<t+dur&&t<x.t+x.dur);return a?`Já tem ${pacNome(a.pac)} às ${fmt(a.t)}.`:null;}
function conflitoGrade(prof,d,t,dur){
  const h=hDia(prof,d);if(!h||!h.on)return `${curto(profNome(prof))} não atende neste dia.`;
  if(t<h.ini||t+dur>h.fim)return `Fora do horário de ${curto(profNome(prof))} (${fmt(h.ini)} às ${fmt(h.fim)}).`;
  const b=blocosDia(prof,d).find(x=>x.ini<t+dur&&t<x.fim);if(b)return `${b.motivo} (${fmt(b.ini)}–${fmt(b.fim)}).`;
  return null;
}
const conflito=(prof,d,t,dur,ignore)=>conflitoAgenda(prof,d,t,dur,ignore)||conflitoGrade(prof,d,t,dur);
function horarios(prof,d,dur){const h=hDia(prof,d);if(!h||!h.on)return [];const st=S.clinica.intervalo,r=[];for(let t=h.ini;t+dur<=h.fim;t+=st){if(d===hoje()&&t<=now())continue;if(conflitoGrade(prof,d,t,dur))continue;r.push({t,livre:!conflitoAgenda(prof,d,t,dur,null)});}return r;}
function proximoLivre(prof,dur){for(const d of diasAgenda()){const h=horarios(prof,d,dur).find(x=>x.livre);if(h)return {d,t:h.t};}return null;}
function faltasRecentes(pac){const pol=S.clinica.politica,lim=somaDias(hoje(),-(+pol.faltasDias||90));return S.appts.filter(a=>a.pac===pac&&(a.status==='faltou'||a.tardia)&&a.dia>=lim).length;}
function criarAppt(o){
  const a={id:uid('a'),dia:o.d,prof:o.prof,t:o.t,dur:o.dur,proc:o.proc,preco:o.preco||0,preparo:o.preparo||'',pac:o.pac,status:o.status||'agendado',origem:o.origem||'Telefone',encaixe:!!o.encaixe,lembrete:false,tardia:false,chegou:null,chamado:null,motivo:'',evs:[]};
  a.evs.push({t:(o.mudado?'Horário mudado por ':'Marcado por ')+me().nome,q:carimbo()});
  S.appts.push(a);return a;
}
function mudarHorario(a,d,t){
  const err=conflito(a.prof,d,t,a.dur,a.id);if(err)return {err};
  const conf=a.status==='confirmado';
  a.status='cancelado';a.motivo='Horário mudado';evento(a,'Horário mudado para '+quando(d,t).toLowerCase(),me().nome);
  const n=criarAppt({d,t,prof:a.prof,proc:a.proc,dur:a.dur,preco:a.preco,preparo:a.preparo,pac:a.pac,origem:a.origem,mudado:true,status:conf?'confirmado':'agendado'});
  log(`Mudou o horário de ${pacNome(a.pac)}: ${quando(a.dia,a.t)} → ${quando(d,t)}`);
  return {novo:n};
}
const ehTardia=(a,motivo)=>motivo==='O paciente pediu'&&minAte(a)<(+S.clinica.politica.prazoHoras||0)*60;
function desmarcar(a,motivo,avisar){
  const tardia=ehTardia(a,motivo);
  a.status='cancelado';a.motivo=motivo;a.tardia=tardia;evento(a,'Desmarcado ('+motivo.toLowerCase()+')'+(tardia?' · desmarcação tardia':''),me().nome);
  log(`Desmarcou ${pacNome(a.pac)} (${quando(a.dia,a.t)}): ${motivo}${tardia?' · tardia':''}`);
  const pol=S.clinica.politica;if(tardia&&pol.cobrarTardia)contaAvulsa(a.pac,'Taxa de desmarcação tardia · '+dm(a.dia),parseBRL(pol.taxa));
  if(avisar)return wpp(a.pac,`Olá, ${curto(pacNome(a.pac))}. Sua consulta de ${quando(a.dia,a.t).toLowerCase()} com ${profNome(a.prof)} foi desmarcada. Para marcar outro dia, é só responder esta mensagem.`);
  return null;
}

/* prontuário */
const todosModelos=()=>MODELOS_SIS.concat(S.modelos);
function modeloPara(a){const u=getUser(a.prof);const sv=S.servicos.find(s=>s.nome===a.proc);
  const daEsp=u&&u.espId?S.modelos.find(m=>m.espId===u.espId):null;if(daEsp)return daEsp;
  if(sv&&sv.tipo==='retorno')return MODELOS_SIS[1];if(sv&&(sv.tipo==='exame'||sv.tipo==='procedimento'))return MODELOS_SIS[2];return MODELOS_SIS[0];}
function regDe(a,criar){let r=S.regs.find(x=>x.appt===a.id);if(!r&&criar){const md=modeloPara(a);r={id:uid('r'),pac:a.pac,prof:a.prof,appt:a.id,data:dmy(a.dia),sigiloso:false,status:'rascunho',modelo:{id:md.id,nome:md.nome,secoes:md.secoes.slice()},campos:md.secoes.map(()=>''),cids:[],v:{pa:'',temp:'',peso:'',alt:''},docs:[],adendos:[],assinadoEm:'',metodo:''};S.regs.push(r);}return r;}
function minhaConsulta(){const p=me().id;let a=S.ui.consulta?getAppt(S.ui.consulta):null;if(a&&a.prof!==p)a=null;return a||S.appts.find(x=>x.dia===hoje()&&x.prof===p&&x.status==='em_atendimento')||null;}
const filaMedico=prof=>S.appts.filter(a=>a.dia===hoje()&&a.prof===prof&&a.status==='chegou').sort((a,b)=>a.chegou-b.chegou);

/* WhatsApp: neste esboço, todas as formas enviam pelo link wa.me (texto pronto) */
function abrirWa(fone,texto){let d=String(fone||'').replace(/\D/g,'');if(d.length===10||d.length===11)d='55'+d;try{window.open('https://wa.me/'+d+'?text='+encodeURIComponent(texto),'_blank','noopener');}catch(e){}}
function convDoPac(pacId){let c=S.convs.find(x=>x.pac===pacId);if(!c){const p=getPac(pacId);c={id:uid('cv'),pac:pacId,fone:p.cel,ts:Date.now(),msgs:[]};S.convs.push(c);}return c;}
function wpp(pacId,texto){const p=getPac(pacId);if(!p||!p.consWpp)return null;const c=convDoPac(pacId);c.fone=p.cel;c.msgs.push({tipo:'out',texto,hora:carimbo(),autor:me().nome});c.ts=Date.now();abrirWa(p.cel,texto);return c;}
function preencher(tpl,a){const p=getPac(a.pac)||{nome:''},c=S.clinica;
  const v={paciente:curto(p.nome),medico:profNome(a.prof),procedimento:a.proc,data:rotDia(a.dia).toLowerCase()+' ('+dm(a.dia)+')',hora:fmt(a.t),preparo:a.preparo?'Preparo: '+a.preparo+'.':'',endereco:c.endereco?'Endereço: '+c.endereco+'.':'',clinica:c.nome};
  return String(tpl||'').replace(/\{(\w+)\}/g,(m,k)=>k in v?v[k]:m).replace(/ {2,}/g,' ').replace(/ +([.,!?])/g,'$1').trim();}
const lembretesPend=()=>{const n=+S.clinica.msgs.lembreteDias||0,alvo=somaDias(hoje(),n);return S.appts.filter(a=>a.dia===alvo&&(n>0||a.t>now())&&['agendado','confirmado'].includes(a.status)&&!a.lembrete&&(getPac(a.pac)||{}).consWpp).sort((a,b)=>a.t-b.t);};
const rotLembrete=()=>{const n=+S.clinica.msgs.lembreteDias||0;return n===0?'de hoje':n===1?'de amanhã':`de daqui a ${n} dias`;};
function rapidas(){
  const c=S.clinica,serv=S.servicos.filter(s=>s.preco>0).slice(0,4);
  return [['Endereço',c.endereco?`Estamos na ${c.endereco}.`:''],
    ['Valores',serv.length?'Valores: '+serv.map(s=>s.nome+' '+brl(s.preco)).join('; ')+'. Aceitamos '+formasAtivas().map(f=>f.nome).join(', ')+'.':'Aceitamos '+formasAtivas().map(f=>f.nome).join(', ')+'.'],
    ['Horário',`Atendemos das ${fmt(c.abre)} às ${fmt(c.fecha)}.`],
    ['Documentos','Traga um documento com foto e, se tiver, seus exames anteriores.'],
    ['Obrigado','Por nada! Qualquer dúvida, é só chamar.']];
}
const pesquisasPend=()=>S.pesquisas.filter(q=>!q.enviada);
const pesquisasSemNota=()=>S.pesquisas.filter(q=>q.enviada&&q.nota==null);

/* ---------- renderização ---------- */
const app=document.getElementById('app');
function render(){
  const ae=document.activeElement;const fid=ae&&ae.id;let ss=null,se=null;
  try{ss=ae.selectionStart;se=ae.selectionEnd;}catch(e){}
  const keep={};document.querySelectorAll('[data-keep]').forEach(el=>{keep[el.dataset.keep]=el.scrollTop;});
  if(!S.clinica||!S.users.length)app.innerHTML=telaSetup()+toastHTML();
  else if(!me())app.innerHTML=telaLogin()+toastHTML();
  else{
    if(!views().includes(S.ui.view))S.ui.view='inicio';
    if(!S.ui.dia||S.ui.dia<hoje())S.ui.dia=hoje();
    app.innerHTML=shell()+sheet()+toastHTML();
  }
  document.querySelectorAll('[data-keep]').forEach(el=>{if(keep[el.dataset.keep]!=null)el.scrollTop=keep[el.dataset.keep];});
  if(S.ui._fundo){document.querySelectorAll('.msgs').forEach(el=>{el.scrollTop=el.scrollHeight;});S.ui._fundo=false;}
  if(fid){const el=document.getElementById(fid);if(el){el.focus({preventScroll:true});try{if(ss!=null)el.setSelectionRange(ss,se);}catch(e){}}}
  save();
}
function telaSetup(){
  const u=S.ui.setup;
  return `<main class="entrada"><section class="card entrada-card"><div class="marca">${logo()} sis_Clinicas</div><div><h1>Vamos começar</h1><p class="muted" style="margin-top:6px">Primeiro acesso. Preencha os dados abaixo para criar a clínica.</p></div>
    <label class="field">Nome da clínica<input id="s-cli" value="${esc(u.clinica)}" data-in="setup" data-f="clinica" data-enter="setupOk" placeholder="Ex.: Clínica Bem Estar" autocomplete="organization"></label>
    <label class="field">Seu nome<input id="s-nome" value="${esc(u.nome)}" data-in="setup" data-f="nome" data-enter="setupOk" placeholder="Nome e sobrenome" autocomplete="name"></label>
    <p class="muted small">Você entra como <b>Gestão</b>. Depois, em Configurações, cadastre especialidades, salas, médicos, horários e serviços.</p>
    ${S.ui.erro?`<p class="err">${esc(S.ui.erro)}</p>`:''}
    <button type="button" class="btn primary big full" data-act="setupOk">Começar</button>
    <p class="muted small">Esboço sem servidor: os dados ficam salvos só neste navegador.</p></section></main>`;
}
function telaLogin(){
  return `<main class="entrada"><section class="card entrada-card"><div class="marca">${logo()} ${esc(S.clinica.nome)}</div><h1>Quem está usando?</h1>
    <div class="pick" style="grid-template-columns:1fr">${S.users.map(u=>`<button type="button" class="opt" data-act="entrar" data-id="${u.id}"><span class="av">${iniciais(u.nome)}</span><span><b>${esc(u.nome)}</b><span class="s">${esc(papel(u))}</span></span></button>`).join('')}</div>
    <p class="muted small">Neste esboço não há senha. O login com senha e verificação em duas etapas chega junto com o servidor.</p></section></main>`;
}
function shell(){
  const vs=views();
  const nWa=can('whatsapp.usar')?lembretesPend().length+pesquisasPend().length:0;
  const nRec=Object.values(S.chat.canais).reduce((s,c)=>s+(c.nl||0),0)+Object.entries(S.chat.dms).filter(([k])=>k.split('|').includes(S.user)).reduce((s,[,d])=>s+((d.nl||{})[S.user]||0),0);
  const nFila=role()==='medico'?filaMedico(me().id).length:0;
  const dot={whatsapp:nWa,recados:nRec,inicio:nFila};
  const nav=vs.filter(v=>v!=='tv').map(v=>`<button type="button" class="nav-i" data-act="nav" data-v="${v}"${S.ui.view===v?' aria-current="page"':''}>${ic(VIEWS[v][1],22)}<span>${VIEWS[v][0]}</span>${dot[v]?`<span class="dot">${dot[v]}</span>`:''}</button>`).join('');
  const V={inicio:vInicio,consulta:vConsulta,agenda:vAgenda,whatsapp:vWhats,pagamentos:vPag,pacientes:vPacs,recados:vRecados,relatorios:vRel,historico:vHist,config:vConfig,tv:vTV}[S.ui.view];
  return `<div class="app"><nav class="nav" aria-label="Menu"><div class="brand">${logo()}sis_Clinicas</div>${nav}<div class="nav-user"><b>${esc(me().nome)}</b>${esc(papel(me()))} · ${esc(S.clinica.nome)}<br><button type="button" class="link" data-act="sair">Trocar de usuário</button></div></nav><main class="main"><div class="wrap">${V()}</div></main></div>`;
}
const head=(t,p,acts)=>`<div class="head"><div><h1>${t}</h1>${p?`<p>${p}</p>`:''}</div>${acts?`<div class="chips">${acts}</div>`:''}</div>`;
function toastHTML(){const t=S.ui.toast;if(!t)return '';return `<div class="toast ${t.kind==='err'?'err':''}" role="status"><span>${esc(t.msg)}</span>${t.undo?`<button type="button" data-act="desfazer">Desfazer</button>`:''}</div>`;}
function linha(a,o){
  o=o||{};
  return `<div class="item"><button type="button" class="item-main" data-act="verAppt" data-id="${a.id}"><span class="when">${fmt(a.t)}</span><span class="who"><b>${esc(pacNome(a.pac))}</b><span class="sub">${esc(o.sub!=null?o.sub:profNome(a.prof)+' · '+a.proc)}</span></span></button><div class="acts">${o.extra||''}${o.acao||pill(a.status)}</div></div>`;
}
function passos(){
  const temMed=profs().length>0,temServ=S.servicos.length>0;
  if(temMed&&temServ)return '';
  if(!can('config.gerenciar'))return `<div class="note info"><span>Para marcar consultas, a gestão precisa cadastrar ${!temMed&&!temServ?'os médicos e os serviços':!temMed?'os médicos':'os serviços'} em Configurações.</span></div>`;
  const f=[[S.especialidades.length>0&&S.salas.length>0,'Cadastrar especialidades e salas','clinica'],[temMed,'Cadastrar os médicos','equipe'],[temMed,'Revisar o horário de cada médico','horarios'],[temServ,'Cadastrar serviços, exames e valores','servicos'],[S.users.some(u=>u.role==='recepcao'),'Cadastrar a recepção (opcional)','equipe'],[!!S.clinica.endereco,'Informar o endereço da clínica (opcional)','clinica']];
  return `<section class="card"><h2>Primeiros passos</h2><p class="muted">Antes de marcar a primeira consulta:</p><div class="list">${f.map(([ok,t,tab])=>`<div class="item"><span class="pill ${ok?'ok':'neutral'}">${ok?'Feito':'A fazer'}</span><b style="flex:1 1 200px">${t}</b>${ok?'':`<button type="button" class="btn sm soft" data-act="cfg" data-v="${tab}">Fazer agora</button>`}</div>`).join('')}</div></section>`;
}
const trocar=()=>`<button type="button" class="btn sm so-cel" data-act="sair">Trocar de usuário</button>`;

/* ---------- Início ---------- */
const saudacao=()=>{const n=now();return n<720?'Bom dia':n<1080?'Boa tarde':'Boa noite';};
function vInicio(){if(role()==='medico')return inicioMedico();if(role()==='gestor')return inicioGestor();return inicioRecepcao();}
function inicioRecepcao(){
  const hj=S.appts.filter(a=>a.dia===hoje());
  const chegando=hj.filter(a=>['agendado','confirmado'].includes(a.status)).sort((a,b)=>a.t-b.t).slice(0,8);
  const espera=hj.filter(a=>a.status==='chegou').sort((a,b)=>a.chegou-b.chegou);
  const consulta=hj.filter(a=>a.status==='em_atendimento');
  const nLem=lembretesPend().length,nPag=abertas().length,ch=can('recepcao.chegada');
  let h=head(`${saudacao()}, ${esc(curto(me().nome))}`,`${rotLongo(hoje())} · ${fmt(now())}. O que você precisa fazer agora?`,trocar());
  h+=passos();
  const tiles=[];
  if(can('agenda.marcar'))tiles.push(`<button type="button" class="tile main" data-act="agendar"><span class="ic">${ic('cal',26)}</span><b>Marcar consulta</b><span>Encontre o paciente e escolha o horário</span></button>`);
  if(can('whatsapp.usar'))tiles.push(`<button type="button" class="tile" data-act="nav" data-v="whatsapp"><span class="ic">${ic('wpp',26)}</span><b>WhatsApp</b><span>${nLem?plural(nLem,'lembrete para enviar','lembretes para enviar'):'Nenhum lembrete pendente'}</span>${nLem?`<span class="count">${nLem}</span>`:''}</button>`);
  if(can('pagamento.receber'))tiles.push(`<button type="button" class="tile" data-act="nav" data-v="pagamentos"><span class="ic">${ic('card',26)}</span><b>Receber pagamento</b><span>${nPag?plural(nPag,'pagamento pendente','pagamentos pendentes'):'Nada pendente'}</span>${nPag?`<span class="count">${nPag}</span>`:''}</button>`);
  if(ch)tiles.push(`<button type="button" class="tile" data-act="nav" data-v="tv"><span class="ic">${ic('tv',26)}</span><b>Tela da sala de espera</b><span>Abrir o painel de chamada</span></button>`);
  h+=`<div class="tiles">${tiles.join('')}</div>`;
  h+=`<div class="cols"><div class="a"><section class="card"><h2>Chegando hoje <button type="button" class="link" data-act="nav" data-v="agenda">Ver agenda completa</button></h2>${ch?'<p class="muted small">Quando o paciente chegar, toque em <b>Chegou</b>.</p>':''}<div class="list">${chegando.map(a=>{const atraso=now()-a.t;
      return linha(a,{extra:atraso>15?`<span class="pill bad">${atraso} min atrasado</span>`:'',acao:ch?`<button type="button" class="btn primary" data-act="chegou" data-id="${a.id}">${ic('login')} Chegou</button>${atraso>15?`<button type="button" class="btn sm" data-act="faltou" data-id="${a.id}">Faltou</button>`:''}`:pill(a.status)});}).join('')||'<p class="muted">Ninguém marcado para o resto do dia.</p>'}</div></section></div>
    <div class="b"><section class="card"><h2>Sala de espera <span class="pill warn">${espera.length}</span></h2><div class="list">${espera.map(a=>{const w=Math.max(0,now()-a.chegou);const c=contaDe(a);const deve=c&&faltaConta(c)>0&&can('pagamento.receber');
      return linha(a,{sub:`${curto(profNome(a.prof))} · esperando ${w} min`,acao:deve?`<button type="button" class="btn sm soft" data-act="receber" data-id="${c.id}">Receber</button>`:`<span class="pill ${w>=30?'bad':'warn'}">${w} min</span>`});}).join('')||'<p class="muted">Sala vazia.</p>'}</div><p class="muted small">Quem chama o paciente é o médico, pelo sistema. O nome aparece na TV.</p></section>
    ${consulta.length?`<section class="card"><h2>Em consulta</h2><div class="list">${consulta.map(a=>linha(a,{sub:salaDe(a.prof)+' · '+curto(profNome(a.prof))})).join('')}</div></section>`:''}</div></div>`;
  return h;
}
function inicioMedico(){
  const p=me().id,fila=filaMedico(p),atual=S.appts.find(a=>a.dia===hoje()&&a.prof===p&&a.status==='em_atendimento');
  const dia=S.appts.filter(a=>a.dia===hoje()&&a.prof===p&&a.status!=='cancelado').sort((a,b)=>a.t-b.t);
  const h0=hDia(p,hoje());
  let h=head(`${saudacao()}, ${esc(curto(me().nome))}`,`${rotLongo(hoje())} · ${fmt(now())} · ${esc(salaDe(p))}${h0&&h0.on?' · atende das '+fmt(h0.ini)+' às '+fmt(h0.fim):' · sem atendimento hoje'}`,trocar());
  if(!me().cert||me().cert==='nenhum')h+=`<div class="note warn"><span>Você ainda não tem certificado digital cadastrado. Peça à gestão para informar o tipo (nuvem ou token A3) em Configurações → Equipe.</span></div>`;
  if(atual)h+=`<div class="note accent"><span>${ic('file')} Você está atendendo <b>${esc(pacNome(atual.pac))}</b> há ${Math.max(0,now()-atual.chamado)} min.</span><button type="button" class="btn primary" data-act="abrirConsulta" data-id="${atual.id}">Voltar para a consulta</button></div>`;
  const prox=fila[0];const pp=prox?getPac(prox.pac):null;
  h+=`<section class="card" style="gap:16px"><h2>Próximo paciente</h2>${prox?`<div style="display:flex;flex-wrap:wrap;gap:16px;align-items:center"><span class="av" style="width:64px;height:64px;font-size:22px">${iniciais(pp.nome)}</span><div style="flex:1 1 220px"><div style="font-size:24px;font-weight:700">${esc(pp.nome)}</div><div class="muted">${esc(prox.proc)} das ${fmt(prox.t)} · esperando há ${Math.max(0,now()-prox.chegou)} min</div>${pp.alergias?`<div class="pill bad" style="margin-top:6px">${ic('alert',14)} Alergia: ${esc(pp.alergias)}</div>`:''}</div>
    <button type="button" class="btn primary big" data-act="chamar" data-id="${prox.id}"${atual?' disabled title="Finalize a consulta atual antes"':''}>${ic('speaker',22)} Chamar agora</button></div>${atual?'<p class="muted small">Finalize a consulta atual para chamar o próximo.</p>':''}${fila.length>1?`<p class="muted">Depois: ${fila.slice(1).map(a=>esc(curto(pacNome(a.pac)))).join(', ')}</p>`:''}`:'<p class="muted" style="font-size:18px">Ninguém na sala de espera agora. Quando a recepção registrar a chegada, o paciente aparece aqui.</p>'}</section>`;
  h+=`<section class="card"><h2>Minha agenda de hoje</h2><div class="list">${dia.map(a=>linha(a,{sub:a.proc})).join('')||'<p class="muted">Nenhuma consulta marcada para hoje.</p>'}</div></section>`;
  return h;
}
function inicioGestor(){
  const hj=S.appts.filter(a=>a.dia===hoje()),rec=S.pays.filter(p=>p.data===hoje()).reduce((s,p)=>s+p.valor,0);
  const espera=hj.filter(a=>a.status==='chegou'),longa=espera.filter(a=>now()-a.chegou>=30);
  const pend=[];
  if(longa.length)pend.push(['bad',`${plural(longa.length,'paciente esperando','pacientes esperando')} há mais de 30 minutos`,'agenda']);
  const nLem=lembretesPend().length;if(nLem)pend.push(['warn',`${plural(nLem,'lembrete '+rotLembrete()+' ainda não enviado','lembretes '+rotLembrete()+' ainda não enviados')}`,'whatsapp']);
  const ab=abertas();if(ab.length)pend.push(['warn',`${plural(ab.length,'pagamento pendente','pagamentos pendentes')} (${brl(ab.reduce((s,c)=>s+faltaConta(c),0))})`,'pagamentos']);
  const antigas=sessoesAbertas().filter(s=>s.data<hoje());if(antigas.length)pend.push(['bad',`${plural(antigas.length,'caixa aberto','caixas abertos')} desde outro dia`,'pagamentos']);
  const ras=S.regs.filter(r=>r.status==='rascunho').length;if(ras)pend.push(['info',`${plural(ras,'consulta em andamento','consultas em andamento')} ainda não ${ras===1?'finalizada':'finalizadas'}`,'relatorios']);
  let h=head(`${saudacao()}, ${esc(curto(me().nome))}`,`Resumo de hoje, ${fmt(now())}.`,trocar());
  h+=passos();
  h+=`<div class="stats"><div class="stat"><span>Atendidos</span><b class="big-num">${hj.filter(a=>a.status==='atendido').length}</b></div><div class="stat"><span>Na sala de espera</span><b class="big-num">${espera.length}</b></div><div class="stat"><span>Recebido hoje</span><b class="big-num" style="font-size:30px">${brl(rec)}</b></div><div class="stat"><span>Faltas</span><b class="big-num">${hj.filter(a=>a.status==='faltou').length}</b></div></div>`;
  h+=`<section class="card"><h2>Precisa de atenção</h2>${pend.length?pend.map(([k,t,v])=>`<div class="note ${k}"><span>${t}</span><button type="button" class="btn sm" data-act="nav" data-v="${v}">Ver</button></div>`).join(''):'<p class="muted">Tudo em dia.</p>'}</section>`;
  return h;
}

/* ---------- Agenda ---------- */
function vAgenda(){
  const d=S.ui.dia,lst=profs();let pf=S.ui.agProf;if(pf!=='todos'&&!getUser(pf))pf=S.ui.agProf='todos';
  let h=head('Agenda',pf==='todos'?'Escolha um médico para ver os horários livres. Toque num paciente para ver as opções.':'Toque num horário livre para marcar. Toque num paciente para ver as opções.',can('agenda.marcar')?`<button type="button" class="btn primary" data-act="agendar">${ic('plus')} Marcar consulta</button>`:'');
  if(!lst.length)return h+passos();
  h+=`<div class="chips scroll-x" role="group" aria-label="Dia">${diasAgenda().map(x=>`<button type="button" class="chip" data-act="dia" data-v="${x}" aria-pressed="${d===x}">${rotDia(x)}</button>`).join('')}</div>`;
  h+=`<div class="chips" role="group" aria-label="Médico"><button type="button" class="chip" data-act="agProf" data-v="todos" aria-pressed="${pf==='todos'}">Todos</button>${lst.map(p=>`<button type="button" class="chip" data-act="agProf" data-v="${p.id}" aria-pressed="${pf===p.id}"><span class="av">${iniciais(p.nome)}</span>${esc(curto(p.nome))}</button>`).join('')}</div>`;
  let lista='';const ehHoje=d===hoje(),n=now(),st=S.clinica.intervalo;
  const agora=ehHoje?`<div class="nowline">Agora · ${fmt(n)}</div>`:'';
  if(pf==='todos'){
    const as=S.appts.filter(a=>a.dia===d&&a.status!=='cancelado').sort((a,b)=>a.t-b.t||profNome(a.prof).localeCompare(profNome(b.prof)));
    let pos=false;
    as.forEach(a=>{if(ehHoje&&!pos&&a.t>=n-15){lista+=agora;pos=true;}lista+=linha(a,{sub:curto(profNome(a.prof))+' · '+a.proc+(a.encaixe?' · encaixe':'')});});
    if(ehHoje&&!pos)lista+=agora;
    if(!as.length)lista='<p class="muted">Nenhuma consulta neste dia.</p>';
    const fora=lst.filter(p=>{const x=hDia(p.id,d);return !x||!x.on;});
    if(fora.length)lista+=`<p class="muted small" style="padding-top:10px">Não atendem neste dia: ${fora.map(p=>esc(curto(p.nome))).join(', ')}.</p>`;
  }else{
    const as=S.appts.filter(a=>a.dia===d&&a.prof===pf&&a.status!=='cancelado');let pos=false;
    const dentro=(ini,fim)=>as.filter(a=>a.t>=ini&&a.t<fim).sort((x,y)=>x.t-y.t).map(a=>linha(a,{sub:a.proc+(a.encaixe?' · encaixe':'')+' · '+durTxt(a.dur)})).join('');
    const hd=hDia(pf,d);
    if(!hd||!hd.on){lista+=`<div class="note neutral"><span>${esc(curto(profNome(pf)))} não atende neste dia. O horário de cada médico fica em Configurações → Horários.</span></div>`+dentro(0,1440);}
    else{
      const bl=blocosDia(pf,d);
      lista+=dentro(0,hd.ini);
      for(let t=hd.ini;t<hd.fim;){
        if(ehHoje&&!pos&&t>=n-15){lista+=agora;pos=true;}
        const b=bl.find(x=>x.ini<=t&&t<x.fim);
        if(b){lista+=`<div class="blk"><span class="when">${fmt(b.ini)}</span><b>${esc(b.motivo)}</b><span class="muted small">até ${fmt(b.fim)}</span></div>`+dentro(t,b.fim);t=b.fim;continue;}
        const aqui=as.filter(a=>a.t===t);
        if(aqui.length){const passo=Math.max(...aqui.filter(a=>!a.encaixe).map(a=>a.dur).concat([st]));lista+=dentro(t,t+passo);t+=passo;continue;}
        const meio=as.filter(a=>a.t>t&&a.t<t+st);
        if(meio.length)lista+=dentro(t+1,t+st);
        else if(!(ehHoje&&t+st<=n)&&!conflitoGrade(pf,d,t,st))lista+=`<div style="padding:5px 0"><button type="button" class="free" data-act="agendarEm" data-p="${pf}" data-t="${t}"><span class="when">${fmt(t)}</span><span>Livre · toque para marcar</span></button></div>`;
        t+=st;
      }
      lista+=dentro(hd.fim,1440);
      if(ehHoje&&!pos)lista+=agora;
    }
  }
  h+=`<section class="card"><h2>${rotLongo(d)}${pf!=='todos'?' · '+esc(profNome(pf)):''}</h2><div class="list">${lista}</div></section>`;
  return h;
}

/* ---------- Consulta (médico) ---------- */
function vConsulta(){
  const a=minhaConsulta();
  if(S.ui.fim&&getAppt(S.ui.fim)&&getAppt(S.ui.fim).prof===me().id&&(!a||a.status!=='em_atendimento')){
    const f=getAppt(S.ui.fim),prox=filaMedico(me().id)[0],r=regDe(f,false);
    return `<section class="card done"><span class="ok-ic">${ic('check',40)}</span><h1>Consulta finalizada</h1><p class="muted" style="font-size:18px">O registro de ${esc(pacNome(f.pac))} foi travado${r&&r.metodo?' e assinado ('+esc(r.metodo)+', simulação)':''}. Não pode mais ser alterado.${f.preco?' O pagamento foi enviado para a recepção.':''}</p>
      ${prox?`<button type="button" class="btn primary big" data-act="chamar" data-id="${prox.id}">${ic('speaker',22)} Chamar ${esc(curto(pacNome(prox.pac)))}</button>`:'<p class="muted">Ninguém na sala de espera.</p>'}<button type="button" class="link" data-act="abrirConsulta" data-id="${f.id}">Rever a consulta finalizada</button></section>`;
  }
  if(!a){const prox=filaMedico(me().id)[0];return head('Consulta','Nenhuma consulta aberta agora.')+`<section class="card done">${ic('file',40)}<p style="font-size:18px">${prox?`${esc(pacNome(prox.pac))} está esperando há ${Math.max(0,now()-prox.chegou)} min.`:'Ninguém na sala de espera.'}</p>${prox?`<button type="button" class="btn primary big" data-act="chamar" data-id="${prox.id}">${ic('speaker',22)} Chamar agora</button>`:''}</section>`;}
  const p=getPac(a.pac);const reg=regDe(a,a.status==='em_atendimento');
  if(!reg)return head(esc(p.nome),'Sem registro desta consulta.');
  const ro=reg.status==='assinado';
  const num=x=>parseFloat(String(x).replace(',','.'));const imc=num(reg.v.peso)/Math.pow(num(reg.v.alt)/100,2);
  const sec=i=>`<label class="field">${esc(reg.modelo.secoes[i])}<textarea id="c-s-${i}" rows="3" data-in="regC" data-i="${i}"${ro?' readonly':''}>${esc(reg.campos[i])}</textarea></label>`;
  const vi=(f,l,un)=>`<label class="field">${l} <span class="hint">${un}</span><input id="c-v-${f}" inputmode="decimal" value="${esc(reg.v[f])}" data-in="regV" data-f="${f}"${ro?' readonly':''}></label>`;
  const q=S.ui.cidBusca.trim().toLowerCase();
  const sug=!ro&&q?CID.filter(c=>!reg.cids.includes(c[0])&&(c[0].toLowerCase().includes(q)||c[1].toLowerCase().includes(q))).slice(0,5):[];
  const pc=(f,l)=>`<label class="field">${l}<textarea id="pc-${f}" rows="2" data-in="pacClin" data-f="${f}" data-id="${p.id}">${esc(p[f])}</textarea></label>`;
  let h=`<div class="head"><div style="display:flex;gap:14px;align-items:center"><span class="av" style="width:58px;height:58px;font-size:20px">${iniciais(p.nome)}</span><div><h1>${esc(p.nome)}</h1><p>${idTxt(p)}${esc(a.proc)} das ${fmt(a.t)}${a.status==='em_atendimento'?' · em consulta há '+Math.max(0,now()-a.chamado)+' min':''}</p></div></div>${ro?'':`<button type="button" class="btn primary big" data-act="finalizar">${ic('check',22)} Finalizar consulta</button>`}</div>`;
  if(p.alergias)h+=`<div class="allergy">${ic('alert',26)} ALERGIA: ${esc(p.alergias).toUpperCase()}</div>`;
  if(ro)h+=`<div class="note ok"><span>${ic('lock')} Consulta finalizada em ${esc(reg.assinadoEm)}${reg.metodo?' · '+esc(reg.metodo):''}${reg.sigiloso?' · sigilosa':''}. Para corrigir algo, adicione uma observação no final.</span></div>`;
  h+=`<div class="cols"><div class="a"><section class="card">
    ${ro?`<p class="muted small">Modelo: ${esc(reg.modelo.nome)}</p>`:`<label class="field">Modelo de prontuário<select id="c-modelo" class="inp" data-ch="regModelo">${todosModelos().map(m=>`<option value="${m.id}"${m.id===reg.modelo.id?' selected':''}>${esc(m.nome)}${m.sistema?' (padrão do sistema)':m.espId?' · '+esc(espNome(m.espId)):''}</option>`).join('')}</select></label>`}
    ${reg.modelo.secoes.length?sec(0):''}
    <div class="vit">${vi('pa','Pressão','ex.: 120/80')}${vi('temp','Temperatura','°C')}${vi('peso','Peso','kg')}${vi('alt','Altura','cm')}<div class="field">IMC <span class="hint">automático</span><input id="c-imc" readonly value="${isFinite(imc)?imc.toFixed(1).replace('.',','):'—'}"></div></div>
    ${reg.modelo.secoes.slice(1).map((_,i)=>sec(i+1)).join('')}
    <div class="field">Diagnóstico <span class="hint">CID-10 (amostra)</span><div class="chips">${reg.cids.map(c=>{const x=CID.find(y=>y[0]===c);return `<span class="pill info" style="font-size:15px">${esc(c)} · ${esc(x?x[1]:'')}${ro?'':` <button type="button" class="link" style="padding:0;min-height:0;color:inherit" data-act="cidRem" data-c="${c}" aria-label="Tirar ${c}">${ic('x',14)}</button>`}</span>`;}).join('')}</div>
      ${ro?'':`<div class="search" style="min-height:50px">${ic('search')}<label class="sr" for="c-cid">Buscar diagnóstico</label><input id="c-cid" type="search" value="${esc(S.ui.cidBusca)}" data-in="cid" placeholder="Digite o nome ou o código (ex.: febre)"></div>${sug.length?`<div class="chips">${sug.map(c=>`<button type="button" class="chip" data-act="cidAdd" data-c="${c[0]}">${ic('plus',16)} ${esc(c[1])} (${c[0]})</button>`).join('')}</div>`:''}`}</div>
    ${ro?'':`<label class="switch"><input id="c-sig" type="checkbox"${reg.sigiloso?' checked':''} data-ch="regSig"> Registro sigiloso: só eu poderei ler o conteúdo</label>`}
    ${reg.adendos.map(ad=>`<div class="note ok" style="flex-direction:column;align-items:flex-start;gap:4px"><b>Observação adicionada em ${esc(ad.hora)}</b><span style="white-space:pre-line;font-weight:400">${esc(ad.texto)}</span></div>`).join('')}
    ${ro?`<label class="field">Adicionar observação <span class="hint">fica junto com a consulta, com data e autor</span><textarea id="c-adendo" rows="2" data-in="adendo">${esc(S.ui.adendo)}</textarea></label><div><button type="button" class="btn" data-act="adendo">${ic('pen')} Adicionar observação</button></div>`:`<p class="muted small">${ic('check',14)} Tudo o que você escreve é salvo sozinho.</p>`}
    </section>
    <section class="card"><h2>Documentos para o paciente</h2>${ro&&!reg.docs.length?'<p class="muted">Nenhum documento.</p>':ro?'':`<div class="chips">${Object.entries(DOCS).map(([k,v])=>`<button type="button" class="chip" data-act="doc" data-v="${k}">${ic('plus',16)} ${v[0]}</button>`).join('')}</div><p class="muted small">Prescrição pela Memed: em estudo.</p>`}
      ${reg.docs.map(dc=>`<div class="note ${dc.enviado?'ok':'info'}"><span>${esc(DOCS[dc.tipo][0])} · emitido em ${esc(dc.hora)}${dc.enviado?' · enviado pelo WhatsApp':''}</span></div>`).join('')}</section></div>
    <div class="b"><section class="card"><h2>Sobre o paciente</h2>${pc('alergias','Alergias')}${pc('meds','Remédios em uso')}${pc('problemas','Doenças e cuidados')}</section>
    ${histPac(p,reg)}</div></div>`;
  return h;
}
function histPac(p,reg){
  const autor=S.clinica.prontuario.modo==='autor';
  let hs=S.regs.filter(r=>r.pac===p.id&&r.status==='assinado'&&(!reg||r.id!==reg.id)).slice().reverse();
  const outros=autor?hs.filter(r=>r.prof!==me().id).length:0;
  if(autor)hs=hs.filter(r=>r.prof===me().id);
  return `<section class="card"><h2>Consultas anteriores</h2>${hs.length?hs.map(r=>r.sigiloso&&r.prof!==me().id?`<div class="muted small" style="display:flex;gap:8px;align-items:center">${ic('lock',16)} ${esc(r.data)} · registro sigiloso de ${esc(curto(profNome(r.prof)))}</div>`:`<details class="more" style="border-top:1px solid var(--line-2)"><summary>${esc(r.data)} · ${esc(curto(profNome(r.prof)))} · ${esc(r.modelo.nome)}${r.sigiloso?' · sigilosa':''}</summary><div style="display:flex;flex-direction:column;gap:6px;padding-bottom:10px">${r.modelo.secoes.map((s,i)=>r.campos[i]?`<span><b>${esc(s)}:</b> ${esc(r.campos[i])}</span>`:'').join('')||'<span class="muted">Sem texto.</span>'}${r.cids.length?`<span class="small muted">CID ${esc(r.cids.join(', '))}</span>`:''}</div></details>`).join(''):'<p class="muted">Nenhuma consulta anterior visível.</p>'}
    ${outros?`<p class="note neutral" style="font-weight:500"><span>${plural(outros,'registro','registros')} de outros profissionais. Nesta clínica, cada profissional vê só os próprios registros.</span></p>`:''}<p class="muted small">Cada vez que alguém abre um prontuário, fica registrado.</p></section>`;
}

/* ---------- WhatsApp ---------- */
function vWhats(){
  const lem=lembretesPend(),pp=pesquisasPend(),sn=pesquisasSemNota(),forma=S.clinica.whatsapp.forma;
  const ord=S.convs.filter(c=>c.msgs.length).sort((a,b)=>b.ts-a.ts);
  const c=S.convs.find(x=>x.id===S.ui.conv&&x.msgs.length)||ord[0];
  let h=head('WhatsApp','O sistema prepara a mensagem e abre o WhatsApp com o texto pronto. É só tocar em enviar.');
  if(forma!=='wame')h+=`<div class="note info"><span>Forma configurada: <b>${WA_FORMAS[forma][0]}</b>. Neste esboço, as mensagens ainda saem pelo link wa.me; o envio automático e a caixa de entrada chegam com o servidor.</span></div>`;
  h+=`<div class="cols"><section class="card a"><h2>Lembretes ${rotLembrete()} <span class="pill ${lem.length?'warn':'ok'}">${lem.length}</span></h2>${lem.length?`<div class="list">${lem.map(a=>linha(a,{acao:`<button type="button" class="btn sm primary" data-act="lembrete" data-id="${a.id}">${ic('send',16)} Enviar</button>`})).join('')}</div>`:'<p class="muted">Nenhum lembrete para enviar.</p>'}<p class="muted small">Quando o paciente responder, confirme a consulta na agenda. Antecedência e texto em Configurações → WhatsApp.</p></section>
    <section class="card b"><h2>Pesquisa de satisfação <span class="pill ${pp.length?'warn':'ok'}">${pp.length}</span></h2>${!S.clinica.msgs.pesquisa?'<p class="muted">Desligada nas configurações.</p>':pp.length||sn.length?`<div class="list">${pp.map(q=>`<div class="item"><div class="who" style="flex:1 1 160px"><b>${esc(pacNome(q.pac))}</b><span class="sub">${esc(curto(profNome(q.prof)))} · ${dm(q.dia)}</span></div><button type="button" class="btn sm primary" data-act="pesqEnviar" data-id="${q.id}">${ic('send',16)} Enviar</button></div>`).join('')}${sn.map(q=>`<div class="item"><div class="who" style="flex:1 1 160px"><b>${esc(pacNome(q.pac))}</b><span class="sub">enviada · aguardando resposta</span></div><button type="button" class="btn sm" data-act="pesqNota" data-id="${q.id}">Registrar resposta</button></div>`).join('')}</div>`:'<p class="muted">Nenhuma pesquisa pendente.</p>'}</section></div>`;
  if(!c)return h+`<section class="card"><h2>Conversas</h2><p class="muted">Nenhuma mensagem enviada ainda. As mensagens enviadas pelo sistema (confirmações, lembretes, recibos) aparecem aqui.</p></section>`;
  const item=x=>{const u=x.msgs[x.msgs.length-1];return `<button type="button" class="conv" data-act="conv" data-id="${x.id}" aria-current="${x.id===c.id}"><span class="av">${iniciais(pacNome(x.pac))}</span><span class="t"><b>${esc(pacNome(x.pac))}</b><span>${esc(u?u.texto:'')}</span></span><span class="small muted">${esc(u?u.hora.split(' às ')[0]:'')}</span></button>`;};
  h+=`<div class="wa${S.ui.convAberta?' aberta':''}"><div class="wa-list" data-keep="walist"><h3>Conversas (${ord.length})</h3>${ord.map(item).join('')}</div>`;
  h+=`<section class="wa-main"><div class="wa-head"><button type="button" class="x so-cel" data-act="voltarLista" aria-label="Voltar para a lista">${ic('left')}</button><div style="flex:1 1 160px;min-width:0"><b style="font-size:18px">${esc(pacNome(c.pac))}</b><div class="small muted">${esc(c.fone)}</div></div><button type="button" class="btn sm" data-act="abrirPac" data-id="${c.pac}">Ver ficha</button></div>
    <div class="msgs">${c.msgs.map(m=>m.tipo==='sys'?`<div class="m sys"><span class="sysm">${esc(m.texto)}</span></div>`:`<div class="m out"><div class="bub">${m.autor?`<span class="rot">${esc(m.autor)}</span>`:''}<span class="txt">${esc(m.texto)}</span><span class="h">${esc(m.hora)}</span></div></div>`).join('')}
    <div class="m sys"><span class="sysm">As respostas do paciente chegam no WhatsApp da clínica. A caixa de entrada integrada vem com a API.</span></div></div>`;
  h+=ctxBar(c);
  const r=S.ui.rasc[c.id]||'';
  h+=`<div class="compose"><div class="qr" aria-label="Respostas prontas">${rapidas().map((x,i)=>x[1]?`<button type="button" data-act="rapida" data-i="${i}">${x[0]}</button>`:'').join('')}</div><div style="display:flex;gap:10px;align-items:flex-end"><label class="sr" for="wa-txt">Mensagem</label><textarea id="wa-txt" rows="1" data-in="waTxt" data-enter="enviar" placeholder="Escreva aqui e toque em enviar">${esc(r)}</textarea><button type="button" class="btn primary" data-act="enviar" aria-label="Abrir no WhatsApp" style="min-height:52px">${ic('send')}<span class="sr">Abrir no WhatsApp</span></button></div></div>`;
  return h+`</section></div>`;
}
function ctxBar(c){
  const prox=S.appts.filter(a=>a.pac===c.pac&&['agendado','confirmado'].includes(a.status)&&(a.dia>hoje()||(a.dia===hoje()&&a.t>=now()-30))).sort((a,b)=>a.dia.localeCompare(b.dia)||a.t-b.t)[0];
  const pago=S.contas.filter(x=>x.pac===c.pac&&pagoConta(x)>0&&faltaConta(x)<=0).pop();const mk=can('agenda.marcar');
  return `<div class="ctxbar">${prox?`<span><b>${quando(prox.dia,prox.t)}</b> · ${esc(curto(profNome(prox.prof)))} ${pill(prox.status)}</span>${mk?`<button type="button" class="btn sm soft" data-act="mudar" data-id="${prox.id}">Mudar horário</button>${prox.status==='agendado'?`<button type="button" class="btn sm" data-act="confirmar" data-id="${prox.id}">Confirmar</button>`:''}`:''}`:`<span class="muted">Sem consulta marcada.</span>${mk?`<button type="button" class="btn sm soft" data-act="agendarPac" data-id="${c.pac}">Marcar consulta</button>`:''}`}${pago?`<button type="button" class="btn sm" data-act="recibo" data-id="${pago.id}">Enviar recibo</button>`:''}</div>`;
}

/* ---------- Pagamentos ---------- */
function vPag(){
  const ab=abertas().sort((a,b)=>(getAppt(a.appt)?0:1)-(getAppt(b.appt)?0:1)),op=can('caixa.operar'),rc=can('pagamento.receber');
  const hojeP=S.pays.filter(p=>p.data===hoje());
  let h=head('Pagamentos',rc?'Toque em Receber. O valor já vem preenchido.':'Abertura e fechamento dos caixas.');
  h+=`<section class="card"><h2>Caixas</h2><div class="list">${S.caixas.map(cx=>{const s=sessaoDe(cx.id);const tot=s?S.pays.filter(p=>p.sessao===s.id).reduce((a,p)=>a+p.valor,0):0;
    return `<div class="item"><div class="who" style="flex:1 1 220px"><b>${esc(cx.nome)}</b><span class="sub">${s?`Aberto por ${esc(s.por)} ${s.data===hoje()?'às '+fmt(s.abertoEm):'em '+dm(s.data)+' (feche o caixa do dia anterior)'} · recebido ${brl(tot)}`:'Fechado'}</span></div><span class="pill ${s?(s.data===hoje()?'ok':'bad'):'neutral'}">${s?'Aberto':'Fechado'}</span>${op?(s?`<button type="button" class="btn sm" data-act="fecharCaixa" data-id="${s.id}">Fechar</button>`:`<button type="button" class="btn sm soft" data-act="abrirCaixa" data-id="${cx.id}">Abrir</button>`):''}</div>`;}).join('')}</div>${op?'':'<p class="muted small">Abrir e fechar caixa depende de autorização da gestão.</p>'}</section>`;
  h+=`<div class="cols"><div class="a"><section class="card"><h2>Para receber <span class="pill warn">${ab.length}</span></h2><div class="list">${ab.map(c=>`<div class="item"><div class="item-main" style="cursor:default"><span class="av">${iniciais(pacNome(c.pac))}</span><span class="who"><b>${esc(pacNome(c.pac))}</b><span class="sub">${esc(c.desc)}</span></span></div><div class="acts"><b style="font-size:20px">${brl(faltaConta(c))}</b>${rc?`<button type="button" class="btn primary" data-act="receber" data-id="${c.id}">Receber</button>`:''}</div></div>`).join('')||'<p class="muted">Nada para receber agora.</p>'}</div></section></div>
    <div class="b"><section class="card"><h2>Recebidos hoje</h2><div class="list">${hojeP.slice().reverse().map(p=>{const c=S.contas.find(x=>x.id===p.conta);const est=S.pays.some(x=>x.estornoDe===p.id);const s=S.sessoes.find(x=>x.id===p.sessao);
      return `<div class="item"><div class="who" style="flex:1 1 160px"><b>${esc(c?pacNome(c.pac):'—')}</b><span class="sub">${fmt(p.hora)} · ${esc(formaNome(p.forma))}${p.parc>1?' em '+p.parc+'x':''} · ${esc(s?caixaNome(s.caixa):'')}${p.estornoDe?' · devolvido':''}</span></div><b style="${p.valor<0?'color:var(--bad-fg)':''}">${brl(p.valor)}</b>${can('pagamento.devolver')&&p.valor>0&&!est&&s&&s.aberto?`<button type="button" class="link" data-act="estornar" data-id="${p.id}">Devolver</button>`:''}</div>`;}).join('')||'<p class="muted">Nenhum pagamento hoje.</p>'}</div>${can('pagamento.devolver')?'':'<p class="muted small">Para devolver um pagamento, peça a quem tem autorização.</p>'}</section></div></div>`;
  return h;
}

/* ---------- Pacientes ---------- */
function vPacs(){
  if(S.ui.pacSel&&getPac(S.ui.pacSel))return ficha(getPac(S.ui.pacSel));
  const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
  const q=norm(S.ui.pacBusca.trim()),qd=q.replace(/\D/g,'');
  const l=S.pacs.filter(p=>!q||norm(p.nome).includes(q)||(qd.length>=3&&(p.cel.replace(/\D/g,'').includes(qd)||p.cpf.replace(/\D/g,'').includes(qd)))).sort((a,b)=>a.nome.localeCompare(b.nome));
  let h=head('Pacientes',S.pacs.length?`${plural(S.pacs.length,'paciente cadastrado','pacientes cadastrados')}. Busque pelo nome, telefone ou CPF.`:'Nenhum paciente cadastrado ainda.',front()?`<button type="button" class="btn primary" data-act="novoPac">${ic('userplus')} Novo paciente</button>`:'');
  if(!S.pacs.length)return h+`<section class="card"><p class="muted">Os pacientes também são cadastrados na hora de marcar a primeira consulta${can('dados.importar')?', ou importados de uma planilha em Configurações → Dados':''}.</p></section>`;
  h+=`<div class="search">${ic('search',22)}<label class="sr" for="p-busca">Buscar paciente</label><input id="p-busca" type="search" value="${esc(S.ui.pacBusca)}" data-in="pacBusca" placeholder="Digite o nome do paciente"></div>`;
  h+=`<section class="card"><div class="list">${l.slice(0,50).map(p=>{const pr=S.appts.filter(a=>a.pac===p.id&&['agendado','confirmado','chegou'].includes(a.status)&&a.dia>=hoje()).sort((a,b)=>a.dia.localeCompare(b.dia)||a.t-b.t)[0];
    return `<div class="item"><button type="button" class="item-main" data-act="abrirPac" data-id="${p.id}"><span class="av">${iniciais(p.nome)}</span><span class="who"><b>${esc(p.nome)}</b><span class="sub">${idTxt(p)}${esc(p.cel)}</span></span></button><div class="acts">${pr?`<span class="small muted">${quando(pr.dia,pr.t)}</span>`:''}${devendo(p.id)>0?'<span class="pill warn">Pagamento pendente</span>':''}</div></div>`;}).join('')||`<p class="muted">Nenhum paciente com esse nome.</p>${front()?`<button type="button" class="btn soft" data-act="novoPac">Cadastrar "${esc(S.ui.pacBusca)}"</button>`:''}`}${l.length>50?`<p class="muted small">Mostrando 50 de ${l.length}. Refine a busca.</p>`:''}</div></section>`;
  return h;
}
function ficha(p){
  const prox=S.appts.filter(a=>a.pac===p.id&&['agendado','confirmado','chegou'].includes(a.status)&&a.dia>=hoje()).sort((a,b)=>a.dia.localeCompare(b.dia)||a.t-b.t);
  const contas=S.contas.filter(c=>c.pac===p.id&&faltaConta(c)>0);
  const cpfOk=!p.cpf||cpfValido(p.cpf),nf=faltasRecentes(p.id);
  const podeWa=can('whatsapp.usar')&&p.consWpp;
  let h=`<div><button type="button" class="link" data-act="voltarPacs">${ic('left',16)} Todos os pacientes</button></div>`;
  h+=`<div class="head"><div style="display:flex;gap:14px;align-items:center"><span class="av" style="width:58px;height:58px;font-size:20px">${iniciais(p.nome)}</span><div><h1>${esc(p.nome)}</h1><p>${idTxt(p)}${esc(p.cel)}</p></div></div><div class="chips">${can('agenda.marcar')?`<button type="button" class="btn primary" data-act="agendarPac" data-id="${p.id}">${ic('cal')} Marcar consulta</button>`:''}${podeWa?`<button type="button" class="btn" data-act="irConv" data-id="${p.id}">${ic('wpp')} WhatsApp</button>`:''}</div></div>`;
  if(p.alergias)h+=`<div class="allergy" style="font-size:16px">${ic('alert')} Alergia: ${esc(p.alergias)}</div>`;
  if(nf)h+=`<div class="note ${nf>=+S.clinica.politica.faltasN?'bad':'warn'}"><span>${plural(nf,'falta ou desmarcação tardia','faltas ou desmarcações tardias')} nos últimos ${S.clinica.politica.faltasDias} dias.</span></div>`;
  h+=`<div class="cols"><div class="a"><section class="card"><h2>Próximas consultas</h2><div class="list">${prox.map(a=>linha(a,{sub:quando(a.dia,a.t)+' · '+curto(profNome(a.prof))})).join('')||'<p class="muted">Nenhuma consulta marcada.</p>'}</div></section>`;
  if(role()==='medico')h+=histPac(p,null);
  else h+=`<section class="card"><h2>Prontuário</h2><p class="muted">${ic('lock',16)} Só os médicos veem o prontuário. É uma regra de sigilo.</p></section>`;
  const fi=(f,l,ph,extra)=>`<label class="field">${l}<input id="f-${f}" value="${esc(p[f])}" data-in="pacF" data-f="${f}"${ph?` placeholder="${ph}"`:''}>${extra||''}</label>`;
  h+=`</div><div class="b"><section class="card"><h2>Dados ${front()?`<button type="button" class="link" data-act="editPac">${S.ui.editPac?'Pronto':'Editar'}</button>`:''}</h2>${S.ui.editPac?fi('nome','Nome completo')+fi('nasc','Data de nascimento','dd/mm/aaaa')+fi('cel','Celular','(11) 90000-0000')+fi('cpf','CPF','000.000.000-00',p.cpf?(cpfOk?'<span class="hint" style="color:var(--ok-fg)">CPF válido</span>':'<span class="err">CPF com erro. Confira os números.</span>'):'')+fi('email','E-mail')+fi('alergias','Alergias','Ex.: dipirona')
      :`<dl class="summary" style="font-size:16px"><dt>Nascimento</dt><dd>${esc(p.nasc||'Não informado')}</dd><dt>Celular</dt><dd>${esc(p.cel)}</dd><dt>CPF</dt><dd>${esc(p.cpf||'Não informado')}</dd><dt>E-mail</dt><dd>${esc(p.email||'Não informado')}</dd><dt>Alergias</dt><dd>${esc(p.alergias||'Nenhuma informada')}</dd></dl>`}</section>
    <section class="card"><h2>Pagamentos</h2>${contas.length?contas.map(c=>`<div class="note warn"><span>${esc(c.desc)}: <b>${brl(faltaConta(c))}</b></span>${can('pagamento.receber')?`<button type="button" class="btn sm" data-act="receber" data-id="${c.id}">Receber</button>`:''}</div>`).join(''):'<p class="muted">Tudo pago.</p>'}</section>
    <section class="card"><h2>Autorizações do paciente</h2><label class="switch"><input id="f-cw" type="checkbox"${p.consWpp?' checked':''} data-ch="pacCons" data-f="consWpp"${front()?'':' disabled'}> Aceita mensagens pelo WhatsApp</label><label class="switch"><input id="f-cd" type="checkbox"${p.consDados?' checked':''} data-ch="pacCons" data-f="consDados"${front()?'':' disabled'}> Autorizou o uso dos dados (LGPD)</label>${p.importado?'<p class="muted small">Cadastro importado de planilha.</p>':''}</section></div></div>`;
  return h;
}

/* ---------- Recados, relatórios, histórico, TV ---------- */
const dmKey=(a,b)=>[a,b].sort().join('|');
function vRecados(){
  let sel=S.ui.recSel;if(sel.startsWith('dm:')&&!getUser(sel.slice(3)))sel=S.ui.recSel='recepcao';
  let conv,titulo,sistema=false;
  if(sel.startsWith('dm:')){const o=sel.slice(3);const k=dmKey(S.user,o);if(!S.chat.dms[k])S.chat.dms[k]={nl:{},msgs:[]};conv=S.chat.dms[k];titulo=getUser(o).nome;}
  else{conv=S.chat.canais[sel];titulo=conv.nome;sistema=!!conv.sistema;}
  let h=head('Recados da equipe','Converse com a equipe sem sair do sistema. Evite mandar dados de saúde por aqui.');
  h+=`<div class="chips">${Object.entries(S.chat.canais).map(([k,c])=>`<button type="button" class="chip" data-act="recSel" data-v="${k}" aria-pressed="${sel===k}">${esc(c.nome)}${c.nl?` <span class="unread">${c.nl}</span>`:''}</button>`).join('')}${S.users.filter(u=>u.id!==S.user).map(u=>{const d=S.chat.dms[dmKey(S.user,u.id)];const n=d&&d.nl?d.nl[S.user]||0:0;return `<button type="button" class="chip" data-act="recSel" data-v="dm:${u.id}" aria-pressed="${sel==='dm:'+u.id}"><span class="av">${iniciais(u.nome)}</span>${esc(curto(u.nome))}${n?` <span class="unread">${n}</span>`:''}</button>`;}).join('')}</div>`;
  h+=`<section class="wa aberta" style="grid-template-columns:minmax(0,1fr);height:clamp(460px,64vh,720px)"><div class="wa-main" style="display:flex"><div class="wa-head"><b style="font-size:18px">${esc(titulo)}</b></div><div class="msgs" style="background:var(--surface)">${conv.msgs.map(m=>`<div style="display:flex;gap:12px"><span class="av">${m.autor==='sis_Clinicas'?'SC':iniciais(m.autor)}</span><div><b>${esc(m.autor)}</b> <span class="small muted">${esc(m.hora)}</span><div style="white-space:pre-line">${esc(m.texto)}</div></div></div>`).join('')||`<p class="muted">${sistema?'Nenhum aviso ainda.':'Nenhum recado ainda. Escreva o primeiro.'}</p>`}</div>
    ${sistema?'<div class="compose"><span class="muted">Este canal só recebe avisos automáticos.</span></div>':`<div class="compose"><div style="display:flex;gap:10px;align-items:flex-end"><label class="sr" for="r-txt">Recado</label><textarea id="r-txt" rows="1" data-in="recTxt" data-enter="recEnviar" placeholder="Escreva um recado para ${esc(titulo)}">${esc(S.ui.recRasc)}</textarea><button type="button" class="btn primary" data-act="recEnviar" aria-label="Enviar" style="min-height:52px">${ic('send')}</button></div></div>`}</div></section>`;
  return h;
}
const PERIODOS={hoje:'Hoje',semana:'Últimos 7 dias',mes:'Últimos 30 dias',mesAtual:'Este mês'};
function periodo(){const h=hoje(),k=S.ui.relPer;if(k==='semana')return [somaDias(h,-6),h];if(k==='mes')return [somaDias(h,-29),h];if(k==='mesAtual')return [h.slice(0,8)+'01',h];return [h,h];}
function vRel(){
  const [ini,fim]=periodo(),dentro=d=>d>=ini&&d<=fim;
  const as=S.appts.filter(a=>dentro(a.dia)),ativos=as.filter(a=>a.status!=='cancelado'||a.motivo!=='Horário mudado');
  const atend=as.filter(a=>a.status==='atendido'),faltas=as.filter(a=>a.status==='faltou'),canc=as.filter(a=>a.status==='cancelado'&&a.motivo!=='Horário mudado');
  const pays=S.pays.filter(p=>dentro(p.data)),fat=pays.reduce((s,p)=>s+p.valor,0);
  const contaProf=y=>{const c=S.contas.find(k=>k.id===y.conta);const a=c&&c.appt?getAppt(c.appt):null;return a;};
  const tbl=(cab,rows)=>rows.length?`<div class="tbl"><table style="min-width:520px"><thead><tr>${cab.map((c,i)=>`<th${i?' class="num"':''}>${c}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((c,i)=>`<td${i?' class="num"':''}>${i?c:`<b>${esc(c)}</b>`}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:'<p class="muted">Sem dados no período.</p>';
  const porProf=profs().map(p=>{const x=as.filter(a=>a.prof===p.id);const f=pays.filter(y=>{const a=contaProf(y);return a&&a.prof===p.id;}).reduce((s,y)=>s+y.valor,0);return [curto(p.nome),x.filter(a=>a.status==='atendido').length,x.filter(a=>a.status==='faltou').length,x.filter(a=>a.status==='cancelado'&&a.motivo!=='Horário mudado').length,brl(f)];});
  const esp={};atend.forEach(a=>{const k=espNome((getUser(a.prof)||{}).espId)||'Sem especialidade';esp[k]=esp[k]||{n:0,f:0};esp[k].n++;});
  pays.forEach(y=>{const a=contaProf(y);if(a){const k=espNome((getUser(a.prof)||{}).espId)||'Sem especialidade';esp[k]=esp[k]||{n:0,f:0};esp[k].f+=y.valor;}});
  const proc={};atend.forEach(a=>{proc[a.proc]=(proc[a.proc]||0)+1;});
  const formas={};pays.forEach(p=>{const n=formaNome(p.forma);formas[n]=(formas[n]||0)+p.valor;});
  const mot={};canc.forEach(a=>{mot[a.motivo]=(mot[a.motivo]||0)+1;});
  const pq=S.pesquisas.filter(q=>q.nota!=null&&dentro(q.dia)),prom=pq.filter(q=>q.nota>=9).length,det=pq.filter(q=>q.nota<=6).length;
  const nps=pq.length?Math.round((prom-det)/pq.length*100):null;
  const notaProf=profs().map(p=>{const x=pq.filter(q=>q.prof===p.id);return x.length?[curto(p.nome),x.length,(x.reduce((s,q)=>s+q.nota,0)/x.length).toFixed(1).replace('.',',')]:null;}).filter(Boolean);
  const pct=(a,b)=>b?Math.round(a/b*100)+'%':'—';
  let h=head('Relatórios','Números calculados na hora. A lista final de relatórios ainda está em estudo.',`<button type="button" class="btn sm" data-act="relCsv">Baixar atendimentos (CSV)</button>`);
  h+=`<div class="chips">${Object.entries(PERIODOS).map(([k,l])=>`<button type="button" class="chip" data-act="relPer" data-v="${k}" aria-pressed="${S.ui.relPer===k}">${l}</button>`).join('')}</div>`;
  h+=`<div class="stats"><div class="stat"><span>Atendimentos</span><b class="big-num">${atend.length}</b></div><div class="stat"><span>Faturamento</span><b class="big-num" style="font-size:28px">${brl(fat)}</b></div><div class="stat"><span>Ticket médio</span><b class="big-num" style="font-size:28px">${atend.length?brl(Math.round(fat/atend.length)):'—'}</b></div><div class="stat"><span>Faltas</span><b class="big-num">${pct(faltas.length,faltas.length+atend.length)}</b></div><div class="stat"><span>Satisfação (NPS)</span><b class="big-num">${nps==null?'—':nps}</b></div></div>`;
  h+=`<section class="card"><h2>Por médico</h2>${tbl(['Médico','Atendidos','Faltas','Desmarcados','Recebido'],porProf)}</section>`;
  h+=`<div class="cols"><section class="card a" style="flex:1 1 320px"><h2>Especialidades</h2>${tbl(['Especialidade','Atendimentos','Faturamento'],Object.entries(esp).sort((a,b)=>b[1].n-a[1].n).map(([k,v])=>[k,v.n,brl(v.f)]))}</section>
    <section class="card b"><h2>Procedimentos mais feitos</h2>${tbl(['Procedimento','Quantidade'],Object.entries(proc).sort((a,b)=>b[1]-a[1]).slice(0,8))}</section></div>`;
  h+=`<div class="cols"><section class="card a" style="flex:1 1 320px"><h2>Faltas e cancelamentos</h2><dl class="summary"><dt>Faltas</dt><dd>${faltas.length}</dd><dt>Desmarcações</dt><dd>${canc.length}</dd><dt>Desmarcações tardias</dt><dd>${canc.filter(a=>a.tardia).length}</dd>${Object.entries(mot).map(([k,v])=>`<dt>${esc(k)}</dt><dd>${v}</dd>`).join('')}</dl></section>
    <section class="card b"><h2>Formas de pagamento</h2>${Object.keys(formas).length?`<dl class="summary">${Object.entries(formas).map(([k,v])=>`<dt>${esc(k)}</dt><dd class="num">${brl(v)}</dd>`).join('')}</dl>`:'<p class="muted">Sem pagamentos no período.</p>'}</section></div>`;
  h+=`<section class="card"><h2>Satisfação</h2>${pq.length?`<p style="font-size:18px">NPS <b>${nps}</b> · ${plural(pq.length,'resposta','respostas')} · ${prom} promotores (9–10), ${det} detratores (0–6).</p>${tbl(['Médico','Respostas','Nota média'],notaProf)}${pq.filter(q=>q.comentario).slice(-5).reverse().map(q=>`<div class="note neutral" style="font-weight:500"><span>“${esc(q.comentario)}” · nota ${q.nota}</span></div>`).join('')}`:'<p class="muted">Nenhuma resposta no período. As respostas são registradas na tela do WhatsApp.</p>'}</section>`;
  h+=`<section class="card"><h2>Confirmações e pendências</h2><p><b>${ativos.filter(a=>['confirmado','chegou','em_atendimento','atendido'].includes(a.status)).length}</b> de ${ativos.filter(a=>a.status!=='cancelado').length} consultas do período foram confirmadas ou atendidas. ${S.regs.filter(r=>r.status==='rascunho').length} consulta(s) ainda não finalizada(s).</p></section>`;
  return h;
}
function vHist(){
  const q=S.ui.histBusca.trim().toLowerCase(),l=S.audit.filter(x=>!q||(x.u+' '+x.a).toLowerCase().includes(q)).slice(0,300);
  return head('Histórico','Tudo o que foi feito no sistema, por quem e quando.')+`<div class="search">${ic('search',22)}<label class="sr" for="h-busca">Filtrar</label><input id="h-busca" type="search" value="${esc(S.ui.histBusca)}" data-in="histBusca" placeholder="Filtrar (ex.: prontuário, autorização, nome)"></div><section class="card"><div class="list">${l.map(x=>`<div class="item"><span class="when" style="font-size:16px">${x.d===hoje()?fmt(x.t):dm(x.d)+' '+fmt(x.t)}</span><div class="who" style="flex:1"><b style="font-size:16px">${esc(x.a)}</b><span class="sub">${esc(x.u)}</span></div></div>`).join('')||'<p class="muted">Nada registrado ainda.</p>'}</div></section>`;
}
function vTV(){
  const [a,...r]=S.chamadas.filter(c=>c.d===hoje());
  return head('Tela da sala de espera','Esta tela fica na TV. Mostra só o primeiro nome e a inicial do sobrenome.',`<button type="button" class="btn" data-act="tela">${ic('max')} Tela cheia</button>`)+
    `<div class="tv" id="tv"><div class="tv-top"><span>${esc(S.clinica.nome)}</span><b style="font-size:40px">${fmt(now())}</b></div><div class="tv-grid">${a?`<section class="tv-now" aria-live="polite"><span style="font-size:18px;letter-spacing:.12em;text-transform:uppercase;color:#A9E6DE;font-weight:700">Chamando agora</span><span class="nome">${esc(a.nome)}</span><span style="font-size:clamp(26px,3.5vw,40px);font-weight:700">${esc(a.sala)}</span><span style="font-size:22px;color:#D3ECE8">${esc(a.prof)}</span></section>`:`<section class="tv-now"><span style="font-size:clamp(28px,4vw,44px);font-weight:700">Bem-vindo!</span><span style="font-size:22px;color:#D3ECE8">Aguarde, você será chamado por esta tela.</span></section>`}<section class="tv-hist"><span style="font-size:16px;letter-spacing:.1em;text-transform:uppercase;color:var(--tv-muted);font-weight:700">Últimas chamadas</span>${r.slice(0,4).map(c=>`<div><span><b>${esc(c.nome)}</b><small>${esc(c.sala)}</small></span><span style="color:var(--tv-muted)">${fmt(c.hora)}</span></div>`).join('')}</section></div></div>`;
}

/* ---------- Configurações ---------- */
const CFG_TABS=[['clinica','Clínica'],['horarios','Horários'],['equipe','Equipe'],['autorizacoes','Autorizações'],['servicos','Serviços e exames'],['pagamentos','Pagamentos e caixas'],['faltas','Desmarcação e faltas'],['prontuario','Prontuário'],['whatsapp','WhatsApp'],['dados','Dados']];
function vConfig(){
  const tabs=can('config.gerenciar')?CFG_TABS:CFG_TABS.filter(t=>t[0]==='dados');
  if(!tabs.some(t=>t[0]===S.ui.cfgTab))S.ui.cfgTab=tabs[0][0];
  const tab=S.ui.cfgTab;
  let h=head('Configurações','Cada clínica configura as próprias regras. As alterações são salvas na hora.')+`<div class="chips cfg-tabs" role="group" aria-label="Seção">${tabs.map(([k,l])=>`<button type="button" class="chip" data-act="cfgTab" data-v="${k}" aria-pressed="${tab===k}">${l}</button>`).join('')}</div>`;
  h+={clinica:cfgClinica,horarios:cfgHorarios,equipe:cfgEquipe,autorizacoes:cfgAuth,servicos:cfgServicos,pagamentos:cfgPagamentos,faltas:cfgFaltas,prontuario:cfgProntuario,whatsapp:cfgWhats,dados:cfgDados}[tab]();
  return h;
}
const erroCfg=()=>S.ui.erro?`<p class="err">${esc(S.ui.erro)}</p>`:'';
const listaSimples=(itens,remAct,vazio)=>itens.length?`<div class="chips">${itens.map(x=>`<span class="pill neutral" style="font-size:15px">${esc(x.nome)} <button type="button" class="link" style="padding:0;min-height:0;color:inherit" data-act="${remAct}" data-id="${x.id}" aria-label="Remover ${esc(x.nome)}">${ic('x',14)}</button></span>`).join('')}</div>`:`<p class="muted">${vazio}</p>`;
function cfgClinica(){
  const c=S.clinica;
  return `<section class="card"><h2>Dados da clínica</h2><label class="field">Nome<input id="cf-nome" value="${esc(c.nome)}" data-in="cfg" data-f="nome"></label><label class="field">Endereço <span class="hint">usado nas mensagens do WhatsApp</span><input id="cf-end" value="${esc(c.endereco)}" data-in="cfg" data-f="endereco" placeholder="Rua, número, bairro, cidade"></label><label class="field">Telefone<input id="cf-fone" value="${esc(c.fone)}" data-in="cfg" data-f="fone" placeholder="(11) 0000-0000"></label></section>
    <div class="cols"><section class="card a" style="flex:1 1 300px"><h2>Especialidades</h2>${listaSimples(S.especialidades,'remEsp','Nenhuma especialidade cadastrada.')}<div class="row-add"><label class="sr" for="ne">Nova especialidade</label><input id="ne" class="inp" value="${esc(S.ui.novoEsp)}" data-in="uiF" data-f="novoEsp" data-enter="addEsp" placeholder="Ex.: Cardiologia"><button type="button" class="btn soft" data-act="addEsp">${ic('plus')} Adicionar</button></div></section>
    <section class="card b"><h2>Salas</h2>${listaSimples(S.salas,'remSala','Nenhuma sala cadastrada.')}<div class="row-add"><label class="sr" for="nsa">Nova sala</label><input id="nsa" class="inp" value="${esc(S.ui.novaSala)}" data-in="uiF" data-f="novaSala" data-enter="addSala" placeholder="Ex.: Consultório 1"><button type="button" class="btn soft" data-act="addSala">${ic('plus')} Adicionar</button></div></section></div>${erroCfg()}
    <p class="muted small">Neste esboço há uma unidade só; várias unidades entram com o servidor.</p>`;
}
const tIn=(id,v,ch,data,dis)=>`<input id="${id}" type="time" step="${S.clinica.intervalo*60}" value="${fmt(v)}" data-ch="${ch}" ${data}${dis?' disabled':''}>`;
function cfgHorarios(){
  const c=S.clinica,lst=profs();let pid=S.ui.horProf;if(!getUser(pid)||getUser(pid).role!=='medico')pid=S.ui.horProf=lst[0]?lst[0].id:null;
  let h=`<section class="card"><h2>Horário de funcionamento da clínica</h2><div class="grid2"><label class="field">Abre às${tIn('hc-abre',c.abre,'cfgHora','data-f="abre"')}</label><label class="field">Fecha às${tIn('hc-fecha',c.fecha,'cfgHora','data-f="fecha"')}</label><label class="field">Intervalo da agenda<select id="hc-int" class="inp" data-ch="cfgInt">${[10,15,20,30,60].map(n=>`<option value="${n}"${c.intervalo===n?' selected':''}>${n} min</option>`).join('')}</select></label></div><p class="muted small">O horário da clínica é o padrão de cada médico novo. O intervalo define de quanto em quanto tempo aparecem os horários livres.</p></section>`;
  if(!lst.length)return h+`<section class="card"><h2>Horário de cada médico</h2><p class="muted">Cadastre os médicos em Equipe para definir o horário de cada um.</p></section>`;
  const u=getUser(pid),nb=S.ui.novoBloq||(S.ui.novoBloq={dia:hoje(),ini:'12:00',fim:'13:00',motivo:''});
  h+=`<section class="card"><h2>Horário de cada médico</h2><div class="chips">${lst.map(p=>`<button type="button" class="chip" data-act="horProf" data-v="${p.id}" aria-pressed="${p.id===pid}"><span class="av">${iniciais(p.nome)}</span>${esc(curto(p.nome))}</button>`).join('')}</div>
    <div class="tbl"><table class="hor" style="min-width:600px"><thead><tr><th>Dia</th><th>Atende</th><th>Início</th><th>Fim</th><th>Almoço de</th><th>até</th></tr></thead><tbody>${[1,2,3,4,5,6,0].map(w=>{const x=u.horario[w],d=`data-w="${w}"`;return `<tr><td><b>${SEMANA[w]}</b></td><td><input id="hp-on-${w}" type="checkbox" class="chk" ${x.on?'checked':''} data-ch="horOn" ${d} aria-label="Atende ${SEMANA[w]}"></td><td>${tIn('hp-ini-'+w,x.ini,'horT',d+' data-f="ini"',!x.on)}</td><td>${tIn('hp-fim-'+w,x.fim,'horT',d+' data-f="fim"',!x.on)}</td><td>${tIn('hp-ai-'+w,x.almIni,'horT',d+' data-f="almIni"',!x.on)}</td><td>${tIn('hp-af-'+w,x.almFim,'horT',d+' data-f="almFim"',!x.on)}</td></tr>`;}).join('')}</tbody></table></div><p class="muted small">Para não ter almoço num dia, deixe o início e o fim do almoço iguais.</p></section>`;
  const bl=S.bloqs.filter(b=>b.prof===pid&&b.dia>=hoje()).sort((a,b)=>a.dia.localeCompare(b.dia)||a.ini-b.ini);
  h+=`<section class="card"><h2>Bloqueios de ${esc(curto(u.nome))} <span class="hint">férias, congresso, reunião</span></h2>${bl.length?`<div class="list">${bl.map(b=>`<div class="item"><span class="when" style="font-size:16px">${dm(b.dia)}</span><div class="who" style="flex:1"><b>${esc(b.motivo||'Bloqueio')}</b><span class="sub">${fmt(b.ini)} às ${fmt(b.fim)}</span></div><button type="button" class="link" data-act="remBloq" data-id="${b.id}">Remover</button></div>`).join('')}</div>`:'<p class="muted">Nenhum bloqueio futuro.</p>'}
    <div class="cfg-form"><div class="grid2"><label class="field">Dia<input id="nb-dia" type="date" value="${esc(nb.dia)}" min="${hoje()}" data-in="nbF" data-f="dia"></label><label class="field">De<input id="nb-ini" type="time" value="${esc(nb.ini)}" data-in="nbF" data-f="ini"></label><label class="field">Até<input id="nb-fim" type="time" value="${esc(nb.fim)}" data-in="nbF" data-f="fim"></label><label class="field">Motivo<input id="nb-mot" value="${esc(nb.motivo)}" data-in="nbF" data-f="motivo" placeholder="Ex.: congresso"></label></div>${erroCfg()}<div class="chips"><button type="button" class="btn soft" data-act="addBloq">${ic('plus')} Bloquear horário</button><button type="button" class="link" data-act="bloqDia">Dia inteiro</button></div></div></section>`;
  return h;
}
function cfgEquipe(){
  const n=S.ui.novoU||(S.ui.novoU=novoUForm()),ed=!!n.id;
  const sel=(id,f,lista,vazio)=>`<select id="${id}" class="inp" data-ch="nuSel" data-f="${f}"><option value="">${vazio}</option>${lista.map(x=>`<option value="${x.id}"${n[f]===x.id?' selected':''}>${esc(x.nome)}</option>`).join('')}</select>`;
  return `<section class="card"><h2>Equipe <span class="pill neutral">${S.users.length}</span></h2><div class="list">${S.users.map(u=>`<div class="item"><span class="av">${iniciais(u.nome)}</span><div class="who" style="flex:1 1 220px"><b>${esc(u.nome)}${u.id===S.user?' (você)':''}</b><span class="sub">${esc(papel(u))}${u.role==='medico'?' · '+esc(salaNome(u.salaId)||'sem sala')+(u.crm?' · '+esc(u.crm):'')+' · '+esc(CERTS[u.cert||'nenhum']):''}</span></div><span class="pill ${u.role==='gestor'?'accent':u.role==='medico'?'info':'neutral'}">${ROLES[u.role]}</span><button type="button" class="link" data-act="editU" data-id="${u.id}">Editar</button>${u.id===S.user?'':`<button type="button" class="link" data-act="remU" data-id="${u.id}">Remover</button>`}</div>`).join('')}</div>
    <div class="cfg-form"><h2>${ed?'Editar '+esc(n.nome):'Adicionar pessoa'}</h2><label class="field">Nome completo<input id="nu-nome" value="${esc(n.nome)}" data-in="novoU" data-f="nome" placeholder="Ex.: Dra. Ana Lima"></label>
    <div class="field">Perfil<div class="chips">${Object.entries(ROLES).map(([k,l])=>`<button type="button" class="chip" data-act="novoRole" data-v="${k}" aria-pressed="${n.role===k}"${ed&&n.id===S.user?' disabled':''}>${l}</button>`).join('')}</div></div>
    ${n.role==='medico'?`<div class="grid2"><label class="field">Especialidade${sel('nu-esp','espId',S.especialidades,'Escolha')}</label><label class="field">Sala${sel('nu-sala','salaId',S.salas,'Escolha')}</label><label class="field">CRM<input id="nu-crm" value="${esc(n.crm)}" data-in="novoU" data-f="crm" placeholder="CRM-SP 000000"></label></div>
      <div class="field">Certificado digital<div class="chips">${Object.entries(CERTS).map(([k,l])=>`<button type="button" class="chip" data-act="novoCert" data-v="${k}" aria-pressed="${n.cert===k}">${l}</button>`).join('')}</div><span class="hint">Com token A3, o médico instala o assinador no PC dele (chega com o servidor).</span></div>
      ${!S.especialidades.length||!S.salas.length?'<p class="muted small">Cadastre especialidades e salas na aba Clínica para escolher aqui.</p>':''}`:''}
    ${erroCfg()}<div class="chips"><button type="button" class="btn primary" data-act="addU">${ed?ic('check')+' Salvar':ic('userplus')+' Adicionar'}</button>${ed?'<button type="button" class="btn" data-act="cancelU">Cancelar</button>':''}</div><p class="muted small">O horário de cada médico é ajustado na aba Horários; o que cada pessoa pode fazer, na aba Autorizações.</p></div></section>`;
}
function cfgAuth(){
  const P=S.perfis;let uid2=S.ui.authUser;if(!getUser(uid2))uid2=S.ui.authUser=S.users[0].id;const u=getUser(uid2);
  const chk=(r,k)=>{const lock=r==='gestor'&&k==='config.gerenciar';return `<input id="pp-${r}-${k.replace('.','-')}" type="checkbox" class="chk" ${P[r][k]?'checked':''}${lock?' disabled title="A gestão sempre gerencia as configurações"':''} data-ch="permPerfil" data-r="${r}" data-p="${k}" aria-label="${ROLES[r]}: ${esc(k)}">`;};
  let h=`<section class="card"><h2>Por perfil</h2><p class="muted">O que cada perfil pode fazer. Vale para todas as pessoas do perfil, exceto as exceções abaixo.</p><div class="tbl"><table style="min-width:560px"><thead><tr><th>Ação</th>${Object.values(ROLES).map(l=>`<th class="num">${l}</th>`).join('')}</tr></thead><tbody>${PERMS.map(([k,l])=>`<tr><td>${esc(l)}</td>${Object.keys(ROLES).map(r=>`<td class="num">${chk(r,k)}</td>`).join('')}</tr>`).join('')}
    <tr><td>Desconto máximo (%)</td>${Object.keys(ROLES).map(r=>`<td class="num"><input id="pd-${r}" class="inp num-in" inputmode="numeric" value="${esc(P[r].descMax)}" data-in="descPerfil" data-r="${r}" aria-label="Desconto máximo ${ROLES[r]}"></td>`).join('')}</tr>
    <tr><td>Ler e escrever prontuário</td><td class="num">—</td><td class="num">${ic('check',16)}</td><td class="num">—</td></tr></tbody></table></div><p class="muted small">${ic('lock',14)} Prontuário: só médicos, sempre. É regra de sigilo e não pode ser alterada.</p></section>`;
  const ov=u.perms||{};
  h+=`<section class="card"><h2>Exceções por pessoa</h2><div class="chips">${S.users.map(x=>`<button type="button" class="chip" data-act="authUser" data-v="${x.id}" aria-pressed="${x.id===uid2}">${esc(curto(x.nome))}${x.perms&&Object.keys(x.perms).length||x.descMax!=null&&x.descMax!==''?' •':''}</button>`).join('')}</div>
    <p class="muted">${esc(u.nome)} · perfil ${ROLES[u.role]}. Escolha "Do perfil" para seguir a regra do perfil.</p>
    <div class="list">${PERMS.map(([k,l])=>{const v=typeof ov[k]==='boolean'?(ov[k]?'sim':'nao'):'perfil';const dp=P[u.role][k]?'sim':'não';return `<div class="item"><span style="flex:1 1 220px">${esc(l)}</span><select id="pu-${k.replace('.','-')}" class="inp" style="width:auto" data-ch="permUser" data-p="${k}"><option value="perfil"${v==='perfil'?' selected':''}>Do perfil (${dp})</option><option value="sim"${v==='sim'?' selected':''}>Permitir</option><option value="nao"${v==='nao'?' selected':''}>Negar</option></select></div>`;}).join('')}
    <div class="item"><span style="flex:1 1 220px">Desconto máximo (%) <span class="hint">vazio = do perfil (${esc(P[u.role].descMax)}%)</span></span><input id="pu-desc" class="inp num-in" inputmode="numeric" value="${esc(u.descMax==null?'':u.descMax)}" data-in="descUser"></div></div></section>`;
  return h;
}
function cfgServicos(){
  const n=S.ui.novoS||(S.ui.novoS=novoSForm()),ed=!!n.id;
  return `<section class="card"><h2>Serviços e exames</h2>${S.servicos.length?`<div class="list">${S.servicos.map(s=>`<div class="item"><div class="who" style="flex:1 1 220px"><b>${esc(s.nome)}</b><span class="sub">${TIPOS_SERV[s.tipo]} · ${durTxt(s.dur)}${s.preparo?' · preparo: '+esc(s.preparo):''}</span></div><b>${s.preco?brl(s.preco):'Sem custo'}</b><button type="button" class="link" data-act="editS" data-id="${s.id}">Editar</button><button type="button" class="link" data-act="remS" data-id="${s.id}">Remover</button></div>`).join('')}</div>`:'<p class="muted">Nenhum serviço cadastrado. Ex.: Consulta, Retorno, Exame de sangue, Exame de urina, Exame de vista.</p>'}
    <div class="cfg-form"><h2>${ed?'Editar '+esc(n.nome):'Adicionar serviço ou exame'}</h2><div class="field">Tipo<div class="chips">${Object.entries(TIPOS_SERV).map(([k,l])=>`<button type="button" class="chip" data-act="novoTipo" data-v="${k}" aria-pressed="${n.tipo===k}">${l}</button>`).join('')}</div></div>
    <div class="grid2"><label class="field">Nome<input id="ns-nome" value="${esc(n.nome)}" data-in="novoS" data-f="nome" placeholder="Ex.: Exame de sangue"></label><label class="field">Duração (minutos)<input id="ns-dur" type="number" min="5" max="480" step="5" value="${esc(n.dur)}" data-in="novoS" data-f="dur"></label><label class="field">Valor (R$) <span class="hint">0 para sem custo</span><input id="ns-preco" inputmode="decimal" value="${esc(n.preco)}" data-in="novoS" data-f="preco" placeholder="350,00"></label></div>
    <label class="field">Preparo <span class="hint">opcional, vai na mensagem de confirmação</span><input id="ns-prep" value="${esc(n.preparo)}" data-in="novoS" data-f="preparo" placeholder="Ex.: jejum de 8 horas"></label>
    ${erroCfg()}<div class="chips"><button type="button" class="btn primary" data-act="addS">${ed?ic('check')+' Salvar':ic('plus')+' Adicionar'}</button>${ed?'<button type="button" class="btn" data-act="cancelS">Cancelar</button>':''}</div></div></section>`;
}
function cfgPagamentos(){
  return `<section class="card"><h2>Formas de pagamento</h2><p class="muted">Ligue as formas que a clínica aceita. Só as ligadas aparecem na hora de receber.</p><div class="list">${S.formas.map(f=>`<div class="item"><label class="switch" style="flex:1 1 220px"><input id="fp-${f.id}" type="checkbox" ${f.ativa?'checked':''} data-ch="formaOn" data-id="${f.id}"> ${esc(f.nome)}</label>${f.tipo==='credito'?`<label class="small">Parcelas até <select id="fpp-${f.id}" class="inp" style="width:auto;display:inline-block" data-ch="formaParc" data-id="${f.id}">${[1,2,3,4,5,6,10,12].map(n=>`<option${f.parcMax===n?' selected':''}>${n}</option>`).join('')}</select></label>`:''}${f.tipo==='outra'?`<button type="button" class="link" data-act="remForma" data-id="${f.id}">Remover</button>`:''}</div>`).join('')}</div>
    <div class="row-add"><label class="sr" for="nf">Outra forma</label><input id="nf" class="inp" value="${esc(S.ui.novaForma)}" data-in="uiF" data-f="novaForma" data-enter="addForma" placeholder="Outra forma (ex.: vale-saúde)"><button type="button" class="btn soft" data-act="addForma">${ic('plus')} Adicionar</button></div></section>
    <section class="card"><h2>Caixas</h2><p class="muted">Uma clínica pode ter um ou vários caixas. Quem abre e fecha é definido em Autorizações.</p><div class="list">${S.caixas.map(c=>`<div class="item"><b style="flex:1">${esc(c.nome)}</b><span class="pill ${sessaoDe(c.id)?'ok':'neutral'}">${sessaoDe(c.id)?'Aberto':'Fechado'}</span>${S.caixas.length>1?`<button type="button" class="link" data-act="remCaixa" data-id="${c.id}">Remover</button>`:''}</div>`).join('')}</div>
    <div class="row-add"><label class="sr" for="ncx">Novo caixa</label><input id="ncx" class="inp" value="${esc(S.ui.novoCaixa)}" data-in="uiF" data-f="novoCaixa" data-enter="addCaixa" placeholder="Ex.: Recepção 2"><button type="button" class="btn soft" data-act="addCaixa">${ic('plus')} Adicionar</button></div>${erroCfg()}</section>`;
}
function cfgFaltas(){
  const p=S.clinica.politica;
  return `<section class="card"><h2>Desmarcação</h2><label class="field">Prazo mínimo para o paciente desmarcar (horas antes)<input id="pf-prazo" type="number" min="0" max="168" value="${esc(p.prazoHoras)}" data-in="pol" data-f="prazoHoras"></label><p class="muted small">Desmarcar com menos antecedência conta como <b>desmarcação tardia</b>.</p>
    <label class="switch"><input id="pf-ct" type="checkbox" ${p.cobrarTardia?'checked':''} data-ch="polChk" data-f="cobrarTardia"> Cobrar taxa por desmarcação tardia</label></section>
    <section class="card"><h2>Faltas</h2><div class="grid2"><label class="field">Avisar a partir de quantas faltas<input id="pf-n" type="number" min="1" max="20" value="${esc(p.faltasN)}" data-in="pol" data-f="faltasN"></label><label class="field">Nos últimos (dias)<input id="pf-d" type="number" min="7" max="365" value="${esc(p.faltasDias)}" data-in="pol" data-f="faltasDias"></label></div>
    <div class="field">Ao marcar para quem chegou ao limite<div class="pick">${[['alerta','Só avisar','A recepção vê o aviso e marca normalmente'],['gestao','Exigir a gestão','Só quem gerencia as configurações consegue marcar']].map(([k,l,s])=>`<button type="button" class="opt" data-act="polAcao" data-v="${k}" aria-pressed="${p.acaoFaltas===k}"><span><b>${l}</b><span class="s">${s}</span></span></button>`).join('')}</div></div>
    <label class="switch"><input id="pf-cf" type="checkbox" ${p.cobrarFalta?'checked':''} data-ch="polChk" data-f="cobrarFalta"> Cobrar taxa por falta</label>
    ${p.cobrarFalta||p.cobrarTardia?`<label class="field">Valor da taxa (R$)<input id="pf-taxa" inputmode="decimal" value="${esc(p.taxa)}" data-in="pol" data-f="taxa" placeholder="50,00"></label><p class="muted small">A taxa vira uma conta a receber do paciente.</p>`:''}</section>`;
}
function cfgProntuario(){
  const md=S.ui.modeloEd,modo=S.clinica.prontuario.modo;
  let h=`<section class="card"><h2>Quem lê o prontuário</h2><div class="pick">${[['compartilhado','Compartilhado','Todos os médicos da clínica leem o prontuário do paciente'],['autor','Só do autor','Cada médico lê apenas os próprios registros']].map(([k,l,s])=>`<button type="button" class="opt" data-act="prontModo" data-v="${k}" aria-pressed="${modo===k}"><span><b>${l}</b><span class="s">${s}</span></span></button>`).join('')}</div><p class="muted small">Nos dois casos, o médico pode marcar um registro como <b>sigiloso</b>: só ele lê o conteúdo.</p></section>`;
  h+=`<section class="card"><h2>Modelos de prontuário</h2><p class="muted">Os modelos do sistema servem para qualquer clínica. Copie e ajuste para criar os da sua clínica. O modelo de uma especialidade é usado automaticamente pelos médicos dela.</p><div class="list">${todosModelos().map(m=>`<div class="item"><div class="who" style="flex:1 1 220px"><b>${esc(m.nome)}</b><span class="sub">${m.sistema?'Padrão do sistema':m.espId?esc(espNome(m.espId)):'Da clínica'} · ${m.secoes.map(esc).join(' · ')}</span></div><button type="button" class="link" data-act="modCopiar" data-id="${m.id}">Copiar</button>${m.sistema?'':`<button type="button" class="link" data-act="modEditar" data-id="${m.id}">Editar</button><button type="button" class="link" data-act="modRem" data-id="${m.id}">Remover</button>`}</div>`).join('')}</div>
    ${md?`<div class="cfg-form"><h2>${md.id?'Editar modelo':'Novo modelo'}</h2><div class="grid2"><label class="field">Nome<input id="md-nome" value="${esc(md.nome)}" data-in="mdF"></label><label class="field">Especialidade<select id="md-esp" class="inp" data-ch="mdEsp"><option value="">Nenhuma (geral)</option>${S.especialidades.map(e=>`<option value="${e.id}"${md.espId===e.id?' selected':''}>${esc(e.nome)}</option>`).join('')}</select></label></div>
      <div class="field">Seções <span class="hint">cada seção vira um campo de texto na consulta; sinais vitais e CID já vêm em todos</span>${md.secoes.map((s,i)=>`<div class="row-add"><input id="md-s-${i}" class="inp" value="${esc(s)}" data-in="mdSec" data-i="${i}" aria-label="Seção ${i+1}"><button type="button" class="btn sm" data-act="mdSecRem" data-i="${i}" aria-label="Tirar seção">${ic('x',16)}</button></div>`).join('')}<div><button type="button" class="btn sm soft" data-act="mdSecAdd">${ic('plus',16)} Seção</button></div></div>
      ${erroCfg()}<div class="chips"><button type="button" class="btn primary" data-act="mdSalvar">${ic('check')} Salvar modelo</button><button type="button" class="btn" data-act="mdCancelar">Cancelar</button></div></div>`:`<div><button type="button" class="btn soft" data-act="modNovo">${ic('plus')} Novo modelo</button></div>`}</section>`;
  return h;
}
function cfgWhats(){
  const w=S.clinica.whatsapp,m=S.clinica.msgs;
  let h=`<section class="card"><h2>Forma de conexão</h2><div class="pick" style="grid-template-columns:1fr">${Object.entries(WA_FORMAS).map(([k,[l,s]])=>`<button type="button" class="opt" data-act="waForma" data-v="${k}" aria-pressed="${w.forma===k}"><span><b>${l}${k==='naooficial'?' <span class="pill bad" style="font-size:12px">risco</span>':''}</b><span class="s">${s}</span></span></button>`).join('')}</div>
    ${w.forma==='oficial'?'<div class="note info"><span>Simulação: a conexão com a Meta (verificação da empresa e número) é feita quando o servidor estiver pronto.</span></div>':''}
    ${w.forma==='naooficial'?`<div class="note warn"><span>Termo de risco aceito por ${esc(w.termo.por)} em ${esc(w.termo.em)}. Simulação: o QR Code para conectar o WhatsApp aparece aqui quando o servidor estiver pronto.</span></div>`:''}
    <p class="muted small">No início, a clínica precisa de um WhatsApp Business. Neste esboço, todas as formas enviam pelo link wa.me.</p></section>`;
  h+=`<section class="card"><h2>Mensagens automáticas</h2><p class="muted small">Variáveis: ${esc(VARS_MSG)}</p>
    <label class="field">Confirmação ao marcar<textarea id="wm-conf" rows="3" data-in="msgF" data-f="confirmacao">${esc(m.confirmacao)}</textarea></label>
    <div class="grid2"><label class="field">Lembrete enviado<select id="wm-dias" class="inp" data-ch="msgDias">${[[0,'No mesmo dia'],[1,'1 dia antes'],[2,'2 dias antes'],[3,'3 dias antes']].map(([v,l])=>`<option value="${v}"${+m.lembreteDias===v?' selected':''}>${l}</option>`).join('')}</select></label></div>
    <label class="field">Texto do lembrete<textarea id="wm-lem" rows="3" data-in="msgF" data-f="lembrete">${esc(m.lembrete)}</textarea></label>
    <label class="switch"><input id="wm-pq" type="checkbox" ${m.pesquisa?'checked':''} data-ch="msgPesq"> Pesquisa de satisfação depois do atendimento</label>
    ${m.pesquisa?`<label class="field">Texto da pesquisa<textarea id="wm-pqt" rows="3" data-in="msgF" data-f="pesquisaTexto">${esc(m.pesquisaTexto)}</textarea></label>`:''}</section>`;
  return h;
}
function cfgDados(){
  const imp=S.ui.imp;
  let h='';
  if(can('dados.importar')){
    h+=`<section class="card"><h2>Importar pacientes</h2><p class="muted">Para clínicas que vêm de planilhas ou de outro sistema. Baixe o modelo, preencha no Excel e envie em CSV (separado por ponto e vírgula).</p>
      <div class="chips"><button type="button" class="btn" data-act="impModelo">Baixar modelo (CSV)</button><label class="btn soft" for="imp-arq">${ic('upload')} Escolher arquivo</label><input id="imp-arq" type="file" accept=".csv,text/csv,text/plain" class="sr" data-ch="impArq"></div>
      ${imp?`<div class="cfg-form"><h2>Prévia: ${esc(imp.arquivo)}</h2><div class="stats"><div class="stat"><span>Prontos para importar</span><b class="big-num">${imp.ok.length}</b></div><div class="stat"><span>Duplicados (ignorados)</span><b class="big-num">${imp.dup.length}</b></div><div class="stat"><span>Com erro</span><b class="big-num">${imp.erros.length}</b></div></div>
        ${imp.erros.length?`<details class="more" open><summary>Erros linha a linha</summary>${imp.erros.slice(0,30).map(e=>`<div class="small">Linha ${e.linha}: ${esc(e.motivo)}</div>`).join('')}${imp.erros.length>30?`<div class="small muted">e mais ${imp.erros.length-30}…</div>`:''}</details>`:''}
        ${imp.dup.length?`<details class="more"><summary>Duplicados</summary>${imp.dup.slice(0,30).map(e=>`<div class="small">Linha ${e.linha}: ${esc(e.nome)} (${esc(e.motivo)})</div>`).join('')}</details>`:''}
        <div class="chips"><button type="button" class="btn primary" data-act="impConfirmar"${imp.ok.length?'':' disabled'}>Importar ${plural(imp.ok.length,'paciente','pacientes')}</button><button type="button" class="btn" data-act="impCancelar">Cancelar</button></div></div>`:''}
      ${S.importacoes.length?`<h2 style="margin-top:8px">Importações feitas</h2><div class="list">${S.importacoes.slice().reverse().map(i=>`<div class="item"><div class="who" style="flex:1 1 220px"><b>${esc(i.arquivo)}</b><span class="sub">${dm(i.data)} · ${esc(i.por)} · ${plural(i.ids.length,'paciente','pacientes')}${i.desfeita?' · desfeita':''}</span></div>${i.desfeita?'':`<button type="button" class="link" data-act="impDesfazer" data-id="${i.id}">Desfazer</button>`}</div>`).join('')}</div>`:''}</section>`;
  }
  if(can('config.gerenciar'))h+=`<section class="card"><h2>Dados deste navegador</h2><p class="muted">Neste esboço, tudo fica salvo só neste navegador. Com o servidor, os dados passam para o banco PostgreSQL.</p><div class="chips"><button type="button" class="btn" data-act="exportar">Baixar cópia dos dados (JSON)</button><button type="button" class="btn${S.ui.apagarArmado?' danger':''}" data-act="apagar">${S.ui.apagarArmado?'Toque de novo para apagar tudo':'Apagar todos os dados'}</button></div></section>`;
  return h;
}

/* ---------- folhas (janelas) ---------- */
function sheet(){
  const m=S.ui.sheet;if(!m)return '';
  const body={agendar:shAgendar,appt:shAppt,receber:shReceber,caixa:shCaixa,abrirCx:shAbrirCx,doc:shDoc,finalizar:shFinalizar,novoPac:shNovoPac,termo:shTermo,nota:shNota}[m.type](m);
  return `<div class="overlay" data-act="overlay"><div class="sheet" role="dialog" aria-modal="true">${body}</div></div>`;
}
const sh=(t,p)=>`<div class="sheet-h"><div><h2 style="font-size:24px">${t}</h2>${p?`<p>${p}</p>`:''}</div><button type="button" class="x" data-act="fechar" aria-label="Fechar">${ic('x')}</button></div>`;
const durWiz=m=>m.remarcar?getAppt(m.remarcar).dur:(getServ(m.serv)||{dur:S.clinica.intervalo}).dur;
const servChips=m=>`<div class="field">Tipo de atendimento<div class="chips">${S.servicos.map(s=>`<button type="button" class="chip" data-act="wizServ" data-v="${s.id}" aria-pressed="${m.serv===s.id}">${esc(s.nome)} <span class="hint">${durTxt(s.dur)}</span></button>`).join('')}</div></div>`;
function shAgendar(m){
  const step=m.steps[m.i];const bar=`<div class="steps">${m.steps.map((_,i)=>`<i class="${i<=m.i?'on':''}"></i>`).join('')}</div>`;
  const back=m.i>0?`<button type="button" class="btn" data-act="wizVoltar">${ic('left')} Voltar</button>`:'';
  const titulo=m.remarcar?'Mudar horário':'Marcar consulta';
  if(step==='pac'){
    const q=(m.busca||'').trim().toLowerCase(),qd=q.replace(/\D/g,'');
    const l=q.length>=2?S.pacs.filter(p=>p.nome.toLowerCase().includes(q)||(qd.length>=3&&p.cel.replace(/\D/g,'').includes(qd))).slice(0,6):[];
    return sh(titulo,`Passo ${m.i+1} de ${m.steps.length}: quem é o paciente?`)+bar+(m.novo?`<label class="field">Nome completo<input id="w-nome" value="${esc(m.nome||'')}" data-in="wiz" data-f="nome"></label><label class="field">Celular com DDD<input id="w-cel" value="${esc(m.cel||'')}" data-in="wiz" data-f="cel" placeholder="(11) 90000-0000" inputmode="tel"></label>${m.erro?`<p class="err">${esc(m.erro)}</p>`:''}<div class="chips"><button type="button" class="btn primary" data-act="wizNovoOk">Continuar</button>${S.pacs.length?'<button type="button" class="btn" data-act="wizNovo" data-v="0">Buscar paciente cadastrado</button>':''}</div>`
      :`<div class="search">${ic('search',22)}<label class="sr" for="w-busca">Nome ou telefone</label><input id="w-busca" type="search" value="${esc(m.busca||'')}" data-in="wiz" data-f="busca" placeholder="Digite o nome ou o telefone"></div>${l.length?`<div class="pick">${l.map(p=>`<button type="button" class="opt" data-act="wizPac" data-id="${p.id}"><span class="av">${iniciais(p.nome)}</span><span><b>${esc(p.nome)}</b><span class="s">${idTxt(p)}${esc(p.cel)}</span></span></button>`).join('')}</div>`:q.length>=2?'<p class="muted">Nenhum paciente com esse nome.</p>':'<p class="muted">Digite pelo menos 2 letras.</p>'}<button type="button" class="btn soft" data-act="wizNovo" data-v="1">${ic('userplus')} É um paciente novo</button>`);
  }
  if(step==='prof'){
    return sh(titulo,`Passo ${m.i+1} de ${m.steps.length}: com qual médico?`)+bar+`<div class="pick">${profs().map(p=>{const nx=proximoLivre(p.id,durWiz(m));return `<button type="button" class="opt" data-act="wizProf" data-v="${p.id}" aria-pressed="${m.prof===p.id}"><span class="av">${iniciais(p.nome)}</span><span><b>${esc(p.nome)}</b><span class="s">${esc(espNome(p.espId)||'Médico(a)')}${nx?' · próximo livre: '+quando(nx.d,nx.t).toLowerCase():' · sem horário livre em 14 dias'}</span></span></button>`;}).join('')}</div>
      ${m.prof?servChips(m):''}
      <div class="chips">${back}<button type="button" class="btn primary" data-act="wizProx"${m.prof?'':' disabled'}>Continuar</button></div>`;
  }
  if(step==='quando'){
    const hs=horarios(m.prof,m.d,durWiz(m));const vis=m.todos?hs:hs.filter(x=>x.livre);const hd=hDia(m.prof,m.d);
    return sh(titulo,`Passo ${m.i+1} de ${m.steps.length}: qual dia e horário? ${esc(profNome(m.prof))}`)+bar+`<div class="chips scroll-x">${diasAgenda().map(x=>{const o=hDia(m.prof,x);return `<button type="button" class="chip" data-act="wizDia" data-v="${x}" aria-pressed="${m.d===x}"${o&&o.on?'':' disabled'}>${rotDia(x)}</button>`;}).join('')}</div>
      ${!hd||!hd.on?'<p class="muted">O médico não atende neste dia.</p>':vis.length?`<div class="times">${vis.map(x=>`<button type="button" class="${x.livre?'':'busy'}" data-act="wizHora" data-v="${x.t}">${fmt(x.t)}</button>`).join('')}</div>`:'<p class="muted">Nenhum horário livre neste dia. Escolha outro dia.</p>'}
      ${m.remarcar||!can('agenda.encaixe')?'':`<button type="button" class="link" data-act="wizTodos">${m.todos?'Mostrar só horários livres':'Precisa encaixar? Mostrar horários ocupados também'}</button>`}<div class="chips">${back}</div>`;
  }
  const p=m.pac?getPac(m.pac):null,serv=getServ(m.serv),dur=durWiz(m),cg=conflitoGrade(m.prof,m.d,m.t,dur),ca=conflitoAgenda(m.prof,m.d,m.t,dur,m.remarcar);
  const nomeP=p?p.nome:m.nome;const semWpp=p&&!p.consWpp;const nf=p?faltasRecentes(p.id):0,pol=S.clinica.politica;
  const limite=!m.remarcar&&nf>=+pol.faltasN,trava=limite&&pol.acaoFaltas==='gestao'&&!can('config.gerenciar');
  const dv=p?devendo(p.id):0;
  return sh(titulo,`Passo ${m.i+1} de ${m.steps.length}: confira e confirme`)+bar+`<dl class="summary"><dt>Paciente</dt><dd>${esc(nomeP)}</dd><dt>Médico</dt><dd>${esc(profNome(m.prof))}</dd><dt>Quando</dt><dd>${rotLongo(m.d)}, ${fmt(m.t)}</dd>${m.remarcar?'':`<dt>Tipo</dt><dd>${esc(serv?serv.nome:'—')} · ${durTxt(dur)}${serv&&serv.preco?' · '+brl(serv.preco):' · sem custo'}</dd>${serv&&serv.preparo?`<dt>Preparo</dt><dd>${esc(serv.preparo)}</dd>`:''}`}</dl>
    ${!m.remarcar&&!m.steps.includes('prof')?servChips(m):''}
    ${limite?`<div class="note ${trava?'bad':'warn'}"><span>${esc(curto(nomeP))} tem ${plural(nf,'falta ou desmarcação tardia','faltas ou desmarcações tardias')} nos últimos ${pol.faltasDias} dias.${trava?' Pela política da clínica, só a gestão pode marcar.':''}</span></div>`:''}
    ${dv>0?`<div class="note warn"><span>Este paciente tem ${brl(dv)} para pagar.</span></div>`:''}
    ${cg?`<div class="note bad"><span>${esc(cg)} Escolha outro horário.</span></div>`:ca?`<div class="note ${m.todos?'warn':'bad'}"><span>${esc(ca)} ${m.todos?'Vai ficar como encaixe.':'Escolha outro horário.'}</span></div>`:''}
    <label class="switch"><input id="w-wpp" type="checkbox"${m.wpp&&!semWpp?' checked':''}${semWpp?' disabled':''} data-ch="wizWpp"> ${m.remarcar?'Avisar o paciente pelo WhatsApp':'Mandar a confirmação pelo WhatsApp'}${semWpp?' (paciente não autorizou)':''}</label>
    ${m.erro?`<p class="err">${esc(m.erro)}</p>`:''}
    <div class="chips">${back}<button type="button" class="btn primary big" style="flex:1" data-act="wizOk"${cg||(ca&&!m.todos)||trava||(!serv&&!m.remarcar)?' disabled':''}>${ic('check',22)} ${m.remarcar?'Mudar para este horário':'Confirmar consulta'}</button></div>`;
}
function shAppt(m){
  const a=getAppt(m.id);if(!a)return sh('Consulta não encontrada');
  const p=getPac(a.pac),r=role(),own=r==='medico'&&me().id===a.prof,c=contaDe(a),deve=c&&faltaConta(c)>0,dv=devendo(a.pac)-(deve?faltaConta(c):0);
  const ehHoje=a.dia===hoje(),ch=can('recepcao.chegada'),rc=can('pagamento.receber'),mk=can('agenda.marcar')&&(r!=='medico'||own);
  let h=sh(esc(p.nome),`${esc(a.proc)} com ${esc(profNome(a.prof))} · ${durTxt(a.dur)}`)+`<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><span style="font-size:22px;font-weight:700">${rotLongo(a.dia)}, ${fmt(a.t)}</span>${pill(a.status)}${a.encaixe?'<span class="pill warn">Encaixe</span>':''}${a.tardia?'<span class="pill bad">Desmarcação tardia</span>':''}</div>`;
  if(p.alergias&&r==='medico')h+=`<div class="pill bad">${ic('alert',14)} Alergia: ${esc(p.alergias)}</div>`;
  if(a.preparo)h+=`<div class="note info"><span>Preparo: ${esc(a.preparo)}</span></div>`;
  if(dv>0&&front())h+=`<div class="note bad"><span>Este paciente tem ${brl(dv)} para pagar de antes.</span></div>`;
  if(m.desmarcar){
    const tard=ehTardia(a,m.motivo),pol=S.clinica.politica;
    return h+`<div class="field">Por que vai desmarcar?<div class="pick" style="grid-template-columns:1fr">${MOTIVOS.map(x=>`<button type="button" class="opt" data-act="motivo" data-v="${esc(x)}" aria-pressed="${m.motivo===x}"><b>${x}</b></button>`).join('')}</div></div>
      ${tard?`<div class="note warn"><span>Faltam menos de ${pol.prazoHoras} h: conta como <b>desmarcação tardia</b>${pol.cobrarTardia&&parseBRL(pol.taxa)>0?' e gera uma taxa de '+brl(parseBRL(pol.taxa)):''}.</span></div>`:''}
      <label class="switch"><input id="d-avisar" type="checkbox"${m.avisar&&p.consWpp?' checked':''}${p.consWpp?'':' disabled'} data-ch="desAvisar"> Avisar o paciente pelo WhatsApp${p.consWpp?'':' (não autorizou)'}</label><div class="chips"><button type="button" class="btn" data-act="desVoltar">${ic('left')} Voltar</button><button type="button" class="btn danger big" style="flex:1" data-act="desOk"${m.motivo?'':' disabled'}>Desmarcar consulta</button></div>`;
  }
  let main='';
  if(['agendado','confirmado'].includes(a.status)&&ehHoje&&ch)main=`<button type="button" class="btn primary big full" data-act="chegou" data-id="${a.id}">${ic('login',22)} Paciente chegou</button>`;
  else if(a.status==='chegou'&&own)main=`<button type="button" class="btn primary big full" data-act="chamar" data-id="${a.id}">${ic('speaker',22)} Chamar paciente</button>`;
  else if(a.status==='chegou'&&front())main=deve&&rc?`<button type="button" class="btn primary big full" data-act="receber" data-id="${c.id}">Receber ${brl(faltaConta(c))}</button>`:`<div class="note warn"><span>Na sala de espera há ${Math.max(0,now()-a.chegou)} min. O médico chama pelo sistema.</span></div>`;
  else if(a.status==='em_atendimento'&&own)main=`<button type="button" class="btn primary big full" data-act="abrirConsulta" data-id="${a.id}">Abrir a consulta</button>`;
  else if(a.status==='atendido'&&deve&&rc)main=`<button type="button" class="btn primary big full" data-act="receber" data-id="${c.id}">Receber ${brl(faltaConta(c))}</button>`;
  else if(a.status==='atendido'&&own)main=`<button type="button" class="btn big full" data-act="abrirConsulta" data-id="${a.id}">Ver a consulta</button>`;
  h+=main;
  const sec=[];
  if(['agendado','confirmado'].includes(a.status)){
    if(mk&&a.status==='agendado')sec.push(`<button type="button" class="btn" data-act="confirmar" data-id="${a.id}">${ic('check')} Confirmar</button>`);
    if(mk)sec.push(`<button type="button" class="btn" data-act="mudar" data-id="${a.id}">${ic('clock')} Mudar horário</button>`);
    if(ch&&(a.dia<hoje()||(ehHoje&&a.t<now())))sec.push(`<button type="button" class="btn" data-act="faltou" data-id="${a.id}">Faltou</button>`);
    if(mk)sec.push(`<button type="button" class="btn danger" data-act="desmarcar" data-id="${a.id}">Desmarcar</button>`);
  }
  if(sec.length)h+=`<div class="chips">${sec.join('')}</div>`;
  h+=`<details class="more"><summary>Ver o que aconteceu com esta consulta</summary>${a.evs.map(e=>`<div class="tl"><i></i><div><b>${esc(e.t)}</b><div class="muted small">${esc(e.q)}</div></div></div>`).join('')}</details><button type="button" class="link" data-act="abrirPac" data-id="${p.id}">Abrir ficha de ${esc(curto(p.nome))}</button>`;
  return h;
}
function shReceber(m){
  const c=S.contas.find(x=>x.id===m.conta),p=getPac(c.pac),f=getForma(m.forma);
  if(m.ok)return `<div class="done"><span class="ok-ic">${ic('check',40)}</span><h2 style="font-size:26px">Pagamento recebido</h2><p class="muted" style="font-size:18px">${brl(m.ok)} de ${esc(p.nome)} em ${esc(formaNome(m.forma).toLowerCase())}.${m.troco>0?` Troco: <b>${brl(m.troco)}</b>.`:''}</p>${faltaConta(c)>0?`<p class="note warn"><span>Ainda falta ${brl(faltaConta(c))}.</span></p>`:''}<div class="chips" style="justify-content:center">${p.consWpp&&can('whatsapp.usar')?`<button type="button" class="btn primary" data-act="recibo" data-id="${c.id}">${ic('wpp')} Enviar recibo pelo WhatsApp</button>`:''}<button type="button" class="btn" data-act="fechar">Pronto</button></div></div>`;
  const desc=m.desc?parseBRL(m.descTxt):0,falta=c.bruto-desc-pagoConta(c),lim=descMax();
  const valor=m.parte?parseBRL(m.valorTxt):falta;const ent=parseBRL(m.entregue);const troco=f&&f.tipo==='dinheiro'&&ent>valor?ent-valor:0;
  const bloqDesc=desc>c.bruto*lim/100;const abertos=sessoesAbertas();const sess=abertos.find(s=>s.id===m.sessao);
  return sh('Receber de '+esc(p.nome),esc(c.desc))+`<div style="text-align:center"><div class="muted">Valor a receber</div><div class="big-num" style="font-size:52px">${brl(Math.max(valor,0))}</div>${desc?`<div class="muted">com desconto de ${brl(desc)}</div>`:''}</div>
    ${abertos.length>1?`<div class="field">Em qual caixa?<div class="chips">${abertos.map(s=>`<button type="button" class="chip" data-act="recCaixa" data-v="${s.id}" aria-pressed="${m.sessao===s.id}">${esc(caixaNome(s.caixa))}</button>`).join('')}</div></div>`:''}
    <div class="field">Como o paciente vai pagar?<div class="pick">${formasAtivas().map(x=>`<button type="button" class="opt" data-act="forma" data-v="${x.id}" aria-pressed="${m.forma===x.id}"><b>${esc(x.nome)}</b></button>`).join('')}</div></div>
    ${f&&f.tipo==='credito'&&f.parcMax>1?`<div class="field">Em quantas vezes?<div class="chips">${Array.from({length:f.parcMax},(_,i)=>i+1).map(n=>`<button type="button" class="chip" data-act="parc" data-v="${n}" aria-pressed="${m.parc===n}">${n}x de ${brl(Math.round(valor/n))}</button>`).join('')}</div></div>`:''}
    ${f&&f.tipo==='dinheiro'?`<label class="field">Quanto o paciente entregou? <span class="hint">para calcular o troco</span><input id="r-ent" inputmode="decimal" value="${esc(m.entregue||'')}" data-in="rec" data-f="entregue" placeholder="Ex.: 400,00"></label>${troco>0?`<div class="note ok"><span>Troco: <b style="font-size:22px">${brl(troco)}</b></span></div>`:''}`:''}
    ${m.desc?`<label class="field">Desconto (R$) <span class="hint">seu limite: ${lim}%</span><input id="r-desc" inputmode="decimal" value="${esc(m.descTxt||'')}" data-in="rec" data-f="descTxt" placeholder="0,00"></label>${bloqDesc?`<div class="note warn"><span>Acima do seu limite de ${lim}%. Peça a alguém com autorização maior.</span></div>`:''}`:''}
    ${m.parte?`<label class="field">Quanto vai pagar agora?<input id="r-val" inputmode="decimal" value="${esc(m.valorTxt||'')}" data-in="rec" data-f="valorTxt"></label>`:''}
    <div class="chips">${m.desc||!can('pagamento.desconto')||lim<=0?'':'<button type="button" class="link" data-act="recDesc">Dar desconto</button>'}${m.parte?'':'<button type="button" class="link" data-act="recParte">Pagar só uma parte</button>'}</div>
    <button type="button" class="btn primary big full" data-act="pagar"${!m.forma||bloqDesc||valor<=0||!sess?' disabled':''}>${!abertos.length?'Abra um caixa para receber':!sess?'Escolha o caixa':!m.forma?'Escolha como vai pagar':'Confirmar '+brl(Math.min(valor,falta))}</button>`;
}
function shAbrirCx(m){
  return sh('Abrir '+esc(caixaNome(m.caixa)),'Quanto dinheiro tem na gaveta para troco?')+`<label class="field">Troco inicial (R$)<input id="cx-ini" inputmode="decimal" value="${esc(m.valor)}" data-in="cxIni" data-enter="cxAbrirOk" placeholder="0,00"></label><button type="button" class="btn primary big full" data-act="cxAbrirOk">Abrir o caixa</button>`;
}
function shCaixa(m){
  const s=S.sessoes.find(x=>x.id===m.sessao),ps=S.pays.filter(p=>p.sessao===s.id);
  const ehDin=p=>(getForma(p.forma)||{}).tipo==='dinheiro';
  const din=ps.filter(ehDin).reduce((a,p)=>a+p.valor,0),esp=s.saldoIni+din;
  const cont=m.contado===''?null:parseBRL(m.contado),dif=cont==null?null:cont-esp;
  const outros={};ps.filter(p=>!ehDin(p)).forEach(p=>{const n=formaNome(p.forma);outros[n]=(outros[n]||0)+p.valor;});
  return sh('Fechar '+esc(caixaNome(s.caixa)),'Conte o dinheiro da gaveta e digite o valor.')+`<label class="field">Quanto dinheiro tem na gaveta?<input id="cx-cont" inputmode="decimal" value="${esc(m.contado)}" data-in="cxCont" placeholder="Ex.: ${c2t(esp)}"></label>
    ${dif==null?`<p class="muted">O sistema espera ${brl(esp)} (troco inicial de ${brl(s.saldoIni)} + ${brl(din)} recebidos em dinheiro).</p>`:dif===0?'<div class="note ok"><span>Confere! Sem diferença.</span></div>':`<div class="note bad"><span>${dif>0?'Sobrando':'Faltando'} ${brl(Math.abs(dif))}. O sistema esperava ${brl(esp)}.</span></div>`}
    <details class="more"><summary>Outras formas de pagamento</summary>${Object.keys(outros).length?`<dl class="summary">${Object.entries(outros).map(([k,v])=>`<dt>${esc(k)}</dt><dd>${brl(v)}</dd>`).join('')}</dl>`:'<p class="muted">Nenhum.</p>'}</details>
    <button type="button" class="btn primary big full" data-act="caixaOk"${dif==null?' disabled':''}>Fechar o caixa</button>`;
}
const certTxt=()=>{const c=me().cert;return c==='a3'?'Token A3: no sistema real, o assinador instalado neste PC pede o PIN do token.':c==='nuvem'?'Certificado em nuvem: no sistema real, você confirma no app do celular uma vez por turno.':'Sem certificado cadastrado: o documento é travado, mas não assinado.';};
function shDoc(m){
  return sh(DOCS[m.tipo][0],'Confira o texto. Você pode alterar antes de emitir.')+`<label class="field"><span class="sr">Texto</span><textarea id="d-txt" rows="7" data-in="docTxt">${esc(m.texto)}</textarea></label><p class="muted small">Emitido por ${esc(me().nome)}${me().crm?' ('+esc(me().crm)+')':''}. ${certTxt()} (simulação)</p>
    <div class="chips">${getPac(minhaConsulta().pac).consWpp?`<button type="button" class="btn primary big" style="flex:1" data-act="docOk" data-v="1">${ic('wpp',22)} Emitir e enviar pelo WhatsApp</button>`:''}<button type="button" class="btn big" data-act="docOk" data-v="0">Só emitir</button></div>`;
}
function shFinalizar(){
  const a=minhaConsulta(),r=regDe(a,true);const vazio=r.campos.every(x=>!String(x).trim());const c=me().cert;
  return sh('Finalizar consulta','O registro será travado e não poderá mais ser alterado.')+`${vazio?'<div class="note warn"><span>Nenhum campo do prontuário foi preenchido. Pode finalizar mesmo assim.</span></div>':''}
    ${r.sigiloso?'<div class="note info"><span>Registro marcado como <b>sigiloso</b>: só você poderá ler o conteúdo.</span></div>':''}
    <p style="font-size:17px">Depois de finalizada, a consulta <b>não pode mais ser alterada</b>. Se precisar corrigir algo, você adiciona uma observação.</p>
    <div class="note ${c==='a3'||c==='nuvem'?'info':'warn'}"><span>${ic('lock')} ${certTxt()} (simulação)</span></div>
    <button type="button" class="btn primary big full" data-act="assinar">${ic('pen',22)} ${c==='a3'?'Assinar com token A3 e finalizar':c==='nuvem'?'Assinar com certificado em nuvem e finalizar':'Finalizar consulta'}</button><button type="button" class="btn full" data-act="fechar">Continuar escrevendo</button>`;
}
function shNovoPac(m){
  const dup=(m.nome||'').trim().length>=4?S.pacs.find(p=>p.nome.toLowerCase()===m.nome.trim().toLowerCase()||(m.cel&&m.cel.replace(/\D/g,'').length>=10&&p.cel.replace(/\D/g,'')===m.cel.replace(/\D/g,''))):null;
  return sh('Novo paciente','Só os 3 primeiros campos são obrigatórios.')+`<label class="field">Nome completo<input id="n-nome" value="${esc(m.nome||'')}" data-in="np" data-f="nome"></label><label class="field">Data de nascimento<input id="n-nasc" value="${esc(m.nasc||'')}" data-in="np" data-f="nasc" placeholder="dd/mm/aaaa" inputmode="numeric"></label><label class="field">Celular com DDD<input id="n-cel" value="${esc(m.cel||'')}" data-in="np" data-f="cel" placeholder="(11) 90000-0000" inputmode="tel"></label><label class="field">CPF <span class="hint">opcional</span><input id="n-cpf" value="${esc(m.cpf||'')}" data-in="np" data-f="cpf" inputmode="numeric">${m.cpf?(cpfValido(m.cpf)?'<span class="hint" style="color:var(--ok-fg)">CPF válido</span>':'<span class="err">CPF com erro</span>'):''}</label>
    <label class="switch"><input id="n-cw" type="checkbox"${m.consWpp?' checked':''} data-ch="npCons" data-f="consWpp"> Aceita mensagens pelo WhatsApp</label><label class="switch"><input id="n-cd" type="checkbox"${m.consDados?' checked':''} data-ch="npCons" data-f="consDados"> Autorizou o uso dos dados (LGPD)</label>
    ${dup?`<div class="note warn"><span>Já existe ${esc(dup.nome)} (${esc(dup.cel)}). Pode ser a mesma pessoa.</span><button type="button" class="btn sm" data-act="abrirPac" data-id="${dup.id}">Abrir cadastro</button></div>`:''}${m.erro?`<p class="err">${esc(m.erro)}</p>`:''}
    <button type="button" class="btn primary big full" data-act="npOk">Cadastrar paciente</button>`;
}
function shTermo(m){
  return sh('Termo de ciência de risco','API não oficial do WhatsApp')+`<div class="paper" style="font-size:15px">A API não oficial conecta o WhatsApp da clínica imitando o WhatsApp Web. Ela <b>não é autorizada pelo WhatsApp</b> e viola os termos de uso do serviço.

Riscos:
• o número da clínica pode ser <b>bloqueado</b> temporária ou definitivamente;
• a conexão pode parar sem aviso quando o WhatsApp mudar;
• dados de pacientes passam por um componente sem garantia do WhatsApp, o que deve constar no termo de tratamento de dados (LGPD).

A clínica pode voltar a qualquer momento para o envio gratuito (wa.me) ou para a API oficial.</div>
    <label class="switch"><input id="t-ok" type="checkbox"${m.aceito?' checked':''} data-ch="termoOk"> Li, entendi os riscos e quero ligar a API não oficial</label>
    <button type="button" class="btn danger big full" data-act="termoAceitar"${m.aceito?'':' disabled'}>Ligar API não oficial</button><button type="button" class="btn full" data-act="fechar">Cancelar</button>`;
}
function shNota(m){
  const q=S.pesquisas.find(x=>x.id===m.id);
  return sh('Resposta da pesquisa',esc(pacNome(q.pac))+' · '+esc(curto(profNome(q.prof))))+`<div class="field">Nota de 0 a 10<div class="chips">${Array.from({length:11},(_,i)=>`<button type="button" class="chip" data-act="notaV" data-v="${i}" aria-pressed="${m.nota===i}">${i}</button>`).join('')}</div></div><label class="field">Comentário <span class="hint">opcional</span><textarea id="nt-com" rows="3" data-in="notaCom">${esc(m.comentario||'')}</textarea></label><button type="button" class="btn primary big full" data-act="notaOk"${m.nota==null?' disabled':''}>Registrar resposta</button>`;
}

/* ---------- importação (CSV) ---------- */
function lerCSV(txt){const linhas=txt.replace(/^﻿/,'').split(/\r?\n/).filter(l=>l.trim());if(!linhas.length)return [];const sep=(linhas[0].match(/;/g)||[]).length>=(linhas[0].match(/,/g)||[]).length?';':',';
  return linhas.map(l=>{const r=[];let cur='',q=false;for(let i=0;i<l.length;i++){const ch=l[i];if(q){if(ch==='"'&&l[i+1]==='"'){cur+='"';i++;}else if(ch==='"')q=false;else cur+=ch;}else if(ch==='"')q=true;else if(ch===sep){r.push(cur.trim());cur='';}else cur+=ch;}r.push(cur.trim());return r;});}
function prepararImportacao(nome,txt){
  const rows=lerCSV(txt);if(!rows.length)return {arquivo:nome,ok:[],dup:[],erros:[{linha:1,motivo:'Arquivo vazio.'}]};
  const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim();
  const cab=rows[0].map(norm),col=k=>cab.findIndex(c=>c.startsWith(k));
  const iN=col('nome'),iD=col('nasc'),iC=col('cel'),iF=col('cpf'),iE=col('e-mail')>=0?col('e-mail'):col('email');
  if(iN<0||iC<0)return {arquivo:nome,ok:[],dup:[],erros:[{linha:1,motivo:'O cabeçalho precisa ter pelo menos as colunas "nome" e "celular". Use o modelo.'}]};
  const ok=[],dup=[],erros=[],vistos=new Set();
  rows.slice(1).forEach((r,i)=>{const linha=i+2,g=k=>k>=0?(r[k]||'').trim():'';
    const p={nome:g(iN),nasc:g(iD),cel:g(iC),cpf:g(iF),email:g(iE)},cd=p.cel.replace(/\D/g,''),fd=p.cpf.replace(/\D/g,'');
    if(p.nome.length<3)return erros.push({linha,motivo:'nome vazio ou muito curto'});
    if(cd.length<10||cd.length>11)return erros.push({linha,motivo:`celular "${p.cel}" sem DDD ou inválido`});
    if(p.nasc&&!dataValida(p.nasc))return erros.push({linha,motivo:`data de nascimento "${p.nasc}" inválida (use dd/mm/aaaa)`});
    if(p.cpf&&!cpfValido(p.cpf))return erros.push({linha,motivo:`CPF "${p.cpf}" inválido`});
    const ja=S.pacs.find(x=>(fd&&x.cpf.replace(/\D/g,'')===fd)||x.cel.replace(/\D/g,'')===cd);
    if(ja)return dup.push({linha,nome:p.nome,motivo:'já cadastrado como '+ja.nome});
    const k=fd||cd;if(vistos.has(k))return dup.push({linha,nome:p.nome,motivo:'repetido no arquivo'});vistos.add(k);
    ok.push(p);});
  return {arquivo:nome,ok,dup,erros};
}
function baixar(nome,conteudo,tipo){try{const b=new Blob([conteudo],{type:tipo});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=nome;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000);}catch(e){toast('Não foi possível baixar o arquivo.','err');}}
const csvCel=v=>{v=String(v==null?'':v);return /[;"\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;};

/* ---------- ações ---------- */
const go=v=>{S.ui.view=v;S.ui.sheet=null;};
function novoPacObj(o){return Object.assign({id:uid('p'),nome:'',nasc:'',cel:'',cpf:'',email:'',alergias:'',meds:'',problemas:'',consWpp:true,consDados:true},o);}
function wiz(o){
  if(!profs().length||!S.servicos.length){toast('Antes, a gestão precisa cadastrar médicos e serviços em Configurações.','err');return;}
  const base={type:'agendar',i:0,pac:null,busca:'',novo:!S.pacs.length,nome:'',cel:'',prof:null,serv:S.servicos[0].id,d:S.ui.dia||hoje(),t:null,todos:false,wpp:true,remarcar:null,erro:''};
  const m=Object.assign(base,o);
  m.steps=m.remarcar?['quando','ok']:(m.t!=null?(m.pac?['ok']:['pac','ok']):(m.pac?['prof','quando','ok']:['pac','prof','quando','ok']));
  if(role()==='medico'&&!m.remarcar){m.prof=me().id;m.steps=m.steps.filter(s=>s!=='prof');}
  S.ui.sheet=m;
}
const avancarWiz=()=>{const m=S.ui.sheet;m.i=Math.min(m.i+1,m.steps.length-1);m.erro='';};
const precisa=(p,msg)=>{if(can(p))return true;toast(msg||'Você não tem autorização para isso. Fale com a gestão.','err');return false;};
const UNDO=new Set(['chegou','confirmar','faltou','desOk','wizOk','pagar','estornar','remU','remS','remBloq','remEsp','remSala','remCaixa','remForma','modRem','impDesfazer']);
const ACT={
  nav:x=>{go(x.v);S.ui.convAberta=false;S.ui.erro='';if(x.v==='recados'&&!S.ui.recSel.startsWith('dm:'))S.chat.canais[S.ui.recSel].nl=0;if(x.v==='whatsapp')S.ui._fundo=true;},
  desfazer:()=>{const t=S.ui.toast;if(!t||!t.undo)return;const v=S.ui.view;S=JSON.parse(t.undo);S.ui.view=v;S.ui.sheet=null;toast('Pronto, desfeito.');},
  fechar:()=>{S.ui.sheet=null;},
  overlay:()=>{S.ui.sheet=null;},
  /* primeiro acesso e usuários */
  setupOk:()=>{const u=S.ui.setup,cli=u.clinica.trim(),nome=u.nome.trim();
    if(cli.length<2){S.ui.erro='Escreva o nome da clínica.';return;}if(nome.length<3){S.ui.erro='Escreva o seu nome.';return;}
    S.clinica=clinicaBase(cli);const g={id:uid('u'),nome,role:'gestor',espId:'',salaId:'',crm:'',cert:'nenhum',perms:{},descMax:null};S.users.push(g);S.user=g.id;
    S.ui.erro='';S.ui.setup={clinica:'',nome:''};log('Criou a clínica '+cli);toast('Pronto! Agora siga os primeiros passos.');},
  entrar:x=>{S.user=x.id;Object.assign(S.ui,{view:'inicio',sheet:null,consulta:null,fim:null,pacSel:null,erro:''});log('Entrou no sistema');},
  sair:()=>{S.user=null;S.ui.sheet=null;S.ui.view='inicio';},
  /* configurações: clínica */
  cfg:x=>{go('config');S.ui.cfgTab=x.v;S.ui.erro='';},
  cfgTab:x=>{S.ui.cfgTab=x.v;S.ui.erro='';S.ui.modeloEd=null;},
  addEsp:()=>{const n=S.ui.novoEsp.trim();if(n.length<3){S.ui.erro='Escreva o nome da especialidade.';return;}if(S.especialidades.some(e=>e.nome.toLowerCase()===n.toLowerCase())){S.ui.erro='Essa especialidade já existe.';return;}S.especialidades.push({id:uid('e'),nome:n});S.ui.novoEsp='';S.ui.erro='';log('Cadastrou a especialidade '+n);},
  remEsp:x=>{const e=S.especialidades.find(z=>z.id===x.id);if(S.users.some(u=>u.espId===x.id)){toast('Há médicos com essa especialidade. Mude o cadastro deles antes.','err');return;}S.especialidades=S.especialidades.filter(z=>z.id!==x.id);S.modelos.forEach(m=>{if(m.espId===x.id)m.espId=null;});log('Removeu a especialidade '+e.nome);toast('Especialidade removida.');},
  addSala:()=>{const n=S.ui.novaSala.trim();if(n.length<2){S.ui.erro='Escreva o nome da sala.';return;}S.salas.push({id:uid('sl'),nome:n});S.ui.novaSala='';S.ui.erro='';log('Cadastrou a sala '+n);},
  remSala:x=>{const s=S.salas.find(z=>z.id===x.id);S.salas=S.salas.filter(z=>z.id!==x.id);S.users.forEach(u=>{if(u.salaId===x.id)u.salaId='';});log('Removeu a sala '+s.nome);toast('Sala removida.');},
  /* horários */
  horProf:x=>{S.ui.horProf=x.v;S.ui.erro='';},
  addBloq:()=>{const b=S.ui.novoBloq,ini=hhmm(b.ini),fim=hhmm(b.fim);if(!/^\d{4}-\d{2}-\d{2}$/.test(b.dia)||b.dia<hoje()){S.ui.erro='Escolha um dia a partir de hoje.';return;}if(ini==null||fim==null||fim<=ini){S.ui.erro='O horário final precisa ser depois do inicial.';return;}
    const prof=S.ui.horProf,afet=S.appts.filter(a=>a.prof===prof&&a.dia===b.dia&&['agendado','confirmado'].includes(a.status)&&a.t<fim&&ini<a.t+a.dur);
    S.bloqs.push({id:uid('b'),prof,dia:b.dia,ini,fim,motivo:b.motivo.trim()||'Bloqueio'});log(`Bloqueou a agenda de ${profNome(prof)} em ${dm(b.dia)} (${fmt(ini)}–${fmt(fim)})`);S.ui.novoBloq={dia:b.dia,ini:'12:00',fim:'13:00',motivo:''};S.ui.erro='';
    toast(afet.length?`Bloqueio criado. Atenção: ${plural(afet.length,'consulta marcada precisa','consultas marcadas precisam')} mudar de horário.`:'Bloqueio criado.',afet.length?'err':'ok');},
  bloqDia:()=>{const u=getUser(S.ui.horProf),h=u.horario[dataDe(S.ui.novoBloq.dia).getDay()];S.ui.novoBloq.ini=fmt(h.on?h.ini:0);S.ui.novoBloq.fim=fmt(h.on?h.fim:1439);},
  remBloq:x=>{S.bloqs=S.bloqs.filter(b=>b.id!==x.id);log('Removeu um bloqueio de agenda');toast('Bloqueio removido.');},
  /* equipe */
  editU:x=>{const u=getUser(x.id);S.ui.novoU={id:u.id,nome:u.nome,role:u.role,espId:u.espId||'',salaId:u.salaId||'',crm:u.crm||'',cert:u.cert||'nenhum'};S.ui.erro='';},
  cancelU:()=>{S.ui.novoU=novoUForm();S.ui.erro='';},
  novoRole:x=>{S.ui.novoU.role=x.v;},
  novoCert:x=>{S.ui.novoU.cert=x.v;},
  addU:()=>{const n=S.ui.novoU,nome=n.nome.trim();if(nome.length<3){S.ui.erro='Escreva o nome completo.';return;}
    const med=n.role==='medico';
    if(n.id){const u=getUser(n.id);if(u.role==='gestor'&&n.role!=='gestor'&&S.users.filter(z=>z.role==='gestor').length<=1){S.ui.erro='A clínica precisa de pelo menos uma pessoa na gestão.';return;}
      if(u.role==='medico'&&!med&&S.appts.some(a=>a.prof===u.id&&['agendado','confirmado','chegou','em_atendimento'].includes(a.status))){S.ui.erro=u.nome+' tem consultas marcadas como médico.';return;}
      Object.assign(u,{nome,role:n.role,espId:med?n.espId:'',salaId:med?n.salaId:'',crm:med?n.crm.trim():'',cert:med?n.cert:'nenhum'});if(med&&!u.horario)u.horario=horarioPadrao();
      log(`Atualizou o cadastro de ${nome}`);S.ui.novoU=novoUForm();S.ui.erro='';toast('Cadastro atualizado.');return;}
    const u={id:uid('u'),nome,role:n.role,espId:med?n.espId:'',salaId:med?n.salaId:'',crm:med?n.crm.trim():'',cert:med?n.cert:'nenhum',perms:{},descMax:null};
    if(med)u.horario=horarioPadrao();
    S.users.push(u);log(`Adicionou ${nome} (${ROLES[u.role]})`);S.ui.novoU=Object.assign(novoUForm(),{role:n.role});S.ui.erro='';toast(nome+' foi adicionado(a) à equipe.'+(med?' Confira o horário na aba Horários.':''));},
  remU:x=>{const u=getUser(x.id);if(!u||u.id===S.user)return;
    if(u.role==='gestor'&&S.users.filter(z=>z.role==='gestor').length<=1){toast('A clínica precisa de pelo menos uma pessoa na gestão.','err');return;}
    if(S.appts.some(a=>a.prof===u.id&&['agendado','confirmado','chegou','em_atendimento'].includes(a.status))){toast(u.nome+' tem consultas marcadas. Desmarque ou mude antes de remover.','err');return;}
    S.users=S.users.filter(z=>z.id!==u.id);log('Removeu '+u.nome+' da equipe');toast(u.nome+' foi removido(a).');},
  /* autorizações */
  authUser:x=>{S.ui.authUser=x.v;},
  /* serviços */
  novoTipo:x=>{S.ui.novoS.tipo=x.v;},
  editS:x=>{const s=getServ(x.id);S.ui.novoS={id:s.id,nome:s.nome,tipo:s.tipo,dur:String(s.dur),preco:s.preco?c2t(s.preco):'',preparo:s.preparo||''};S.ui.erro='';},
  cancelS:()=>{S.ui.novoS=novoSForm();S.ui.erro='';},
  addS:()=>{const n=S.ui.novoS,nome=n.nome.trim(),dur=parseInt(n.dur,10);if(nome.length<2){S.ui.erro='Escreva o nome do serviço.';return;}
    if(!(dur>=5&&dur<=480)){S.ui.erro='A duração precisa ficar entre 5 e 480 minutos.';return;}
    if(S.servicos.some(s=>s.id!==n.id&&s.nome.toLowerCase()===nome.toLowerCase())){S.ui.erro='Já existe um serviço com esse nome.';return;}
    const dados={nome,tipo:n.tipo,dur,preco:parseBRL(n.preco),preparo:n.preparo.trim()};
    if(n.id){Object.assign(getServ(n.id),dados);log(`Atualizou o serviço ${nome}`);toast('Serviço atualizado. As consultas já marcadas não mudam.');}
    else{S.servicos.push(Object.assign({id:uid('s')},dados));log(`Cadastrou o serviço ${nome} (${durTxt(dur)}, ${dados.preco?brl(dados.preco):'sem custo'})`);toast('Serviço cadastrado.');}
    S.ui.novoS=Object.assign(novoSForm(),{tipo:n.tipo});S.ui.erro='';},
  remS:x=>{const s=getServ(x.id);if(!s)return;S.servicos=S.servicos.filter(z=>z.id!==s.id);log('Removeu o serviço '+s.nome);toast('Serviço removido. As consultas já marcadas não mudam.');},
  /* pagamentos e caixas */
  addForma:()=>{const n=S.ui.novaForma.trim();if(n.length<2){S.ui.erro='Escreva o nome da forma de pagamento.';return;}S.formas.push({id:uid('f'),tipo:'outra',nome:n,ativa:true,parcMax:1});S.ui.novaForma='';S.ui.erro='';log('Cadastrou a forma de pagamento '+n);},
  remForma:x=>{const f=getForma(x.id);S.formas=S.formas.filter(z=>z.id!==x.id);log('Removeu a forma de pagamento '+f.nome);toast('Forma removida.');},
  addCaixa:()=>{const n=S.ui.novoCaixa.trim();if(n.length<2){S.ui.erro='Escreva o nome do caixa.';return;}S.caixas.push({id:uid('cx'),nome:n});S.ui.novoCaixa='';S.ui.erro='';log('Cadastrou o caixa '+n);},
  remCaixa:x=>{if(sessaoDe(x.id)){toast('Feche o caixa antes de remover.','err');return;}const c=S.caixas.find(z=>z.id===x.id);S.caixas=S.caixas.filter(z=>z.id!==x.id);log('Removeu o caixa '+c.nome);toast('Caixa removido.');},
  /* faltas */
  polAcao:x=>{S.clinica.politica.acaoFaltas=x.v;log('Mudou a política de faltas');},
  /* prontuário */
  prontModo:x=>{S.clinica.prontuario.modo=x.v;log('Prontuário passou a ser '+(x.v==='autor'?'só do autor':'compartilhado'));},
  modNovo:()=>{S.ui.modeloEd={id:null,nome:'',espId:'',secoes:['Queixa principal','Conduta']};S.ui.erro='';},
  modCopiar:x=>{const m=todosModelos().find(z=>z.id===x.id);S.ui.modeloEd={id:null,nome:m.nome+' (cópia)',espId:m.espId||'',secoes:m.secoes.slice()};S.ui.erro='';},
  modEditar:x=>{const m=S.modelos.find(z=>z.id===x.id);S.ui.modeloEd={id:m.id,nome:m.nome,espId:m.espId||'',secoes:m.secoes.slice()};S.ui.erro='';},
  modRem:x=>{const m=S.modelos.find(z=>z.id===x.id);S.modelos=S.modelos.filter(z=>z.id!==x.id);log('Removeu o modelo de prontuário '+m.nome);toast('Modelo removido. Os registros antigos não mudam.');},
  mdSecAdd:()=>{S.ui.modeloEd.secoes.push('');},
  mdSecRem:x=>{S.ui.modeloEd.secoes.splice(+x.i,1);},
  mdCancelar:()=>{S.ui.modeloEd=null;S.ui.erro='';},
  mdSalvar:()=>{const md=S.ui.modeloEd,nome=md.nome.trim(),secoes=md.secoes.map(s=>s.trim()).filter(Boolean);
    if(nome.length<3){S.ui.erro='Escreva o nome do modelo.';return;}if(!secoes.length){S.ui.erro='O modelo precisa de pelo menos uma seção.';return;}
    if(md.espId&&S.modelos.some(m=>m.id!==md.id&&m.espId===md.espId)){S.ui.erro='Já existe um modelo para essa especialidade.';return;}
    if(md.id){Object.assign(S.modelos.find(m=>m.id===md.id),{nome,espId:md.espId||null,secoes});log('Atualizou o modelo de prontuário '+nome);}
    else{S.modelos.push({id:uid('m'),nome,espId:md.espId||null,secoes});log('Criou o modelo de prontuário '+nome);}
    S.ui.modeloEd=null;S.ui.erro='';toast('Modelo salvo. Consultas já finalizadas não mudam.');},
  /* WhatsApp */
  waForma:x=>{const w=S.clinica.whatsapp;if(x.v==='naooficial'&&!w.termo){S.ui.sheet={type:'termo',aceito:false};return;}w.forma=x.v;log('Mudou a forma do WhatsApp para '+WA_FORMAS[x.v][0]);toast('Forma do WhatsApp: '+WA_FORMAS[x.v][0]+'.');},
  termoAceitar:()=>{if(!S.ui.sheet.aceito)return;const w=S.clinica.whatsapp;w.termo={por:me().nome,em:carimbo()};w.forma='naooficial';log('Aceitou o termo de risco e ligou a API não oficial do WhatsApp');S.ui.sheet=null;toast('API não oficial ligada (simulação).');},
  /* dados */
  impModelo:()=>baixar('modelo-pacientes.csv','﻿nome;nascimento;celular;cpf;email\nMaria Santos;25/08/1980;(11) 98765-4321;;maria@exemplo.com\n','text/csv;charset=utf-8'),
  impCancelar:()=>{S.ui.imp=null;},
  impConfirmar:()=>{const imp=S.ui.imp;if(!imp||!imp.ok.length)return;const ids=[];
    imp.ok.forEach(p=>{const n=novoPacObj({nome:p.nome,nasc:p.nasc,cel:p.cel,cpf:p.cpf,email:p.email,consWpp:false,consDados:false,importado:true});S.pacs.push(n);ids.push(n.id);});
    S.importacoes.push({id:uid('i'),arquivo:imp.arquivo,data:hoje(),por:me().nome,ids,desfeita:false});log(`Importou ${ids.length} pacientes do arquivo ${imp.arquivo}`);S.ui.imp=null;
    toast(`${plural(ids.length,'paciente importado','pacientes importados')}. Confirme as autorizações (WhatsApp e LGPD) com cada paciente.`);},
  impDesfazer:x=>{const i=S.importacoes.find(z=>z.id===x.id);const usados=i.ids.filter(id=>S.appts.some(a=>a.pac===id)||S.contas.some(c=>c.pac===id));
    if(usados.length){toast(`Não dá para desfazer: ${plural(usados.length,'paciente já tem','pacientes já têm')} consultas ou pagamentos.`,'err');return;}
    S.pacs=S.pacs.filter(p=>!i.ids.includes(p.id));i.desfeita=true;log('Desfez a importação '+i.arquivo);toast('Importação desfeita.');},
  exportar:()=>baixar('sis-clinicas-dados-'+hoje()+'.json',JSON.stringify(S,null,2),'application/json'),
  apagar:()=>{if(!S.ui.apagarArmado){S.ui.apagarArmado=true;setTimeout(()=>{if(S.ui.apagarArmado){S.ui.apagarArmado=false;render();}},4000);return;}try{localStorage.removeItem(KEY);}catch(e){}S=novo();},
  /* agenda */
  dia:x=>{S.ui.dia=x.v;},
  agProf:x=>{S.ui.agProf=x.v;},
  agendar:()=>{if(precisa('agenda.marcar'))wiz({});},
  agendarEm:x=>{if(!precisa('agenda.marcar'))return;if(role()==='medico'&&me().id!==x.p){toast('Você só marca na sua agenda. Peça à recepção.','err');return;}wiz({prof:x.p,d:S.ui.dia,t:+x.t});},
  agendarPac:x=>{if(precisa('agenda.marcar'))wiz({pac:x.id});},
  wizPac:x=>{S.ui.sheet.pac=x.id;avancarWiz();},
  wizNovo:x=>{S.ui.sheet.novo=x.v==='1';},
  wizNovoOk:()=>{const m=S.ui.sheet;if((m.nome||'').trim().length<5||(m.cel||'').replace(/\D/g,'').length<10){m.erro='Escreva o nome completo e o celular com DDD.';return;}avancarWiz();},
  wizProf:x=>{S.ui.sheet.prof=x.v;},
  wizServ:x=>{S.ui.sheet.serv=x.v;},
  wizProx:()=>avancarWiz(),
  wizVoltar:()=>{const m=S.ui.sheet;m.i=Math.max(0,m.i-1);m.erro='';},
  wizDia:x=>{S.ui.sheet.d=x.v;},
  wizTodos:()=>{S.ui.sheet.todos=!S.ui.sheet.todos;},
  wizHora:x=>{S.ui.sheet.t=+x.v;avancarWiz();},
  wizOk:()=>{
    const m=S.ui.sheet;
    if(m.remarcar){const a=getAppt(m.remarcar);const r=mudarHorario(a,m.d,m.t);if(r.err){m.erro=r.err;return;}
      if(m.wpp)wpp(a.pac,preencher(S.clinica.msgs.confirmacao,r.novo));
      S.ui.sheet=null;toast('Horário mudado para '+quando(m.d,m.t).toLowerCase()+'.');return;}
    const serv=getServ(m.serv);if(!serv){m.erro='Escolha o tipo de atendimento.';return;}
    const cg=conflitoGrade(m.prof,m.d,m.t,serv.dur);if(cg){m.erro=cg;return;}
    const ca=conflitoAgenda(m.prof,m.d,m.t,serv.dur,null);if(ca&&!(m.todos&&can('agenda.encaixe'))){m.erro=ca;return;}
    let pac=m.pac;const pol=S.clinica.politica;
    if(pac&&faltasRecentes(pac)>=+pol.faltasN&&pol.acaoFaltas==='gestao'&&!can('config.gerenciar')){m.erro='Pela política de faltas, só a gestão pode marcar para este paciente.';return;}
    if(!pac){const p=novoPacObj({nome:m.nome.trim(),cel:m.cel.trim()});S.pacs.push(p);pac=p.id;log('Cadastrou '+p.nome+' ao marcar consulta');}
    const a=criarAppt({d:m.d,t:m.t,prof:m.prof,proc:serv.nome,dur:serv.dur,preco:serv.preco,preparo:serv.preparo,pac,encaixe:!!ca});
    log(`Marcou ${pacNome(pac)} com ${profNome(m.prof)} (${quando(m.d,m.t)})${ca?' como encaixe':''}`);
    const env=m.wpp?!!wpp(pac,preencher(S.clinica.msgs.confirmacao,a)):false;
    S.ui.sheet=null;toast(`Consulta marcada: ${curto(pacNome(pac))}, ${quando(m.d,m.t).toLowerCase()}.${env?' WhatsApp aberto com a confirmação.':''}`);
  },
  verAppt:x=>{S.ui.sheet={type:'appt',id:x.id};},
  chegou:x=>{if(!precisa('recepcao.chegada'))return;const a=getAppt(x.id);a.status='chegou';a.chegou=now();evento(a,'Chegou na clínica',me().nome);log('Registrou a chegada de '+pacNome(a.pac));ensureConta(a);S.ui.sheet=null;
    const dv=devendo(a.pac)-(contaDe(a)?faltaConta(contaDe(a)):0);toast(`${curto(pacNome(a.pac))} está na sala de espera.${dv>0?' Atenção: tem '+brl(dv)+' pendente de antes.':''}`);},
  confirmar:x=>{const a=getAppt(x.id);a.status='confirmado';evento(a,'Confirmado',me().nome);log('Confirmou a consulta de '+pacNome(a.pac));S.ui.sheet=null;toast('Consulta confirmada.');},
  faltou:x=>{if(!precisa('recepcao.chegada'))return;const a=getAppt(x.id);a.status='faltou';evento(a,'Faltou',me().nome);log('Registrou falta de '+pacNome(a.pac));
    const pol=S.clinica.politica;const taxa=pol.cobrarFalta?contaAvulsa(a.pac,'Taxa de falta · '+dm(a.dia),parseBRL(pol.taxa)):null;S.ui.sheet=null;toast(curto(pacNome(a.pac))+' marcado como falta.'+(taxa?' Taxa de '+brl(taxa.bruto)+' lançada.':''));},
  mudar:x=>{const a=getAppt(x.id);wiz({remarcar:a.id,pac:a.pac,prof:a.prof,d:a.dia<hoje()?hoje():a.dia});},
  desmarcar:x=>{S.ui.sheet={type:'appt',id:x.id,desmarcar:true,motivo:null,avisar:true};},
  motivo:x=>{S.ui.sheet.motivo=x.v;},
  desVoltar:()=>{S.ui.sheet.desmarcar=false;},
  desOk:()=>{const m=S.ui.sheet,a=getAppt(m.id);const env=desmarcar(a,m.motivo,m.avisar);S.ui.sheet=null;toast('Consulta desmarcada.'+(a.tardia?' Contou como desmarcação tardia.':'')+(env?' WhatsApp aberto com o aviso.':''));},
  /* consulta */
  chamar:x=>{const a=getAppt(x.id);a.status='em_atendimento';a.chamado=now();evento(a,'Chamado por '+profNome(a.prof));
    S.chamadas.unshift({d:hoje(),nome:abrev(pacNome(a.pac)),sala:salaDe(a.prof),prof:profNome(a.prof),hora:now()});S.chamadas=S.chamadas.slice(0,30);log(`Chamou ${pacNome(a.pac)} e abriu o prontuário`);
    S.ui.consulta=a.id;S.ui.fim=null;S.ui.cidBusca='';go('consulta');toast(`${abrev(pacNome(a.pac))} chamado na TV da sala de espera.`);},
  abrirConsulta:x=>{const a=getAppt(x.id);S.ui.consulta=a.id;S.ui.fim=null;log('Abriu o prontuário de '+pacNome(a.pac));go('consulta');},
  cidAdd:x=>{const r=regDe(minhaConsulta(),true);if(!r.cids.includes(x.c))r.cids.push(x.c);S.ui.cidBusca='';},
  cidRem:x=>{const r=regDe(minhaConsulta(),true);r.cids=r.cids.filter(c=>c!==x.c);},
  doc:x=>{const a=minhaConsulta();S.ui.sheet={type:'doc',tipo:x.v,texto:DOCS[x.v][1](getPac(a.pac))};},
  docOk:x=>{const m=S.ui.sheet,a=minhaConsulta(),r=regDe(a,true);const dc={tipo:m.tipo,texto:m.texto,hora:carimbo(),enviado:false};r.docs.push(dc);
    log(`Emitiu ${DOCS[m.tipo][0].toLowerCase()} de ${pacNome(a.pac)}`);
    if(x.v==='1'){const c=wpp(a.pac,`${DOCS[m.tipo][0]} — ${profNome(a.prof)}${me().crm?' ('+me().crm+')':''}\n\n${m.texto}\n\n${S.clinica.nome}`);dc.enviado=!!c;
      S.ui.sheet=null;toast(c?'Documento emitido. WhatsApp aberto com o texto.':'Documento emitido. O paciente não autorizou WhatsApp: entregue impresso.',c?'ok':'err');return;}
    S.ui.sheet=null;toast('Documento emitido.');},
  finalizar:()=>{S.ui.sheet={type:'finalizar'};},
  assinar:()=>{const a=minhaConsulta(),r=regDe(a,true);const c=me().cert;r.status='assinado';r.assinadoEm=dmy(hoje())+' às '+fmt(now());r.metodo=c==='a3'?'token A3':c==='nuvem'?'certificado em nuvem':'';
    a.status='atendido';evento(a,'Consulta finalizada');ensureConta(a);log('Finalizou a consulta de '+pacNome(a.pac)+(r.metodo?' ('+r.metodo+')':''));
    if(S.clinica.msgs.pesquisa&&getPac(a.pac).consWpp)S.pesquisas.push({id:uid('q'),appt:a.id,pac:a.pac,prof:a.prof,dia:a.dia,enviada:false,nota:null,comentario:''});
    S.ui.sheet=null;S.ui.fim=a.id;S.ui.consulta=null;},
  adendo:()=>{const a=minhaConsulta(),r=regDe(a,false);const t=S.ui.adendo.trim();if(!t){toast('Escreva a observação primeiro.','err');return;}r.adendos.push({texto:t,hora:carimbo(),autor:me().nome});S.ui.adendo='';log('Adicionou observação à consulta de '+pacNome(a.pac));toast('Observação adicionada.');},
  /* pagamentos */
  receber:x=>{if(!precisa('pagamento.receber'))return;const ab=sessoesAbertas();const mine=ab.find(s=>s.por===me().nome)||ab[0];S.ui.sheet={type:'receber',conta:x.id,sessao:mine?mine.id:null,forma:null,parc:1,entregue:'',desc:false,descTxt:'',parte:false,valorTxt:'',ok:0};},
  recCaixa:x=>{S.ui.sheet.sessao=x.v;},
  forma:x=>{S.ui.sheet.forma=x.v;S.ui.sheet.parc=1;},
  parc:x=>{S.ui.sheet.parc=+x.v;},
  recDesc:()=>{S.ui.sheet.desc=true;},
  recParte:()=>{const m=S.ui.sheet,c=S.contas.find(x=>x.id===m.conta);m.parte=true;m.valorTxt=c2t(faltaConta(c));},
  pagar:()=>{const m=S.ui.sheet,c=S.contas.find(x=>x.id===m.conta),s=sessoesAbertas().find(z=>z.id===m.sessao),f=getForma(m.forma);if(!s||!f)return;
    const desc=m.desc?parseBRL(m.descTxt):0;if(desc>0&&(!can('pagamento.desconto')||desc>c.bruto*descMax()/100))return;c.desconto=desc;const falta=faltaConta(c);let v=m.parte?parseBRL(m.valorTxt):falta;v=Math.min(v,falta);if(v<=0)return;
    S.pays.push({id:uid('y'),conta:c.id,forma:f.id,valor:v,data:hoje(),hora:now(),por:me().nome,parc:f.tipo==='credito'?m.parc:1,sessao:s.id,estornoDe:null});
    log(`Recebeu ${brl(v)} (${f.nome}) de ${pacNome(c.pac)} no ${caixaNome(s.caixa)}${desc?' com desconto de '+brl(desc):''}`);
    const ent=parseBRL(m.entregue);m.troco=f.tipo==='dinheiro'&&ent>v?ent-v:0;m.ok=v;toast('Pagamento de '+brl(v)+' registrado.');},
  recibo:x=>{const c=S.contas.find(z=>z.id===x.id);const p=getPac(c.pac);
    const cv=wpp(c.pac,`Recibo — ${S.clinica.nome}\n\nRecebemos de ${p.nome} o valor de ${brl(pagoConta(c))} referente a ${c.desc}, em ${dmy(hoje())}.\n\nObrigado!`);
    S.ui.sheet=null;toast(cv?'WhatsApp aberto com o recibo.':'O paciente não autorizou WhatsApp.',cv?'ok':'err');},
  estornar:x=>{if(!precisa('pagamento.devolver'))return;const p=S.pays.find(z=>z.id===x.id);S.pays.push(Object.assign({},p,{id:uid('y'),valor:-p.valor,data:hoje(),hora:now(),por:me().nome,estornoDe:p.id}));log(`Devolveu ${brl(p.valor)} de ${pacNome(S.contas.find(c=>c.id===p.conta).pac)}`);toast('Pagamento devolvido. O registro original continua no histórico.');},
  abrirCaixa:x=>{if(precisa('caixa.operar'))S.ui.sheet={type:'abrirCx',caixa:x.id,valor:''};},
  cxAbrirOk:()=>{const m=S.ui.sheet;if(sessaoDe(m.caixa))return;const v=parseBRL(m.valor);S.sessoes.push({id:uid('ss'),caixa:m.caixa,data:hoje(),aberto:true,por:me().nome,abertoEm:now(),saldoIni:v,fechadoEm:null,fechadoPor:null,dif:null});log(`Abriu o ${caixaNome(m.caixa)} com ${brl(v)}`);S.ui.sheet=null;toast(caixaNome(m.caixa)+' aberto.');},
  fecharCaixa:x=>{if(precisa('caixa.operar'))S.ui.sheet={type:'caixa',sessao:x.id,contado:''};},
  caixaOk:()=>{const m=S.ui.sheet,s=S.sessoes.find(z=>z.id===m.sessao);const din=S.pays.filter(p=>p.sessao===s.id&&(getForma(p.forma)||{}).tipo==='dinheiro').reduce((a,p)=>a+p.valor,0);
    s.aberto=false;s.fechadoEm=now();s.fechadoPor=me().nome;s.dif=parseBRL(m.contado)-(s.saldoIni+din);log(`Fechou o ${caixaNome(s.caixa)}. Diferença: ${brl(s.dif)}`);S.ui.sheet=null;toast(caixaNome(s.caixa)+' fechado.'+(s.dif?' Diferença de '+brl(s.dif)+' registrada.':''),s.dif?'err':'ok');},
  /* pacientes */
  novoPac:()=>{S.ui.sheet={type:'novoPac',nome:/\d/.test(S.ui.pacBusca)?'':S.ui.pacBusca,nasc:'',cel:'',cpf:'',consWpp:true,consDados:true,erro:''};},
  npOk:()=>{const m=S.ui.sheet;
    if((m.nome||'').trim().length<5){m.erro='Escreva o nome completo.';return;}if(!dataValida(m.nasc)){m.erro='Escreva a data de nascimento assim: 25/08/1980.';return;}if((m.cel||'').replace(/\D/g,'').length<10){m.erro='Escreva o celular com DDD.';return;}if(m.cpf&&!cpfValido(m.cpf)){m.erro='O CPF tem um erro. Corrija ou deixe em branco.';return;}
    const p=novoPacObj({nome:m.nome.trim(),nasc:m.nasc,cel:m.cel.trim(),cpf:m.cpf||'',consWpp:m.consWpp,consDados:m.consDados});S.pacs.push(p);log('Cadastrou '+p.nome);
    S.ui.sheet=null;S.ui.pacSel=p.id;S.ui.editPac=false;S.ui.view='pacientes';toast('Paciente cadastrado.');},
  abrirPac:x=>{S.ui.pacSel=x.id;S.ui.editPac=false;if(role()==='medico')log('Abriu o prontuário de '+pacNome(x.id));go('pacientes');},
  voltarPacs:()=>{S.ui.pacSel=null;},
  editPac:()=>{S.ui.editPac=!S.ui.editPac;if(!S.ui.editPac)log('Atualizou o cadastro de '+pacNome(S.ui.pacSel));},
  /* WhatsApp */
  irConv:x=>{const c=convDoPac(x.id);if(!c.msgs.length)c.msgs.push({tipo:'sys',texto:'Conversa iniciada pelo sistema.',hora:carimbo()});c.ts=Date.now();S.ui.conv=c.id;S.ui.convAberta=true;go('whatsapp');S.ui._fundo=true;},
  conv:x=>{S.ui.conv=x.id;S.ui.convAberta=true;S.ui._fundo=true;},
  voltarLista:()=>{S.ui.convAberta=false;},
  rapida:x=>{const c=cAtual();if(c)S.ui.rasc[c.id]=rapidas()[+x.i][1];},
  enviar:()=>{const c=cAtual();if(!c)return;const t=(S.ui.rasc[c.id]||'').trim();if(!t)return;if(!wpp(c.pac,t)){toast('O paciente não autorizou mensagens pelo WhatsApp.','err');return;}S.ui.rasc[c.id]='';S.ui._fundo=true;},
  lembrete:x=>{const a=getAppt(x.id);const c=wpp(a.pac,preencher(S.clinica.msgs.lembrete,a));
    if(!c){toast('O paciente não autorizou mensagens pelo WhatsApp.','err');return;}a.lembrete=true;evento(a,'Lembrete enviado pelo WhatsApp',me().nome);log('Enviou lembrete para '+pacNome(a.pac));toast('WhatsApp aberto com o lembrete.');},
  pesqEnviar:x=>{const q=S.pesquisas.find(z=>z.id===x.id),a=getAppt(q.appt);const c=wpp(q.pac,preencher(S.clinica.msgs.pesquisaTexto,a));if(!c){toast('O paciente não autorizou mensagens pelo WhatsApp.','err');return;}q.enviada=true;log('Enviou pesquisa de satisfação para '+pacNome(q.pac));toast('WhatsApp aberto com a pesquisa. Quando o paciente responder, registre a nota.');},
  pesqNota:x=>{S.ui.sheet={type:'nota',id:x.id,nota:null,comentario:''};},
  notaV:x=>{S.ui.sheet.nota=+x.v;},
  notaOk:()=>{const m=S.ui.sheet,q=S.pesquisas.find(z=>z.id===m.id);if(m.nota==null)return;q.nota=m.nota;q.comentario=(m.comentario||'').trim();log(`Registrou nota ${m.nota} da pesquisa de ${pacNome(q.pac)}`);S.ui.sheet=null;toast('Resposta registrada.');},
  /* relatórios */
  relPer:x=>{S.ui.relPer=x.v;},
  relCsv:()=>{const [ini,fim]=periodo();const as=S.appts.filter(a=>a.dia>=ini&&a.dia<=fim&&!(a.status==='cancelado'&&a.motivo==='Horário mudado')).sort((a,b)=>a.dia.localeCompare(b.dia)||a.t-b.t);
    const linhas=[['data','hora','paciente','medico','especialidade','procedimento','situacao','valor']].concat(as.map(a=>[dmy(a.dia),fmt(a.t),pacNome(a.pac),profNome(a.prof),espNome((getUser(a.prof)||{}).espId),a.proc,STATUS[a.status][0],a.preco?c2t(a.preco):'']));
    baixar(`atendimentos-${ini}-a-${fim}.csv`,'﻿'+linhas.map(l=>l.map(csvCel).join(';')).join('\n'),'text/csv;charset=utf-8');},
  /* recados */
  recSel:x=>{S.ui.recSel=x.v;S.ui._fundo=true;if(x.v.startsWith('dm:')){const d=S.chat.dms[dmKey(S.user,x.v.slice(3))];if(d&&d.nl)d.nl[S.user]=0;}else S.chat.canais[x.v].nl=0;},
  recEnviar:()=>{const t=S.ui.recRasc.trim();if(!t)return;const sel=S.ui.recSel,msg={autor:me().nome,hora:carimbo(),texto:t};
    if(sel.startsWith('dm:')){const o=sel.slice(3),k=dmKey(S.user,o),d=S.chat.dms[k]||(S.chat.dms[k]={nl:{},msgs:[]});d.msgs.push(msg);d.nl[o]=(d.nl[o]||0)+1;}
    else{const c=S.chat.canais[sel];c.msgs.push(msg);}
    S.ui.recRasc='';S.ui._fundo=true;},
  tela:()=>{const el=document.getElementById('tv');if(el&&el.requestFullscreen)el.requestFullscreen().catch(()=>{toast('Tela cheia não disponível aqui.','err');render();});}
};
const cAtual=()=>S.convs.find(z=>z.id===S.ui.conv&&z.msgs.length)||S.convs.filter(c=>c.msgs.length).sort((a,b)=>b.ts-a.ts)[0];

const IN={
  setup:(v,el)=>{S.ui.setup[el.dataset.f]=v;},
  cfg:(v,el)=>{S.clinica[el.dataset.f]=v;save();},
  uiF:(v,el)=>{S.ui[el.dataset.f]=v;},
  novoU:(v,el)=>{S.ui.novoU[el.dataset.f]=v;},
  novoS:(v,el)=>{S.ui.novoS[el.dataset.f]=v;},
  nbF:(v,el)=>{S.ui.novoBloq[el.dataset.f]=v;},
  pol:(v,el)=>{S.clinica.politica[el.dataset.f]=v;save();},
  msgF:(v,el)=>{S.clinica.msgs[el.dataset.f]=v;save();},
  mdF:v=>{S.ui.modeloEd.nome=v;},
  mdSec:(v,el)=>{S.ui.modeloEd.secoes[+el.dataset.i]=v;},
  descPerfil:(v,el)=>{const n=Math.max(0,Math.min(100,parseInt(v,10)||0));S.perfis[el.dataset.r].descMax=n;save();},
  descUser:v=>{const u=getUser(S.ui.authUser);u.descMax=v.trim()===''?null:Math.max(0,Math.min(100,parseInt(v,10)||0));save();},
  reg:(v,el)=>{regDe(minhaConsulta(),true)[el.dataset.f]=v;save();},
  regC:(v,el)=>{regDe(minhaConsulta(),true).campos[+el.dataset.i]=v;save();},
  regV:(v,el)=>{regDe(minhaConsulta(),true).v[el.dataset.f]=v;render();},
  pacClin:(v,el)=>{const p=getPac(el.dataset.id);if(p){p[el.dataset.f]=v;save();}},
  cid:v=>{S.ui.cidBusca=v;render();},
  adendo:v=>{S.ui.adendo=v;save();},
  wiz:(v,el)=>{S.ui.sheet[el.dataset.f]=v;if(el.dataset.f==='busca')render();},
  rec:(v,el)=>{S.ui.sheet[el.dataset.f]=v;render();},
  cxIni:v=>{S.ui.sheet.valor=v;},
  cxCont:v=>{S.ui.sheet.contado=v;render();},
  docTxt:v=>{S.ui.sheet.texto=v;},
  notaCom:v=>{S.ui.sheet.comentario=v;},
  np:(v,el)=>{S.ui.sheet[el.dataset.f]=v;if(['cpf','nome','cel'].includes(el.dataset.f))render();},
  pacBusca:v=>{S.ui.pacBusca=v;render();},
  pacF:(v,el)=>{getPac(S.ui.pacSel)[el.dataset.f]=v;if(el.dataset.f==='cpf')render();else save();},
  waTxt:v=>{const c=cAtual();if(c)S.ui.rasc[c.id]=v;save();},
  recTxt:v=>{S.ui.recRasc=v;save();},
  histBusca:v=>{S.ui.histBusca=v;render();}
};
const CH={
  cfgHora:(v,el)=>{const t=hhmm(v);if(t==null)return;const c=S.clinica,f=el.dataset.f;const abre=f==='abre'?t:c.abre,fecha=f==='fecha'?t:c.fecha;
    if(fecha-abre<30){toast('O horário de fechar precisa ser depois do de abrir.','err');return;}c[f]=t;log(`Mudou o horário da clínica para ${fmt(c.abre)}–${fmt(c.fecha)}`);},
  cfgInt:v=>{S.clinica.intervalo=+v;log('Mudou o intervalo da agenda para '+v+' min');},
  horOn:(v,el)=>{const u=getUser(S.ui.horProf);u.horario[el.dataset.w].on=el.checked;log(`Mudou o horário de ${u.nome} (${SEMANA[el.dataset.w]})`);},
  horT:(v,el)=>{const t=hhmm(v);if(t==null)return;const u=getUser(S.ui.horProf),x=u.horario[el.dataset.w],f=el.dataset.f;const novo=Object.assign({},x,{[f]:t});
    if(novo.fim<=novo.ini){toast('O fim do atendimento precisa ser depois do início.','err');return;}
    if(novo.almFim<novo.almIni){toast('O fim do almoço precisa ser depois do início.','err');return;}
    if(novo.almFim>novo.almIni&&(novo.almIni<novo.ini||novo.almFim>novo.fim)){toast('O almoço precisa ficar dentro do horário de atendimento.','err');return;}
    x[f]=t;log(`Mudou o horário de ${u.nome} (${SEMANA[el.dataset.w]})`);},
  nuSel:(v,el)=>{S.ui.novoU[el.dataset.f]=v;},
  permPerfil:(v,el)=>{const r=el.dataset.r,p=el.dataset.p;if(r==='gestor'&&p==='config.gerenciar')return;S.perfis[r][p]=el.checked;log(`Autorização "${PERMS.find(x=>x[0]===p)[1]}" ${el.checked?'dada':'retirada'} para o perfil ${ROLES[r]}`);},
  permUser:(v,el)=>{const u=getUser(S.ui.authUser),p=el.dataset.p;if(u.id===S.user&&p==='config.gerenciar'&&v==='nao'){toast('Você não pode tirar de si mesmo o acesso às configurações.','err');return;}
    u.perms=u.perms||{};if(v==='perfil')delete u.perms[p];else u.perms[p]=v==='sim';log(`Exceção de autorização para ${u.nome}: "${PERMS.find(x=>x[0]===p)[1]}" → ${v==='perfil'?'do perfil':v==='sim'?'permitir':'negar'}`);},
  formaOn:(v,el)=>{const f=getForma(el.dataset.id);if(!el.checked&&formasAtivas().length<=1){toast('Deixe pelo menos uma forma de pagamento ligada.','err');return;}f.ativa=el.checked;log(`${el.checked?'Ligou':'Desligou'} a forma de pagamento ${f.nome}`);},
  formaParc:(v,el)=>{getForma(el.dataset.id).parcMax=+v;},
  polChk:(v,el)=>{S.clinica.politica[el.dataset.f]=el.checked;log('Mudou a política de desmarcação e faltas');},
  mdEsp:v=>{S.ui.modeloEd.espId=v;},
  msgDias:v=>{S.clinica.msgs.lembreteDias=+v;},
  msgPesq:(v,el)=>{S.clinica.msgs.pesquisa=el.checked;},
  termoOk:(v,el)=>{S.ui.sheet.aceito=el.checked;},
  regModelo:v=>{const r=regDe(minhaConsulta(),true),m=todosModelos().find(z=>z.id===v);if(!m)return;const ant={};r.modelo.secoes.forEach((s,i)=>{ant[s]=r.campos[i];});
    r.modelo={id:m.id,nome:m.nome,secoes:m.secoes.slice()};r.campos=m.secoes.map(s=>ant[s]||'');},
  regSig:(v,el)=>{regDe(minhaConsulta(),true).sigiloso=el.checked;},
  impArq:(v,el)=>{const f=el.files&&el.files[0];if(!f)return;if(f.size>5e6){toast('Arquivo grande demais para o esboço (máx. 5 MB).','err');return;}
    const rd=new FileReader();rd.onload=()=>{S.ui.imp=prepararImportacao(f.name,String(rd.result||''));render();};rd.onerror=()=>{toast('Não foi possível ler o arquivo.','err');render();};rd.readAsText(f,'utf-8');el.value='';},
  wizWpp:(v,el)=>{S.ui.sheet.wpp=el.checked;},
  desAvisar:(v,el)=>{S.ui.sheet.avisar=el.checked;},
  pacCons:(v,el)=>{const p=getPac(S.ui.pacSel);p[el.dataset.f]=el.checked;log((el.checked?'Registrou':'Retirou')+' autorização de '+p.nome+' ('+(el.dataset.f==='consWpp'?'WhatsApp':'dados')+')');},
  npCons:(v,el)=>{S.ui.sheet[el.dataset.f]=el.checked;}
};

document.addEventListener('click',e=>{
  const el=e.target.closest('[data-act]');if(!el)return;
  if(el.dataset.act==='overlay'&&e.target!==el)return;
  const fn=ACT[el.dataset.act];if(!fn)return;
  e.preventDefault();
  const snap=UNDO.has(el.dataset.act)?JSON.stringify(S):null;
  fn(Object.assign({},el.dataset),el);
  if(snap&&S.ui.toast&&S.ui.toast.kind!=='err')S.ui.toast.undo=snap;
  render();
});
document.addEventListener('input',e=>{const el=e.target;const k=el.dataset&&el.dataset.in;if(k&&IN[k])IN[k](el.value,el);});
document.addEventListener('change',e=>{const el=e.target;const k=el.dataset&&el.dataset.ch;if(k&&CH[k]){CH[k](el.value,el);render();}});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&S.ui.sheet){S.ui.sheet=null;render();return;}
  const el=e.target;if(e.key==='Enter'&&!e.shiftKey&&el.dataset&&el.dataset.enter){e.preventDefault();ACT[el.dataset.enter]({});render();}
});
/* relógio: atualiza a tela a cada minuto, sem atrapalhar quem está digitando */
let ultimoMin=now();
setInterval(()=>{const m=now();if(m===ultimoMin)return;ultimoMin=m;const ae=document.activeElement;if(ae&&/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName))return;if(S.ui.sheet)return;render();},15000);

S=load();
render();
