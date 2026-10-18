// ===== Núcleo: estado, datas, ordens de serviço (OS), mensagens =====
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 3400); }

const D = {
  iso: d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
  parse: s => new Date(s + 'T12:00'),
  today() { return D.iso(new Date()); },
  add: (s, n) => { const d = D.parse(s); d.setDate(d.getDate() + n); return D.iso(d); },
  diff: (a, b) => Math.round((D.parse(b) - D.parse(a)) / 864e5),
  monday: s => { const d = D.parse(s); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return D.iso(d); },
  br: s => s ? s.split('-').reverse().join('/') : '—',
  dow: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
  mon: ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],
  long: s => { const d = D.parse(s); return `${D.dow[d.getDay()]}, ${d.getDate()} de ${D.mon[d.getMonth()]}`; },
  mins: h => { const [a, b] = h.split(':'); return +a * 60 + +b; },
  hm: m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`,
  ym: s => s.slice(0, 7),
  ymLabel: ym => `${D.mon[+ym.slice(5, 7) - 1]}/${ym.slice(0, 4)}`
};

const STATUS = { agendado: 'Agendado', andamento: 'Em conserto', finalizado: 'Finalizado', entregue: 'Entregue', cancelado: 'Cancelado' };
const PORTE = { pequeno: 'Pequeno', grande: 'Grande' };

// ----- Cálculos de prazo/meta de uma OS -----
const Ord = {
  fim: o => (o.status === 'finalizado' || o.status === 'entregue') ? (o.dataFinal || D.today()) : D.today(),
  prazoData: o => D.add(o.entrada, +o.prazoDias || 0),
  decorridos(o) { const d = D.diff(o.entrada, Ord.fim(o)); return Math.max(0, d); },
  restantes(o) { return (+o.prazoDias || 0) - Ord.decorridos(o); },
  // estado da meta
  meta(o) {
    if (o.status === 'cancelado') return { k: '', txt: '—', late: false, dias: 0 };
    if (o.status === 'agendado' && o.entrada > D.today()) return { k: '', txt: `Entra em ${D.diff(D.today(), o.entrada)} dia(s)`, late: false, dias: 0 };
    const r = Ord.restantes(o), done = o.status === 'finalizado' || o.status === 'entregue';
    if (r >= 0) return done ? { k: 'ok', txt: 'Dentro da meta', late: false, dias: 0 } : { k: r <= 1 ? 'warn' : 'ok', txt: r === 0 ? 'Vence hoje' : `No prazo · faltam ${r} dia(s)`, late: false, dias: 0 };
    return { k: 'bad', txt: done ? `Fora da meta (+${-r} dia(s))` : `Atrasada há ${-r} dia(s)`, late: true, dias: -r };
  },
  ativa: o => o.status === 'agendado' || o.status === 'andamento',
  nextOs() { const n = App.db.orders.reduce((m, o) => Math.max(m, parseInt(String(o.os).replace(/\D/g, '')) || 0), 0); return String(n + 1).padStart(4, '0'); },
  veic: o => [o.modelo, o.cor, o.ano].filter(Boolean).join(' · ')
};

const App = {
  db: null, views: {}, cur: 'painel',
  defaults() {
    return {
      company: { nome: '', telefone: '', email: '', endereco: '', logo: '' },
      settings: { startHour: 7, endHour: 18, ddi: '55', prazoPequeno: 2, prazoGrande: 7,
        msgAgendado: 'Olá, {cliente}! 👋 Aqui é da *{empresa}*.\nRecebemos seu veículo *{veiculo}* (placa *{placa}*) — OS nº *{os}*.\n🔧 Mecânico: {mecanico}\n📅 Previsão de entrega: *{previsao}* ({prazo} dia(s)).\nAvisaremos assim que ficar pronto!',
        msgPronto: 'Olá, {cliente}! ✅ Seu veículo *{veiculo}* (placa *{placa}*) já está *PRONTO*!\nOS nº {os}.\nPode vir retirar na *{empresa}*.\n📍 {endereco}\n📞 {telefone}',
        msgAtraso: 'Olá, {cliente}. Informamos que a entrega do seu veículo *{placa}* (OS {os}), prevista para {previsao}, sofrerá atraso.\nMotivo: {motivo}\nPedimos desculpas e avisaremos assim que ficar pronto.' },
      clients: [], mechanics: [], orders: []
    };
  },
  async start() {
    const s = await api.load(), d = this.defaults();
    this.db = s ? { ...d, ...s, company: { ...d.company, ...s.company }, settings: { ...d.settings, ...s.settings } } : d;
    if (!s) await this.save();
    this.nav(); this.brand();
    setTimeout(() => $('#splash').classList.add('hide'), 1600);
    this.go('painel');
  },
  async save() { $('#saveState').textContent = 'salvando…'; await api.save(this.db); $('#saveState').textContent = 'salvo'; },
  logoHtml() { const c = this.db.company; return `<div class="logo">${c.logo ? `<img src="${c.logo}" alt="">` : esc((c.nome || 'AO').trim().slice(0, 2).toUpperCase())}</div>`; },
  brand() {
    const c = this.db.company, nome = c.nome || 'Agenda Oficina';
    $('#spLogo').innerHTML = this.logoHtml(); $('#spName').textContent = nome;
    $('#railLogo').innerHTML = this.logoHtml(); $('#topLogo').innerHTML = this.logoHtml();
    $('#topName').textContent = nome; $('#topInfo').textContent = [c.telefone, c.endereco].filter(Boolean).join(' · ') || 'Configure os dados da sua oficina em “Empresa”';
    document.title = nome + ' — Oficina';
  },
  nav() {
    const it = [['painel', '📊', 'Painel'], ['agenda', '📅', 'Agenda'], ['ordens', '🔧', 'Ordens'], ['clients', '👥', 'Clientes'], ['mechanics', '🧑‍🔧', 'Mecânicos'], ['company', '🏢', 'Empresa'], ['mensagens', '💬', 'Mensagens']];
    $('#nav').innerHTML = it.map(([id, i, t]) => `<button data-id="${id}"><i>${i}</i>${t}</button>`).join('');
    $('#nav').onclick = e => { const b = e.target.closest('button'); if (b) this.go(b.dataset.id); };
  },
  go(id) { this.cur = id; document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('on', b.dataset.id === id)); this.render(); },
  render() { const y = $('#main').scrollTop; $('#main').innerHTML = ''; this.views[this.cur]($('#main')); $('#main').scrollTop = y; },
  client: id => App.db.clients.find(c => c.id === id) || {},
  mech: id => App.db.mechanics.find(m => m.id === id) || {},
  order: id => App.db.orders.find(o => o.id === id)
};

// ===== Mensagens (WhatsApp) com registro por OS =====
const Msg = {
  fill(tpl, o) {
    const c = App.db.company, cl = App.client(o.clientId);
    const v = { cliente: cl.nome || '', empresa: c.nome || '', os: o.os, placa: o.placa || '', modelo: o.modelo || '', veiculo: Ord.veic(o), mecanico: App.mech(o.mecId).nome || '',
      previsao: D.br(Ord.prazoData(o)), prazo: o.prazoDias, entrada: D.br(o.entrada), defeito: o.defeito || '', motivo: o.motivoAtraso || '(a informar)', endereco: c.endereco || '', telefone: c.telefone || '' };
    return tpl.replace(/\{(\w+)\}/g, (m, k) => k in v ? v[k] : m);
  },
  phone(t) { let n = String(t || '').replace(/\D/g, ''); if (!n) return ''; if (n.length <= 11) n = App.db.settings.ddi + n.replace(/^0+/, ''); return n; },
  // abre o WhatsApp no número do cliente e guarda a mensagem enviada na tabela da OS
  async send(o, text, tipo) {
    const n = Msg.phone(App.client(o.clientId).tel);
    if (!n) { toast('Cliente sem telefone cadastrado'); return false; }
    api.openExternal(`https://wa.me/${n}?text=${encodeURIComponent(text)}`);
    (o.msgs = o.msgs || []).push({ id: uid(), dir: 'out', tipo, text, at: new Date().toISOString() });
    if (tipo === 'pronto') { o.avisado = true; o.dataAviso = D.today(); }
    await App.save(); return true;
  },
  async reply(o, text) { (o.msgs = o.msgs || []).push({ id: uid(), dir: 'in', tipo: 'resposta', text, at: new Date().toISOString() }); await App.save(); }
};
const fdt = iso => { const d = new Date(iso); return `${D.br(D.iso(d))} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

function modal(title, html, onOk, okText = 'Salvar', extra = '', cls = '') {
  const root = $('#modalRoot');
  root.innerHTML = `<div class="ov"><form class="modal ${cls}"><h2>${title}</h2>${html}<div class="mf">${extra}<button type="button" class="btn" data-x>Fechar</button>${onOk ? `<button class="btn pri">${okText}</button>` : ''}</div></form></div>`;
  const close = () => root.innerHTML = '';
  root.querySelector('[data-x]').onclick = close;
  root.querySelector('.ov').onmousedown = e => { if (e.target.classList.contains('ov')) close(); };
  const f = root.querySelector('form');
  f.onsubmit = async e => { e.preventDefault(); if (onOk) { const r = await onOk(Object.fromEntries(new FormData(f))); if (r !== false) close(); } };
  return { close, form: f };
}
function confirmBox(msg, yes) { modal('Confirmar', `<p>${msg}</p>`, () => { yes(); }, 'Confirmar'); }
function csv(rows) { return '﻿' + rows.map(r => r.map(s => `"${String(s ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n'); }
