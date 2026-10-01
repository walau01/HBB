import type { CoastInputs } from "./coast-fire";

export type AccountKind = "investment" | "epf" | "cash" | "other";
export type PlanAccount = {
  id: string;
  name: string;
  kind: AccountKind;
  balance: number;
  returnRate: number;
  accessAge: number;
  included: boolean;
  monthlyContribution: number;
  employerContribution: number;
  annualIncrease: number;
  stopAge: number;
};
export type PlanExpense = {
  id: string;
  name: string;
  current: number;
  retirement: number;
  frequency: "monthly" | "annual";
  // Missing/null preserves the general assumption, including older saved plans.
  inflationRate?: number | null;
};
export type PlanEvent = {
  id: string;
  name: string;
  kind: "expense" | "lumpSum" | "income";
  amount: number;
  age: number;
  endAge: number;
  inflationAdjusted: boolean;
};
export type Scenario = "cautious" | "base" | "optimistic";
export type CoastPlan = {
  version: 2;
  age: number;
  retirementAge: number;
  desiredCoastAge: number;
  endAge: number;
  household: "individual" | "household";
  monthlyIncome: number;
  inflationRate: number;
  withdrawalRate: number;
  accounts: PlanAccount[];
  expenses: PlanExpense[];
  events: PlanEvent[];
  scenarios: Record<
    Scenario,
    { returnAdjustment: number; inflationAdjustment: number }
  >;
};

// Deliberately fictional, round figures. No owner's personal balances are published.
export function createExamplePlan(): CoastPlan {
  return {
    version: 2,
    age: 30,
    retirementAge: 60,
    desiredCoastAge: 40,
    endAge: 95,
    household: "individual",
    monthlyIncome: 6000,
    inflationRate: 3,
    withdrawalRate: 4,
    accounts: [
      {
        id: "investments",
        name: "",
        kind: "investment",
        balance: 90000,
        returnRate: 7,
        accessAge: 18,
        included: true,
        monthlyContribution: 1000,
        employerContribution: 0,
        annualIncrease: 0,
        stopAge: 60,
      },
      {
        id: "epf",
        name: "",
        kind: "epf",
        balance: 60000,
        returnRate: 5.5,
        accessAge: 55,
        included: true,
        monthlyContribution: 400,
        employerContribution: 400,
        annualIncrease: 0,
        stopAge: 60,
      },
      {
        id: "emergency",
        name: "",
        kind: "cash",
        balance: 15000,
        returnRate: 3,
        accessAge: 18,
        included: false,
        monthlyContribution: 0,
        employerContribution: 0,
        annualIncrease: 0,
        stopAge: 60,
      },
    ],
    expenses: [
      {
        id: "housing",
        name: "",
        current: 500,
        retirement: 800,
        frequency: "monthly",
      },
      {
        id: "food",
        name: "",
        current: 600,
        retirement: 700,
        frequency: "monthly",
      },
      {
        id: "transport",
        name: "",
        current: 400,
        retirement: 300,
        frequency: "monthly",
      },
      {
        id: "health",
        name: "",
        current: 250,
        retirement: 500,
        frequency: "monthly",
      },
      {
        id: "family",
        name: "",
        current: 800,
        retirement: 800,
        frequency: "monthly",
      },
      {
        id: "leisure",
        name: "",
        current: 300,
        retirement: 700,
        frequency: "monthly",
      },
      {
        id: "other",
        name: "",
        current: 150,
        retirement: 200,
        frequency: "monthly",
      },
    ],
    events: [],
    scenarios: {
      cautious: { returnAdjustment: -2, inflationAdjustment: 1 },
      base: { returnAdjustment: 0, inflationAdjustment: 0 },
      optimistic: { returnAdjustment: 2, inflationAdjustment: -0.5 },
    },
  };
}

