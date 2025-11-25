import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { apiService } from '../../services/api';
import { toDMY } from '../../utils/date';
import { toast } from 'sonner';
//

interface EmployeeOption { id: string; name: string; }

export function TransporterLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [parties, setParties] = useState<any[]>([]); // Store full party objects
  const [filters, setFilters] = useState({
    from: '',
    to: '',
    employee: 'all',
    jobType: 'all',
    partyName: 'all',
  });
  const DEFAULT_STATS = { totalLogs: 0, totalParts: 0, totalRejection: 0, uniquePartiesCount: 0 };
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<{ open: boolean; log?: any; saving: boolean }>({ open: false, log: undefined, saving: false });
  const [deleting, setDeleting] = useState<{ id?: string; confirming: boolean }>({ id: undefined, confirming: false });

  useEffect(() => {
    loadEmployees();
    loadParties();
    loadData();
  }, []);

  // SSE real-time subscription for transporter logs (admin monitoring)
  const transporterEsRef = useRef<EventSource | null>(null);
  useEffect(() => {
    if (transporterEsRef.current) return; // already connected
    // attempt token retrieval similar to work logs component
    const userData = localStorage.getItem('currentUser');
    let token: string | null = null;
    try { if (userData) token = JSON.parse(userData)?.token; } catch {}
    if (!token) token = localStorage.getItem('authToken');
    if (!token) return; // cannot subscribe without token
    const base = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const es = new EventSource(`${base}/transporter-logs/stream?token=${token}`);
    transporterEsRef.current = es;

    const applyRealtime = (eventType: string, payload: any) => {
      setLogs(prev => {
        if (eventType === 'created' && payload) {
          if (prev.some(l => (l.id || l._id) === payload.id)) return prev; // dedupe
          return [payload, ...prev];
        } else if (eventType === 'updated' && payload) {
          return prev.map(l => ((l.id || l._id) === payload.id ? { ...l, ...payload } : l));
        } else if (eventType === 'deleted' && payload?.id) {
          return prev.filter(l => (l.id || l._id) !== payload.id);
        }
        return prev;
      });
    };

    es.addEventListener('message', (evt: MessageEvent) => {
      try {
        const parsed = JSON.parse(evt.data);
        if (parsed.eventType === 'heartbeat') return; // ignore
        applyRealtime(parsed.eventType, parsed.data);
      } catch (e) {
        console.warn('Failed to process transporter SSE event', e);
      }
    });

    es.onerror = () => {
      es.close();
      transporterEsRef.current = null;
      // attempt reconnect after delay
      setTimeout(() => {
        if (!transporterEsRef.current) {
          // trigger effect re-run by calling loadData (ensures fresh baseline)
          loadData();
        }
      }, 5000);
    };

    return () => {
      es.close();
      transporterEsRef.current = null;
    };
  }, []);

  const loadEmployees = async () => {
    try {
      const resp = await apiService.getEmployees({ includeInactive: true });
      const list = Array.isArray(resp?.data) ? resp.data : [];
      console.log('All employees:', list);
      const transporterEmployees = list.filter((e: any) => {
        console.log(`Employee: ${e.name}, Department: ${e.department}`);
        return e.department === 'Transporter';
      });
      console.log('Filtered transporter employees:', transporterEmployees);
      const opts = transporterEmployees.map((e: any) => ({ id: e.id || e._id, name: e.name }));
      setEmployees(opts);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load employees');
    }
  };

  const loadParties = async () => {
    try {
      const resp = await apiService.getParties();
      const list = Array.isArray(resp?.data) ? resp.data : [];
      console.log('All parties loaded:', list);
      list.forEach((p: any) => {
        console.log(`Party: ${p.partyName}, Type: ${p.partyType}`);
      });
      setParties(list); // Store full party objects with partyType and partyName
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load parties');
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const listResp = await apiService.getTransporterLogs({
        from: filters.from || undefined,
        to: filters.to || undefined,
        employee: filters.employee !== 'all' ? filters.employee : undefined,
        jobType: filters.jobType !== 'all' ? filters.jobType : undefined,
        partyName: filters.partyName !== 'all' ? filters.partyName : undefined,
      });
      const newLogs = Array.isArray(listResp?.data) ? listResp.data : [];
      setLogs(newLogs);

      // Compute unique parties from the fetched list
      const partiesSet = new Set<string>();
      newLogs.forEach((l: any) => { if (l?.partyName) partiesSet.add(String(l.partyName)); });
      const uniquePartiesCount = partiesSet.size;

      const statsResp = await apiService.getTransporterStats({
        from: filters.from || undefined,
        to: filters.to || undefined,
        employee: filters.employee !== 'all' ? filters.employee : undefined,
        partyName: filters.partyName !== 'all' ? filters.partyName : undefined,
        ...(filters.jobType !== 'all' ? { jobType: filters.jobType } : {}),
      });
      const serverStats: any = statsResp?.data || {};
      setStats({
        totalLogs: Number(serverStats.totalLogs) || 0,
        totalParts: Number(serverStats.totalParts) || 0,
        totalRejection: Number(serverStats.totalRejection) || 0,
        uniquePartiesCount,
      });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load transporter logs');
    } finally {
      setLoading(false);
    }
  };

  // Recompute stats when logs change via SSE (approximate; keeps parties count fresh)
  useEffect(() => {
    if (loading) return; // avoid flicker during bulk load
    const partiesSet = new Set<string>();
    logs.forEach((l: any) => { if (l?.partyName) partiesSet.add(String(l.partyName)); });
    const uniquePartiesCount = partiesSet.size;
    const totalLogs = logs.length;
    const totalParts = logs.reduce((sum, l: any) => sum + Number(l.totalParts || 0), 0);
    const totalRejection = logs.reduce((sum, l: any) => sum + Number(l.rejection || 0), 0);
    setStats(prev => ({ ...prev, uniquePartiesCount, totalLogs, totalParts, totalRejection }));
  }, [logs]);

  // Reset party filter when job type changes (smart filtering)
  useEffect(() => {
    setFilters(prev => ({ ...prev, partyName: 'all' }));
  }, [filters.jobType]);

  const uniqueParties = useMemo(() => {
    console.log('uniqueParties calculation - filters.jobType:', filters.jobType);
    console.log('uniqueParties calculation - all parties:', parties);
    
    // Filter parties by selected job type (smart filtering)
    let filteredParties = parties;
    if (filters.jobType !== 'all') {
      filteredParties = parties.filter((p: any) => {
        console.log(`Comparing party ${p.partyName}: partyType="${p.partyType}" vs jobType="${filters.jobType}"`);
        return p.partyType === filters.jobType;
      });
      console.log('Filtered parties after job type match:', filteredParties);
    }
    
    // Combine filtered parties with any custom parties from logs (also filter by job type)
    const set = new Set<string>(filteredParties.map((p: any) => p.partyName));
    logs.forEach((l) => {
      if (l.partyName && (filters.jobType === 'all' || l.jobType === filters.jobType)) {
        set.add(l.partyName);
      }
    });
    const result = Array.from(set).sort();
    console.log('Final unique parties:', result);
    return result;
  }, [logs, parties, filters.jobType]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Transporter Logs</CardTitle>
          <CardDescription>Track outside job work for rod/pin with rejections</CardDescription>
        </CardHeader>
  <CardContent className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
            <div className="w-full">
              <label className="block text-sm mb-1">From</label>
              <Input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
            </div>
            <div className="w-full">
              <label className="block text-sm mb-1">To</label>
              <Input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
            </div>
            <div className="w-full">
              <label className="block text-sm mb-1">Employee</label>
              <Select value={filters.employee} onValueChange={(v) => setFilters({ ...filters, employee: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full">
              <label className="block text-sm mb-1">Job Type</label>
              <Select value={filters.jobType} onValueChange={(v) => setFilters({ ...filters, jobType: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="outside-sleeve">Outside Sleeve</SelectItem>
                  <SelectItem value="outside-rod">Outside Rod</SelectItem>
                  <SelectItem value="outside-pin">Outside Pin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full">
              <label className="block text-sm mb-1">Party</label>
              <Select value={filters.partyName} onValueChange={(v) => setFilters({ ...filters, partyName: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {uniqueParties.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-1 flex gap-2 justify-end">
              <Button onClick={loadData} disabled={loading}>Apply Filters</Button>
              <Button
                variant="outline"
                onClick={() => { setFilters({ from: '', to: '', employee: 'all', jobType: 'all', partyName: 'all' }); setTimeout(loadData, 0); }}
              >
                Reset
              </Button>
            </div><br />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex h-10 items-center gap-2 rounded-md border bg-muted px-4">
              <span className="text-xl font-semibold leading-none">{stats.totalLogs}</span>
              <span className="text-sm text-muted-foreground">Logs</span>
            </div>
            <div className="inline-flex h-10 items-center gap-2 rounded-md border bg-muted px-4">
              <span className="text-xl font-semibold leading-none">{stats.totalParts}</span>
              <span className="text-sm text-muted-foreground">Parts</span>
            </div>
            <div className="inline-flex h-10 items-center gap-2 rounded-md border bg-muted px-4">
              <span className="text-xl font-semibold leading-none">{stats.totalRejection}</span>
              <span className="text-sm text-muted-foreground">Rejection</span>
            </div>
            <div className="inline-flex h-10 items-center gap-2 rounded-md border bg-muted px-4">
              <span className="text-xl font-semibold leading-none">{stats.uniquePartiesCount}</span>
              <span className="text-sm text-muted-foreground">Parties</span>
            </div>
          </div><br />

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Job Type</TableHead>
                  <TableHead>Party</TableHead>
                  <TableHead>Part Name</TableHead>
                  <TableHead>Total Parts</TableHead>
                  <TableHead>Rejection</TableHead>
                  <TableHead>Ok Parts</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log, idx) => (
                  <TableRow key={log?.id || log?._id || idx}>
                    <TableCell>{toDMY(log?.date || log?.workDate || (log?.timestamp ? String(log.timestamp).slice(0, 10) : undefined)) || '—'}</TableCell>
                    <TableCell>{log?.employeeName || log?.employee?.name || '—'}</TableCell>
                    <TableCell>
                      {log?.jobType === 'outside-sleeve' ? 'Outside Sleeve' : 
                       log?.jobType === 'outside-rod' ? 'Outside Rod' : 
                       log?.jobType === 'outside-pin' ? 'Outside Pin' : log?.jobType}
                    </TableCell>
                    <TableCell>{log?.partyName || '—'}</TableCell>
                    <TableCell>{log?.partName || '—'}</TableCell>
                    <TableCell>{Number(log?.totalParts ?? log?.quantity ?? 0)}</TableCell>
                    <TableCell>{Number(log?.rejection ?? 0)}</TableCell>
                    <TableCell>{Math.max(0, Number(log?.totalParts ?? log?.quantity ?? 0) - Number(log?.rejection ?? 0))}</TableCell>
                    <TableCell className="space-x-2">
                      <Button size="sm" variant="outline" onClick={() => setEditing({ open: true, log, saving: false })}>Edit</Button>&nbsp;
                      <Button size="sm" variant="destructive" onClick={() => setDeleting({ id: log.id || log._id, confirming: true })}>Delete</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={editing.open} onOpenChange={(open) => setEditing(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Transporter Log</DialogTitle>
          </DialogHeader>
          {editing.log && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Job Type</label>
                <select
                  className="border rounded-md h-10 px-3 w-full"
                  defaultValue={editing.log.jobType}
                  onChange={(e) => setEditing(prev => ({ ...prev, log: { ...prev.log, jobType: e.target.value } }))}
                >
                  <option value="outside-sleeve">Outside Sleeve</option>
                  <option value="outside-rod">Outside Rod</option>
                  <option value="outside-pin">Outside Pin</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Party</label>
                <input
                  type="text"
                  className="border rounded-md h-10 px-3 w-full"
                  defaultValue={editing.log.partyName}
                  onChange={(e) => setEditing(prev => ({ ...prev, log: { ...prev.log, partyName: e.target.value } }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Part Name</label>
                <input
                  type="text"
                  className="border rounded-md h-10 px-3 w-full"
                  defaultValue={editing.log.partName}
                  onChange={(e) => setEditing(prev => ({ ...prev, log: { ...prev.log, partName: e.target.value } }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Total Parts</label>
                <input
                  type="number"
                  className="border rounded-md h-10 px-3 w-full"
                  defaultValue={Number(editing.log.totalParts ?? editing.log.quantity ?? 0)}
                  min={1}
                  onChange={(e) => setEditing(prev => ({ ...prev, log: { ...prev.log, totalParts: Number(e.target.value) } }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Rejection</label>
                <input
                  type="number"
                  className="border rounded-md h-10 px-3 w-full"
                  defaultValue={Number(editing.log.rejection ?? 0)}
                  min={0}
                  onChange={(e) => setEditing(prev => ({ ...prev, log: { ...prev.log, rejection: Number(e.target.value) } }))}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing({ open: false, log: undefined, saving: false })}>Cancel</Button>
            <Button
              onClick={async () => {
                if (!editing.log) return;
                try {
                  setEditing(prev => ({ ...prev, saving: true }));
                  const id = editing.log.id || editing.log._id;
                  await apiService.updateTransporterLog(id, {
                    jobType: editing.log.jobType,
                    partyName: editing.log.partyName,
                    totalParts: Number(editing.log.totalParts ?? editing.log.quantity ?? 0),
                    rejection: Number(editing.log.rejection ?? 0),
                  });
                  toast.success('Transporter log updated');
                  setEditing({ open: false, log: undefined, saving: false });
                  await loadData();
                } catch (err: any) {
                  toast.error(err?.message || 'Failed to update');
                  setEditing(prev => ({ ...prev, saving: false }));
                }
              }}
              disabled={editing.saving}
            >
              {editing.saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleting.confirming} onOpenChange={(open) => setDeleting(prev => ({ ...prev, confirming: open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Transporter Log</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete this transporter log? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting({ id: undefined, confirming: false })}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!deleting.id) return;
                try {
                  await apiService.deleteTransporterLog(deleting.id);
                  toast.success('Transporter log deleted');
                  setDeleting({ id: undefined, confirming: false });
                  await loadData();
                } catch (err: any) {
                  toast.error(err?.message || 'Failed to delete');
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
