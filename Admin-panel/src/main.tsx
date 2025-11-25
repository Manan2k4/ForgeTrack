
  import { createRoot } from "react-dom/client";
  import App from "./App";
  import "./index.css";
  
    // Register service worker with auto-update
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(registration => {
            // Check for updates every 60 seconds
            setInterval(() => {
              registration.update();
            }, 60000);
            
            // Prompt user when new service worker is waiting
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // New service worker available, prompt user
                    if (confirm('New version available! Click OK to update.')) {
                      newWorker.postMessage({ type: 'SKIP_WAITING' });
                      window.location.reload();
                    }
                  }
                });
              }
            });
          })
          .catch(err => {
            console.error('SW registration failed:', err);
          });
      });
    }

  createRoot(document.getElementById("root")!).render(<App />);
  