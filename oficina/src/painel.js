// Painel de métricas: mecânicos, porte, tempo médio, meta
const PN = { mes: 'todos' };
App.views.painel = root => {
  const all = App.db.orders.filter(o => o.status !== 'cancelado'), today = D.today();
  const done = all.filter(o => (o.status === 'finalizado' || o.status === 'entregue') && o.dataFinal);
  const months = [...new Set(done.map(o => D.ym(o.dataFinal)))].sort().reverse();
  if (PN.mes !== 'todos' && !months.includes(PN.mes)) PN.mes = 'todos';
  const inM = PN.mes === 'todos' ? done : done.filter(o => D.ym(o.dataFinal) === PN.mes);
  const avg = l => l.length ? l.reduce((a, o) => a + Ord.decorridos(o), 0) / l.length : 0;
  const f1 = n => (Math.round(n * 10) / 10).toString().replace('.', ',');
  const ativas = all.filter(Ord.ativa), atras = ativas.filter(o => Ord.meta(o).late);
  const noPrazo = inM.filter(o => !Ord.meta(o).late), foraPrazo = inM.filter(o => Ord.meta(o).late);
  const aguard = all.filter(o => o.status === 'finalizado'), naoAv = aguard.filter(o => !o.avisado);
  // por mecânico
  const mrows = App.db.mechanics.map(m => { const l = inM.filter(o => o.mecId === m.id);
    return { m, n: l.length, p: l.filter(o => o.porte === 'pequeno').length, g: l.filter(o => o.porte === 'grande').length, t: avg(l), meta: l.length ? Math.round(l.filter(o => !Ord.meta(o).late).length / l.length * 100) : 0 }; }).sort((a, b) => b.n - a.n);
  const top = mrows[0] && mrows[0].n ? mrows[0] : null;
  const pq = inM.filter(o => o.porte === 'pequeno'), gr = inM.filter(o => o.porte === 'grande');
  // tempo médio por mês (6 últimos)
  const last = [...new Set(done.map(o => D.ym(o.dataFinal)))].sort().slice(-6);
  const motivos = all.filter(o => o.motivoAtraso && Ord.meta(o).late).slice(-5).reverse();
  root.innerHTML = `<div class="head"><div><h1 class="t">Painel de métricas</h1><p class="sub">Desempenho da oficina, prazos e metas.</p></div>
    <div class="tools" style="margin:0"><select id="mes" style="width:auto"><option value="todos">Todos os meses</option>${months.map(m => `<option value="${m}" ${PN.mes === m ? 'selected' : ''}>${D.ymLabel(m)}</option>`).join('')}</select></div></div>
  <div class="kpis">
    <div class="card kpi"><small>Em conserto agora</small><b>${ativas.length}</b></div>
    <div class="card kpi ${atras.length ? 'bad' : 'ok'}"><small>Atrasadas agora</small><b>${atras.length}</b></div>
    <div class="card kpi"><small>Serviços concluídos (${PN.mes === 'todos' ? 'total' : 'mês'})</small><b>${inM.length}</b></div>
    <div class="card kpi"><small>Tempo médio (dias)</small><b>${inM.length ? f1(avg(inM)) : '—'}</b></div>
    <div class="card kpi ${inM.length && foraPrazo.length / inM.length > .3 ? 'warn' : 'ok'}"><small>Dentro da meta</small><b>${inM.length ? Math.round(noPrazo.length / inM.length * 100) + '%' : '—'}</b></div>
    <div class="card kpi ${naoAv.length ? 'warn' : ''}"><small>Aguardando retirada</small><b>${aguard.length}</b><small>${naoAv.length} sem aviso ao cliente</small></div></div>
  ${top ? `<div class="champ"><span class="em">🏆</span><div><small>Mecânico com mais serviços ${PN.mes === 'todos' ? '' : 'em ' + D.ymLabel(PN.mes)}</small><b style="font-size:22px">${esc(top.m.nome)}</b> — ${top.n} serviço(s): ${top.p} pequeno(s) e ${top.g} grande(s) · tempo médio ${f1(top.t)} dia(s)</div></div>` : ''}
  <div class="grid2">
    <div class="card"><h3>Serviços por mecânico</h3>${Ch.hbars(mrows.filter(r => r.n).map(r => ({ label: r.m.nome, parts: [r.p, r.g] })), ['#8b6bff', '#e5484d'])}<div class="leg"><span style="--c:#8b6bff">Pequeno</span><span style="--c:#e5484d">Grande</span></div></div>
    <div class="card"><h3>Pequeno × Grande</h3><div class="donutbox">${Ch.donut([{ v: pq.length, color: '#8b6bff', label: 'Pequeno' }, { v: gr.length, color: '#e5484d', label: 'Grande' }])}
      <div><p style="margin:0 0 8px"><span class="dot" style="background:#8b6bff"></span><b>Pequeno:</b> ${pq.length} serviço(s) · média ${pq.length ? f1(avg(pq)) : '—'} dia(s)</p><p style="margin:0"><span class="dot" style="background:#e5484d"></span><b>Grande:</b> ${gr.length} serviço(s) · média ${gr.length ? f1(avg(gr)) : '—'} dia(s)</p></div></div></div>
    <div class="card"><h3>Tempo médio por mês (dias)</h3>${last.length ? Ch.line(last.map(m => m.slice(5) + '/' + m.slice(2, 4)), [
      { name: 'Tempo médio real', color: '#6343ee', values: last.map(m => +avg(done.filter(o => D.ym(o.dataFinal) === m)).toFixed(1)) },
      { name: 'Meta média (prazo)', color: '#12a26b', dash: 1, values: last.map(m => { const l = done.filter(o => D.ym(o.dataFinal) === m); return +(l.reduce((a, o) => a + (+o.prazoDias || 0), 0) / l.length).toFixed(1); }) }]) : '<p class="sub">Conclua serviços para ver a evolução.</p>'}</div>
    <div class="card"><h3>Cumprimento da meta</h3><div class="donutbox">${Ch.donut([{ v: noPrazo.length, color: '#12a26b', label: 'Dentro da meta' }, { v: foraPrazo.length, color: '#e5484d', label: 'Fora da meta' }])}
      <div><p style="margin:0 0 8px"><span class="dot" style="background:#12a26b"></span><b>Dentro da meta:</b> ${noPrazo.length}</p><p style="margin:0 0 8px"><span class="dot" style="background:#e5484d"></span><b>Fora da meta:</b> ${foraPrazo.length}</p>
      ${motivos.length ? `<small style="color:var(--mute)">Últimos motivos de atraso:</small>${motivos.map(o => `<div style="font-size:12.5px">• OS ${esc(o.os)}: ${esc(o.motivoAtraso)}</div>`).join('')}` : ''}</div></div></div></div>
  <div class="card" style="padding:6px"><h3 style="padding:12px 14px 0">Resumo por mecânico</h3><div class="tw"><table><thead><tr><th>Mecânico</th><th>Serviços</th><th>Pequenos</th><th>Grandes</th><th>Tempo médio</th><th>Dentro da meta</th></tr></thead><tbody>${mrows.map(r => `<tr><td><b>${esc(r.m.nome)}</b></td><td>${r.n}</td><td>${r.p}</td><td>${r.g}</td><td>${r.n ? f1(r.t) + ' dia(s)' : '—'}</td><td>${r.n ? r.meta + '%' : '—'}</td></tr>`).join('') || '<tr><td colspan="6" class="empty">Cadastre mecânicos para ver o ranking.</td></tr>'}</tbody></table></div></div>`;
  $('#mes').onchange = e => { PN.mes = e.target.value; App.render(); };
};
