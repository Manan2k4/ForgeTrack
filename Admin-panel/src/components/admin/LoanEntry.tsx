import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';

interface Employee {
  id: string;
  name: string;
  department?: string;
}

interface Loan {
  _id: string;
  employee: string | { _id: string; name: string };
  startMonth: number;
  startYear: number;
  principal: number;
  defaultInstallment: number;
  note?: string;
  status: string;
  createdAt: string;
}

interface LoanTransaction {
  _id?: string;
  loan: string | Loan;
  loanId?: string;
  month: number;
  year: number;
  amount: number;
  mode?: string;
  createdAt?: string;
}

export function LoanEntry() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeId, setEmployeeId] = useState('');
  const [startMonthYear, setStartMonthYear] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [principal, setPrincipal] = useState<string>('');
  const [installment, setInstallment] = useState<string>('');
  const [note, setNote] = useState('');

  const [loans, setLoans] = useState<Loan[]>([]);
  const [selectedLoanId, setSelectedLoanId] = useState('');
  const [transactions, setTransactions] = useState<LoanTransaction[]>([]);
  const [txMonthYear, setTxMonthYear] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [txAmount, setTxAmount] = useState<string>('');
  const [txMode, setTxMode] = useState<'salary-deduction' | 'manual-payment'>('salary-deduction');

  const [loadingLoan, setLoadingLoan] = useState(false);
  const [loadingTx, setLoadingTx] = useState(false);
  const [closingLoanLoading, setClosingLoanLoading] = useState(false);

  const [editingLoanId, setEditingLoanId] = useState<string | null>(null);
  const [editingPrincipal, setEditingPrincipal] = useState<string>('');
  const [editingInstallment, setEditingInstallment] = useState<string>('');
  const [editingNote, setEditingNote] = useState<string>('');
  const [editingStatus, setEditingStatus] = useState<string>('');

  const [loanStats, setLoanStats] = useState<Record<string, { paidTotal: number; pendingAmount: number }>>({});
  const [closeLoanId, setCloseLoanId] = useState('');
  const [closeMonthYear, setCloseMonthYear] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await apiService.getEmployees({ includeInactive: true });
        setEmployees(res.data || []);
      } catch (e: any) {
        console.error('Load employees error', e);
        toast.error(e?.message || 'Failed to load employees');
      }
    })();
  }, []);

  const loadLoans = async (): Promise<Loan[] | undefined> => {
    if (!employeeId) return;
    try {
      const res = await apiService.getEmployeeLoanData(employeeId);
      const payload = (res as any).data || {};
      const list: Loan[] = payload.loans || [];
      const txs: LoanTransaction[] = payload.transactions || [];
      const stats = payload.stats || {};
      // attach loan object to transactions for rendering
      const txWithLoan = txs.map((t: any) => ({
        ...t,
        loanId: String(t.loan),
        loan: list.find((l) => String(l._id) === String(t.loan)) || undefined,
      }));
      setLoans(list);
      setTransactions(txWithLoan);
      setLoanStats(stats);
      return list;
    } catch (e: any) {
      console.error('Load loans error', e);
      toast.error(e?.message || 'Failed to load loans');
      return undefined;
    }
  };

  useEffect(() => {
    loadLoans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  useEffect(() => {
    if (!selectedLoanId) return;
    const loan = loans.find((l) => l._id === selectedLoanId);
    if (!loan) return;
    setTxAmount((prev) => (prev ? prev : String(loan.defaultInstallment)));
  }, [selectedLoanId, loans]);

  

  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) return toast.error('Please select employee');
    if (!startMonthYear) return toast.error('Please select start month & year');
    const [startYearStr, startMonthStr] = startMonthYear.split('-');
    const startMonth = Number(startMonthStr);
    const startYear = Number(startYearStr);
    const p = Number(principal);
    const emi = Number(installment);
    if (!p || p <= 0) return toast.error('Enter valid loan amount');
    if (!emi || emi <= 0) return toast.error('Enter valid installment amount');
    setLoadingLoan(true);
    try {
      await apiService.createLoan({
        employeeId,
        startMonth,
        startYear,
        principal: p,
        defaultInstallment: emi,
        note: note || undefined,
      });
      toast.success('Loan created');
      setPrincipal('');
      setInstallment('');
      setNote('');
      await loadLoans();
    } catch (e: any) {
      console.error('Create loan error', e);
      toast.error(e?.message || 'Failed to create loan');
    } finally {
      setLoadingLoan(false);
    }
  };

  const handleCreateTx = async (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!selectedLoanId) return toast.error('Select a loan');
    if (!txMonthYear) return toast.error('Select installment month & year');
    const [txYearStr, txMonthStr] = txMonthYear.split('-');
    const txMonth = Number(txMonthStr);
    const txYear = Number(txYearStr);
    if (txAmount === '') return toast.error('Enter installment amount');
    const amt = Number(txAmount);
    if (!Number.isFinite(amt) || amt < 0) return toast.error('Enter valid installment amount');
    if (amt === 0 && txMode === 'salary-deduction') {
      return toast.error('Use manual payment mode to mark a skipped EMI');
    }
    setLoadingTx(true);
    try {
      const res = await apiService.createLoanTransaction(selectedLoanId, {
        month: txMonth,
        year: txYear,
        amount: amt,
        mode: txMode,
      });
      const created = (res as any).data;
      // optimistic UI update: attach loan object and prepend
      const loanObj = loans.find((l) => l._id === selectedLoanId);
      const txRecord: LoanTransaction = { ...created, loanId: String(created.loan || selectedLoanId), loan: loanObj, amount: created.amount, month: created.month, year: created.year, createdAt: created.createdAt };
      setTransactions((prev) => [txRecord, ...prev]);
      // update loanStats
      setLoanStats((prev) => {
        const copy = { ...prev };
        const prevPaid = copy[selectedLoanId]?.paidTotal ?? 0;
        const prevPending = copy[selectedLoanId]?.pendingAmount ?? Number(loanObj?.principal ?? 0);
        const newPaid = prevPaid + Number(txRecord.amount || 0);
        const newPending = Math.max(0, Number(loanObj?.principal ?? 0) - newPaid);
        copy[selectedLoanId] = { paidTotal: newPaid, pendingAmount: newPending };
        return copy;
      });
      toast.success('Installment recorded');
      setTxAmount('');
      setTxMode('salary-deduction');
      // refresh authoritative data
      await loadLoans();
    } catch (e: any) {
      console.error('Create loan tx error', e);
      toast.error(e?.message || 'Failed to record installment');
    } finally {
      setLoadingTx(false);
    }
  };

  const handleSkipInstallment = async () => {
    if (!selectedLoanId) return toast.error('Select a loan to mark skipped');
    if (!txMonthYear) return toast.error('Select month & year to skip');
    const [txYearStr, txMonthStr] = txMonthYear.split('-');
    const txMonth = Number(txMonthStr);
    const txYear = Number(txYearStr);
    setLoadingTx(true);
    try {
      const res = await apiService.createLoanTransaction(selectedLoanId, {
        month: txMonth,
        year: txYear,
        amount: 0,
        mode: 'manual-payment',
      });
      const created = (res as any).data;
      const loanObj = loans.find((l) => l._id === selectedLoanId);
      const txRecord: LoanTransaction = { ...created, loanId: String(created.loan || selectedLoanId), loan: loanObj, amount: created.amount, month: created.month, year: created.year, createdAt: created.createdAt };
      setTransactions((prev) => [txRecord, ...prev]);
      // skipped installment doesn't change paidTotal but record it in list
      setLoanStats((prev) => ({ ...prev }));
      toast.success('Installment marked as skipped');
      setTxAmount('');
      setTxMode('salary-deduction');
      await loadLoans();
    } catch (e: any) {
      console.error('Skip loan tx error', e);
      toast.error(e?.message || 'Failed to mark installment as skipped');
    } finally {
      setLoadingTx(false);
    }
  };

  const formatMonthYear = (m: number, y: number) => {
    if (!m || !y) return '-';
    return `${String(m).padStart(2, '0')}/${y}`;
  };

  const startEditLoan = (loan: Loan) => {
    setEditingLoanId(loan._id);
    setEditingPrincipal(String(loan.principal));
    setEditingInstallment(String(loan.defaultInstallment));
    setEditingNote(loan.note || '');
    setEditingStatus(loan.status || 'active');
  };

  const cancelEditLoan = () => {
    setEditingLoanId(null);
    setEditingPrincipal('');
    setEditingInstallment('');
    setEditingNote('');
    setEditingStatus('');
  };

  const saveLoanEdit = async () => {
    if (!editingLoanId) return;
    const p = Number(editingPrincipal);
    const emi = Number(editingInstallment);
    if (!p || p <= 0) return toast.error('Enter valid loan amount');
    if (!emi || emi <= 0) return toast.error('Enter valid installment amount');
    try {
      await apiService.updateLoan(editingLoanId, {
        principal: p,
        defaultInstallment: emi,
        note: editingNote || undefined,
        status: editingStatus || undefined,
      });
      toast.success('Loan updated');
      cancelEditLoan();
      await loadLoans();
    } catch (e: any) {
      console.error('Update loan error', e);
      toast.error(e?.message || 'Failed to update loan');
    }
  };

  const deleteLoan = async (id: string) => {
    if (!window.confirm('Delete this loan?')) return;
    try {
      await apiService.deleteLoan(id);
      toast.success('Loan deleted');
      if (selectedLoanId === id) setSelectedLoanId('');
      if (editingLoanId === id) cancelEditLoan();
      await loadLoans();
    } catch (e: any) {
      console.error('Delete loan error', e);
      toast.error(e?.message || 'Failed to delete loan');
    }
  };

  // (Past-loan reopen feature removed) keep past loans readonly; only deletion allowed with confirmation

  const activeLoans = loans.filter((loan) => loan.status === 'active');
  const pastLoans = loans.filter((loan) => loan.status !== 'active');
  const selectedLoan = loans.find((loan) => loan._id === selectedLoanId);
  const pendingForSelectedLoan = loanStats[selectedLoanId]?.pendingAmount ?? (selectedLoan ? Number(selectedLoan.principal) : 0);
  const closeLoan = loans.find((loan) => loan._id === closeLoanId);
  const pendingForClose = loanStats[closeLoanId]?.pendingAmount ?? (closeLoan ? Number(closeLoan.principal) : 0);
  const getPending = (loan: Loan) => loanStats[loan._id]?.pendingAmount ?? Math.max(0, Number(loan.principal));

  const handleCloseLoanWithLumpSum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closeLoanId) return toast.error('Select a loan to close');
    const stats = loanStats[closeLoanId];
    if (!stats) return toast.error('Unable to determine outstanding amount');
    const outstanding = Number(stats.pendingAmount.toFixed(2));
    if (outstanding <= 0) {
      toast.info('This loan is already settled');
      return;
    }
    if (!closeMonthYear) return toast.error('Select payoff month & year');
    const [closeYearStr, closeMonthStr] = closeMonthYear.split('-');
    const payoffMonth = Number(closeMonthStr);
    const payoffYear = Number(closeYearStr);
    setClosingLoanLoading(true);
    try {
      await apiService.createLoanTransaction(closeLoanId, {
        month: payoffMonth,
        year: payoffYear,
        amount: outstanding,
        mode: 'manual-payment',
      });
      await apiService.updateLoan(closeLoanId, { status: 'closed' });
      toast.success('Loan marked as closed with lump sum payment');
      setCloseLoanId('');
      await loadLoans();
    } catch (e: any) {
      console.error('Close loan error', e);
      toast.error(e?.message || 'Failed to close loan');
    } finally {
      setClosingLoanLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Loan Entry</CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium mb-1">Employee</label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}{e.department ? ` (${e.department})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Start Month & Year</label>
            <Input
              type="month"
              value={startMonthYear}
              onChange={(e) => setStartMonthYear(e.target.value)}
            />
          </div>
          <div className="md:col-span-1 flex flex-col gap-2">
            <div>
              <label className="block text-sm font-medium mb-1">Loan Amount (₹)</label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Installment Amount (₹)</label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={installment}
                onChange={(e) => setInstallment(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Note (optional)</label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <Button type="button" disabled={loadingLoan} className="mt-1 w-full" onClick={handleCreateLoan}>
              {loadingLoan ? 'Saving...' : 'Create Loan'}
            </Button>
          </div>
        </div>

        {employeeId && (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Active Loans</h3>
              {activeLoans.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active loans for this employee.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-center">
                    <thead>
                      <tr className="border-b">
                        <th className="py-2 px-2">Start</th>
                        <th className="py-2 px-2">Principal (₹)</th>
                        <th className="py-2 px-2">Default EMI (₹)</th>
                        <th className="py-2 px-2">Pending (₹)</th>
                        <th className="py-2 px-2">Note</th>
                        <th className="py-2 px-2">Status</th>
                        <th className="py-2 px-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeLoans.map((loan) => (
                        <tr key={loan._id} className="border-b last:border-0">
                          <td className="py-2 px-2">{formatMonthYear(loan.startMonth, loan.startYear)}</td>
                          <td className="py-2 px-2">
                            {editingLoanId === loan._id ? (
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                value={editingPrincipal}
                                onChange={(e) => setEditingPrincipal(e.target.value)}
                                className="h-8 text-center"
                              />
                            ) : (
                              <>₹{Number(loan.principal).toFixed(2)}</>
                            )}
                          </td>
                          <td className="py-2 px-2">
                            {editingLoanId === loan._id ? (
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                value={editingInstallment}
                                onChange={(e) => setEditingInstallment(e.target.value)}
                                className="h-8 text-center"
                              />
                            ) : (
                              <>₹{Number(loan.defaultInstallment).toFixed(2)}</>
                            )}
                          </td>
                          <td className="py-2 px-2">₹{getPending(loan).toFixed(2)}</td>
                          <td className="py-2 px-2">
                            {editingLoanId === loan._id ? (
                              <Input
                                value={editingNote}
                                onChange={(e) => setEditingNote(e.target.value)}
                                className="h-8"
                              />
                            ) : (
                              <>{loan.note || '-'}</>
                            )}
                          </td>
                          <td className="py-2 px-2 capitalize">
                            {editingLoanId === loan._id ? (
                              <select
                                className="border rounded-md h-8 px-2"
                                value={editingStatus}
                                onChange={(e) => setEditingStatus(e.target.value)}
                              >
                                <option value="active">active</option>
                                <option value="closed">closed</option>
                                <option value="cancelled">cancelled</option>
                              </select>
                            ) : (
                              loan.status
                            )}
                          </td>
                          <td className="py-2 px-2 space-x-2">
                            {editingLoanId === loan._id ? (
                              <>
                                <Button size="sm" variant="outline" onClick={saveLoanEdit}>Save</Button>
                                <Button size="sm" variant="ghost" onClick={cancelEditLoan}>Cancel</Button>
                              </>
                            ) : (
                              <>
                                <Button size="sm" variant="outline" onClick={() => startEditLoan(loan)}>Edit</Button>
                                <Button size="sm" variant="destructive" onClick={() => deleteLoan(loan._id)}>Delete</Button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <h3 className="font-semibold mb-2">Past Loans</h3>
              {pastLoans.length === 0 ? (
                <p className="text-sm text-muted-foreground">No past loans recorded.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-center">
                    <thead>
                      <tr className="border-b">
                        <th className="py-2 px-2">Start</th>
                        <th className="py-2 px-2">Principal (₹)</th>
                        <th className="py-2 px-2">Default EMI (₹)</th>
                        <th className="py-2 px-2">Pending (₹)</th>
                        <th className="py-2 px-2">Note</th>
                        <th className="py-2 px-2">Status</th>
                        <th className="py-2 px-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pastLoans.map((loan) => (
                        <tr key={loan._id} className="border-b last:border-0">
                          <td className="py-2 px-2">{formatMonthYear(loan.startMonth, loan.startYear)}</td>
                          <td className="py-2 px-2">₹{Number(loan.principal).toFixed(2)}</td>
                          <td className="py-2 px-2">₹{Number(loan.defaultInstallment).toFixed(2)}</td>
                          <td className="py-2 px-2">₹{getPending(loan).toFixed(2)}</td>
                          <td className="py-2 px-2">{loan.note || '-'}</td>
                          <td className="py-2 px-2 capitalize">{loan.status}</td>
                          <td className="py-2 px-2 space-x-2">
                            <Button size="sm" variant="destructive" onClick={() => deleteLoan(loan._id)}>Delete</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recorded installments table directly beneath loans */}
        {employeeId && (
          <div className="mt-6">
            <h3 className="font-semibold mb-2">Recorded Installments</h3>
            <div className="overflow-x-auto">
              {transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No installments recorded for these loans.</p>
              ) : (
                <table className="w-full text-sm text-center">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2 px-2">Loan Start</th>
                      <th className="py-2 px-2">Month</th>
                      <th className="py-2 px-2">Amount (₹)</th>
                      <th className="py-2 px-2">Type</th>
                      <th className="py-2 px-2">Created At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => {
                      const txLoan = tx.loan && typeof tx.loan === 'object' ? (tx.loan as Loan) : undefined;
                      return (
                        <tr key={tx._id || `${tx.loanId}-${tx.month}-${tx.year}-${tx.amount}`} className="border-b last:border-0">
                          <td className="py-2 px-2">{txLoan ? formatMonthYear(txLoan.startMonth, txLoan.startYear) : '-'}</td>
                          <td className="py-2 px-2">{formatMonthYear(tx.month, tx.year)}</td>
                          <td className="py-2 px-2">{tx.amount === 0 ? 'Skipped' : `₹${Number(tx.amount).toFixed(2)}`}</td>
                          <td className="py-2 px-2 capitalize">{tx.amount === 0 ? 'skipped' : (tx.mode || 'salary-deduction')}</td>
                          <td className="py-2 px-2">{tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Manual record section */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end border-t pt-4 mt-6">
          <div className="md:col-span-6">
            <h3 className="font-semibold mb-2">Manual record</h3>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Loan</label>
            <Select value={selectedLoanId} onValueChange={setSelectedLoanId}>
              <SelectTrigger>
                <SelectValue placeholder="Select loan" />
              </SelectTrigger>
              <SelectContent>
                {loans.map((l) => (
                  <SelectItem key={l._id} value={l._id}>
                    {formatMonthYear(l.startMonth, l.startYear)} • ₹{Number(l.defaultInstallment).toFixed(2)} EMI
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Installment Month & Year</label>
            <Input type="month" value={txMonthYear} onChange={(e) => setTxMonthYear(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Amount (₹)</label>
            <Input type="number" min={0} step="0.01" value={txAmount} onChange={(e) => setTxAmount(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Recorded As</label>
            <Select value={txMode} onValueChange={(value) => setTxMode(value as 'salary-deduction' | 'manual-payment')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="salary-deduction">Salary deduction</SelectItem>
                <SelectItem value="manual-payment">Manual payment</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Button type="button" disabled={loadingTx} onClick={handleCreateTx}>
              {loadingTx ? 'Saving...' : 'Record Installment'}
            </Button>
            <Button type="button" variant="outline" disabled={loadingTx} onClick={handleSkipInstallment}>
              Mark as Skipped
            </Button>
          </div>
          {selectedLoanId && (
            <div className="md:col-span-6 text-sm text-muted-foreground">
              Pending balance: ₹{pendingForSelectedLoan.toFixed(2)}
            </div>
          )}
        </div>

        {/* Lump sum payoff */}
        {activeLoans.length > 0 && (
          <form className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end border-t pt-4" onSubmit={handleCloseLoanWithLumpSum}>
            <div className="md:col-span-5">
              <h3 className="font-semibold mb-2">Close loan with lump sum</h3>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Loan</label>
              <Select value={closeLoanId} onValueChange={setCloseLoanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select active loan" />
                </SelectTrigger>
                <SelectContent>
                  {activeLoans.map((l) => (
                    <SelectItem key={l._id} value={l._id}>
                      {formatMonthYear(l.startMonth, l.startYear)} • Pending {loanStats[l._id] ? `₹${loanStats[l._id].pendingAmount.toFixed(2)}` : '₹0.00'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Payoff Month & Year</label>
              <Input type="month" value={closeMonthYear} onChange={(e) => setCloseMonthYear(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Outstanding Amount (₹)</label>
              <Input
                value={closeLoanId ? pendingForClose.toFixed(2) : '0.00'}
                readOnly
              />
            </div>
            <div>
              <Button type="submit" disabled={closingLoanLoading || !closeLoanId || pendingForClose <= 0}>
                {closingLoanLoading ? 'Processing...' : 'Record payoff'}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
