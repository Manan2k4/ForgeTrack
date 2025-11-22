import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import databaseService from '../../services/databaseService';
import { CheckCircle2, Plus, Trash2, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface Product { id: string; type: 'sleeve' | 'rod' | 'pin'; code?: string; partName?: string; sizes: string[]; }
interface MultiWorkBatchFormProps { jobType: 'rod' | 'sleeve' | 'pin'; employeeId: string; onComplete: () => void; isOnline: boolean; }
interface Entry { id: string; selectedItem: string; partSize: string; specialSize: string; totalParts: string; rejection: string; operation: string; }

const OPERATION_OPTIONS: Record<string, string[]> = {
  sleeve: ['CASTING', 'BORE', 'LENGTH', 'RUF OD', 'FINAL OD', 'OD GRINDING', 'SLEEVE PORT', 'PACKING'],
  rod: ['SMALL BORE GRINDING', 'BIG BORE GRINDING', 'SMALL BORE HORING', 'BIG BORE HORING', 'ASSEMBLY', 'PACKING'],
  pin: ['PIN RAW MATERIAL', 'PIN MACHINING', 'PIN HOLE', 'PIN HARDENING', 'PIN GRAY', 'PIN GRINDING', 'PACKING'],
};

export function MultiWorkBatchForm({ jobType, employeeId, onComplete, isOnline }: MultiWorkBatchFormProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [entries, setEntries] = useState<Entry[]>([createEmptyEntry()]);
  const [availableSizesMap, setAvailableSizesMap] = useState<Record<string, string[]>>({});
  const [showReview, setShowReview] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const draftKey = `multiWorkBatchDraft_${jobType}_${employeeId}`;
  const [reviewCollapsed, setReviewCollapsed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function createEmptyEntry(): Entry { return { id: Date.now().toString() + Math.random(), selectedItem: '', partSize: '', specialSize: '', totalParts: '', rejection: '', operation: '' }; }

  const loadProducts = async () => {
    try {
      const all = await databaseService.getProducts(jobType);
      setProducts(all.filter(p => p.type === jobType));
    } catch (e) {
      toast.error('Failed to load products');
    }
  };

  // Draft restore
  useEffect(() => {
    loadProducts();
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setEntries(parsed.map((e: any) => ({ ...createEmptyEntry(), ...e, id: e.id || createEmptyEntry().id })));
          setHasDraft(true);
          toast.info('Draft restored', { icon: '📝' });
        }
      }
    } catch {}
  }, [jobType]);

  // Auto-save draft throttle
  useEffect(() => {
    const meaningful = entries.some(e => e.selectedItem || e.partSize || e.specialSize || e.totalParts || e.rejection);
    if (!meaningful) return;
    const t = setTimeout(() => {
      localStorage.setItem(draftKey, JSON.stringify(entries));
      setHasDraft(true);
    }, 800);
    return () => clearTimeout(t);
  }, [entries]);

  const clearDraft = () => {
    localStorage.removeItem(draftKey);
    setHasDraft(false);
    toast.success('Draft cleared');
  };

  const getItemLabel = () => jobType === 'sleeve' ? 'Code' : 'Part Name';
  const getItems = () => products.map(p => ({ value: jobType === 'sleeve' ? p.code! : p.partName!, label: jobType === 'sleeve' ? p.code! : p.partName! }));
  const operationOptions = OPERATION_OPTIONS[jobType] || [];

  const updateEntry = (id: string, patch: Partial<Entry>) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e));
  };

  const removeEntry = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const addEntry = () => {
    setEntries(prev => [...prev, createEmptyEntry()]);
  };

  // Update sizes map when selected item changes
  useEffect(() => {
    const map: Record<string, string[]> = {};
    entries.forEach(entry => {
      if (!entry.selectedItem) return;
      const prod = products.find(p => (jobType === 'sleeve' ? p.code === entry.selectedItem : p.partName === entry.selectedItem));
      map[entry.id] = prod?.sizes || [];
    });
    setAvailableSizesMap(map);
  }, [entries, products, jobType]);

  const validateEntries = (): { errors: string[]; valid: boolean } => {
    const errors: string[] = [];
    entries.forEach((e, idx) => {
      if (!e.selectedItem) errors.push(`Entry ${idx + 1}: missing ${getItemLabel().toLowerCase()}`);
      if (!e.partSize && !e.specialSize) errors.push(`Entry ${idx + 1}: choose size or special size`);
      const total = parseInt(e.totalParts);
      if (!e.totalParts || isNaN(total) || total <= 0) errors.push(`Entry ${idx + 1}: invalid total parts`);
      const rej = e.rejection ? parseInt(e.rejection) : 0;
      if (rej < 0) errors.push(`Entry ${idx + 1}: rejection negative`);
      if (!isNaN(total) && rej > total) errors.push(`Entry ${idx + 1}: rejection exceeds total`);
      if (operationOptions.length > 0 && !e.operation) errors.push(`Entry ${idx + 1}: missing job type (operation)`);
    });
    return { errors, valid: errors.length === 0 };
  };

  // Light-weight check for enabling submit without full validation spam
  const canSubmit = entries.length > 0 && entries.every(e => {
    const total = parseInt(e.totalParts);
    const rej = e.rejection ? parseInt(e.rejection) : 0;
    return e.selectedItem && (e.partSize || e.specialSize) && !isNaN(total) && total > 0 && rej >= 0 && rej <= total && (operationOptions.length === 0 || e.operation);
  });

  const startReview = () => {
    const { errors, valid } = validateEntries();
    if (!valid) {
      toast.error('Please fix errors before review');
      errors.slice(0, 4).forEach(m => toast.message(m));
      return;
    }
    setShowReview(true);
  };

  const confirmSubmit = async () => {
    if (isSubmitting) return; // guard against double-trigger
    setIsSubmitting(true);
    setShowReview(false);
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const employee = users.find((u: any) => u.id === employeeId);
    if (!employee) { toast.error('Employee not found'); setIsSubmitting(false); return; }

    let successCount = 0;
    for (const entry of entries) {
      try {
        const totalParts = parseInt(entry.totalParts);
        const rejection = entry.rejection ? parseInt(entry.rejection) : 0;
        await databaseService.saveWorkLog({
          employeeId,
          employeeName: employee.name,
          jobType,
          code: jobType === 'sleeve' ? entry.selectedItem : undefined,
          partName: jobType !== 'sleeve' ? entry.selectedItem : undefined,
          partSize: entry.partSize || '',
          specialSize: entry.specialSize || '',
          operation: entry.operation || undefined,
          totalParts,
          rejection,
          date: new Date().toISOString().split('T')[0],
        } as any);
        successCount++;
      } catch (e) {
        toast.error(`Failed entry for ${entry.selectedItem || 'item'}`);
      }
    }
    clearDraft();
    toast.success(`Submitted ${successCount}/${entries.length} work logs`, { icon: '✅' });
    setEntries([createEmptyEntry()]);
    onComplete();
    setIsSubmitting(false);
  };

  // Direct submit without review (single or multi)
  const directSubmit = async () => {
    if (isSubmitting) return; // ignore rapid re-clicks
    const { errors, valid } = validateEntries();
    if (!valid) {
      toast.error('Fix errors before submitting');
      errors.slice(0, 4).forEach(m => toast.message(m));
      return;
    }
    await confirmSubmit();
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* DEBUG VERSION MARKER: v2.1 sticky bar */}
      <div className="text-[10px] text-center text-gray-400">BatchForm v2.1</div>
      {hasDraft && (
        <Alert className="bg-blue-50 border-blue-200">
          <AlertCircle className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-blue-700">
            There is a draft here, use it or refresh for fresh start.
            <Button size="sm" variant="outline" className="ml-2" onClick={clearDraft}>Discard Draft</Button>
          </AlertDescription>
        </Alert>
      )}

      <Card className="bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Batch Work Entries</CardTitle>
          <CardDescription>Job Type: <span className="font-medium capitalize">{jobType}</span></CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {entries.map((entry, idx) => {
            const sizes = availableSizesMap[entry.id] || [];
            const okParts = Math.max(0, (parseInt(entry.totalParts || '0') || 0) - (parseInt(entry.rejection || '0') || 0));
            return (
              <Card key={entry.id} className="border shadow-sm">
                <CardHeader className="py-3 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2"><Badge variant="secondary">#{idx + 1}</Badge><span className="text-sm text-gray-500">Work Log</span></div>
                  {entries.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => removeEntry(entry.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {operationOptions.length > 0 && (
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Job Type (operation)</Label>
                      <Select value={entry.operation} onValueChange={v => updateEntry(entry.id, { operation: v })}>
                        <SelectTrigger className="h-10"><SelectValue placeholder="Select operation" /></SelectTrigger>
                        <SelectContent>{operationOptions.map(op => <SelectItem key={op} value={op}>{op}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">{getItemLabel()} *</Label>
                    <Select value={entry.selectedItem} onValueChange={v => updateEntry(entry.id, { selectedItem: v, partSize: '', specialSize: '' })}>
                      <SelectTrigger className="h-10"><SelectValue placeholder={`Select ${getItemLabel().toLowerCase()}`} /></SelectTrigger>
                      <SelectContent>{getItems().map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Part Size</Label>
                      <Select value={entry.partSize} onValueChange={v => updateEntry(entry.id, { partSize: v })} disabled={!entry.selectedItem}>
                        <SelectTrigger className="h-10"><SelectValue placeholder={entry.selectedItem ? 'Select size' : 'Select item first'} /></SelectTrigger>
                        <SelectContent>{sizes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Special Size</Label>
                      <Input value={entry.specialSize} onChange={e => updateEntry(entry.id, { specialSize: e.target.value })} placeholder="Optional" className="h-10" />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Total Parts *</Label>
                      <Input type="number" min={1} value={entry.totalParts} onChange={e => updateEntry(entry.id, { totalParts: e.target.value })} className="h-10" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Rejection</Label>
                      <Input type="number" min={0} value={entry.rejection} onChange={e => updateEntry(entry.id, { rejection: e.target.value })} className="h-10" />
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">OK Parts: <span className="font-medium">{okParts}</span></div>
                </CardContent>
              </Card>
            );
          })}
          <div className="flex flex-col sm:flex-row flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={addEntry} className="h-11 w-full sm:w-auto"><Plus className="w-4 h-4 mr-1" /> Add Entry</Button>
            <Button type="button" onClick={startReview} className="h-11 w-full sm:w-auto bg-green-600 hover:bg-green-700" disabled={!canSubmit}><Eye className="w-4 h-4 mr-1" /> Review</Button>
            <Button type="button" onClick={directSubmit} className="h-11 w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:opacity-50" disabled={!canSubmit || isSubmitting}><CheckCircle2 className="w-4 h-4 mr-1" /> {isSubmitting ? 'Submitting…' : 'Submit'}</Button>
            <Button type="button" variant="outline" onClick={onComplete} className="h-11 w-full sm:w-auto">Cancel</Button>
          </div>
        </CardContent>
      </Card>

      {showReview && (
        <Card className="border-green-600/30 shadow-lg">
          <CardHeader className="flex flex-row justify-between items-center">
            <div>
              <CardTitle>Review Batch</CardTitle>
              <CardDescription>Job Type: {jobType}</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowReview(false)}><EyeOff className="w-4 h-4" /></Button>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[420px] overflow-y-auto">
            {entries.map((e, i) => {
              const total = parseInt(e.totalParts || '0') || 0;
              const rej = parseInt(e.rejection || '0') || 0;
              const ok = Math.max(0, total - rej);
              return (
                <div key={e.id} className="border rounded-md p-3 text-sm flex flex-col gap-1">
                  <div className="flex justify-between"><span className="font-medium">#{i + 1} {e.selectedItem || '—'}</span><span>{total} parts</span></div>
                  <div className="grid sm:grid-cols-2 gap-2 text-xs">
                    <div>Size: {e.partSize || '—'}</div>
                    <div>Sp.Size: {e.specialSize || '—'}</div>
                    <div>Rejection: {rej}</div>
                    <div>OK: {ok}</div>
                    {OPERATION_OPTIONS[jobType]?.length > 0 && <div className="sm:col-span-2">Operation: {e.operation || '—'}</div>}
                  </div>
                </div>
              );
            })}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button onClick={confirmSubmit} className="flex-1 h-11 bg-green-600 hover:bg-green-700"><CheckCircle2 className="w-4 h-4 mr-1" /> Confirm Submit</Button>
              <Button variant="outline" onClick={() => setShowReview(false)} className="flex-1 h-11">Back</Button>
            </div>
          </CardContent>
        </Card>
      )}
      {/* Sticky mobile action bar removed per user request */}
    </div>
  );
}
export default MultiWorkBatchForm;
