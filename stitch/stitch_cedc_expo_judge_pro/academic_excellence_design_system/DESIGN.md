---
name: Academic Excellence Design System
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#4c4639'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#7e7668'
  outline-variant: '#cfc5b5'
  surface-tint: '#725c21'
  primary: '#725c21'
  on-primary: '#ffffff'
  primary-container: '#d4b773'
  on-primary-container: '#5c470e'
  inverse-primary: '#e1c37e'
  secondary: '#5e5e5e'
  on-secondary: '#ffffff'
  secondary-container: '#e2e2e2'
  on-secondary-container: '#646464'
  tertiary: '#006970'
  on-tertiary: '#ffffff'
  tertiary-container: '#78c7ce'
  on-tertiary-container: '#005358'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdf97'
  primary-fixed-dim: '#e1c37e'
  on-primary-fixed: '#251a00'
  on-primary-fixed-variant: '#58440a'
  secondary-fixed: '#e2e2e2'
  secondary-fixed-dim: '#c6c6c6'
  on-secondary-fixed: '#1b1b1b'
  on-secondary-fixed-variant: '#474747'
  tertiary-fixed: '#a0f0f7'
  tertiary-fixed-dim: '#84d3db'
  on-tertiary-fixed: '#002022'
  on-tertiary-fixed-variant: '#004f54'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-lg:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 32px
  xl: 48px
  container-margin: 24px
  gutter: 24px
---

## Brand & Style

This design system is engineered for the high-stakes environment of academic evaluation. It bridges the gap between institutional prestige and modern SaaS efficiency. The aesthetic is rooted in **Modern Corporate** principles with a strong lean towards **Material Design 3**, utilizing layered surfaces and meaningful motion to guide judges through complex evaluation workflows.

The visual narrative evokes:
- **Authority:** Through strong use of the CU Gold and Black primary palette.
- **Clarity:** High-contrast typography and expansive whitespace to reduce cognitive load during long judging sessions.
- **Reliability:** A structured grid and consistent component behavior that builds trust in the digital judging process.
- **Modernity:** Softened by 16-24px radiuses and subtle elevation, moving away from "legacy" institutional software toward a premium, tablet-first experience.

## Colors

The palette is anchored by the University's core identity, supported by a functional spectrum for data visualization and status tracking.

- **Primary (CU Gold):** Used for key branding, primary actions, and active states.
- **Secondary (Black):** Used for typography, sidebars, and high-impact headers to provide a "premium" weight.
- **Functional Accents:**
    - **Teal & Slate:** Used for organizational grouping and secondary navigation elements.
    - **Coral & Maroon:** Reserved for urgent statuses, deletions, or "incomplete" states.
    - **Burnt Orange:** Used for "In Progress" or "Partial" states.
- **Surface Strategy:** The system uses a multi-tone gray scale (White to #F8F9FA) to separate the background from interactive cards, ensuring the "Judge experience" feels layered and organized.

## Typography

The design system utilizes **Inter** exclusively to ensure maximum legibility across variable screen resolutions, particularly on tablets. 

- **Hierarchy:** We use a strict typographic scale where labels are often uppercase with slight tracking to differentiate them from body copy. 
- **Readability:** Body text is set with a generous line height (1.5x) to prevent judge fatigue during long-form project description reading. 
- **Accessibility:** Minimum font size for interactive labels is 14px to ensure tap targets are clear and legible for a diverse range of users.

## Layout & Spacing

The layout utilizes a **Fluid Grid** system designed for a "SaaS Dashboard" experience. 

- **Structure:** A fixed-width collapsible sidebar (280px expanded, 80px collapsed) anchors the left side, with a fluid main content area that adapts to tablet and desktop viewports.
- **Rhythm:** An 8px base grid governs all dimensions. Cards and data tables use `24px` internal padding (`spacing.md`) to maintain the "premium" airy feel.
- **Responsive Behavior:** 
    - **Desktop:** 12-column grid with 24px gutters.
    - **Tablet (Judge View):** 8-column grid. KPI cards reflow from a horizontal row to a 2x2 grid.
    - **Mobile:** 4-column grid. Sidebars transform into a bottom navigation bar or a full-screen drawer.

## Elevation & Depth

This design system uses **Tonal Layers** combined with **Ambient Shadows** to create a clear sense of hierarchy without the visual clutter of heavy borders.

1.  **Level 0 (Background):** Solid `#FFFFFF` or `#F8F9FA`.
2.  **Level 1 (Cards/Tables):** White background with a subtle, highly diffused shadow: `0px 4px 20px rgba(0, 0, 0, 0.05)`.
3.  **Level 2 (Active States/Dropdowns/Modals):** Increased elevation with a tighter shadow to indicate interactivity: `0px 8px 30px rgba(0, 0, 0, 0.12)`.

In the Board view (Drag-and-drop), active dragging elements should gain a temporary elevation boost and a primary-colored glow to indicate they are "detached" from the grid.

## Shapes

The shape language is defined by **large, friendly radiuses** that soften the institutional nature of the application.

- **Cards & Primary Containers:** Use `16px` (`rounded-lg`) as the standard, scaling up to `24px` (`rounded-xl`) for large dashboard segments.
- **Buttons & Inputs:** Follow the `8px` (`rounded-md`) standard for a balanced, modern look.
- **Status Chips:** Full pill-shape (`999px`) to distinguish them clearly from interactive buttons.

## Components

### Buttons & Navigation
- **Primary Button:** CU Gold background, black text, 8px radius. Min-height of 48px for tablet accessibility.
- **Sidebar:** Dark Slate (#2B4B54) background with CU Gold active-state indicators. Uses icons paired with text labels.

### Data & Status
- **Status Chips:** 
    - `Complete`: Green background (system success) with dark green text.
    - `Partial`: Burnt Orange (#CB5A08) background with white text.
    - `Pending`: Light Gray (#E9ECEF) background with dark gray text.
- **KPI Cards:** Display large display-level numbers (e.g., "14/20 Teams Judged") with a secondary progress bar at the bottom.

### Inputs & Forms
- **Evaluation Form:** Sticky header or footer containing the "Current Total Score" that updates in real-time as the judge fills out the rubric.
- **Inputs:** Outlined style with 1px border (#DEE2E6). Active state uses a 2px CU Gold border.

### Drag-and-Drop
- **Judge Assignment Board:** Vertical columns (Groups) with cards (Judges/Projects) that can be dragged between them. Cards should have a "grip" icon on the left edge.

### Tables
- **Standard Table:** Row-based with 16px vertical padding. Use alternating row stripes or subtle 1px dividers. Header row should be uppercase `label-lg`.