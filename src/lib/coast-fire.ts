export type CoastInputs = {
  age: number;
  retirementAge: number;
  investments: number;
  monthlySpending: number;
  monthlyContribution: number;
  returnRate: number;
  inflationRate: number;
  withdrawalRate: number;
};

// Fictional starting values; no personal financial data is embedded in the site.
export const exampleInputs: CoastInputs = {
  age: 30,
  retirementAge: 60,
  investments: 150000,
  monthlySpending: 4000,
  monthlyContribution: 1800,
  returnRate: 7,
  inflationRate: 3,
  withdrawalRate: 4,
};

export const inputLimits: Record<keyof CoastInputs, [number, number]> = {
  age: [18, 85],
  retirementAge: [19, 100],
  investments: [0, 1000000000],
  monthlySpending: [100, 1000000],
  monthlyContribution: [0, 1000000],
  returnRate: [-10, 20],
  inflationRate: [0, 15],
  withdrawalRate: [1, 10],
};

export function validCoastInputs(input: CoastInputs): boolean {
  return (
    (Object.keys(inputLimits) as (keyof CoastInputs)[]).every((key) => {
      const value = input[key],
        [min, max] = inputLimits[key];
      return Number.isFinite(value) && value >= min && value <= max;
    }) &&
    Number.isInteger(input.age) &&
    Number.isInteger(input.retirementAge) &&
    input.retirementAge > input.age
  );
}

export type ProjectionPoint = {
  age: number;
  noDeposits: number;
  keepSaving: number;
};

export function calculateCoast(input: CoastInputs) {
  if (!validCoastInputs(input))
    throw new RangeError("Invalid Coast FIRE inputs");
  const years = input.retirementAge - input.age;
  const realReturn =
    (1 + input.returnRate / 100) / (1 + input.inflationRate / 100) - 1;
  const monthlyReturn = Math.pow(1 + realReturn, 1 / 12) - 1;
  const retirementTarget =
    (input.monthlySpending * 12) / (input.withdrawalRate / 100);
  const coastTarget = retirementTarget / Math.pow(1 + realReturn, years);
  const months = years * 12;
  let balance = input.investments;
  let firstCoastMonth: number | null = balance >= coastTarget ? 0 : null;
  const projection: ProjectionPoint[] = [
    { age: input.age, noDeposits: balance, keepSaving: balance },
  ];
  for (let month = 1; month <= months; month++) {
    // Deposits occur at the end of each month and stay constant in today's purchasing power.
    balance = balance * (1 + monthlyReturn) + input.monthlyContribution;
    const remainingTarget =
      retirementTarget / Math.pow(1 + monthlyReturn, months - month);
    if (firstCoastMonth === null && balance >= remainingTarget)
      firstCoastMonth = month;
    if (month % 12 === 0)
      projection.push({
        age: input.age + month / 12,
        noDeposits: input.investments * Math.pow(1 + monthlyReturn, month),
        keepSaving: balance,
      });
  }
  return {
    years,
    realReturn,
    retirementTarget,
    coastTarget,
    firstCoastMonth,
    projection,
    coastAge:
      firstCoastMonth === null ? null : input.age + firstCoastMonth / 12,
    gap: Math.max(0, coastTarget - input.investments),
    progress: (input.investments / coastTarget) * 100,
    noDepositRetirement: projection[projection.length - 1].noDeposits,
    savingRetirement: balance,
  };
}
