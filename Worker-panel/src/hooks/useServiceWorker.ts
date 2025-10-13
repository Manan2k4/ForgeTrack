import { useEffect } from 'react';
import { toast } from 'sonner';

export function useServiceWorker() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Register service worker for offline functionality
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration);
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  toast.info('App update available! Refresh to get the latest version.');
                }
              });
            }
          });
        })
        .catch((error) => {
          console.log('Service Worker registration failed:', error);
        });
    }
  }, []);
}