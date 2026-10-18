// ===== Núcleo: estado, utilitários, mensagens (WhatsApp/E-mail) =====
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 3200); }

const D = {
  iso: d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
  parse: s => new Date(s + 'T12:00'),
  today() { return D.iso(new Date()); },
  add: (s, n) => { const d = D.parse(s); d.setDate(d.getDate() + n); return D.iso(d); },
  monday: s => { const d = D.parse(s); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return D.iso(d); },
  br: s => s ? s.split('-').reverse().join('/') : '',
  dow: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
  mon: ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],
  long: s => { const d = D.parse(s); return `${D.dow[d.getDay()]}, ${d.getDate()} de ${D.mon[d.getMonth()]}`; },
  mins: h => { const [a, b] = h.split(':'); return +a * 60 + +b; },
  hm: m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
};
const brl = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const App = {
  db: null, views: {}, cur: 'agenda',
  defaults() {
    return {
      company: { nome: '', telefone: '', email: '', endereco: '', logo: '' },
      settings: { startHour: 7, endHour: 20, ddi: '55',
        msgWhats: 'Olá, {cliente}! 👋 Aqui é da *{empresa}*.\nLembramos do seu atendimento de *{servico}* no dia *{data}* às *{hora}*.\n📍 {endereco}\nPara confirmar ou remarcar, responda esta mensagem.',
        assuntoEmail: 'Confirmação de agendamento - {empresa}',
        msgEmail: 'Olá, {cliente}!\n\nSeu atendimento de {servico} está agendado para {data} às {hora}.\n\nLocal: {endereco}\nTelefone: {telefone}\n\nAtenciosamente,\n{empresa}' },
      clients: [], services: [{ id: uid(), nome: 'Atendimento', duracao: 60, preco: 0, cor: '#6343ee' }], appts: []
    };
  },
  async start() {
    const s = await api.load(), d = this.defaults();
    this.db = s ? { ...d, ...s, company: { ...d.company, ...s.company }, settings: { ...d.settings, ...s.settings } } : d;
    if (!s) await this.save();
    this.nav(); this.brand();
    setTimeout(() => $('#splash').classList.add('hide'), 1600);
    this.go('agenda');
  },
  async save() { $('#saveState').textContent = 'salvando…'; await api.save(this.db); $('#saveState').textContent = 'salvo'; },
  logoHtml(big) { const c = this.db.company; return `<div class="logo">${c.logo ? `<img src="${c.logo}" alt="">` : esc((c.nome || 'AF').trim().slice(0, 2).toUpperCase())}</div>`; },
  brand() {
    const c = this.db.company, nome = c.nome || 'Agenda Fácil';
    $('#spLogo').innerHTML = this.logoHtml(); $('#spName').textContent = nome;
    $('#railLogo').innerHTML = this.logoHtml(); $('#topLogo').innerHTML = this.logoHtml();
    $('#topName').textContent = nome; $('#topInfo').textContent = [c.telefone, c.endereco].filter(Boolean).join(' · ') || 'Configure os dados da sua empresa em “Empresa”';
    document.title = nome + ' — Agenda';
  },
  nav() {
    const it = [['agenda', '📅', 'Agenda'], ['clients', '👥', 'Clientes'], ['services', '💼', 'Serviços'], ['company', '🏢', 'Empresa'], ['mensagens', '💬', 'Mensagens']];
    $('#nav').innerHTML = it.map(([id, i, t]) => `<button data-id="${id}"><i>${i}</i>${t}</button>`).join('');
    $('#nav').onclick = e => { const b = e.target.closest('button'); if (b) this.go(b.dataset.id); };
  },
  go(id) { this.cur = id; document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('on', b.dataset.id === id)); this.render(); },
  render() { $('#main').innerHTML = ''; this.views[this.cur]($('#main')); },
  client: id => App.db.clients.find(c => c.id === id), service: id => App.db.services.find(s => s.id === id)
};

// ===== Mensagens =====
const Msg = {
  fill(tpl, a) {
    const c = App.db.company, cl = App.client(a.clientId) || {}, sv = App.service(a.serviceId) || {};
    const v = { cliente: cl.nome || '', empresa: c.nome || '', servico: sv.nome || '', data: D.br(a.data), hora: a.hora, endereco: c.endereco || '', telefone: c.telefone || '', dia: D.dow[D.parse(a.data).getDay()] };
    return tpl.replace(/\{(\w+)\}/g, (m, k) => k in v ? v[k] : m);
  },
  phone(t) { let n = String(t || '').replace(/\D/g, ''); if (!n) return ''; if (n.length <= 11) n = App.db.settings.ddi + n.replace(/^0+/, ''); return n; },
  whats(a, text) {
    const n = Msg.phone((App.client(a.clientId) || {}).tel);
    if (!n) return toast('Cliente sem telefone cadastrado');
    api.openExternal(`https://wa.me/${n}?text=${encodeURIComponent(text ?? Msg.fill(App.db.settings.msgWhats, a))}`);
  },
  email(a, subject, body) {
    const m = (App.client(a.clientId) || {}).email;
    if (!m) return toast('Cliente sem e-mail cadastrado');
    api.openExternal(`mailto:${encodeURIComponent(m)}?subject=${encodeURIComponent(subject ?? Msg.fill(App.db.settings.assuntoEmail, a))}&body=${encodeURIComponent(body ?? Msg.fill(App.db.settings.msgEmail, a))}`);
  }
};

// ===== Modal =====
function modal(title, html, onOk, okText = 'Salvar', extra = '') {
  const root = $('#modalRoot');
  root.innerHTML = `<div class="ov"><form class="modal"><h2>${title}</h2>${html}<div class="mf">${extra}<button type="button" class="btn" data-x>Fechar</button>${onOk ? `<button class="btn pri">${okText}</button>` : ''}</div></form></div>`;
  const close = () => root.innerHTML = '';
  root.querySelector('[data-x]').onclick = close;
  root.querySelector('.ov').onmousedown = e => { if (e.target.classList.contains('ov')) close(); };
  const f = root.querySelector('form');
  f.onsubmit = async e => { e.preventDefault(); if (onOk) { const r = await onOk(Object.fromEntries(new FormData(f))); if (r !== false) close(); } };
  const i = f.querySelector('input:not([type=hidden]),select'); if (i && onOk) i.focus();
  return { close, form: f };
}
function confirmBox(msg, yes) { modal('Confirmar', `<p>${msg}</p>`, () => { yes(); }, 'Confirmar'); }
