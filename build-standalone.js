// Gera Gestao-Financeira.html (arquivo único, funciona offline no Edge/Chrome)
const fs = require('fs'), p = f => fs.readFileSync('src/' + f, 'utf8');
const shim = `
window.api={
 load:async()=>{try{return JSON.parse(localStorage.getItem('gestao-financeira-dados'))}catch(e){return null}},
 save:async d=>{localStorage.setItem('gestao-financeira-dados',JSON.stringify(d));return true},
 saveText:async({text,name})=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));a.download=name;a.click();return name},
 openText:()=>new Promise(r=>{const i=document.createElement('input');i.type='file';i.accept='.json';i.onchange=()=>i.files[0]?i.files[0].text().then(r):r(null);i.click()}),
 notify:async({title,body})=>{try{if(Notification.permission==='default')await Notification.requestPermission();if(Notification.permission==='granted')new Notification(title,{body})}catch(e){}},
 importXlsx:async()=>{alert('A importação da planilha só existe na versão instalável. Nesta versão, cadastre os lançamentos manualmente.');return null}
};`;
const js = ['app.js', 'modules/accounts.js', 'modules/dashboard.js', 'modules/payables.js', 'modules/receivables.js', 'modules/cashflow.js', 'modules/categories.js', 'modules/settings.js'].map(p).join('\n');
const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Gestão Financeira</title><style>${p('styles.css')}</style></head><body>
<aside id="sidebar"><div class="brand"><span class="logo">$</span><div><b>Gestão</b><small>Financeira</small></div></div><nav id="nav"></nav><div class="side-foot"><span id="saveState">Dados salvos</span></div></aside>
<main id="main"></main><div id="modalRoot"></div><div id="toast"></div><script>${shim}\n${js}\nApp.start();</script></body></html>`;
fs.writeFileSync('Gestao-Financeira.html', html);
