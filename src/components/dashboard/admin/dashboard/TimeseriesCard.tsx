"use client";

import { useId, useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { useDashboardTheme } from "@/src/contexts/DashboardThemeContext";
import { usePrefersReducedMotion } from "@/src/hooks/usePrefersReducedMotion";
import {
  getAdminTimeseries,
  type AdminTimeseriesResponse,
  type DashboardFilters,
  type TimeseriesGranularity,
} from "@/src/lib/dashboard-api";

type TimeseriesCardProps = {
  filters: DashboardFilters;
};

// Mois en ASCII, comme le reste des blocs dashboard. Un toLocaleDateString()
// ferait dependre le libelle de l'ICU disponible (serveur vs navigateur).
const SHORT_MONTHS = [
  "janv.",
  "fevr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "aout",
  "sept.",
  "oct.",
  "nov.",
  "dec.",
];

const GRANULARITY_LABELS: Record<TimeseriesGranularity, string> = {
  day: "Vue par jour",
  week: "Vue par semaine",
  month: "Vue par mois",
};

const CANDIDATURES_COLOR = "#3b82f6"; // blue-500
const ACCEPTATIONS_COLOR = "#10b981"; // emerald-500
const DELAI_COLOR = "#f59e0b"; // amber-500

// Au-dela, les libelles de l'axe X se chevauchent : on n'en affiche qu'un sur N.
const MAX_X_LABELS = 8;

type ChartPoint = {
  label: string;
  currentDate: string;
  previousDate: string | null;
  candidatures: number;
  acceptations: number;
  delaiMoyenJours: number | null;
  candidaturesPrevious: number | null;
  acceptationsPrevious: number | null;
};

/**
 * Les buckets arrivent en ISO 8601 et representent un debut de periode calcule
 * cote serveur : on lit les composantes en UTC, sinon un fuseau negatif ferait
 * reculer le libelle d'un jour.
 */
function formatBucketLabel(iso: string, granularity: TimeseriesGranularity): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  const day = date.getUTCDate();
  const month = SHORT_MONTHS[date.getUTCMonth()];
  const year = date.getUTCFullYear();

  if (granularity === "month") {
    return `${month} ${year}`;
  }

  if (granularity === "week") {
    return `sem. ${day} ${month}`;
  }

  return `${day} ${month}`;
}

