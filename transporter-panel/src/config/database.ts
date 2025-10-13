// Transporter Panel Database Config (mirrors Worker-panel)
interface DatabaseConfig {
  apiBaseUrl: string;
}

const config: DatabaseConfig = {
  apiBaseUrl: (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api',
};

export const buildUrl = (endpoint: string): string => `${config.apiBaseUrl}${endpoint}`;

export const checkDatabaseConnection = async (): Promise<boolean> => {
  try {
    const resp = await fetch(buildUrl('/health'));
    if (!resp.ok) return false;
    const data = await resp.json().catch(() => null);
    return data?.db === 'connected';
  } catch {
    return false;
  }
};
