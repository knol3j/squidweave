import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { WorkflowEngine } from '../src/lib/workflow-engine.mjs';

function createMockStore() {
  const collections = {
    workflows: {},
    workflowVersions: {},
    workflowExecutions: {},
    triggers: {},
    triggerStatus: {},
  };
  return {
    getDocument: (collectionName, docId) => {
      const col = collections[collectionName];
      if (!col) return null;
      return col[docId] ? structuredClone(col[docId]) : null;
    },
    listDocuments: (collectionName, filters) => {
      const col = collections[collectionName];
      if (!col) return [];
      const docs = Object.values(col);
      if (!filters) return docs;
      return docs.filter(doc => {
        for (const [k, v] of Object.entries(filters)) {
          if (doc[k] !== v) return false;
        }
        return true;
      });
    },
    upsertDocument: async (collectionName, docId, data) => {
      if (!collections[collectionName]) collections[collectionName] = {};
      const existing = collections[collectionName][docId];
      const now = new Date().toISOString();
      const doc = {
        ...(existing || {}),
        ...data,
        id: docId,
        updatedAt: now,
        createdAt: existing?.createdAt || now,
      };
      collections[collectionName][docId] = doc;
      return doc;
    },
    deleteDocument: async (collectionName, docId) => {
      const col = collections[collectionName];
      if (!col || !col[docId]) return false;
      delete col[docId];
      return true;
    }
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
      status: 'draft',
      workflowData: {
        steps: [
          { id: 's1', type: 'email', order: 0, config: { subject: 'Welcome', body: 'Hello!' } },
          { id: 's2', type: 'delay', order: 1, config: { duration: 86400 } },
          { id: 's3', type: 'email', order: 2, config: { subject: 'Follow-up', body: 'Still interested?' } },
        ],
      },
    });
    assert.ok(wf.id);
    assert.equal(wf.name, 'Test Workflow');
    assert.equal(wf.workflowData.steps.length, 3);
    assert.equal(wf.status, 'draft');
  });

  it('updates a workflow', async () => {
    const wf = await engine.createWorkflow({ name: 'Original Workflow' });
    const updated = await engine.updateWorkflow(wf.id, {
      name: 'Updated Workflow',
      workflowData: {
        steps: [{ id: 's1', type: 'sms', order: 0, config: {} }],
      },
    });
    assert.equal(updated.name, 'Updated Workflow');
    assert.equal(updated.workflowData.steps.length, 1);
    assert.equal(updated.workflowData.steps[0].type, 'sms');
  });

  it('gets workflow by id', async () => {
    const wf = await engine.createWorkflow({ name: 'Get Me' });
    const retrieved = engine.getWorkflow(wf.id);
    assert.equal(retrieved.name, 'Get Me');
  });

  it('deletes a workflow', async () => {
    const wf = await engine.createWorkflow({ name: 'To Delete' });
    const result = await engine.deleteWorkflow(wf.id);
    assert.equal(result.deleted, true);
    const updated = engine.getWorkflow(wf.id);
    assert.equal(updated.deleted, true);
  });

  it('validates step types when updating steps', async () => {
    const wf = await engine.createWorkflow({ name: 'Bad Steps' });
    await assert.rejects(
      () => engine.updateWorkflow(wf.id, {
        workflowData: {
          steps: [{ type: 'invalid_type', order: 0 }],
        },
      }),
      /unknown step type/i,
    );
  });

  it('publishes and drafts a workflow', async () => {
    const wf = await engine.createWorkflow({
      name: 'Publish Test',
      workflowData: {
        steps: [{ id: 's1', type: 'email', order: 0, config: {} }],
      },
    });
    const { workflow, version } = await engine.publishWorkflow(wf.id);
    assert.equal(workflow.status, 'published');
    assert.ok(version.id);

    const latest = await engine.getLatestVersion(wf.id);
    assert.equal(latest.id, version.id);

    const drafted = await engine.draftWorkflow(wf.id);
    assert.equal(drafted.status, 'draft');
  });

  it('manages steps (add, update, remove, reorder)', async () => {
    const wf = await engine.createWorkflow({
      name: 'Step Management',
      workflowData: { steps: [] },
    });

    // Add step
    const step1 = engine.addStep(wf.id, { id: 's1', type: 'email', config: { body: 'Step 1' } });
    assert.equal(step1.type, 'email');

    // Add another step
    const step2 = engine.addStep(wf.id, { id: 's2', type: 'sms', config: {} });
    assert.equal(step2.type, 'sms');

    // Update step
    const updatedStep = engine.updateStep(wf.id, 's1', { config: { body: 'Updated Step 1' } });
    assert.equal(updatedStep.config.body, 'Updated Step 1');

    // Reorder steps
    const reordered = engine.reorderSteps(wf.id, ['s2', 's1']);
    assert.equal(reordered[0].id, 's2');
    assert.equal(reordered[1].id, 's1');

    // Remove step
    const removed = engine.removeStep(wf.id, 's2');
    assert.equal(removed.removed, true);
    const finalWf = engine.getWorkflow(wf.id);
    assert.equal(finalWf.workflowData.steps.length, 1);
    assert.equal(finalWf.workflowData.steps[0].id, 's1');
  });

  it('executes a workflow for contact', async () => {
    const wf = await engine.createWorkflow({
      name: 'Exec WF',
      workflowData: {
        steps: [
          { id: 's1', type: 'email', order: 0, config: { subject: 'Test', body: 'Hello' } },
        ],
      },
    });
    // Must publish before execution
    await engine.publishWorkflow(wf.id);

    let commSent = null;
    const execution = await engine.executeWorkflowForContact(wf.id, 'c1', {
      onCommunication: async (comm) => {
        commSent = comm;
      },
    });

    assert.ok(execution);
    assert.equal(execution.status, 'completed');
    assert.equal(execution.stepsExecuted, 1);
    assert.ok(commSent);
    assert.equal(commSent.type, 'email');
    assert.equal(commSent.contactId, 'c1');
  });

  it('handles step failures gracefully', async () => {
    const wf = await engine.createWorkflow({
      name: 'Fail Step WF',
      workflowData: {
        steps: [
          { id: 's1', type: 'webhook', order: 0, config: { url: 'http://invalid-url.example/hook' } },
        ],
      },
    });
    await engine.publishWorkflow(wf.id);

    const execution = await engine.executeWorkflowForContact(wf.id, 'c1', {
      onWebhook: async () => {
        throw new Error('Network timeout');
      },
    });

    assert.equal(execution.status, 'failed');
    assert.equal(execution.stepsExecuted, 1);
    assert.ok(execution.error.includes('Network timeout'));
  });

  it('manages triggers', async () => {
    const trigger = await engine.createTrigger({
      title: 'New Lead Trigger',
      type: 'funnel_submission',
      active: true,
    });
    assert.ok(trigger.id);
    assert.equal(trigger.title, 'New Lead Trigger');

    const updated = await engine.updateTrigger(trigger.id, { title: 'Updated Title' });
    assert.equal(updated.title, 'Updated Title');

    const toggled = engine.toggleTrigger(trigger.id);
    assert.equal(toggled.active, false);

    const deleted = await engine.deleteTrigger(trigger.id);
    assert.equal(deleted.deleted, true);
  });
});
