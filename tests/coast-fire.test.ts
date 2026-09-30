import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateCoast,
  exampleInputs,
  validCoastInputs,
} from "../src/lib/coast-fire.ts";

function near(actual: number, expected: number) {
  assert.ok(
    Math.abs(actual - expected) <= Math.max(1, Math.abs(expected)) * 1e-9,
    "Expected " + actual + " to be approximately " + expected,
  );
}

test("Coast target discounts the spending target using exact inflation-adjusted growth", () => {
  const r = calculateCoast(exampleInputs);
  near(r.retirementTarget, 1200000);
  near(r.realReturn, 1.07 / 1.03 - 1);
  near(r.coastTarget, 1200000 / Math.pow(1.07 / 1.03, 30));
  near(r.noDepositRetirement, 150000 * Math.pow(1.07 / 1.03, 30));
});

test("end-of-month contributions match the independent annuity formula", () => {
  const r = calculateCoast(exampleInputs);
  const monthly = Math.pow(1.07 / 1.03, 1 / 12) - 1;
  const factor = Math.pow(1 + monthly, 360);
  near(r.savingRetirement, 150000 * factor + (1800 * (factor - 1)) / monthly);
  const month = r.firstCoastMonth!;
  assert.ok(month > 0 && month < 360);
  const balance = (m: number) =>
    150000 * Math.pow(1 + monthly, m) +
    (1800 * (Math.pow(1 + monthly, m) - 1)) / monthly;
  const target = (m: number) => 1200000 / Math.pow(1 + monthly, 360 - m);
  assert.ok(balance(month) >= target(month) - 1e-7);
  assert.ok(balance(month - 1) < target(month - 1));
});

test("zero real return needs the full target today and avoids division by zero", () => {
  const input = { ...exampleInputs, returnRate: 3, inflationRate: 3 };
  const r = calculateCoast(input);
  near(r.realReturn, 0);
  near(r.coastTarget, r.retirementTarget);
  near(r.savingRetirement, input.investments + input.monthlyContribution * 360);
  near(r.noDepositRetirement, input.investments);
  assert.equal(r.firstCoastMonth, null);
});

test("no future deposits cannot change a below-target portfolio into a Coast-ready one", () => {
  const r = calculateCoast({ ...exampleInputs, monthlyContribution: 0 });
  assert.equal(r.coastAge, null);
  near(r.noDepositRetirement, r.savingRetirement);
});

test("a portfolio already above the Coast target is ready today", () => {
  const target = calculateCoast(exampleInputs).coastTarget;
  const r = calculateCoast({ ...exampleInputs, investments: target + 1 });
  assert.equal(r.firstCoastMonth, 0);
  assert.equal(r.coastAge, exampleInputs.age);
  assert.equal(r.gap, 0);
  assert.ok(r.progress > 100);
});

test("negative real growth produces a higher Coast target and declining purchasing power", () => {
  const r = calculateCoast({
    ...exampleInputs,
    returnRate: 1,
    inflationRate: 3,
    monthlyContribution: 0,
  });
  assert.ok(r.realReturn < 0);
  assert.ok(r.coastTarget > r.retirementTarget);
  assert.ok(r.noDepositRetirement < exampleInputs.investments);
  assert.equal(r.coastAge, null);
});

test("spending and withdrawal assumptions scale the target as expected", () => {
  const base = calculateCoast(exampleInputs);
  const doubleSpending = calculateCoast({
    ...exampleInputs,
    monthlySpending: 8000,
  });
  const lowerWithdrawal = calculateCoast({
    ...exampleInputs,
    withdrawalRate: 2,
  });
  near(doubleSpending.coastTarget, base.coastTarget * 2);
  near(lowerWithdrawal.coastTarget, base.coastTarget * 2);
});

test("invalid or incomplete inputs cannot create misleading results", () => {
  for (const input of [
    { ...exampleInputs, retirementAge: 30 },
    { ...exampleInputs, age: 30.5 },
    { ...exampleInputs, withdrawalRate: 0 },
    { ...exampleInputs, investments: -1 },
    { ...exampleInputs, inflationRate: NaN },
    { ...exampleInputs, returnRate: Infinity },
  ]) {
    assert.equal(validCoastInputs(input), false);
    assert.throws(() => calculateCoast(input), RangeError);
  }
});
