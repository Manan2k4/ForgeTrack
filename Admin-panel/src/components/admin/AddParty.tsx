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
import { Plus, Edit, Trash2, Users } from 'lucide-react';
import { apiService } from '../../services/api';

interface Party { id: string; _id?: string; partyType: string; partyName: string; createdAt: string; }

const PARTY_TYPES = [
  { value: 'outside-rod', label: 'Outside Rod' },
  { value: 'outside-pin', label: 'Outside Pin' },
  { value: 'outside-sleeve', label: 'Outside Sleeve' },
];

export function AddParty() {
  const [parties, setParties] = useState<Party[]>([]);
  const [form, setForm] = useState({ partyType: '', partyName: '' });
  const [editing, setEditing] = useState<Party | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const resp = await apiService.getParties();
      const list = (resp.data || []).map((p: any) => ({ id: p._id || p.id, partyType: p.partyType, partyName: p.partyName, createdAt: p.createdAt }));
      setParties(list);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load parties');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.partyType) return toast.error('Select a party type');
    if (!form.partyName.trim()) return toast.error('Enter party name');
    try {
      await apiService.createParty({ partyType: form.partyType, partyName: form.partyName.trim() });
      toast.success('Party added');
      setForm({ partyType: '', partyName: '' });
      await load();
    } catch (e: any) { toast.error(e?.message || 'Failed to add party'); }
  };

  const openEdit = (p: Party) => { setEditing(p); setIsEditOpen(true); };

  const saveEdit = async () => {
    if (!editing) return;
    try {
      await apiService.updateParty(editing.id, { partyType: editing.partyType, partyName: editing.partyName });
      toast.success('Party updated');
      setEditing(null); setIsEditOpen(false);
      await load();
    } catch (e: any) { toast.error(e?.message || 'Failed to update party'); }
  };

  const deleteParty = async (id: string) => {
    try {
      await apiService.deleteParty(id);
      toast.success('Party deleted');
      await load();
    } catch (e: any) { toast.error(e?.message || 'Failed to delete party'); }
  };

  const renderGroupedTables = () => {
    return (
      <div className="grid gap-6 lg:grid-cols-3">
        {PARTY_TYPES.map(type => {
          const group = parties.filter(p => p.partyType === type.value);
          return (
            <Card key={type.value}>
              <CardHeader>
                <CardTitle>{type.label} Parties</CardTitle>
                <CardDescription>Manage {type.label.toLowerCase()} parties</CardDescription>
              </CardHeader>
              <CardContent>
                {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
                {!loading && group.length === 0 && <p className="text-sm text-muted-foreground">No parties added yet.</p>}
                {group.length > 0 && (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Party Name</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.map(p => {
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
                          <TableRow key={p.id}>
                            <TableCell>{p.partyName}</TableCell>
                            <TableCell>{formatDateDMY(p.createdAt)}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => openEdit(p)}><Edit className="w-4 h-4" /></Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="outline" size="sm"><Trash2 className="w-4 h-4" /></Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Party</AlertDialogTitle>
                                      <AlertDialogDescription>Are you sure? This action cannot be undone.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => deleteParty(p.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
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
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><Users className="w-5 h-5" /><div><CardTitle>Add Party</CardTitle><CardDescription>Create new transporter party</CardDescription></div></div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="partyType">Party Type</Label>
              <Select value={form.partyType} onValueChange={(v) => setForm(f => ({ ...f, partyType: v }))}>
                <SelectTrigger><SelectValue placeholder="Select party type" /></SelectTrigger>
                <SelectContent>
                  {PARTY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="partyName">Party Name</Label>
              <Input id="partyName" value={form.partyName} onChange={e => setForm(f => ({ ...f, partyName: e.target.value }))} placeholder="Enter party name" />
            </div>
            {form.partyType && <Button type="submit" className="w-full"><Plus className="w-4 h-4 mr-2" />Add Party</Button>}
          </form>
        </CardContent>
      </Card>
      {renderGroupedTables()}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Party</DialogTitle><DialogDescription>Update party details</DialogDescription></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Party Type</Label>
                <Select value={editing.partyType} onValueChange={(v) => setEditing(e => e ? { ...e, partyType: v } : e)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PARTY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Party Name</Label>
                <Input value={editing.partyName} onChange={(e) => setEditing(ed => ed ? { ...ed, partyName: e.target.value } : ed)} />
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
