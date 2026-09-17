import assert from "node:assert/strict";
import test from "node:test";
import { parseContactsCsv } from "../lib/outreach/csv";
import { renderTemplate } from "../lib/outreach/templates";
import { canSendOutreach } from "../lib/policy/outreach";

test("CSV import normalizes aliases and rejects duplicate rows", () => {
  const result = parseContactsCsv('First Name,Last Name,Email,Company\nJane,Doe,JANE@example.com,"Doe, Inc"\nJane,Doe,jane@example.com,"Doe, Inc"\nBad,Row,not-an-email,Nope');
  assert.equal(result.valid.length, 1);
  assert.equal(result.valid[0].email, "jane@example.com");
  assert.equal(result.valid[0].company, "Doe, Inc");
  assert.deepEqual(result.invalid.map(item => item.reason), ["duplicate_in_file", "invalid_email"]);
});

test("template rendering uses contact values", () => {
  const output = renderTemplate("Hi {{ firstName }}, hello {{company}}", { fullName: "Jane Doe", firstName: "Jane", email: "jane@example.com", company: "Doe Inc" });
  assert.equal(output, "Hi Jane, hello Doe Inc");
});

test("policy blocks missing permission, replies and limits", () => {
  assert.equal(canSendOutreach({ email: "a@example.com", outreachAllowed: false }).allowed, false);
  assert.equal(canSendOutreach({ email: "a@example.com", outreachAllowed: true, replied: true }).allowed, false);
  assert.equal(canSendOutreach({ email: "a@example.com", outreachAllowed: true, sentToday: 10, dailyLimit: 10 }).allowed, false);
  assert.equal(canSendOutreach({ email: "a@example.com", outreachAllowed: true, sentToday: 9, dailyLimit: 10 }).allowed, true);
});
