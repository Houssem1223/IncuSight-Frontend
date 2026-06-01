import { BarChart3, TrendingUp, Users } from "lucide-react";
import { Card, CardContent } from "@/src/components/ui/card";

const missionHighlights = [
  {
    label: "Parcours",
    value: "Candidature au suivi",
  },
  {
    label: "Vision",
    value: "Innovation responsable",
  },
  {
    label: "Pilotage",
    value: "Data et gouvernance",
  },
];

const missionValues = [
  {
    title: "Accompagnement structure",
    description:
      "Cadrez les interactions entre equipe incubateur, experts et startups avec des parcours homogenes.",
    icon: Users,
  },
  {
    title: "Evaluation transparente",
    description:
      "Consolidez les retours, les scores et les decisions dans un espace unique, lisible et auditable.",
    icon: BarChart3,
  },
  {
    title: "Suivi operationnel",
    description:
      "Pilotez les programmes, les candidatures et les evolutions startup avec des indicateurs actionnables.",
    icon: TrendingUp,
  },
];

export default function MissionSection() {
  return (
    <section className="bg-secondary py-20 text-secondary-foreground">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div className="space-y-6">
          <p className="text-xs font-medium uppercase tracking-wider text-[#F97316]">Notre mission</p>
          <h2 className="text-3xl font-bold text-balance lg:text-4xl">
            L&apos;incubateur, version produit SaaS
          </h2>
          <p className="leading-relaxed text-secondary-foreground/80">
            Notre approche combine exigence institutionnelle et execution produit. Chaque programme
            suit un cadre clair: objectifs, jalons, comites d&apos;evaluation, recommandations
            d&apos;experts et reporting continu pour les equipes dirigeantes.
          </p>

          <div className="grid grid-cols-3 gap-4 pt-4">
            {missionHighlights.map((item) => (
              <Card
                className="border-white/10 bg-white/10"
                key={item.label}
              >
                <CardContent className="p-4 text-center">
                  <p className="mb-1 text-xs uppercase tracking-wider text-[#F97316]">
                    {item.label}
                  </p>
                  <p className="font-semibold text-white">{item.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {missionValues.map((value) => {
            const Icon = value.icon;

            return (
              <Card
                className="border-white/10 bg-white/10"
                key={value.title}
              >
                <CardContent className="flex gap-4 p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F97316]/20 text-[#F97316]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="mb-1 font-semibold text-white">{value.title}</h3>
                    <p className="text-sm text-white/70">{value.description}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
