import { describe, expect, it } from "vitest";
import { hasRole } from "@/lib/auth/tideJWT";
import {
  approve, checkPassword, hashPassword, identity, INITIAL_STATE, propose, QUORUM, signSession, validUsername, verifySession,
} from "@/lib/sim";
import { inGroup } from "@/lib/access";

const SECRET = "test-secret";

describe("simulated session", () => {
  it("round-trips a user and rejects tampering", () => {
    const token = signSession("admin1", SECRET);
    expect(verifySession(token, SECRET)).toBe("admin1");
    expect(verifySession(token.replace("admin1", "admin2"), SECRET)).toBeNull();
    expect(verifySession(token, "other-secret")).toBeNull();
    expect(verifySession(signSession("new.student", SECRET), SECRET)).toBe("new.student");
    expect(verifySession("", SECRET)).toBeNull();
  });
});

describe("accounts", () => {
  it("stores only a salted hash and checks the password against it", () => {
    const rec = hashPassword("correct horse");
    expect(JSON.stringify(rec)).not.toContain("correct horse");
    expect(hashPassword("correct horse").hash).not.toBe(rec.hash); // fresh salt each time
    expect(checkPassword("correct horse", rec)).toBe(true);
    expect(checkPassword("wrong horse", rec)).toBe(false);
  });

  it("accepts plain usernames only", () => {
    expect(validUsername("new.student")).toBe(true);
    expect(validUsername("ab")).toBe(false);
    expect(validUsername("has space")).toBe(false);
    expect(validUsername("../etc")).toBe(false);
  });
});

describe("identity", () => {
  it("gives roles by account and the committee group by membership", () => {
    const reporter = identity("reporter1", INITIAL_STATE);
    expect(hasRole(reporter, "reporter")).toBe(true);
    expect(inGroup(reporter, "/committee")).toBe(false);
    expect(inGroup(identity("committee1", INITIAL_STATE), "/committee")).toBe(true);
    expect(hasRole(identity("admin1", INITIAL_STATE), "it-admin")).toBe(true);
    expect(inGroup(identity("admin1", INITIAL_STATE), "/committee")).toBe(false);
  });

  it("makes a newly created account a reporter and nothing more", () => {
    const fresh = identity("new.student", INITIAL_STATE);
    expect(hasRole(fresh, "reporter")).toBe(true);
    expect(hasRole(fresh, "it-admin")).toBe(false);
    expect(inGroup(fresh, "/committee")).toBe(false);
  });
});

describe("committee change quorum", () => {
  const proposed = propose(INITIAL_STATE, { subject: "admin1", change: "add", by: "admin1", id: "cr1", at: "t" });

  it("needs two different admins before anything changes", () => {
    expect(QUORUM).toBe(2);
    const once = approve(proposed, "cr1", "admin1");
    expect(once.committee).not.toContain("admin1");
    expect(once.requests[0].status).toBe("pending");
    expect(() => approve(once, "cr1", "admin1")).toThrow(/already approved/);

    const twice = approve(once, "cr1", "admin2");
    expect(twice.requests[0].status).toBe("applied");
    expect(twice.committee).toContain("admin1");
    expect(inGroup(identity("admin1", twice), "/committee")).toBe(true);
    expect(() => approve(twice, "cr1", "admin3")).toThrow(/not pending/);
  });

  it("only lets IT admins approve, and a new account is never one", () => {
    expect(() => approve(proposed, "cr1", "committee1")).toThrow(/IT admins/);
    expect(() => approve(proposed, "cr1", "new.student")).toThrow(/IT admins/);
  });

  it("can add a newly created account to the committee", () => {
    const p = propose(INITIAL_STATE, { subject: "new.student", change: "add", by: "admin1", id: "cr3", at: "t" });
    expect(approve(approve(p, "cr3", "admin1"), "cr3", "admin3").committee).toContain("new.student");
  });

  it("removes a member once approved", () => {
    const p = propose(INITIAL_STATE, { subject: "committee1", change: "remove", by: "admin2", id: "cr2", at: "t" });
    const done = approve(approve(p, "cr2", "admin2"), "cr2", "admin3");
    expect(done.committee).not.toContain("committee1");
  });

  it("rejects changes that would do nothing or duplicate a pending one", () => {
    expect(() => propose(INITIAL_STATE, { subject: "committee1", change: "add", by: "admin1", id: "x", at: "t" })).toThrow(/already/);
    expect(() => propose(INITIAL_STATE, { subject: "admin1", change: "remove", by: "admin1", id: "x", at: "t" })).toThrow(/not on/);
    expect(() => propose(proposed, { subject: "admin1", change: "add", by: "admin2", id: "y", at: "t" })).toThrow(/pending/);
    expect(() => propose(INITIAL_STATE, { subject: "admin1", change: "add", by: "reporter1", id: "z", at: "t" })).toThrow(/IT admins/);
  });
});
