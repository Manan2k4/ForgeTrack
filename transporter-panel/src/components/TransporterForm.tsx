import React, { useEffect, useState } from 'react';
import { transporterService, TransportJob } from '../services/databaseService';
import { buildUrl } from '../config/database';
import { useAutoSave } from '../hooks/useAutoSave';
import { toast } from 'sonner';

interface Product { partName: string; type: string; }

export function TransporterForm({ employeeId, employeeName, onComplete }: { employeeId: string; employeeName: string; onComplete: () => void; }) {
  const [jobType, setJobType] = useState<TransportJob>('outside-rod');
  const [formData, setFormData] = useState({ partyName: '', partName: '', totalParts: '', rejection: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [connection, setConnection] = useState(transporterService.getConnectionStatus());
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Fixed dropdown options provided by user
  const PARTY_OPTIONS: Record<TransportJob, string[]> = {
    'outside-rod': [
      'PRINCE-OUT SIDE',
      'SIDHESAR GRINDING',
      'ARTI',
      'RAVI METAL',
      'MANSHU ROD THRU',
      'RAONK',
      'PRINCE-IN SIDE',
    ],
    'outside-pin': [
      'PRINCE-OUT SIDE',
      'MAA KRUPA',
      'CHIRAG PIN',
      'RAVI METAL',
      'VISHWASH',
      'PRINCE-IN SIDE',
    ],
  };

  const { clearSavedData } = useAutoSave({
    key: `transporterDraft_${employeeId}`,
    data: { jobType, ...formData },
    delay: 1200,
    shouldSave: (d) => Boolean(d?.partyName || d?.totalParts || d?.rejection),
  });

  useEffect(() => {
    const i = setInterval(() => setConnection(transporterService.getConnectionStatus()), 4000);
    return () => clearInterval(i);
  }, []);

  // Load products for rod/pin when jobType changes
  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoadingProducts(true);
      try {
        const mapType = jobType === 'outside-rod' ? 'rod' : 'pin';
        const token = localStorage.getItem('authToken');
        const resp = await fetch(buildUrl(`/products?type=${mapType}`), {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (resp.ok) {
          const json = await resp.json();
          const list = (json.data || []).filter((p: any) => p.partName);
          if (active) setProducts(list);
        } else if (active) {
          setProducts([]);
        }
      } catch {
        if (active) setProducts([]);
      } finally {
        if (active) setLoadingProducts(false);
        // Reset selected partName when switching type
        setFormData(d => ({ ...d, partName: '' }));
      }
    };
    load();
    return () => { active = false; };
  }, [jobType]);

  // Reset party name if current selection is not available for new job type
  useEffect(() => {
    if (!PARTY_OPTIONS[jobType].includes(formData.partyName)) {
      setFormData((d) => ({ ...d, partyName: '' }));
    }
  }, [jobType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const total = parseInt(formData.totalParts || '0', 10);
    const rej = parseInt(formData.rejection || '0', 10);
    if (!formData.partyName || !formData.partName || !total || total < 1) return;
    if (rej < 0 || rej > total) return;
    setIsSubmitting(true);
    try {
      await transporterService.saveTransportLog({
        employeeId,
        employeeName,
        jobType,
        partyName: formData.partyName.trim(),
        partName: formData.partName.trim(),
        totalParts: total,
        rejection: rej || 0,
        date: new Date().toISOString().split('T')[0],
      });
      clearSavedData();
      toast.success('Transporter log submitted');
      onComplete();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1">Job Type</label>
          <select value={jobType} onChange={(e) => setJobType(e.target.value as TransportJob)} className="input">
            <option value="outside-rod">Outside Rod</option>
            <option value="outside-pin">Outside Pin</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Party Name</label>
          <select
            className="input"
            value={formData.partyName}
            onChange={(e) => setFormData({ ...formData, partyName: e.target.value })}
          >
            <option value="" disabled>Select party</option>
            {PARTY_OPTIONS[jobType].map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Part Name</label>
          <select
            className="input"
            value={formData.partName}
            onChange={(e) => setFormData({ ...formData, partName: e.target.value })}
            disabled={loadingProducts || products.length === 0}
          >
            <option value="" disabled>Select part</option>
            {products.map((p) => (
              <option key={p.partName} value={p.partName}>{p.partName}</option>
            ))}
          </select>
          {loadingProducts && <p className="text-xs text-gray-500 mt-1">Loading parts...</p>}
          {!loadingProducts && products.length === 0 && <p className="text-xs text-orange-600 mt-1">No parts available for this type</p>}
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm mb-1">Total Parts</label>
          <input className="input" type="number" min={1} value={formData.totalParts} onChange={(e) => setFormData({ ...formData, totalParts: e.target.value })} placeholder="e.g. 200" />
        </div>
        <div>
          <label className="block text-sm mb-1">Rejection</label>
          <input className="input" type="number" min={0} value={formData.rejection} onChange={(e) => setFormData({ ...formData, rejection: e.target.value })} placeholder="e.g. 2" />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-600">
          {connection.isDatabaseConnected ? 'Synced with server' : connection.isOnline ? 'Online, local mode' : 'Offline'}
      </div>
        <button type="submit" disabled={isSubmitting} className="btn">
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </button>
      </div>
    </form>
  );
}
