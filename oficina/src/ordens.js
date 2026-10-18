// Ordens de Serviço: tabela, formulário, detalhes, fluxo e mensagens
const OF = { q: '', st: '', mec: '', meta: '' };
App.views.ordens = root => {
  const mecs = App.db.mechanics;
  root.innerHTML = `<div class="head"><div><h1 class="t">Ordens de serviço</h1><p class="sub">Todas as informações dos consertos em uma tabela.</p></div>
    <div class="tools" style="margin:0"><button class="btn" id="xo">Exportar tabela (Excel/CSV)</button><button class="btn" id="xm">Exportar mensagens</button><button class="btn pri" id="novo">+ Agendar conserto</button></div></div>
  <div class="tools"><input type="search" id="q" placeholder="🔍 OS, placa, cliente, modelo…" value="${esc(OF.q)}">
    <select id="st" style="width:auto"><option value="">Todos os status</option>${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${OF.st === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
    <select id="mec" style="width:auto"><option value="">Todos os mecânicos</option>${mecs.map(m => `<option value="${m.id}" ${OF.mec === m.id ? 'selected' : ''}>${esc(m.nome)}</option>`).join('')}</select>
    <select id="meta" style="width:auto"><option value="">Meta: todas</option><option value="late" ${OF.meta === 'late' ? 'selected' : ''}>Atrasadas / fora da meta</option><option value="ok" ${OF.meta === 'ok' ? 'selected' : ''}>No prazo / dentro da meta</option><option value="aviso" ${OF.meta === 'aviso' ? 'selected' : ''}>Prontas sem aviso ao cliente</option></select></div>
  <div class="card" style="padding:4px"><div class="tw"><table class="ord"><thead><tr><th>OS</th><th>Cliente</th><th>Veículo</th><th>Defeito</th><th>Mecânico</th><th>Porte</th><th>Entrada</th><th>Previsão</th><th>Prazo / dias</th><th>Meta</th><th>Status</th></tr></thead><tbody id="tb"></tbody></table></div></div>`;
  const draw = () => {
    const q = OF.q.toLowerCase();
    const l = App.db.orders.filter(o => (!q || [o.os, o.placa, o.modelo, App.client(o.clientId).nome, o.defeito].join(' ').toLowerCase().includes(q)) && (!OF.st || o.status === OF.st) && (!OF.mec || o.mecId === OF.mec)
      && (!OF.meta || (OF.meta === 'late' ? Ord.meta(o).late : OF.meta === 'ok' ? (!Ord.meta(o).late && o.status !== 'cancelado') : (o.status === 'finalizado' && !o.avisado)))).sort((a, b) => (b.entrada + (b.hora || '')).localeCompare(a.entrada + (a.hora || '')));
    $('#tb').innerHTML = l.map(o => { const m = Ord.meta(o), dec = Ord.decorridos(o), pr = +o.prazoDias || 1, pct = Math.min(100, dec / pr * 100);
      return `<tr class="clk" data-id="${o.id}"><td><b>${esc(o.os)}</b></td><td><b>${esc(App.client(o.clientId).nome || '—')}</b><small>${esc(App.client(o.clientId).tel || '')}</small></td>
      <td>${esc(o.modelo)}<small>${esc(o.cor || '')} ${esc(o.ano || '')} · ${esc(o.potencia || '')} · <b>${esc(o.placa)}</b></small></td><td style="max-width:200px">${esc((o.defeito || '').slice(0, 70))}</td>
      <td>${esc(App.mech(o.mecId).nome || '—')}</td><td>${PORTE[o.porte]}</td><td>${D.br(o.entrada)}</td><td>${D.br(Ord.prazoData(o))}</td>
      <td><div class="bar ${m.late ? 'late' : m.k === 'warn' ? 'warn' : ''}"><i style="width:${pct}%"></i></div><small>${o.status === 'cancelado' ? '—' : `Dia ${dec} de ${o.prazoDias} · ${Ord.restantes(o) >= 0 ? `faltam ${Ord.restantes(o)}` : `passou ${-Ord.restantes(o)}`}`}</small></td>
      <td>${m.txt === '—' ? '—' : `<span class="pill ${m.k}">${m.txt}</span>`}${m.late && !o.motivoAtraso ? '<small style="color:var(--bad)">sem motivo</small>' : ''}</td>
      <td><span class="pill ${o.status}">${STATUS[o.status]}</span>${o.status === 'finalizado' ? `<small>${o.avisado ? '✅ cliente avisado' : '⚠️ não avisado'}</small>` : ''}</td></tr>`; }).join('') || '<tr><td colspan="11" class="empty">Nenhuma ordem de serviço. Clique em “+ Agendar conserto”.</td></tr>';
  };
  draw();
  $('#q').oninput = e => { OF.q = e.target.value; draw(); };
  ['st', 'mec', 'meta'].forEach(k => $('#' + k).onchange = e => { OF[k] = e.target.value; draw(); });
  $('#tb').onclick = e => { const r = e.target.closest('tr[data-id]'); if (r) orderView(App.order(r.dataset.id)); };
  $('#novo').onclick = () => orderForm({ entrada: D.today() });
  $('#xo').onclick = async () => {
    const h = ['OS', 'Cliente', 'Telefone', 'Endereço', 'Modelo', 'Cor', 'Ano', 'Potência do motor', 'Placa', 'Defeito', 'Mecânico', 'Porte', 'Entrada', 'Hora', 'Prazo (dias)', 'Previsão de entrega', 'Dias decorridos', 'Dias restantes', 'Meta', 'Dias de atraso', 'Motivo do atraso', 'Status', 'Data finalizado', 'Data entregue/retirada', 'Cliente avisado', 'Data do aviso'];
    const r = App.db.orders.map(o => { const c = App.client(o.clientId), m = Ord.meta(o); return [o.os, c.nome, c.tel, c.endereco, o.modelo, o.cor, o.ano, o.potencia, o.placa, o.defeito, App.mech(o.mecId).nome, PORTE[o.porte], D.br(o.entrada), o.hora, o.prazoDias, D.br(Ord.prazoData(o)), Ord.decorridos(o), Ord.restantes(o), m.txt, m.dias, o.motivoAtraso, STATUS[o.status], D.br(o.dataFinal), D.br(o.dataEntrega), o.status === 'finalizado' || o.status === 'entregue' ? (o.avisado ? 'Sim' : 'Não') : '', D.br(o.dataAviso)]; });
    if (await api.saveText({ text: csv([h, ...r]), name: `ordens-de-servico-${D.today()}.csv` })) toast('Tabela exportada');
  };
  $('#xm').onclick = async () => {
    const r = []; App.db.orders.forEach(o => (o.msgs || []).forEach(m => r.push([o.os, o.placa, App.client(o.clientId).nome, fdt(m.at), m.dir === 'out' ? 'Enviada' : 'Resposta do cliente', m.tipo, m.text])));
    if (await api.saveText({ text: csv([['OS', 'Placa', 'Cliente', 'Data/hora', 'Tipo', 'Assunto', 'Mensagem'], ...r]), name: `mensagens-${D.today()}.csv` })) toast('Mensagens exportadas');
  };
};

