import type { CardCategory, ProblemType, SlotKey } from '../../engine/types';

export function categoryLabel(category: CardCategory): string {
  const labels: Record<CardCategory, string> = {
    psychological: 'Psychologiczna',
    digital: 'Cyfrowa',
    social: 'Społeczna',
    talent: 'Talent',
    mentor: 'Mentor',
    eter11: 'ETER11',
    blackswan: 'Czarny Łabędź',
  };
  return labels[category];
}

export function categoryColorVar(category: CardCategory): string {
  return `var(--eter-cat-${category})`;
}

/** Pełna etykieta ścianki — używana w opisach i panelu. */
export function slotLabel(slot: SlotKey): string {
  const labels: Record<SlotKey, string> = {
    psychological: 'Psychologiczna',
    digital: 'Cyfrowa',
    social: 'Społeczna',
    mentorTalent: 'Mentor lub talent',
  };
  return labels[slot];
}

export function slotIcon(slot: SlotKey): string {
  const icons: Record<SlotKey, string> = {
    psychological: '🧠',
    digital: '💻',
    social: '🤝',
    mentorTalent: '⭐',
  };
  return icons[slot];
}

export function slotColorVar(slot: SlotKey): string {
  if (slot === 'mentorTalent') return 'var(--eter-cat-mentor)';
  return `var(--eter-cat-${slot})`;
}

export function problemTypeLabel(type: ProblemType): string {
  const labels: Record<ProblemType, string> = {
    action: 'Działanie',
    thinking: 'Myślenie',
    cooperation: 'Współpraca',
    selfchange: 'Zmiana w sobie',
  };
  return labels[type];
}

export function problemTypeColorVar(type: ProblemType): string {
  return `var(--eter-type-${type})`;
}
