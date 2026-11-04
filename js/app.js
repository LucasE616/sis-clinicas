'use strict';
/* sis_Clinicas — primeiro esboço.
   Só front-end (HTML, CSS e JS puro): os dados ficam salvos no navegador (localStorage).
   A API em Node.js + PostgreSQL substitui esse armazenamento na próxima etapa (ver docs/arquitetura.md). */

const KEY='sis-clinicas-v1';
const SLOT=30;
const ROLES={recepcao:'Recepção',medico:'Médico(a)',gestor:'Gestão'};
const VIEWS={inicio:['Início','home'],consulta:['Consulta','file'],agenda:['Agenda','cal'],whatsapp:['WhatsApp','wpp'],pagamentos:['Pagamentos','card'],pacientes:['Pacientes','users'],recados:['Recados','chat'],relatorios:['Relatórios','bars'],historico:['Histórico','shield'],config:['Configurações','gear'],tv:['Tela da TV','tv']};
const PERM={
  recepcao:['inicio','agenda','whatsapp','pagamentos','pacientes','recados','tv'],
  medico:['inicio','consulta','agenda','pacientes','recados'],
  gestor:['inicio','agenda','whatsapp','pagamentos','pacientes','relatorios','historico','recados','config','tv']
};
const STATUS={agendado:['Marcado','neutral'],confirmado:['Confirmado','info'],chegou:['Chegou','warn'],em_atendimento:['Em consulta','accent'],atendido:['Atendido','ok'],faltou:['Faltou','bad'],cancelado:['Desmarcado','neutral']};
const FORMAS={pix:'PIX',dinheiro:'Dinheiro',debito:'Cartão de débito',credito:'Cartão de crédito'};
/* Amostra da CID-10. A tabela completa do DATASUS entra junto com o banco de dados. */
const CID=[['J06.9','Infecção das vias aéreas superiores'],['J02.9','Faringite aguda'],['R50.9','Febre'],['I10','Hipertensão'],['R51','Dor de cabeça'],['E11.9','Diabetes tipo 2'],['M54.5','Dor lombar'],['L30.9','Dermatite'],['I49.9','Arritmia'],['Z00.0','Exame de rotina']];
const MOTIVOS=['O paciente pediu','O médico não poderá atender','Marcado por engano'];
const SEMANA=['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
const MESES=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const DOCS={
  atestado:['Atestado',p=>`Atesto, para os devidos fins, que ${p.nome} esteve sob meus cuidados nesta data e necessita de ___ dia(s) de afastamento de suas atividades, a partir de ${dmy(hoje())}.`],
  exames:['Pedido de exames',p=>`Solicito para ${p.nome}:\n\n• `],
  receita:['Receita',()=>`Uso oral\n\n1. `],
  declaracao:['Declaração de comparecimento',p=>`Declaro que ${p.nome} compareceu a esta clínica em ${dmy(hoje())} para atendimento médico.`]
};
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
function cpfValido(c){c=String(c).replace(/\D/g,'');if(c.length!==11||/^(\d)\1+$/.test(c))return false;for(let j=9;j<11;j++){let s=0;for(let i=0;i<j;i++)s+=+c[i]*(j+1-i);let d=(s*10)%11;if(d===10)d=0;if(d!==+c[j])return false;}return true;}

/* datas: o dia é guardado como 'aaaa-mm-dd' e a hora em minutos desde 00:00 */
const isoDe=dt=>dt.getFullYear()+'-'+pad(dt.getMonth()+1)+'-'+pad(dt.getDate());
const dataDe=d=>{const [y,m,dd]=d.split('-').map(Number);return new Date(y,m-1,dd);};
const hoje=()=>isoDe(new Date());
const somaDias=(d,n)=>{const x=dataDe(d);x.setDate(x.getDate()+n);return isoDe(x);};
const now=()=>{const x=new Date();return x.getHours()*60+x.getMinutes();};
const dm=d=>d.slice(8,10)+'/'+d.slice(5,7);
const dmy=d=>d.slice(8,10)+'/'+d.slice(5,7)+'/'+d.slice(0,4);
const rotDia=d=>d===hoje()?'Hoje':d===somaDias(hoje(),1)?'Amanhã':SEMANA[dataDe(d).getDay()].slice(0,3)+', '+dm(d);
const rotLongo=d=>{const x=dataDe(d);return SEMANA[x.getDay()]+', '+x.getDate()+' de '+MESES[x.getMonth()];};
const diasAgenda=()=>Array.from({length:7},(_,i)=>somaDias(hoje(),i));
const quando=(d,t)=>{const r=rotDia(d);return r+(r==='Hoje'||r==='Amanhã'?' às ':', ')+fmt(t);};
const carimbo=()=>dm(hoje())+' às '+fmt(now());
const hhmm=v=>{const m=/^(\d{1,2}):(\d{2})$/.exec(v||'');return m?(+m[1])*60+(+m[2]):null;};
function idade(p){const m=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(p.nasc||'');if(!m)return null;const t=new Date();let i=t.getFullYear()-(+m[3]);if(t.getMonth()+1<+m[2]||(t.getMonth()+1===+m[2]&&t.getDate()<+m[1]))i--;return i>=0&&i<130?i:null;}
const idTxt=p=>{const i=idade(p);return i!=null?i+' anos · ':'';};

/* ---------- estado ---------- */
function uiBase(){return {view:'inicio',dia:null,agProf:'todos',sheet:null,toast:null,conv:null,convAberta:false,rasc:{},recSel:'recepcao',recRasc:'',pacBusca:'',pacSel:null,editPac:false,cidBusca:'',adendo:'',histBusca:'',consulta:null,fim:null,
  cfgTab:'clinica',novoU:{nome:'',role:'recepcao',esp:'',crm:'',sala:''},novoS:{nome:'',dur:30,preco:''},setup:{clinica:'',nome:''},apagarArmado:false,erro:''};}
function novo(){return {v:1,clinica:null,users:[],user:null,servicos:[],pacs:[],appts:[],contas:[],pays:[],regs:[],convs:[],
  chat:{canais:{recepcao:{nome:'Recepção',nl:0,msgs:[]},financeiro:{nome:'Financeiro',nl:0,msgs:[]},avisos:{nome:'Avisos do sistema',sistema:true,nl:0,msgs:[]}},dms:{}},
  chamadas:[],caixa:null,audit:[],ui:uiBase()};}
let S;
function load(){try{const raw=localStorage.getItem(KEY);if(raw){const o=JSON.parse(raw);if(o&&o.v===1){o.ui=Object.assign(uiBase(),o.ui||{},{sheet:null,toast:null,apagarArmado:false,erro:''});return o;}}}catch(e){}return novo();}
function save(){try{const ui=Object.assign({},S.ui,{sheet:null,toast:null,apagarArmado:false});localStorage.setItem(KEY,JSON.stringify(Object.assign({},S,{ui})));}catch(e){}}

const getUser=id=>S.users.find(u=>u.id===id);
const me=()=>getUser(S.user);
const role=()=>me().role;
const front=()=>role()!=='medico';
const profs=()=>S.users.filter(u=>u.role==='medico');
const papel=u=>u.role==='medico'?(u.esp||'Médico(a)'):ROLES[u.role];
const getPac=id=>S.pacs.find(p=>p.id===id);
const getAppt=id=>S.appts.find(a=>a.id===id);
const getServ=id=>S.servicos.find(s=>s.id===id);
const pacNome=id=>{const p=getPac(id);return p?p.nome:'—';};
const profNome=id=>{const p=getUser(id);return p?p.nome:'—';};
const salaDe=id=>{const p=getUser(id);return (p&&p.sala)||'Consultório';};
function log(a){S.audit.unshift({d:hoje(),t:now(),u:me()?me().nome:'Sistema',a});}
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

/* agenda */
function conflito(prof,d,t,dur,ignore){
  const a=S.appts.find(x=>x.id!==ignore&&x.prof===prof&&x.dia===d&&!['cancelado','faltou'].includes(x.status)&&!x.encaixe&&x.t<t+dur&&t<x.t+x.dur);
  if(a)return `Já tem ${pacNome(a.pac)} às ${fmt(a.t)}.`;
  if(t<S.clinica.abre||t+dur>S.clinica.fecha)return `Fora do expediente (${fmt(S.clinica.abre)} às ${fmt(S.clinica.fecha)}).`;
  return null;
}
function horarios(prof,d,dur){const r=[];for(let t=S.clinica.abre;t+dur<=S.clinica.fecha;t+=SLOT){if(d===hoje()&&t<=now())continue;r.push({t,livre:!conflito(prof,d,t,dur,null)});}return r;}
function proximoLivre(prof,dur){for(const d of diasAgenda()){const h=horarios(prof,d,dur).find(x=>x.livre);if(h)return {d,t:h.t};}return null;}
function criarAppt(o){
  const a={id:uid('a'),dia:o.d,prof:o.prof,t:o.t,dur:o.dur,proc:o.proc,preco:o.preco||0,pac:o.pac,status:o.status||'agendado',origem:o.origem||'Telefone',encaixe:!!o.encaixe,lembrete:false,chegou:null,chamado:null,motivo:'',evs:[]};
  a.evs.push({t:(o.mudado?'Horário mudado por ':'Marcado por ')+me().nome,q:carimbo()});
  S.appts.push(a);return a;
}
function mudarHorario(a,d,t){
  const err=conflito(a.prof,d,t,a.dur,a.id);if(err)return {err};
  const conf=a.status==='confirmado';
  a.status='cancelado';a.motivo='Horário mudado';evento(a,'Horário mudado para '+quando(d,t).toLowerCase(),me().nome);
  const n=criarAppt({d,t,prof:a.prof,proc:a.proc,dur:a.dur,preco:a.preco,pac:a.pac,origem:a.origem,mudado:true,status:conf?'confirmado':'agendado'});
  log(`Mudou o horário de ${pacNome(a.pac)}: ${quando(a.dia,a.t)} → ${quando(d,t)}`);
  return {novo:n};
}
function desmarcar(a,motivo,avisar){
  a.status='cancelado';a.motivo=motivo;evento(a,'Desmarcado ('+motivo.toLowerCase()+')',me().nome);
  log(`Desmarcou ${pacNome(a.pac)} (${quando(a.dia,a.t)}): ${motivo}`);
  if(avisar)return wpp(a.pac,`Olá, ${curto(pacNome(a.pac))}. Sua consulta de ${quando(a.dia,a.t).toLowerCase()} com ${profNome(a.prof)} foi desmarcada. Para marcar outro dia, é só responder esta mensagem.`);
  return null;
}
function regDe(a,criar){let r=S.regs.find(x=>x.appt===a.id);if(!r&&criar){r={id:uid('r'),pac:a.pac,prof:a.prof,appt:a.id,data:dmy(a.dia),sigiloso:false,status:'rascunho',queixa:'',exame:'',conduta:'',cids:[],v:{pa:'',temp:'',peso:'',alt:''},docs:[],adendos:[],assinadoEm:''};S.regs.push(r);}return r;}
function minhaConsulta(){const p=me().id;let a=S.ui.consulta?getAppt(S.ui.consulta):null;if(a&&a.prof!==p)a=null;return a||S.appts.find(x=>x.dia===hoje()&&x.prof===p&&x.status==='em_atendimento')||null;}
const filaMedico=prof=>S.appts.filter(a=>a.dia===hoje()&&a.prof===prof&&a.status==='chegou').sort((a,b)=>a.chegou-b.chegou);

/* WhatsApp (Fase 0): o sistema monta o texto e abre o WhatsApp com a mensagem pronta (link wa.me) */
function abrirWa(fone,texto){let d=String(fone||'').replace(/\D/g,'');if(d.length===10||d.length===11)d='55'+d;try{window.open('https://wa.me/'+d+'?text='+encodeURIComponent(texto),'_blank','noopener');}catch(e){}}
function convDoPac(pacId){let c=S.convs.find(x=>x.pac===pacId);if(!c){const p=getPac(pacId);c={id:uid('cv'),pac:pacId,fone:p.cel,ts:Date.now(),msgs:[]};S.convs.push(c);}return c;}
function wpp(pacId,texto){const p=getPac(pacId);if(!p||!p.consWpp)return null;const c=convDoPac(pacId);c.fone=p.cel;c.msgs.push({tipo:'out',texto,hora:carimbo(),autor:me().nome});c.ts=Date.now();abrirWa(p.cel,texto);return c;}
const lembretesPend=()=>{const am=somaDias(hoje(),1);return S.appts.filter(a=>a.dia===am&&['agendado','confirmado'].includes(a.status)&&!a.lembrete&&(getPac(a.pac)||{}).consWpp).sort((a,b)=>a.t-b.t);};
function rapidas(){
  const c=S.clinica,serv=S.servicos.filter(s=>s.preco>0).slice(0,3);
  return [['Endereço',`Estamos na ${c.endereco||'[endereço da clínica]'}.`],
    ['Valores',serv.length?'Valores: '+serv.map(s=>s.nome+' '+brl(s.preco)).join('; ')+'. Aceitamos PIX, débito e crédito.':'Aceitamos PIX, débito e crédito.'],
    ['Horário',`Atendemos das ${fmt(c.abre)} às ${fmt(c.fecha)}.`],
    ['Documentos','Traga um documento com foto e, se tiver, seus exames anteriores.'],
    ['Obrigado','Por nada! Qualquer dúvida, é só chamar.']];
}

/* ---------- renderização ---------- */
const app=document.getElementById('app');
function render(){
  const ae=document.activeElement;const fid=ae&&ae.id;let ss=null,se=null;
  try{ss=ae.selectionStart;se=ae.selectionEnd;}catch(e){}
  const keep={};document.querySelectorAll('[data-keep]').forEach(el=>{keep[el.dataset.keep]=el.scrollTop;});
  if(!S.clinica||!S.users.length)app.innerHTML=telaSetup()+toastHTML();
  else if(!me())app.innerHTML=telaLogin()+toastHTML();
  else{
    if(!PERM[role()].includes(S.ui.view))S.ui.view='inicio';
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
    <p class="muted small">Você entra como <b>Gestão</b>. Depois, em Configurações, cadastre os médicos, a recepção e os serviços.</p>
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
  const nWa=role()!=='medico'?lembretesPend().length:0;
  const nRec=Object.values(S.chat.canais).reduce((s,c)=>s+(c.nl||0),0)+Object.entries(S.chat.dms).filter(([k])=>k.split('|').includes(S.user)).reduce((s,[,d])=>s+((d.nl||{})[S.user]||0),0);
  const nFila=role()==='medico'?filaMedico(me().id).length:0;
  const dot={whatsapp:nWa,recados:nRec,inicio:nFila};
  const nav=PERM[role()].filter(v=>v!=='tv').map(v=>`<button type="button" class="nav-i" data-act="nav" data-v="${v}"${S.ui.view===v?' aria-current="page"':''}>${ic(VIEWS[v][1],22)}<span>${VIEWS[v][0]}</span>${dot[v]?`<span class="dot">${dot[v]}</span>`:''}</button>`).join('');
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
  if(role()!=='gestor')return `<div class="note info"><span>Para marcar consultas, a gestão precisa cadastrar ${!temMed&&!temServ?'os médicos e os serviços':!temMed?'os médicos':'os serviços'} em Configurações.</span></div>`;
  const f=[[temMed,'Cadastrar os médicos','equipe'],[temServ,'Cadastrar os serviços e valores','servicos'],[S.users.some(u=>u.role==='recepcao'),'Cadastrar a recepção (opcional)','equipe'],[!!S.clinica.endereco,'Informar endereço e horário da clínica (opcional)','clinica']];
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
  const nLem=lembretesPend().length,nPag=abertas().length;
  let h=head(`${saudacao()}, ${esc(curto(me().nome))}`,`${rotLongo(hoje())} · ${fmt(now())}. O que você precisa fazer agora?`,trocar());
  h+=passos();
  h+=`<div class="tiles">
    <button type="button" class="tile main" data-act="agendar"><span class="ic">${ic('cal',26)}</span><b>Marcar consulta</b><span>Encontre o paciente e escolha o horário</span></button>
    <button type="button" class="tile" data-act="nav" data-v="whatsapp"><span class="ic">${ic('wpp',26)}</span><b>WhatsApp</b><span>${nLem?plural(nLem,'lembrete de amanhã para enviar','lembretes de amanhã para enviar'):'Nenhum lembrete pendente'}</span>${nLem?`<span class="count">${nLem}</span>`:''}</button>
    <button type="button" class="tile" data-act="nav" data-v="pagamentos"><span class="ic">${ic('card',26)}</span><b>Receber pagamento</b><span>${nPag?plural(nPag,'pagamento pendente','pagamentos pendentes'):'Nada pendente'}</span>${nPag?`<span class="count">${nPag}</span>`:''}</button>
    <button type="button" class="tile" data-act="nav" data-v="tv"><span class="ic">${ic('tv',26)}</span><b>Tela da sala de espera</b><span>Abrir o painel de chamada</span></button></div>`;
  h+=`<div class="cols"><div class="a"><section class="card"><h2>Chegando hoje <button type="button" class="link" data-act="nav" data-v="agenda">Ver agenda completa</button></h2><p class="muted small">Quando o paciente chegar, toque em <b>Chegou</b>.</p><div class="list">${chegando.map(a=>{const atraso=now()-a.t;
      return linha(a,{extra:atraso>15?`<span class="pill bad">${atraso} min atrasado</span>`:'',acao:`<button type="button" class="btn primary" data-act="chegou" data-id="${a.id}">${ic('login')} Chegou</button>${atraso>15?`<button type="button" class="btn sm" data-act="faltou" data-id="${a.id}">Faltou</button>`:''}`});}).join('')||'<p class="muted">Ninguém marcado para o resto do dia.</p>'}</div></section></div>
    <div class="b"><section class="card"><h2>Sala de espera <span class="pill warn">${espera.length}</span></h2><div class="list">${espera.map(a=>{const w=Math.max(0,now()-a.chegou);const c=contaDe(a);const deve=c&&faltaConta(c)>0;
      return linha(a,{sub:`${curto(profNome(a.prof))} · esperando ${w} min`,acao:deve?`<button type="button" class="btn sm soft" data-act="receber" data-id="${c.id}">Receber</button>`:`<span class="pill ${w>=30?'bad':'warn'}">${w} min</span>`});}).join('')||'<p class="muted">Sala vazia.</p>'}</div><p class="muted small">Quem chama o paciente é o médico, pelo sistema. O nome aparece na TV.</p></section>
    ${consulta.length?`<section class="card"><h2>Em consulta</h2><div class="list">${consulta.map(a=>linha(a,{sub:salaDe(a.prof)+' · '+curto(profNome(a.prof))})).join('')}</div></section>`:''}</div></div>`;
  return h;
}
function inicioMedico(){
  const p=me().id,fila=filaMedico(p),atual=S.appts.find(a=>a.dia===hoje()&&a.prof===p&&a.status==='em_atendimento');
  const dia=S.appts.filter(a=>a.dia===hoje()&&a.prof===p&&a.status!=='cancelado').sort((a,b)=>a.t-b.t);
  let h=head(`${saudacao()}, ${esc(curto(me().nome))}`,`${rotLongo(hoje())} · ${fmt(now())} · ${esc(salaDe(p))}`,trocar());
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
  const nLem=lembretesPend().length;if(nLem)pend.push(['warn',`${plural(nLem,'lembrete de amanhã ainda não enviado','lembretes de amanhã ainda não enviados')}`,'whatsapp']);
  const ab=abertas();if(ab.length)pend.push(['warn',`${plural(ab.length,'pagamento pendente','pagamentos pendentes')} (${brl(ab.reduce((s,c)=>s+faltaConta(c),0))})`,'pagamentos']);
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
  let h=head('Agenda',pf==='todos'?'Escolha um médico para ver os horários livres. Toque num paciente para ver as opções.':'Toque num horário livre para marcar. Toque num paciente para ver as opções.',`<button type="button" class="btn primary" data-act="agendar">${ic('plus')} Marcar consulta</button>`);
  if(!lst.length)return h+passos();
  h+=`<div class="chips" role="group" aria-label="Dia">${diasAgenda().map(x=>`<button type="button" class="chip" data-act="dia" data-v="${x}" aria-pressed="${d===x}">${rotDia(x)}</button>`).join('')}</div>`;
  h+=`<div class="chips" role="group" aria-label="Médico"><button type="button" class="chip" data-act="agProf" data-v="todos" aria-pressed="${pf==='todos'}">Todos</button>${lst.map(p=>`<button type="button" class="chip" data-act="agProf" data-v="${p.id}" aria-pressed="${pf===p.id}"><span class="av">${iniciais(p.nome)}</span>${esc(curto(p.nome))}</button>`).join('')}</div>`;
  let lista='';const ehHoje=d===hoje(),n=now();
  const agora=ehHoje?`<div class="nowline">Agora · ${fmt(n)}</div>`:'';
  if(pf==='todos'){
    const as=S.appts.filter(a=>a.dia===d&&a.status!=='cancelado').sort((a,b)=>a.t-b.t||profNome(a.prof).localeCompare(profNome(b.prof)));
    let pos=false;
    as.forEach(a=>{if(ehHoje&&!pos&&a.t>=n-15){lista+=agora;pos=true;}lista+=linha(a,{sub:curto(profNome(a.prof))+' · '+a.proc+(a.encaixe?' · encaixe':'')});});
    if(ehHoje&&!pos)lista+=agora;
    if(!as.length)lista='<p class="muted">Nenhuma consulta neste dia.</p>';
  }else{
    const as=S.appts.filter(a=>a.dia===d&&a.prof===pf&&a.status!=='cancelado');let pos=false;
    const dentro=(ini,fim)=>as.filter(a=>a.t>=ini&&a.t<fim).sort((x,y)=>x.t-y.t).map(a=>linha(a,{sub:a.proc+(a.encaixe?' · encaixe':'')+(a.dur>30?' · '+a.dur+' min':'')})).join('');
    lista+=dentro(0,S.clinica.abre);
    for(let t=S.clinica.abre;t<S.clinica.fecha;){
      if(ehHoje&&!pos&&t>=n-15){lista+=agora;pos=true;}
      const aqui=as.filter(a=>a.t===t);
      if(aqui.length){const passo=Math.max(...aqui.filter(a=>!a.encaixe).map(a=>a.dur).concat([SLOT]));lista+=dentro(t,t+passo);t+=passo;}
      else{const meio=as.filter(a=>a.t>t&&a.t<t+SLOT);if(meio.length){lista+=dentro(t+1,t+SLOT);}else if(!(ehHoje&&t+SLOT<=n))lista+=`<div style="padding:5px 0"><button type="button" class="free" data-act="agendarEm" data-p="${pf}" data-t="${t}"><span class="when">${fmt(t)}</span><span>Livre · toque para marcar</span></button></div>`;t+=SLOT;}
    }
    lista+=dentro(S.clinica.fecha,24*60);
    if(ehHoje&&!pos)lista+=agora;
  }
  h+=`<section class="card"><h2>${rotLongo(d)}${pf!=='todos'?' · '+esc(profNome(pf)):''}</h2><div class="list">${lista}</div></section>`;
  return h;
}

/* ---------- Consulta (médico) ---------- */
function vConsulta(){
  const a=minhaConsulta();
  if(S.ui.fim&&getAppt(S.ui.fim)&&getAppt(S.ui.fim).prof===me().id&&(!a||a.status!=='em_atendimento')){
    const f=getAppt(S.ui.fim),prox=filaMedico(me().id)[0];
    return `<section class="card done"><span class="ok-ic">${ic('check',40)}</span><h1>Consulta finalizada</h1><p class="muted" style="font-size:18px">O registro de ${esc(pacNome(f.pac))} foi finalizado e não pode mais ser alterado.${f.preco?' O pagamento foi enviado para a recepção.':''}</p>
      ${prox?`<button type="button" class="btn primary big" data-act="chamar" data-id="${prox.id}">${ic('speaker',22)} Chamar ${esc(curto(pacNome(prox.pac)))}</button>`:'<p class="muted">Ninguém na sala de espera.</p>'}<button type="button" class="link" data-act="abrirConsulta" data-id="${f.id}">Rever a consulta finalizada</button></section>`;
  }
  if(!a){const prox=filaMedico(me().id)[0];return head('Consulta','Nenhuma consulta aberta agora.')+`<section class="card done">${ic('file',40)}<p style="font-size:18px">${prox?`${esc(pacNome(prox.pac))} está esperando há ${Math.max(0,now()-prox.chegou)} min.`:'Ninguém na sala de espera.'}</p>${prox?`<button type="button" class="btn primary big" data-act="chamar" data-id="${prox.id}">${ic('speaker',22)} Chamar agora</button>`:''}</section>`;}
  const p=getPac(a.pac);const reg=regDe(a,a.status==='em_atendimento');
  if(!reg)return head(esc(p.nome),'Sem registro desta consulta.');
  const ro=reg.status==='assinado';
  const num=x=>parseFloat(String(x).replace(',','.'));const imc=num(reg.v.peso)/Math.pow(num(reg.v.alt)/100,2);
  const ta=(f,l,ph,rows)=>`<label class="field">${l}<textarea id="c-${f}" rows="${rows}" data-in="reg" data-f="${f}" placeholder="${ph}"${ro?' readonly':''}>${esc(reg[f])}</textarea></label>`;
  const vi=(f,l,un)=>`<label class="field">${l} <span class="hint">${un}</span><input id="c-v-${f}" inputmode="decimal" value="${esc(reg.v[f])}" data-in="regV" data-f="${f}"${ro?' readonly':''}></label>`;
  const q=S.ui.cidBusca.trim().toLowerCase();
  const sug=!ro&&q?CID.filter(c=>!reg.cids.includes(c[0])&&(c[0].toLowerCase().includes(q)||c[1].toLowerCase().includes(q))).slice(0,5):[];
  const pc=(f,l)=>`<label class="field">${l}<textarea id="pc-${f}" rows="2" data-in="pacClin" data-f="${f}" data-id="${p.id}">${esc(p[f])}</textarea></label>`;
  let h=`<div class="head"><div style="display:flex;gap:14px;align-items:center"><span class="av" style="width:58px;height:58px;font-size:20px">${iniciais(p.nome)}</span><div><h1>${esc(p.nome)}</h1><p>${idTxt(p)}${esc(a.proc)} das ${fmt(a.t)}${a.status==='em_atendimento'?' · em consulta há '+Math.max(0,now()-a.chamado)+' min':''}</p></div></div>${ro?'':`<button type="button" class="btn primary big" data-act="finalizar">${ic('check',22)} Finalizar consulta</button>`}</div>`;
  if(p.alergias)h+=`<div class="allergy">${ic('alert',26)} ALERGIA: ${esc(p.alergias).toUpperCase()}</div>`;
  if(ro)h+=`<div class="note ok"><span>${ic('lock')} Consulta finalizada em ${esc(reg.assinadoEm)}. Para corrigir algo, adicione uma observação no final.</span></div>`;
  h+=`<div class="cols"><div class="a"><section class="card">
    ${ta('queixa','O que o paciente contou','Sintomas, há quanto tempo, o que já tomou…',4)}
    <div class="vit">${vi('pa','Pressão','ex.: 120/80')}${vi('temp','Temperatura','°C')}${vi('peso','Peso','kg')}${vi('alt','Altura','cm')}<div class="field">IMC <span class="hint">automático</span><input id="c-imc" readonly value="${isFinite(imc)?imc.toFixed(1).replace('.',','):'—'}"></div></div>
    ${ta('exame','Exame físico','O que você observou no exame',3)}
    <div class="field">Diagnóstico <span class="hint">CID-10</span><div class="chips">${reg.cids.map(c=>{const x=CID.find(y=>y[0]===c);return `<span class="pill info" style="font-size:15px">${esc(c)} · ${esc(x?x[1]:'')}${ro?'':` <button type="button" class="link" style="padding:0;min-height:0;color:inherit" data-act="cidRem" data-c="${c}" aria-label="Tirar ${c}">${ic('x',14)}</button>`}</span>`;}).join('')}</div>
      ${ro?'':`<div class="search" style="min-height:50px">${ic('search')}<label class="sr" for="c-cid">Buscar diagnóstico</label><input id="c-cid" type="search" value="${esc(S.ui.cidBusca)}" data-in="cid" placeholder="Digite o nome ou o código (ex.: febre)"></div>${sug.length?`<div class="chips">${sug.map(c=>`<button type="button" class="chip" data-act="cidAdd" data-c="${c[0]}">${ic('plus',16)} ${esc(c[1])} (${c[0]})</button>`).join('')}</div>`:''}`}</div>
    ${ta('conduta','Orientação e tratamento','O que o paciente deve fazer',3)}
    ${reg.adendos.map(ad=>`<div class="note ok" style="flex-direction:column;align-items:flex-start;gap:4px"><b>Observação adicionada em ${esc(ad.hora)}</b><span style="white-space:pre-line;font-weight:400">${esc(ad.texto)}</span></div>`).join('')}
    ${ro?`<label class="field">Adicionar observação <span class="hint">fica junto com a consulta, com data e autor</span><textarea id="c-adendo" rows="2" data-in="adendo">${esc(S.ui.adendo)}</textarea></label><div><button type="button" class="btn" data-act="adendo">${ic('pen')} Adicionar observação</button></div>`:`<p class="muted small">${ic('check',14)} Tudo o que você escreve é salvo sozinho.</p>`}
    </section>
    <section class="card"><h2>Documentos para o paciente</h2>${ro&&!reg.docs.length?'<p class="muted">Nenhum documento.</p>':ro?'':`<div class="chips">${Object.entries(DOCS).map(([k,v])=>`<button type="button" class="chip" data-act="doc" data-v="${k}">${ic('plus',16)} ${v[0]}</button>`).join('')}</div>`}
      ${reg.docs.map(dc=>`<div class="note ${dc.enviado?'ok':'info'}"><span>${esc(DOCS[dc.tipo][0])} · emitido às ${esc(dc.hora)}${dc.enviado?' · enviado pelo WhatsApp':''}</span></div>`).join('')}</section></div>
    <div class="b"><section class="card"><h2>Sobre o paciente</h2>${pc('alergias','Alergias')}${pc('meds','Remédios em uso')}${pc('problemas','Doenças e cuidados')}</section>
    ${histPac(p,reg)}</div></div>`;
  return h;
}
function histPac(p,reg){
  const hs=S.regs.filter(r=>r.pac===p.id&&r.status==='assinado'&&(!reg||r.id!==reg.id)).slice().reverse();
  return `<section class="card"><h2>Consultas anteriores</h2>${hs.length?hs.map(r=>r.sigiloso&&r.prof!==me().id?`<div class="muted small" style="display:flex;gap:8px;align-items:center">${ic('lock',16)} ${esc(r.data)} · registro sigiloso de outro médico</div>`:`<details class="more" style="border-top:1px solid var(--line-2)"><summary>${esc(r.data)} · ${esc(curto(profNome(r.prof)))}</summary><div style="display:flex;flex-direction:column;gap:6px;padding-bottom:10px"><span>${esc(r.queixa||'—')}</span>${r.conduta?`<span class="muted">${esc(r.conduta)}</span>`:''}${r.cids.length?`<span class="small muted">CID ${esc(r.cids.join(', '))}</span>`:''}</div></details>`).join(''):'<p class="muted">Primeira consulta na clínica.</p>'}<p class="muted small">Cada vez que alguém abre um prontuário, fica registrado.</p></section>`;
}

/* ---------- WhatsApp ---------- */
function vWhats(){
  const lem=lembretesPend();
  const ord=S.convs.filter(c=>c.msgs.length).sort((a,b)=>b.ts-a.ts);
  const c=S.convs.find(x=>x.id===S.ui.conv&&x.msgs.length)||ord[0];
  let h=head('WhatsApp','O sistema prepara a mensagem e abre o WhatsApp com o texto pronto. É só tocar em enviar.');
  h+=`<section class="card"><h2>Lembretes de amanhã <span class="pill ${lem.length?'warn':'ok'}">${lem.length}</span></h2>${lem.length?`<div class="list">${lem.map(a=>linha(a,{acao:`<button type="button" class="btn sm primary" data-act="lembrete" data-id="${a.id}">${ic('send',16)} Enviar lembrete</button>`})).join('')}</div>`:'<p class="muted">Nenhum lembrete para enviar.</p>'}<p class="muted small">Quando o paciente responder no WhatsApp, confirme a consulta na agenda.</p></section>`;
  if(!c)return h+`<section class="card"><h2>Conversas</h2><p class="muted">Nenhuma mensagem enviada ainda. As mensagens enviadas pelo sistema (confirmações, lembretes, recibos) aparecem aqui.</p></section>`;
  const item=x=>{const u=x.msgs[x.msgs.length-1];return `<button type="button" class="conv" data-act="conv" data-id="${x.id}" aria-current="${x.id===c.id}"><span class="av">${iniciais(pacNome(x.pac))}</span><span class="t"><b>${esc(pacNome(x.pac))}</b><span>${esc(u?u.texto:'')}</span></span><span class="small muted">${esc(u?u.hora.split(' às ')[0]:'')}</span></button>`;};
  h+=`<div class="wa${S.ui.convAberta?' aberta':''}"><div class="wa-list" data-keep="walist"><h3>Conversas (${ord.length})</h3>${ord.map(item).join('')}</div>`;
  h+=`<section class="wa-main"><div class="wa-head"><button type="button" class="x so-cel" data-act="voltarLista" aria-label="Voltar para a lista">${ic('left')}</button><div style="flex:1 1 160px;min-width:0"><b style="font-size:18px">${esc(pacNome(c.pac))}</b><div class="small muted">${esc(c.fone)}</div></div><button type="button" class="btn sm" data-act="abrirPac" data-id="${c.pac}">Ver ficha</button></div>
    <div class="msgs">${c.msgs.map(m=>m.tipo==='sys'?`<div class="m sys"><span class="sysm">${esc(m.texto)}</span></div>`:`<div class="m out"><div class="bub">${m.autor?`<span class="rot">${esc(m.autor)}</span>`:''}<span class="txt">${esc(m.texto)}</span><span class="h">${esc(m.hora)}</span></div></div>`).join('')}
    <div class="m sys"><span class="sysm">As respostas do paciente chegam no WhatsApp da clínica. A caixa de entrada integrada vem com a API oficial.</span></div></div>`;
  h+=ctxBar(c);
  const r=S.ui.rasc[c.id]||'';
  h+=`<div class="compose"><div class="qr" aria-label="Respostas prontas">${rapidas().map((x,i)=>`<button type="button" data-act="rapida" data-i="${i}">${x[0]}</button>`).join('')}</div><div style="display:flex;gap:10px;align-items:flex-end"><label class="sr" for="wa-txt">Mensagem</label><textarea id="wa-txt" rows="1" data-in="waTxt" data-enter="enviar" placeholder="Escreva aqui e toque em enviar">${esc(r)}</textarea><button type="button" class="btn primary" data-act="enviar" aria-label="Abrir no WhatsApp" style="min-height:52px">${ic('send')}<span class="sr">Abrir no WhatsApp</span></button></div></div>`;
  return h+`</section></div>`;
}
function ctxBar(c){
  const prox=S.appts.filter(a=>a.pac===c.pac&&['agendado','confirmado'].includes(a.status)&&(a.dia>hoje()||(a.dia===hoje()&&a.t>=now()-30))).sort((a,b)=>a.dia.localeCompare(b.dia)||a.t-b.t)[0];
  const pago=S.contas.filter(x=>x.pac===c.pac&&pagoConta(x)>0&&faltaConta(x)<=0).pop();
  return `<div class="ctxbar">${prox?`<span><b>${quando(prox.dia,prox.t)}</b> · ${esc(curto(profNome(prox.prof)))} ${pill(prox.status)}</span><button type="button" class="btn sm soft" data-act="mudar" data-id="${prox.id}">Mudar horário</button>${prox.status==='agendado'?`<button type="button" class="btn sm" data-act="confirmar" data-id="${prox.id}">Confirmar</button>`:''}`:`<span class="muted">Sem consulta marcada.</span><button type="button" class="btn sm soft" data-act="agendarPac" data-id="${c.pac}">Marcar consulta</button>`}${pago?`<button type="button" class="btn sm" data-act="recibo" data-id="${pago.id}">Enviar recibo</button>`:''}</div>`;
}

/* ---------- Pagamentos ---------- */
function vPag(){
  const cx=S.caixa,doCaixa=cx?S.pays.filter(p=>p.caixa===cx.id):[],tot=doCaixa.reduce((s,p)=>s+p.valor,0);
  const ab=abertas().sort((a,b)=>(getAppt(a.appt)?0:1)-(getAppt(b.appt)?0:1));
  let h=head('Pagamentos','Toque em Receber. O valor já vem preenchido.');
  if(cx&&cx.aberto)h+=`<div class="note ${cx.data===hoje()?'ok':'warn'}"><span>Caixa aberto ${cx.data===hoje()?'desde '+fmt(cx.abertoEm):'desde '+dm(cx.data)+' (feche o caixa do dia anterior)'} · recebido: <b>${brl(tot)}</b></span><button type="button" class="btn sm" data-act="fecharCaixa">Fechar o caixa</button></div>`;
  else h+=`<div class="note bad"><span>${cx?`Caixa fechado em ${dm(cx.data)} às ${fmt(cx.fechadoEm)}. Diferença: ${brl(cx.dif)}.`:'O caixa está fechado.'} Abra o caixa para receber.</span><button type="button" class="btn sm" data-act="abrirCaixa">Abrir o caixa</button></div>`;
  h+=`<div class="cols"><div class="a"><section class="card"><h2>Para receber <span class="pill warn">${ab.length}</span></h2><div class="list">${ab.map(c=>`<div class="item"><div class="item-main" style="cursor:default"><span class="av">${iniciais(pacNome(c.pac))}</span><span class="who"><b>${esc(pacNome(c.pac))}</b><span class="sub">${esc(c.desc)}</span></span></div><div class="acts"><b style="font-size:20px">${brl(faltaConta(c))}</b><button type="button" class="btn primary" data-act="receber" data-id="${c.id}">Receber</button></div></div>`).join('')||'<p class="muted">Nada para receber agora.</p>'}</div></section></div>
    <div class="b"><section class="card"><h2>Recebidos neste caixa</h2><div class="list">${doCaixa.slice().reverse().map(p=>{const c=S.contas.find(x=>x.id===p.conta);const est=S.pays.some(x=>x.estornoDe===p.id);
      return `<div class="item"><div class="who" style="flex:1 1 160px"><b>${esc(c?pacNome(c.pac):'—')}</b><span class="sub">${fmt(p.hora)} · ${FORMAS[p.forma]}${p.parc?' em '+p.parc+'x':''}${p.estornoDe?' · devolvido':''}</span></div><b style="${p.valor<0?'color:var(--bad-fg)':''}">${brl(p.valor)}</b>${role()==='gestor'&&p.valor>0&&!est&&cx.aberto?`<button type="button" class="link" data-act="estornar" data-id="${p.id}">Devolver</button>`:''}</div>`;}).join('')||'<p class="muted">Nenhum pagamento ainda.</p>'}</div>${role()!=='gestor'?'<p class="muted small">Para devolver um pagamento, peça à gestão.</p>':''}</section></div></div>`;
  return h;
}

/* ---------- Pacientes ---------- */
function vPacs(){
  if(S.ui.pacSel&&getPac(S.ui.pacSel))return ficha(getPac(S.ui.pacSel));
  const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
  const q=norm(S.ui.pacBusca.trim()),qd=q.replace(/\D/g,'');
  const l=S.pacs.filter(p=>!q||norm(p.nome).includes(q)||(qd.length>=3&&(p.cel.replace(/\D/g,'').includes(qd)||p.cpf.replace(/\D/g,'').includes(qd)))).sort((a,b)=>a.nome.localeCompare(b.nome));
  let h=head('Pacientes',S.pacs.length?'Busque pelo nome, telefone ou CPF.':'Nenhum paciente cadastrado ainda.',front()?`<button type="button" class="btn primary" data-act="novoPac">${ic('userplus')} Novo paciente</button>`:'');
  if(!S.pacs.length)return h+`<section class="card"><p class="muted">Os pacientes também são cadastrados na hora de marcar a primeira consulta.</p></section>`;
  h+=`<div class="search">${ic('search',22)}<label class="sr" for="p-busca">Buscar paciente</label><input id="p-busca" type="search" value="${esc(S.ui.pacBusca)}" data-in="pacBusca" placeholder="Digite o nome do paciente"></div>`;
  h+=`<section class="card"><div class="list">${l.slice(0,50).map(p=>{const pr=S.appts.filter(a=>a.pac===p.id&&['agendado','confirmado','chegou'].includes(a.status)&&a.dia>=hoje()).sort((a,b)=>a.dia.localeCompare(b.dia)||a.t-b.t)[0];
    return `<div class="item"><button type="button" class="item-main" data-act="abrirPac" data-id="${p.id}"><span class="av">${iniciais(p.nome)}</span><span class="who"><b>${esc(p.nome)}</b><span class="sub">${idTxt(p)}${esc(p.cel)}</span></span></button><div class="acts">${pr?`<span class="small muted">${quando(pr.dia,pr.t)}</span>`:''}${devendo(p.id)>0?'<span class="pill warn">Pagamento pendente</span>':''}</div></div>`;}).join('')||`<p class="muted">Nenhum paciente com esse nome.</p>${front()?`<button type="button" class="btn soft" data-act="novoPac">Cadastrar "${esc(S.ui.pacBusca)}"</button>`:''}`}</div></section>`;
  return h;
}
function ficha(p){
  const prox=S.appts.filter(a=>a.pac===p.id&&['agendado','confirmado','chegou'].includes(a.status)&&a.dia>=hoje()).sort((a,b)=>a.dia.localeCompare(b.dia)||a.t-b.t);
  const contas=S.contas.filter(c=>c.pac===p.id&&faltaConta(c)>0);
  const cpfOk=!p.cpf||cpfValido(p.cpf);
  const podeWa=PERM[role()].includes('whatsapp')&&p.consWpp;
  let h=`<div><button type="button" class="link" data-act="voltarPacs">${ic('left',16)} Todos os pacientes</button></div>`;
  h+=`<div class="head"><div style="display:flex;gap:14px;align-items:center"><span class="av" style="width:58px;height:58px;font-size:20px">${iniciais(p.nome)}</span><div><h1>${esc(p.nome)}</h1><p>${idTxt(p)}${esc(p.cel)}</p></div></div><div class="chips"><button type="button" class="btn primary" data-act="agendarPac" data-id="${p.id}">${ic('cal')} Marcar consulta</button>${podeWa?`<button type="button" class="btn" data-act="irConv" data-id="${p.id}">${ic('wpp')} WhatsApp</button>`:''}</div></div>`;
  if(p.alergias)h+=`<div class="allergy" style="font-size:16px">${ic('alert')} Alergia: ${esc(p.alergias)}</div>`;
  h+=`<div class="cols"><div class="a"><section class="card"><h2>Próximas consultas</h2><div class="list">${prox.map(a=>linha(a,{sub:quando(a.dia,a.t)+' · '+curto(profNome(a.prof))})).join('')||'<p class="muted">Nenhuma consulta marcada.</p>'}</div></section>`;
  if(role()==='medico')h+=histPac(p,null);
  else h+=`<section class="card"><h2>Prontuário</h2><p class="muted">${ic('lock',16)} Só os médicos veem o prontuário. É uma regra de sigilo.</p></section>`;
  const fi=(f,l,ph,extra)=>`<label class="field">${l}<input id="f-${f}" value="${esc(p[f])}" data-in="pacF" data-f="${f}"${ph?` placeholder="${ph}"`:''}>${extra||''}</label>`;
  h+=`</div><div class="b"><section class="card"><h2>Dados ${front()?`<button type="button" class="link" data-act="editPac">${S.ui.editPac?'Pronto':'Editar'}</button>`:''}</h2>${S.ui.editPac?fi('nome','Nome completo')+fi('nasc','Data de nascimento','dd/mm/aaaa')+fi('cel','Celular','(11) 90000-0000')+fi('cpf','CPF','000.000.000-00',p.cpf?(cpfOk?'<span class="hint" style="color:var(--ok-fg)">CPF válido</span>':'<span class="err">CPF com erro. Confira os números.</span>'):'')+fi('email','E-mail')+fi('alergias','Alergias','Ex.: dipirona')
      :`<dl class="summary" style="font-size:16px"><dt>Nascimento</dt><dd>${esc(p.nasc||'Não informado')}</dd><dt>Celular</dt><dd>${esc(p.cel)}</dd><dt>CPF</dt><dd>${esc(p.cpf||'Não informado')}</dd><dt>E-mail</dt><dd>${esc(p.email||'Não informado')}</dd><dt>Alergias</dt><dd>${esc(p.alergias||'Nenhuma informada')}</dd></dl>`}</section>
    <section class="card"><h2>Pagamentos</h2>${contas.length?contas.map(c=>`<div class="note warn"><span>${esc(c.desc)}: <b>${brl(faltaConta(c))}</b></span>${front()?`<button type="button" class="btn sm" data-act="receber" data-id="${c.id}">Receber</button>`:''}</div>`).join(''):'<p class="muted">Tudo pago.</p>'}</section>
    <section class="card"><h2>Autorizações</h2><label class="switch"><input id="f-cw" type="checkbox"${p.consWpp?' checked':''} data-ch="pacCons" data-f="consWpp"${front()?'':' disabled'}> Aceita mensagens pelo WhatsApp</label><label class="switch"><input id="f-cd" type="checkbox"${p.consDados?' checked':''} data-ch="pacCons" data-f="consDados"${front()?'':' disabled'}> Autorizou o uso dos dados (LGPD)</label></section></div></div>`;
  return h;
}

/* ---------- Recados, relatórios, histórico, configurações, TV ---------- */
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
function vRel(){
  const hj=S.appts.filter(a=>a.dia===hoje()),disp=Math.max(1,S.clinica.fecha-S.clinica.abre);
  const pagsHoje=S.pays.filter(p=>p.data===hoje());
  const rows=profs().map(p=>{const as=hj.filter(a=>a.prof===p.id),at=as.filter(a=>a.status!=='cancelado');const min=at.reduce((s,a)=>s+a.dur,0);
    const fat=pagsHoje.filter(y=>{const c=S.contas.find(k=>k.id===y.conta);const a=c&&c.appt?getAppt(c.appt):null;return a&&a.prof===p.id;}).reduce((s,y)=>s+y.valor,0);
    return `<tr><td><b>${esc(curto(p.nome))}</b></td><td class="num">${at.length}</td><td class="num">${as.filter(a=>a.status==='atendido').length}</td><td class="num">${as.filter(a=>a.status==='faltou').length}</td><td class="num">${Math.round(min/disp*100)}%</td><td class="num">${brl(fat)}</td></tr>`;}).join('');
  const tot={};Object.keys(FORMAS).forEach(k=>tot[k]=0);pagsHoje.forEach(p=>{tot[p.forma]+=p.valor;});
  const ativos=hj.filter(a=>a.status!=='cancelado'),conf=ativos.filter(a=>a.status!=='agendado').length;
  return head('Relatórios','Números de hoje, calculados na hora.')+`<section class="card"><h2>Por médico</h2>${rows?`<div class="tbl"><table style="min-width:560px"><thead><tr><th>Médico</th><th class="num">Marcados</th><th class="num">Atendidos</th><th class="num">Faltas</th><th class="num">Agenda ocupada</th><th class="num">Recebido</th></tr></thead><tbody>${rows}</tbody></table></div>`:'<p class="muted">Nenhum médico cadastrado.</p>'}</section>
    <div class="cols"><section class="card a" style="flex:1 1 300px"><h2>Como os pacientes pagaram</h2><dl class="summary">${Object.entries(FORMAS).map(([k,l])=>`<dt>${l}</dt><dd class="num">${brl(tot[k])}</dd>`).join('')}</dl></section>
    <section class="card b"><h2>Confirmações</h2><p style="font-size:18px"><b>${conf}</b> de ${ativos.length} consultas de hoje foram confirmadas.</p><p class="muted">${S.regs.filter(r=>r.status==='rascunho').length} consulta(s) em andamento ainda não finalizada(s).</p></section></div>`;
}
function vHist(){
  const q=S.ui.histBusca.trim().toLowerCase(),l=S.audit.filter(x=>!q||(x.u+' '+x.a).toLowerCase().includes(q)).slice(0,300);
  return head('Histórico','Tudo o que foi feito no sistema, por quem e quando.')+`<div class="search">${ic('search',22)}<label class="sr" for="h-busca">Filtrar</label><input id="h-busca" type="search" value="${esc(S.ui.histBusca)}" data-in="histBusca" placeholder="Filtrar (ex.: prontuário, nome)"></div><section class="card"><div class="list">${l.map(x=>`<div class="item"><span class="when" style="font-size:16px">${x.d===hoje()?fmt(x.t):dm(x.d)+' '+fmt(x.t)}</span><div class="who" style="flex:1"><b style="font-size:16px">${esc(x.a)}</b><span class="sub">${esc(x.u)}</span></div></div>`).join('')||'<p class="muted">Nada registrado ainda.</p>'}</div></section>`;
}
function vConfig(){
  const tab=S.ui.cfgTab,c=S.clinica;
  const tabs=[['clinica','Clínica'],['equipe','Equipe'],['servicos','Serviços e valores'],['dados','Dados']];
  let h=head('Configurações','Dados da clínica, equipe e serviços.')+`<div class="chips" role="group" aria-label="Seção">${tabs.map(([k,l])=>`<button type="button" class="chip" data-act="cfgTab" data-v="${k}" aria-pressed="${tab===k}">${l}</button>`).join('')}</div>`;
  if(tab==='clinica'){
    h+=`<section class="card"><h2>Clínica</h2><label class="field">Nome<input id="cf-nome" value="${esc(c.nome)}" data-in="cfg" data-f="nome"></label><label class="field">Endereço <span class="hint">usado nas mensagens do WhatsApp</span><input id="cf-end" value="${esc(c.endereco)}" data-in="cfg" data-f="endereco" placeholder="Rua, número, bairro, cidade"></label><label class="field">Telefone<input id="cf-fone" value="${esc(c.fone)}" data-in="cfg" data-f="fone" placeholder="(11) 0000-0000"></label>
      <div class="grid2"><label class="field">Abre às<input id="cf-abre" type="time" step="1800" value="${fmt(c.abre)}" data-ch="cfgHora" data-f="abre"></label><label class="field">Fecha às<input id="cf-fecha" type="time" step="1800" value="${fmt(c.fecha)}" data-ch="cfgHora" data-f="fecha"></label></div><p class="muted small">${ic('check',14)} As alterações são salvas sozinhas.</p></section>`;
  }else if(tab==='equipe'){
    const n=S.ui.novoU;
    h+=`<section class="card"><h2>Equipe <span class="pill neutral">${S.users.length}</span></h2><div class="list">${S.users.map(u=>`<div class="item"><span class="av">${iniciais(u.nome)}</span><div class="who" style="flex:1 1 200px"><b>${esc(u.nome)}${u.id===S.user?' (você)':''}</b><span class="sub">${esc(papel(u))}${u.role==='medico'?' · '+esc(u.sala||'sem sala')+(u.crm?' · '+esc(u.crm):''):''}</span></div><span class="pill ${u.role==='gestor'?'accent':u.role==='medico'?'info':'neutral'}">${ROLES[u.role]}</span>${u.id===S.user?'':`<button type="button" class="link" data-act="remU" data-id="${u.id}">Remover</button>`}</div>`).join('')}</div>
      <div class="cfg-form"><h2>Adicionar pessoa</h2><label class="field">Nome completo<input id="nu-nome" value="${esc(n.nome)}" data-in="novoU" data-f="nome" placeholder="Ex.: Dra. Ana Lima"></label>
      <div class="field">Função<div class="chips">${Object.entries(ROLES).map(([k,l])=>`<button type="button" class="chip" data-act="novoRole" data-v="${k}" aria-pressed="${n.role===k}">${l}</button>`).join('')}</div></div>
      ${n.role==='medico'?`<div class="grid2"><label class="field">Especialidade<input id="nu-esp" value="${esc(n.esp)}" data-in="novoU" data-f="esp" placeholder="Ex.: Cardiologia"></label><label class="field">CRM<input id="nu-crm" value="${esc(n.crm)}" data-in="novoU" data-f="crm" placeholder="CRM-SP 000000"></label><label class="field">Sala<input id="nu-sala" value="${esc(n.sala)}" data-in="novoU" data-f="sala" placeholder="Ex.: Consultório 1"></label></div>`:''}
      ${S.ui.erro?`<p class="err">${esc(S.ui.erro)}</p>`:''}<div><button type="button" class="btn primary" data-act="addU">${ic('userplus')} Adicionar</button></div></div></section>`;
  }else if(tab==='servicos'){
    const n=S.ui.novoS;
    h+=`<section class="card"><h2>Serviços e valores</h2>${S.servicos.length?`<div class="list">${S.servicos.map(s=>`<div class="item"><div class="who" style="flex:1 1 200px"><b>${esc(s.nome)}</b><span class="sub">${s.dur===60?'1 hora':s.dur+' min'}</span></div><b>${s.preco?brl(s.preco):'Sem custo'}</b><button type="button" class="link" data-act="remS" data-id="${s.id}">Remover</button></div>`).join('')}</div>`:'<p class="muted">Nenhum serviço cadastrado. Comece por "Consulta" e "Retorno".</p>'}
      <div class="cfg-form"><h2>Adicionar serviço</h2><div class="grid2"><label class="field">Nome<input id="ns-nome" value="${esc(n.nome)}" data-in="novoS" data-f="nome" placeholder="Ex.: Consulta"></label><label class="field">Valor (R$) <span class="hint">0 para sem custo</span><input id="ns-preco" inputmode="decimal" value="${esc(n.preco)}" data-in="novoS" data-f="preco" placeholder="350,00"></label></div>
      <div class="field">Duração<div class="chips">${[30,60].map(d=>`<button type="button" class="chip" data-act="novoDur" data-v="${d}" aria-pressed="${n.dur===d}">${d===60?'1 hora':'30 min'}</button>`).join('')}</div></div>
      ${S.ui.erro?`<p class="err">${esc(S.ui.erro)}</p>`:''}<div><button type="button" class="btn primary" data-act="addS">${ic('plus')} Adicionar</button></div></div></section>`;
  }else{
    h+=`<section class="card"><h2>Dados deste navegador</h2><p class="muted">Neste esboço, tudo fica salvo só neste navegador. Com o servidor, os dados passam para o banco PostgreSQL.</p><div class="chips"><button type="button" class="btn" data-act="exportar">Baixar cópia dos dados (JSON)</button><button type="button" class="btn${S.ui.apagarArmado?' danger':''}" data-act="apagar">${S.ui.apagarArmado?'Toque de novo para apagar tudo':'Apagar todos os dados'}</button></div></section>`;
  }
  return h;
}
function vTV(){
  const [a,...r]=S.chamadas.filter(c=>c.d===hoje());
  return head('Tela da sala de espera','Esta tela fica na TV. Mostra só o primeiro nome e a inicial do sobrenome.',`<button type="button" class="btn" data-act="tela">${ic('max')} Tela cheia</button>`)+
    `<div class="tv" id="tv"><div class="tv-top"><span>${esc(S.clinica.nome)}</span><b style="font-size:40px">${fmt(now())}</b></div><div class="tv-grid">${a?`<section class="tv-now" aria-live="polite"><span style="font-size:18px;letter-spacing:.12em;text-transform:uppercase;color:#A9E6DE;font-weight:700">Chamando agora</span><span class="nome">${esc(a.nome)}</span><span style="font-size:clamp(26px,3.5vw,40px);font-weight:700">${esc(a.sala)}</span><span style="font-size:22px;color:#D3ECE8">${esc(a.prof)}</span></section>`:`<section class="tv-now"><span style="font-size:clamp(28px,4vw,44px);font-weight:700">Bem-vindo!</span><span style="font-size:22px;color:#D3ECE8">Aguarde, você será chamado por esta tela.</span></section>`}<section class="tv-hist"><span style="font-size:16px;letter-spacing:.1em;text-transform:uppercase;color:var(--tv-muted);font-weight:700">Últimas chamadas</span>${r.slice(0,4).map(c=>`<div><span><b>${esc(c.nome)}</b><small>${esc(c.sala)}</small></span><span style="color:var(--tv-muted)">${fmt(c.hora)}</span></div>`).join('')}</section></div></div>`;
}

/* ---------- folhas (janelas) ---------- */
function sheet(){
  const m=S.ui.sheet;if(!m)return '';
  const body={agendar:shAgendar,appt:shAppt,receber:shReceber,caixa:shCaixa,abrirCx:shAbrirCx,doc:shDoc,finalizar:shFinalizar,novoPac:shNovoPac}[m.type](m);
  return `<div class="overlay" data-act="overlay"><div class="sheet" role="dialog" aria-modal="true">${body}</div></div>`;
}
const sh=(t,p)=>`<div class="sheet-h"><div><h2 style="font-size:24px">${t}</h2>${p?`<p>${p}</p>`:''}</div><button type="button" class="x" data-act="fechar" aria-label="Fechar">${ic('x')}</button></div>`;
const durWiz=m=>m.remarcar?getAppt(m.remarcar).dur:(getServ(m.serv)||{dur:SLOT}).dur;
const servChips=m=>`<div class="field">Tipo de atendimento<div class="chips">${S.servicos.map(s=>`<button type="button" class="chip" data-act="wizServ" data-v="${s.id}" aria-pressed="${m.serv===s.id}">${esc(s.nome)}${s.dur>30?' (1 hora)':''}</button>`).join('')}</div></div>`;
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
    return sh(titulo,`Passo ${m.i+1} de ${m.steps.length}: com qual médico?`)+bar+`<div class="pick">${profs().map(p=>{const nx=proximoLivre(p.id,durWiz(m));return `<button type="button" class="opt" data-act="wizProf" data-v="${p.id}" aria-pressed="${m.prof===p.id}"><span class="av">${iniciais(p.nome)}</span><span><b>${esc(p.nome)}</b><span class="s">${esc(p.esp||'Médico(a)')}${nx?' · próximo livre: '+quando(nx.d,nx.t).toLowerCase():''}</span></span></button>`;}).join('')}</div>
      ${m.prof?servChips(m):''}
      <div class="chips">${back}<button type="button" class="btn primary" data-act="wizProx"${m.prof?'':' disabled'}>Continuar</button></div>`;
  }
  if(step==='quando'){
    const hs=horarios(m.prof,m.d,durWiz(m));const vis=m.todos?hs:hs.filter(x=>x.livre);
    return sh(titulo,`Passo ${m.i+1} de ${m.steps.length}: qual dia e horário? ${esc(profNome(m.prof))}`)+bar+`<div class="chips">${diasAgenda().map(x=>`<button type="button" class="chip" data-act="wizDia" data-v="${x}" aria-pressed="${m.d===x}">${rotDia(x)}</button>`).join('')}</div>
      ${vis.length?`<div class="times">${vis.map(x=>`<button type="button" class="${x.livre?'':'busy'}" data-act="wizHora" data-v="${x.t}">${fmt(x.t)}</button>`).join('')}</div>`:'<p class="muted">Nenhum horário livre neste dia. Escolha outro dia.</p>'}
      ${m.remarcar?'':`<button type="button" class="link" data-act="wizTodos">${m.todos?'Mostrar só horários livres':'Precisa encaixar? Mostrar horários ocupados também'}</button>`}<div class="chips">${back}</div>`;
  }
  const p=m.pac?getPac(m.pac):null,serv=getServ(m.serv),dur=durWiz(m),conf=conflito(m.prof,m.d,m.t,dur,m.remarcar);
  const nomeP=p?p.nome:m.nome;const semWpp=p&&!p.consWpp;
  return sh(titulo,`Passo ${m.i+1} de ${m.steps.length}: confira e confirme`)+bar+`<dl class="summary"><dt>Paciente</dt><dd>${esc(nomeP)}</dd><dt>Médico</dt><dd>${esc(profNome(m.prof))}</dd><dt>Quando</dt><dd>${rotLongo(m.d)}, ${fmt(m.t)}</dd>${m.remarcar?'':`<dt>Tipo</dt><dd>${esc(serv?serv.nome:'—')}${serv&&serv.preco?' · '+brl(serv.preco):' · sem custo'}</dd>`}</dl>
    ${!m.remarcar&&!m.steps.includes('prof')?servChips(m):''}
    ${conf?`<div class="note ${m.todos?'warn':'bad'}"><span>${esc(conf)} ${m.todos?'Vai ficar como encaixe.':'Escolha outro horário.'}</span></div>`:''}
    <label class="switch"><input id="w-wpp" type="checkbox"${m.wpp&&!semWpp?' checked':''}${semWpp?' disabled':''} data-ch="wizWpp"> ${m.remarcar?'Avisar o paciente pelo WhatsApp':'Mandar a confirmação pelo WhatsApp'}${semWpp?' (paciente não autorizou)':''}</label>
    ${m.erro?`<p class="err">${esc(m.erro)}</p>`:''}
    <div class="chips">${back}<button type="button" class="btn primary big" style="flex:1" data-act="wizOk"${(conf&&!m.todos)||!serv&&!m.remarcar?' disabled':''}>${ic('check',22)} ${m.remarcar?'Mudar para este horário':'Confirmar consulta'}</button></div>`;
}
function shAppt(m){
  const a=getAppt(m.id);if(!a)return sh('Consulta não encontrada');
  const p=getPac(a.pac),r=role(),own=r==='medico'&&me().id===a.prof,fr=front(),c=contaDe(a),deve=c&&faltaConta(c)>0,dv=devendo(a.pac)-(deve?faltaConta(c):0);
  const ehHoje=a.dia===hoje();
  let h=sh(esc(p.nome),`${esc(a.proc)} com ${esc(profNome(a.prof))}`)+`<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><span style="font-size:22px;font-weight:700">${rotLongo(a.dia)}, ${fmt(a.t)}</span>${pill(a.status)}${a.encaixe?'<span class="pill warn">Encaixe</span>':''}</div>`;
  if(p.alergias&&r==='medico')h+=`<div class="pill bad">${ic('alert',14)} Alergia: ${esc(p.alergias)}</div>`;
  if(dv>0&&fr)h+=`<div class="note bad"><span>Este paciente tem ${brl(dv)} para pagar de antes.</span></div>`;
  if(m.desmarcar){
    return h+`<div class="field">Por que vai desmarcar?<div class="pick" style="grid-template-columns:1fr">${MOTIVOS.map(x=>`<button type="button" class="opt" data-act="motivo" data-v="${esc(x)}" aria-pressed="${m.motivo===x}"><b>${x}</b></button>`).join('')}</div></div><label class="switch"><input id="d-avisar" type="checkbox"${m.avisar&&p.consWpp?' checked':''}${p.consWpp?'':' disabled'} data-ch="desAvisar"> Avisar o paciente pelo WhatsApp${p.consWpp?'':' (não autorizou)'}</label><div class="chips"><button type="button" class="btn" data-act="desVoltar">${ic('left')} Voltar</button><button type="button" class="btn danger big" style="flex:1" data-act="desOk"${m.motivo?'':' disabled'}>Desmarcar consulta</button></div>`;
  }
  let main='';
  if(['agendado','confirmado'].includes(a.status)&&ehHoje&&fr)main=`<button type="button" class="btn primary big full" data-act="chegou" data-id="${a.id}">${ic('login',22)} Paciente chegou</button>`;
  else if(a.status==='chegou'&&own)main=`<button type="button" class="btn primary big full" data-act="chamar" data-id="${a.id}">${ic('speaker',22)} Chamar paciente</button>`;
  else if(a.status==='chegou'&&fr)main=deve?`<button type="button" class="btn primary big full" data-act="receber" data-id="${c.id}">Receber ${brl(faltaConta(c))}</button>`:`<div class="note warn"><span>Na sala de espera há ${Math.max(0,now()-a.chegou)} min. O médico chama pelo sistema.</span></div>`;
  else if(a.status==='em_atendimento'&&own)main=`<button type="button" class="btn primary big full" data-act="abrirConsulta" data-id="${a.id}">Abrir a consulta</button>`;
  else if(a.status==='atendido'&&deve&&fr)main=`<button type="button" class="btn primary big full" data-act="receber" data-id="${c.id}">Receber ${brl(faltaConta(c))}</button>`;
  else if(a.status==='atendido'&&own)main=`<button type="button" class="btn big full" data-act="abrirConsulta" data-id="${a.id}">Ver a consulta</button>`;
  h+=main;
  const sec=[];
  if(['agendado','confirmado'].includes(a.status)&&(fr||own)){
    if(a.status==='agendado')sec.push(`<button type="button" class="btn" data-act="confirmar" data-id="${a.id}">${ic('check')} Confirmar</button>`);
    sec.push(`<button type="button" class="btn" data-act="mudar" data-id="${a.id}">${ic('clock')} Mudar horário</button>`);
    if(ehHoje&&a.t<now()&&fr)sec.push(`<button type="button" class="btn" data-act="faltou" data-id="${a.id}">Faltou</button>`);
    sec.push(`<button type="button" class="btn danger" data-act="desmarcar" data-id="${a.id}">Desmarcar</button>`);
  }
  if(sec.length)h+=`<div class="chips">${sec.join('')}</div>`;
  h+=`<details class="more"><summary>Ver o que aconteceu com esta consulta</summary>${a.evs.map(e=>`<div class="tl"><i></i><div><b>${esc(e.t)}</b><div class="muted small">${esc(e.q)}</div></div></div>`).join('')}</details><button type="button" class="link" data-act="abrirPac" data-id="${p.id}">Abrir ficha de ${esc(curto(p.nome))}</button>`;
  return h;
}
function shReceber(m){
  const c=S.contas.find(x=>x.id===m.conta),p=getPac(c.pac);
  if(m.ok)return `<div class="done"><span class="ok-ic">${ic('check',40)}</span><h2 style="font-size:26px">Pagamento recebido</h2><p class="muted" style="font-size:18px">${brl(m.ok)} de ${esc(p.nome)} em ${FORMAS[m.forma].toLowerCase()}.${m.troco>0?` Troco: <b>${brl(m.troco)}</b>.`:''}</p>${faltaConta(c)>0?`<p class="note warn"><span>Ainda falta ${brl(faltaConta(c))}.</span></p>`:''}<div class="chips" style="justify-content:center">${p.consWpp?`<button type="button" class="btn primary" data-act="recibo" data-id="${c.id}">${ic('wpp')} Enviar recibo pelo WhatsApp</button>`:''}<button type="button" class="btn" data-act="fechar">Pronto</button></div></div>`;
  const desc=m.desc?parseBRL(m.descTxt):0,falta=c.bruto-desc-pagoConta(c);
  const valor=m.parte?parseBRL(m.valorTxt):falta;const ent=parseBRL(m.entregue);const troco=m.forma==='dinheiro'&&ent>valor?ent-valor:0;
  const bloqDesc=desc>c.bruto*0.1&&role()!=='gestor';const aberto=S.caixa&&S.caixa.aberto;
  return sh('Receber de '+esc(p.nome),esc(c.desc))+`<div style="text-align:center"><div class="muted">Valor a receber</div><div class="big-num" style="font-size:52px">${brl(Math.max(valor,0))}</div>${desc?`<div class="muted">com desconto de ${brl(desc)}</div>`:''}</div>
    <div class="field">Como o paciente vai pagar?<div class="pick">${Object.entries(FORMAS).map(([k,l])=>`<button type="button" class="opt" data-act="forma" data-v="${k}" aria-pressed="${m.forma===k}"><b>${l}</b></button>`).join('')}</div></div>
    ${m.forma==='credito'?`<div class="field">Em quantas vezes?<div class="chips">${[1,2,3].map(n=>`<button type="button" class="chip" data-act="parc" data-v="${n}" aria-pressed="${m.parc===n}">${n}x de ${brl(Math.round(valor/n))}</button>`).join('')}</div></div>`:''}
    ${m.forma==='dinheiro'?`<label class="field">Quanto o paciente entregou? <span class="hint">para calcular o troco</span><input id="r-ent" inputmode="decimal" value="${esc(m.entregue||'')}" data-in="rec" data-f="entregue" placeholder="Ex.: 400,00"></label>${troco>0?`<div class="note ok"><span>Troco: <b style="font-size:22px">${brl(troco)}</b></span></div>`:''}`:''}
    ${m.desc?`<label class="field">Desconto (R$)<input id="r-desc" inputmode="decimal" value="${esc(m.descTxt||'')}" data-in="rec" data-f="descTxt" placeholder="0,00"></label>${bloqDesc?'<div class="note warn"><span>Desconto acima de 10% precisa da gestão.</span></div>':''}`:''}
    ${m.parte?`<label class="field">Quanto vai pagar agora?<input id="r-val" inputmode="decimal" value="${esc(m.valorTxt||'')}" data-in="rec" data-f="valorTxt"></label>`:''}
    <div class="chips">${m.desc?'':'<button type="button" class="link" data-act="recDesc">Dar desconto</button>'}${m.parte?'':'<button type="button" class="link" data-act="recParte">Pagar só uma parte</button>'}</div>
    <button type="button" class="btn primary big full" data-act="pagar"${!m.forma||bloqDesc||valor<=0||!aberto?' disabled':''}>${!aberto?'Abra o caixa para receber':!m.forma?'Escolha como vai pagar':'Confirmar '+brl(Math.min(valor,falta))}</button>`;
}
function shAbrirCx(m){
  return sh('Abrir o caixa','Quanto dinheiro tem na gaveta para troco?')+`<label class="field">Troco inicial (R$)<input id="cx-ini" inputmode="decimal" value="${esc(m.valor)}" data-in="cxIni" placeholder="0,00"></label><button type="button" class="btn primary big full" data-act="cxAbrirOk">Abrir o caixa</button>`;
}
function shCaixa(m){
  const cx=S.caixa,ps=S.pays.filter(p=>p.caixa===cx.id),din=ps.filter(p=>p.forma==='dinheiro').reduce((s,p)=>s+p.valor,0),esp=cx.saldoIni+din;
  const cont=m.contado===''?null:parseBRL(m.contado),dif=cont==null?null:cont-esp;
  const outros=Object.keys(FORMAS).filter(k=>k!=='dinheiro').map(k=>`<dt>${FORMAS[k]}</dt><dd>${brl(ps.filter(p=>p.forma===k).reduce((s,p)=>s+p.valor,0))}</dd>`).join('');
  return sh('Fechar o caixa','Conte o dinheiro da gaveta e digite o valor.')+`<label class="field">Quanto dinheiro tem na gaveta?<input id="cx-cont" inputmode="decimal" value="${esc(m.contado)}" data-in="cxCont" placeholder="Ex.: ${c2t(esp)}"></label>
    ${dif==null?`<p class="muted">O sistema espera ${brl(esp)} (troco inicial de ${brl(cx.saldoIni)} + ${brl(din)} recebidos em dinheiro).</p>`:dif===0?'<div class="note ok"><span>Confere! Sem diferença.</span></div>':`<div class="note bad"><span>${dif>0?'Sobrando':'Faltando'} ${brl(Math.abs(dif))}. O sistema esperava ${brl(esp)}.</span></div>`}
    <details class="more"><summary>Outras formas de pagamento</summary><dl class="summary">${outros}</dl></details>
    <button type="button" class="btn primary big full" data-act="caixaOk"${dif==null?' disabled':''}>Fechar o caixa</button>`;
}
function shDoc(m){
  return sh(DOCS[m.tipo][0],'Confira o texto. Você pode alterar antes de emitir.')+`<label class="field"><span class="sr">Texto</span><textarea id="d-txt" rows="7" data-in="docTxt">${esc(m.texto)}</textarea></label><p class="muted small">Emitido por ${esc(me().nome)}${me().crm?' ('+esc(me().crm)+')':''}. A assinatura com certificado digital chega na próxima etapa.</p>
    <div class="chips">${getPac(minhaConsulta().pac).consWpp?`<button type="button" class="btn primary big" style="flex:1" data-act="docOk" data-v="1">${ic('wpp',22)} Emitir e enviar pelo WhatsApp</button>`:''}<button type="button" class="btn big" data-act="docOk" data-v="0">Só emitir</button></div>`;
}
function shFinalizar(){
  const a=minhaConsulta(),r=regDe(a,true);const falta=[];if(!r.queixa.trim())falta.push('o que o paciente contou');if(!r.conduta.trim())falta.push('a orientação');
  return sh('Finalizar consulta','O registro será travado e não poderá mais ser alterado.')+`${falta.length?`<div class="note warn"><span>Ainda não preenchido: ${falta.join(' e ')}. Pode finalizar mesmo assim.</span></div>`:''}
    <p style="font-size:17px">Depois de finalizada, a consulta <b>não pode mais ser alterada</b>. Se precisar corrigir algo, você adiciona uma observação.</p>
    <div class="note info"><span>${ic('lock')} A assinatura com certificado digital (ICP-Brasil) entra na próxima etapa do sistema.</span></div>
    <button type="button" class="btn primary big full" data-act="assinar">${ic('pen',22)} Finalizar consulta</button><button type="button" class="btn full" data-act="fechar">Continuar escrevendo</button>`;
}
function shNovoPac(m){
  const dup=(m.nome||'').trim().length>=4?S.pacs.find(p=>p.nome.toLowerCase()===m.nome.trim().toLowerCase()||(m.cel&&m.cel.replace(/\D/g,'').length>=10&&p.cel.replace(/\D/g,'')===m.cel.replace(/\D/g,''))):null;
  return sh('Novo paciente','Só os 3 primeiros campos são obrigatórios.')+`<label class="field">Nome completo<input id="n-nome" value="${esc(m.nome||'')}" data-in="np" data-f="nome"></label><label class="field">Data de nascimento<input id="n-nasc" value="${esc(m.nasc||'')}" data-in="np" data-f="nasc" placeholder="dd/mm/aaaa" inputmode="numeric"></label><label class="field">Celular com DDD<input id="n-cel" value="${esc(m.cel||'')}" data-in="np" data-f="cel" placeholder="(11) 90000-0000" inputmode="tel"></label><label class="field">CPF <span class="hint">opcional</span><input id="n-cpf" value="${esc(m.cpf||'')}" data-in="np" data-f="cpf" inputmode="numeric">${m.cpf?(cpfValido(m.cpf)?'<span class="hint" style="color:var(--ok-fg)">CPF válido</span>':'<span class="err">CPF com erro</span>'):''}</label>
    <label class="switch"><input id="n-cw" type="checkbox"${m.consWpp?' checked':''} data-ch="npCons" data-f="consWpp"> Aceita mensagens pelo WhatsApp</label><label class="switch"><input id="n-cd" type="checkbox"${m.consDados?' checked':''} data-ch="npCons" data-f="consDados"> Autorizou o uso dos dados (LGPD)</label>
    ${dup?`<div class="note warn"><span>Já existe ${esc(dup.nome)} (${esc(dup.cel)}). Pode ser a mesma pessoa.</span><button type="button" class="btn sm" data-act="abrirPac" data-id="${dup.id}">Abrir cadastro</button></div>`:''}${m.erro?`<p class="err">${esc(m.erro)}</p>`:''}
    <button type="button" class="btn primary big full" data-act="npOk">Cadastrar paciente</button>`;
}

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
const UNDO=new Set(['chegou','confirmar','faltou','desOk','wizOk','pagar','estornar','remU','remS']);
const ACT={
  nav:x=>{go(x.v);S.ui.convAberta=false;S.ui.erro='';if(x.v==='recados'&&!S.ui.recSel.startsWith('dm:'))S.chat.canais[S.ui.recSel].nl=0;if(x.v==='whatsapp')S.ui._fundo=true;},
  desfazer:()=>{const t=S.ui.toast;if(!t||!t.undo)return;const v=S.ui.view;S=JSON.parse(t.undo);S.ui.view=v;S.ui.sheet=null;toast('Pronto, desfeito.');},
  fechar:()=>{S.ui.sheet=null;},
  overlay:()=>{S.ui.sheet=null;},
  /* primeiro acesso e usuários */
  setupOk:()=>{const u=S.ui.setup,cli=u.clinica.trim(),nome=u.nome.trim();
    if(cli.length<2){S.ui.erro='Escreva o nome da clínica.';return;}if(nome.length<3){S.ui.erro='Escreva o seu nome.';return;}
    S.clinica={nome:cli,endereco:'',fone:'',abre:480,fecha:1080};const g={id:uid('u'),nome,role:'gestor',esp:'',crm:'',sala:''};S.users.push(g);S.user=g.id;
    S.ui.erro='';S.ui.setup={clinica:'',nome:''};log('Criou a clínica '+cli);toast('Pronto! Agora cadastre os médicos e os serviços.');},
  entrar:x=>{S.user=x.id;Object.assign(S.ui,{view:'inicio',sheet:null,consulta:null,fim:null,pacSel:null,erro:''});log('Entrou no sistema');},
  sair:()=>{S.user=null;S.ui.sheet=null;S.ui.view='inicio';},
  /* configurações */
  cfg:x=>{go('config');S.ui.cfgTab=x.v;S.ui.erro='';},
  cfgTab:x=>{S.ui.cfgTab=x.v;S.ui.erro='';},
  novoRole:x=>{S.ui.novoU.role=x.v;},
  addU:()=>{const n=S.ui.novoU,nome=n.nome.trim();if(nome.length<3){S.ui.erro='Escreva o nome completo.';return;}
    const nMed=profs().length+1;
    const u={id:uid('u'),nome,role:n.role,esp:n.role==='medico'?n.esp.trim():'',crm:n.role==='medico'?n.crm.trim():'',sala:n.role==='medico'?(n.sala.trim()||'Consultório '+nMed):''};
    S.users.push(u);log(`Adicionou ${nome} (${ROLES[u.role]})`);S.ui.novoU={nome:'',role:n.role,esp:'',crm:'',sala:''};S.ui.erro='';toast(nome+' foi adicionado(a) à equipe.');},
  remU:x=>{const u=getUser(x.id);if(!u||u.id===S.user)return;
    if(u.role==='gestor'&&S.users.filter(z=>z.role==='gestor').length<=1){toast('A clínica precisa de pelo menos uma pessoa na gestão.','err');return;}
    if(S.appts.some(a=>a.prof===u.id&&['agendado','confirmado','chegou','em_atendimento'].includes(a.status))){toast(u.nome+' tem consultas marcadas. Desmarque ou mude antes de remover.','err');return;}
    S.users=S.users.filter(z=>z.id!==u.id);log('Removeu '+u.nome+' da equipe');toast(u.nome+' foi removido(a).');},
  novoDur:x=>{S.ui.novoS.dur=+x.v;},
  addS:()=>{const n=S.ui.novoS,nome=n.nome.trim();if(nome.length<2){S.ui.erro='Escreva o nome do serviço.';return;}
    if(S.servicos.some(s=>s.nome.toLowerCase()===nome.toLowerCase())){S.ui.erro='Já existe um serviço com esse nome.';return;}
    const s={id:uid('s'),nome,dur:n.dur,preco:parseBRL(n.preco)};S.servicos.push(s);log(`Cadastrou o serviço ${nome} (${s.preco?brl(s.preco):'sem custo'})`);S.ui.novoS={nome:'',dur:30,preco:''};S.ui.erro='';toast('Serviço cadastrado.');},
  remS:x=>{const s=getServ(x.id);if(!s)return;S.servicos=S.servicos.filter(z=>z.id!==s.id);log('Removeu o serviço '+s.nome);toast('Serviço removido. As consultas já marcadas não mudam.');},
  exportar:()=>{try{const b=new Blob([JSON.stringify(S,null,2)],{type:'application/json'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download='sis-clinicas-dados-'+hoje()+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000);}catch(e){toast('Não foi possível baixar a cópia.','err');}},
  apagar:()=>{if(!S.ui.apagarArmado){S.ui.apagarArmado=true;setTimeout(()=>{if(S.ui.apagarArmado){S.ui.apagarArmado=false;render();}},4000);return;}try{localStorage.removeItem(KEY);}catch(e){}S=novo();},
  /* agenda */
  dia:x=>{S.ui.dia=x.v;},
  agProf:x=>{S.ui.agProf=x.v;},
  agendar:()=>wiz({}),
  agendarEm:x=>{if(role()==='medico'&&me().id!==x.p){toast('Você só marca na sua agenda. Peça à recepção.','err');return;}wiz({prof:x.p,d:S.ui.dia,t:+x.t});},
  agendarPac:x=>{wiz({pac:x.id});},
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
      if(m.wpp)wpp(a.pac,`Olá, ${curto(pacNome(a.pac))}! Sua consulta com ${profNome(a.prof)} foi mudada para ${quando(m.d,m.t).toLowerCase()}.`);
      S.ui.sheet=null;toast('Horário mudado para '+quando(m.d,m.t).toLowerCase()+'.');return;}
    const serv=getServ(m.serv);if(!serv){m.erro='Escolha o tipo de atendimento.';return;}
    const conf=conflito(m.prof,m.d,m.t,serv.dur,null);
    if(conf&&!m.todos){m.erro=conf;return;}
    let pac=m.pac;
    if(!pac){const p=novoPacObj({nome:m.nome.trim(),cel:m.cel.trim()});S.pacs.push(p);pac=p.id;log('Cadastrou '+p.nome+' ao marcar consulta');}
    criarAppt({d:m.d,t:m.t,prof:m.prof,proc:serv.nome,dur:serv.dur,preco:serv.preco,pac,encaixe:!!conf});
    log(`Marcou ${pacNome(pac)} com ${profNome(m.prof)} (${quando(m.d,m.t)})${conf?' como encaixe':''}`);
    const end=S.clinica.endereco?` Endereço: ${S.clinica.endereco}.`:'';
    const env=m.wpp?!!wpp(pac,`Olá, ${curto(pacNome(pac))}! Sua consulta com ${profNome(m.prof)} está marcada para ${quando(m.d,m.t).toLowerCase()}.${end} ${S.clinica.nome}`):false;
    S.ui.sheet=null;toast(`Consulta marcada: ${curto(pacNome(pac))}, ${quando(m.d,m.t).toLowerCase()}.${env?' WhatsApp aberto com a confirmação.':''}`);
  },
  verAppt:x=>{S.ui.sheet={type:'appt',id:x.id};},
  chegou:x=>{const a=getAppt(x.id);a.status='chegou';a.chegou=now();evento(a,'Chegou na clínica',me().nome);log('Registrou a chegada de '+pacNome(a.pac));ensureConta(a);S.ui.sheet=null;
    const dv=devendo(a.pac)-(contaDe(a)?faltaConta(contaDe(a)):0);toast(`${curto(pacNome(a.pac))} está na sala de espera.${dv>0?' Atenção: tem '+brl(dv)+' pendente de antes.':''}`);},
  confirmar:x=>{const a=getAppt(x.id);a.status='confirmado';evento(a,'Confirmado',me().nome);log('Confirmou a consulta de '+pacNome(a.pac));S.ui.sheet=null;toast('Consulta confirmada.');},
  faltou:x=>{const a=getAppt(x.id);a.status='faltou';evento(a,'Faltou',me().nome);log('Registrou falta de '+pacNome(a.pac));S.ui.sheet=null;toast(curto(pacNome(a.pac))+' marcado como falta.');},
  mudar:x=>{const a=getAppt(x.id);wiz({remarcar:a.id,pac:a.pac,prof:a.prof,d:a.dia<hoje()?hoje():a.dia});},
  desmarcar:x=>{S.ui.sheet={type:'appt',id:x.id,desmarcar:true,motivo:null,avisar:true};},
  motivo:x=>{S.ui.sheet.motivo=x.v;},
  desVoltar:()=>{S.ui.sheet.desmarcar=false;},
  desOk:()=>{const m=S.ui.sheet,a=getAppt(m.id);const env=desmarcar(a,m.motivo,m.avisar);S.ui.sheet=null;toast('Consulta desmarcada.'+(env?' WhatsApp aberto com o aviso.':''));},
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
  assinar:()=>{const a=minhaConsulta(),r=regDe(a,true);r.status='assinado';r.assinadoEm=dmy(hoje())+' às '+fmt(now());
    a.status='atendido';evento(a,'Consulta finalizada');ensureConta(a);log('Finalizou a consulta de '+pacNome(a.pac));S.ui.sheet=null;S.ui.fim=a.id;S.ui.consulta=null;},
  adendo:()=>{const a=minhaConsulta(),r=regDe(a,false);const t=S.ui.adendo.trim();if(!t){toast('Escreva a observação primeiro.','err');return;}r.adendos.push({texto:t,hora:carimbo(),autor:me().nome});S.ui.adendo='';log('Adicionou observação à consulta de '+pacNome(a.pac));toast('Observação adicionada.');},
  /* pagamentos */
  receber:x=>{S.ui.sheet={type:'receber',conta:x.id,forma:null,parc:1,entregue:'',desc:false,descTxt:'',parte:false,valorTxt:'',ok:0};},
  forma:x=>{S.ui.sheet.forma=x.v;},
  parc:x=>{S.ui.sheet.parc=+x.v;},
  recDesc:()=>{S.ui.sheet.desc=true;},
  recParte:()=>{const m=S.ui.sheet,c=S.contas.find(x=>x.id===m.conta);m.parte=true;m.valorTxt=c2t(faltaConta(c));},
  pagar:()=>{const m=S.ui.sheet,c=S.contas.find(x=>x.id===m.conta);if(!S.caixa||!S.caixa.aberto)return;const desc=m.desc?parseBRL(m.descTxt):0;if(desc>c.bruto*0.1&&role()!=='gestor')return;c.desconto=desc;const falta=faltaConta(c);let v=m.parte?parseBRL(m.valorTxt):falta;v=Math.min(v,falta);if(v<=0)return;
    S.pays.push({id:uid('y'),conta:c.id,forma:m.forma,valor:v,data:hoje(),hora:now(),por:me().nome,parc:m.forma==='credito'?m.parc:null,caixa:S.caixa.id,estornoDe:null});
    log(`Recebeu ${brl(v)} (${FORMAS[m.forma]}) de ${pacNome(c.pac)}${desc?' com desconto de '+brl(desc):''}`);
    const ent=parseBRL(m.entregue);m.troco=m.forma==='dinheiro'&&ent>v?ent-v:0;m.ok=v;toast('Pagamento de '+brl(v)+' registrado.');},
  recibo:x=>{const c=S.contas.find(z=>z.id===x.id);const p=getPac(c.pac);
    const cv=wpp(c.pac,`Recibo — ${S.clinica.nome}\n\nRecebemos de ${p.nome} o valor de ${brl(pagoConta(c))} referente a ${c.desc}, em ${dmy(hoje())}.\n\nObrigado!`);
    S.ui.sheet=null;toast(cv?'WhatsApp aberto com o recibo.':'O paciente não autorizou WhatsApp.',cv?'ok':'err');},
  estornar:x=>{const p=S.pays.find(z=>z.id===x.id);S.pays.push(Object.assign({},p,{id:uid('y'),valor:-p.valor,data:hoje(),hora:now(),por:me().nome,estornoDe:p.id}));log(`Devolveu ${brl(p.valor)} de ${pacNome(S.contas.find(c=>c.id===p.conta).pac)}`);toast('Pagamento devolvido. O registro original continua no histórico.');},
  abrirCaixa:()=>{S.ui.sheet={type:'abrirCx',valor:''};},
  cxAbrirOk:()=>{const v=parseBRL(S.ui.sheet.valor);S.caixa={id:uid('cx'),data:hoje(),aberto:true,por:me().nome,abertoEm:now(),saldoIni:v,fechadoEm:null,dif:null};log('Abriu o caixa com '+brl(v));S.ui.sheet=null;toast('Caixa aberto.');},
  fecharCaixa:()=>{S.ui.sheet={type:'caixa',contado:''};},
  caixaOk:()=>{const m=S.ui.sheet,cx=S.caixa;const din=S.pays.filter(p=>p.caixa===cx.id&&p.forma==='dinheiro').reduce((s,p)=>s+p.valor,0);cx.aberto=false;cx.fechadoEm=now();cx.dif=parseBRL(m.contado)-(cx.saldoIni+din);log('Fechou o caixa. Diferença: '+brl(cx.dif));S.ui.sheet=null;toast('Caixa fechado.');},
  /* pacientes */
  novoPac:()=>{S.ui.sheet={type:'novoPac',nome:/\d/.test(S.ui.pacBusca)?'':S.ui.pacBusca,nasc:'',cel:'',cpf:'',consWpp:true,consDados:true,erro:''};},
  npOk:()=>{const m=S.ui.sheet;const mm=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(m.nasc||'');
    if((m.nome||'').trim().length<5){m.erro='Escreva o nome completo.';return;}if(!mm||+mm[1]>31||+mm[2]>12){m.erro='Escreva a data de nascimento assim: 25/08/1980.';return;}if((m.cel||'').replace(/\D/g,'').length<10){m.erro='Escreva o celular com DDD.';return;}if(m.cpf&&!cpfValido(m.cpf)){m.erro='O CPF tem um erro. Corrija ou deixe em branco.';return;}
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
  lembrete:x=>{const a=getAppt(x.id);const end=S.clinica.endereco?` Endereço: ${S.clinica.endereco}.`:'';
    const c=wpp(a.pac,`Olá, ${curto(pacNome(a.pac))}! Lembrete: sua consulta com ${profNome(a.prof)} é ${quando(a.dia,a.t).toLowerCase()} (${dm(a.dia)}).${end} Pode confirmar respondendo esta mensagem? ${S.clinica.nome}`);
    if(!c){toast('O paciente não autorizou mensagens pelo WhatsApp.','err');return;}a.lembrete=true;evento(a,'Lembrete enviado pelo WhatsApp',me().nome);log('Enviou lembrete para '+pacNome(a.pac));toast('WhatsApp aberto com o lembrete.');},
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
  novoU:(v,el)=>{S.ui.novoU[el.dataset.f]=v;},
  novoS:(v,el)=>{S.ui.novoS[el.dataset.f]=v;},
  reg:(v,el)=>{regDe(minhaConsulta(),true)[el.dataset.f]=v;save();},
  regV:(v,el)=>{regDe(minhaConsulta(),true).v[el.dataset.f]=v;render();},
  pacClin:(v,el)=>{const p=getPac(el.dataset.id);if(p){p[el.dataset.f]=v;save();}},
  cid:v=>{S.ui.cidBusca=v;render();},
  adendo:v=>{S.ui.adendo=v;save();},
  wiz:(v,el)=>{S.ui.sheet[el.dataset.f]=v;if(el.dataset.f==='busca')render();},
  rec:(v,el)=>{S.ui.sheet[el.dataset.f]=v;render();},
  cxIni:v=>{S.ui.sheet.valor=v;},
  cxCont:v=>{S.ui.sheet.contado=v;render();},
  docTxt:v=>{S.ui.sheet.texto=v;},
  np:(v,el)=>{S.ui.sheet[el.dataset.f]=v;if(['cpf','nome','cel'].includes(el.dataset.f))render();},
  pacBusca:v=>{S.ui.pacBusca=v;render();},
  pacF:(v,el)=>{getPac(S.ui.pacSel)[el.dataset.f]=v;if(el.dataset.f==='cpf')render();else save();},
  waTxt:v=>{const c=cAtual();if(c)S.ui.rasc[c.id]=v;save();},
  recTxt:v=>{S.ui.recRasc=v;save();},
  histBusca:v=>{S.ui.histBusca=v;render();}
};
const CH={
  cfgHora:(v,el)=>{const t=hhmm(v);if(t==null)return;const c=S.clinica,f=el.dataset.f;const abre=f==='abre'?t:c.abre,fecha=f==='fecha'?t:c.fecha;
    if(fecha-abre<SLOT){toast('O horário de fechar precisa ser depois do de abrir.','err');return;}c[f]=t;log(`Mudou o horário da clínica para ${fmt(c.abre)}–${fmt(c.fecha)}`);},
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
setInterval(()=>{const m=now();if(m===ultimoMin)return;ultimoMin=m;const ae=document.activeElement;if(ae&&/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName))return;render();},15000);

S=load();
render();
