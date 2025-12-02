import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
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
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [editingTxAmount, setEditingTxAmount] = useState<string>('');
  const [editingTxMode, setEditingTxMode] = useState<'salary-deduction' | 'manual-payment'>('salary-deduction');

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
      const res = await apiService.createLoan({
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

  // Utility to iterate months inclusive
  const monthsBetweenInclusive = (startM: number, startY: number, endM: number, endY: number): Array<{ month: number; year: number }> => {
    const out: Array<{ month: number; year: number }> = [];
    let y = startY; let m = startM;
    while (y < endY || (y === endY && m <= endM)) {
      out.push({ month: m, year: y });
      m += 1; if (m > 12) { m = 1; y += 1; }
    }
    return out;
  };

  const handleApplyMissingEmisToSelectedMonth = async () => {
    if (activeLoans.length === 0) return toast.info('No active loans');
    const [yStr, mStr] = txMonthYear.split('-');
    const targetM = Number(mStr);
    const targetY = Number(yStr);
    if (!targetM || !targetY) return toast.error('Select a valid month');
    if (!window.confirm(`Apply missing EMIs for active loans up to ${String(targetM).padStart(2,'0')}/${targetY}?`)) return;
    setLoadingTx(true);
    try {
      for (const loan of activeLoans) {
        const months = monthsBetweenInclusive(loan.startMonth, loan.startYear, targetM, targetY);
        for (const { month, year } of months) {
          const hasAnyTx = transactions.some((t) => String(t.loanId || t.loan) === String(loan._id) && Number(t.month) === month && Number(t.year) === year);
          if (hasAnyTx) continue;
          await apiService.createLoanTransaction(loan._id, { month, year, amount: Number(loan.defaultInstallment), mode: 'salary-deduction' });
        }
      }
      toast.success('Missing EMIs applied up to selected month');
      await loadLoans();
    } catch (e: any) {
      console.error('Apply missing EMIs error', e);
      toast.error(e?.message || 'Failed to apply missing EMIs');
    } finally {
      setLoadingTx(false);
    }
  };

  const formatMonthYear = (m: number, y: number) => {
    if (!m || !y) return '-';
    return `${String(m).padStart(2, '0')}/${y}`;
  };

  // dd/mm/yyyy formatter for createdAt dates
  const formatDateDMY = (value?: string) => {
    if (!value) return '—';
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return '—';
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch { return '—'; }
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
  // Pending display rule (resilient to backend stats lag):
  // - Base on principal, subtract salary-deduction transactions up to and including selected month.
  // - If no transaction exists for selected month and loan has started, subtract default EMI (display-only auto deduction).
  // - Manual payment waives EMI for that month but does not reduce principal here.
  const getAdjustedPending = (loan: Loan) => {
    let pending = Number(loan.principal);
    const [yStr, mStr] = txMonthYear.split('-');
    const viewMonth = Number(mStr);
    const viewYear = Number(yStr);
    // subtract salary-deduction payments up to selected month
    const paidBySalary = transactions
      .filter((t) => String(t.loanId || t.loan) === String(loan._id))
      .filter((t) => (t.mode || 'salary-deduction') === 'salary-deduction')
      .filter((t) => (Number(t.year) < viewYear) || (Number(t.year) === viewYear && Number(t.month) <= viewMonth))
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);
    pending = Math.max(0, pending - paidBySalary);
    // current month adjustment
    const started = (viewYear > Number(loan.startYear)) || (viewYear === Number(loan.startYear) && viewMonth >= Number(loan.startMonth));
    if (loan.status === 'active' && started) {
      const txForLoanThisMonth = transactions.filter((t) => String(t.loanId || t.loan) === String(loan._id) && Number(t.month) === viewMonth && Number(t.year) === viewYear);
      const hasSalary = txForLoanThisMonth.some((t) => (t.mode || 'salary-deduction') === 'salary-deduction' && Number(t.amount) > 0);
      const hasManual = txForLoanThisMonth.some((t) => (t.mode || 'manual-payment') === 'manual-payment');
      if (!hasSalary && !hasManual) {
        pending = Math.max(0, pending - Number(loan.defaultInstallment || 0));
      }
    }
    return Math.max(0, pending);
  };

  const hasTxForViewMonth = (loanId: string) => {
    const [yStr, mStr] = txMonthYear.split('-');
    const viewMonth = Number(mStr);
    const viewYear = Number(yStr);
    return transactions.some((t) => String(t.loanId || t.loan) === String(loanId) && Number(t.month) === viewMonth && Number(t.year) === viewYear);
  };

  const handleApplyDefaultEmi = async (loan: Loan) => {
    const [yStr, mStr] = txMonthYear.split('-');
    const viewMonth = Number(mStr);
    const viewYear = Number(yStr);
    const started = (viewYear > Number(loan.startYear)) || (viewYear === Number(loan.startYear) && viewMonth >= Number(loan.startMonth));
    if (!started) return toast.error('Selected month is before loan start');
    setLoadingTx(true);
    try {
      await apiService.createLoanTransaction(loan._id, { month: viewMonth, year: viewYear, amount: Number(loan.defaultInstallment), mode: 'salary-deduction' });
      toast.success('Default EMI applied for the selected month');
      await loadLoans();
    } catch (e: any) {
      console.error('Apply default EMI error', e);
      toast.error(e?.message || 'Failed to apply default EMI');
    } finally {
      setLoadingTx(false);
    }
  };

  const pendingForSelectedLoan = selectedLoan ? getAdjustedPending(selectedLoan) : 0;
  const closeLoan = loans.find((loan) => loan._id === closeLoanId);
  const pendingForClose = closeLoan ? getAdjustedPending(closeLoan) : 0;

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
    <div className="space-y-6">
      {/* Overview + Create Loan */}
      <Card>
        <CardHeader>
          <CardTitle>Loan Entry</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-sm text-muted-foreground bg-muted/30 border border-border rounded-md p-3">
            • Default EMI auto-deducts monthly starting the loan's start month unless a transaction is recorded.<br/>
            • A Salary deduction transaction replaces the default EMI for that month.<br/>
            • A Manual payment transaction makes salary deduction Rs 0 for that month (paid externally).<br/>
            • Closing a loan stops future deductions.
          </div>
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
                <label className="block text-sm font-medium mb-1">Loan Amount (Rs)</label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={principal}
                  onChange={(e) => setPrincipal(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Installment Amount (Rs)</label>
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
        </CardContent>
      </Card>

      {employeeId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Active Loans</CardTitle>
              {employeeId && (
                <Button size="sm" variant="outline" disabled={loadingTx} onClick={handleApplyMissingEmisToSelectedMonth}>
                  {loadingTx ? 'Applying…' : 'Apply Missing EMIs (to month)'}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {activeLoans.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active loans for this employee.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center">Start (MM/YYYY)</TableHead>
                      <TableHead className="text-center">Principal (Rs)</TableHead>
                      <TableHead className="text-center">Default EMI (Rs)</TableHead>
                      <TableHead className="text-center">Pending (Rs)</TableHead>
                      <TableHead className="text-center">Note</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center">Created</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeLoans.map((loan) => (
                      <TableRow key={loan._id}>
                        <TableCell className="text-center">{formatMonthYear(loan.startMonth, loan.startYear)}</TableCell>
                        <TableCell className="text-center">
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
                            <>Rs {Number(loan.principal).toFixed(2)}</>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
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
                            <>Rs {Number(loan.defaultInstallment).toFixed(2)}</>
                          )}
                        </TableCell>
                        <TableCell className="text-center">Rs {getAdjustedPending(loan).toFixed(2)}</TableCell>
                        <TableCell className="text-center">
                          {editingLoanId === loan._id ? (
                            <Input
                              value={editingNote}
                              onChange={(e) => setEditingNote(e.target.value)}
                              className="h-8"
                            />
                          ) : (
                            <>{loan.note || '-'}</>
                          )}
                        </TableCell>
                        <TableCell className="text-center capitalize">
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
                        </TableCell>
                        <TableCell className="text-center">{formatDateDMY(loan.createdAt)}</TableCell>
                        <TableCell className="text-center space-x-2">
                          {editingLoanId === loan._id ? (
                            <>
                              <Button size="sm" variant="outline" onClick={saveLoanEdit}>Save</Button>
                              <Button size="sm" variant="ghost" onClick={cancelEditLoan}>Cancel</Button>
                            </>
                          ) : (
                            <>
                              <Button size="sm" variant="outline" onClick={() => startEditLoan(loan)}>Edit</Button>
                              <Button size="sm" variant="destructive" onClick={() => deleteLoan(loan._id)}>Delete</Button>
                              {loan.status === 'active' && !hasTxForViewMonth(loan._id) && (
                                <Button size="sm" className="ml-1" disabled={loadingTx} onClick={() => handleApplyDefaultEmi(loan)}>
                                  {loadingTx ? 'Applying…' : 'Apply EMI (this month)'}
                                </Button>
                              )}
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {employeeId && (
        <Card>
          <CardHeader>
            <CardTitle>Past Loans</CardTitle>
          </CardHeader>
          <CardContent>
            {pastLoans.length === 0 ? (
              <p className="text-sm text-muted-foreground">No past loans recorded.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center">Start (MM/YYYY)</TableHead>
                      <TableHead className="text-center">Principal (Rs)</TableHead>
                      <TableHead className="text-center">Default EMI (Rs)</TableHead>
                      <TableHead className="text-center">Pending (Rs)</TableHead>
                      <TableHead className="text-center">Note</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center">Created</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pastLoans.map((loan) => (
                      <TableRow key={loan._id}>
                        <TableCell className="text-center">{formatMonthYear(loan.startMonth, loan.startYear)}</TableCell>
                        <TableCell className="text-center">Rs {Number(loan.principal).toFixed(2)}</TableCell>
                        <TableCell className="text-center">Rs {Number(loan.defaultInstallment).toFixed(2)}</TableCell>
                        <TableCell className="text-center">Rs {getAdjustedPending(loan).toFixed(2)}</TableCell>
                        <TableCell className="text-center">{loan.note || '-'}</TableCell>
                        <TableCell className="text-center capitalize">{loan.status}</TableCell>
                        <TableCell className="text-center">{formatDateDMY(loan.createdAt)}</TableCell>
                        <TableCell className="text-center space-x-2">
                          <Button size="sm" variant="destructive" onClick={() => deleteLoan(loan._id)}>Delete</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {employeeId && (
        <Card>
          <CardHeader>
            <CardTitle>Recorded Installments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              {transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No installments recorded for these loans.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center">Loan Start</TableHead>
                      <TableHead className="text-center">Month</TableHead>
                      <TableHead className="text-center">Amount (Rs)</TableHead>
                      <TableHead className="text-center">Type</TableHead>
                      <TableHead className="text-center">Created At</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => {
                      const txLoan = tx.loan && typeof tx.loan === 'object' ? (tx.loan as Loan) : undefined;
                      return (
                        <TableRow key={tx._id || `${tx.loanId}-${tx.month}-${tx.year}-${tx.amount}`}>
                          <TableCell className="text-center">{txLoan ? formatMonthYear(txLoan.startMonth, txLoan.startYear) : '-'}</TableCell>
                          <TableCell className="text-center">{formatMonthYear(tx.month, tx.year)}</TableCell>
                          <TableCell className="text-center">
                            {editingTxId === tx._id ? (
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                value={editingTxAmount}
                                onChange={(e) => setEditingTxAmount(e.target.value)}
                                className="h-8 text-center"
                              />
                            ) : (
                              tx.amount === 0 ? 'Skipped' : `Rs ${Number(tx.amount).toFixed(2)}`
                            )}
                          </TableCell>
                          <TableCell className="text-center capitalize">
                            {editingTxId === tx._id ? (
                              <select
                                className="border rounded-md h-8 px-2"
                                value={editingTxMode}
                                onChange={(e) => setEditingTxMode(e.target.value as any)}
                              >
                                <option value="salary-deduction">salary-deduction</option>
                                <option value="manual-payment">manual-payment</option>
                              </select>
                            ) : (
                              tx.amount === 0 ? 'skipped' : (tx.mode || 'salary-deduction')
                            )}
                          </TableCell>
                          <TableCell className="text-center">{formatDateDMY(tx.createdAt)}</TableCell>
                          <TableCell className="text-center space-x-2">
                            {tx._id ? (
                              editingTxId === tx._id ? (
                                <>
                                  <Button size="sm" variant="outline" onClick={async () => {
                                    const amt = Number(editingTxAmount);
                                    if (!Number.isFinite(amt) || amt < 0) return toast.error('Enter valid amount');
                                    if (amt === 0 && editingTxMode === 'salary-deduction') return toast.error('Use manual-payment for skipped EMI');
                                    try {
                                      await apiService.updateLoanTransaction(tx._id!, { amount: amt, mode: editingTxMode });
                                      toast.success('Installment updated');
                                      setEditingTxId(null);
                                      await loadLoans();
                                    } catch (e: any) {
                                      console.error('Update tx error', e);
                                      toast.error(e?.message || 'Failed to update installment');
                                    }
                                  }}>Save</Button>
                                  <Button size="sm" variant="ghost" onClick={() => setEditingTxId(null)}>Cancel</Button>
                                </>
                              ) : (
                                <>
                                  <Button size="sm" variant="outline" onClick={() => {
                                    setEditingTxId(tx._id!);
                                    setEditingTxAmount(String(tx.amount));
                                    setEditingTxMode((tx.mode as any) || 'salary-deduction');
                                  }}>Edit</Button>
                                  <Button size="sm" variant="destructive" onClick={async () => {
                                    if (!window.confirm('Delete this installment?')) return;
                                    try {
                                      await apiService.deleteLoanTransaction(tx._id!);
                                      toast.success('Installment deleted');
                                      await loadLoans();
                                    } catch (e: any) {
                                      console.error('Delete tx error', e);
                                      toast.error(e?.message || 'Failed to delete installment');
                                    }
                                  }}>Delete</Button>
                                </>
                              )
                            ) : null}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Manual Record</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium mb-1">Loan</label>
              <Select value={selectedLoanId} onValueChange={setSelectedLoanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select loan" />
                </SelectTrigger>
                <SelectContent>
                  {loans.map((l) => (
                    <SelectItem key={l._id} value={l._id}>
                      {formatMonthYear(l.startMonth, l.startYear)} • Rs {Number(l.defaultInstallment).toFixed(2)} EMI
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
              <label className="block text-sm font-medium mb-1">Amount (Rs)</label>
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
                Pending balance: Rs {pendingForSelectedLoan.toFixed(2)}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {activeLoans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Close Loan (Lump Sum)</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end" onSubmit={handleCloseLoanWithLumpSum}>
              <div>
                <label className="block text-sm font-medium mb-1">Loan</label>
                <Select value={closeLoanId} onValueChange={setCloseLoanId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select active loan" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeLoans.map((l) => (
                      <SelectItem key={l._id} value={l._id}>
                        {formatMonthYear(l.startMonth, l.startYear)} • Pending {loanStats[l._id] ? `Rs ${loanStats[l._id].pendingAmount.toFixed(2)}` : 'Rs 0.00'}
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
                <label className="block text-sm font-medium mb-1">Outstanding Amount (Rs)</label>
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
