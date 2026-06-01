import { Rocket } from "lucide-react";

const footerLinks = [
  { label: "Mentions legales", href: "#" },
  { label: "Politique de confidentialite", href: "#" },
  { label: "Contact", href: "#contact" },
];

export default function FooterSection() {
  return (
    <footer className="border-t border-border bg-card py-12" id="contact">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 px-4 text-center sm:px-6 md:flex-row md:text-left lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Rocket className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-lg font-bold text-foreground">IncuSight</span>
            <span className="block text-xs text-muted-foreground">by MEDIANET</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
          {footerLinks.map((link) => (
            <a className="transition-colors hover:text-foreground" href={link.href} key={link.label}>
              {link.label}
            </a>
          ))}
        </div>

        <p className="text-sm text-muted-foreground">2026 MEDIANET. Tous droits reserves.</p>
      </div>
    </footer>
  );
}
