import { useEffect } from "react";
import type { RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { clamp, motion, scenes, sceneOpacity } from "../config/scenes";
gsap.registerPlugin(ScrollTrigger);
export function useScrollTimeline(
  root: RefObject<HTMLElement | null>,
  ready: boolean,
  reduced: boolean,
  draw: (p: number) => void,
) {
  useEffect(() => {
    const el = root.current;
    if (!el || !ready || reduced) return;
    const overlays = el.querySelectorAll<HTMLElement>("[data-scene]");
    const links = el.querySelectorAll<HTMLButtonElement>("[data-chapter]");
    const progress = el.querySelector<HTMLElement>(".journey-progress i");
    const nav = el.querySelector<HTMLElement>(".hero-nav");
    const caption = el.querySelector<HTMLElement>(".chapter-current");
    const state = { p: 0 };
    let lastIndex = -1;
    const render = () => {
      const p = clamp(state.p / (1 - motion.hold));
      draw(p);
      const enter = el.querySelector<HTMLElement>(".enter-lunatrail");
      if (enter) { const show=p>=.995; enter.classList.toggle("ready",show); enter.tabIndex=show?0:-1; enter.setAttribute("aria-hidden",String(!show)); }
      overlays.forEach((overlay, i) => {
        const opacity = sceneOpacity(p, i);
        overlay.style.opacity = String(opacity);
        overlay.style.visibility = opacity > 0 ? "visible" : "hidden";
        overlay.style.transform = `translateY(${(1 - opacity) * 18}px)`;
        overlay.setAttribute("aria-hidden", String(opacity < 0.5));
      });
      const index =
        p >= 1
          ? 7
          : Math.max(
              0,
              scenes.findIndex((s) => p < s.end),
            );
      if (index !== lastIndex) {
        links.forEach((link, i) => {
          link.classList.toggle("active", i === index);
          if (i === index) link.setAttribute("aria-current", "step");
          else link.removeAttribute("aria-current");
        });
        if (caption)
          caption.textContent = `0${index + 1} / ${scenes[index].name}`;
        lastIndex = index;
      }
      if (progress) progress.style.transform = `scaleX(${p})`;
      if (nav)
        nav.style.setProperty(
          "--nav-opacity",
          String(0.18 + 0.82 * clamp((p - 0.45) / 0.5)),
        );
    };
    const timeline = gsap.to(state, {
      p: 1,
      ease: "none",
      onUpdate: render,
      scrollTrigger: {
        trigger: el,
        start: "top top",
        end: "bottom bottom",
        scrub: motion.scrub,
        invalidateOnRefresh: true,
        onRefresh: render,
      },
    });
    render();
    const onJump = (event: Event) => {
      const i = (event as CustomEvent<number>).detail;
      const trigger = timeline.scrollTrigger;
      if (trigger)
        window.scrollTo({
          top:
            trigger.start +
            (trigger.end - trigger.start) *
              (scenes[i].start + (scenes[i].end - scenes[i].start) * 0.42) *
              (1 - motion.hold),
          behavior: "smooth",
        });
    };
    el.addEventListener("chapter-jump", onJump);
    ScrollTrigger.refresh();
    if (timeline.scrollTrigger)
      timeline.progress(timeline.scrollTrigger.progress);
    return () => {
      el.removeEventListener("chapter-jump", onJump);
      timeline.scrollTrigger?.kill();
      timeline.kill();
    };
  }, [root, ready, reduced, draw]);
}
