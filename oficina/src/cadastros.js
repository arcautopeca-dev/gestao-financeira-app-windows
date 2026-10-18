// Clientes e Mecânicos
function crud(cfg) {
  return root => {
    let q = '';
    const draw = () => {
      const l = App.db[cfg.key].filter(x => !q || JSON.stringify(x).toLowerCase().includes(q.toLowerCase())).sort((a, b) => a.nome.localeCompare(b.nome));
      $('#tb').innerHTML = l.map(x => `<tr>${cfg.row(x)}<td class="act"><button class="btn sm" data-e="${x.id}">Editar</button> <button class="btn sm bad" data-d="${x.id}">Excluir</button></td></tr>`).join('') || `<tr><td colspan="9" class="empty">Nenhum registro.</td></tr>`;
    };
    root.innerHTML = `<div class="head"><div><h1 class="t">${cfg.title}</h1><p class="sub">${cfg.sub}</p></div><button class="btn pri" id="add">+ ${cfg.add}</button></div>
    <div class="tools"><input type="search" id="q" placeholder="🔍 Buscar…"></div>
    <div class="card" style="padding:6px"><table><thead><tr>${cfg.head.map(h => `<th>${h}</th>`).join('')}<th></th></tr></thead><tbody id="tb"></tbody></table></div>`;
    draw();
    $('#q').oninput = e => { q = e.target.value; draw(); };
    const form = x => { const isNew = !x; x = x || {};
      modal(isNew ? cfg.add : 'Editar', `<div class="f">${cfg.form(x)}</div>`, async v => { const o = cfg.read(v); if (isNew) App.db[cfg.key].push({ id: uid(), ...o }); else Object.assign(x, o); await App.save(); App.render(); toast('Salvo'); }); };
    $('#add').onclick = () => form();
    $('#tb').onclick = e => { const b = e.target.closest('button'); if (!b) return; const L = App.db[cfg.key];
      if (b.dataset.e) form(L.find(i => i.id === b.dataset.e));
      if (b.dataset.d) { const x = L.find(i => i.id === b.dataset.d);
        if (App.db.orders.some(o => o[cfg.fk] === x.id)) return toast(`“${x.nome}” possui ordens de serviço e não pode ser excluído(a).`);
        confirmBox(`Excluir “${esc(x.nome)}”?`, async () => { App.db[cfg.key] = L.filter(i => i !== x); await App.save(); App.render(); }); } };
  };
}
App.views.clients = crud({
  key: 'clients', fk: 'clientId', title: 'Clientes', sub: 'Nome, telefone (WhatsApp) e endereço de quem você atende.', add: 'Novo cliente', head: ['Nome', 'Telefone / WhatsApp', 'Endereço', 'OS'],
  row: c => `<td><b>${esc(c.nome)}</b></td><td>${esc(c.tel || '—')}</td><td>${esc(c.endereco || '—')}</td><td>${App.db.orders.filter(o => o.clientId === c.id).length}</td>`,
  form: c => `<label>Nome<input name="nome" required value="${esc(c.nome)}"></label><div class="r"><label>Telefone / WhatsApp<input name="tel" placeholder="(11) 99999-9999" value="${esc(c.tel)}"></label><label>E-mail (opcional)<input type="email" name="email" value="${esc(c.email)}"></label></div><label>Endereço<input name="endereco" value="${esc(c.endereco)}"></label>`,
  read: v => ({ nome: v.nome.trim(), tel: v.tel.trim(), email: v.email.trim(), endereco: v.endereco.trim(), obs: '' })
});
App.views.mechanics = crud({
  key: 'mechanics', fk: 'mecId', title: 'Mecânicos', sub: 'Cadastre quem executa os serviços. Eles aparecem ao agendar e no ranking.', add: 'Novo mecânico', head: ['Mecânico', 'Telefone', 'OS'],
  row: m => `<td><span class="dot" style="background:${m.cor}"></span><b>${esc(m.nome)}</b></td><td>${esc(m.tel || '—')}</td><td>${App.db.orders.filter(o => o.mecId === m.id).length}</td>`,
  form: m => `<label>Nome<input name="nome" required value="${esc(m.nome)}"></label><div class="r"><label>Telefone<input name="tel" value="${esc(m.tel)}"></label><label>Cor na agenda<input type="color" name="cor" value="${m.cor || '#6343ee'}" style="padding:2px;height:40px"></label></div>`,
  read: v => ({ nome: v.nome.trim(), tel: v.tel.trim(), cor: v.cor })
});
