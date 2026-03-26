import fs from 'node:fs';
import path from 'node:path';

export interface Settings {
  telegram: { enabled: boolean; botToken: string; chatId: string };
  discord: { enabled: boolean; webhookUrl: string };
  customWebhook: { enabled: boolean; url: string; secret: string };
  monitor: { intervalSeconds: number; running: boolean };
}

const SETTINGS_PATH = path.join(process.cwd(), 'server', 'data', 'settings.json');

export const getSettings = (): Settings => {
  if (!fs.existsSync(SETTINGS_PATH)) {
    return {
      telegram: { enabled: false, botToken: '', chatId: '' },
      discord: { enabled: false, webhookUrl: '' },
      customWebhook: { enabled: false, url: '', secret: '' },
      monitor: { intervalSeconds: 60, running: false }
    };
  }
  const data = fs.readFileSync(SETTINGS_PATH, 'utf-8');
  return JSON.parse(data) as Settings;
};

export const saveSettings = (newSettings: Partial<Settings>) => {
  const current = getSettings();
  const updated = { ...current, ...newSettings };
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(updated, null, 2), 'utf-8');
};
