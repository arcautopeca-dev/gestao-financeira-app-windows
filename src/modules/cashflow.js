function cashChart(m, w = 760, h = 260) {
  const pad = { l: 56, r: 12, t: 12, b: 26 }, iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
  const bal = []; let acc = App.db.settings.openingBalance; m.forEach(x => { acc += x.rec - x.desp; bal.push(acc); });
  const vals = [...m.flatMap(x => [x.rec, x.desp]), ...bal, 0];
  const max = Math.max(...vals), min = Math.min(...vals), span = (max - min) || 1;
  const y = v => pad.t + ih - ((v - min) / span) * ih, bw = iw / 12;
  const short = v => Math.abs(v) >= 1e3 ? (v / 1e3).toFixed(Math.abs(v) >= 1e4 ? 0 : 1).replace('.', ',') + 'k' : Math.round(v);
  let s = `<svg viewBox="0 0 ${w} ${h}" width="100%" role="img" aria-label="Receitas, despesas e saldo por mês">`;
  for (let i = 0; i <= 4; i++) { const v = min + span * i / 4; s += `<line x1="${pad.l}" x2="${w - pad.r}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${pad.l - 6}" y="${y(v) + 4}" text-anchor="end">${short(v)}</text>`; }
  m.forEach((x, i) => {
    const cx = pad.l + i * bw;
    s += `<rect x="${cx + bw * .14}" width="${bw * .34}" y="${Math.min(y(x.rec), y(0))}" height="${Math.abs(y(0) - y(x.rec))}" fill="#16a34a" rx="2"><title>${Fin.months[i]} — Receitas: ${Fin.brl(x.rec)}</title></rect>`;
    s += `<rect x="${cx + bw * .5}" width="${bw * .34}" y="${Math.min(y(x.desp), y(0))}" height="${Math.abs(y(0) - y(x.desp))}" fill="#dc2626" rx="2"><title>${Fin.months[i]} — Despesas: ${Fin.brl(x.desp)}</title></rect>`;
    s += `<text x="${cx + bw / 2}" y="${h - 8}" text-anchor="middle">${Fin.months[i].slice(0, 3)}</text>`;
  });
  s += `<polyline fill="none" stroke="#2563eb" stroke-width="2.2" points="${bal.map((v, i) => `${pad.l + i * bw + bw / 2},${y(v)}`).join(' ')}"/>` +
    bal.map((v, i) => `<circle cx="${pad.l + i * bw + bw / 2}" cy="${y(v)}" r="3.5" fill="#2563eb"><title>${Fin.months[i]} — Saldo: ${Fin.brl(v)}</title></circle>`).join('');
  return s + `</svg><div class="legend"><span><i style="background:#16a34a"></i>Receitas</span><span><i style="background:#dc2626"></i>Despesas</span><span><i style="background:#2563eb"></i>Saldo acumulado</span></div>`;
}

App.register('cashflow', {
  render(root) {
    const S = App.db.settings, m = Fin.monthly(S.year);
    const cls = v => v < 0 ? 'neg' : '';
    let acc = S.openingBalance; const ini = [], fim = [];
    m.forEach(x => { ini.push(acc); acc += x.rec - x.desp; fim.push(acc); });
    const T = k => m.reduce((a, x) => a + x[k], 0);
    const row = (label, f, tot, opt = {}) => `<tr class="${opt.cls || ''}"><td>${label}</td>${m.map((x, i) => `<td class="num ${opt.sign ? cls(f(x, i)) : ''}">${opt.pct ? (f(x, i) * 100).toFixed(1) + '%' : Fin.brl(f(x, i))}</td>`).join('')}<td class="num ${opt.sign ? cls(tot) : ''}"><b>${opt.pct ? (tot * 100).toFixed(1) + '%' : Fin.brl(tot)}</b></td></tr>`;
    const margin = (x) => x.rec ? (x.rec - x.desp) / x.rec : 0;
    root.innerHTML = `<div class="head"><div><h1>Fluxo de Caixa</h1><p class="sub">Calculado automaticamente a partir das contas <b>pagas</b> e <b>recebidas</b>.</p></div>
      <div class="tools" style="margin:0"><label>Ano <input type="number" id="yr" value="${S.year}" style="width:90px"></label>
      <label>Saldo inicial <input type="number" step="0.01" id="ob" value="${S.openingBalance}" style="width:130px"></label></div></div>
    <div class="cards">
      <div class="card kpi ok"><small>Receitas realizadas</small><b>${Fin.brl(T('rec'))}</b></div>
      <div class="card kpi bad"><small>Despesas realizadas</small><b>${Fin.brl(T('desp'))}</b></div>
      <div class="card kpi ${T('rec') - T('desp') < 0 ? 'bad' : 'ok'}"><small>Resultado do ano</small><b>${Fin.brl(T('rec') - T('desp'))}</b></div>
      <div class="card kpi"><small>Saldo final projetado</small><b>${Fin.brl(fim[11])}</b></div></div>
    <div class="card" style="margin-bottom:14px"><h3>Visão mensal</h3>${cashChart(m)}</div>
    <div class="tw"><table class="cf"><thead><tr><th>${S.year}</th>${Fin.months.map(n => `<th class="num">${n.slice(0, 3)}</th>`).join('')}<th class="num">Anual</th></tr></thead><tbody>
      ${row('Saldo inicial', (x, i) => ini[i], S.openingBalance)}
      ${row('Receitas', x => x.rec, T('rec'))}
      ${row('Despesas', x => x.desp, T('desp'))}
      ${row('Lucro', x => x.rec - x.desp, T('rec') - T('desp'), { sign: 1, cls: 'total' })}
      ${row('Saldo acumulado', (x, i) => fim[i], fim[11], { sign: 1, cls: 'total' })}
      ${row('Lucratividade', margin, T('rec') ? (T('rec') - T('desp')) / T('rec') : 0, { pct: 1, sign: 1 })}
      ${row('A receber (previsto)', x => x.recPrev, T('recPrev'))}
      ${row('A pagar (previsto)', x => x.despPrev, T('despPrev'))}
    </tbody></table></div>`;
    $('#yr').onchange = async e => { S.year = +e.target.value || S.year; await App.save(); App.render(); };
    $('#ob').onchange = async e => { S.openingBalance = parseFloat(e.target.value) || 0; await App.save(); App.render(); };
  }
});
