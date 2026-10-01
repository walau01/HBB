import React, { useEffect, useMemo, useRef, useState } from "react";
import type dictionary from "@/i18n/en.json";
import { inputLimits, type CoastInputs } from "@/lib/coast-fire";
import {
  calculateCoastPlan,
  createExamplePlan,
  parseCoastPlan,
  planTotals,
  updateQuickField,
  validCoastPlan,
  type CoastPlan,
  type PlanAccount,
  type PlanExpense,
  type PlanEvent,
  type Scenario,
} from "@/lib/coast-plan";
import CoastPlanChart from "./CoastPlanChart";

type Copy = typeof dictionary.coast;
type Props = { copy: Copy; lang: string; journalHref: string };
type Section = keyof Copy["workspace"]["sections"];
const sections: Section[] = [
  "timeline",
  "assets",
  "spending",
  "contributions",
  "events",
  "assumptions",
];
const scenarios: Scenario[] = ["cautious", "base", "optimistic"];
const storageKey = "walau01-coast-plan-v2";
const rowId = () => "row-" + crypto.randomUUID();

function NumberField({
  id,
  label,
  value,
  onChange,
  min = 0,
  max = 1000000,
  suffix,
  money,
  hint,
  integer = false,
  invalid = false,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
  money?: boolean;
  hint?: string;
  integer?: boolean;
  invalid?: boolean;
}) {
  const error =
    invalid ||
    !Number.isFinite(value) ||
    value < min ||
    value > max ||
    (integer && !Number.isInteger(value));
  return (
    <div className="coast-field">
      <label htmlFor={id}>{label}</label>
      <div className={"coast-input-wrap" + (error ? " invalid" : "")}>
        {money && <span aria-hidden="true">RM</span>}
        <input
          id={id}
          type="number"
          min={min}
          max={max}
          step={integer ? 1 : "any"}
          inputMode={integer ? "numeric" : "decimal"}
          value={
            Number.isFinite(value) ? Math.round(value * 10000) / 10000 : ""
          }
          aria-invalid={error}
          aria-describedby={hint ? id + "-hint" : undefined}
          onChange={(e) =>
            onChange(e.target.value === "" ? NaN : Number(e.target.value))
          }
        />
        {suffix && <span aria-hidden="true">{suffix}</span>}
      </div>
      {hint && <small id={id + "-hint"}>{hint}</small>}
    </div>
  );
}

