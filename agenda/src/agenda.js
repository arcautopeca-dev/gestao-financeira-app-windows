const AG = { mode: 'week', date: D.today() };
const STATUS = { agendado: 'Agendado', confirmado: 'Confirmado', concluido: 'Concluído', cancelado: 'Cancelado' };
const HH = 58; // altura de 1 hora em px

App.views.agenda = root => {
  const S = App.db.settings, t = D.today();
  const days = AG.mode === 'day' ? [AG.date] : Array.from({ length: 7 }, (_, i) => D.add(D.monday(AG.date), i));
  const title = AG.mode === 'day' ? D.long(AG.date) : `${D.br(days[0]).slice(0, 5)} – ${D.br(days[6]).slice(0, 5)} · ${D.mon[D.parse(days[0]).getMonth()]} ${D.parse(days[0]).getFullYear()}`;
  const todays = App.db.appts.filter(a => a.data === t && a.status !== 'cancelado').sort((a, b) => a.hora.localeCompare(b.hora));
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  root.innerHTML = `
  <div class="head"><div><h1 class="t">Agenda</h1><p class="sub">${title}</p></div>
    <div class="tools" style="margin:0"><div class="seg"><button data-m="day" class="${AG.mode === 'day' ? 'on' : ''}">Dia</button><button data-m="week" class="${AG.mode === 'week' ? 'on' : ''}">Semana</button><button data-m="list" class="${AG.mode === 'list' ? 'on' : ''}">Lista</button></div>
    <button class="btn" id="prev">‹</button><button class="btn" id="hoje">Hoje</button><button class="btn" id="next">›</button>
    <button class="btn pri" id="novo">+ Novo agendamento</button></div></div>
  <div class="layout"><div class="card cal" id="calbox"></div>
  <div class="stats">
    <div class="card"><div class="stat"><span class="n">${todays.length}</span><div><b>Atendimentos hoje</b><small>${todays.filter(a => a.status === 'confirmado').length} confirmado(s)</small></div></div></div>
    <div class="card"><b>Hoje</b>${todays.map(a => { const c = App.client(a.clientId), s = App.service(a.serviceId); return `<div class="mini" data-id="${a.id}"><span class="h">${a.hora}</span><div><b>${esc(c?.nome || '—')}</b><small>${esc(s?.nome || '')}</small></div></div>`; }).join('') || '<p class="sub">Nada marcado para hoje.</p>'}</div>
  </div></div>`;
  const box = $('#calbox');
  if (AG.mode === 'list') list(box); else grid(box, days, t, nowMin);
  $('#prev').onclick = () => { AG.date = D.add(AG.date, AG.mode === 'day' ? -1 : -7); App.render(); };
  $('#next').onclick = () => { AG.date = D.add(AG.date, AG.mode === 'day' ? 1 : 7); App.render(); };
  $('#hoje').onclick = () => { AG.date = D.today(); App.render(); };
  $('#novo').onclick = () => apptForm({ data: AG.date });
  root.querySelectorAll('.seg button').forEach(b => b.onclick = () => { AG.mode = b.dataset.m; App.render(); });
  root.querySelectorAll('.mini').forEach(m => m.onclick = () => apptView(App.db.appts.find(a => a.id === m.dataset.id)));
};

