// ===== Núcleo: estado, utilitários, roteamento =====
const App = {
  db: null, modules: {}, current: null,
  defaults() {
    const y = new Date().getFullYear();
    return {
      version: 1,
      settings: { year: y, openingBalance: 0, alertDays: 7, alerts: { atrasadas: true, vencendo: true, recebimentoDia: true, recebimentosAtrasados: true } },
      categories: {
        pagar: ['Fornecedores', 'Aluguel', 'Impostos', 'Salários', 'Energia/Água', 'Outros'],
        receber: ['Vendas', 'Serviços', 'Outros'],
        formas: ['Boleto', 'PIX', 'Cartão', 'Dinheiro', 'Transferência']
      },
      payables: [], receivables: []
    };
  },
  async start() {
    const saved = await api.load();
    const d = this.defaults();
    this.db = saved ? { ...d, ...saved, settings: { ...d.settings, ...saved.settings, alerts: { ...d.settings.alerts, ...(saved.settings || {}).alerts } }, categories: { ...d.categories, ...saved.categories } } : d;
    if (!saved) await this.save();
    this.buildNav();
    this.go('dashboard');
    setTimeout(() => this.alertsOnStart(), 1200);
  },
  async save() {
    const el = $('#saveState'); el.textContent = 'Salvando…';
    await api.save(this.db); el.textContent = 'Dados salvos';
  },
  register(id, mod) { this.modules[id] = mod; },
  buildNav() {
    const items = [['dashboard', '📊', 'Painel'], ['payables', '📤', 'Contas a Pagar'], ['receivables', '📥', 'Contas a Receber'], ['cashflow', '📈', 'Fluxo de Caixa'], ['categories', '🏷️', 'Categorias'], ['settings', '⚙️', 'Configurações']];
    $('#nav').innerHTML = items.map(([id, i, t]) => `<button data-id="${id}"><span class="ico">${i}</span>${t}</button>`).join('');
    $('#nav').onclick = e => { const b = e.target.closest('button'); if (b) this.go(b.dataset.id); };
  },
  go(id) {
    this.current = id;
    document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('on', b.dataset.id === id));
    this.render();
  },
  render() { const m = this.modules[this.current]; $('#main').innerHTML = ''; m.render($('#main')); $('#main').scrollTop = 0; },
  alertsOnStart() {
    const s = this.db.settings, a = s.alerts, t = Fin.today();
    const msgs = [];
    const pay = this.db.payables.filter(x => !x.pago), rec = this.db.receivables.filter(x => !x.pago);
    const late = pay.filter(x => x.data && x.data < t), soon = pay.filter(x => x.data && x.data >= t && Fin.diffDays(t, x.data) <= s.alertDays);
    const today = rec.filter(x => x.data === t), recLate = rec.filter(x => x.data && x.data < t);
    if (a.atrasadas && late.length) msgs.push(`${late.length} conta(s) a pagar atrasada(s): ${Fin.brl(Fin.sum(late))}`);
    if (a.vencendo && soon.length) msgs.push(`${soon.length} conta(s) vencendo em até ${s.alertDays} dias: ${Fin.brl(Fin.sum(soon))}`);
    if (a.recebimentoDia && today.length) msgs.push(`${today.length} recebimento(s) previsto(s) para hoje: ${Fin.brl(Fin.sum(today))}`);
    if (a.recebimentosAtrasados && recLate.length) msgs.push(`${recLate.length} recebimento(s) atrasado(s): ${Fin.brl(Fin.sum(recLate))}`);
    if (msgs.length) { api.notify({ title: 'Gestão Financeira — Alertas', body: msgs.join('\n') }); toast(msgs[0] + (msgs.length > 1 ? ` (+${msgs.length - 1})` : '')); }
  }
};

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 3500); }
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const Fin = {
  brl: v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0),
  today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; },
  date: s => s ? s.split('-').reverse().join('/') : '—',
  diffDays: (a, b) => Math.round((new Date(b + 'T12:00') - new Date(a + 'T12:00')) / 864e5),
  sum: l => l.reduce((a, x) => a + (Number(x.valor) || 0), 0),
  months: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
  // situação das contas (mesma regra da planilha original)
  statusPay(x) {
    if (x.pago) return ['Paga', 'ok'];
    if (!x.data) return ['Sem data', 'info'];
    const t = Fin.today();
    if (x.data < t) return ['Atrasada', 'bad'];
    if (Fin.diffDays(t, x.data) <= App.db.settings.alertDays) return ['Vencendo', 'warn'];
    return ['No prazo', 'info'];
  },
  statusRec(x) {
    if (x.pago) return ['Recebido', 'ok'];
    if (!x.data) return ['Sem data', 'info'];
    const t = Fin.today();
    if (x.data === t) return ['Recebe hoje', 'warn'];
    if (x.data < t) return ['Atrasado', 'bad'];
    return ['A receber', 'info'];
  },
  // data de realização (caixa): data efetiva, ou a data de vencimento
  cashDate: x => x.dataPgto || x.data,
  monthly(year) {
    const r = Array.from({ length: 12 }, () => ({ rec: 0, desp: 0, recPrev: 0, despPrev: 0 }));
    const add = (list, k, kp) => list.forEach(x => {
      const d = x.pago ? Fin.cashDate(x) : x.data; if (!d || +d.slice(0, 4) !== year) return;
      r[+d.slice(5, 7) - 1][x.pago ? k : kp] += Number(x.valor) || 0;
    });
    add(App.db.receivables, 'rec', 'recPrev'); add(App.db.payables, 'desp', 'despPrev');
    return r;
  }
};

// ===== Modal / formulários =====
function modal(title, html, onOk, okText = 'Salvar') {
  const root = $('#modalRoot');
  root.innerHTML = `<div class="ov"><form class="modal"><h2>${title}</h2>${html}<div class="mf"><button type="button" class="btn" data-x>Cancelar</button>${onOk ? `<button class="btn pri">${okText}</button>` : ''}</div></form></div>`;
  const close = () => root.innerHTML = '';
  root.querySelector('[data-x]').onclick = close;
  root.querySelector('.ov').onmousedown = e => { if (e.target.classList.contains('ov')) close(); };
  const f = root.querySelector('form');
  f.onsubmit = e => { e.preventDefault(); if (onOk) { const ok = onOk(Object.fromEntries(new FormData(f))); if (ok !== false) close(); } };
  const first = f.querySelector('input,select'); if (first) first.focus();
  return close;
}
function confirmBox(msg, onYes) { modal('Confirmar', `<p>${msg}</p>`, () => { onYes(); }, 'Confirmar'); }
function download(text, name, type) { return api.saveText({ text, name, filters: [{ name: type, extensions: [name.split('.').pop()] }] }); }