const inRange = (v: unknown, min: number, max: number): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
const ageValue = (v: unknown) => inRange(v, 18, 110) && Number.isInteger(v);
const named = (v: unknown): v is { id: string; name: string } => {
  if (!v || typeof v !== "object") return false;
  const row = v as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    /^[a-zA-Z0-9_-]{1,80}$/.test(row.id) &&
    typeof row.name === "string" &&
    row.name.length <= 100
  );
};

// Also the import boundary: reject malformed files, NaN, oversized arrays and duplicate IDs.
export function validCoastPlan(value: unknown): value is CoastPlan {
  if (!value || typeof value !== "object") return false;
  const p = value as CoastPlan;
  if (
    p.version !== 2 ||
    !ageValue(p.age) ||
    p.age > 85 ||
    !ageValue(p.retirementAge) ||
    p.retirementAge <= p.age ||
    p.retirementAge > 100 ||
    !ageValue(p.desiredCoastAge) ||
    p.desiredCoastAge < p.age ||
    p.desiredCoastAge > p.retirementAge ||
    !ageValue(p.endAge) ||
    p.endAge <= p.retirementAge ||
    !["individual", "household"].includes(p.household) ||
    !inRange(p.monthlyIncome, 0, 1000000) ||
    !inRange(p.inflationRate, 0, 15) ||
    !inRange(p.withdrawalRate, 1, 10)
  )
    return false;
  if (
    !Array.isArray(p.accounts) ||
    p.accounts.length < 1 ||
    p.accounts.length > 20 ||
    !p.accounts.some((a) => a?.included) ||
    !p.accounts.every(
      (a) =>
        named(a) &&
        ["investment", "epf", "cash", "other"].includes(a.kind) &&
        inRange(a.balance, 0, 1000000000) &&
        inRange(a.returnRate, -10, 20) &&
        ageValue(a.accessAge) &&
        typeof a.included === "boolean" &&
        inRange(a.monthlyContribution, 0, 1000000) &&
        inRange(a.employerContribution, 0, 1000000) &&
        (a.kind === "epf" || a.employerContribution === 0) &&
        inRange(a.annualIncrease, -10, 10) &&
        ageValue(a.stopAge),
    )
  )
    return false;
  if (
    !Array.isArray(p.expenses) ||
    p.expenses.length < 1 ||
    p.expenses.length > 30 ||
    !p.expenses.every(
      (e) =>
        named(e) &&
        inRange(e.current, 0, 1000000) &&
        inRange(e.retirement, 0, 1000000) &&
        (e.inflationRate == null || inRange(e.inflationRate, 0, 15)) &&
        ["monthly", "annual"].includes(e.frequency),
    ) ||
    p.expenses.reduce(
      (sum, e) => sum + e.retirement / (e.frequency === "annual" ? 12 : 1),
      0,
    ) <= 0
  )
    return false;
  if (
    !Array.isArray(p.events) ||
    p.events.length > 20 ||
    !p.events.every(
      (e) =>
        named(e) &&
        ["expense", "lumpSum", "income"].includes(e.kind) &&
        inRange(e.amount, 0, 1000000000) &&
        ageValue(e.age) &&
        e.age >= p.age &&
        e.age <= p.endAge &&
        ageValue(e.endAge) &&
        e.endAge >= e.age &&
        (e.kind !== "income" || e.endAge > e.age) &&
        e.endAge <= p.endAge &&
        (e.kind !== "income" || e.age >= p.retirementAge) &&
        typeof e.inflationAdjusted === "boolean",
    )
  )
    return false;
  for (const rows of [p.accounts, p.expenses, p.events]) {
    if (new Set(rows.map((r) => r.id)).size !== rows.length) return false;
  }
  if (
    new Set([...p.accounts, ...p.expenses, ...p.events].map((r) => r.id))
      .size !==
    p.accounts.length + p.expenses.length + p.events.length
  )
    return false;
  if (
    !p.scenarios ||
    !["cautious", "base", "optimistic"].every((s) => {
      const scenario = p.scenarios[s as Scenario];
      return (
        scenario &&
        inRange(scenario.returnAdjustment, -5, 5) &&
        inRange(scenario.inflationAdjustment, -3, 3) &&
        inRange(p.inflationRate + scenario.inflationAdjustment, 0, 15) &&
        p.accounts.every((a) =>
          inRange(a.returnRate + scenario.returnAdjustment, -15, 25),
        )
      );
    })
  )
    return false;
  return true;
}

