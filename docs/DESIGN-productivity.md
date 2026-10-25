---
name: Modern Productivity Workspace
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#464555'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#005338'
  on-tertiary: '#ffffff'
  tertiary-container: '#006e4b'
  on-tertiary-container: '#67f4b7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.025em
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.005em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-xs:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.02em
  code:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 1.5rem
  space-xxs: 0.125rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
  space-2xl: 2rem
---

## Brand & Style

The design system establishes a high-performance productivity environment tailored for deep work, rapid triage, and high-density task orchestration. The visual language conveys precision, velocity, focus, and quiet confidence.

### Principles
- **Cognitive Clarity:** Eliminate non-essential ornamentation to surface actionable tasks, states, and data immediately.
- **Instrument Precision:** Every component mirrors the ergonomics of a professional desktop utility—fast, keyboard-accessible, and space-efficient.
- **Architectural Hierarchy:** Structured split panels, sidebars, and nested task boards organize complex workloads without clutter.
- **Tactile Restraint:** Surfaces layer through subtle neutral borders and delicate ambient elevation rather than heavy drop shadows or intrusive colors.

## Colors

The palette balances deep slate foundations with focused chromatic accents to ensure sustained legibility across long work sessions.

### Application Rules
- **Primary Accent (`#4F46E5` / `#6366F1`):** Reserved for primary interactive elements, selection rings, bulk action triggers, active tab indicators, and critical callouts. Never used for passive content.
- **Canvas & Neutrals:**
  - Base canvas: `#F8FAFC`
  - Elevated surfaces (cards, panels, modals): `#FFFFFF`
  - Text primary: `#0F172A`
  - Text secondary: `#334155`
  - Text muted / placeholder: `#64748B`
  - Structural hairline dividers: `#E2E8F0`
- **Semantic Accents:**
  - **Success / Done:** `#10B981` (tint: `#ECFDF5`, border: `#A7F3D0`)
  - **In-Progress / Warning:** `#F59E0B` (tint: `#FFFBEB`, border: `#FDE68A`)
  - **Urgent / Destructive:** `#F43F5E` (tint: `#FFF1F2`, border: `#FECDD3`)

## Typography

The type scale combines the structural, human geometry of **Plus Jakarta Sans** for framing headings with the dense mechanical clarity of **Inter** for tables, multi-column task boards, status indicators, and microcopy.

- **Tabular Figures:** Always apply `font-variant-numeric: tabular-nums` to financial data, counters, time trackers, and kanban metrics.
- **Optical Hierarchy:** Use `label-xs` in uppercase (`letterSpacing: 0.04em`) exclusively for column tags, table headers, and metadata badges.
- **Line Heights:** Tightly disciplined line heights avoid bloated table rows and keep split-screen dashboards compact.

## Layout & Spacing

Layouts adhere to an absolute 4px/8px incremental grid designed for dense web workspaces.

### Structural Model
- **Application Shell:** Three-tier multi-pane layout:
  1. Primary Nav Sidebar: Fixed 240px (collapsible to 64px icon rail).
  2. Secondary Context / Sub-Navigation Panel: Fixed 280px (collapsible).
  3. Main Fluid Workspace: Fluid min-width with adaptive scroll containers.
- **Responsive Adaptations:**
  - **Desktop (>= 1280px):** Multi-pane split view open simultaneously; 24px margins, 16px kanban column gaps.
  - **Tablet (768px – 1279px):** Context panel slides into a sheet; main workspace scrolls horizontally across boards.
  - **Mobile (< 768px):** Sidebars collapse into an off-canvas drawer; workspaces switch to single-column card flows with 16px edge padding.

## Elevation & Depth

Visual separation relies primarily on sharp tonal layering and 1px borders, reinforced with minimal, diffuse shadows to simulate clean desktop stacking.

### Layers
- **Base Canvas (Level 0):** `#F8FAFC` flat surface.
- **Surface Cards & Inset Panels (Level 1):** `#FFFFFF` with `border: 1px solid #E2E8F0` and `box-shadow: 0 1px 2px 0 rgba(15, 23, 42, 0.05)`.
- **Raised & Draggable Elements (Level 2):** Kanban cards on hover/drag use `box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.04)` with `#CBD5E1` border.
- **Floating Overlays & Popovers (Level 3):** Dropdown menus, toolbars, and filter trays use `box-shadow: 0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.03)` with `border: 1px solid #E2E8F0`.
- **Modals & Dialogs (Level 4):** `box-shadow: 0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.04)` over a backdrop tint of `rgba(15, 23, 42, 0.45)`.

## Shapes

The interface balances sharp productivity efficiency with modern tactility using balanced corner radii:

- **Inputs, Buttons, and Badges:** `rounded-md` (6px / 0.375rem) to maintain crisp alignment with adjacent text blocks.
- **Cards, Panels, and Containers:** `rounded-lg` (8px / 0.5rem) for clean framing without excessive dead space in corners.
- **Modals and Detached Trays:** `rounded-xl` (12px / 0.75rem).
- **Interactive Avatars & Status Dots:** Fully rounded (`rounded-full`).

## Components

### Buttons & Segmented Controls
- **Primary Button:** `#4F46E5` background, white text, 8px vertical / 14px horizontal padding, 6px radius. Focus ring: `0 0 0 2px #FFFFFF, 0 0 0 4px #4F46E5`.
- **Secondary Button:** White background, `#0F172A` text, 1px `#E2E8F0` border. Hover: `#F1F5F9`.
- **Ghost / Icon Button:** Transparent background, `#64748B` icon. Hover: `#F1F5F9` with `#0F172A` icon.
- **Segmented Control:** Enclosed container in `#F1F5F9` with 4px padding. Selected segment sits on a white elevated pill with a 1px `#E2E8F0` border and light ambient shadow.

### Inputs & Search Bars
- Standard input height: 36px.
- Background: `#FFFFFF`, border: `1px solid #CBD5E1`, text: `body-md`.
- Focus state: Border transitions to `#4F46E5` with `0 0 0 3px rgba(79, 70, 229, 0.15)`.

### Cards & Kanban Tiles
- Compact layout padding (`space-md`).
- Surface: `#FFFFFF` encased in a 1px `#E2E8F0` border.
- Cards host clear visual hierarchy: Top priority tag or project label (`label-xs`), title (`headline-sm`), task progress bar, assignee avatar, and footer meta stats.

### Badges & Status Chips
- Height: 20px or 24px, 6px horizontal padding.
- Structure: Light tinted background (10% opacity) with a solid text and matching 1px border.
  - Complete: Emerald tint (`#ECFDF5`), `#065F46` text.
  - In Progress: Amber tint (`#FFFBEB`), `#92400E` text.
  - Urgent: Rose tint (`#FFF1F2`), `#9F1239` text.

### Keyboard Shortcut Badges (`<kbd>`)
- 20px fixed height, minimum 20px width.
- Background `#F1F5F9`, border `1px solid #CBD5E1`, border-bottom-width 2px.
- Font: `code`, `#475569` text, monospace alignment.

### Data Tables & Lists
- Compact row height: 40px; standard row height: 48px.
- Row divider: 1px solid `#F1F5F9`.
- Row hover: `#F8FAFC`. Selected row: `#EEF2FF` with `#4F46E5` primary checkbox fill.