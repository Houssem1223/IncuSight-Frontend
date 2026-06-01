import { Briefcase, Building2, CheckCircle2, GraduationCap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";

const roles = [
  {
    title: "Equipe Incubateur",
    icon: Briefcase,
    features: [
      "Vue consolidee des programmes",
      "Gestion des cohortes",
      "Reporting automatise",
      "Communication centralisee",
    ],
  },
  {
    title: "Experts & Evaluateurs",
    icon: GraduationCap,
    features: [
      "Interface de notation intuitive",
      "Acces aux dossiers",
      "Historique des evaluations",
      "Recommandations structurees",
    ],
  },
  {
    title: "Startups",
    icon: Building2,
    features: [
      "Suivi de candidature en temps reel",
      "Tableau de bord personnalise",
      "Acces aux ressources",
      "Communication directe",
    ],
  },
];

export default function WhyChooseSection() {
  return (
    <section className="py-20" id="about">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-primary">Pour qui ?</p>
          <h2 className="text-3xl font-bold text-foreground lg:text-4xl">
            Une solution adaptee a chaque acteur
          </h2>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {roles.map((role) => {
            const Icon = role.icon;

            return (
              <Card className="border-border/50 transition-shadow hover:shadow-lg" key={role.title}>
                <CardHeader className="pb-4 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="h-8 w-8" />
                  </div>
                  <CardTitle>{role.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {role.features.map((feature) => (
                      <li className="flex items-center gap-2 text-sm text-muted-foreground" key={feature}>
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
