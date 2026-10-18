App.register('receivables', makeAccountsModule({
  key: 'receivables', kind: 'rec', catKey: 'receber', title: 'Contas a Receber', sub: 'Acompanhe tudo que seus clientes ainda vão pagar.',
  newLabel: 'Novo recebimento', openLabel: 'Total em aberto a receber', doneLabel: 'Já recebido', dateLabel: 'Data prevista',
  doneAction: 'Receber', doneDate: 'Data do recebimento', doneToast: 'Recebimento registrado', example: 'Cliente, venda…',
  status: Fin.statusRec, statuses: ['Atrasado', 'Recebe hoje', 'A receber', 'Recebido'], file: 'contas-a-receber.csv'
}));