export function parseCoastPlan(text: string): CoastPlan {
  if (text.length > 100000) throw new RangeError("Plan is too large");
  const plan: unknown = JSON.parse(text);
  if (!validCoastPlan(plan)) throw new RangeError("Invalid Coast FIRE plan");
  return plan;
}

export function planTotals(p: CoastPlan) {
  const included = p.accounts.filter((a) => a.included);
  const investments = included.reduce((s, a) => s + a.balance, 0);
  const currentSpending = p.expenses.reduce(
    (s, e) => s + e.current / (e.frequency === "annual" ? 12 : 1),
    0,
  );
  const monthlySpending = p.expenses.reduce(
    (s, e) => s + e.retirement / (e.frequency === "annual" ? 12 : 1),
    0,
  );
  const monthlyContribution = included.reduce(
    (s, a) => s + a.monthlyContribution + a.employerContribution,
    0,
  );
  const voluntary = included
    .filter((a) => a.kind !== "epf")
    .reduce((s, a) => s + a.monthlyContribution, 0);
  return {
    investments,
    currentSpending,
    monthlySpending,
    monthlyContribution,
    voluntary,
    epfContribution: monthlyContribution - voluntary,
    excluded: p.accounts
      .filter((a) => !a.included)
      .reduce((s, a) => s + a.balance, 0),
    accessible: included
      .filter((a) => a.accessAge <= p.age)
      .reduce((s, a) => s + a.balance, 0),
    surplus: p.monthlyIncome - currentSpending - voluntary,
    returnRate:
      investments > 0
        ? included.reduce((s, a) => s + a.balance * a.returnRate, 0) /
          investments
        : included.reduce((s, a) => s + a.returnRate, 0) /
          Math.max(1, included.length),
  };
}

// Quick mode edits the same plan, redistributing totals rather than deleting detailed rows.
export function updateQuickField(
  plan: CoastPlan,
  key: keyof CoastInputs,
  value: number,
): CoastPlan {
  const p = structuredClone(plan);
  // Never spread a temporary empty input into derived ages, budgets or scenarios.
  if (!Number.isFinite(value)) return p;
  const totals = planTotals(p);
  if (key === "age" || key === "retirementAge") {
    p[key] = value;
    p.desiredCoastAge = Math.max(
      p.age,
      Math.min(p.retirementAge, p.desiredCoastAge),
    );
    p.endAge = Math.max(p.endAge, p.retirementAge + 1);
  } else if (key === "inflationRate" || key === "withdrawalRate") {
    p[key] = value;
    if (key === "inflationRate")
      for (const row of Object.values(p.scenarios)) {
        row.inflationAdjustment = Math.max(
          -value,
          Math.min(15 - value, row.inflationAdjustment),
        );
      }
  } else if (key === "monthlySpending") {
    p.expenses.forEach((e, i) => {
      e.retirement =
        totals.monthlySpending > 0
          ? (e.retirement * value) / totals.monthlySpending
          : i === 0
            ? value * (e.frequency === "annual" ? 12 : 1)
            : 0;
    });
  } else {
    const included = p.accounts.filter((a) => a.included);
    included.forEach((a, i) => {
      if (key === "returnRate") a.returnRate = value;
      if (key === "investments")
        a.balance =
          totals.investments > 0
            ? (a.balance * value) / totals.investments
            : i === 0
              ? value
              : 0;
      if (key === "monthlyContribution") {
        a.monthlyContribution =
          totals.monthlyContribution > 0
            ? (a.monthlyContribution * value) / totals.monthlyContribution
            : i === 0
              ? value
              : 0;
        a.employerContribution =
          totals.monthlyContribution > 0
            ? (a.employerContribution * value) / totals.monthlyContribution
            : 0;
      }
    });
  }
  return p;
}

