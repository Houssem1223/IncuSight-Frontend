import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/src/components/ui/button";

export default function FinalCTASection() {
  return (
    <section className="bg-secondary py-20 text-secondary-foreground">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold lg:text-4xl">
          Pret a transformer votre incubateur ?
        </h2>
        <p className="mt-6 text-secondary-foreground/80">
          Rejoignez les incubateurs qui font confiance a IncuSight pour piloter leurs programmes et
          accompagner leurs startups vers le succes.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
          <Link className={buttonVariants({ size: "lg", className: "gap-2" })} href="#contact">
            Demander une demo
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            className={buttonVariants({
              size: "lg",
              variant: "outline",
              className: "border-secondary-foreground/20 text-secondary-foreground hover:bg-secondary-foreground/10",
            })}
            href="#contact"
          >
            Nous contacter
          </Link>
        </div>
      </div>
    </section>
  );
}
