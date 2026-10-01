import React, { useEffect, useRef, useState } from "react";
import type dictionary from "@/i18n/en.json";
import type {
  calculateCoastPlan,
  Scenario,
  PlanPoint,
  PlanEvent,
} from "@/lib/coast-plan";

type Props = {
  result: ReturnType<typeof calculateCoastPlan>;
  copy: typeof dictionary.coast.workspace;
  locale: string;
  currentAge: number;
  retirementAge: number;
  scenario: Scenario;
  onScenario: (scenario: Scenario) => void;
  events: PlanEvent[];
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
  events,
}: Props) {
  const [nominal, setNominal] = useState(false);
  const [compare, setCompare] = useState(false);
  const visiblePaths: readonly (typeof paths)[number][] = compare
    ? paths
    : ["saving", "threshold"];
  const [inspect, setInspect] = useState(0);
  const [width, setWidth] = useState(1100);
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const measure = () =>
      setWidth(Math.max(200, element.getBoundingClientRect().width));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const compact = new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  });
  const money = (n: number | null) =>
    n === null ? "—" : "RM " + number.format(n);
  const ageText = (age: number) => {
    const months = Math.round((age - Math.floor(age)) * 12);
    return (
      number.format(Math.floor(age)) +
      (months
        ? " " + w.years + " " + number.format(months) + " " + w.months
        : "")
    );
  };
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
  const rawMax =
    Math.max(
      1,
      ...series.flatMap((p) => visiblePaths.map((key) => p[key] ?? 0)),
    ) * 1.08;
  const magnitude = 10 ** Math.floor(Math.log10(rawMax / 4));
  const tick =
    ([1, 2, 2.5, 5, 10].find((v) => v * magnitude >= rawMax / 4) ?? 10) *
    magnitude;
  const max = tick * 4;
  const left = 62,
    right = width - 18,
    top = 48,
    bottom = 310,
    height = 354;
  const x = (age: number) =>
    left + ((age - currentAge) / (retirementAge - currentAge)) * (right - left);
  const y = (n: number) => bottom - (n / max) * (bottom - top);
  const path = (key: keyof Omit<PlanPoint, "age">) => {
    let previous = false;
    return series
      .map((p) => {
        if (p[key] === null) {
          previous = false;
          return "";
        }
        const segment =
          (previous ? "L" : "M") +
          x(p.age).toFixed(2) +
          "," +
          y(p[key]!).toFixed(2);
        previous = true;
        return segment;
      })
      .join(" ");
  };
  const index = Math.min(inspect, series.length - 1);
  const selected = series[index];
  const ending = series[series.length - 1];
  const nearest = (age: number) =>
    series.reduce(
      (best, p, i) =>
        Math.abs(p.age - age) < Math.abs(series[best].age - age) ? i : best,
      0,
    );
  const milestoneIndex =
    result.coastAge === null ? null : nearest(result.coastAge);
  const milestone = milestoneIndex === null ? null : series[milestoneIndex];
  const chartEvents = events.filter((e) => e.age <= retirementAge);
  const eventAges = [...new Set(chartEvents.map((e) => e.age))];
  const selectedEvents = chartEvents.filter(
    (e) => Math.abs(e.age - selected.age) < 0.001,
  );
  const gap =
    selected.threshold === null ? null : selected.saving - selected.threshold;
  const inspectPointer = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.pointerType !== "mouse" && e.type === "pointermove" && !e.buttons)
      return;
    const matrix = e.currentTarget.getScreenCTM();
    if (!matrix) return;
    const point = e.currentTarget.createSVGPoint();
    point.x = e.clientX;
    point.y = e.clientY;
    const local = point.matrixTransform(matrix.inverse());
    if (local.x < left || local.x > right || local.y < top || local.y > bottom)
      return;
    setInspect(
      nearest(
        currentAge +
          ((local.x - left) / (right - left)) * (retirementAge - currentAge),
      ),
    );
  };
  const inspectAt = (age: number) => {
    setInspect(nearest(age));
  };
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
          <details className="coast-chart-options">
            <summary>{w.simple.chartSettings} ⌄</summary>
            <div
              className="coast-segmented"
              role="group"
              aria-label={w.scenario}
            >
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
          </details>
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
      <div className={"coast-milestone" + (milestone ? " reached" : "")}>
        <div>
          <span>{w.resultTitle}</span>
          <strong>
            {result.firstCoastMonth === 0
              ? w.today
              : result.coastAge === null
                ? w.notReached
                : w.age + " " + ageText(result.coastAge)}
          </strong>
          <p>{w.coastMeaning}</p>
        </div>
        {milestone && (
          <button type="button" onClick={() => inspectAt(milestone.age)}>
            {w.inspectMilestone}
          </button>
        )}
      </div>
      <p className="coast-chart-hint" id="coast-chart-hint">
        {w.chartInteraction} · {nominal ? w.futureMoney : w.todayMoney}
      </p>
      <div className="coast-chart-plot" ref={container}>
        <svg
          viewBox={"0 0 " + width + " " + height}
          role="img"
          tabIndex={0}
          aria-labelledby="chart-svg-title chart-svg-desc"
          aria-describedby="coast-chart-hint"
          onPointerDown={(e) => {
            inspectPointer(e);
            if (e.pointerType !== "mouse")
              e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={inspectPointer}
          onKeyDown={(e) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key))
              return;
            e.preventDefault();
            setInspect(
              e.key === "Home"
                ? 0
                : e.key === "End"
                  ? series.length - 1
                  : Math.max(
                      0,
                      Math.min(
                        series.length - 1,
                        index + (e.key === "ArrowRight" ? 1 : -1),
                      ),
                    ),
            );
          }}
        >
          <title id="chart-svg-title">{w.chartTitle}</title>
          <desc id="chart-svg-desc">
            {w.chartIntro} {nominal ? w.futureMoney : w.todayMoney}.{" "}
            {currentAge}–{retirementAge}.
            {result.coastAge === null
              ? w.notReached
              : w.resultTitle + ": " + ageText(result.coastAge)}
          </desc>
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i}>
              <line
                className="chart-grid"
                x1={left}
                x2={right}
                y1={y(tick * i)}
                y2={y(tick * i)}
              />
              <text
                className="chart-label"
                x={left - 9}
                y={y(tick * i) + 5}
                textAnchor="end"
              >
                {compact.format(tick * i)}
              </text>
            </g>
          ))}
          {Array.from({ length: width < 550 ? 4 : 6 }, (_, i) => i).map((i) => {
            const count = width < 550 ? 3 : 5;
            const age = currentAge + ((retirementAge - currentAge) * i) / count;
            return (
              <text
                className="chart-label"
                key={i}
                x={x(age)}
                y={bottom + 26}
                textAnchor="middle"
              >
                {number.format(Math.round(age))}
              </text>
            );
          })}
          <path
            className="chart-area"
            d={
              path("saving") +
              " L" +
              right +
              "," +
              bottom +
              " L" +
              left +
              "," +
              bottom +
              " Z"
            }
          />
          {eventAges.map((age) => (
            <g key={age} className="chart-event-marker">
              <title>
                {w.age} {age}:{" "}
                {chartEvents
                  .filter((e) => e.age === age)
                  .map((e) => e.name || w.names[e.kind])
                  .join(", ")}
              </title>
              <line x1={x(age)} x2={x(age)} y1={top - 10} y2={bottom} />
              <path
                d={"M" + x(age) + "," + (top - 19) + " l6,6 -6,6 -6,-6 Z"}
              />
            </g>
          ))}
          {visiblePaths.map((key) => (
            <path
              key={key}
              className={"chart-line chart-" + key}
              d={path(key)}
            />
          ))}
          {milestone && (
            <g className="chart-coast-marker">
              <line
                x1={x(milestone.age)}
                x2={x(milestone.age)}
                y1={top - 20}
                y2={bottom}
              />
              <circle cx={x(milestone.age)} cy={y(milestone.saving)} r={8} />
              <text
                x={Math.max(left + 40, Math.min(right - 40, x(milestone.age)))}
                y={top - 28}
                textAnchor="middle"
              >
                {w.coastMarker}
              </text>
            </g>
          )}
          <line
            className="chart-cursor"
            x1={x(selected.age)}
            x2={x(selected.age)}
            y1={top}
            y2={bottom}
          />
          {visiblePaths
            .filter((key) => selected[key] !== null)
            .map((key) => (
              <circle
                className={"chart-point chart-point-" + key}
                key={key}
                cx={x(selected.age)}
                cy={y(selected[key]!)}
                r={4}
              />
            ))}
        </svg>
      </div>
      <div className={"coast-inspector" + (compare ? "" : " simple-inspector")}>
        <label htmlFor="coast-inspect">
          {w.inspectAge} <strong>{ageText(selected.age)}</strong>
          <small>{nominal ? w.futureMoney : w.todayMoney}</small>
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
          {visiblePaths.map((key) => (
            <div key={key}>
              <dt>
                <i className={"tooltip-" + key} />
                {labels[key]}
              </dt>
              <dd>{money(selected[key])}</dd>
            </div>
          ))}
        </dl>
        {gap !== null && (
          <p className="coast-inspector-gap">
            {gap >= 0 ? w.aboveThreshold : w.belowThreshold}:{" "}
            <strong>{money(Math.abs(gap))}</strong>
          </p>
        )}
        {selectedEvents.map((e) => (
          <p className="coast-inspector-event" key={e.id}>
            {e.name || w.names[e.kind]}:{" "}
            <strong>
              {money(
                e.amount *
                  (nominal
                    ? Math.pow(1 + result.inflation, e.age - currentAge)
                    : 1),
              )}
              {e.kind === "income" ? " / " + w.monthly : ""}
            </strong>
          </p>
        ))}
      </div>
      <div className="chart-legend">
        {visiblePaths.map((key) => (
          <span key={key}>
            <i className={"legend-" + key} />
            {labels[key]}
          </span>
        ))}
      </div>
      <button
        type="button"
        className="coast-detail-button coast-compare-toggle"
        aria-pressed={compare}
        onClick={() => setCompare((v) => !v)}
      >
        {compare ? w.simple.hideComparisons : w.simple.comparePaths}
      </button>
      {!!chartEvents.length && (
        <div className="coast-chart-events">
          {chartEvents.map((e) => (
            <button type="button" key={e.id} onClick={() => inspectAt(e.age)}>
              <span aria-hidden="true">◆</span> {w.age} {e.age} ·{" "}
              {e.name || w.names[e.kind]}
            </button>
          ))}
        </div>
      )}
      {compare && (
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
      )}
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
                {visiblePaths.map((key) => (
                  <th key={key} scope="col">
                    {labels[key]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {series.map((point) => (
                <tr key={point.age}>
                  <th scope="row">{ageText(point.age)}</th>
                  {visiblePaths.map((key) => (
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
