/**
 * Email verification tests. Uses node:test like the rest of this project.
 *
 * The pure functions (syntax, pattern detection, candidate generation, blocked
 * detection) run with no I/O. Anything that opens a socket is kept out of the
 * default suite: probing a real mail server is slow, rate-limited, and depends on
 * this machine's IP reputation, so it is covered by the verification script
 * instead of asserted here.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  isSyntacticallyValid,
  domainOf,
  detectPattern,
  isCatchAll,
} from "../src/lib/email-verifier.mjs";
import { candidatesFor, buildPattern, PATTERN_ORDER } from "../src/lib/email-candidates.mjs";

describe("email syntax", () => {
  test("accepts well-formed addresses", () => {
    for (const email of [
      "jane@acme.com",
      "jane.doe@acme.co.uk",
      "jane+tag@acme.com",
      "jane_doe@sub.acme.io",
      "jane-doe99@acme.com",
    ]) {
      assert.ok(isSyntacticallyValid(email), email);
    }
  });

  test("rejects malformed addresses", () => {
    for (const email of ["", "not-an-email", "@acme.com", "jane@", "jane@acme", "jane doe@acme.com", "jane@@acme.com"]) {
      assert.ok(!isSyntacticallyValid(email), email);
    }
  });

  test("rejects non-strings", () => {
    assert.ok(!isSyntacticallyValid(null));
    assert.ok(!isSyntacticallyValid(undefined));
    assert.ok(!isSyntacticallyValid(42));
  });

  test("domainOf extracts the domain lowercased", () => {
    assert.equal(domainOf("Jane.Doe@ACME.com"), "acme.com");
    assert.equal(domainOf("bad"), null);
  });
});

describe("pattern detection", () => {
  test("detects first.last", () => {
    assert.equal(detectPattern("jane.doe@acme.com", "Jane", "Doe"), "first.last");
  });

  test("detects first_last", () => {
    assert.equal(detectPattern("jane_doe@acme.com", "Jane", "Doe"), "first_last");
  });

  test("detects f.last", () => {
    assert.equal(detectPattern("j.doe@acme.com", "Jane", "Doe"), "f.last");
  });

  test("detects flast", () => {
    assert.equal(detectPattern("jdoe@acme.com", "Jane", "Doe"), "flast");
  });

  test("detects first", () => {
    assert.equal(detectPattern("jane@acme.com", "Jane", "Doe"), "first");
  });

  test("detects last", () => {
    assert.equal(detectPattern("doe@acme.com", "Jane", "Doe"), "last");
  });

  test("returns null for an unknown pattern", () => {
    assert.equal(detectPattern("zzz999@acme.com", "Jane", "Doe"), null);
  });

  test("is case insensitive", () => {
    assert.equal(detectPattern("Jane.Doe@acme.com", "Jane", "Doe"), "first.last");
  });

  test("returns null when name parts are missing", () => {
    assert.equal(detectPattern("jane@acme.com", null, "Doe"), null);
    assert.equal(detectPattern(null, "Jane", "Doe"), null);
  });
});

describe("candidate generation", () => {
  test("buildPattern renders each convention", () => {
    assert.equal(buildPattern("Jane", "Doe", "acme.com", "first.last"), "jane.doe@acme.com");
    assert.equal(buildPattern("Jane", "Doe", "acme.com", "first_last"), "jane_doe@acme.com");
    assert.equal(buildPattern("Jane", "Doe", "acme.com", "flast"), "jdoe@acme.com");
    assert.equal(buildPattern("Jane", "Doe", "acme.com", "f.last"), "j.doe@acme.com");
    assert.equal(buildPattern("Jane", "Doe", "acme.com", "first"), "jane@acme.com");
    assert.equal(buildPattern("Jane", "Doe", "acme.com", "last"), "doe@acme.com");
  });

  test("buildPattern rejects a bad pattern name", () => {
    assert.equal(buildPattern("Jane", "Doe", "acme.com", "nonsense"), null);
  });

  test("buildPattern rejects missing parts", () => {
    assert.equal(buildPattern("", "Doe", "acme.com", "first"), null);
    assert.equal(buildPattern("Jane", "", "acme.com", "first"), null);
  });

  test("candidatesFor works from firstName/lastName", () => {
    const candidates = candidatesFor({ firstName: "Jane", lastName: "Doe", companyDomain: "acme.com" });
    assert.ok(candidates.length > 0);
    assert.equal(candidates[0].email, "jane.doe@acme.com");
    assert.equal(candidates[0].pattern, "first.last");
    // Every candidate must be syntactically valid.
    for (const c of candidates) {
      assert.ok(isSyntacticallyValid(c.email), c.email);
    }
  });

  test("candidatesFor splits fullName when parts are absent", () => {
    // Regression: the team-page scout emits fullName only, so a candidate
    // builder that read only firstName/lastName produced nothing for it.
    const candidates = candidatesFor({ fullName: "Karri Saarinen", companyDomain: "linear.app" });
    assert.ok(candidates.length > 0);
    assert.equal(candidates[0].email, "karri.saarinen@linear.app");
  });

  test("candidatesFor handles a middle name in fullName", () => {
    const candidates = candidatesFor({ fullName: "Nicholas P Parker", companyDomain: "acme.com" });
    assert.ok(candidates.length > 0);
    // First and LAST token are used, so the middle initial is dropped.
    assert.equal(candidates[0].email, "nicholas.parker@acme.com");
  });

  test("candidatesFor returns nothing without a domain or name", () => {
    assert.deepEqual(candidatesFor({ firstName: "Jane", lastName: "Doe" }), []);
    assert.deepEqual(candidatesFor({ fullName: "Jane Doe" }), []);
    assert.deepEqual(candidatesFor({ fullName: "Jane" , companyDomain: "acme.com" }), []);
  });

  test("every generated pattern round-trips through detectPattern", () => {
    // A candidate the verifier cannot later recognize would be unconfirmable.
    for (const pattern of PATTERN_ORDER) {
      const email = buildPattern("Jane", "Doe", "acme.com", pattern);
      assert.ok(email, pattern);
      assert.equal(detectPattern(email, "Jane", "Doe"), pattern, `pattern ${pattern} did not round-trip`);
    }
  });
});

describe("catch-all detection (no network)", () => {
  test("isCatchAll is exported and returns a boolean for a dead domain", async () => {
    // A domain with no MX cannot be a catch-all. This exercises the early return
    // without opening a socket.
    const result = await isCatchAll("this-domain-does-not-exist-zzz123.invalid");
    assert.equal(typeof result, "boolean");
    assert.equal(result, false);
  });
});