function formatFullDate(iso: string): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return `${date.getUTCDate()} ${SHORT_MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function formatDelai(value: number | null): string {
  return value === null ? "n/a" : `${value.toFixed(1)} j`;
}

function formatDelta(current: number, previous: number | null): string | null {
  if (previous === null) {
    return null;
  }

  const diff = current - previous;

  if (diff === 0) {
    return "=";
  }

  return diff > 0 ? `+${diff}` : `${diff}`;
}

/**
 * current[] et previous[] ont la meme granularite et le meme nombre de buckets
 * (garanti par le backend) : la superposition se fait donc par index, jamais par
 * date — les dates des deux periodes ne coincident evidemment pas.
 */
function buildChartPoints(data: AdminTimeseriesResponse | undefined): ChartPoint[] {
  if (!data) {
    return [];
  }

  return data.current.map((point, index) => {
    const previous = data.previous[index];

    return {
      label: formatBucketLabel(point.bucket, data.granularity),
      currentDate: formatFullDate(point.bucket),
      previousDate: previous ? formatFullDate(previous.bucket) : null,
      candidatures: point.candidatures,
      acceptations: point.acceptations,
      delaiMoyenJours: point.delaiMoyenJours,
      candidaturesPrevious: previous ? previous.candidatures : null,
      acceptationsPrevious: previous ? previous.acceptations : null,
    };
  });
}

export default function TimeseriesCard({ filters }: TimeseriesCardProps) {
  const { darkMode } = useDashboardTheme();
  // Recharts anime le trace a l'entree ; on s'aligne sur OverviewKpiCards qui
  // coupe deja ses animations quand le systeme demande un mouvement reduit.
  const prefersReducedMotion = usePrefersReducedMotion();
  // Le <defs> du degrade et les cibles aria vivent dans le DOM global : des ids
  // stables mais uniques evitent toute collision si le bloc est monte deux fois.
  const domId = useId();
  const gradientId = `timeseries-fill-${domId}`;
  const titleId = `timeseries-title-${domId}`;
  const descriptionId = `timeseries-desc-${domId}`;

  const query = useQuery({
    queryKey: ["dashboard", "admin", "timeseries", filters],
    queryFn: () => getAdminTimeseries(filters),
    placeholderData: keepPreviousData,
  });

  const points = useMemo(() => buildChartPoints(query.data), [query.data]);

  const cardShell = `shadow-sm transition-colors duration-300 ${
    darkMode ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-white"
  }`;
  const mutedText = darkMode ? "text-slate-400" : "text-slate-500";

  if (query.isPending) {
    return (
      <div
        className={`h-[420px] animate-pulse rounded-2xl ${darkMode ? "bg-slate-800" : "bg-slate-100"}`}
      />
    );
  }

  if (query.isError) {
    return (
      <Card className={cardShell}>
        <CardContent className="p-6">
          <p className="text-sm text-red-700">Impossible de charger l&apos;evolution temporelle.</p>
          <Button className="mt-3" onClick={() => query.refetch()} type="button" variant="outline">
            Reessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { granularity, period } = query.data;
  const hasDelai = points.some((point) => point.delaiMoyenJours !== null);
  const hasVolume = points.some((point) => point.candidatures > 0 || point.acceptations > 0);
  const labelInterval = Math.max(0, Math.ceil(points.length / MAX_X_LABELS) - 1);

  const gridColor = darkMode ? "#334155" : "#e2e8f0";
  const axisColor = darkMode ? "#94a3b8" : "#64748b";

  const chartDescription =
    `Evolution des candidatures et des acceptations du ${formatFullDate(period.currentFrom)} ` +
    `au ${formatFullDate(period.currentTo)}, comparee en pointilles a la periode precedente du ` +
    `${formatFullDate(period.previousFrom)} au ${formatFullDate(period.previousTo)}. ` +
    "Utilisez les fleches du clavier pour parcourir les points du graphique.";

  const legendItems = [
    { key: "candidatures", label: "Candidatures", color: CANDIDATURES_COLOR, dashed: false },
    { key: "acceptations", label: "Acceptations", color: ACCEPTATIONS_COLOR, dashed: false },
    { key: "previous", label: "Periode precedente", color: axisColor, dashed: true },
    ...(hasDelai
      ? [{ key: "delai", label: "Delai moyen (j)", color: DELAI_COLOR, dashed: false }]
      : []),
  ];

  return (
    <Card className={cardShell}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle
            className={`flex items-center gap-2 ${darkMode ? "text-white" : "text-slate-900"}`}
            id={titleId}
          >
            <TrendingUp className="h-5 w-5 text-blue-500" />
            Evolution des candidatures
          </CardTitle>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              darkMode ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-600"
            }`}
          >
            {GRANULARITY_LABELS[granularity]}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-wrap items-center gap-4">
          {legendItems.map((item) => (
            <div className="flex items-center gap-2" key={item.key}>
              <svg aria-hidden="true" className="h-2 w-6" viewBox="0 0 24 8">
                <line
                  stroke={item.color}
                  strokeDasharray={item.dashed ? "4 4" : undefined}
                  strokeLinecap="round"
                  strokeWidth="3"
                  x1="1"
                  x2="23"
                  y1="4"
                  y2="4"
                />
              </svg>
              <span className={`text-xs font-medium ${mutedText}`}>{item.label}</span>
            </div>
          ))}
        </div>

        {!hasVolume && (
          <p className={`mb-4 text-sm ${mutedText}`}>Aucune candidature sur cette periode.</p>
        )}

        {/*
          Recharts pose role="application" + tabIndex=0 sur le <svg> mais n'expose
          pas de prop `title` : on nomme donc la region qui l'entoure, et on passe
          `desc` pour que le SVG porte aussi sa description.
        */}
        <figure aria-describedby={descriptionId} aria-labelledby={titleId} className="m-0">
          <p className="sr-only" id={descriptionId}>
            {chartDescription}
          </p>

          <ResponsiveContainer height={300} width="100%">
            <ComposedChart
              accessibilityLayer
              data={points}
              desc={chartDescription}
              margin={{ bottom: 0, left: 0, right: 8, top: 8 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={CANDIDATURES_COLOR} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={CANDIDATURES_COLOR} stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />

              <XAxis
                axisLine={{ stroke: gridColor }}
                dataKey="label"
                interval={labelInterval}
                tick={{ fill: axisColor, fontSize: 12 }}
                tickLine={false}
                tickMargin={8}
              />

              <YAxis
                allowDecimals={false}
                axisLine={false}
                tick={{ fill: axisColor, fontSize: 12 }}
                tickLine={false}
                width={40}
                yAxisId="count"
              />

              {hasDelai && (
                <YAxis
                  axisLine={false}
                  orientation="right"
                  tick={{ fill: DELAI_COLOR, fontSize: 12 }}
                  tickFormatter={(value: number) => `${value} j`}
                  tickLine={false}
                  width={48}
                  yAxisId="days"
                />
              )}

              <Tooltip
                content={({ active, activeIndex }) => {
                  if (!active || activeIndex === null || activeIndex === undefined) {
                    return null;
                  }

                  const point = points[Number(activeIndex)];

                  if (!point) {
                    return null;
                  }

                  const rows = [
                    {
                      key: "candidatures",
                      label: "Candidatures",
                      color: CANDIDATURES_COLOR,
                      value: `${point.candidatures}`,
                      delta: formatDelta(point.candidatures, point.candidaturesPrevious),
                    },
                    {
                      key: "acceptations",
                      label: "Acceptations",
                      color: ACCEPTATIONS_COLOR,
                      value: `${point.acceptations}`,
                      delta: formatDelta(point.acceptations, point.acceptationsPrevious),
                    },
                    ...(hasDelai
                      ? [
                          {
                            key: "delai",
                            label: "Delai moyen",
                            color: DELAI_COLOR,
                            value: formatDelai(point.delaiMoyenJours),
                            delta: null,
                          },
                        ]
                      : []),
                  ];

                  return (
                    <div
                      className={`rounded-xl border p-3 shadow-lg ${
                        darkMode ? "border-slate-600 bg-slate-800" : "border-slate-200 bg-white"
                      }`}
                    >
                      <p
                        className={`text-sm font-semibold ${darkMode ? "text-white" : "text-slate-900"}`}
                      >
                        {point.currentDate}
                      </p>
                      {point.previousDate && (
                        <p className={`text-xs ${mutedText}`}>vs {point.previousDate}</p>
                      )}
                      <div className="mt-2 space-y-1">
                        {rows.map((row) => (
                          <div className="flex items-center gap-3" key={row.key}>
                            <span
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ backgroundColor: row.color }}
                            />
                            <span className={`text-xs ${mutedText}`}>{row.label}</span>
                            <span
                              className={`ml-auto text-xs font-semibold ${
                                darkMode ? "text-white" : "text-slate-900"
                              }`}
                            >
                              {row.value}
                            </span>
                            {row.delta && (
                              <span className={`w-8 text-right text-xs ${mutedText}`}>{row.delta}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }}
                cursor={{ stroke: axisColor, strokeDasharray: "3 3" }}
              />

              <Area
                dataKey="candidatures"
                dot={false}
                isAnimationActive={!prefersReducedMotion}
                fill={`url(#${gradientId})`}
                name="Candidatures"
                stroke={CANDIDATURES_COLOR}
                strokeWidth={2}
                type="monotone"
                yAxisId="count"
              />

              <Line
                dataKey="candidaturesPrevious"
                dot={false}
                isAnimationActive={!prefersReducedMotion}
                name="Candidatures (periode precedente)"
                stroke={CANDIDATURES_COLOR}
                strokeDasharray="4 4"
                strokeOpacity={0.45}
                strokeWidth={2}
                type="monotone"
                yAxisId="count"
              />

              <Line
                dataKey="acceptations"
                dot={false}
                isAnimationActive={!prefersReducedMotion}
                name="Acceptations"
                stroke={ACCEPTATIONS_COLOR}
                strokeWidth={2}
                type="monotone"
                yAxisId="count"
              />

              <Line
                dataKey="acceptationsPrevious"
                dot={false}
                isAnimationActive={!prefersReducedMotion}
                name="Acceptations (periode precedente)"
                stroke={ACCEPTATIONS_COLOR}
                strokeDasharray="4 4"
                strokeOpacity={0.45}
                strokeWidth={2}
                type="monotone"
                yAxisId="count"
              />

              {/*
                Serie creuse par nature (null des qu'aucune evaluation n'a ete
                soumise dans le bucket). Avec connectNulls={false}, un bucket
                isole ne trace aucun segment : sans point visible, l'axe de
                droite s'afficherait pour une courbe invisible.
              */}
              {hasDelai && (
                <Line
                  connectNulls={false}
                  dataKey="delaiMoyenJours"
                  dot={{ fill: DELAI_COLOR, r: 2.5, strokeWidth: 0 }}
                  isAnimationActive={!prefersReducedMotion}
                  name="Delai moyen (jours)"
                  stroke={DELAI_COLOR}
                  strokeWidth={2}
                  type="monotone"
                  yAxisId="days"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </figure>
      </CardContent>
    </Card>
  );
}
