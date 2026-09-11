# Production Architecture Notes

## Agent boundary
The AI never receives the Hostinger token. It requests tools from the LeadPilot API/MCP layer. The server performs authorization and policy checks and only then calls provider APIs.

## Recommended agent permissions
- leads:read
- leads:create
- leads:research
- campaigns:read
- campaigns:create
- campaigns:update
- mail:read
- mail:draft
- mail:send
- inbox:read
- inbox:reply
- analytics:read

Issue separate keys per agent and start without `mail:send` until the workflow is validated.

## Follow-up state machine
`QUALIFIED -> CONTACTED -> WAITING -> REPLIED | FOLLOWUP_DUE -> STOPPED`

Before each scheduled send verify:
1. Campaign ACTIVE
2. Lead not suppressed/unsubscribed/bounced
3. No inbound reply since last outbound message
4. Mailbox rate limits available
5. Sequence step still matches current state
6. Message has passed approval policy for current Autopilot mode

## Research adapters
Implement adapters behind one interface:
```ts
interface LeadSourceAdapter {
  discover(input: TargetSpec): Promise<CandidateLead[]>;
  enrich(candidate: CandidateLead): Promise<ResearchResult>;
}
```
Potential adapters: user-provided URLs, approved search APIs, company directories with permitted access, and CSV imports. Avoid fragile generic scraping as the core product dependency.