function grid(box, days, t, nowMin) {
  const S = App.db.settings, sh = S.startHour, eh = S.endHour, H = (eh - sh) * HH;
  box.innerHTML = `<div class="cal-grid" style="grid-template-columns:54px repeat(${days.length},1fr)">
    <div class="cal-h"></div>${days.map(d => `<div class="cal-h ${d === t ? 'today' : ''}"><small>${D.dow[D.parse(d).getDay()].slice(0, 3)}</small><span>${D.parse(d).getDate()}</span></div>`).join('')}
    <div>${Array.from({ length: eh - sh }, (_, i) => `<div class="cal-t" style="height:${HH}px">${String(sh + i).padStart(2, '0')}:00</div>`).join('')}</div>
    ${days.map(d => `<div class="cal-c" data-d="${d}" style="height:${H}px">${Array.from({ length: eh - sh }, (_, i) => `<div class="ln" style="top:${i * HH}px"></div>`).join('')}${d === t && nowMin >= sh * 60 && nowMin <= eh * 60 ? `<div class="nowl" style="top:${(nowMin - sh * 60) / 60 * HH}px"></div>` : ''}${events(d, sh)}</div>`).join('')}</div>`;
  box.querySelectorAll('.cal-c').forEach(c => c.onclick = e => {
    const ev = e.target.closest('.ev'); if (ev) return apptView(App.db.appts.find(a => a.id === ev.dataset.id));
    const y = e.clientY - c.getBoundingClientRect().top, m = Math.floor((y / HH * 60 + sh * 60) / 30) * 30;
    apptForm({ data: c.dataset.d, hora: D.hm(m) });
  });
  const first = Math.max(0, (Math.min(nowMin / 60, eh - 3) - sh - 1)) * HH; box.scrollTop = first;
}
function events(d, sh) {
  const l = App.db.appts.filter(a => a.data === d).sort((a, b) => a.hora.localeCompare(b.hora));
  const lanes = []; const place = l.map(a => { const s = D.mins(a.hora), e = s + (+a.duracao || 60); let i = lanes.findIndex(x => x <= s); if (i < 0) { i = lanes.length; lanes.push(0); } lanes[i] = e; return { a, s, e, i }; });
  const n = Math.max(1, lanes.length);
  return place.map(({ a, s, e, i }) => { const sv = App.service(a.serviceId), c = App.client(a.clientId);
    return `<div class="ev ${a.status}" data-id="${a.id}" style="top:${(s - sh * 60) / 60 * HH}px;height:${Math.max(26, (e - s) / 60 * HH - 2)}px;left:calc(${i * 100 / n}% + 3px);width:calc(${100 / n}% - 6px);background:${sv?.cor || '#6343ee'}"><b>${a.hora} ${esc(c?.nome || '—')}</b>${esc(sv?.nome || '')}</div>`; }).join('');
}
function list(box) {
  const l = App.db.appts.filter(a => a.data >= D.today()).sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
  box.innerHTML = `<table><thead><tr><th>Data</th><th>Hora</th><th>Cliente</th><th>Serviço</th><th>Status</th><th></th></tr></thead><tbody>${l.map(a => `<tr><td>${D.br(a.data)}</td><td>${a.hora}</td><td><b>${esc(App.client(a.clientId)?.nome || '—')}</b></td><td><span class="dot" style="background:${App.service(a.serviceId)?.cor}"></span>${esc(App.service(a.serviceId)?.nome || '')}</td><td><span class="pill ${a.status}">${STATUS[a.status]}</span></td><td class="act"><button class="btn sm wa" data-w="${a.id}">WhatsApp</button> <button class="btn sm em" data-e="${a.id}">E-mail</button> <button class="btn sm" data-o="${a.id}">Abrir</button></td></tr>`).join('') || '<tr><td colspan="6" class="empty">Nenhum agendamento futuro.</td></tr>'}</tbody></table>`;
  const get = id => App.db.appts.find(a => a.id === id);
  box.onclick = e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.w) Msg.whats(get(b.dataset.w)); if (b.dataset.e) Msg.email(get(b.dataset.e)); if (b.dataset.o) apptView(get(b.dataset.o)); };
}

