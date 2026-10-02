# Hotel SES - Design Principles & UI/UX Standards

This rule governs all frontend UI and UX development in the Hotel SES codebase. Every frontend component, page, layout, modal, and drawer must comply with these guidelines.

---

## 1. Skill Integration & Contextual Rules

When designing or refactoring UI components in Hotel SES:
- Reference `.agents/skills/taste-skill/SKILL.md` for anti-slop visual taste, typography restraint, and authentic layout structures.
- Reference `.agents/skills/redesign-skill/SKILL.md` for audits and surgical component upgrades.
- Reference `.agents/skills/web-design-guidelines/SKILL.md` for modern responsive web conventions and accessibility.

> **Context Override**: While `taste-skill` provides aesthetic restraint for public-facing experiences, Hotel SES is a **luxury hospitality operations management system** combining guest-facing excellence with high-efficiency staff workflows (Reception, Housekeeping, Maintenance, Management). High information density, quick actions, and data clarity take precedence over empty minimalist white space.

---

## 2. Aesthetic & Visual Foundation

- **Atmosphere**: Sophisticated, premium, and serene luxury hotel aesthetic.
- **Color Palette**:
  - **Background**: Deep Navy / Charcoal (`#070a0f`, `#0b0f17`, `#0f172a`).
  - **Surface & Cards**: Rich dark slate with subtle glassmorphism (`rgba(15, 23, 42, 0.75)` backdrop blur, crisp 1px borders `rgba(255, 255, 255, 0.07)` or subtle amber glow).
  - **Primary Brand Accent**: Warm Amber / Gold (`#d97706`, `#f59e0b`, `#fbbf24`) symbolizing luxury hospitality.
  - **Status Accents**:
    - Clean / Available / Confirmed: Emerald (`#10b981`)
    - Dirty / Occupied / Attention: Amber / Orange (`#f59e0b`)
    - Out of Order / Urgent / Arrears: Crimson / Rose (`#ef4444`)
    - Maintenance / In Progress: Cyan / Sky (`#0ea5e9`)
  - **Typography**: Clean, geometric sans-serif (Plus Jakarta Sans, Inter, Outfit). Solid, high-contrast text (`#f8fafc`, `#e2e8f0`, muted `#94a3b8`).

---

## 3. Strict Prohibitions (Anti-Slop Rules)

1. **NO Generic SaaS Gradients**: Never use purple-to-blue or neon rainbow gradients. Backgrounds must be solid luxury dark or subtle radial atmospheric glows.
2. **NO Text Gradients on Titles**: Keep typography solid, razor-sharp, and legible.
3. **NO Decorative Emojis in Headings**: Use clean Lucide icons or refined typographic badges instead of emojis (e.g., avoid "🧹 Housekeeping" or "🛎️ Reception"; use `<Sparkles className="w-5 h-5 text-amber-500" /> Housekeeping`).
4. **NO Inline Style Soup**: Avoid extensive inline `style={{ ... }}` objects. Utilize structured CSS classes, CSS variables, and cohesive utility classes.
5. **NO Unstyled Browser Defaults**: Custom-style all select dropdowns, inputs, date pickers, scrollbars, and modals to match the luxury dark theme.
6. **NO Generic 3-Card Columns**: Build purposeful operational layouts: split panels, searchable data tables, status boards, slide-out inspector drawers, and quick-filter tabs.

---

## 4. Mobile & Responsive Standards

- **Touch Targets**: Minimum 44x44px tap targets for mobile usability (housekeeping staff and managers often use tablets and phones).
- **Responsive Navigation**: Collapsible sidebar into a bottom navigation bar or smooth slide-out drawer on viewports `< 768px`.
- **Forms & Modals**: Full-width stacked inputs on mobile (`w-full`), responsive dialog sheets, and sticky action buttons at the bottom.
- **Horizontal Scroll Containment**: Tables and complex grids must either wrap cleanly into stacked cards or contain horizontal scroll without breaking page viewports.

---

## 5. Micro-Interactions & Feedback

- Buttons and interactive items must have clear hover, active, and focus-visible states.
- Transitions must be swift and smooth: `150ms` to `250ms` with `ease-out`.
- Provide instant optimistic UI feedback or loading skeletons during network requests.
