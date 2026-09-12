import { describe, expect, it } from 'vitest';
import { engineDispatchId } from '../../../src/vtt/agent-session';
import { auditBlindIngress, BlindModelIngressRecorder } from '../../../src/vtt/blind-model-ingress';
import type { TurnContextDelivery } from '../../../src/vtt/turn-context-delivery';

const dispatchId = engineDispatchId('engine-dispatch:blind-ingress-0001');
const deliveries: readonly Exclude<TurnContextDelivery, { readonly status: 'delivered' }>[] = [
  { status: 'not_requested', dispatchId, reason: 'catalog_ready_model_did_not_fetch', measurement: null },
  { status: 'timeout_before_delivery', dispatchId, measurement: null },
  { status: 'infrastructure_absent', dispatchId, measurement: null },
  { status: 'indeterminate', dispatchId, reason: 'catalog_inconclusive_empty_context_spool', measurement: null, integrityAction: 'stop_after_persist' },
];

describe('blind model ingress v2 finalization', () => {
  it('records a complete delivered audit only when required and forbidden checks pass', () => {
    const recorder = new BlindModelIngressRecorder();
    recorder.record('startup', 'blind-turn-context-v1 creature_facts legal_movement');
    const delivery = { status: 'delivered', dispatchId, contextSha256: 'c'.repeat(64), measurement: { baseBytes: 20, semanticBytes: 5 } } as const;
    expect(auditBlindIngress(recorder.records(), delivery, { requiredText: ['creature_facts', 'legal_movement'] }))
      .toEqual({ version: 2, status: 'complete', passed: true, forbiddenContentPassed: true, delivery });
  });

  it.each(deliveries)('keeps $status as honest incomplete delivery evidence', (delivery) => {
    expect(auditBlindIngress([], delivery, { requiredText: ['creature_facts'] })).toEqual({
      version: 2,
      status: 'incomplete',
      passed: false,
      forbiddenContentPassed: true,
      delivery,
      missingRequiredFields: ['ingress_records', 'creature_facts'],
    });
  });

  it('still runs forbidden-content checks for incomplete delivery', () => {
    const recorder = new BlindModelIngressRecorder();
    recorder.record('startup', 'engine.query_tactical_intel');
    const audit = auditBlindIngress(recorder.records(), deliveries[0]!);
    expect(audit.version).toBe(2);
    if (audit.version !== 2) throw new Error('Expected a v2 ingress audit.');
    expect(audit.forbiddenContentPassed).toBe(false);
  });

  it('returns persistable violation evidence when delivered ingress contains forbidden content', () => {
    const recorder = new BlindModelIngressRecorder();
    recorder.record('startup', 'blind-turn-context-v1 creature_facts legal_movement engine default option');
    const delivery = {
      status: 'delivered', dispatchId, contextSha256: 'c'.repeat(64),
      measurement: { baseBytes: 20, semanticBytes: 5 },
    } as const;
    expect(auditBlindIngress(recorder.records(), delivery, {
      requiredText: ['creature_facts', 'legal_movement'],
    })).toEqual({
      version: 2, status: 'incomplete', passed: false, forbiddenContentPassed: false,
      delivery, missingRequiredFields: [],
    });
  });
});
