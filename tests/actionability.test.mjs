import test from "node:test";
import assert from "node:assert/strict";
import {
  buildResearchVerificationGate,
  isActionableContact,
  isActionableInvestor,
  isActionableResearchRecord,
} from "../src/lib/actionability.mjs";

test("research records must be verified and actionable before downstream use", () => {
  const weak = {
    id: "r1",
    campaignId: "c1",
    targetId: "t1",
    company: "Acme",
    metadata: {},
  };
  const strong = {
    ...weak,
    segment: "Mid-market SaaS",
    region: "US",
    preferredChannel: "email",
    fitScore: 0.8,
    metadata: {
      sourceUrl: "https://acme.example",
      verificationStatus: "user-confirmed",
      evidence: ["Confirmed by operator"],
    },
  };

  assert.equal(isActionableResearchRecord(weak), false);
  assert.equal(isActionableResearchRecord(strong), true);
  assert.equal(buildResearchVerificationGate({ campaign: { id: "c1", name: "Acme" }, records: [strong] }).ready, true);

  const gate = buildResearchVerificationGate({ campaign: { id: "c1", name: "Acme" }, records: [weak] });
  assert.equal(gate.ready, false);
  assert.ok(gate.questions.some(item => item.id === "ideal_customer"));
});

test("contacts need route, evidence, verification, and compliance review", () => {
  assert.equal(isActionableContact({
    company: "Acme",
    role: "VP Marketing",
    email: "morgan@acme.example",
  }), false);

  assert.equal(isActionableContact({
    company: "Acme",
    role: "VP Marketing",
    email: "morgan@acme.example",
    evidence: ["Verified profile"],
    verificationStatus: "verified",
    complianceStatus: "reviewed",
  }), true);

  assert.equal(isActionableContact({
    company: "Acme",
    role: "VP Marketing",
    linkedinUrl: "https://linkedin.com/in/morgan",
    sourceUrl: "https://linkedin.com/in/morgan",
    evidence: ["Profile verified"],
    verificationStatus: "linkedin-route-present",
    complianceStatus: "reviewed",
  }), true);
});

test("investors need fit and a usable outreach route", () => {
  assert.equal(isActionableInvestor({
    fundName: "Top Fund",
    thesisMatch: 0.9,
    stageMatch: 0.9,
    checkSizeMatch: 0.9,
  }), false);

  assert.equal(isActionableInvestor({
    fundName: "Top Fund",
    partnerName: "A Partner",
    email: "partner@example.com",
    thesisMatch: 0.9,
    stageMatch: 0.9,
    checkSizeMatch: 0.9,
  }), true);
});
