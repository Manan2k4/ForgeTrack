import React, { useEffect, useState } from 'react';
import { getApiBaseUrl } from '../config/database';
import databaseService from '../services/databaseService';

interface Status {
  isOnline: boolean;
  isDatabaseConnected: boolean;
}

export const DebugOverlay: React.FC = () => {
  const [open, setOpen] = useState<boolean>(() => localStorage.getItem('debugOverlay') === 'open');
  const [status, setStatus] = useState<Status>(databaseService.getConnectionStatus());
  const [tokenPresent, setTokenPresent] = useState<boolean>(!!localStorage.getItem('authToken'));
  const [userPresent, setUserPresent] = useState<boolean>(!!localStorage.getItem('currentUser'));
  const baseUrl = getApiBaseUrl();

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(databaseService.getConnectionStatus());
      setTokenPresent(!!localStorage.getItem('authToken'));
      setUserPresent(!!localStorage.getItem('currentUser'));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    localStorage.setItem('debugOverlay', next ? 'open' : 'closed');
  };

  return (
    <div style={{ position: 'fixed', top: 8, left: 8, zIndex: 9999, fontFamily: 'monospace' }}>
      <button
        onClick={toggle}
        style={{
          padding: '4px 8px',
          background: '#111827',
          color: '#F9FAFB',
          border: '1px solid #374151',
          borderRadius: 4,
          fontSize: 12,
          cursor: 'pointer'
        }}
      >{open ? 'Hide Debug' : 'Show Debug'}</button>
      {open && (
        <div style={{
          marginTop: 6,
          minWidth: 280,
          background: '#1F2937',
          color: '#F3F4F6',
          border: '1px solid #374151',
          borderRadius: 6,
          padding: '8px 10px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}>
          <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 6 }}>ForgeTrack Debug Overlay</div>
          <div style={{ fontSize: 12, lineHeight: '16px' }}>
            <div><strong>ENV:</strong> {import.meta.env.DEV ? 'development' : 'production'}</div>
            <div><strong>API Base:</strong> {baseUrl}</div>
            <div><strong>Online:</strong> {status.isOnline ? 'yes' : 'no'}</div>
            <div><strong>DB Connected:</strong> {status.isDatabaseConnected ? 'yes' : 'no'}</div>
            <div><strong>Auth Token:</strong> {tokenPresent ? 'present' : 'missing'}</div>
            <div><strong>User:</strong> {userPresent ? 'present' : 'missing'}</div>
            <div style={{ marginTop: 6, fontSize: 11, opacity: 0.7 }}>Toggle persists in localStorage.</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebugOverlay;