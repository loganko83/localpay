import { ThemeConfig, UserType } from '../types';

export const themes: Record<UserType, ThemeConfig> = {
  consumer: {
    primary: '#ed2630',
    primaryDark: '#c41e25',
    background: '#221011',
    surface: '#2a1617',
    surfaceHighlight: '#3a2627',
    textPrimary: '#ffffff',
    textSecondary: '#a88889',
    textMuted: '#6a5556',
  },
  merchant: {
    primary: '#13ec5b',
    primaryDark: '#0fc94d',
    background: '#102216',
    surface: '#1c271f',
    surfaceHighlight: '#2a3830',
    textPrimary: '#ffffff',
    textSecondary: '#5c7263',
    textMuted: '#3d4d42',
  },
  admin: {
    primary: '#2b8cee',
    primaryDark: '#2270c4',
    background: '#101922',
    surface: '#1c242c',
    surfaceHighlight: '#2a3540',
    textPrimary: '#ffffff',
    textSecondary: '#5c6a7a',
    textMuted: '#3d4855',
  },
};

export const getTheme = (userType: UserType): ThemeConfig => {
  return themes[userType];
};

export const applyTheme = (userType: UserType): void => {
  const theme = themes[userType];
  const root = document.documentElement;

  root.style.setProperty('--color-primary', theme.primary);
  root.style.setProperty('--color-primary-dark', theme.primaryDark);
  root.style.setProperty('--color-background', theme.background);
  root.style.setProperty('--color-surface', theme.surface);
  root.style.setProperty('--color-surface-highlight', theme.surfaceHighlight);
  root.style.setProperty('--color-text-primary', theme.textPrimary);
  root.style.setProperty('--color-text-secondary', theme.textSecondary);
  root.style.setProperty('--color-text-muted', theme.textMuted);
};
