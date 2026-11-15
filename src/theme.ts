/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const theme = {
  colors: {
    primary: {
      deep: "var(--color-primary-deep)",      // Deep Lavender
      orchid: "var(--color-primary-orchid)",    // Soft Orchid
      lilac: "var(--color-primary-lilac)",     // Pale Lilac
      lightBg: "var(--color-primary-lightBg)",   // Pale Lilac Light Background
      darkPlum: "var(--color-primary-darkPlum)",  // Dark plum text / surface
      midnight: "var(--color-primary-midnight)",  // Rich Midnight Velvet Purple Background
    },
    accent: {
      violet: "var(--color-accent-violet)",    // Electric Violet
      magenta: "var(--color-accent-magenta)",   // Magenta-Pink
      cyan: "var(--color-accent-cyan)",      // Frozen Cyan
    }
  },
  gradients: {
    primary: "var(--gradient-primary)",
    primaryLight: "var(--gradient-primary-light)",
    accent: "var(--gradient-accent)",
    aurora: "var(--gradient-aurora)",
    glassBorder: "var(--gradient-glass-border)",
    glassBg: "var(--gradient-glass-bg)",
  },
  styles: {
    // Beautiful Frosted Glass Light & Dark panels with high-blur backdrop filter
    glassLight: "backdrop-blur-2xl bg-[var(--glass-light-bg)] border border-[var(--glass-light-border)] shadow-[var(--glass-light-shadow)] rounded-2xl",
    glassDark: "backdrop-blur-3xl bg-[var(--glass-dark-bg)] border border-[var(--glass-dark-border)] shadow-[var(--glass-dark-shadow)] rounded-3xl",
    glassInput: "bg-[var(--glass-input-bg)] border border-[var(--glass-input-border)] focus:bg-[var(--glass-input-bg-focus)] focus:border-[var(--glass-input-border-focus)] focus:ring-1 focus:ring-[var(--glass-input-ring-focus)] transition-all text-[var(--glass-input-text)] placeholder-[var(--glass-input-placeholder)]",
    buttonAccent: "bg-[var(--gradient-accent-btn)] hover:shadow-[var(--button-accent-hover-shadow)] active:scale-95 hover:brightness-110 transition-all text-[var(--button-accent-text)] font-bold tracking-wide shadow-md",
    buttonGlass: "backdrop-blur-md bg-[var(--button-glass-bg)] hover:bg-[var(--button-glass-bg-hover)] border border-[var(--button-glass-border)] active:scale-95 transition-all text-[var(--button-glass-text)] font-semibold",
    tagGlass: "backdrop-blur-md bg-[var(--tag-glass-bg)] border border-[var(--tag-glass-border)] px-3 py-1 rounded-full text-xs font-medium text-[var(--tag-glass-text)]",
  }
};
