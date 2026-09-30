import React, { useState } from "react";
import type dictionary from "@/i18n/en.json";
import type { calculateCoastPlan, Scenario, PlanPoint } from "@/lib/coast-plan";

type Props = {
  result: ReturnType<typeof calculateCoastPlan>;
  copy: typeof dictionary.coast.workspace;
  locale: string;
  currentAge: number;
  retirementAge: number;
  scenario: Scenario;
  onScenario: (scenario: Scenario) => void;
};
const paths = ["saving", "stop", "epf", "threshold"] as const;

export default function CoastPlanChart({
  result,
  copy: w,
  locale,
  currentAge,
  retirementAge,
  scenario,
  onScenario,
}: Props) {
  const [nominal, setNominal] = useState(false);
  const [inspect, setInspect] = useState(0);
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const compact = new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  });
  const money = (n: number | null) =>
    n === null ? "—" : "RM " + number.format(n);
  const series = result.projection.map((p) => {
    const factor = nominal
      ? Math.pow(1 + result.inflation, p.age - currentAge)
      : 1;
    return {
      ...p,
      saving: p.saving * factor,
      stop: p.stop * factor,
      epf: p.epf * factor,
      threshold: p.threshold === null ? null : p.threshold * factor,
    };
  });
  const labels = {
    saving: w.saving,
    stop: w.stop,
    epf: w.epfOnly,
    threshold: w.threshold,
  };
  const max =
    Math.max(1, ...series.flatMap((p) => paths.map((key) => p[key] ?? 0))) *
    1.1;
  const x = (age: number) =>
    92 + ((age - currentAge) / (retirementAge - currentAge)) * 1020;
  const y = (n: number) => 322 - (n / max) * 278;
  const path = (key: keyof Omit<PlanPoint, "age">) =>
    series
      .filter((p) => p[key] !== null)
      .map(
        (p, i) =>
          `${i ? "L" : "M"}${x(p.age).toFixed(2)},${y(p[key] ?? 0).toFixed(2)}`,
      )
      .join(" ");
  const index = Math.min(inspect, series.length - 1);
  const selected = series[index];
  const ending = series[series.length - 1];
  return (
    <section className="coast-chart" aria-labelledby="coast-chart-title">
      <div className="coast-chart-head">
        <div className="coast-section-title">
          <p className="eyebrow">
            {w.retirementBalance} / {retirementAge}
          </p>
          <h2 id="coast-chart-title">{w.chartTitle}</h2>
          <p>{w.chartIntro}</p>
        </div>
        <div className="coast-chart-controls">
          <div className="coast-segmented" role="group" aria-label={w.scenario}>
            {(["cautious", "base", "optimistic"] as const).map((s) => (
              <button
                type="button"
                key={s}
                aria-pressed={s === scenario}
                onClick={() => onScenario(s)}
              >
                {w.scenarioNames[s]}
              </button>
            ))}
          </div>
          <div
            className="coast-segmented"
            role="group"
            aria-label={w.moneyView}
          >
            <button
              type="button"
              aria-pressed={!nominal}
              onClick={() => setNominal(false)}
            >
              {w.todayMoney}
            </button>
            <button
              type="button"
              aria-pressed={nominal}
              onClick={() => setNominal(true)}
            >
              {w.futureMoney}
            </button>
          </div>
        </div>
      </div>
      <div className="coast-chart-scroll">
        <svg
          viewBox="0 0 1150 365"
          role="img"
          aria-labelledby="chart-svg-title chart-svg-desc"
        >
          <title id="chart-svg-title">{w.chartTitle}</title>
          <desc id="chart-svg-desc">
            {w.chartIntro} {nominal ? w.futureMoney : w.todayMoney}.{" "}
            {currentAge}–{retirementAge}.
          </desc>
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i}>
              <line
                className="chart-grid"
                x1="92"
                x2="1112"
                y1={y((max * i) / 4)}
                y2={y((max * i) / 4)}
              />
              <text
                className="chart-label"
                x="79"
                y={y((max * i) / 4) + 5}
                textAnchor="end"
              >
                {compact.format((max * i) / 4)}
              </text>
            </g>
          ))}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <text
              className="chart-label"
              key={i}
              x={x(currentAge + ((retirementAge - currentAge) * i) / 5)}
              y="350"
              textAnchor="middle"
            >
              {Math.round(currentAge + ((retirementAge - currentAge) * i) / 5)}
            </text>
          ))}
          <path
            className="chart-area"
            d={path("saving") + " L1112,322 L92,322 Z"}
          />
          {paths.map((key) => (
            <path
              key={key}
              className={"chart-line chart-" + key}
              d={path(key)}
            />
          ))}
          <line
            className="chart-cursor"
            x1={x(selected.age)}
            x2={x(selected.age)}
            y1="28"
            y2="322"
          />
          {paths
            .filter((key) => selected[key] !== null)
            .map((key) => (
              <circle
                className={"chart-point chart-point-" + key}
                key={key}
                cx={x(selected.age)}
                cy={y(selected[key] ?? 0)}
                r="5"
              />
            ))}
        </svg>
      </div>
      <div className="chart-legend">
        {paths.map((key) => (
          <span key={key}>
            <i className={"legend-" + key} />
            {labels[key]}
          </span>
        ))}
      </div>
      <div className="coast-inspector">
        <label htmlFor="coast-inspect">
          {w.inspectAge} <strong>{selected.age}</strong>
        </label>
        <input
          id="coast-inspect"
          type="range"
          min={0}
          max={series.length - 1}
          step={1}
          value={index}
          onChange={(e) => setInspect(Number(e.target.value))}
        />
        <dl>
          {paths.map((key) => (
            <div key={key}>
              <dt>{labels[key]}</dt>
              <dd>{money(selected[key])}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="projection-totals">
        {(["saving", "stop", "epf"] as const).map((key) => (
          <div key={key}>
            <span>
              {labels[key]} · {w.age} {retirementAge}
            </span>
            <strong>{money(ending[key])}</strong>
          </div>
        ))}
      </div>
      <details className="projection-table">
        <summary>
          {w.table}
          <span aria-hidden="true">+</span>
        </summary>
        <div className="table-scroll">
          <table>
            <caption>{w.tableHint}</caption>
            <thead>
              <tr>
                <th scope="col">{w.age}</th>
                {paths.map((key) => (
                  <th key={key} scope="col">
                    {labels[key]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {series.map((point) => (
                <tr key={point.age}>
                  <th scope="row">{point.age}</th>
                  {paths.map((key) => (
                    <td key={key}>{money(point[key])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
