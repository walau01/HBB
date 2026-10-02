import { useRef, useState } from "react";
import type dictionary from "@/i18n/en.json";
import {
  exampleInputs,
  inputLimits,
  validCoastInputs,
  type CoastInputs,
} from "@/lib/coast-fire";
import {
  calculateCoastPlan,
  createExamplePlan,
  type CoastPlan,
} from "@/lib/coast-plan";
type Copy = typeof dictionary.simpleCoast;
const fields: (keyof CoastInputs)[] = [
  "age",
  "retirementAge",
  "investments",
  "monthlyContribution",
  "monthlySpending",
];
const assumptions: (keyof CoastInputs)[] = [
  "returnRate",
  "inflationRate",
  "withdrawalRate",
];
export default function SimpleCoast({
  copy: c,
  lang,
  advancedHref,
}: {
  copy: Copy;
  lang: string;
  advancedHref: string;
}) {
  const [draft, setDraft] = useState<Record<keyof CoastInputs, string>>(
    () =>
      Object.fromEntries(
        Object.entries(exampleInputs).map(([k, v]) => [k, String(v)]),
      ) as Record<keyof CoastInputs, string>,
  );
  const [includeEpf, setIncludeEpf] = useState(false),
    [epfBalance, setEpfBalance] = useState("0"),
    [epfDeposit, setEpfDeposit] = useState("0");
  const [snapshot, setSnapshot] = useState<{
    input: CoastInputs;
    plan: CoastPlan;
    signature: string;
  } | null>(null);
  const [error, setError] = useState(false),
    [nominal, setNominal] = useState(false),
    [point, setPoint] = useState(0);
  const resultRef = useRef<HTMLElement>(null);
  const signature = JSON.stringify([draft, includeEpf, epfBalance, epfDeposit]);
  const r = snapshot ? calculateCoastPlan(snapshot.plan) : null;
  const money = (v: number) =>
    new Intl.NumberFormat(
      lang === "zh" ? "zh-MY" : lang === "ms" ? "ms-MY" : "en-MY",
      { style: "currency", currency: "MYR", maximumFractionDigits: 0 },
    ).format(v);
  const fmt = (s: string, values: Record<string, string | number>) =>
    s.replace(/\{(\w+)\}/g, (_, k) => String(values[k] ?? ""));
  function calculate(e: React.SyntheticEvent) {
    e.preventDefault();
    const input = Object.fromEntries(
      Object.entries(draft).map(([k, v]) => [
        k,
        v.trim() === "" ? NaN : Number(v),
      ]),
    ) as CoastInputs;
    const eb = Number(epfBalance),
      ed = Number(epfDeposit);
    if (
      !validCoastInputs(input) ||
      (includeEpf &&
        (!epfBalance.trim() ||
          !epfDeposit.trim() ||
          !Number.isFinite(eb) ||
          !Number.isFinite(ed) ||
          eb < 0 ||
          eb > 1e9 ||
          ed < 0 ||
          ed > 1e6))
    ) {
      setError(true);
      return;
    }
    const plan = createExamplePlan();
    Object.assign(plan, {
      age: input.age,
      retirementAge: input.retirementAge,
      desiredCoastAge: input.age,
      endAge: Math.max(95, input.retirementAge + 1),
      inflationRate: input.inflationRate,
      withdrawalRate: input.withdrawalRate,
    });
    plan.accounts = [
      {
        ...plan.accounts[0],
        balance: input.investments,
        monthlyContribution: input.monthlyContribution,
        returnRate: input.returnRate,
        stopAge: input.retirementAge,
      },
    ];
    if (includeEpf)
      plan.accounts.push({
        ...createExamplePlan().accounts[1],
        balance: eb,
        monthlyContribution: ed,
        employerContribution: 0,
        stopAge: input.retirementAge,
      });
    plan.expenses = [
      {
        id: "spending",
        name: "",
        current: input.monthlySpending,
        retirement: input.monthlySpending,
        frequency: "monthly",
      },
    ];
    setSnapshot({ input, plan, signature });
    setPoint(0);
    setError(false);
    requestAnimationFrame(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      resultRef.current?.focus({ preventScroll: true });
    });
  }
  const field = (key: keyof CoastInputs, label: string, index?: number) => {
    const [min, max] = inputLimits[key];
    return (
      <div className="quick-field" key={key}>
        <label htmlFor={"simple-" + key}>
          {index !== undefined && <span>{index + 1}</span>}
          {label}
        </label>
        <div className="quick-input">
          {fields.indexOf(key) >= 2 && <span>RM</span>}
          <input
            id={"simple-" + key}
            type="number"
            inputMode="decimal"
            required
            min={min}
            max={max}
            step={key === "age" || key === "retirementAge" ? 1 : "any"}
            value={draft[key]}
            onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
          />
          {assumptions.includes(key) && <span>%</span>}
        </div>
      </div>
    );
  };
  const age =
    r?.coastAge === null || r?.coastAge === undefined
      ? null
      : Math.ceil(r.coastAge);
  const display = snapshot?.input;
  const selected = r?.projection[Math.min(point, r.projection.length - 1)];
  const scale = (v: number, a: number) =>
    nominal && display
      ? v * Math.pow(1 + display.inflationRate / 100, a - display.age)
      : v;
  return (
    <div className="container quick-coast">
      <header>
        <p className="eyebrow">{c.title}</p>
        <h1>{c.question}</h1>
        <p>{c.intro}</p>
      </header>
      <form onSubmit={calculate} className="quick-form">
        <p className="quick-note">{c.example}</p>
        <div className="quick-fields">
          {fields.map((k, i) => field(k, c.labels[i], i))}
        </div>
        <p className="quick-note">{c.spendingHint}</p>
        <fieldset className="quick-epf">
          <legend>{c.epf}</legend>
          {[false, true].map((v) => (
            <label key={String(v)}>
              <input
                type="radio"
                name="epf"
                checked={includeEpf === v}
                onChange={() => setIncludeEpf(v)}
              />
              {v ? c.yes : c.no}
            </label>
          ))}
          {includeEpf && (
            <div className="quick-fields">
              {[
                [c.epfBalance, epfBalance, setEpfBalance],
                [c.epfDeposit, epfDeposit, setEpfDeposit],
              ].map(([label, value, setter], i) => (
                <div className="quick-field" key={i}>
                  <label htmlFor={"epf-simple-" + i}>{label as string}</label>
                  <div className="quick-input">
                    <span>RM</span>
                    <input
                      id={"epf-simple-" + i}
                      required
                      type="number"
                      min="0"
                      max={i ? 1000000 : 1000000000}
                      step="any"
                      value={value as string}
                      onChange={(e) =>
                        (setter as (v: string) => void)(e.target.value)
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </fieldset>
        <details className="quick-disclosure">
          <summary>{c.assumptions}</summary>
          <div className="quick-fields">
            {assumptions.map((k, i) =>
              field(k, [c.returnLabel, c.inflation, c.withdrawal][i]),
            )}
          </div>
          <p className="quick-note">{c.model}</p>
        </details>
        {error && <p role="alert">{c.invalid}</p>}
        <button className="button-accent quick-calculate" type="submit">
          {c.calculate}
        </button>
      </form>
      {r && display && (
        <section
          className="quick-result"
          ref={resultRef}
          tabIndex={-1}
          aria-labelledby="simple-result-title"
        >
          {signature !== snapshot.signature && (
            <p role="status" className="quick-stale">
              {c.changed}
            </p>
          )}
          <p id="simple-result-title" className="eyebrow">
            {c.result}
          </p>
          <h2>{age === null ? c.unreached : `${c.age} ${age}`}</h2>
          <p>
            {age === null
              ? c.unreachedText
              : age <= display.age
                ? c.already
                : fmt(c.explain, {
                    deposit: money(r.monthlyContribution),
                    age,
                    retire: display.retirementAge,
                  })}
          </p>
          <p className="quick-note">{c.living}</p>
          {age !== null && (
            <>
              <strong>
                {fmt(c.away, { years: Math.max(0, age - display.age) })}
              </strong>
              <ol className="quick-timeline">
                <li>
                  <span>{c.today}</span>
                  <strong>{display.age}</strong>
                </li>
                <li>
                  <span>Coast FIRE</span>
                  <strong>{age}</strong>
                </li>
                <li>
                  <span>{c.retire}</span>
                  <strong>{display.retirementAge}</strong>
                </li>
              </ol>
            </>
          )}
          <details className="quick-disclosure">
            <summary>{c.numbers}</summary>
            <dl className="quick-numbers">
              <div>
                <dt>Coast FIRE</dt>
                <dd>{age ?? c.unreached}</dd>
              </div>
              <div>
                <dt>{c.target}</dt>
                <dd>{money(r.target)}</dd>
              </div>
              <div>
                <dt>{c.nominal}</dt>
                <dd>{money(r.nominalTarget)}</dd>
              </div>
              <div>
                <dt>{c.returnLabel}</dt>
                <dd>{display.returnRate}%</dd>
              </div>
              <div>
                <dt>{c.inflation}</dt>
                <dd>{display.inflationRate}%</dd>
              </div>
              <div>
                <dt>{c.withdrawal}</dt>
                <dd>{display.withdrawalRate}%</dd>
              </div>
            </dl>
            <p className="quick-note">{c.model}</p>
          </details>
          <details className="quick-disclosure">
            <summary>{c.graph}</summary>
            <div className="quick-chart-toggle">
              {[false, true].map((v) => (
                <button
                  type="button"
                  key={String(v)}
                  aria-pressed={nominal === v}
                  onClick={() => setNominal(v)}
                >
                  {v ? c.future : c.real}
                </button>
              ))}
            </div>
            <div className="quick-chart-legend">
              <span>{c.savings}</span>
              <span>{c.threshold}</span>
            </div>
            {(() => {
              const points = r.projection,
                max = Math.max(
                  1,
                  ...points.flatMap((p) => [
                    scale(p.saving, p.age),
                    scale(p.threshold ?? 0, p.age),
                  ]),
                );
              const x = (a: number) =>
                44 +
                ((a - display.age) / (display.retirementAge - display.age)) *
                  610;
              const y = (v: number, a: number) =>
                230 - (scale(v, a) / max) * 200;
              return (
                <svg
                  className="quick-chart"
                  viewBox="0 0 700 280"
                  role="img"
                  aria-label={c.graphHelp}
                >
                  <line
                    x1="44"
                    y1="230"
                    x2="654"
                    y2="230"
                    className="quick-axis"
                  />
                  <text x="44" y="260">
                    {display.age}
                  </text>
                  <text x="630" y="260">
                    {display.retirementAge}
                  </text>
                  {["saving", "threshold"].map((k) => (
                    <polyline
                      key={k}
                      className={"quick-line " + k}
                      points={points
                        .filter((p) => p[k as "saving" | "threshold"] !== null)
                        .map(
                          (p) =>
                            `${x(p.age)},${y(p[k as "saving" | "threshold"]!, p.age)}`,
                        )
                        .join(" ")}
                    />
                  ))}
                  {r.coastAge !== null && (
                    <g>
                      <line
                        className="quick-marker"
                        x1={x(r.coastAge)}
                        x2={x(r.coastAge)}
                        y1="30"
                        y2="230"
                      />
                      <text
                        x={Math.max(44, Math.min(540, x(r.coastAge) - 40))}
                        y="20"
                      >
                        Coast FIRE · {age}
                      </text>
                    </g>
                  )}
                </svg>
              );
            })()}
            <p>{c.graphHelp}</p>
            <label className="quick-inspect" htmlFor="inspect-age">
              {c.age} {selected?.age.toFixed(1)}
              <input
                id="inspect-age"
                type="range"
                min="0"
                max={r.projection.length - 1}
                value={point}
                onChange={(e) => setPoint(Number(e.target.value))}
              />
            </label>
            {selected && (
              <dl className="quick-numbers">
                <div>
                  <dt>{c.savings}</dt>
                  <dd>{money(scale(selected.saving, selected.age))}</dd>
                </div>
                <div>
                  <dt>{c.threshold}</dt>
                  <dd>
                    {selected.threshold === null
                      ? "—"
                      : money(scale(selected.threshold, selected.age))}
                  </dd>
                </div>
                <div>
                  <dt>{c.gap}</dt>
                  <dd>
                    {selected.threshold === null
                      ? "—"
                      : money(
                          scale(
                            Math.max(0, selected.threshold - selected.saving),
                            selected.age,
                          ),
                        )}
                  </dd>
                </div>
              </dl>
            )}
          </details>
        </section>
      )}
      <aside className="quick-advanced">
        <p>{c.advancedText}</p>
        <a className="text-link" href={advancedHref}>
          {c.advanced}
        </a>
      </aside>
    </div>
  );
}