function apptView(a) {
  if (!a) return; const c = App.client(a.clientId) || {}, s = App.service(a.serviceId) || {};
  const m = modal('Agendamento', `<div class="info"><b>${esc(c.nome || '—')}</b><small>${D.long(a.data)} · ${a.hora} às ${D.hm(D.mins(a.hora) + (+a.duracao || 60))}</small></div>
    <div class="info"><b>${esc(s.nome || '')} ${s.preco ? '· ' + brl(s.preco) : ''}</b><small>Status: <span class="pill ${a.status}">${STATUS[a.status]}</span></small>${a.obs ? `<small>${esc(a.obs)}</small>` : ''}</div>
    <div class="info"><small>📱 ${esc(c.tel || 'sem telefone')} &nbsp; ✉️ ${esc(c.email || 'sem e-mail')}</small></div>
    <div class="mf" style="justify-content:flex-start;margin-top:0"><button type="button" class="btn wa" data-a="w">WhatsApp</button><button type="button" class="btn em" data-a="e">E-mail</button><button type="button" class="btn" data-a="m">Editar mensagem…</button></div>`, null, '',
    `<button type="button" class="btn bad" data-a="d">Excluir</button><button type="button" class="btn" data-a="c">Cancelar atend.</button><button type="button" class="btn" data-a="ed">Editar</button>${a.status === 'agendado' ? '<button type="button" class="btn" data-a="cf">Confirmar</button>' : ''}${a.status !== 'concluido' ? '<button type="button" class="btn pri" data-a="ok">Concluir</button>' : ''}`);
  const set = async st => { a.status = st; await App.save(); m.close(); App.render(); toast('Status: ' + STATUS[st]); };
  m.form.onclick = e => { const b = e.target.closest('[data-a]'); if (!b) return; const k = b.dataset.a;
    if (k === 'w') Msg.whats(a); if (k === 'e') Msg.email(a); if (k === 'm') { m.close(); msgEditor(a); }
    if (k === 'cf') set('confirmado'); if (k === 'ok') set('concluido'); if (k === 'c') set('cancelado');
    if (k === 'ed') { m.close(); apptForm(a); }
    if (k === 'd') { m.close(); confirmBox('Excluir este agendamento?', async () => { App.db.appts = App.db.appts.filter(x => x !== a); await App.save(); App.render(); toast('Excluído'); }); } };
}
function msgEditor(a) {
  const S = App.db.settings, c = App.client(a.clientId) || {};
  modal('Enviar mensagem', `<div class="f"><label>Mensagem (WhatsApp)<textarea name="w" rows="6">${esc(Msg.fill(S.msgWhats, a))}</textarea></label>
   <label>Assunto (e-mail)<input name="s" value="${esc(Msg.fill(S.assuntoEmail, a))}"></label><label>Mensagem (e-mail)<textarea name="b" rows="6">${esc(Msg.fill(S.msgEmail, a))}</textarea></label></div>
   <p class="hint">Ao clicar, abrimos o WhatsApp/seu programa de e-mail já com o texto pronto — você só aperta enviar.</p>`, null, '',
    `<button type="button" class="btn wa" id="sw">Enviar WhatsApp</button><button type="button" class="btn em" id="se">Enviar e-mail</button>`);
  $('#sw').onclick = () => Msg.whats(a, $('[name=w]').value); $('#se').onclick = () => Msg.email(a, $('[name=s]').value, $('[name=b]').value);
}

function apptForm(a) {
  const db = App.db, isNew = !a.id;
  if (!db.clients.length) { toast('Cadastre um cliente primeiro'); return App.go('clients'); }
  const cl = db.clients.map(c => `<option value="${c.id}" ${c.id === a.clientId ? 'selected' : ''}>${esc(c.nome)}</option>`).join('');
  const sv = db.services.map(s => `<option value="${s.id}" data-d="${s.duracao}" ${s.id === a.serviceId ? 'selected' : ''}>${esc(s.nome)} (${s.duracao} min)</option>`).join('');
  const m = modal(isNew ? 'Novo agendamento' : 'Editar agendamento', `<div class="f">
    <label>Cliente<select name="clientId" required>${cl}</select></label>
    <label>Serviço<select name="serviceId" required>${sv}</select></label>
    <div class="r"><label>Data<input type="date" name="data" required value="${a.data || D.today()}"></label><label>Hora<input type="time" name="hora" required value="${a.hora || '09:00'}" step="300"></label></div>
    <div class="r"><label>Duração (min)<input type="number" name="duracao" min="5" step="5" value="${a.duracao || db.services[0]?.duracao || 60}"></label>
    <label>Status<select name="status">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${(a.status || 'agendado') === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label></div>
    <label>Observações<textarea name="obs" rows="2">${esc(a.obs || '')}</textarea></label><div id="conf"></div></div>`, async v => {
    const o = { clientId: v.clientId, serviceId: v.serviceId, data: v.data, hora: v.hora, duracao: +v.duracao || 60, status: v.status, obs: v.obs };
    if (isNew) db.appts.push({ id: uid(), ...o }); else Object.assign(a, o);
    await App.save(); AG.date = o.data; App.render(); toast('Agendamento salvo');
  });
  const f = m.form, check = () => { const d = f.data.value, h = f.hora.value, du = +f.duracao.value || 60; if (!d || !h) return;
    const s = D.mins(h), e = s + du, x = db.appts.find(o => o.id !== a.id && o.data === d && o.status !== 'cancelado' && D.mins(o.hora) < e && s < D.mins(o.hora) + (+o.duracao || 60));
    $('#conf').innerHTML = x ? `<div class="warn">⚠️ Conflito com ${esc(App.client(x.clientId)?.nome || '')} às ${x.hora}. Você ainda pode salvar.</div>` : ''; };
  f.serviceId.onchange = () => { f.duracao.value = f.serviceId.selectedOptions[0].dataset.d; check(); };
  ['data', 'hora', 'duracao'].forEach(n => f[n].onchange = check); check();
}
