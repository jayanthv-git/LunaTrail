import { useEffect, useState } from "react";
export function useMediaPreloader(sources: string[]) {
  const [state, setState] = useState<{
    images: (HTMLImageElement | null)[];
    progress: number;
    ready: boolean;
  }>({ images: [], progress: 0, ready: false });
  useEffect(() => {
    let cancelled = false;
    let completed = 0;
    setState({
      images: [],
      progress: sources.length ? 0 : 100,
      ready: sources.length === 0,
    });
    const images: (HTMLImageElement | null)[] = Array(sources.length).fill(
      null,
    );
    let next = 0;
    async function worker() {
      while (next < sources.length) {
        const i = next++;
        const image = new Image();
        const ok = await new Promise<boolean>((resolve) => {
          const timer = setTimeout(() => resolve(false), 15000);
          image.onload = () => {
            clearTimeout(timer);
            resolve(true);
          };
          image.onerror = () => {
            clearTimeout(timer);
            resolve(false);
          };
          image.src = sources[i];
        });
        if (cancelled) return;
        if (ok) {
          await image.decode().catch(() => {});
          images[i] = image;
        }
        completed++;
        setState({
          images: [...images],
          progress: Math.round((completed / sources.length) * 100),
          ready: completed === sources.length,
        });
      }
    }
    void Promise.all(
      Array.from({ length: Math.min(6, sources.length) }, worker),
    );
    return () => {
      cancelled = true;
    };
  }, [sources]);
  return state;
}
