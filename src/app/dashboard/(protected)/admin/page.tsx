"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Award,
  BarChart3,
  Building2,
  ChevronRight,
  Clock,
  FileText,
  FolderKanban,
  Rocket,
  Target,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import RoleGuard from "@/src/components/auth/Roleguard";
import { Badge } from "@/src/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { useDashboardTheme } from "@/src/contexts/DashboardThemeContext";

const quickActions = [
  { label: "Nouvelle candidature", icon: FileText, color: "from-orange-500 to-amber-500" },
  { label: "Ajouter startup", icon: Rocket, color: "from-emerald-500 to-teal-500" },
  { label: "Creer programme", icon: FolderKanban, color: "from-blue-500 to-cyan-500" },
  { label: "Affecter evaluateur", icon: UserCheck, color: "from-purple-500 to-pink-500" },
];

const recentActivity = [
  { action: "Candidature soumise", startup: "TechVision AI", time: "Il y a 2 min", status: "pending" },
  { action: "Evaluation terminee", startup: "GreenEnergy Plus", time: "Il y a 15 min", status: "completed" },
  { action: "Startup acceptee", startup: "FinFlow", time: "Il y a 1 heure", status: "success" },
  { action: "Review en attente", startup: "HealthTech Pro", time: "Il y a 2 heures", status: "warning" },
  { action: "Programme lance", startup: "FoodStart 2026", time: "Il y a 3 heures", status: "info" },
];

const topStartups = [
  { name: "TechVision AI", score: 94, sector: "IA & ML", trend: "up" as const },
  { name: "GreenEnergy Plus", score: 91, sector: "CleanTech", trend: "up" as const },
  { name: "FinFlow", score: 88, sector: "FinTech", trend: "stable" as const },
  { name: "HealthTech Pro", score: 85, sector: "HealthTech", trend: "down" as const },
];

const pipelineData = [
  { stage: "Candidatures", count: 127, color: "bg-blue-500" },
  { stage: "Evaluation", count: 45, color: "bg-amber-500" },
  { stage: "Selection", count: 18, color: "bg-purple-500" },
  { stage: "Incubation", count: 34, color: "bg-emerald-500" },
];

const roleData = [
  { role: "Startup", percentage: 62, color: "bg-emerald-500" },
  { role: "Evaluator", percentage: 28, color: "bg-orange-500" },
  { role: "Admin", percentage: 10, color: "bg-blue-500" },
];

const kpiTargets = {
  applications: 127,
  startups: 34,
  conversion: 26.7,
  active: 91,
};

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  completed: "bg-blue-100 text-blue-700 border-blue-200",
  success: "bg-emerald-100 text-emerald-700 border-emerald-200",
  warning: "bg-orange-100 text-orange-700 border-orange-200",
  info: "bg-purple-100 text-purple-700 border-purple-200",
};

