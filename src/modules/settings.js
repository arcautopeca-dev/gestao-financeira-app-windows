App.register('settings', {
  render(root) {
    const S = App.db.settings, A = S.alerts;
    const sw = (k, t, d) => `<div class="switch"><div>${t}<small>${d}</small></div><input type="checkbox" data-k="${k}" ${A[k] ? 'checked' : ''}></div>`;
    root.innerHTML = `<div class="head"><div><h1>Configurações</h1><p class="sub">Alertas, backup e importação de dados.</p></div></div>
    <div class="cols3">
      <div class="card"><h3>🔔 Alertas ao abrir o programa</h3>
        ${sw('atrasadas', 'Pagamentos atrasados', 'Avisa contas a pagar vencidas')}
        ${sw('vencendo', 'Pagamentos vencendo', 'Contas que vencem em breve')}
        ${sw('recebimentoDia', 'Recebimento do dia', 'Recebimentos previstos para hoje')}
        ${sw('recebimentosAtrasados', 'Recebimentos atrasados', 'Clientes que ainda não pagaram')}
        <div class="switch"><div>Dias para “vencendo”<small>Antecedência do alerta</small></div><input type="number" id="ad" min="1" max="60" value="${S.alertDays}" style="width:80px"></div></div>
      <div class="card"><h3>💾 Backup</h3><p class="sub">Uma cópia automática é feita todo dia (últimos 15 dias). Você também pode salvar uma cópia manual.</p>
        <button class="btn" id="bk">Exportar backup</button> <button class="btn" id="rs">Restaurar backup</button></div>
      <div class="card"><h3>📑 Importar da planilha Excel</h3><p class="sub">Traz contas a pagar, a receber, categorias, ano e saldo inicial da planilha antiga (.xlsx/.xlsm). Os dados importados são <b>adicionados</b> aos atuais.</p>
        <button class="btn pri" id="im">Importar planilha…</button></div></div>`;
    root.onchange = async e => {
      if (e.target.dataset.k) A[e.target.dataset.k] = e.target.checked;
      if (e.target.id === 'ad') S.alertDays = Math.max(1, +e.target.value || 7);
      await App.save(); toast('Configuração salva');
    };
    $('#bk').onclick = async () => { const r = await download(JSON.stringify(App.db, null, 1), `backup-gestao-${Fin.today()}.json`, 'JSON'); if (r) toast('Backup exportado'); };
    $('#rs').onclick = async () => {
      const t = await api.openText(); if (!t) return;
      try { const d = JSON.parse(t); if (!d.payables || !d.receivables) throw 0;
        confirmBox('Substituir todos os dados atuais pelo backup selecionado?', async () => { App.db = { ...App.defaults(), ...d }; await App.save(); App.render(); toast('Backup restaurado'); });
      } catch { toast('Arquivo de backup inválido'); }
    };
    $('#im').onclick = async () => {
      let d; try { d = await api.importXlsx(); } catch (e) { return toast('Não foi possível ler a planilha'); }
      if (!d) return;
      const n = d.payables.length + d.receivables.length;
      d.payables.forEach(x => App.db.payables.push({ id: uid(), ...x, dataPgto: x.pago ? x.data : undefined }));
      d.receivables.forEach(x => App.db.receivables.push({ id: uid(), ...x, dataPgto: x.pago ? x.data : undefined }));
      for (const k of ['pagar', 'receber', 'formas']) d.categories[k].forEach(v => { if (!App.db.categories[k].includes(v)) App.db.categories[k].push(v); });
      if (d.year) S.year = d.year; if (typeof d.openingBalance === 'number') S.openingBalance = d.openingBalance;
      await App.save(); App.render(); toast(`${n} lançamento(s) importado(s)`);
    };
  }
});