type Bucket = { account: number; balance: number; accessAge: number };
type Path = "saving" | "stop" | "epf";
export type PlanPoint = {
  age: number;
  saving: number;
  stop: number;
  epf: number;
  threshold: number | null;
};
export type CashPoint = { age: number; balance: number; accessible: number };

// Inputs are today's prices. Inflate each category, then deflate once into the
// general today-RM basis used by account returns and the rest of the model.
export function retirementSpendingAtAge(
  p: CoastPlan,
  scenario: Scenario,
  age: number,
) {
  const change = p.scenarios[scenario].inflationAdjustment;
  const general = (p.inflationRate + change) / 100;
  const categories = p.expenses.map((e) => {
    const inflationRate = Math.max(
      0,
      Math.min(15, (e.inflationRate ?? p.inflationRate) + change),
    );
    const monthly = e.retirement / (e.frequency === "annual" ? 12 : 1);
    const nominal = monthly * Math.pow(1 + inflationRate / 100, age - p.age);
    return {
      id: e.id,
      inflationRate,
      nominal,
      today: nominal / Math.pow(1 + general, age - p.age),
    };
  });
  return {
    categories,
    today: categories.reduce((sum, e) => sum + e.today, 0),
    nominal: categories.reduce((sum, e) => sum + e.nominal, 0),
  };
}

