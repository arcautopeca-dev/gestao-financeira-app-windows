// Clientes e Serviços
function crud(cfg) {
  return root => {
    let q = '';
    const draw = () => {
      const l = App.db[cfg.key].filter(x => !q || JSON.stringify(x).toLowerCase().includes(q.toLowerCase())).sort((a, b) => a.nome.localeCompare(b.nome));
      $('#tb').innerHTML = l.map(x => `<tr>${cfg.row(x)}<td class="act">${cfg.extra ? cfg.extra(x) : ''}<button class="btn sm" data-e="${x.id}">Editar</button> <button class="btn sm bad" data-d="${x.id}">Excluir</button></td></tr>`).join('') || `<tr><td colspan="9" class="empty">Nenhum registro.</td></tr>`;
    };
    root.innerHTML = `<div class="head"><div><h1 class="t">${cfg.title}</h1><p class="sub">${cfg.sub}</p></div><button class="btn pri" id="add">+ ${cfg.add}</button></div>
    <div class="tools"><input type="search" id="q" placeholder="🔍 Buscar…"></div>
    <div class="card" style="padding:6px"><table><thead><tr>${cfg.head.map(h => `<th>${h}</th>`).join('')}<th></th></tr></thead><tbody id="tb"></tbody></table></div>`;
    draw();
    $('#q').oninput = e => { q = e.target.value; draw(); };
    const form = x => {
      const isNew = !x; x = x || {};
      modal(isNew ? cfg.add : 'Editar', `<div class="f">${cfg.form(x)}</div>`, async v => {
        const o = cfg.read(v); if (isNew) App.db[cfg.key].push({ id: uid(), ...o }); else Object.assign(x, o);
        await App.save(); App.render(); toast('Salvo');
      });
    };
    $('#add').onclick = () => form();
    $('#tb').onclick = e => { const b = e.target.closest('button'); if (!b) return; const L = App.db[cfg.key];
      if (b.dataset.e) form(L.find(i => i.id === b.dataset.e));
      if (b.dataset.d) { const x = L.find(i => i.id === b.dataset.d); const used = App.db.appts.some(a => a[cfg.fk] === x.id);
        confirmBox(used ? `“${esc(x.nome)}” tem agendamentos. Excluir também apaga esses agendamentos. Continuar?` : `Excluir “${esc(x.nome)}”?`, async () => { App.db[cfg.key] = L.filter(i => i !== x); App.db.appts = App.db.appts.filter(a => a[cfg.fk] !== x.id); await App.save(); App.render(); }); }
      if (b.dataset.n) apptForm({ clientId: b.dataset.n, data: D.today() });
      if (b.dataset.w) { const c = App.client(b.dataset.w); const n = Msg.phone(c.tel); if (!n) return toast('Sem telefone'); api.openExternal(`https://wa.me/${n}`); } };
  };
}
App.views.clients = crud({
  key: 'clients', fk: 'clientId', title: 'Clientes', sub: 'Quem você atende.', add: 'Novo cliente', head: ['Nome', 'Telefone / WhatsApp', 'E-mail', 'Atendimentos'],
  row: c => `<td><b>${esc(c.nome)}</b>${c.obs ? `<br><small style="color:var(--mute)">${esc(c.obs)}</small>` : ''}</td><td>${esc(c.tel || '—')}</td><td>${esc(c.email || '—')}</td><td>${App.db.appts.filter(a => a.clientId === c.id).length}</td>`,
  extra: c => `<button class="btn sm pri" data-n="${c.id}">Agendar</button> ${c.tel ? `<button class="btn sm wa" data-w="${c.id}">WhatsApp</button> ` : ''}`,
  form: c => `<label>Nome<input name="nome" required value="${esc(c.nome)}"></label><div class="r"><label>Telefone / WhatsApp<input name="tel" placeholder="(11) 99999-9999" value="${esc(c.tel)}"></label><label>E-mail<input type="email" name="email" value="${esc(c.email)}"></label></div><label>Observações<textarea name="obs" rows="2">${esc(c.obs)}</textarea></label>`,
  read: v => ({ nome: v.nome.trim(), tel: v.tel.trim(), email: v.email.trim(), obs: v.obs.trim() })
});
App.views.services = crud({
  key: 'services', fk: 'serviceId', title: 'Serviços', sub: 'O que você oferece, com duração e valor.', add: 'Novo serviço', head: ['Serviço', 'Duração', 'Preço'],
  row: s => `<td><span class="dot" style="background:${s.cor}"></span><b>${esc(s.nome)}</b></td><td>${s.duracao} min</td><td>${brl(s.preco)}</td>`,
  form: s => `<label>Nome<input name="nome" required value="${esc(s.nome)}"></label><div class="r"><label>Duração (min)<input type="number" name="duracao" min="5" step="5" value="${s.duracao || 60}"></label><label>Preço (R$)<input type="number" name="preco" min="0" step="0.01" value="${s.preco || 0}"></label></div><label>Cor na agenda<input type="color" name="cor" value="${s.cor || '#6343ee'}" style="padding:2px;height:40px"></label>`,
  read: v => ({ nome: v.nome.trim(), duracao: +v.duracao || 60, preco: +v.preco || 0, cor: v.cor })
});
