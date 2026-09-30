import React, { useMemo, useState } from "react";
import type dictionary from "@/i18n/en.json";
import {
  calculateCoast,
  exampleInputs,
  inputLimits,
  validCoastInputs,
  type CoastInputs,
} from "@/lib/coast-fire";

type Copy = typeof dictionary.coast;
type Props = { copy: Copy; lang: string; journalHref: string };
const planFields: (keyof CoastInputs)[] = [
  "age",
  "retirementAge",
  "investments",
  "monthlySpending",
  "monthlyContribution",
];
const assumptionFields: (keyof CoastInputs)[] = [
  "returnRate",
  "inflationRate",
  "withdrawalRate",
];
const moneyFields = ["investments", "monthlySpending", "monthlyContribution"];

export default function CoastFire({ copy: c, lang, journalHref }: Props) {
  const [input, setInput] = useState<CoastInputs>({ ...exampleInputs });
  const locale = lang === "zh" ? "zh-MY" : lang === "ms" ? "ms-MY" : "en-MY";
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const compact = new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  });
  const decimal = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const money = (value: number) => "RM " + number.format(value);
  const valid = validCoastInputs(input);
  const result = useMemo(
    () => (valid ? calculateCoast(input) : null),
    [input, valid],
  );
  const replaceAge = (text: string, age: number) =>
    text.replace("{age}", decimal.format(age));

  const field = (key: keyof CoastInputs) => {
    const percent = assumptionFields.includes(key);
    const isMoney = moneyFields.includes(key);
    const [min, max] = inputLimits[key];
    const invalid =
      !Number.isFinite(input[key]) ||
      input[key] < min ||
      input[key] > max ||
      (!percent && !isMoney && !Number.isInteger(input[key])) ||
      (key === "retirementAge" && input.retirementAge <= input.age);
    return (
      <div
        className={"coast-field " + (key === "investments" ? "field-wide" : "")}
        key={key}
      >
        <label htmlFor={"coast-" + key}>{c.fields[key].label}</label>
        <div className={"coast-input-wrap" + (invalid ? " invalid" : "")}>
          {isMoney && <span aria-hidden="true">RM</span>}
          <input
            id={"coast-" + key}
            type="number"
            min={min}
            max={max}
            step={percent || isMoney ? "any" : 1}
            inputMode={percent || isMoney ? "decimal" : "numeric"}
            value={Number.isFinite(input[key]) ? input[key] : ""}
            aria-invalid={invalid}
            aria-describedby={"hint-" + key}
            onChange={(event) =>
              setInput((previous) => ({
                ...previous,
                [key]:
                  event.target.value === "" ? NaN : Number(event.target.value),
              }))
            }
          />
          {percent && <span aria-hidden="true">%</span>}
        </div>
        <small id={"hint-" + key}>
          {c.fields[key].hint}{" "}
          <span className="input-limit">
            ({number.format(min)}–{number.format(max)})
          </span>
        </small>
      </div>
    );
  };

  const chart = () => {
    if (!result) return null;
    const { projection, retirementTarget } = result;
    const max =
      Math.max(
        retirementTarget,
        ...projection.map((p) => p.keepSaving),
        ...projection.map((p) => p.noDeposits),
      ) * 1.12;
    const x = (age: number) => 74 + ((age - input.age) / result.years) * 578;
    const y = (value: number) => 264 - (value / max) * 230;
    const path = (key: "keepSaving" | "noDeposits") =>
      projection
        .map(
          (p, i) =>
            (i ? "L" : "M") + x(p.age).toFixed(2) + "," + y(p[key]).toFixed(2),
        )
        .join(" ");
    const savingPath = path("keepSaving");
    const chartDescription = c.chartAccessible
      .replace("{start}", String(input.age))
      .replace("{end}", String(input.retirementAge));
    return (
      <section className="coast-chart" aria-labelledby="coast-chart-heading">
        <div className="coast-chart-head">
          <div>
            <p className="eyebrow">
              {c.atAge.replace("{age}", String(input.retirementAge))}
            </p>
            <h2 id="coast-chart-heading">{c.chartTitle}</h2>
            <p>{c.chartIntro}</p>
          </div>
          <span className="coast-money-label">{c.moneyAxis}</span>
        </div>
        <svg
          viewBox="0 0 680 310"
          role="img"
          aria-labelledby="coast-chart-title coast-chart-desc"
        >
          <title id="coast-chart-title">{c.chartTitle}</title>
          <desc id="coast-chart-desc">{chartDescription}</desc>
          {[0, 1, 2, 3, 4].map((i) => {
            const value = (max * i) / 4;
            return (
              <g key={i}>
                <line
                  className="chart-grid"
                  x1="74"
                  x2="652"
                  y1={y(value)}
                  y2={y(value)}
                />
                <text
                  className="chart-label"
                  x="63"
                  y={y(value) + 4}
                  textAnchor="end"
                >
                  {compact.format(value)}
                </text>
              </g>
            );
          })}
          {[0, 1, 2, 3, 4].map((i) => {
            const age = input.age + (result.years * i) / 4;
            return (
              <text
                className="chart-label"
                key={i}
                x={x(age)}
                y="289"
                textAnchor="middle"
              >
                {decimal.format(age)}
              </text>
            );
          })}
          <path className="chart-area" d={savingPath + " L652,264 L74,264 Z"} />
          <line
            className="chart-target"
            x1="74"
            x2="652"
            y1={y(retirementTarget)}
            y2={y(retirementTarget)}
          />
          <path className="chart-savings" d={savingPath} />
          <path className="chart-existing" d={path("noDeposits")} />
          <circle
            className="chart-end"
            cx="652"
            cy={y(result.savingRetirement)}
            r="5"
          />
        </svg>
        <div className="chart-legend">
          <span>
            <i className="legend-savings" />
            {c.keepSaving}
          </span>
          <span>
            <i className="legend-existing" />
            {c.noDeposits}
          </span>
          <span>
            <i className="legend-target" />
            {c.targetLine}
          </span>
        </div>
        <div className="projection-totals">
          <div>
            <span>{c.keepSaving}</span>
            <strong>{money(result.savingRetirement)}</strong>
          </div>
          <div>
            <span>{c.noDeposits}</span>
            <strong>{money(result.noDepositRetirement)}</strong>
          </div>
        </div>
        <details className="projection-table">
          <summary>
            {c.table}
            <span aria-hidden="true">+</span>
          </summary>
          <div className="table-scroll">
            <table>
              <caption>{c.tableNote}</caption>
              <thead>
                <tr>
                  <th scope="col">{c.ageColumn}</th>
                  <th scope="col">{c.keepSaving}</th>
                  <th scope="col">{c.noDeposits}</th>
                </tr>
              </thead>
              <tbody>
                {projection.map((p) => (
                  <tr key={p.age}>
                    <th scope="row">{p.age}</th>
                    <td>{money(p.keepSaving)}</td>
                    <td>{money(p.noDeposits)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>
    );
  };

  return (
    <div className="container coast-page">
      <header className="coast-heading">
        <div>
          <p className="eyebrow">
            {c.tag} <span className="coast-title-label">{c.title}</span>
          </p>
          <h1>
            {c.headline}
            <br />
            <em>{c.emphasis}</em>
          </h1>
          <p className="coast-intro">{c.intro}</p>
        </div>
        <div className="coast-heading-note">
          <span className="coast-orbit" aria-hidden="true">
            <i />
            <i />
            <b>∞</b>
          </span>
          <span>{c.units}</span>
        </div>
      </header>
      <div className="coast-workspace">
        <section
          className="coast-inputs"
          aria-labelledby="coast-inputs-heading"
        >
          <div className="coast-panel-header">
            <span className="panel-number" aria-hidden="true">
              01
            </span>
            <div>
              <h2 id="coast-inputs-heading">{c.inputsTitle}</h2>
              <p>{c.inputsIntro}</p>
            </div>
          </div>
          <fieldset>
            <legend>{c.plan}</legend>
            <div className="coast-fields">{planFields.map(field)}</div>
          </fieldset>
          <fieldset>
            <legend>{c.assumptions}</legend>
            <div className="coast-fields assumptions-fields">
              {assumptionFields.map(field)}
            </div>
          </fieldset>
          {!valid && (
            <p className="coast-validation" role="alert">
              {Number.isFinite(input.age) &&
              Number.isFinite(input.retirementAge) &&
              input.retirementAge <= input.age
                ? c.invalidAge
                : c.invalid}
            </p>
          )}
          <div className="coast-actions">
            <button
              type="button"
              onClick={() => setInput({ ...exampleInputs })}
            >
              {c.reset}
              <span aria-hidden="true">↺</span>
            </button>
            <button
              type="button"
              onClick={() =>
                setInput((previous) => ({ ...previous, returnRate: 5 }))
              }
            >
              {c.stress}
              <span aria-hidden="true">↗</span>
            </button>
          </div>
          <p className="coast-example">{c.example}</p>
          <p className="coast-privacy">{c.privacy}</p>
        </section>
        <div className="coast-results">
          {result && (
            <>
              <section
                className="coast-result-card"
                aria-labelledby="coast-result-heading"
              >
                <p className="eyebrow" id="coast-result-heading">
                  {c.resultKicker}
                </p>
                <div className="coast-big-number">
                  <span>RM</span>
                  <strong>{number.format(result.coastTarget)}</strong>
                </div>
                <p className="result-caption">{c.resultCaption}</p>
                <div className="coast-progress-label">
                  <span>{c.progress}</span>
                  <strong>{decimal.format(result.progress)}%</strong>
                </div>
                <div
                  className="coast-progress"
                  role="progressbar"
                  aria-label={c.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.min(100, Math.round(result.progress))}
                >
                  <span
                    style={{ width: Math.min(100, result.progress) + "%" }}
                  />
                </div>
                <dl className="coast-metrics">
                  <div>
                    <dt>{c.gap}</dt>
                    <dd>{money(result.gap)}</dd>
                  </div>
                  <div>
                    <dt>{c.retirementTarget}</dt>
                    <dd>{money(result.retirementTarget)}</dd>
                  </div>
                  <div>
                    <dt>{c.realReturn}</dt>
                    <dd>{decimal.format(result.realReturn * 100)}%</dd>
                  </div>
                  <div>
                    <dt>{c.years}</dt>
                    <dd>{result.years}</dd>
                  </div>
                </dl>
              </section>
              <div className="coast-status" role="status" aria-live="polite">
                <span className="status-dot" aria-hidden="true" />
                <div>
                  <strong>
                    {result.firstCoastMonth === 0
                      ? c.ready
                      : result.coastAge !== null
                        ? c.future
                        : c.notReached}
                  </strong>
                  <p>
                    {result.firstCoastMonth === 0
                      ? c.statusReady
                      : result.coastAge !== null
                        ? replaceAge(
                            c.statusFuture,
                            Math.ceil(result.coastAge * 10) / 10,
                          )
                        : c.statusNotReached}
                  </p>
                </div>
              </div>
              {chart()}
            </>
          )}
          {!result && (
            <div className="coast-invalid-result">
              <p className="eyebrow">{c.resultKicker}</p>
              <p>{c.invalid}</p>
            </div>
          )}
        </div>
      </div>
      <section className="coast-method" aria-labelledby="coast-method-heading">
        <div className="coast-method-heading">
          <p className="eyebrow">{c.assumptions}</p>
          <h2 id="coast-method-heading">{c.methodTitle}</h2>
          <p>{c.methodIntro}</p>
        </div>
        <div className="coast-method-steps">
          {[1, 2, 3, 4].map((n) => {
            const title = c[("method" + n + "Title") as keyof Copy] as string,
              text = c[("method" + n) as keyof Copy] as string;
            return (
              <div key={n}>
                <span>0{n}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            );
          })}
        </div>
      </section>
      <details className="coast-formulas">
        <summary>
          {c.methodTitle}
          <span aria-hidden="true">+</span>
        </summary>
        <div>
          <p>
            {c.formulaTarget} = {c.annualSpending} ÷ (
            {c.fields.withdrawalRate.label} / 100)
          </p>
          <p>
            {c.formulaReal} = (1 + {c.fields.returnRate.label} / 100) ÷ (1 +{" "}
            {c.fields.inflationRate.label} / 100) − 1
          </p>
          <p>
            {c.formulaCoast} = {c.formulaTarget} ÷ (1 + {c.formulaReal})
            <sup>{c.formulaYears}</sup>
          </p>
        </div>
      </details>
      <div className="coast-footnotes">
        <p>{c.limitations}</p>
        <div>
          <p className="eyebrow">{c.sourcesTitle}</p>
          <a
            href="https://www.schwab.com/learn/story/fire-movement"
            target="_blank"
            rel="noopener noreferrer"
          >
            {c.sourceCoast} ↗
          </a>
          <a
            href="https://www.fidelity.com/learning-center/personal-finance/how-to-fi"
            target="_blank"
            rel="noopener noreferrer"
          >
            {c.sourceWithdrawal} ↗
          </a>
        </div>
      </div>
      <a className="text-link" href={journalHref}>
        {c.journalLink}
      </a>
    </div>
  );
}
