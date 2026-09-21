"use client";

import { useEffect } from "react";
import { useStartupVigilanceList } from "@/src/hooks/useStartupVigilance";
import { useVigilanceListParams } from "@/src/hooks/useVigilanceListParams";
import { getOutOfRangeVigilancePage, toVigilanceListQuery } from "@/src/lib/startup-vigilance-params";
import { getVigilanceListErrorMessage } from "@/src/lib/startup-vigilance-view";
import { Button } from "@/src/components/ui/button";
import VigilanceFilters, { type VigilanceProgramOption } from "../vigilance/VigilanceFilters";
import VigilancePagination from "../vigilance/VigilancePagination";
import IncubationStartupItem from "./IncubationStartupItem";

export default function IncubationStartupSidebar({ selectedId, onSelect, programs, onCreate, hasFollowUps }: {
  selectedId: string; onSelect: (id: string) => void; programs: VigilanceProgramOption[]; onCreate: () => void; hasFollowUps: boolean;
}) {
  const { params, setParams, resetParams } = useVigilanceListParams();
  const query = useStartupVigilanceList(toVigilanceListQuery(params));
  const pagination = query.data?.pagination;
  const correction = getOutOfRangeVigilancePage(pagination);
  useEffect(() => {
    if (correction !== null && correction !== params.page && !query.isPlaceholderData) {
      setParams({ page: correction }, { replace: true });
    }
  }, [correction, params.page, query.isPlaceholderData, setParams]);

  return <aside className="inc-sidebar" aria-label="Startups suivies">
    <div className="inc-sidebar-heading"><h2>Startups suivies</h2><span>{pagination?.totalItems ?? "—"}</span></div>
    <VigilanceFilters compact params={params} programs={programs} onParamsChange={setParams} onReset={resetParams} />
    {query.isError && <div role="alert" className="inc-message"><p>{getVigilanceListErrorMessage(query.error, "list")}</p><Button variant="outline" size="sm" onClick={() => void query.refetch()}>Réessayer la liste</Button></div>}
    {query.isPending && <div role="status" aria-label="Chargement des startups" className="inc-skeletons">{[1, 2, 3].map(n => <div key={n} />)}</div>}
    <div className="inc-startup-list" aria-busy={query.isFetching}>
      {query.data?.items.map(item => <IncubationStartupItem item={item} key={item.followUpId} selected={item.followUpId === selectedId} onSelect={onSelect} />)}
    </div>
    {pagination?.totalItems === 0 && <div className="inc-message">
      <p>{hasFollowUps ? "Aucun suivi pour ces filtres." : "Aucune startup en incubation"}</p>
      {hasFollowUps ? <Button variant="outline" size="sm" onClick={resetParams}>Réinitialiser les filtres</Button> : <p>Commencez par créer un suivi à partir d’une candidature acceptée.</p>}
      <Button variant="outline" size="sm" onClick={onCreate}>Créer un suivi</Button>
    </div>}
    {pagination && pagination.totalItems > 0 && <VigilancePagination pagination={pagination} onPageChange={page => setParams({ page })} />}
  </aside>;
}
