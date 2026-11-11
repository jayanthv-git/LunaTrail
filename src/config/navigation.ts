export const navigation = [
  { label: "Overview", href: "#overview" },
  { label: "Technology", href: "#technology" },
  { label: "Workflow", href: "#workflow" },
  { label: "Results", href: "#results" },
];
export function navigate(id: string) {
  document
    .querySelector(id)
    ?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
}
