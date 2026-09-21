import type { IncubationFollowUp } from "@/src/types/incubation-followups";
import type { StartupVigilanceDetail } from "@/src/types/startup-vigilance";
import type { IncubationTab } from "@/src/hooks/useIncubationTab";
import { getVigilanceFactorRows } from "@/src/lib/startup-vigilance-view";
import { Activity, Layers, Target, TrendingUp } from "lucide-react";
import { formatDate, getReportedProgress, phaseLabels, priorityLabels } from "../../followups/followupHelpers";

export default function OverviewTab({ followUp, vigilance, onNavigate }: {
  followUp: IncubationFollowUp; vigilance?: StartupVigilanceDetail; onNavigate: (tab: IncubationTab) => void;
}) {
  const objectives = followUp.objectives ?? [];
  const recent = [...(followUp.updates ?? [])].sort((a, b) => Date.parse(b.createdAt || "") - Date.parse(a.createdAt || "")).slice(0, 3);
  const next = objectives.filter(o => o.status !== "DONE" && o.deadlineAt && Number.isFinite(Date.parse(o.deadlineAt)))
    .sort((a, b) => Date.parse(a.deadlineAt!) - Date.parse(b.deadlineAt!))[0];
  const attention = vigilance ? getVigilanceFactorRows(vigilance.factors).filter(row => row.measured && row.score > 0).slice(0, 2) : [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const overdue = next?.deadlineAt ? Date.parse(next.deadlineAt) < today.getTime() : false;
  return <div className="inc-overview">
    <h3>Le suivi en un coup d’œil</h3>
    <dl className="inc-overview-stats">
      <div data-tone="warning"><dt><TrendingUp size={16} />Progression déclarée</dt><dd>{getReportedProgress(followUp)} %</dd></div>
      <div data-tone="info"><dt><Layers size={16} />Phase</dt><dd>{phaseLabels[followUp.phase || "ONBOARDING"]}</dd><small>Démarrage : {formatDate(followUp.startDate)}</small></div>
      <div data-tone="info"><dt><Target size={16} />Objectifs réalisés</dt><dd>{objectives.filter(o => o.status === "DONE").length} / {objectives.length}</dd></div>
      <div data-tone="info"><dt><Activity size={16} />Comptes rendus</dt><dd>{followUp.updates?.length ?? 0}</dd></div>
    </dl>
    <section className="inc-overview-section"><div className="inc-section-heading"><h3>Prochaine échéance</h3><button type="button" onClick={() => onNavigate("objectives")}>Voir les objectifs →</button></div>
      {next ? <><p className="font-medium">{next.title}</p><p className="my-2 text-sm text-foreground-muted">Échéance : {formatDate(next.deadlineAt)}</p><div className="flex flex-wrap gap-2"><span className="inc-priority" data-priority={next.priority || "MEDIUM"}>Priorité {priorityLabels[next.priority || "MEDIUM"].toLocaleLowerCase("fr")}</span>{overdue && <span className="semantic-badge" data-tone="danger">En retard</span>}</div></> : <p className="text-sm text-foreground-muted">Aucun objectif ouvert avec une échéance définie.</p>}
    </section>
    <section className="inc-overview-section"><div className="inc-section-heading"><h3>Activité récente</h3><button type="button" onClick={() => onNavigate("journal")}>Voir le journal →</button></div>
      {recent.length ? <ol className="inc-recent">{recent.map(update => <li key={update.id}><time>{formatDate(update.createdAt)}</time><div><p className="font-medium">{update.title || "Point d’avancement"}</p><p className="line-clamp-2 text-sm text-foreground-muted">{update.done}</p></div></li>)}</ol> : <p className="text-sm text-foreground-muted">Aucun compte rendu transmis.</p>}
    </section>
    <section className="inc-overview-section"><div className="inc-section-heading"><h3>Points d’attention</h3><button type="button" onClick={() => onNavigate("vigilance")}>Voir l’analyse de vigilance →</button></div>
      {attention.length ? <ul className="space-y-2 text-sm">{attention.map(row => <li key={row.key}><strong>{row.label}</strong> · {row.detail}</li>)}</ul> : <p className="text-sm text-foreground-muted">{vigilance ? "Consultez la vigilance pour les mesures disponibles et l’analyse d’accompagnement." : "Consultez l’onglet vigilance pour charger ou réessayer l’analyse du suivi."}</p>}
    </section>
  </div>;
}
