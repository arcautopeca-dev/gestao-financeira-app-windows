// Agenda: calendário de entrada de veículos
const AG = { mode: 'week', date: D.today() };
const HH = 58;
App.views.agenda = root => {
  const S = App.db.settings, t = D.today();
  const days = AG.mode === 'day' ? [AG.date] : Array.from({ length: 7 }, (_, i) => D.add(D.monday(AG.date), i));
  const title = AG.mode === 'day' ? D.long(AG.date) : `${D.br(days[0]).slice(0, 5)} – ${D.br(days[6]).slice(0, 5)} · ${D.mon[D.parse(days[0]).getMonth()]} ${D.parse(days[0]).getFullYear()}`;
  const ativas = App.db.orders.filter(Ord.ativa);
  const hoje = ativas.filter(o => Ord.prazoData(o) === t), atras = ativas.filter(o => Ord.meta(o).late);
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const mini = o => `<div class="mini" data-id="${o.id}"><span class="h">${esc(o.placa || o.os)}</span><div><b>${esc(App.client(o.clientId).nome || '—')}</b><small>${esc(o.modelo || '')} · ${esc(App.mech(o.mecId).nome || '')}</small></div></div>`;
  root.innerHTML = `
  <div class="head"><div><h1 class="t">Agenda</h1><p class="sub">${title}</p></div>
    <div class="tools" style="margin:0"><div class="seg"><button data-m="day" class="${AG.mode === 'day' ? 'on' : ''}">Dia</button><button data-m="week" class="${AG.mode === 'week' ? 'on' : ''}">Semana</button></div>
    <button class="btn" id="prev">‹</button><button class="btn" id="hoje">Hoje</button><button class="btn" id="next">›</button>
    <button class="btn pri" id="novo">+ Agendar conserto</button></div></div>
  <div class="layout"><div class="card cal" id="calbox"></div>
  <div class="stats">
    <div class="card"><b>🚗 Entrega prevista hoje</b>${hoje.map(mini).join('') || '<p class="sub">Nenhuma.</p>'}</div>
    <div class="card"><b style="color:var(--bad)">⚠️ Atrasadas (${atras.length})</b>${atras.slice(0, 6).map(mini).join('') || '<p class="sub">Nenhuma atrasada 🎉</p>'}</div>
  </div></div>`;
  grid($('#calbox'), days, t, nowMin);
  $('#prev').onclick = () => { AG.date = D.add(AG.date, AG.mode === 'day' ? -1 : -7); App.render(); };
  $('#next').onclick = () => { AG.date = D.add(AG.date, AG.mode === 'day' ? 1 : 7); App.render(); };
  $('#hoje').onclick = () => { AG.date = D.today(); App.render(); };
  $('#novo').onclick = () => orderForm({ entrada: AG.date });
  root.querySelectorAll('.seg button').forEach(b => b.onclick = () => { AG.mode = b.dataset.m; App.render(); });
  root.querySelectorAll('.mini').forEach(m => m.onclick = () => orderView(App.order(m.dataset.id)));
};
function grid(box, days, t, nowMin) {
  const S = App.db.settings, sh = S.startHour, eh = S.endHour, H = (eh - sh) * HH;
  box.innerHTML = `<div class="cal-grid" style="grid-template-columns:54px repeat(${days.length},1fr)">
    <div class="cal-h"></div>${days.map(d => `<div class="cal-h ${d === t ? 'today' : ''}"><small>${D.dow[D.parse(d).getDay()].slice(0, 3)}</small><span>${D.parse(d).getDate()}</span></div>`).join('')}
    <div>${Array.from({ length: eh - sh }, (_, i) => `<div class="cal-t" style="height:${HH}px">${String(sh + i).padStart(2, '0')}:00</div>`).join('')}</div>
    ${days.map(d => `<div class="cal-c" data-d="${d}" style="height:${H}px">${Array.from({ length: eh - sh }, (_, i) => `<div class="ln" style="top:${i * HH}px"></div>`).join('')}${d === t && nowMin >= sh * 60 && nowMin <= eh * 60 ? `<div class="nowl" style="top:${(nowMin - sh * 60) / 60 * HH}px"></div>` : ''}${events(d, sh)}</div>`).join('')}</div>`;
  box.querySelectorAll('.cal-c').forEach(c => c.onclick = e => {
    const ev = e.target.closest('.ev'); if (ev) return orderView(App.order(ev.dataset.id));
    const y = e.clientY - c.getBoundingClientRect().top, m = Math.floor((y / HH * 60 + sh * 60) / 30) * 30;
    orderForm({ entrada: c.dataset.d, hora: D.hm(m) });
  });
  box.scrollTop = Math.max(0, (Math.min(nowMin / 60, eh - 3) - sh - 1)) * HH;
}
function events(d, sh) {
  const l = App.db.orders.filter(o => o.entrada === d && o.status !== 'cancelado').sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
  const lanes = []; const pl = l.map(o => { const s = D.mins(o.hora || '08:00'), e = s + 60; let i = lanes.findIndex(x => x <= s); if (i < 0) { i = lanes.length; lanes.push(0); } lanes[i] = e; return { o, s, i }; });
  const n = Math.max(1, lanes.length);
  return pl.map(({ o, s, i }) => `<div class="ev ${o.status === 'entregue' ? 'concluido' : ''}" data-id="${o.id}" style="top:${(s - sh * 60) / 60 * HH}px;height:${HH - 3}px;left:calc(${i * 100 / n}% + 3px);width:calc(${100 / n}% - 6px);background:${App.mech(o.mecId).cor || '#6343ee'}"><b>${o.hora || ''} ${esc(o.placa || '')}</b>${esc(App.client(o.clientId).nome || '')}</div>`).join('');
}
