'use client';
import { createContext, useContext } from 'react';
import type { Advice, Location, Plan, Scenario, Snapshot } from './core';
import type { AppData } from './model';
export type AppContextValue = {
  data: AppData; route: string; now: number; activePlan: Plan | null; weather: Snapshot | null; planWeather: Snapshot | null; advice: Advice | null;
  loading: string[]; storageError: boolean; scenario: Scenario | null; scenarioSnapshot: Snapshot | null;
  t: (zh: string, en: string) => string;
  go: (route: string) => void; back: (fallback?: string) => void;
  commit: (patch: Partial<AppData>, success?: string) => boolean;
  emit: (name: string, properties?: Record<string, unknown>) => void;
  toast: (message: string) => void; refresh: (location?: Location) => Promise<void>;
  pickLocation: (location: Location) => void; setScenario: (value: Scenario | null) => void;
  savePlan: (plan: Plan) => boolean;
  decide: (action: 'accept' | 'keep' | 'indoor', expectedAdvice: Advice) => void;
  download: (name: string, mime: string, content: string) => void;
  askNotifications: () => Promise<void>;
};
export const AppContext = createContext<AppContextValue | null>(null);
export function useApp() { const value = useContext(AppContext); if (!value) throw Error('App context unavailable'); return value; }
declare global {
  interface Window {
    WeatherNative?: { isNative?: boolean; version?: string; requestNotifications(): void; notify(title: string, body: string): void; saveFile(name: string, mime: string, base64: string): void; requestLocation(): void; setLanguage(language: string): void };
    __weatherBack?: () => boolean;
  }
}
