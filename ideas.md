# Gemini Ops Fleet Dashboard Design Direction

## Approach 1
**Theme Name:** Clinical Command Ledger

**Very Brief Intro:** A warm, editorial operations console that treats every agent decision like a ledger entry: precise, accountable, and easy to audit. Ivory surfaces, ink typography, and oxidized teal accents make governance feel human rather than sterile.

**Probability:** 0.07

## Approach 2
**Theme Name:** Night Shift Control Room

**Very Brief Intro:** A dark, high-contrast command center for asynchronous healthcare operations, with restrained amber alerts and cyan telemetry. The mood is vigilant and technical without becoming cyberpunk.

**Probability:** 0.04

## Approach 3
**Theme Name:** Paper Protocol

**Very Brief Intro:** A calm, paper-inspired interface that combines clinical documentation conventions with modern workflow tooling. Quiet blue-gray surfaces, redaction marks, and crisp modular panels signal trust and procedural clarity.

**Probability:** 0.09

## Chosen Approach: Clinical Command Ledger

### Design Movement
Contemporary editorial information design inspired by medical charting, Swiss modernism, and high-reliability operations consoles.

### Core Principles
1. **Make governance visible.** Refusals, approval gates, and access boundaries are prominent product states, not hidden errors.
2. **Use hierarchy over decoration.** Typography, spacing, and surface contrast organize dense operational information.
3. **Pair clinical calm with operational urgency.** Warm neutral surfaces carry the page; teal indicates trusted system flow, amber marks review, and coral marks denial or risk.
4. **Design for scanning and evidence.** Every dashboard panel should help a judge follow what happened, why it happened, and what the human is allowed to do next.

### Color Philosophy
Use parchment ivory and slate ink as the foundation, with oxidized teal as the ownable brand color for trusted automation. Use muted amber only for pending human review and coral only for denials or blocked actions. The palette should feel like a carefully maintained clinical operations ledger, not a generic SaaS admin panel.

### Layout Paradigm
A persistent left rail anchors navigation while the main canvas uses a split command layout: a broad operational overview on the left and a narrow “control margin” on the right for runtime status, human gate state, and the latest refusal. Avoid centering everything; let the event stream and approval queue create a left-to-right narrative.

### Signature Elements
- A vertical “governance rail” on cards that changes from teal to amber to coral according to state.
- Small uppercase evidence labels such as `ASYNC EVENT`, `ROLE SCOPE`, and `HUMAN GATE` above the primary content.
- A compact “cannot do” block that lists structural restrictions beside successful work.

### Interaction Philosophy
Interactions should feel deliberate and inspectable. Approve and send are separate actions with explicit state transitions. Hover and focus states reveal evidence, never hide it. Loading states use restrained pulses, while completed events settle into the ledger with a small slide-in motion.

### Animation
Use 160–220ms ease-out transitions for tabs, buttons, and row expansion. Use a brief 300ms slide/fade for newly arrived events. Do not animate denied states theatrically; use a crisp color transition and a persistent explanation. Respect reduced-motion preferences.

### Typography System
Use **DM Sans** for interface text and **IBM Plex Mono** for evidence labels, timestamps, IDs, and telemetry. Headlines use DM Sans 700 with tight tracking. Body text uses DM Sans 400/500. Monospace appears only where it improves auditability.

### Brand Essence
A governed agent command center for healthcare operations teams that need asynchronous automation without surrendering accountability.

Personality: **measured, rigorous, humane**.

### Brand Voice
Headlines are direct and evidence-led. CTAs describe the irreversible action. Microcopy explains why a restriction exists instead of saying only “error.”

Example lines:
- “The fleet completed the analysis. A human still owns the decision.”
- “Held before dispatch — no approved signature is on record.”

### Wordmark & Logo
Use a compact ledger-mark: three stacked horizontal bars interrupted by a vertical teal checkpoint, suggesting an event stream crossing a governance boundary. It should be an abstract symbol without text and work as the sidebar mark and favicon.

### Signature Brand Color
**Oxidized Teal — `#0F766E`**. It signals trusted flow and mature infrastructure without borrowing the default bright blue of generic admin dashboards.

### Implementation Reminder
Every component should reinforce the Clinical Command Ledger direction: clear evidence labels, warm paper-like surfaces, visible governance states, asymmetric command layouts, and restrained motion. Avoid purple gradients, excessive rounded cards, centered marketing layouts, and generic placeholder copy.
