// Fábrica de módulo de contas (usada por Pagar e Receber)
function makeAccountsModule(c) {
  const st = { q: '', status: '', month: '', sort: 'data' };
  const list = () => App.db[c.key];
  function render(root) {
    const all = list();
    const open = all.filter(x => !x.pago);
    const late = open.filter(x => c.status(x)[0].startsWith('Atras'));
    root.innerHTML = `
    <div class="head"><div><h1>${c.title}</h1><p class="sub">${c.sub}</p></div>
      <div><button class="btn" id="exp">Exportar CSV</button> <button class="btn pri" id="add">+ ${c.newLabel}</button></div></div>
    <div class="cards">
      <div class="card kpi ${c.kind === 'pay' ? 'warn' : 'ok'}"><small>${c.openLabel}</small><b>${Fin.brl(Fin.sum(open))}</b></div>
      <div class="card kpi bad"><small>Em atraso</small><b>${Fin.brl(Fin.sum(late))}</b><small>${late.length} lançamento(s)</small></div>
      <div class="card kpi"><small>${c.doneLabel} (total)</small><b>${Fin.brl(Fin.sum(all.filter(x => x.pago)))}</b></div>
    </div>
    <div class="tools">
      <input type="search" id="q" placeholder="🔍 Buscar descrição ou categoria…" value="${esc(st.q)}">
      <select id="fs"><option value="">Todas as situações</option>${c.statuses.map(s => `<option ${st.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
      <select id="fm"><option value="">Todos os meses</option>${Fin.months.map((m, i) => `<option value="${i + 1}" ${st.month == i + 1 ? 'selected' : ''}>${m}</option>`).join('')}</select>
    </div>
    <div class="tw"><table><thead><tr><th>Descrição</th><th>Categoria</th><th>Forma</th><th class="num">Valor</th><th>${c.dateLabel}</th><th>Situação</th><th></th></tr></thead><tbody id="tb"></tbody></table></div>`;
    $('#add').onclick = () => form();
    $('#q').oninput = e => { st.q = e.target.value; rows(); };
    $('#fs').onchange = e => { st.status = e.target.value; rows(); };
    $('#fm').onchange = e => { st.month = e.target.value; rows(); };
    $('#exp').onclick = exportCsv;
    rows();
  }
  function filtered() {
    const q = st.q.toLowerCase();
    return list().filter(x => (!q || (x.desc + ' ' + x.cat).toLowerCase().includes(q)) && (!st.status || c.status(x)[0] === st.status) && (!st.month || (x.data && +x.data.slice(5, 7) === +st.month)))
      .sort((a, b) => (a.data || '9').localeCompare(b.data || '9'));
  }
  function rows() {
    const l = filtered(), tb = $('#tb');
    if (!l.length) { tb.innerHTML = `<tr><td colspan="7" class="empty">Nenhum lançamento encontrado.<br>Clique em <b>+ ${c.newLabel}</b> para começar.</td></tr>`; return; }
    tb.innerHTML = l.map(x => { const [s, k] = c.status(x); return `<tr>
      <td><b>${esc(x.desc)}</b></td><td>${esc(x.cat) || '—'}</td><td>${esc(x.forma) || '—'}</td>
      <td class="num">${Fin.brl(x.valor)}</td><td>${Fin.date(x.data)}</td><td><span class="pill p-${k}">${s}</span></td>
      <td class="act"><button class="btn sm" data-a="t" data-id="${x.id}">${x.pago ? 'Desfazer' : c.doneAction}</button>
      <button class="btn sm" data-a="e" data-id="${x.id}">Editar</button>
      <button class="btn sm danger" data-a="d" data-id="${x.id}">Excluir</button></td></tr>`; }).join('') +
      `<tr class="total"><td colspan="3">Total (${l.length})</td><td class="num">${Fin.brl(Fin.sum(l))}</td><td colspan="3"></td></tr>`;
    tb.onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      const x = list().find(i => i.id === b.dataset.id);
      if (b.dataset.a === 'e') form(x);
      if (b.dataset.a === 'd') confirmBox(`Excluir "${esc(x.desc)}"?`, async () => { App.db[c.key] = list().filter(i => i !== x); await App.save(); App.render(); toast('Lançamento excluído'); });
      if (b.dataset.a === 't') toggle(x);
    };
  }
  function toggle(x) {
    if (x.pago) { x.pago = false; delete x.dataPgto; App.save(); App.render(); return; }
    modal(c.doneAction, `<div class="f"><label>${c.doneDate}<input type="date" name="dp" value="${Fin.today()}" required></label></div>`, async v => {
      x.pago = true; x.dataPgto = v.dp; await App.save(); App.render(); toast(c.doneToast);
    }, 'Confirmar');
  }
  function form(x) {
    const cats = App.db.categories[c.catKey], formas = App.db.categories.formas;
    const opt = (arr, val) => `<option value="">— selecione —</option>` + [...new Set([...arr, val].filter(Boolean))].map(o => `<option ${o === val ? 'selected' : ''}>${esc(o)}</option>`).join('');
    modal(x ? 'Editar lançamento' : c.newLabel, `<div class="f">
      <label>Descrição<input name="desc" required value="${esc(x?.desc)}" placeholder="Ex.: ${c.example}"></label>
      <div class="row"><label>Categoria<select name="cat">${opt(cats, x?.cat)}</select></label>
      <label>Forma<select name="forma">${opt(formas, x?.forma)}</select></label></div>
      <div class="row"><label>Valor (R$)<input name="valor" type="number" step="0.01" min="0" required value="${x?.valor ?? ''}"></label>
      <label>${c.dateLabel}<input name="data" type="date" required value="${x?.data || Fin.today()}"></label></div>
      ${!x ? `<label>Repetir (parcelas mensais)<input name="rep" type="number" min="1" max="60" value="1"></label>` : ''}
    </div>`, async v => {
      const base = { desc: v.desc.trim(), cat: v.cat, forma: v.forma, valor: parseFloat(v.valor) || 0, data: v.data };
      if (x) Object.assign(x, base);
      else {
        const n = Math.max(1, Math.min(60, +v.rep || 1));
        for (let i = 0; i < n; i++) {
          const d = new Date(v.data + 'T12:00'); const day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + i);
          const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); d.setDate(Math.min(day, last));
          list().push({ id: uid(), ...base, desc: n > 1 ? `${base.desc} (${i + 1}/${n})` : base.desc, data: d.toISOString().slice(0, 10), pago: false });
        }
      }
      await App.save(); App.render(); toast('Lançamento salvo');
    });
  }
  function exportCsv() {
    const l = filtered();
    const csv = ['Descrição;Categoria;Forma;Valor;Data;Situação', ...l.map(x => [x.desc, x.cat, x.forma, String(x.valor).replace('.', ','), Fin.date(x.data), c.status(x)[0]].map(s => `"${String(s ?? '').replace(/"/g, '""')}"`).join(';'))].join('\r\n');
    download('﻿' + csv, c.file, 'CSV').then(r => r && toast('Arquivo exportado'));
  }
  return { render };
}
