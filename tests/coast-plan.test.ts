import test from "node:test";
import assert from "node:assert/strict";
import {
  createExamplePlan,
  calculateCoastPlan,
  validCoastPlan,
  parseCoastPlan,
  planTotals,
  updateQuickField,
} from "../src/lib/coast-plan.ts";
import { calculateCoast } from "../src/lib/coast-fire.ts";

const near = (actual: number, expected: number) =>
  assert.ok(
    Math.abs(actual - expected) <= Math.max(1, Math.abs(expected)) * 1e-7,
    `${actual} != ${expected}`,
  );
function simple() {
  const p = createExamplePlan();
  p.accounts = [
    { ...p.accounts[0], balance: 150000, monthlyContribution: 1800 },
  ];
  return p;
}
function zero() {
  const p = simple();
  p.age = 50;
  p.retirementAge = 60;
  p.desiredCoastAge = 55;
  p.inflationRate = 0;
  p.accounts[0].returnRate = 0;
  p.scenarios = {
    base: { returnAdjustment: 0, inflationAdjustment: 0 },
    cautious: { returnAdjustment: 0, inflationAdjustment: 0 },
    optimistic: { returnAdjustment: 0, inflationAdjustment: 0 },
  };
  return p;
}

test("single-account detailed plan matches independently tested quick calculator", () => {
  const p = simple();
  const t = planTotals(p);
  const expected = calculateCoast({
    age: p.age,
    retirementAge: p.retirementAge,
    investments: t.investments,
    monthlyContribution: t.monthlyContribution,
    monthlySpending: t.monthlySpending,
    returnRate: 7,
    inflationRate: 3,
    withdrawalRate: 4,
  });
  const r = calculateCoastPlan(p);
  near(r.target, expected.retirementTarget);
  near(r.coastTarget!, expected.coastTarget);
  near(r.savingRetirement, expected.savingRetirement);
  near(r.stopRetirement, expected.noDepositRetirement);
  assert.equal(r.firstCoastMonth, expected.firstCoastMonth);
});
test("separate account returns compound separately; emergency cash is excluded", () => {
  const p = createExamplePlan();
  const r = calculateCoastPlan(p);
  near(
    r.stopRetirement,
    90000 * (1.07 / 1.03) ** 30 + 60000 * (1.055 / 1.03) ** 30,
  );
  near(r.investments, 150000);
  near(r.excluded, 15000);
  p.accounts[2].balance = 900000000;
  near(calculateCoastPlan(p).stopRetirement, r.stopRetirement);
});
test("annual expenses are normalised and net income does not change investments", () => {
  const p = simple();
  p.expenses = [
    {
      id: "travel",
      name: "Travel",
      current: 12000,
      retirement: 24000,
      frequency: "annual",
    },
  ];
  near(planTotals(p).currentSpending, 1000);
  near(planTotals(p).monthlySpending, 2000);
  const r = calculateCoastPlan(p);
  p.monthlyIncome = 100000;
  near(calculateCoastPlan(p).coastTarget!, r.coastTarget!);
});
test("contributions stop at selected age and never run past retirement", () => {
  const p = zero();
  p.accounts[0].monthlyContribution = 100;
  p.accounts[0].stopAge = 52;
  near(calculateCoastPlan(p).savingRetirement, 150000 + 2400);
  p.accounts[0].stopAge = 100;
  near(calculateCoastPlan(p).savingRetirement, 150000 + 12000);
});
test("continued EPF path contains employee and employer contributions only", () => {
  const p = zero();
  p.accounts = [
    { ...p.accounts[0], monthlyContribution: 100 },
    {
      ...createExamplePlan().accounts[1],
      returnRate: 0,
      balance: 50000,
      monthlyContribution: 200,
      employerContribution: 300,
    },
  ];
  const r = calculateCoastPlan(p);
  near(r.stopRetirement, 200000);
  near(r.epfRetirement, 260000);
  near(r.savingRetirement, 272000);
});
test("post-55 EPF contributions are unavailable before 60", () => {
  const p = zero();
  p.age = 54;
  p.retirementAge = 56;
  p.desiredCoastAge = 55;
  p.accounts = [
    {
      ...createExamplePlan().accounts[1],
      balance: 100000,
      returnRate: 0,
      monthlyContribution: 100,
      employerContribution: 100,
      stopAge: 56,
    },
  ];
  const r = calculateCoastPlan(p);
  near(r.accessibleAtRetirement, 102400);
  near(r.lockedAtRetirement, 2400);
});
test("locked funds cannot pay early retirement bills, even with a large total", () => {
  const p = zero();
  p.retirementAge = 51;
  p.desiredCoastAge = 51;
  p.endAge = 56;
  p.accounts = [
    {
      ...p.accounts[0],
      kind: "epf",
      balance: 2000000,
      accessAge: 55,
      monthlyContribution: 0,
    },
  ];
  const r = calculateCoastPlan(p);
  assert.ok(r.bridgeGap > 0);
  near(r.firstShortfallAge!, 51 + 1 / 12);
});
test("dated future expense raises today's required assets and lowers all projections", () => {
  const p = zero();
  p.accounts[0].monthlyContribution = 0;
  const base = calculateCoastPlan(p);
  p.events = [
    {
      id: "car",
      name: "Car",
      kind: "expense",
      amount: 10000,
      age: 55,
      endAge: 95,
      inflationAdjusted: true,
    },
  ];
  const r = calculateCoastPlan(p);
  near(r.coastTarget!, base.coastTarget! + 10000);
  near(r.savingRetirement, base.savingRetirement - 10000);
  near(r.stopRetirement, base.stopRetirement - 10000);
});
test("future lump sum does not make an underfunded portfolio Coast-ready today", () => {
  const p = zero();
  p.accounts[0].monthlyContribution = 0;
  p.events = [
    {
      id: "bonus",
      name: "Bonus",
      kind: "lumpSum",
      amount: 2000000,
      age: 55,
      endAge: 95,
      inflationAdjusted: true,
    },
  ];
  const r = calculateCoastPlan(p);
  near(r.coastTarget!, 1200000);
  near(r.savingRetirement, 2150000);
  near(r.stopRetirement, 150000);
  near(r.coastAge!, 55);
});
test("retirement income offsets cash spending only during its selected period", () => {
  const p = zero();
  p.retirementAge = 51;
  p.desiredCoastAge = 51;
  p.endAge = 54;
  p.accounts[0].monthlyContribution = 0;
  p.events = [
    {
      id: "pension",
      name: "Pension",
      kind: "income",
      amount: 4000,
      age: 51,
      endAge: 53,
      inflationAdjusted: true,
    },
  ];
  const r = calculateCoastPlan(p);
  near(r.cashProjection.find((point) => point.age === 53)!.balance, 150000);
  near(r.cashProjection.at(-1)!.balance, 102000);
  near(r.target, 1200000);
});
test("fixed nominal income loses purchasing power after its starting age", () => {
  const p = simple();
  p.events = [
    {
      id: "income",
      name: "Income",
      kind: "income",
      amount: 4000,
      age: 60,
      endAge: 95,
      inflationAdjusted: true,
    },
  ];
  const indexed = calculateCoastPlan(p);
  p.events[0].inflationAdjusted = false;
  const fixed = calculateCoastPlan(p);
  assert.ok(
    fixed.cashProjection.at(-1)!.balance <
      indexed.cashProjection.at(-1)!.balance,
  );
});
test("quick edits preserve detailed rows, names, exclusions and schedules", () => {
  const p = createExamplePlan();
  p.accounts[0].name = "My investments";
  p.accounts[0].stopAge = 45;
  const r = updateQuickField(
    updateQuickField(p, "investments", 300000),
    "monthlyContribution",
    3600,
  );
  assert.equal(r.accounts.length, 3);
  assert.equal(r.accounts[0].name, "My investments");
  assert.equal(r.accounts[0].stopAge, 45);
  assert.equal(r.accounts[2].balance, 15000);
  assert.equal(r.accounts[2].included, false);
  near(planTotals(r).investments, 300000);
  near(planTotals(r).monthlyContribution, 3600);
  assert.equal(p.accounts[0].balance, 90000);
});
test("zero balances and negative real returns give finite results", () => {
  const p = simple();
  p.accounts[0].balance = 0;
  p.accounts[0].returnRate = 1;
  const r = calculateCoastPlan(p);
  assert.ok(Number.isFinite(r.coastTarget));
  assert.ok(r.coastTarget! > r.target);
  assert.equal(r.progress, 0);
});
test("saved plan roundtrips and malformed files are rejected", () => {
  const p = createExamplePlan();
  assert.deepEqual(parseCoastPlan(JSON.stringify(p)), p);
  for (const bad of [
    null,
    {},
    { ...p, age: NaN },
    { ...p, retirementAge: p.age },
    { ...p, accounts: [] },
    { ...p, accounts: [...p.accounts, p.accounts[0]] },
    { ...p, events: [{ id: "x" }] },
    { ...p, scenarios: null },
  ]) {
    assert.equal(validCoastPlan(bad), false);
    assert.throws(() => parseCoastPlan(JSON.stringify(bad)));
  }
  assert.throws(() => parseCoastPlan("x".repeat(100001)));
});
test("cautious assumptions require more today than the base and optimistic scenarios", () => {
  const p = createExamplePlan();
  const low = calculateCoastPlan(p, "cautious"),
    base = calculateCoastPlan(p),
    high = calculateCoastPlan(p, "optimistic");
  assert.ok(low.coastTarget! > base.coastTarget!);
  assert.ok(base.coastTarget! > high.coastTarget!);
  assert.ok(low.savingRetirement < base.savingRetirement);
  assert.ok(base.savingRetirement < high.savingRetirement);
});

test("a current-age expense is included in the required starting capital", () => {
  const p = zero();
  p.accounts[0].monthlyContribution = 0;
  p.events = [
    {
      id: "expense-now",
      name: "Expense",
      kind: "expense",
      amount: 10000,
      age: 50,
      endAge: 95,
      inflationAdjusted: true,
    },
  ];
  const r = calculateCoastPlan(p);
  near(r.coastTarget!, 1210000);
  near(r.stopRetirement, 140000);
});
test("zero-balance EPF accessible at 60 does not duplicate the allocation", () => {
  const p = zero();
  p.accounts = [
    {
      ...p.accounts[0],
      balance: 0,
      kind: "epf",
      accessAge: 60,
      monthlyContribution: 0,
    },
  ];
  near(calculateCoastPlan(p).coastTarget!, 1200000);
});
test("quick-mode inflation extremes keep scenario inflation within bounds", () => {
  assert.equal(
    validCoastPlan(updateQuickField(createExamplePlan(), "inflationRate", 0)),
    true,
  );
  assert.equal(
    validCoastPlan(updateQuickField(createExamplePlan(), "inflationRate", 15)),
    true,
  );
});
