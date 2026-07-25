import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeToggle } from './ThemeToggle';

/**
 * Przełącznik trybu. Etykieta MUSI opisywać akcję (co zrobi kliknięcie), a
 * ikona — tryb AKTUALNY, spójnie z Icon.tsx (słońce = jasny, księżyc = ciemny)
 * i useThemeMode (domyślnie ciemny). Test pilnuje mapowania tryb→(etykieta,
 * ikona) i samego przełączania z zapisem, żeby przypadkowe odwrócenie któregoś
 * (a komentarz w komponencie kiedyś kłamał o ikonie) wywaliło się tutaj.
 */

const MOON_D_PREFIX = 'M20 14.5'; // Icon.tsx: księżyc
const SUN_D_PREFIX = 'M12 7a5'; // Icon.tsx: słońce

const iconPath = () =>
  document.querySelector('button svg path')?.getAttribute('d') ?? '';

beforeEach(() => {
  localStorage.clear();
});

describe('ThemeToggle', () => {
  it('domyślnie ciemny: księżyc + „Włącz tryb jasny"', () => {
    render(<ThemeToggle />);
    expect(screen.getByRole('button', { name: 'Włącz tryb jasny' })).toBeDefined();
    expect(iconPath().startsWith(MOON_D_PREFIX)).toBe(true);
  });

  it('kliknięcie przełącza na jasny: słońce + „Włącz tryb ciemny", z zapisem', () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('button', { name: 'Włącz tryb jasny' }));

    expect(screen.getByRole('button', { name: 'Włącz tryb ciemny' })).toBeDefined();
    expect(iconPath().startsWith(SUN_D_PREFIX)).toBe(true);
    expect(localStorage.getItem('eter11:theme-mode')).toBe('light');
  });

  it('wariant inline to sam przycisk, bez pływającej otoczki', () => {
    const { container } = render(<ThemeToggle variant="inline" />);
    // Brak pozycjonowanej otoczki `fixed` — inline wstawia się w pasek.
    expect(container.querySelector('.fixed')).toBeNull();
    expect(screen.getByRole('button', { name: 'Włącz tryb jasny' })).toBeDefined();
  });
});