// ----- Formulário (agendar / editar) -----
function orderForm(o) {
  const db = App.db, isNew = !o.id, S = db.settings;
  if (!db.mechanics.length) { toast('Cadastre ao menos um mecânico primeiro'); return App.go('mechanics'); }
  const cl = `<option value="__new">➕ Novo cliente…</option>` + db.clients.map(c => `<option value="${c.id}" ${c.id === o.clientId ? 'selected' : ''}>${esc(c.nome)} — ${esc(c.tel || '')}</option>`).join('');
  const mc = db.mechanics.map(m => `<option value="${m.id}" ${m.id === o.mecId ? 'selected' : ''}>${esc(m.nome)}</option>`).join('');
  const porte = o.porte || 'pequeno', prazo = o.prazoDias ?? (porte === 'grande' ? S.prazoGrande : S.prazoPequeno);
  const m = modal(isNew ? 'Agendar conserto' : `Editar OS ${esc(o.os)}`, `<div class="f">
    <div class="sec">Cliente</div>
    <label>Cliente<select name="clientId">${cl}</select></label>
    <div id="newc" class="f" style="display:none"><div class="r"><label>Nome<input name="cnome"></label><label>Telefone / WhatsApp<input name="ctel" placeholder="(11) 99999-9999"></label></div><label>Endereço<input name="cend"></label></div>
    <div id="cinfo" class="hint"></div>
    <div class="sec">Veículo</div>
    <div class="r3"><label>Modelo<input name="modelo" required value="${esc(o.modelo)}" placeholder="Ex.: Gol 1.0"></label><label>Cor<input name="cor" value="${esc(o.cor)}"></label><label>Ano<input name="ano" value="${esc(o.ano)}" maxlength="9"></label></div>
    <div class="r"><label>Potência do motor<input name="potencia" value="${esc(o.potencia)}" placeholder="Ex.: 1.0 / 75 cv"></label><label>Placa<input name="placa" required value="${esc(o.placa)}" style="text-transform:uppercase" maxlength="8"></label></div>
    <label>Descrição do defeito<textarea name="defeito" rows="3" required>${esc(o.defeito)}</textarea></label>
    <div class="sec">Serviço</div>
    <div class="r3"><label>Nº da ordem de serviço<input name="os" required value="${esc(o.os || Ord.nextOs())}"></label><label>Mecânico<select name="mecId" required>${mc}</select></label>
    <label>Tamanho do serviço<select name="porte"><option value="pequeno" ${porte === 'pequeno' ? 'selected' : ''}>Pequeno</option><option value="grande" ${porte === 'grande' ? 'selected' : ''}>Grande</option></select></label></div>
    <div class="r3"><label>Data de entrada<input type="date" name="entrada" required value="${o.entrada || D.today()}"></label><label>Hora<input type="time" name="hora" required value="${o.hora || '08:00'}"></label>
    <label>Previsão de entrega (dias)<input type="number" name="prazoDias" min="1" required value="${prazo}"></label></div>
    <div id="prev" class="hint"></div>
    ${isNew ? '<label class="chk"><input type="checkbox" name="zap" checked> Enviar confirmação por WhatsApp ao salvar (usa o telefone do cliente)</label>' : ''}</div>`, async v => {
    const O = { os: v.os.trim(), modelo: v.modelo.trim(), cor: v.cor.trim(), ano: v.ano.trim(), potencia: v.potencia.trim(), placa: v.placa.trim().toUpperCase(), defeito: v.defeito.trim(), mecId: v.mecId, porte: v.porte, entrada: v.entrada, hora: v.hora, prazoDias: Math.max(1, +v.prazoDias || 1) };
    if (db.orders.some(x => x !== o && x.os === O.os)) { toast('Já existe uma OS com este número'); return false; }
    let cid = v.clientId;
    if (cid === '__new') { if (!v.cnome.trim()) { toast('Informe o nome do cliente'); return false; } cid = uid(); db.clients.push({ id: cid, nome: v.cnome.trim(), tel: v.ctel.trim(), endereco: v.cend.trim(), email: '', obs: '' }); }
    O.clientId = cid; let ord = o;
    if (isNew) { ord = { id: uid(), status: 'agendado', avisado: false, msgs: [], ...O }; db.orders.push(ord); } else Object.assign(o, O);
    await App.save(); App.render(); toast('Ordem de serviço salva');
    if (isNew && v.zap) { if (!(await Msg.send(ord, Msg.fill(S.msgAgendado, ord), 'agendamento'))) return; App.render(); }
  }, 'Salvar', '', 'wide');
  const f = m.form, upd = () => {
    const sel = f.clientId.value; $('#newc').style.display = sel === '__new' ? 'grid' : 'none';
    const c = App.client(sel); $('#cinfo').textContent = sel === '__new' ? '' : `📱 ${c.tel || 'sem telefone'}  ·  📍 ${c.endereco || 'sem endereço'}`;
    const e = f.entrada.value, p = +f.prazoDias.value; $('#prev').textContent = e && p ? `Previsão de entrega: ${D.br(D.add(e, p))}` : '';
  };
  f.clientId.onchange = upd; f.entrada.onchange = upd; f.prazoDias.oninput = upd;
  f.porte.onchange = () => { f.prazoDias.value = f.porte.value === 'grande' ? S.prazoGrande : S.prazoPequeno; upd(); };
  upd();
}

