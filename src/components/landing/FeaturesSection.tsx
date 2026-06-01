import {
  BarChart3,
  FileText,
  Rocket,
  Shield,
  Target,
  Users,
} from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";

const moduleCards = [
  {
    title: "Intake",
    subtitle: "Gestion des candidatures",
    description: "Formulaires dynamiques, collecte documents, scoring automatique.",
    icon: FileText,
    color: "primary",
  },
  {
    title: "Review",
    subtitle: "Comites d evaluation",
    description: "Notation multi-criteres, workflow de validation, historique decisions.",
    icon: Users,
    color: "secondary",
  },
  {
    title: "Tracking",
    subtitle: "Suivi des startups",
    description: "KPIs, jalons, alertes, reporting pour chaque startup incubee.",
    icon: Rocket,
    color: "accent",
  },
  {
    title: "Insights",
    subtitle: "Analytics & BI",
    description: "Tableaux de bord, metriques agregees, export pour stakeholders.",
    icon: BarChart3,
    color: "primary",
  },
  {
    title: "Programs",
    subtitle: "Configuration",
    description: "Creation de cohortes, parametrage des phases et criteres.",
    icon: Target,
    color: "secondary",
  },
  {
    title: "Admin",
    subtitle: "Gouvernance",
    description: "Gestion des roles, audit trail, parametres de securite.",
    icon: Shield,
    color: "accent",
  },
];

const colorClasses: Record<string, string> = {
  primary: "bg-primary/10 text-primary border-primary/20",
  secondary: "bg-secondary/40 text-foreground border-secondary",
  accent: "bg-accent/20 text-accent-foreground border-accent/30",
};

export default function FeaturesSection() {
  return (
    <section className="py-20" id="modules">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-primary">
            Ce que nous offrons
          </p>
          <h2 className="text-3xl font-bold text-balance text-foreground lg:text-4xl">
            Une plateforme complete pour piloter l&apos;incubation de bout en bout.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Chaque module est concu pour fluidifier les operations incubateur et renforcer la
            qualite d&apos;accompagnement des entrepreneurs.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {moduleCards.map((card) => {
            const Icon = card.icon;

            return (
              <Card className="group border-border/50 transition-shadow hover:shadow-lg" key={card.title}>
                <CardHeader className="pb-3">
                  <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl border ${colorClasses[card.color]}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <Badge className="w-fit border-border bg-transparent text-xs text-muted-foreground">
                    {card.title}
                  </Badge>
                  <CardTitle className="text-lg">{card.subtitle}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{card.description}</p>
                  <div className="mt-4 flex items-center gap-1 text-sm text-primary transition-all group-hover:gap-2">
                    <span>En savoir plus</span>
                    <span aria-hidden="true">→</span>
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