export default function CoastFire({ copy: c, lang, journalHref }: Props) {
  const w = c.workspace;
  const [plan, setPlan] = useState<CoastPlan>(createExamplePlan);
  const [mode, setMode] = useState<"quick" | "detailed">("detailed");
  const [section, setSection] = useState<Section>("assets");
  const [scenario, setScenario] = useState<Scenario>("base");
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState("");
  const importRef = useRef<HTMLInputElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const locale = lang === "zh" ? "zh-MY" : lang === "ms" ? "ms-MY" : "en-MY";
  const formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const decimal = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const money = (v: number) =>
    Number.isFinite(v) ? "RM " + formatter.format(v) : "—";
  const valid = validCoastPlan(plan);
  const totals = useMemo(() => planTotals(plan), [plan]);
  const comparisons = useMemo(
    () =>
      valid
        ? scenarios.map((s) => ({
            scenario: s,
            result: calculateCoastPlan(plan, s),
          }))
        : [],
    [plan, valid],
  );
  const result = comparisons.find((r) => r.scenario === scenario)?.result;
  const withoutEvents = useMemo(
    () =>
      valid && plan.events.length
        ? calculateCoastPlan({ ...plan, events: [] }, scenario)
        : null,
    [plan, valid, scenario],
  );
  useEffect(() => {
    try {
      setSaved(localStorage.getItem(storageKey) !== null);
    } catch {
      /* Saving remains optional. */
    }
  }, []);

  const update = <K extends keyof CoastPlan>(key: K, value: CoastPlan[K]) =>
    setPlan((p) => {
      const next = { ...p, [key]: value };
      if (key === "age" || key === "retirementAge") {
        next.desiredCoastAge = Math.max(
          next.age,
          Math.min(next.retirementAge, next.desiredCoastAge),
        );
        next.endAge = Math.max(next.endAge, next.retirementAge + 1);
      }
      if (key === "inflationRate")
        next.scenarios = Object.fromEntries(
          Object.entries(next.scenarios).map(([name, row]) => [
            name,
            {
              ...row,
              inflationAdjustment: Math.max(
                -next.inflationRate,
                Math.min(15 - next.inflationRate, row.inflationAdjustment),
              ),
            },
          ]),
        ) as CoastPlan["scenarios"];
      return next;
    });
  const account = (id: string, patch: Partial<PlanAccount>) =>
    setPlan((p) => ({
      ...p,
      accounts: p.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    }));
  const expense = (id: string, patch: Partial<PlanExpense>) =>
    setPlan((p) => ({
      ...p,
      expenses: p.expenses.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));
  const event = (id: string, patch: Partial<PlanEvent>) =>
    setPlan((p) => ({
      ...p,
      events: p.events.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));
  const accountName = (a: PlanAccount) =>
    a.name || (a.id === "emergency" ? w.names.emergency : w.names[a.kind]);
  const expenseName = (e: PlanExpense) =>
    e.name || w.names[e.id as keyof typeof w.names] || w.names.other;
  const ageText = (age: number | null) =>
    age === null
      ? w.notReached
      : `${w.age} ${decimal.format(Math.ceil(age * 10) / 10)}`;
  const eventDateChange = () => {
    if (!withoutEvents || !result) return "—";
    if (result.firstCoastMonth === null)
      return withoutEvents.firstCoastMonth === null
        ? w.noCoastDate
        : w.notReached;
    if (withoutEvents.firstCoastMonth === null) return w.coastWithEvents;
    const months = result.firstCoastMonth - withoutEvents.firstCoastMonth;
    return months === 0
      ? w.noChange
      : `${formatter.format(Math.abs(months))} ${w.months} ${months > 0 ? w.later : w.earlier}`;
  };
  const moneyChange = (amount: number) =>
    Math.abs(amount) < 0.5
      ? w.noChange
      : `${amount > 0 ? "+" : "−"}${money(Math.abs(amount))}`;
  const eventExplanation = (e: PlanEvent) =>
    e.kind === "income"
      ? w.eventIncomeEffect
      : e.age > plan.retirementAge
        ? w.eventAfterRetirementEffect
        : e.kind === "expense"
          ? w.eventExpenseEffect
          : w.eventLumpSumEffect;
  const select = (
    id: string,
    label: string,
    value: string,
    choices: Record<string, string>,
    onChange: (value: string) => void,
  ) => (
    <div className="coast-field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {Object.entries(choices).map(([key, title]) => (
          <option key={key} value={key}>
            {title}
          </option>
        ))}
      </select>
    </div>
  );
  const text = (
    id: string,
    label: string,
    value: string,
    placeholder: string,
    onChange: (value: string) => void,
  ) => (
    <div className="coast-field">
      <label htmlFor={id}>{label}</label>
      <input
        className="coast-text"
        id={id}
        type="text"
        maxLength={100}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
  const remove = (
    kind: "accounts" | "expenses" | "events",
    id: string,
    name: string,
  ) => (
    <button
      className="coast-remove"
      type="button"
      aria-label={`${w.remove}: ${name}`}
      disabled={kind !== "events" && plan[kind].length === 1}
      onClick={() =>
        setPlan((p) => ({ ...p, [kind]: p[kind].filter((r) => r.id !== id) }))
      }
    >
      <span aria-hidden="true">×</span>
    </button>
  );
  const store = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(plan));
      setSaved(true);
      setNotice(w.saved);
    } catch {
      setNotice(w.storageError);
    }
  };
  const load = () => {
    try {
      const value = localStorage.getItem(storageKey);
      if (!value) throw new Error();
      setPlan(parseCoastPlan(value));
      setNotice(w.loaded);
    } catch {
      setNotice(w.storageError);
    }
  };
  const exportPlan = () => {
    try {
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(plan, null, 2)], { type: "application/json" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "walau01-coast-plan.json";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice(w.exported);
    } catch {
      setNotice(w.exportError);
    }
  };
  const importPlan = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > 100000) throw new Error();
      setPlan(parseCoastPlan(await file.text()));
      setNotice(w.imported);
    } catch {
      setNotice(w.importError);
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  };
  const quick = () => {
    const values: CoastInputs = {
      age: plan.age,
      retirementAge: plan.retirementAge,
      investments: totals.investments,
      monthlySpending: totals.monthlySpending,
      monthlyContribution: totals.monthlyContribution,
      returnRate: totals.returnRate,
      inflationRate: plan.inflationRate,
      withdrawalRate: plan.withdrawalRate,
    };
    return (
      <div className="coast-fields quick-fields">
        {(Object.keys(values) as (keyof CoastInputs)[]).map((key) => {
          const monetary = [
            "investments",
            "monthlySpending",
            "monthlyContribution",
          ].includes(key);
          const percent = [
            "returnRate",
            "inflationRate",
            "withdrawalRate",
          ].includes(key);
          return (
            <NumberField
              key={key}
              id={"quick-" + key}
              label={c.fields[key].label}
              value={values[key]}
              money={monetary}
              suffix={percent ? "%" : undefined}
              min={inputLimits[key][0]}
              max={inputLimits[key][1]}
              integer={!monetary && !percent}
              hint={c.fields[key].hint}
              invalid={
                key === "retirementAge" && plan.retirementAge <= plan.age
              }
              onChange={(value) =>
                setPlan((p) => updateQuickField(p, key, value))
              }
            />
          );
        })}
      </div>
    );
  };
  const panel = (key: Section) => {
    if (key === "timeline")
      return (
        <>
          <div className="coast-fields">
            <NumberField
              id="plan-age"
              label={c.fields.age.label}
              value={plan.age}
              min={18}
              max={85}
              integer
              onChange={(v) => update("age", v)}
            />
            <NumberField
              id="plan-retire"
              label={c.fields.retirementAge.label}
              value={plan.retirementAge}
              min={plan.age + 1}
              max={100}
              integer
              onChange={(v) => update("retirementAge", v)}
            />
            <NumberField
              id="plan-coast"
              label={w.desiredAge}
              value={plan.desiredCoastAge}
              min={plan.age}
              max={plan.retirementAge}
              integer
              onChange={(v) => update("desiredCoastAge", v)}
            />
            <NumberField
              id="plan-end"
              label={w.endAge}
              value={plan.endAge}
              min={plan.retirementAge + 1}
              max={110}
              integer
              hint={w.endAgeHint}
              onChange={(v) => update("endAge", v)}
            />
            {select(
              "plan-scope",
              w.scope,
              plan.household,
              { individual: w.individual, household: w.household },
              (v) => update("household", v as CoastPlan["household"]),
            )}
            <NumberField
              id="plan-income"
              label={w.monthlyIncome}
              value={plan.monthlyIncome}
              money
              hint={w.incomeHint}
              onChange={(v) => update("monthlyIncome", v)}
            />
          </div>
          <p className="coast-help">{w.scopeHint}</p>
        </>
      );
    if (key === "assets")
      return (
        <>
          <div className="coast-rows">
            {plan.accounts.map((a) => (
              <fieldset
                className={"coast-row" + (!a.included ? " excluded-row" : "")}
                key={a.id}
              >
                <legend className="sr-only">{accountName(a)}</legend>
                <div className="coast-row-head">
                  {text(
                    a.id + "-name",
                    w.accountName,
                    a.name,
                    accountName(a),
                    (v) => account(a.id, { name: v }),
                  )}
                  {select(
                    a.id + "-kind",
                    w.accountKind,
                    a.kind,
                    {
                      investment: w.names.investment,
                      epf: w.names.epf,
                      cash: w.names.cash,
                      other: w.names.other,
                    },
                    (v) =>
                      account(a.id, {
                        kind: v as PlanAccount["kind"],
                        employerContribution: 0,
                        accessAge: v === "epf" ? 55 : 18,
                      }),
                  )}
                  {remove("accounts", a.id, accountName(a))}
                </div>
                <div className="coast-fields three-fields">
                  <NumberField
                    id={a.id + "-balance"}
                    label={w.balance}
                    value={a.balance}
                    max={1000000000}
                    money
                    onChange={(v) => account(a.id, { balance: v })}
                  />
                  <NumberField
                    id={a.id + "-return"}
                    label={w.accountReturn}
                    value={a.returnRate}
                    min={-10}
                    max={20}
                    suffix="%"
                    onChange={(v) => account(a.id, { returnRate: v })}
                  />
                  <NumberField
                    id={a.id + "-access"}
                    label={w.accessAge}
                    value={a.accessAge}
                    min={18}
                    max={110}
                    integer
                    onChange={(v) => account(a.id, { accessAge: v })}
                  />
                </div>
                <label className="coast-checkbox">
                  <input
                    type="checkbox"
                    checked={a.included}
                    onChange={(e) =>
                      account(a.id, { included: e.target.checked })
                    }
                  />
                  {w.included}
                </label>
              </fieldset>
            ))}
          </div>
          <button
            className="coast-add"
            type="button"
            disabled={plan.accounts.length >= 20}
            onClick={() =>
              update("accounts", [
                ...plan.accounts,
                {
                  id: rowId(),
                  name: "",
                  kind: "investment",
                  balance: 0,
                  returnRate: 7,
                  accessAge: 18,
                  included: true,
                  monthlyContribution: 0,
                  employerContribution: 0,
                  annualIncrease: 0,
                  stopAge: plan.retirementAge,
                },
              ])
            }
          >
            + {w.addAccount}
          </button>
          <p className="coast-help">{w.epfHint}</p>
        </>
      );
    if (key === "spending")
      return (
        <>
          <p className="coast-help">{w.categoryInflationHint}</p>
          <div className="coast-rows">
            {plan.expenses.map((e) => (
              <fieldset className="coast-row" key={e.id}>
                <legend className="sr-only">{expenseName(e)}</legend>
                <div className="coast-row-head">
                  {text(
                    e.id + "-name",
                    w.expenseName,
                    e.name,
                    expenseName(e),
                    (v) => expense(e.id, { name: v }),
                  )}
                  {select(
                    e.id + "-frequency",
                    w.frequency,
                    e.frequency,
                    { monthly: w.monthly, annual: w.annual },
                    (v) =>
                      expense(e.id, {
                        frequency: v as PlanExpense["frequency"],
                      }),
                  )}
                  {remove("expenses", e.id, expenseName(e))}
                </div>
                <div className="coast-fields">
                  <NumberField
                    id={e.id + "-current"}
                    label={w.currentBudget}
                    value={e.current}
                    money
                    onChange={(v) => expense(e.id, { current: v })}
                  />
                  <NumberField
                    id={e.id + "-retirement"}
                    label={w.retirementBudget}
                    value={e.retirement}
                    money
                    onChange={(v) => expense(e.id, { retirement: v })}
                  />
                </div>
                <label className="coast-checkbox">
                  <input
                    type="checkbox"
                    checked={e.inflationRate != null}
                    onChange={(v) =>
                      expense(e.id, {
                        inflationRate: v.target.checked
                          ? plan.inflationRate
                          : null,
                      })
                    }
                  />
                  {w.customInflation}
                </label>
                {e.inflationRate != null && (
                  <NumberField
                    id={e.id + "-inflation"}
                    label={w.categoryInflation}
                    value={e.inflationRate}
                    min={0}
                    max={15}
                    suffix="%"
                    onChange={(v) => expense(e.id, { inflationRate: v })}
                  />
                )}
                {result &&
                  (() => {
                    const category = result.retirementSpending.categories.find(
                      (r) => r.id === e.id,
                    )!;
                    return (
                      <div className="coast-category-preview">
                        <span>
                          {w.projectedMonthly} · {w.age} {plan.retirementAge}
                        </span>
                        <strong>{money(category.nominal)}</strong>
                        <small>
                          {w.futureMoney} ·{" "}
                          {decimal.format(category.inflationRate)}%{" "}
                          {w.categoryInflation}
                        </small>
                      </div>
                    );
                  })()}
              </fieldset>
            ))}
          </div>
          <button
            className="coast-add"
            type="button"
            disabled={plan.expenses.length >= 30}
            onClick={() =>
              update("expenses", [
                ...plan.expenses,
                {
                  id: rowId(),
                  name: "",
                  current: 0,
                  retirement: 0,
                  frequency: "monthly",
                },
              ])
            }
          >
            + {w.addExpense}
          </button>
          <div className="coast-subtotals">
            <div>
              <span>{w.currentTotal}</span>
              <strong>{money(totals.currentSpending)}</strong>
            </div>
            <div>
              <span>{w.retirementTotal}</span>
              <strong>{money(totals.monthlySpending)}</strong>
            </div>
            {result && (
              <div>
                <span>
                  {w.projectedMonthly} · {w.futureMoney}
                </span>
                <strong>{money(result.retirementSpending.nominal)}</strong>
              </div>
            )}
          </div>
        </>
      );
    if (key === "contributions")
      return (
        <>
          <div className="coast-rows">
            {plan.accounts
              .filter((a) => a.included)
              .map((a) => (
                <fieldset className="coast-row" key={a.id}>
                  <legend>{accountName(a)}</legend>
                  <div className="coast-fields">
                    <NumberField
                      id={a.id + "-deposit"}
                      label={a.kind === "epf" ? w.employee : w.deposit}
                      value={a.monthlyContribution}
                      money
                      onChange={(v) =>
                        account(a.id, { monthlyContribution: v })
                      }
                    />
                    {a.kind === "epf" && (
                      <NumberField
                        id={a.id + "-employer"}
                        label={w.employer}
                        value={a.employerContribution}
                        money
                        onChange={(v) =>
                          account(a.id, { employerContribution: v })
                        }
                      />
                    )}
                    <NumberField
                      id={a.id + "-increase"}
                      label={w.increase}
                      value={a.annualIncrease}
                      min={-10}
                      max={10}
                      suffix="%"
                      onChange={(v) => account(a.id, { annualIncrease: v })}
                    />
                    <NumberField
                      id={a.id + "-stop"}
                      label={w.stopAge}
                      value={a.stopAge}
                      min={18}
                      max={110}
                      integer
                      onChange={(v) => account(a.id, { stopAge: v })}
                    />
                  </div>
                </fieldset>
              ))}
          </div>
          <p className="coast-help">{w.increaseHint}</p>
          <div className="coast-subtotals">
            <div>
              <span>{w.voluntary}</span>
              <strong>{money(totals.voluntary)}</strong>
            </div>
            <div>
              <span>{w.epfDeposits}</span>
              <strong>{money(totals.epfContribution)}</strong>
            </div>
          </div>
        </>
      );
    if (key === "events")
      return (
        <>
          {!plan.events.length && (
            <div className="coast-empty">
              <span aria-hidden="true">↗</span>
              <p>{w.noEvents}</p>
            </div>
          )}
          <div className="coast-rows">
            {plan.events.map((e) => (
              <fieldset className="coast-row" key={e.id}>
                <legend className="sr-only">{e.name || w.names[e.kind]}</legend>
                <div className="coast-row-head">
                  {text(
                    e.id + "-name",
                    w.eventName,
                    e.name,
                    w.names[e.kind],
                    (v) => event(e.id, { name: v }),
                  )}
                  {select(
                    e.id + "-kind",
                    w.eventKind,
                    e.kind,
                    {
                      expense: w.names.expense,
                      lumpSum: w.names.lumpSum,
                      income: w.names.income,
                    },
                    (v) =>
                      event(e.id, {
                        kind: v as PlanEvent["kind"],
                        age:
                          v === "income"
                            ? Math.max(e.age, plan.retirementAge)
                            : e.age,
                        endAge: v === "income" ? plan.endAge : e.endAge,
                      }),
                  )}
                  {remove("events", e.id, e.name || w.names[e.kind])}
                </div>
                <div className="coast-fields">
                  <NumberField
                    id={e.id + "-amount"}
                    label={
                      w.eventAmount +
                      (e.kind === "income" ? ` · ${w.monthly}` : "")
                    }
                    value={e.amount}
                    max={1000000000}
                    money
                    onChange={(v) => event(e.id, { amount: v })}
                  />
                  <NumberField
                    id={e.id + "-age"}
                    label={w.eventAge}
                    value={e.age}
                    min={e.kind === "income" ? plan.retirementAge : plan.age}
                    max={plan.endAge}
                    integer
                    onChange={(v) =>
                      event(e.id, { age: v, endAge: Math.max(v, e.endAge) })
                    }
                  />
                  {e.kind === "income" && (
                    <NumberField
                      id={e.id + "-end"}
                      label={w.eventEnd}
                      value={e.endAge}
                      min={e.age + 1}
                      max={plan.endAge}
                      integer
                      onChange={(v) => event(e.id, { endAge: v })}
                    />
                  )}
                </div>
                {e.kind === "income" && (
                  <label className="coast-checkbox">
                    <input
                      type="checkbox"
                      checked={e.inflationAdjusted}
                      onChange={(v) =>
                        event(e.id, { inflationAdjusted: v.target.checked })
                      }
                    />
                    {w.adjusted}
                  </label>
                )}
                <p className="coast-event-explanation">{eventExplanation(e)}</p>
              </fieldset>
            ))}
          </div>
          <button
            className="coast-add"
            type="button"
            disabled={plan.events.length >= 20}
            onClick={() =>
              update("events", [
                ...plan.events,
                {
                  id: rowId(),
                  name: "",
                  kind: "expense",
                  amount: 10000,
                  age: Math.min(plan.age + 5, plan.retirementAge),
                  endAge: plan.endAge,
                  inflationAdjusted: true,
                },
              ])
            }
          >
            + {w.addEvent}
          </button>
          <p className="coast-help">{w.eventHint}</p>
          {!!plan.events.length && (
            <a className="text-link" href="#coast-event-impact">
              {w.viewEventImpact}
            </a>
          )}
        </>
      );
    return (
      <>
        <div className="coast-fields">
          <NumberField
            id="plan-inflation"
            label={c.fields.inflationRate.label}
            value={plan.inflationRate}
            max={15}
            suffix="%"
            hint={c.fields.inflationRate.hint}
            onChange={(v) => update("inflationRate", v)}
          />
          <NumberField
            id="plan-withdrawal"
            label={c.fields.withdrawalRate.label}
            value={plan.withdrawalRate}
            min={1}
            max={10}
            suffix="%"
            hint={c.fields.withdrawalRate.hint}
            onChange={(v) => update("withdrawalRate", v)}
          />
        </div>
        <p className="coast-help">{w.scenarioHint}</p>
        <div className="coast-rows">
          {scenarios.map((s) => (
            <fieldset className="coast-row" key={s}>
              <legend>{w.scenarioNames[s]}</legend>
              <div className="coast-fields">
                <NumberField
                  id={s + "-returns"}
                  label={w.returnAdjustment}
                  value={plan.scenarios[s].returnAdjustment}
                  min={-5}
                  max={5}
                  suffix="pp"
                  hint={w.points}
                  onChange={(v) =>
                    update("scenarios", {
                      ...plan.scenarios,
                      [s]: { ...plan.scenarios[s], returnAdjustment: v },
                    })
                  }
                />
                <NumberField
                  id={s + "-inflation"}
                  label={w.inflationAdjustment}
                  value={plan.scenarios[s].inflationAdjustment}
                  min={Math.max(-3, -plan.inflationRate)}
                  max={Math.min(3, 15 - plan.inflationRate)}
                  suffix="pp"
                  hint={w.points}
                  onChange={(v) =>
                    update("scenarios", {
                      ...plan.scenarios,
                      [s]: { ...plan.scenarios[s], inflationAdjustment: v },
                    })
                  }
                />
              </div>
            </fieldset>
          ))}
        </div>
      </>
    );
  };

  return (
    <div className="container coast-page">
      <header className="coast-heading">
        <div>
          <p className="eyebrow">
            {c.tag}
            <span className="coast-title-label">{c.title}</span>
          </p>
          <h1>
            {c.title}
            <em>{w.subtitle}</em>
          </h1>
          <p className="coast-intro">{w.intro}</p>
        </div>
        <div className="coast-heading-note" aria-hidden="true">
          <div className="coast-orbit">
            <span>∞</span>
            <i />
            <i />
          </div>
          <span>RM / {w.todayMoney}</span>
        </div>
      </header>
      <div className="coast-toolbar">
        <div className="coast-mode" role="group" aria-label={w.mode}>
          {(["quick", "detailed"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
            >
              {w[m]}
            </button>
          ))}
        </div>
        <div className="coast-file-actions">
          <button type="button" onClick={store} disabled={!valid}>
            {w.save}
          </button>
          <button type="button" onClick={load} disabled={!saved}>
            {w.load}
          </button>
          <button type="button" onClick={exportPlan} disabled={!valid}>
            {w.export}
          </button>
          <button type="button" onClick={() => importRef.current?.click()}>
            {w.import}
          </button>
          <button
            type="button"
            onClick={() => {
              setPlan(createExamplePlan());
              setNotice(w.fictional);
            }}
          >
            {w.reset}
          </button>
        </div>
        <input
          ref={importRef}
          type="file"
          accept="application/json,.json"
          hidden
          aria-label={w.import}
          onChange={(e) => void importPlan(e.target.files?.[0])}
        />
      </div>
      <p className="coast-mode-hint">{w.modeHint}</p>
      {notice && (
        <p className="coast-notice" role="status">
          {notice}
        </p>
      )}
      <div className="coast-plan-strip">
        <div>
          <span>{w.accountTotal}</span>
          <strong>{money(totals.investments)}</strong>
        </div>
        <div>
          <span>{w.retirementTotal}</span>
          <strong>
            {money(totals.monthlySpending)}
            <small> / {w.monthly}</small>
          </strong>
        </div>
        <div>
          <span>{w.depositTotal}</span>
          <strong>
            {money(totals.monthlyContribution)}
            <small> / {w.monthly}</small>
          </strong>
        </div>
      </div>
      <div className="coast-workspace">
        <div className="coast-editor">
          {mode === "quick" ? (
            <section className="coast-panel">
              <div className="coast-section-title">
                <span className="eyebrow">01 / {w.quick}</span>
                <h2>{c.inputsTitle}</h2>
                <p>{w.modeHint}</p>
              </div>
              {quick()}
            </section>
          ) : (
            <>
              <div
                className="coast-tabs"
                role="tablist"
                aria-label={w.detailed}
              >
                {sections.map((s, i) => (
                  <button
                    type="button"
                    key={s}
                    id={"tab-" + s}
                    role="tab"
                    aria-selected={section === s}
                    aria-controls={"panel-" + s}
                    tabIndex={section === s ? 0 : -1}
                    ref={(el) => {
                      tabs.current[i] = el;
                    }}
                    onClick={() => setSection(s)}
                    onKeyDown={(e) => {
                      let next = i;
                      if (e.key === "ArrowRight")
                        next = (i + 1) % sections.length;
                      else if (e.key === "ArrowLeft")
                        next = (i + sections.length - 1) % sections.length;
                      else if (e.key === "Home") next = 0;
                      else if (e.key === "End") next = sections.length - 1;
                      else return;
                      e.preventDefault();
                      setSection(sections[next]);
                      tabs.current[next]?.focus();
                    }}
                  >
                    <span aria-hidden="true">0{i + 1}</span>
                    {w.sections[s]}
                  </button>
                ))}
              </div>
              {sections.map((s, i) => (
                <div
                  className={
                    "coast-accordion" + (section === s ? " active" : "")
                  }
                  key={s}
                >
                  <button
                    className="coast-mobile-section"
                    type="button"
                    aria-expanded={section === s}
                    aria-controls={"panel-" + s}
                    onClick={() => setSection(s)}
                  >
                    <span>
                      0{i + 1} / {w.sections[s]}
                    </span>
                    <span aria-hidden="true">{section === s ? "−" : "+"}</span>
                  </button>
                  <section
                    className="coast-panel"
                    id={"panel-" + s}
                    role="tabpanel"
                    aria-labelledby={"tab-" + s}
                    hidden={section !== s}
                    tabIndex={0}
                  >
                    <div className="coast-section-title">
                      <span className="eyebrow">
                        0{i + 1} / {w.detailed}
                      </span>
                      <h2>{w.sections[s]}</h2>
                      <p>{w.sectionHints[s]}</p>
                    </div>
                    {panel(s)}
                    <div className="coast-editor-footer">
                      <span>{w.fictional}</span>
                      {i < sections.length - 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setSection(sections[i + 1]);
                            tabs.current[i + 1]?.focus();
                          }}
                        >
                          {w.next}: {w.sections[sections[i + 1]]}
                          <span aria-hidden="true">→</span>
                        </button>
                      )}
                    </div>
                  </section>
                </div>
              ))}
            </>
          )}
          {!valid && (
            <p className="coast-validation" role="alert">
              {w.invalid}
            </p>
          )}
          <div className="coast-editor-note">
            <p>{w.privacy}</p>
            {saved && (
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem(storageKey);
                    setSaved(false);
                    setNotice(w.deleted);
                  } catch {
                    setNotice(w.storageError);
                  }
                }}
              >
                {w.forget}
              </button>
            )}
          </div>
          <a className="coast-mobile-results" href="#coast-results">
            {w.viewResults}
            <span aria-hidden="true">↓</span>
          </a>
          <noscript>{w.requiresJS}</noscript>
        </div>
        <aside
          className="coast-results"
          id="coast-results"
          aria-labelledby="coast-result-title"
        >
          <section className="coast-result-card">
            <div className="coast-result-top">
              <p className="eyebrow" id="coast-result-title">
                {w.resultTitle}
              </p>
              <span>{w.scenarioNames[scenario]}</span>
            </div>
            {result ? (
              <>
                <p className="coast-result-label">{w.estimatedAge}</p>
                <div className="coast-age-number">
                  {result.coastAge === null ? (
                    <strong className="no-coast-age">{w.notReached}</strong>
                  ) : (
                    <>
                      <strong>
                        {decimal.format(Math.ceil(result.coastAge * 10) / 10)}
                      </strong>
                      <span>{w.age}</span>
                    </>
                  )}
                </div>
                <p className="coast-status-line">
                  {result.firstCoastMonth === 0
                    ? w.today
                    : result.coastAge !== null
                      ? result.coastAge <= plan.desiredCoastAge
                        ? w.goalMet
                        : w.goalLater
                      : w.livingCosts}
                </p>
                <div className="coast-target">
                  <span>{w.targetToday}</span>
                  <strong>
                    {result.coastTarget === null
                      ? w.impossible
                      : money(result.coastTarget)}
                  </strong>
                </div>
                <div className="coast-progress-label">
                  <span>{w.progress}</span>
                  <strong>{decimal.format(result.progress)}%</strong>
                </div>
                <div
                  className="coast-progress"
                  role="progressbar"
                  aria-label={w.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.max(
                    0,
                    Math.min(100, Math.round(result.progress)),
                  )}
                >
                  <span
                    style={{
                      width: Math.max(0, Math.min(100, result.progress)) + "%",
                    }}
                  />
                </div>
                <dl className="coast-metrics">
                  <div>
                    <dt>{w.gap}</dt>
                    <dd>{result.gap === null ? "—" : money(result.gap)}</dd>
                  </div>
                  <div>
                    <dt>{w.retirementTarget}</dt>
                    <dd>{money(result.target)}</dd>
                  </div>
                </dl>
                <p className="result-caption">
                  {result.coastTarget === null ? w.accessIssue : w.targetHint}
                </p>
                <p className="result-basis">{w.targetBasis}</p>
              </>
            ) : (
              <p className="result-caption">{w.invalid}</p>
            )}
          </section>
          {result && (
            <section
              className="coast-fire-target"
              aria-labelledby="full-fire-title"
            >
              <p className="eyebrow">
                {w.age} {plan.retirementAge} · {w.scenarioNames[scenario]}
              </p>
              <h2 id="full-fire-title">{w.fullFireTitle}</h2>
              <strong className="coast-fire-amount">
                {money(result.target)}
              </strong>
              <p className="coast-fire-basis">{w.todayMoney}</p>
              <dl>
                <div>
                  <dt>{w.futureMoney}</dt>
                  <dd>{money(result.nominalTarget)}</dd>
                </div>
                <div>
                  <dt>{w.fullFireGap}</dt>
                  <dd>{money(result.fireGap)}</dd>
                </div>
                <div>
                  <dt>{w.fullFireProgress}</dt>
                  <dd>{decimal.format(result.fireProgress)}%</dd>
                </div>
                <div>
                  <dt>{w.projectedMonthly}</dt>
                  <dd>{money(result.retirementSpending.nominal)}</dd>
                </div>
              </dl>
              <p>{w.fullFireHint}</p>
              <p className="coast-fire-formula">
                {money(result.retirementSpending.today * 12)} ÷{" "}
                {decimal.format(plan.withdrawalRate)}% = {money(result.target)}
              </p>
            </section>
          )}
          <section className="coast-budget">
            <h2>{w.budgetTitle}</h2>
            <dl>
              <div>
                <dt>{w.netIncome}</dt>
                <dd>{money(plan.monthlyIncome)}</dd>
              </div>
              <div>
                <dt>{w.currentTotal}</dt>
                <dd>{money(totals.currentSpending)}</dd>
              </div>
              <div>
                <dt>{w.voluntary}</dt>
                <dd>{money(totals.voluntary)}</dd>
              </div>
              <div className="coast-budget-surplus">
                <dt>{w.budgetSurplus}</dt>
                <dd>{money(totals.surplus)}</dd>
              </div>
            </dl>
            <p>{w.budgetHint}</p>
          </section>
        </aside>
      </div>
      {result && (
        <>
          <CoastPlanChart
            result={result}
            copy={w}
            locale={locale}
            currentAge={plan.age}
            retirementAge={plan.retirementAge}
            scenario={scenario}
            onScenario={setScenario}
            events={plan.events}
          />
          {withoutEvents && (
            <section
              className="coast-event-impact"
              id="coast-event-impact"
              aria-labelledby="event-impact-title"
            >
              <div className="coast-section-title">
                <p className="eyebrow">
                  {w.sections.events} · {w.scenarioNames[scenario]}
                </p>
                <h2 id="event-impact-title">{w.eventImpactTitle}</h2>
                <p>{w.eventImpactHint}</p>
              </div>
              <dl className="coast-event-deltas">
                <div>
                  <dt>{w.coastDateChange}</dt>
                  <dd>{eventDateChange()}</dd>
                </div>
                <div>
                  <dt>{w.retirementBalanceChange}</dt>
                  <dd>
                    {moneyChange(
                      result.savingRetirement - withoutEvents.savingRetirement,
                    )}
                  </dd>
                </div>
                <div>
                  <dt>{w.endBalanceChange}</dt>
                  <dd>
                    {moneyChange(
                      result.cashProjection.at(-1)!.balance -
                        withoutEvents.cashProjection.at(-1)!.balance,
                    )}
                  </dd>
                </div>
              </dl>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">{w.eventMetric}</th>
                      <th scope="col">{w.withoutEvents}</th>
                      <th scope="col">{w.withEvents}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <th scope="row">{w.estimatedAge}</th>
                      <td>{ageText(withoutEvents.coastAge)}</td>
                      <td>{ageText(result.coastAge)}</td>
                    </tr>
                    <tr>
                      <th scope="row">{w.targetToday}</th>
                      <td>{money(withoutEvents.coastTarget ?? NaN)}</td>
                      <td>{money(result.coastTarget ?? NaN)}</td>
                    </tr>
                    <tr>
                      <th scope="row">{w.retirementBalance}</th>
                      <td>{money(withoutEvents.savingRetirement)}</td>
                      <td>{money(result.savingRetirement)}</td>
                    </tr>
                    <tr>
                      <th scope="row">{w.firstShortfall}</th>
                      <td>
                        {withoutEvents.firstShortfallAge === null
                          ? w.noShortfall
                          : ageText(withoutEvents.firstShortfallAge)}
                      </td>
                      <td>
                        {result.firstShortfallAge === null
                          ? w.noShortfall
                          : ageText(result.firstShortfallAge)}
                      </td>
                    </tr>
                    <tr>
                      <th scope="row">
                        {w.endBalance} · {w.age} {plan.endAge}
                      </th>
                      <td>
                        {money(withoutEvents.cashProjection.at(-1)!.balance)}
                      </td>
                      <td>{money(result.cashProjection.at(-1)!.balance)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="coast-event-list">
                {plan.events.map((e) => (
                  <div key={e.id}>
                    <span className="coast-event-age">
                      {w.age} {e.age}
                    </span>
                    <div>
                      <strong>{e.name || w.names[e.kind]}</strong>
                      <p>{eventExplanation(e)}</p>
                    </div>
                    <span>
                      {e.kind === "expense" ? "−" : "+"}
                      {money(e.amount)}
                      {e.kind === "income" ? ` / ${w.monthly}` : ""}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
          <section className="coast-comparison">
            <div className="coast-section-title">
              <p className="eyebrow">{w.scenario}</p>
              <h2>{w.scenarioTitle}</h2>
              <p>{w.scenarioIntro}</p>
            </div>
            <div className="coast-scenario-grid">
              {comparisons.map(({ scenario: s, result: r }) => (
                <button
                  type="button"
                  key={s}
                  aria-pressed={scenario === s}
                  onClick={() => setScenario(s)}
                >
                  <span>{w.scenarioNames[s]}</span>
                  <strong>{ageText(r.coastAge)}</strong>
                  <dl>
                    <div>
                      <dt>{w.targetToday}</dt>
                      <dd>
                        {r.coastTarget === null ? "—" : money(r.coastTarget)}
                      </dd>
                    </div>
                    <div>
                      <dt>{w.retirementBalance}</dt>
                      <dd>{money(r.savingRetirement)}</dd>
                    </div>
                  </dl>
                </button>
              ))}
            </div>
          </section>
          <section className="coast-cash">
            <div className="coast-section-title">
              <p className="eyebrow">
                {w.sections.timeline} / {plan.retirementAge}–{plan.endAge}
              </p>
              <h2>{w.cashTitle}</h2>
              <p>{w.cashIntro}</p>
            </div>
            <dl className="coast-cash-metrics">
              <div>
                <dt>{w.accessibleRetirement}</dt>
                <dd>{money(result.accessibleAtRetirement)}</dd>
              </div>
              <div>
                <dt>{w.lockedRetirement}</dt>
                <dd>{money(result.lockedAtRetirement)}</dd>
              </div>
              <div>
                <dt>{w.bridgeGap}</dt>
                <dd>{money(result.bridgeGap)}</dd>
              </div>
              <div>
                <dt>{w.firstShortfall}</dt>
                <dd>
                  {result.firstShortfallAge === null
                    ? w.noShortfall
                    : ageText(result.firstShortfallAge)}
                </dd>
              </div>
            </dl>
            {result.eventShortfall > 0.01 && (
              <p className="coast-validation">
                {w.eventShortfall}: {money(result.eventShortfall)}
              </p>
            )}
            <details className="projection-table">
              <summary>
                {w.cashTable}
                <span aria-hidden="true">+</span>
              </summary>
              <div className="table-scroll">
                <table>
                  <caption>{w.targetBasis}</caption>
                  <thead>
                    <tr>
                      <th scope="col">{w.age}</th>
                      <th scope="col">{w.portfolio}</th>
                      <th scope="col">{w.available}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.cashProjection.map((point) => (
                      <tr key={point.age}>
                        <th scope="row">{point.age}</th>
                        <td>{money(point.balance)}</td>
                        <td>{money(point.accessible)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
            <p className="coast-help">{w.cashHint}</p>
          </section>
        </>
      )}
      <section className="coast-method">
        <div>
          <p className="eyebrow">{w.sections.assumptions}</p>
          <h2>{w.methodTitle}</h2>
        </div>
        <div>
          <p>{w.method}</p>
          <p>{w.limitations}</p>
          <div className="coast-source-links">
            <a
              href="https://www.schwab.com/learn/story/fire-movement"
              target="_blank"
              rel="noopener noreferrer"
            >
              {w.coastSource} ↗
            </a>
            <a
              href="https://www.kwsp.gov.my/en/member/life-stages/age-55-60-withdrawal"
              target="_blank"
              rel="noopener noreferrer"
            >
              {w.epfSource} ↗
            </a>
          </div>
        </div>
      </section>
      <a className="text-link" href={journalHref}>
        {c.journalLink} →
      </a>
    </div>
  );
}
