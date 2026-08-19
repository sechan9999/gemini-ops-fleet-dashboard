# Infection-control product notes

## Product implication

Gemini Ops Fleet should serve as an accountability and coordination surface for infection prevention and control (IPC), not as an autonomous clinical decision-maker. The dashboard should help a small hospital identify work that needs attention, connect each signal to source evidence, assign a responsible operator, and route consequential actions through a human gate.

## Workflow requirements grounded in primary guidance

The CDC core practices describe IPC as applicable across inpatient and outpatient settings and organize the work around leadership support, education and training, patient/family education, performance monitoring and feedback, standard precautions, and transmission-based precautions. The dashboard therefore needs an operational queue rather than a generic chat surface.

The most useful low-resource workflow primitives are: ward-level risk signals, named owners, evidence links, standard-practice checks, open tasks, due times, resource constraints, escalation state, and feedback history. A signal should be labeled as an operational observation or missing-data condition, not as a diagnosis or treatment recommendation.

The CDC basics page distinguishes sources, transmission pathways, and susceptible people, and emphasizes standard precautions for all patient care plus transmission-based precautions for selected situations. The product can represent these as structured evidence dimensions without inferring an infection diagnosis.

WHO’s minimum-requirements document frames IPC as a facility-level safety program with minimum standards. The product should therefore include a visible facility readiness score based on documented inputs, a low-resource mode that prioritizes a small number of high-value actions, and transparent gaps rather than pretending that absent data means low risk.

## Safety boundaries

All demo and test records must be synthetic. Gemini may summarize authorized evidence and propose an operational next step, but it must not diagnose, recommend treatment, declare an outbreak, or send an external notice without a human approval decision. Every approval, rejection, override, and missing-data condition must be auditable.

## Proposed dashboard concepts

| Concept | Initial implementation direction |
| --- | --- |
| Ward risk board | Synthetic ward cards showing signal level, evidence freshness, open IPC tasks, and resource constraints. |
| IPC work queue | Prioritized tasks for hand hygiene observation, environmental cleaning, PPE availability, isolation readiness, training gaps, and surveillance follow-up. |
| Evidence drawer | Source observation, timestamp, confidence/uncertainty, missing fields, and recommended verification step. |
| Human gate | Medical Director or IPC lead approves, rejects with reason, or requests verification; no autonomous outbound action. |
| Low-resource mode | Shows top three actionable gaps, offline-safe local state, and print/export-friendly task list. |
| Oversight | Role-scoped access for IPC lead, nurse manager, medical director, and payer/admin operations; audit and notification paths reuse existing contracts. |

## Sources

[1]: https://www.cdc.gov/infection-control/hcp/core-practices/index.html CDC, Core Infection Prevention and Control Practices for Safe Healthcare Delivery in All Settings.
[2]: https://www.cdc.gov/infection-control/about/index.html CDC, Infection Control Basics.
[3]: https://www.who.int/publications/i/item/9789241516945 WHO, Minimum requirements for infection prevention and control programmes.