export function calculateCoastPlan(p: CoastPlan, scenario: Scenario = "base") {
  if (!validCoastPlan(p)) throw new RangeError("Invalid Coast FIRE plan");
  const accounts = p.accounts.filter((a) => a.included);
  const totals = planTotals(p);
  const adjustment = p.scenarios[scenario];
  const inflation = (p.inflationRate + adjustment.inflationAdjustment) / 100;
  const realReturns = accounts.map(
    (a) =>
      (1 + (a.returnRate + adjustment.returnAdjustment) / 100) /
        (1 + inflation) -
      1,
  );
  const rates = realReturns.map((r) => Math.pow(1 + r, 1 / 12));
  const months = (p.retirementAge - p.age) * 12;
  const retirementSpending = retirementSpendingAtAge(
    p,
    scenario,
    p.retirementAge,
  );
  const target = (retirementSpending.today * 12) / (p.withdrawalRate / 100);
  const initial = (): Bucket[] =>
    accounts.flatMap((a, i) => [
      { account: i, balance: a.balance, accessAge: a.accessAge },
      ...(a.kind === "epf" && a.accessAge !== 60
        ? [{ account: i, balance: 0, accessAge: 60 }]
        : []),
    ]);
  const total = (b: Bucket[]) => b.reduce((s, a) => s + a.balance, 0);
  const accessible = (b: Bucket[], age: number) =>
    b.filter((a) => a.accessAge <= age).reduce((s, a) => s + a.balance, 0);
  const grow = (b: Bucket[]) =>
    b.forEach((a) => {
      a.balance *= rates[a.account];
    });
  const withdraw = (b: Bucket[], amount: number, age: number) => {
    const available = accessible(b, age);
    const funded = Math.min(available, amount);
    if (available > 0)
      b.forEach((a) => {
        if (a.accessAge <= age)
          a.balance = Math.max(0, a.balance - (funded * a.balance) / available);
      });
    return Math.max(0, amount - funded);
  };
  const deposit = (b: Bucket[], amount: number, age: number) => {
    const destination = b.find((a) => a.accessAge <= age);
    if (destination) destination.balance += amount;
    else b.push({ account: 0, balance: amount, accessAge: 18 });
  };
  const oneOff = (b: Bucket[], month: number, includeInflow: boolean) => {
    let unfunded = 0;
    for (const e of p.events) {
      if ((e.age - p.age) * 12 !== month || e.kind === "income") continue;
      if (e.kind === "expense")
        unfunded += withdraw(b, e.amount, p.age + month / 12);
      if (e.kind === "lumpSum" && includeInflow)
        deposit(b, e.amount, p.age + month / 12);
    }
    return unfunded;
  };
  const addContributions = (b: Bucket[], month: number, path: Path) => {
    if (path === "stop") return;
    const startAge = p.age + (month - 1) / 12;
    accounts.forEach((a, i) => {
      if (startAge >= a.stopAge || (path === "epf" && a.kind !== "epf")) return;
      const amount =
        (a.monthlyContribution + a.employerContribution) *
        Math.pow(1 + a.annualIncrease / 100, (month - 1) / 12);
      // Contributions from the 55th birthday go into a separate age-60 bucket.
      const accessAge = a.kind === "epf" && startAge >= 55 ? 60 : a.accessAge;
      const bucket = b.find(
        (v) => v.account === i && v.accessAge === accessAge,
      )!;
      bucket.balance += amount;
    });
  };
  const futureExpenses = p.events.filter(
    (e) => e.kind === "expense" && e.age <= p.retirementAge,
  );
  const terminalNoSaving = (start: Bucket[], from: number) => {
    if (!futureExpenses.some((e) => (e.age - p.age) * 12 > from)) {
      return {
        balance: start.reduce(
          (s, a) => s + a.balance * Math.pow(rates[a.account], months - from),
          0,
        ),
        unfunded: 0,
      };
    }
    const b = start.map((a) => ({ ...a }));
    let unfunded = 0;
    for (let m = from + 1; m <= months; m++) {
      grow(b);
      unfunded += oneOff(b, m, false);
    }
    return { balance: total(b), unfunded };
  };
  const reaches = (b: Bucket[], from: number) => {
    const r = terminalNoSaving(b, from);
    return r.unfunded < 0.01 && r.balance >= target - 0.001;
  };
  const required = (b: Bucket[], from: number, includeToday = false) => {
    const size = total(b);
    const mix =
      size > 0
        ? b.map((a) => ({ ...a, balance: a.balance / size }))
        : initial().map((a) => ({
            ...a,
            balance:
              a.accessAge === accounts[a.account].accessAge
                ? 1 / accounts.length
                : 0,
          }));
    if (
      !futureExpenses.some(
        (e) => (e.age - p.age) * 12 > from || (includeToday && e.age === p.age),
      )
    ) {
      return (
        target /
        mix.reduce(
          (s, a) => s + a.balance * Math.pow(rates[a.account], months - from),
          0,
        )
      );
    }
    let low = 0,
      high =
        Math.max(target, target / Math.pow(Math.min(...rates), months - from)) +
        futureExpenses.reduce((s, e) => s + e.amount, 0);
    const scaled = (amount: number) =>
      mix.map((a) => ({ ...a, balance: a.balance * amount }));
    const enough = (amount: number) => {
      const buckets = scaled(amount);
      const todayShortfall = includeToday ? oneOff(buckets, 0, false) : 0;
      return todayShortfall < 0.01 && reaches(buckets, from);
    };
    for (let i = 0; i < 20 && !enough(high); i++) high *= 2;
    if (!enough(high)) return null; // Locked accounts cannot pay an earlier expense.
    for (let i = 0; i < 38; i++) {
      const middle = (low + high) / 2;
      if (enough(middle)) high = middle;
      else low = middle;
    }
    return high;
  };
  const paths: Record<Path, Bucket[]> = {
    saving: initial(),
    stop: initial(),
    epf: initial(),
  };
  const shortfalls: Record<Path, number> = { saving: 0, stop: 0, epf: 0 };
  for (const path of ["saving", "stop", "epf"] as const)
    shortfalls[path] += oneOff(paths[path], 0, path !== "stop");
  const coastTarget = required(initial(), 0, true);
  let firstCoastMonth: number | null =
    shortfalls.saving < 0.01 && reaches(paths.saving, 0) ? 0 : null;
  const projection: PlanPoint[] = [
    {
      age: p.age,
      saving: total(paths.saving),
      stop: total(paths.stop),
      epf: total(paths.epf),
      threshold: required(paths.saving, 0),
    },
  ];
  const eventMonths = new Set(
    p.events
      .filter((e) => e.age <= p.retirementAge)
      .flatMap((e) => [(e.age - p.age) * 12 - 1, (e.age - p.age) * 12]),
  );
  for (let m = 1; m <= months; m++) {
    for (const path of ["saving", "stop", "epf"] as const) {
      grow(paths[path]);
      addContributions(paths[path], m, path);
      shortfalls[path] += oneOff(paths[path], m, path !== "stop");
    }
    if (
      firstCoastMonth === null &&
      shortfalls.saving < 0.01 &&
      reaches(paths.saving, m)
    )
      firstCoastMonth = m;
    if (m % 12 === 0 || m === firstCoastMonth || eventMonths.has(m))
      projection.push({
        age: p.age + m / 12,
        saving: total(paths.saving),
        stop: total(paths.stop),
        epf: total(paths.epf),
        threshold: required(paths.saving, m),
      });
  }
  const accessibleAtRetirement = accessible(paths.saving, p.retirementAge);
  const cashBuckets = paths.saving.map((a) => ({ ...a }));
  const cashProjection: CashPoint[] = [
    {
      age: p.retirementAge,
      balance: total(cashBuckets),
      accessible: accessibleAtRetirement,
    },
  ];
  let bridgeGap = 0,
    firstShortfallAge: number | null = null;
  for (let m = months + 1; m <= (p.endAge - p.age) * 12; m++) {
    grow(cashBuckets);
    const age = p.age + m / 12;
    let income = 0;
    for (const e of p.events)
      if (e.kind === "income" && age > e.age && age <= e.endAge) {
        // A fixed nominal payment starts at the purchasing power entered, then erodes.
        income +=
          e.amount /
          (e.inflationAdjusted ? 1 : Math.pow(1 + inflation, age - e.age));
      }
    const lockedBefore = total(cashBuckets) - accessible(cashBuckets, age);
    const spending = retirementSpendingAtAge(p, scenario, age).today;
    if (income > spending) deposit(cashBuckets, income - spending, age);
    const deficit =
      withdraw(cashBuckets, Math.max(0, spending - income), age) +
      oneOff(cashBuckets, m, true);
    if (deficit > 0.01 && firstShortfallAge === null) firstShortfallAge = age;
    if (lockedBefore > 0.01) bridgeGap += deficit;
    if (m % 12 === 0)
      cashProjection.push({
        age,
        balance: total(cashBuckets),
        accessible: accessible(cashBuckets, age),
      });
  }
  return {
    ...totals,
    inflation,
    target,
    retirementSpending,
    nominalTarget: (retirementSpending.nominal * 12) / (p.withdrawalRate / 100),
    fireGap: Math.max(0, target - totals.investments),
    fireProgress: (totals.investments / target) * 100,
    coastTarget,
    projection,
    cashProjection,
    firstCoastMonth,
    coastAge: firstCoastMonth === null ? null : p.age + firstCoastMonth / 12,
    gap:
      coastTarget === null
        ? null
        : Math.max(0, coastTarget - totals.investments),
    progress:
      coastTarget === null ? 0 : (totals.investments / coastTarget) * 100,
    savingRetirement: total(paths.saving),
    stopRetirement: total(paths.stop),
    epfRetirement: total(paths.epf),
    accessibleAtRetirement,
    lockedAtRetirement: total(paths.saving) - accessibleAtRetirement,
    bridgeGap,
    firstShortfallAge,
    eventShortfall: shortfalls.saving,
    weightedRealReturn:
      totals.investments > 0
        ? accounts.reduce((s, a, i) => s + a.balance * realReturns[i], 0) /
          totals.investments
        : realReturns.reduce((s, r) => s + r, 0) / accounts.length,
  };
}
