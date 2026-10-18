App.register('dashboard', {
  render(root) {
    const S = App.db.settings, t = Fin.today(), m = Fin.monthly(S.year);
    const pay = App.db.payables.filter(x => !x.pago), rec = App.db.receivables.filter(x => !x.pago);
    const balance = S.openingBalance + m.reduce((a, x) => a + x.rec - x.desp, 0);
    const late = pay.filter(x => x.data && x.data < t), recLate = rec.filter(x => x.data && x.data < t);
    const next = [
      ...pay.filter(x => x.data && x.data >= t && Fin.diffDays(t, x.data) <= 15).map(x => ({ ...x, tipo: 'pay' })),
      ...rec.filter(x => x.data && x.data >= t && Fin.diffDays(t, x.data) <= 15).map(x => ({ ...x, tipo: 'rec' }))
    ].sort((a, b) => a.data.localeCompare(b.data)).slice(0, 8);
    const lateAll = [...late.map(x => ({ ...x, tipo: 'pay' })), ...recLate.map(x => ({ ...x, tipo: 'rec' }))].sort((a, b) => a.data.localeCompare(b.data)).slice(0, 8);
    const li = x => `<li><div><b>${esc(x.desc)}</b><small>${x.tipo === 'pay' ? '📤 Pagar' : '📥 Receber'} · ${Fin.date(x.data)}</small></div><b class="${x.tipo === 'pay' ? 'neg' : 'pos'}">${x.tipo === 'pay' ? '−' : '+'}${Fin.brl(x.valor)}</b></li>`;
    const hello = new Date().getHours() < 12 ? 'Bom dia' : new Date().getHours() < 18 ? 'Boa tarde' : 'Boa noite';
    root.innerHTML = `<div class="head"><div><h1>${hello}! 👋</h1><p class="sub">Resumo financeiro de ${S.year} — hoje é ${Fin.date(t)}.</p></div>
      <div><button class="btn" data-go="payables">+ Conta a pagar</button> <button class="btn pri" data-go="receivables">+ Recebimento</button></div></div>
    <div class="cards">
      <div class="card kpi ${balance < 0 ? 'bad' : 'ok'}"><small>Saldo atual em caixa</small><b>${Fin.brl(balance)}</b></div>
      <div class="card kpi warn"><small>A pagar em aberto</small><b>${Fin.brl(Fin.sum(pay))}</b><small>${pay.length} conta(s)</small></div>
      <div class="card kpi ok"><small>A receber em aberto</small><b>${Fin.brl(Fin.sum(rec))}</b><small>${rec.length} conta(s)</small></div>
      <div class="card kpi bad"><small>Atrasos</small><b>${late.length + recLate.length}</b><small>${late.length} a pagar · ${recLate.length} a receber</small></div></div>
    <div class="grid2"><div class="card"><h3>Fluxo de caixa ${S.year}</h3>${cashChart(m, 760, 240)}</div>
    <div style="display:grid;gap:14px;align-content:start">
      <div class="card"><h3>⚠️ Atrasados</h3><ul class="list">${lateAll.map(li).join('') || '<p class="sub" style="margin:0">Tudo em dia 🎉</p>'}</ul></div>
      <div class="card"><h3>📅 Próximos 15 dias</h3><ul class="list">${next.map(li).join('') || '<p class="sub" style="margin:0">Nada previsto.</p>'}</ul></div></div></div>`;
    root.onclick = e => { const b = e.target.closest('[data-go]'); if (b) App.go(b.dataset.go); };
  }
});
