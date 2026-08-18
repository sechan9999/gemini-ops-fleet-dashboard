# Gemini Ops Fleet — Devpost 4-minute demo

## Narration

[0:00–0:25] 의료 운영에서 자동화는 빠르게 만들 수 있지만, 안전하게 멈추게 하기는 어렵습니다. Gemini Ops Fleet은 헬스케어 에이전트가 실제 업무를 준비하되, 권한과 데이터 경계를 넘지 않도록 설계한 운영 콘솔입니다. 핵심 질문은 단순합니다. 에이전트가 무엇을 할 수 있는가뿐 아니라, 무엇을 구조적으로 할 수 없게 만들 것인가입니다.

[0:25–0:55] 첫 화면은 Clinical Command Ledger입니다. 비동기 라우팅, SQL 범위 제한, 인간 승인 게이트가 한 화면에 보입니다. 이 시스템은 프롬프트를 기다리는 단일 챗봇이 아니라, 이벤트를 받아 업무를 수행하는 governed agent fleet입니다. 모든 화면의 데이터는 데모 환경에서 합성된 헬스케어 데이터입니다.

[0:55–1:25] Agent Registry를 보겠습니다. Payer Intelligence는 정책 검색과 거절 분석을 담당하고, Clinical and Quality는 가이드라인과 케어 갭을 다룹니다. Triage와 Reconcile은 운영 영역을 보조합니다. 각 에이전트에는 버전, 도메인, capability, autonomy 등급과 제한사항이 함께 기록됩니다. 특히 헬스케어 에이전트는 drafts only로 표시됩니다. 초안을 만들 수는 있지만, 외부로 직접 발송할 수 없습니다.

[1:25–1:55] 이제 Event Stream입니다. 합성 denial 이벤트가 들어오면 시스템은 이벤트의 actor, kind, routed agent, status를 기록하고 적절한 에이전트로 라우팅합니다. 실제 운영에서는 FastAPI publisher가 역할 변경 이벤트를 인증된 bridge로 전달하고, SSE가 구독 중인 운영자에게 실시간으로 알립니다. 즉, 사용자의 프롬프트가 아니라 업무 이벤트가 fleet을 움직입니다.

[1:55–2:25] 에이전트의 분석 결과는 근거와 함께 approval queue에 도착합니다. 카드에는 synthetic subject, action type, evidence, destination, 그리고 Gemini summary가 표시됩니다. 운영자는 상세 drawer에서 전체 clinical payload와 요약을 함께 확인합니다. 데이터 검색은 서버의 SQL scope를 먼저 통과하므로, 권한 없는 cross-domain 문서는 모델이 거절하는 것이 아니라 애초에 검색 결과에서 제외됩니다.

[2:25–2:55] 이 화면이 human gate입니다. 승인이 없으면 draft는 안전하게 보류됩니다. 전송을 시도하면 서버는 HTTP 409 Conflict를 반환하고, 승인 기록이 없다는 이유를 명확히 남깁니다. 이것은 버튼을 비활성화한 UI 규칙이 아닙니다. 백엔드가 매번 approval state를 다시 검사하기 때문에, 브라우저가 어떤 값을 보내도 승인 없는 외부 action은 실행되지 않습니다.

[2:55–3:20] 이제 권한 있는 Medical Director가 승인합니다. 서버는 reviewer identity를 브라우저 입력이 아니라 인증된 세션에서 파생하고, 승인과 거절 이유를 audit log에 저장합니다. 승인된 뒤에만 controlled action을 보낼 수 있습니다. 성공뿐 아니라 거절, 차단, 중복, 실패도 모두 traceable한 기록으로 남습니다.

[3:20–3:45] Operator Admin 화면에서는 역할과 부서를 관리할 수 있습니다. bulk edit은 before-and-after dry run을 먼저 보여주고, 변경된 사용자만 audit row와 notification을 생성합니다. 역할 변경 알림은 persistent inbox와 SSE로 전달되며, 운영자는 알림 선호도도 직접 설정할 수 있습니다.

[3:45–4:00] 마지막으로 stream health를 보겠습니다. Prometheus endpoint와 관리자 전용 metrics view가 active connections, delivery latency, dropped clients를 추적합니다. 시간 범위를 바꾸면 connection과 latency trend를 확인할 수 있고, 임계치를 넘으면 Watch 또는 Critical 상태로 표시됩니다. Gemini Ops Fleet의 결론은 분명합니다. 자동화는 준비를 빠르게 만들고, 시스템은 경계를 보이게 하며, 최종 결정은 책임 있는 사람이 소유합니다.

## Scene order

1. Overview hero and governance chips.
2. Agent Registry with autonomy and restrictions.
3. Event Stream and asynchronous routing.
4. Approval queue, detail drawer, and Gemini summary.
5. Rejected send / HTTP 409 human gate.
6. Approved transition and audit trail.
7. Operator Admin bulk dry-run and SSE inbox.
8. Stream Health charts, thresholds, and final Overview frame.
