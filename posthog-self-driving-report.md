# PostHog Self-driving setup report

## Summary

PostHog Self-driving is configured for this web storefront. Session Replay and Error Tracking were already enabled; Support was enabled in this run. Health, error-tracking, and support signal sources are on, and two Replay Vision monitors were created for the checkout and shopping flows.

Findings will begin appearing in the [Self-driving inbox](https://us.posthog.com/project/623819/inbox) within about 30 minutes as fresh data and recordings arrive.

## AI data processing

Approved by the wizard's organization-level gate.

## GitHub

GitHub was already connected before this setup. No GitHub Issues responder was enabled because the connected-tools selection was dismissed.

## Products enabled

| Product | Result | Client check / note |
| --- | --- | --- |
| Session Replay | Already enabled | The web `posthog.init` configuration has no `disable_session_recording: true` override. |
| Error Tracking | Already enabled | The web `posthog.init` configuration has no `capture_exceptions: false` override. |
| Support (Conversations) | Enabled | Connect an inbound email, inbox, or Slack channel in PostHog before tickets can arrive. |

## Signal sources

| Source product | Source type | Action |
| --- | --- | --- |
| `health_checks` | `health_issue` | Enabled — config `01a0ccf7-88dd-7560-8898-d55450e22a6c` |
| `error_tracking` | `issue_created` | Enabled — config `01a0ccf7-88d4-77db-80f3-8abdc3b33b43` |
| `error_tracking` | `issue_reopened` | Enabled — config `01a0ccf7-87f9-7f66-888a-31947d296665` |
| `error_tracking` | `issue_spiking` | Enabled — config `01a0ccf7-88fd-7d1e-bca0-1d7d98f764e6` |
| `conversations` | `ticket` | Enabled — config `01a0ccf7-88fc-7271-949e-2d0255b79485` |
| `signals_scout` | `cross_source_issue` | No row created; scouts are enabled by default when no opt-out row exists. |
| `session_replay` | `session_analysis_cluster` | Deliberately skipped; this retired source is replaced by the Replay Vision scanners below. |
| `replay_vision` | scanner findings | Deliberately no source row; each scanner authorizes its own inbox findings with `emits_signals: true`. |

## Connected tools

The connected-tools picker was dismissed, so no external-tool responder was enabled and no warehouse source was created or detected. GitHub remains connected at the project level but GitHub Issues is not configured as an inbox source.

## Scout troop

**Enabled (4):**

| Scout | What it watches |
| --- | --- |
| General | Cross-product patterns and uncovered surfaces. |
| Product analytics | Saved conversion, retention, lifecycle, stickiness, and path flows. |
| Web analytics | Traffic, attribution, landing-page health, bounce, and 404 patterns. |
| Observability gaps | High-volume events that lack insight, dashboard, or alert coverage. |

**Disabled (23):**

| Scouts | Reason |
| --- | --- |
| AI observability, APM, Logs, MCP tool calls | No evidence that these telemetry products are used. |
| Anomaly detection, Insight alerts | No established dashboard, insight, or alert surface was found to watch. |
| Conversations | Support is enabled but no inbound channel is connected yet; the native ticket source already covers tickets once a channel is added. |
| CSP violations | No CSP reporting configuration was found. |
| Customer analytics | No B2B account/group analytics surface was found. |
| Data pipelines, Data warehouse | No relevant CDP, warehouse, export, or import surface was found. |
| Error tracking | Covered by the enabled native Error Tracking sources. |
| Experiments, Feature flags, Surveys | No active product evidence was found. |
| Inbox validation, PR follow-up | Fresh setup with no resolved Self-driving reports or shipped fixes to validate. |
| Replay vision | No pre-existing Replay Vision observations existed; the new scanners provide the recording-level route. |
| Revenue analytics | Payments use Paystack server events rather than a PostHog Revenue Analytics warehouse surface. |
| Session replay | Covered by the two Replay Vision scanners. |
| Skills store, Tasks | No active PostHog skills-store or tasks surface was found. |
| Web vitals | No web-vitals instrumentation evidence was found. |

Run budget: **100 runs/day**, **0 used today**, **100 remaining**. The current banner says that scouts are in early access and asks teams needing more than 100 daily runs to contact `team-self-driving@posthog.com`.

## Custom scouts

No custom scouts were created. A checkout-and-payment reliability scout was proposed based on the Paystack flow in `src/pages/Checkout.jsx`, `supabase/functions/initialize-payment/index.ts`, and `supabase/functions/verify-payment/index.ts`; it would have watched payment-start, verified-success, and failure balance for broad regressions. The proposal was dismissed.

The surface is watchable and directly tied to the store's completion flow, although it partially overlaps the enabled Product Analytics scout. If it is added later and proves noisy, set its scout config `emit` value to `false` to keep it in dry-run mode.

## Replay Vision scanners

A scanner is an LLM that watches individual session recordings on a schedule and pushes qualifying visible defects to the Self-driving inbox. It is the only part of this setup that spends Replay Vision quota. Scanner findings have half weight, so independent corroboration is required before they are promoted to a report.

| Status | Scanner | Watches | Query scope | Sampling | Estimate |
| --- | --- | --- | --- | --- | --- |
| Created | Storefront checkout breakage | Visible checkout failures: blocked validation, failed Paystack hand-off, unresolved error/spinner, and missing confirmation. | Recordings that include `/checkout`, the store's payment completion flow. | 50% | 0 observations / 0 credits per month currently |
| Created | Storefront shopping frustration | Clear rage-click and repeated-attempt behavior around product options, cart, checkout, payment, confirmation, and tracking. | Recordings containing `$rageclick` only. | 100% | 0 observations / 0 credits per month currently |

Replay Vision quota was verified at **2,500 credits remaining** with no credits used. No recordings or existing scanners were present during setup, so both scanners are armed and will begin scanning when new recordings arrive.

## Files created or modified

| File | Change |
| --- | --- |
| `posthog-self-driving-report.md` | Created this setup report. |

No application source files were changed.

## Follow-ups

- [ ] Connect a Support inbound channel (email, inbox, or Slack) in PostHog so the enabled ticket responder can receive support tickets.
- [ ] If desired, enable GitHub Issues or another external-tool responder from the [integrations settings](https://us.posthog.com/project/623819/settings/environment-integrations), then connect its warehouse source.
- [ ] Review early Replay Vision observations and rate them in the scanner UI; ratings produce configuration recommendations for review.
- [ ] Consider re-adding the proposed checkout-and-payment reliability scout if payment outcome monitoring needs a dedicated scheduled check.

## What happens next

The scout coordinator picks up the fresh configuration within about 30 minutes and draws from the daily run budget. Replay Vision monitors start as new recordings complete. Findings cluster into reports in the [Self-driving inbox](https://us.posthog.com/project/623819/inbox), where immediately actionable findings can become coding tasks.
