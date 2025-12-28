export const theme = {
    bg: '#111111',
    card: '#1a1a1a',
    cardHover: '#222222',
    border: '#2a2a2a',
    accent: '#ff4757',
    accentSoft: 'rgba(255,71,87,0.15)',
    text: '#ffffff',
    textSecondary: '#888888',
    textMuted: '#555555',
    merchant: '#10b981',
    admin: '#3b82f6',
} as const;

export type Theme = typeof theme;
