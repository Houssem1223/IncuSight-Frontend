import Link from "next/link";
import { Rocket } from "lucide-react";
import { buttonVariants } from "@/src/components/ui/button";

const navItems = [
  { label: "Fonctionnalites", href: "#features" },
  { label: "Modules", href: "#modules" },
  { label: "A propos", href: "#about" },
  { label: "Contact", href: "#contact" },
];

export default function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link className="flex items-center gap-3" href="/#features">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Rocket className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-lg font-bold text-foreground">IncuSight</span>
            <span className="block text-xs text-muted-foreground">by MEDIANET</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
          {navItems.map((item) => (
            <a
              className="transition-colors hover:text-foreground"
              href={item.href}
              key={item.label}
            >
              {item.label}
            </a>
          ))}
          <Link
            className={buttonVariants({ variant: "outline", size: "sm" })}
            href="#contact"
          >
            Contact
          </Link>
        </nav>
      </div>
    </header>
  );
}
