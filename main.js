const { app, BrowserWindow, ipcMain, dialog, Notification, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

const dataDir = () => app.getPath('userData');
const dataFile = () => path.join(dataDir(), 'dados.json');
const backupDir = () => path.join(dataDir(), 'backups');

function atomicWrite(file, text) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, text, 'utf8');
  fs.renameSync(tmp, file);
}

function dailyBackup() {
  try {
    if (!fs.existsSync(dataFile())) return;
    fs.mkdirSync(backupDir(), { recursive: true });
    const d = new Date().toISOString().slice(0, 10);
    const dest = path.join(backupDir(), `dados-${d}.json`);
    if (!fs.existsSync(dest)) fs.copyFileSync(dataFile(), dest);
    const files = fs.readdirSync(backupDir()).filter(f => f.startsWith('dados-')).sort();
    while (files.length > 15) fs.unlinkSync(path.join(backupDir(), files.shift()));
  } catch (e) { console.error(e); }
}

let win;
function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 820, minWidth: 1000, minHeight: 640,
    title: 'Gestão Financeira', backgroundColor: '#f4f6fa',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, 'src', 'index.html'));
}

app.whenReady().then(() => {
  dailyBackup();
  createWindow();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

ipcMain.handle('db:load', () => {
  try { return JSON.parse(fs.readFileSync(dataFile(), 'utf8')); } catch { return null; }
});
ipcMain.handle('db:save', (_e, data) => { atomicWrite(dataFile(), JSON.stringify(data, null, 1)); return true; });

ipcMain.handle('file:saveText', async (_e, { text, name, filters }) => {
  const r = await dialog.showSaveDialog(win, { defaultPath: name, filters });
  if (r.canceled) return false;
  fs.writeFileSync(r.filePath, text, 'utf8');
  return r.filePath;
});
ipcMain.handle('file:openText', async () => {
  const r = await dialog.showOpenDialog(win, { filters: [{ name: 'Backup JSON', extensions: ['json'] }], properties: ['openFile'] });
  if (r.canceled) return null;
  return fs.readFileSync(r.filePaths[0], 'utf8');
});

ipcMain.handle('notify', (_e, { title, body }) => {
  if (Notification.isSupported()) new Notification({ title, body }).show();
});

// ---------- Importação da planilha antiga (.xlsx/.xlsm) ----------
ipcMain.handle('import:xlsx', async () => {
  const r = await dialog.showOpenDialog(win, {
    title: 'Selecione a planilha de Contas a Pagar/Receber',
    filters: [{ name: 'Planilha Excel', extensions: ['xlsx', 'xlsm', 'xls'] }], properties: ['openFile']
  });
  if (r.canceled) return null;
  const XLSX = require('xlsx');
  const wb = XLSX.readFile(r.filePaths[0], { cellDates: true });
  const iso = v => {
    if (!v) return '';
    const d = v instanceof Date ? v : new Date(v);
    if (isNaN(d)) return '';
    // cellDates entrega meia-noite UTC-ish; usa partes locais ajustadas
    const dd = new Date(d.getTime() + 12 * 3600 * 1000);
    return dd.toISOString().slice(0, 10);
  };
  const rows = name => {
    const ws = wb.Sheets[name]; if (!ws) return [];
    return XLSX.utils.sheet_to_json(ws, { header: 1, range: 5, defval: '', raw: true });
  };
  const out = { payables: [], receivables: [], categories: { pagar: [], receber: [], formas: [] } };
  for (const r of rows('Contas a pagar').slice(1)) {
    if (!r[1] && !r[4]) continue;
    out.payables.push({ desc: String(r[1]).trim(), cat: String(r[2]).trim(), forma: String(r[3]).trim(), valor: Number(r[4]) || 0, data: iso(r[5]), pago: String(r[6]).toLowerCase().startsWith('pag') });
  }
  for (const r of rows('Contas a receber').slice(1)) {
    if (!r[1] && !r[4]) continue;
    out.receivables.push({ desc: String(r[1]).trim(), cat: String(r[2]).trim(), forma: String(r[3]).trim(), valor: Number(r[4]) || 0, data: iso(r[5]), pago: String(r[6]).toLowerCase().startsWith('receb') });
  }
  for (const r of rows('Categorização').slice(1)) {
    if (r[1]) out.categories.pagar.push(String(r[1]).trim());
    if (r[3]) out.categories.receber.push(String(r[3]).trim());
    if (r[5]) out.categories.formas.push(String(r[5]).trim());
  }
  const fc = wb.Sheets['Fluxo de Caixa Mensal'];
  if (fc) {
    if (fc.O4 && Number(fc.O4.v)) out.year = Number(fc.O4.v);
    if (fc.O5 && !isNaN(Number(fc.O5.v))) out.openingBalance = Number(fc.O5.v);
  }
  return out;
});