// ----- Detalhes da OS, fluxo e mensagens -----
function orderView(o) {
  if (!o) return;
  const c = App.client(o.clientId), mt = Ord.meta(o), dec = Ord.decorridos(o), pr = +o.prazoDias || 1, S = App.db.settings;
  const msgs = (o.msgs || []).map(x => `<div class="bub ${x.dir}">${esc(x.text)}<small>${x.dir === 'out' ? 'Enviada' : 'Resposta do cliente'} · ${fdt(x.at)}</small></div>`).join('') || '<p class="sub">Nenhuma mensagem registrada.</p>';
  const flow = { agendado: '<button type="button" class="btn pri" data-a="start">▶ Iniciar conserto</button>', andamento: '<button type="button" class="btn pri" data-a="fin">✅ Finalizar serviço</button>', finalizado: '<button type="button" class="btn pri" data-a="ent">🔑 Entregar ao cliente</button>', entregue: '', cancelado: '' }[o.status];
  const m = modal(`OS ${esc(o.os)} — ${esc(o.placa)}`, `<div class="grid-d">
    <div><div class="sec">Cliente</div><div class="kv"><span>Nome</span><b>${esc(c.nome || '—')}</b><span>Telefone</span>${esc(c.tel || '—')}<span>Endereço</span>${esc(c.endereco || '—')}</div>
    <div class="sec" style="margin-top:12px">Veículo</div><div class="kv"><span>Modelo</span>${esc(o.modelo)}<span>Cor / Ano</span>${esc(o.cor)} ${esc(o.ano)}<span>Motor</span>${esc(o.potencia || '—')}<span>Placa</span><b>${esc(o.placa)}</b></div></div>
    <div><div class="sec">Serviço</div><div class="kv"><span>Defeito</span>${esc(o.defeito)}<span>Mecânico</span>${esc(App.mech(o.mecId).nome || '—')}<span>Tamanho</span>${PORTE[o.porte]}<span>Entrada</span>${D.br(o.entrada)} ${esc(o.hora || '')}<span>Previsão</span><b>${D.br(Ord.prazoData(o))}</b> (${o.prazoDias} dia(s))<span>Status</span><span class="pill ${o.status}" style="color:inherit">${STATUS[o.status]}</span>
    ${o.dataFinal ? `<span>Finalizado</span>${D.br(o.dataFinal)}` : ''}${o.dataEntrega ? `<span>Retirado em</span>${D.br(o.dataEntrega)}` : ''}${o.status === 'finalizado' || o.status === 'entregue' ? `<span>Cliente avisado</span><b>${o.avisado ? 'Sim' + (o.dataAviso ? ' (' + D.br(o.dataAviso) + ')' : '') : 'Não'}</b>` : ''}</div></div></div>
    <div class="sec" style="margin-top:14px">Prazo e meta</div>
    <div class="info"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><b>Dia ${dec} de ${o.prazoDias} · ${Ord.restantes(o) >= 0 ? `faltam ${Ord.restantes(o)} dia(s) para a meta` : `passou ${-Ord.restantes(o)} dia(s) da meta`}</b>${mt.txt === '—' ? '' : `<span class="pill ${mt.k}">${mt.txt}</span>`}</div>
    <div class="bar ${mt.late ? 'late' : mt.k === 'warn' ? 'warn' : ''}" style="margin-top:8px"><i style="width:${Math.min(100, dec / pr * 100)}%"></i></div></div>
    ${mt.late || o.motivoAtraso ? `<label style="display:grid;gap:4px;font-size:12.5px;color:var(--mute)">Motivo do atraso ${mt.late && !o.motivoAtraso ? '<b style="color:var(--bad)">(obrigatório informar)</b>' : ''}<textarea name="motivo" rows="2">${esc(o.motivoAtraso)}</textarea></label>` : ''}
    <div class="sec" style="margin-top:14px">WhatsApp — mensagens desta OS</div><div class="chat">${msgs}</div>
    <div class="mf" style="justify-content:flex-start;margin:0 0 8px"><button type="button" class="btn wa" data-a="zap">💬 Enviar WhatsApp</button><button type="button" class="btn" data-a="resp">📥 Registrar resposta do cliente</button></div>`, null, '',
    `<button type="button" class="btn bad" data-a="del">Excluir</button><button type="button" class="btn" data-a="edit">Editar</button>${o.status !== 'entregue' && o.status !== 'cancelado' ? '<button type="button" class="btn" data-a="cancel">Cancelar OS</button>' : ''}${(mt.late || o.motivoAtraso) ? '<button type="button" class="btn" data-a="motivo">Salvar motivo</button>' : ''}${flow}`, 'wide');
  const done = msg => { m.close(); App.render(); toast(msg); };
  m.form.onclick = async e => { const b = e.target.closest('[data-a]'); if (!b) return; const k = b.dataset.a;
    if (k === 'edit') { m.close(); orderForm(o); }
    if (k === 'motivo') { o.motivoAtraso = m.form.motivo.value.trim(); await App.save(); done('Motivo salvo'); }
    if (k === 'start') { o.status = 'andamento'; await App.save(); done('Conserto iniciado'); }
    if (k === 'fin') { m.close(); finalizar(o); }
    if (k === 'ent') { m.close(); entregar(o); }
    if (k === 'cancel') { m.close(); confirmBox('Cancelar esta OS?', async () => { o.status = 'cancelado'; await App.save(); App.render(); }); }
    if (k === 'del') { m.close(); confirmBox('Excluir esta OS e suas mensagens?', async () => { App.db.orders = App.db.orders.filter(x => x !== o); await App.save(); App.render(); toast('Excluída'); }); }
    if (k === 'zap') { m.close(); zapDialog(o); }
    if (k === 'resp') { m.close(); modal('Registrar resposta do cliente', `<div class="f"><label>O que o cliente respondeu?<textarea name="t" rows="4" required></textarea></label></div><p class="hint">Cole aqui a resposta recebida no WhatsApp para ficar guardada na OS.</p>`, async v => { await Msg.reply(o, v.t.trim()); App.render(); setTimeout(() => orderView(o), 0); }, 'Registrar'); }
  };
}
function zapDialog(o) {
  const S = App.db.settings, T = { agendamento: ['Confirmação de entrada', S.msgAgendado], pronto: ['Veículo pronto para retirada', S.msgPronto], atraso: ['Aviso de atraso', S.msgAtraso], livre: ['Mensagem livre', ''] };
  const m = modal('Enviar WhatsApp', `<div class="f"><label>Modelo de mensagem<select name="tipo">${Object.entries(T).map(([k, v]) => `<option value="${k}" ${k === (o.status === 'finalizado' ? 'pronto' : 'agendamento') ? 'selected' : ''}>${v[0]}</option>`).join('')}</select></label>
    <label>Mensagem<textarea name="t" rows="8"></textarea></label></div><p class="hint">Enviamos para o telefone do cliente cadastrado — sem digitar o número. A mensagem fica registrada na OS.</p>`, async v => {
    if (!v.t.trim()) { toast('Escreva a mensagem'); return false; }
    if (!(await Msg.send(o, v.t, v.tipo))) return false; App.render(); setTimeout(() => orderView(o), 0); }, 'Abrir WhatsApp e registrar');
  const set = () => { m.form.t.value = Msg.fill(T[m.form.tipo.value][1], o); }; m.form.tipo.onchange = set; set();
}
function finalizar(o) {
  const late = Ord.restantes({ ...o, status: 'finalizado', dataFinal: D.today() }) < 0;
  const m = modal(`Finalizar serviço — OS ${esc(o.os)}`, `<div class="f"><label>Data de conclusão<input type="date" name="d" required value="${D.today()}"></label><div id="lt"></div>
    <label class="chk"><input type="checkbox" name="zap" checked> Avisar o cliente por WhatsApp que o veículo está pronto</label></div>`, async v => {
    const dd = v.d, atraso = D.diff(o.entrada, dd) > (+o.prazoDias || 0);
    if (atraso && !(v.motivo || '').trim() && !o.motivoAtraso) { toast('Informe o motivo do atraso'); return false; }
    o.status = 'finalizado'; o.dataFinal = dd; if (atraso && v.motivo) o.motivoAtraso = v.motivo.trim(); await App.save();
    if (v.zap) await Msg.send(o, Msg.fill(App.db.settings.msgPronto, o), 'pronto');
    App.render(); toast('Serviço finalizado'); }, 'Finalizar');
  const f = m.form, chk = () => { const at = D.diff(o.entrada, f.d.value) > (+o.prazoDias || 0), box = $('#lt');
    box.innerHTML = at ? `<div class="warn">⚠️ Passou ${D.diff(o.entrada, f.d.value) - o.prazoDias} dia(s) da meta. Informe o motivo do atraso.</div><label style="display:grid;gap:4px;font-size:12.5px;color:var(--mute);margin-top:8px">Motivo do atraso<textarea name="motivo" rows="2" required>${esc(o.motivoAtraso)}</textarea></label>` : ''; };
  f.d.onchange = chk; chk();
}
function entregar(o) {
  modal(`Entregar ao cliente — OS ${esc(o.os)}`, `<div class="f"><label>Data em que o cliente retirou o veículo<input type="date" name="d" required value="${D.today()}"></label>
    <label>O cliente foi avisado para buscar?<select name="av"><option value="sim" ${o.avisado ? 'selected' : ''}>Sim</option><option value="nao" ${o.avisado ? '' : 'selected'}>Não</option></select></label></div>`, async v => {
    o.status = 'entregue'; o.dataEntrega = v.d; o.avisado = v.av === 'sim'; if (o.avisado && !o.dataAviso) o.dataAviso = D.today(); await App.save(); App.render(); toast('Veículo entregue ao cliente'); }, 'Confirmar entrega');
}
