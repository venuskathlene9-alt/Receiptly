export const EMPTY_EXPENSE = {
  store_name: '', expense_date: new Date().toISOString().slice(0, 10), expense_time: '',
  subtotal: '', tax: '', discount: '', total_amount: '', category: 'Others',
  payment_method: '', notes: '', source: 'manual',
};
