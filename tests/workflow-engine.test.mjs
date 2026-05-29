import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { WorkflowEngine } from '../src/lib/workflow-engine.mjs';

function createMockStore() {
  const workflows = [];
  const executions = [];
  return {
    state: { workflows, workflowExecutions: executions },
    listWorkflows: () => workflows,
    getWorkflow: (id) => workflows.find(w => w.id === id),
    addWorkflow: async (w) => { workflows.push(w); return w; },
    updateWorkflow: async (id, patch) => {
      const w = workflows.find(x => x.id === id);
      if (w) Object.assign(w, patch);
      return w;
    },
    addWorkflowExecution: async (e) => { executions.push(e); return e; },
    listWorkflowExecutions: (wfId) => executions.filter(e => e.workflowId === wfId),
  };
}

describe('WorkflowEngine', () => {
  let engine;
  let store;

  beforeEach(() => {
    store = createMockStore();
    engine = new WorkflowEngine({ store });
  });

  it('creates a workflow', async () => {
    const wf = await engine.createWorkflow({
      name: 'Test Workflow',
      triggerType: 'funnel_submission',
      steps: [
        { type: 'email', order: 0, config: { subject: 'Welcome', body: 'Hello!' } },
        { type: 'delay', order: 1, config: { duration: 86400 } },
        { type: 'email', order: 2, config: { subject: 'Follow-up', body: 'Still interested?' } },
      ],
    });
    assert.ok(wf.id);
    assert.equal(wf.name, 'Test Workflow');
    assert.equal(wf.steps.length, 3);
    assert.equal(wf.status, 'active');
  });

  it('lists workflows', async () => {
    await engine.createWorkflow({ name: 'WF1', triggerType: 'manual' });
    await engine.createWorkflow({ name: 'WF2', triggerType: 'funnel_submission' });
    const list = engine.listWorkflows();
    assert.ok(list.length >= 2);
  });

  it('gets workflow by id', async () => {
    const wf = await engine.createWorkflow({ name: 'Get Me', triggerType: 'manual' });
    const retrieved = engine.getWorkflow(wf.id);
    assert.equal(retrieved.name, 'Get Me');
  });

  it('validates workflow requires name and triggerType', async () => {
    await assert.rejects(
      () => engine.createWorkflow({ steps: [] }),
      /name.*required/i,
    );
  });

  it('validates step types', async () => {
    await assert.rejects(
      () => engine.createWorkflow({
        name: 'Bad Steps',
        triggerType: 'manual',
        steps: [{ type: 'invalid_type', order: 0 }],
      }),
      /invalid.*step.*type/i,
    );
  });

  it('creates workflow with valid step types', async () => {
    const wf = await engine.createWorkflow({
      name: 'Valid Steps',
      triggerType: 'manual',
      steps: [
        { type: 'email', order: 0, config: {} },
        { type: 'sms', order: 1, config: {} },
        { type: 'webhook', order: 2, config: {} },
        { type: 'tag', order: 3, config: {} },
        { type: 'delay', order: 4, config: {} },
        { type: 'condition', order: 5, config: {} },
        { type: 'note', order: 6, config: {} },
        { type: 'task', order: 7, config: {} },
      ],
    });
    assert.equal(wf.steps.length, 8);
  });

  it('deactivates workflow', async () => {
    const wf = await engine.createWorkflow({ name: 'Deactivate', triggerType: 'manual' });
    await engine.deactivateWorkflow(wf.id);
    const updated = engine.getWorkflow(wf.id);
    assert.equal(updated.status, 'inactive');
  });

  it('executes a workflow', async () => {
    const wf = await engine.createWorkflow({
      name: 'Exec WF',
      triggerType: 'manual',
      steps: [
        { type: 'email', order: 0, config: { subject: 'Test', body: 'Hello' } },
      ],
    });
    const execution = await engine.executeWorkflow(wf.id, {
      campaignId: 'test-campaign',
      triggerData: { contactId: 'c1' },
    });
    assert.ok(execution.id);
    assert.equal(execution.workflowId, wf.id);
    assert.equal(execution.status, 'completed');
  });

  it('tracks step executions', async () => {
    const wf = await engine.createWorkflow({
      name: 'Step Track',
      triggerType: 'manual',
      steps: [
        { type: 'email', order: 0, config: {} },
        { type: 'delay', order: 1, config: { duration: 0 } },
      ],
    });
    const execution = await engine.executeWorkflow(wf.id, { campaignId: 'c1' });
    assert.equal(execution.stepResults.length, 2);
    assert.equal(execution.stepResults[0].stepType, 'email');
    assert.equal(execution.stepResults[1].stepType, 'delay');
  });

  it('handles step failure gracefully', async () => {
    const wf = await engine.createWorkflow({
      name: 'Fail Step',
      triggerType: 'manual',
      steps: [
        { type: 'webhook', order: 0, config: { url: 'http://invalid.example.test/webhook' } },
      ],
    });
    const execution = await engine.executeWorkflow(wf.id, { campaignId: 'c1' });
    // Should complete even if webhook fails
    assert.ok(execution);
  });
});
