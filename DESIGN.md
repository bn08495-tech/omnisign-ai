# Design System Specification: OmniSign AI

OmniSign AI is a high-performance, bidirectional accessibility bridge that enables real-time visual-to-voice and voice-to-sign communication. The visual design language balances high-precision computer vision tools with an approachable, inclusive, and modern tactile user experience.

---

## 1. Brand Identity & Design Thesis

- **Product Character:** Empowering, Crystal-Clear, Accessible, Futuristic yet Human.
- **Core Visual Motif:** "Luminous Vision" — Ultra-crisp geometric HUD overlays, glowing landmark vectors, deep slate backdrop, and electric cyan/violet focal points that communicate high accuracy and trust.
- **Signature Experience:** Real-time skeletal hand landmark tracker with responsive glow nodes, animated sign playback cards, and unified dual-feed conversational stream.

---

## 2. Color Palette & Token Architecture

### Primary System
| Token Name | Hex Value | Role / Usage |
| :--- | :--- | :--- |
| `color-brand-primary` | `#06B6D4` | Electric Cyan — Active landmarks, primary action triggers, status live indicators |
| `color-brand-secondary` | `#6366F1` | Indigo / Violet — Secondary focus, AI classification badges, confidence tags |
| `color-brand-accent` | `#3B82F6` | Azure Blue — Interactive links, timeline scrubber active items |
| `color-brand-glow` | `rgba(6, 182, 212, 0.35)` | Neon diffusion aura for hand mesh nodes and real-time trackers |

### Semantic & Feedback
| Token Name | Hex Value | Role / Usage |
| :--- | :--- | :--- |
| `color-success` | `#10B981` | Emerald Green — Successful sign match in Practice Mode, verified health check |
| `color-warning` | `#F59E0B` | Amber — Camera permission warnings, threshold pending hold indicators |
| `color-danger` | `#EF4444` | Crimson Red — Error toasts, microphone block alerts, stream termination |
| `color-info` | `#0EA5E9` | Sky Blue — Informational chips and category tags |

### Surface & Elevation (Dark Mode Default)
| Token Name | Hex Value | Role / Usage |
| :--- | :--- | :--- |
| `color-surface-background` | `#0B0F19` | Deep Space Navy — Canvas background |
| `color-surface-card` | `#111827` | Charcoal Card — Main card background with 1px border |
| `color-surface-subtle` | `#1F2937` | Input backgrounds, inactive pills, timeline track background |
| `color-surface-glass` | `rgba(17, 24, 39, 0.75)` | Glassmorphism floating HUD controls with 12px blur |
| `color-border-subtle` | `rgba(255, 255, 255, 0.08)` | Structural dividers, inactive card outlines |
| `color-border-active` | `rgba(6, 182, 212, 0.5)` | Active focus states, selected timeline tokens |

### Typography & Content Colors
| Token Name | Hex Value | Role / Usage |
| :--- | :--- | :--- |
| `color-text-primary` | `#F9FAFB` | Main headlines, values, recognized sign text |
| `color-text-secondary` | `#9CA3AF` | Subheadings, category subtitles, helper labels |
| `color-text-muted` | `#6B7280` | Timestamps, inactive states, placeholder text |
| `color-text-on-primary` | `#0B0F19` | High-contrast dark text on electric cyan button fills |

---

## 3. Typography Scale & Fonts

- **Headline Font:** `Outfit`, `Plus Jakarta Sans`, sans-serif (Geometric, high-legibility, open counters)
- **Body Font:** `Inter`, system-ui, sans-serif (Neutral, highly readable at micro-sizes)
- **Data & Monospace:** `JetBrains Mono`, `Space Mono`, monospace (HUD Confidence %, timestamps, landmark vectors)

### Scale & Hierarchy
| Style Level | Font Size | Weight | Line Height | Letter Spacing |
| :--- | :--- | :--- | :--- | :--- |
| `display-lg` | `36px` / `2.25rem` | 800 (ExtraBold) | `1.2` | `-0.03em` |
| `display-md` | `28px` / `1.75rem` | 700 (Bold) | `1.25` | `-0.02em` |
| `title-lg` | `20px` / `1.25rem` | 600 (SemiBold) | `1.3` | `-0.01em` |
| `body-lg` | `16px` / `1.0rem` | 500 (Medium) | `1.5` | `0` |
| `body-md` | `14px` / `0.875rem` | 400 (Regular) | `1.5` | `0` |
| `label-sm` | `12px` / `0.75rem` | 600 (SemiBold) | `1.4` | `+0.04em` (Uppercase) |
| `data-mono` | `13px` / `0.8125rem` | 500 (Medium) | `1.4` | `0` |

---

## 4. Spacing & Geometric Radii

### Spacing Grid (8pt Baseline)
- `space-xs`: `4px`
- `space-sm`: `8px`
- `space-md`: `16px`
- `space-lg`: `24px`
- `space-xl`: `32px`
- `space-2xl`: `48px`

### Border Radii
- `radius-sm`: `6px` (Small chips, confidence badges)
- `radius-md`: `10px` (Buttons, inputs, dictionary items)
- `radius-lg`: `16px` (Main player viewport, video feed cards, conversation panels)
- `radius-full`: `9999px` (Pills, mic trigger buttons, avatar circles)

---

## 5. Key UI Components & Interaction States

### 1. The Dual Modality Navigation Bar
- Glassmorphic top navigation with tabs: **Voice to Sign (V2S)**, **Sign to Voice (S2V)**, **Two-Way Bridge**, **Dictionary Explorer**, **Practice Studio**.
- Active tab features a subtle ambient underglow (`#06B6D4`) with smooth sliding pill transition.

### 2. Sign Animation Stage & Sequence Timeline
- Responsive viewport with dark slate backdrop, rendering WebP animations at centered 1:1 aspect ratio.
- Real-time token timeline underneath showing word-by-word progression, active token highlight, scrubber jumps, and playback speed controls (0.5x, 0.75x, 1.0x, 1.25x).

### 3. Computer Vision HUD Overlay
- Semi-transparent overlay layered on top of webcam feed.
- Cyan skeletal hand graph (`#06B6D4`) with indigo landmark nodes (`#6366F1`) and soft shadow blur.
- Live HUD indicator badge displaying current recognized gesture/letter and confidence percentage (e.g. `HELLO • 96%`).
- Circular / linear hold-duration progress ring showing confirmation before appending to sentence buffer.

### 4. Two-Way Conversation Bridge
- Split conversational stream featuring distinctive bubble styles:
  - **Hearing Speaker Bubble:** Indigo tinted (`rgba(99, 102, 241, 0.15)`), right-aligned, with one-click "Sign Replay" and "Listen" triggers.
  - **Deaf Signer Bubble:** Cyan tinted (`rgba(6, 182, 212, 0.15)`), left-aligned, with immediate text-to-speech audio feedback.

### 5. Practice & Gamification Cards
- Target gesture challenge card showing visual goal, hint, real-time camera evaluation, and score streak counter (`+100` combo celebrations with subtle particle burst).

---

## 6. Motion & Accessibility Principles

- **Micro-Animations:** Quick, crisp transitions (`150ms - 250ms`, `cubic-bezier(0.16, 1, 0.3, 1)`).
- **Reduced Motion:** When `prefers-reduced-motion: reduce` is active, disable glowing pulses and animated timeline smooth scroll in favor of instant state changes.
- **High Contrast:** All interactive controls maintain minimum 4.5:1 contrast against `#0B0F19` background.
- **Fail-Safe Fallbacks:** Built-in Virtual Demo Pad simulator when physical webcam is unavailable or permissions are restricted.
