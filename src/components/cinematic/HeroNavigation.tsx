import { ArrowUpRight } from "lucide-react";
import { navigation, navigate } from "../../config/navigation";
import { Logo } from "../ui/Logo";
export function HeroNavigation() {
  return (
    <header className="hero-nav">
      <a
        className="brand"
        href="#overview"
        onClick={(e) => {
          e.preventDefault();
          navigate("#overview");
        }}
        aria-label="LunaTrail overview"
      >
        <Logo />
        <span>LUNATRAIL</span>
      </a>
      <nav aria-label="Main navigation">
        {navigation.map((n) => (
          <a
            key={n.href}
            href={n.href}
            onClick={(e) => {
              e.preventDefault();
              navigate(n.href);
            }}
          >
            {n.label}
          </a>
        ))}
      </nav>
      <a
        className="mission-cta"
        href="#system"
        onClick={(e) => {
          e.preventDefault();
          navigate("#system");
        }}
      >
        Initialize mission <ArrowUpRight size={14} />
      </a>
    </header>
  );
}
