import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Wrench } from 'lucide-react';
import { apiService } from '../../services/api';

interface JobType { id: string; _id?: string; partType: string; jobName: string; createdAt: string; }

const PART_TYPES = [
  { value: 'sleeve', label: 'Sleeve' },
  { value: 'rod', label: 'Rod' },
  { value: 'pin', label: 'Pin' },
  { value: 'general', label: 'General Services' },
];

export function AddJobType() {
  const [jobTypes, setJobTypes] = useState<JobType[]>([]);
  const [form, setForm] = useState({ partType: '', jobName: '' });
  const [editing, setEditing] = useState<JobType | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const resp = await apiService.getJobTypes();
      const list = (resp.data || []).map((p: any) => ({ id: p._id || p.id, partType: p.partType, jobName: p.jobName, createdAt: p.createdAt }));
      setJobTypes(list);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load job types');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.partType) return toast.error('Select part type');
    if (!form.jobName.trim()) return toast.error('Enter job name');
    try {
      await apiService.createJobType({ partType: form.partType, jobName: form.jobName.trim() });
      toast.success('Job type added');
      setForm({ partType: '', jobName: '' });
      await load();
    } catch (e: any) { toast.error(e?.message || 'Failed to add job type'); }
  };

  const openEdit = (jt: JobType) => { setEditing(jt); setIsEditOpen(true); };

  const saveEdit = async () => {
    if (!editing) return;
    try {
      await apiService.updateJobType(editing.id, { partType: editing.partType, jobName: editing.jobName });
      toast.success('Job type updated');
      setEditing(null); setIsEditOpen(false);
      await load();
    } catch (e: any) { toast.error(e?.message || 'Failed to update job type'); }
  };

  const deleteJobType = async (id: string) => {
    try {
      await apiService.deleteJobType(id);
      toast.success('Job type deleted');
      await load();
    } catch (e: any) { toast.error(e?.message || 'Failed to delete job type'); }
  };

  const renderGroupedTables = () => (
    <div className="grid gap-6 lg:grid-cols-4">
      {PART_TYPES.map(type => {
        const group = jobTypes.filter(j => j.partType === type.value);
        return (
          <Card key={type.value}>
            <CardHeader>
              <CardTitle>{type.label} Job Types</CardTitle>
              <CardDescription>Manage {type.label.toLowerCase()} job types</CardDescription>
            </CardHeader>
            <CardContent>
              {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
              {!loading && group.length === 0 && <p className="text-sm text-muted-foreground">No job types added yet.</p>}
              {group.length > 0 && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Job Name</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.map(j => {
                        const formatDateDMY = (value: string) => {
                          if (!value) return '—';
                          const core = value.split('T')[0];
                          const parts = core.includes('-') ? core.split('-') : [];
                          if (parts.length === 3) {
                            const [y,m,d] = parts;
                            return `${d.padStart(2,'0')}/${m.padStart(2,'0')}/${y}`;
                          }
                          try {
                            const d = new Date(value);
                            const day = String(d.getDate()).padStart(2,'0');
                            const month = String(d.getMonth()+1).padStart(2,'0');
                            const year = d.getFullYear();
                            if (!year || isNaN(year)) return value;
                            return `${day}/${month}/${year}`;
                          } catch { return value; }
                        };
                        return (
                        <TableRow key={j.id}>
                          <TableCell>{j.jobName}</TableCell>
                          <TableCell>{formatDateDMY(j.createdAt)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => openEdit(j)}><Edit className="w-4 h-4" /></Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm"><Trash2 className="w-4 h-4" /></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Job Type</AlertDialogTitle>
                                    <AlertDialogDescription>Are you sure? This action cannot be undone.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteJobType(j.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      )})}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><Wrench className="w-5 h-5" /><div><CardTitle>Add Job Type</CardTitle><CardDescription>Define available job types</CardDescription></div></div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="partType">Part Type</Label>
              <Select value={form.partType} onValueChange={(v) => setForm(f => ({ ...f, partType: v }))}>
                <SelectTrigger><SelectValue placeholder="Select part type" /></SelectTrigger>
                <SelectContent>{PART_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="jobName">Job Name</Label>
              <Input id="jobName" value={form.jobName} onChange={e => setForm(f => ({ ...f, jobName: e.target.value }))} placeholder="Enter job name" />
            </div>
            {form.partType && <Button type="submit" className="w-full"><Plus className="w-4 h-4 mr-2" />Add Job Type</Button>}
          </form>
        </CardContent>
      </Card>
      {renderGroupedTables()}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Job Type</DialogTitle><DialogDescription>Update job type details</DialogDescription></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Part Type</Label>
                <Select value={editing.partType} onValueChange={(v) => setEditing(e => e ? { ...e, partType: v } : e)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PART_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Job Name</Label>
                <Input value={editing.jobName} onChange={(e) => setEditing(ed => ed ? { ...ed, jobName: e.target.value } : ed)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditOpen(false); setEditing(null); }}>Cancel</Button>
            <Button onClick={saveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
