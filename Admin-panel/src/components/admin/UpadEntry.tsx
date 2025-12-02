import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { formatToDMY } from '../../utils/date';

interface Employee {
  id: string;
  name: string;
  department?: string;
}

export function UpadEntry() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeId, setEmployeeId] = useState('');
  const [monthYear, setMonthYear] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingAmount, setEditingAmount] = useState<string>('');
  const [editingNote, setEditingNote] = useState<string>('');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

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

  const loadEntries = async () => {
    if (!employeeId) return;
    try {
      const res = await apiService.listUpad({ employeeId });
      setEntries(res.data || []);
    } catch (e: any) {
      console.error('Load Upad entries error', e);
      toast.error(e?.message || 'Failed to load Upad entries');
    }
  };

  useEffect(() => {
    loadEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) return toast.error('Please select employee');
    if (!monthYear) return toast.error('Please select month & year');
    const [yearStr, monthStr] = monthYear.split('-');
    const month = Number(monthStr);
    const year = Number(yearStr);
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error('Enter valid Upad amount');
    setLoading(true);
    try {
      await apiService.createUpad({ employeeId, month, year, amount: amt, note: note || undefined });
      toast.success('Upad entry saved');
      setAmount('');
      setNote('');
      await loadEntries();
    } catch (e: any) {
      console.error('Create Upad error', e);
      toast.error(e?.message || 'Failed to save Upad');
    } finally {
      setLoading(false);
    }
  };

  const formatMonthYear = (m: number, y: number) => `${String(m).padStart(2, '0')}/${y}`;

  const startEdit = (entry: any) => {
    setEditingId(entry._id);
    setEditingAmount(String(entry.amount ?? ''));
    setEditingNote(entry.note || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingAmount('');
    setEditingNote('');
  };

  const saveEdit = async (entry: any) => {
    if (!editingId) return;
    const amt = Number(editingAmount);
    if (!amt || amt <= 0) {
      toast.error('Enter valid Upad amount');
      return;
    }
    try {
      await apiService.updateUpad(editingId, {
        amount: amt,
        note: editingNote || undefined,
      });
      toast.success('Upad entry updated');
      cancelEdit();
      await loadEntries();
    } catch (e: any) {
      console.error('Update Upad error', e);
      toast.error(e?.message || 'Failed to update Upad');
    }
  };

  const deleteEntry = async (entryId: string) => {
    try {
      await apiService.deleteUpad(entryId);
      toast.success('Upad entry deleted');
      if (editingId === entryId) cancelEdit();
      setDeleteTargetId(null);
      await loadEntries();
    } catch (e: any) {
      console.error('Delete Upad error', e);
      toast.error(e?.message || 'Failed to delete Upad');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upad Entry</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
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
          <div className="md:col-span-1">
            <label className="block text-sm font-medium mb-1">Month & Year</label>
            <Input
              type="month"
              value={monthYear}
              onChange={(e) => setMonthYear(e.target.value)}
            />
          </div>
          <div className="md:col-span-1 flex flex-col gap-2">
            <div>
              <label className="block text-sm font-medium mb-1">Upad Amount (Rs)</label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Note (optional)</label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={loading} className="mt-1 w-full">
              {loading ? 'Saving...' : 'Save Upad'}
            </Button>
          </div>
        </form>

        {employeeId && (
          <div className="mt-6">
            <h3 className="font-semibold mb-2">Upad history (month-wise)</h3>
            {entries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No Upad entries found for this employee.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-center table-fixed">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2 px-2">Month</th>
                      <th className="py-2 px-2">Amount (Rs)</th>
                      <th className="py-2 px-2 w-72">Note</th>
                      <th className="py-2 px-2">Created At</th>
                      <th className="py-2 px-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e) => (
                      <tr key={e._id} className="border-b last:border-0">
                        <td className="py-2 px-2">{formatMonthYear(e.month, e.year)}</td>
                        <td className="py-2 px-2">
                          {editingId === e._id ? (
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              value={editingAmount}
                              onChange={(ev) => setEditingAmount(ev.target.value)}
                              className="h-8 text-center"
                            />
                          ) : (
                            <>Rs {Number(e.amount).toFixed(2)}</>
                          )}
                        </td>
                        <td className="py-2 px-2">
                          {editingId === e._id ? (
                            <Input
                              value={editingNote}
                              onChange={(ev) => setEditingNote(ev.target.value)}
                              className="h-8"
                            />
                          ) : (
                            <span
                              className="inline-block w-full max-w-xs truncate align-middle"
                              title={e.note || ''}
                            >
                              {e.note || '-'}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2">{formatToDMY(e.createdAt)}</td>
                        <td className="py-2 px-2 space-x-2">
                          {editingId === e._id ? (
                            <>
                              <Button size="sm" variant="outline" onClick={() => saveEdit(e)}>Save</Button>
                              <Button size="sm" variant="ghost" onClick={cancelEdit}>Cancel</Button>
                            </>
                          ) : (
                            <Dialog open={deleteTargetId === e._id} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
                              <DialogTrigger asChild>
                                <div className="inline-flex gap-2">
                                  <Button size="sm" variant="outline" onClick={() => startEdit(e)}>Edit</Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={(ev) => {
                                      ev.stopPropagation();
                                      setDeleteTargetId(e._id);
                                    }}
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Delete Upad Entry</DialogTitle>
                                  <DialogDescription>
                                    Are you sure you want to delete this Upad entry? This action cannot be undone.
                                  </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                  <Button
                                    variant="outline"
                                    onClick={() => setDeleteTargetId(null)}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    onClick={() => deleteEntry(e._id)}
                                  >
                                    Delete
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
