App.register('payables', makeAccountsModule({
  key: 'payables', kind: 'pay', catKey: 'pagar', title: 'Contas a Pagar', sub: 'Controle seus compromissos e nunca perca um vencimento.',
  newLabel: 'Nova conta a pagar', openLabel: 'Total em aberto a pagar', doneLabel: 'Já pago', dateLabel: 'Vencimento',
  doneAction: 'Pagar', doneDate: 'Data do pagamento', doneToast: 'Pagamento registrado', example: 'Fornecedor, aluguel…',
  status: Fin.statusPay, statuses: ['Atrasada', 'Vencendo', 'No prazo', 'Paga'], file: 'contas-a-pagar.csv'
}));