export default function AdminDashboardPage() {
  const { darkMode } = useDashboardTheme();
  const [animatedStats, setAnimatedStats] = useState({
    applications: 0,
    startups: 0,
    conversion: 0,
    active: 0,
  });

  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const interval = duration / steps;
    let step = 0;

    const timer = window.setInterval(() => {
      step += 1;
      const progress = step / steps;
      const easeOut = 1 - Math.pow(1 - progress, 3);

      setAnimatedStats({
        applications: Math.round(kpiTargets.applications * easeOut),
        startups: Math.round(kpiTargets.startups * easeOut),
        conversion: Math.round(kpiTargets.conversion * easeOut * 10) / 10,
        active: Math.round(kpiTargets.active * easeOut),
      });

      if (step >= steps) {
        window.clearInterval(timer);
      }
    }, interval);

    return () => window.clearInterval(timer);
  }, []);

  const cardShell = `shadow-sm transition-colors duration-300 ${
    darkMode ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-white"
  }`;

  const mutedText = darkMode ? "text-slate-400" : "text-slate-500";

  const donutRadius = 40;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const donutSegments = roleData.map((item, index) => {
    const dash = (item.percentage / 100) * donutCircumference;
    const donutOffset = roleData.slice(0, index).reduce(
      (offset, precedingItem) =>
        offset + (precedingItem.percentage / 100) * donutCircumference,
      0,
    );
    const segment = (
      <circle
        key={item.role}
        cx="50"
        cy="50"
        r={donutRadius}
        fill="none"
        strokeDasharray={`${dash} ${donutCircumference - dash}`}
        strokeDashoffset={-donutOffset}
        strokeLinecap="round"
        strokeWidth="12"
        className={item.color}
      />
    );

    return segment;
  });

  return (
    <RoleGuard allowedRole="ADMIN">
      <div className="space-y-8">
        <div className="grid grid-cols-4 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;

            return (
              <button
                key={action.label}
                className={`group flex items-center gap-4 rounded-2xl border p-5 transition-all duration-300 ${
                  darkMode
                    ? "border-slate-700 bg-slate-800 hover:border-slate-600"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
                type="button"
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${
                    action.color
                  } shadow-lg transition-transform duration-300 group-hover:scale-110`}
                >
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <span className={`text-sm font-semibold ${darkMode ? "text-slate-200" : "text-slate-700"}`}>
                  {action.label}
                </span>
                <ChevronRight
                  className={`ml-auto h-5 w-5 transition-transform duration-300 group-hover:translate-x-1 ${
                    darkMode ? "text-slate-500" : "text-slate-300"
                  }`}
                />
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-4 gap-4">
          <Card className={cardShell}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-wider ${mutedText}`}>
                    Applications
                  </p>
                  <p className={`mt-2 text-4xl font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>
                    {animatedStats.applications}
                  </p>
                  <div className="mt-2 flex items-center gap-1 text-emerald-500">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm font-semibold">+12%</span>
                    <span className={`text-xs ${mutedText}`}>vs mois dernier</span>
                  </div>
                </div>
                <div className={`rounded-xl p-3 ${darkMode ? "bg-blue-500/20" : "bg-blue-100"}`}>
                  <FileText className={`h-6 w-6 ${darkMode ? "text-blue-400" : "text-blue-600"}`} />
                </div>
              </div>
              <div className={`mt-4 h-2 w-full overflow-hidden rounded-full ${darkMode ? "bg-slate-700" : "bg-slate-100"}`}>
                <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500" />
              </div>
            </CardContent>
          </Card>

          <Card className={cardShell}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-wider ${mutedText}`}>
                    Startups acceptees
                  </p>
                  <p className={`mt-2 text-4xl font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>
                    {animatedStats.startups}
                  </p>
                  <div className="mt-2 flex items-center gap-1 text-orange-500">
                    <Target className="h-4 w-4" />
                    <span className="text-sm font-semibold">{animatedStats.conversion}%</span>
                    <span className={`text-xs ${mutedText}`}>taux conversion</span>
                  </div>
                </div>
                <div className={`rounded-xl p-3 ${darkMode ? "bg-emerald-500/20" : "bg-emerald-100"}`}>
                  <Building2 className={`h-6 w-6 ${darkMode ? "text-emerald-400" : "text-emerald-600"}`} />
                </div>
              </div>
              <div className={`mt-4 h-2 w-full overflow-hidden rounded-full ${darkMode ? "bg-slate-700" : "bg-slate-100"}`}>
                <div className="h-full w-1/4 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" />
              </div>
            </CardContent>
          </Card>

          <Card className={cardShell}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-wider ${mutedText}`}>
                    Delai moyen review
                  </p>
                  <p className={`mt-2 text-4xl font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>
                    2.8<span className={`text-xl ${darkMode ? "text-slate-500" : "text-slate-400"}`}>j</span>
                  </p>
                  <div className="mt-2 flex items-center gap-1 text-amber-500">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm font-semibold">Objectif: 3j</span>
                  </div>
                </div>
                <div className={`rounded-xl p-3 ${darkMode ? "bg-amber-500/20" : "bg-amber-100"}`}>
                  <Clock className={`h-6 w-6 ${darkMode ? "text-amber-400" : "text-amber-600"}`} />
                </div>
              </div>
              <div className={`mt-4 h-2 w-full overflow-hidden rounded-full ${darkMode ? "bg-slate-700" : "bg-slate-100"}`}>
                <div className="h-full w-[93%] rounded-full bg-gradient-to-r from-amber-500 to-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card className={cardShell}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-wider ${mutedText}`}>
                    Comptes actifs
                  </p>
                  <p className={`mt-2 text-4xl font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>
                    {animatedStats.active}
                    <span className={`text-xl ${darkMode ? "text-slate-500" : "text-slate-400"}`}>%</span>
                  </p>
                  <div className="mt-2 flex items-center gap-1 text-emerald-500">
                    <Activity className="h-4 w-4" />
                    <span className="text-sm font-semibold">Engagement sain</span>
                  </div>
                </div>
                <div className={`rounded-xl p-3 ${darkMode ? "bg-purple-500/20" : "bg-purple-100"}`}>
                  <Activity className={`h-6 w-6 ${darkMode ? "text-purple-400" : "text-purple-600"}`} />
                </div>
              </div>
              <div className={`mt-4 h-2 w-full overflow-hidden rounded-full ${darkMode ? "bg-slate-700" : "bg-slate-100"}`}>
                <div className="h-full w-[91%] rounded-full bg-gradient-to-r from-purple-500 to-pink-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <Card className={cardShell}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className={`flex items-center gap-2 ${darkMode ? "text-white" : "text-slate-900"}`}>
                  <BarChart3 className="h-5 w-5 text-orange-500" />
                  Pipeline
                </CardTitle>
                <Badge className={darkMode ? "border-orange-500/30 bg-orange-500/20 text-orange-400" : "border-orange-200 bg-orange-100 text-orange-700"}>
                  Live
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pipelineData.map((item) => (
                  <div key={item.stage}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className={`text-sm font-medium ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                        {item.stage}
                      </span>
                      <span className={`text-lg font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>
                        {item.count}
                      </span>
                    </div>
                    <div className={`h-3 w-full overflow-hidden rounded-full ${darkMode ? "bg-slate-700" : "bg-slate-100"}`}>
                      <div
                        className={`h-full ${item.color} rounded-full transition-all duration-500`}
                        style={{ width: `${(item.count / 127) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className={`mt-6 flex items-center justify-between rounded-xl p-4 ${darkMode ? "bg-orange-500/10 border border-orange-500/30" : "bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200"}`}>
                <span className={`text-sm font-medium ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
                  Taux de conversion global
                </span>
                <span className="text-xl font-bold text-emerald-500">26.7%</span>
              </div>
            </CardContent>
          </Card>

          <Card className={cardShell}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className={`flex items-center gap-2 ${darkMode ? "text-white" : "text-slate-900"}`}>
                  <Award className="h-5 w-5 text-amber-500" />
                  Top Startups
                </CardTitle>
                <button className="text-xs font-medium text-orange-500 hover:text-orange-400">Voir tout</button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topStartups.map((startup, idx) => (
                  <div
                    key={startup.name}
                    className={`group flex items-center gap-4 rounded-xl border p-3 transition-all ${
                      darkMode
                        ? "border-slate-700 bg-slate-700/50 hover:border-slate-600 hover:bg-slate-700"
                        : "border-slate-100 bg-slate-50 hover:border-slate-200 hover:bg-white"
                    }`}
                  >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg text-lg font-bold ${
                      idx === 0
                        ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white"
                        : idx === 1
                          ? "bg-gradient-to-br from-slate-300 to-slate-400 text-white"
                          : idx === 2
                            ? "bg-gradient-to-br from-amber-600 to-amber-700 text-white"
                            : darkMode
                              ? "bg-slate-600 text-slate-300"
                              : "bg-slate-200 text-slate-600"
                    }`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className={`font-semibold ${darkMode ? "text-white" : "text-slate-900"}`}>
                        {startup.name}
                      </p>
                      <p className={`text-xs ${mutedText}`}>{startup.sector}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>
                        {startup.score}
                      </p>
                      <div className="flex items-center justify-end gap-1">
                        {startup.trend === "up" && <TrendingUp className="h-3 w-3 text-emerald-500" />}
                        {startup.trend === "down" && <TrendingDown className="h-3 w-3 text-red-500" />}
                        {startup.trend === "stable" && (
                          <span className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>—</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className={cardShell}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className={`flex items-center gap-2 ${darkMode ? "text-white" : "text-slate-900"}`}>
                  <Activity className="h-5 w-5 text-purple-500" />
                  Activite recente
                </CardTitle>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-2.5 w-2.5 animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div
                    key={`${activity.action}-${activity.startup}`}
                    className={`flex items-start gap-3 rounded-xl border p-3 transition-all ${
                      darkMode
                        ? "border-slate-700 bg-slate-700/50 hover:border-slate-600 hover:bg-slate-700"
                        : "border-slate-100 bg-slate-50 hover:border-slate-200 hover:bg-white"
                    }`}
                  >
                    <div className={`mt-0.5 h-2 w-2 rounded-full ${statusColors[activity.status].split(" ")[0]}`} />
                    <div className="flex-1">
                      <p className={`text-sm font-semibold ${darkMode ? "text-white" : "text-slate-900"}`}>
                        {activity.action}
                      </p>
                      <p className={`text-xs ${mutedText}`}>{activity.startup}</p>
                    </div>
                    <span className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                      {activity.time}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <Card className={cardShell}>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${darkMode ? "text-white" : "text-slate-900"}`}>
                <Users className="h-5 w-5 text-blue-500" />
                Distribution des roles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-8">
                <div className="relative h-40 w-40">
                  <svg className="h-40 w-40 -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r={donutRadius}
                      fill="none"
                      stroke={darkMode ? "#334155" : "#f1f5f9"}
                      strokeWidth="12"
                    />
                    {donutSegments}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-2xl font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>
                      243
                    </span>
                    <span className={`text-xs ${mutedText}`}>utilisateurs</span>
                  </div>
                </div>
                <div className="flex-1 space-y-4">
                  {roleData.map((item) => (
                    <div key={item.role} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-3 w-3 rounded-full ${item.color}`} />
                        <span className={`text-sm font-medium ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
                          {item.role}
                        </span>
                      </div>
                      <span className={`text-lg font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>
                        {item.percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={cardShell}>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${darkMode ? "text-white" : "text-slate-900"}`}>
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                Performance ce mois
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className={`rounded-xl border p-4 ${darkMode ? "bg-emerald-500/10 border-emerald-500/30" : "bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200"}`}>
                  <p className={`text-xs font-semibold uppercase ${darkMode ? "text-emerald-400" : "text-emerald-600"}`}>
                    Candidatures traitees
                  </p>
                  <p className={`mt-1 text-3xl font-bold ${darkMode ? "text-emerald-400" : "text-emerald-700"}`}>
                    89%
                  </p>
                  <p className={`mt-1 text-xs ${darkMode ? "text-emerald-500" : "text-emerald-600"}`}>
                    +5% vs objectif
                  </p>
                </div>
                <div className={`rounded-xl border p-4 ${darkMode ? "bg-blue-500/10 border-blue-500/30" : "bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200"}`}>
                  <p className={`text-xs font-semibold uppercase ${darkMode ? "text-blue-400" : "text-blue-600"}`}>
                    Evaluations completes
                  </p>
                  <p className={`mt-1 text-3xl font-bold ${darkMode ? "text-blue-400" : "text-blue-700"}`}>
                    76%
                  </p>
                  <p className={`mt-1 text-xs ${darkMode ? "text-blue-500" : "text-blue-600"}`}>
                    En progression
                  </p>
                </div>
                <div className={`rounded-xl border p-4 ${darkMode ? "bg-orange-500/10 border-orange-500/30" : "bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200"}`}>
                  <p className={`text-xs font-semibold uppercase ${darkMode ? "text-orange-400" : "text-orange-600"}`}>
                    Temps reponse moyen
                  </p>
                  <p className={`mt-1 text-3xl font-bold ${darkMode ? "text-orange-400" : "text-orange-700"}`}>
                    4.2h
                  </p>
                  <p className={`mt-1 text-xs ${darkMode ? "text-orange-500" : "text-orange-600"}`}>
                    -30min vs mois dernier
                  </p>
                </div>
                <div className={`rounded-xl border p-4 ${darkMode ? "bg-purple-500/10 border-purple-500/30" : "bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200"}`}>
                  <p className={`text-xs font-semibold uppercase ${darkMode ? "text-purple-400" : "text-purple-600"}`}>
                    Satisfaction
                  </p>
                  <p className={`mt-1 text-3xl font-bold ${darkMode ? "text-purple-400" : "text-purple-700"}`}>
                    4.8/5
                  </p>
                  <p className={`mt-1 text-xs ${darkMode ? "text-purple-500" : "text-purple-600"}`}>
                    Excellent
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </RoleGuard>
  );
}
