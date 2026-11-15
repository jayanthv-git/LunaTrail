import { useEffect, useRef, useState } from "react";
import { X, Upload, ArrowUp, ArrowDown } from "lucide-react";
import { scenes } from "../../config/scenes";
import type { MediaConfig } from "../../config/scenes";
import { configFromFiles, saveMedia } from "../../lib/mediaStore";
export function MediaSettings({
  onClose,
  onApply,
}: {
  onClose: () => void;
  onApply: (c: MediaConfig | null) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<MediaConfig["mode"]>("storyboard");
  const [files, setFiles] = useState<File[]>([]);
  const [baked, setBaked] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  const valid =
    mode === "video"
      ? files.length === 1
      : mode === "storyboard"
        ? files.length === 8
        : files.length >= 2;
  async function apply() {
    setBusy(true);
    setError("");
    try {
      if (!valid) throw new Error("Select the required media files.");
      const value = { mode, files, heroHasText: baked };
      await saveMedia(value);
      onApply(configFromFiles(value));
      onClose();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to save media. Browser storage may be full.",
      );
    } finally {
      setBusy(false);
    }
  }
  function move(i: number, offset: number) {
    setFiles((list) => {
      const next = [...list];
      [next[i], next[i + offset]] = [next[i + offset], next[i]];
      return next;
    });
  }
  return (
    <dialog ref={ref} className="media-dialog" onCancel={onClose}>
      <div className="dialog-head">
        <div>
          <p className="eyebrow">MISSION ASSETS</p>
          <h2>Load the journey.</h2>
        </div>
        <button onClick={onClose} aria-label="Close media settings">
          <X size={20} />
        </button>
      </div>
      <p className="dialog-description">
        Use your original storyboard, a rendered frame sequence, or a seekable
        video. Files stay in this browser.
      </p>
      <label className="field-label">
        MEDIA FORMAT
        <select
          value={mode}
          onChange={(e) => {
            setMode(e.target.value as MediaConfig["mode"]);
            setFiles([]);
          }}
        >
          <option value="storyboard">8-scene storyboard</option>
          <option value="image-sequence">Rendered image sequence</option>
          <option value="video">Cinematic video</option>
        </select>
      </label>
      <label className="file-drop">
        <Upload size={20} />
        <span>
          {mode === "storyboard"
            ? "Choose all 8 original images"
            : mode === "video"
              ? "Choose cinematic video"
              : "Choose rendered frames in filename order"}
        </span>
        <input
          type="file"
          multiple={mode !== "video"}
          accept={mode === "video" ? "video/mp4,video/webm" : "image/*"}
          onChange={(e) => {
            const chosen = Array.from(e.target.files || []).sort((a, b) =>
              a.name.localeCompare(b.name, undefined, { numeric: true }),
            );
            const tooLarge =
              chosen.reduce((n, f) => n + f.size, 0) > 350 * 1024 * 1024;
            if (tooLarge) {
              setError(
                "Use media totaling less than 350 MB for this browser preview.",
              );
              return;
            }
            setError("");
            setFiles(chosen);
          }}
        />
      </label>
      {mode === "storyboard" && files.length > 0 && (
        <ol className="asset-order">
          {files.map((f, i) => (
            <li key={f.name + i}>
              <span>
                <b>{scenes[i]?.name || "Extra file"}</b>
                <small>{f.name}</small>
              </span>
              <div>
                <button
                  aria-label={`Move ${f.name} earlier`}
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  aria-label={`Move ${f.name} later`}
                  disabled={i === files.length - 1}
                  onClick={() => move(i, 1)}
                >
                  <ArrowDown size={14} />
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
      {files.length > 0 && (
        <p className="fine-print">
          {files.length} file{files.length !== 1 ? "s" : ""} selected
          {mode === "storyboard"
            ? " · Arrange to match the scene labels above."
            : ""}
        </p>
      )}
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={baked}
          onChange={(e) => setBaked(e.target.checked)}
        />
        Final frame includes the LunaTrail title and copy
      </label>
      <p className="fine-print">
        For the original final reference, leave this enabled to avoid duplicate
        text. For a clean background render, disable it.
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="dialog-actions">
        <button
          className="text-button"
          onClick={async () => {
            try {
              await saveMedia(null);
              onApply(null);
              onClose();
            } catch {
              setError("Could not clear browser storage.");
            }
          }}
        >
          Reset media
        </button>
        <button
          className="primary-button"
          disabled={!valid || busy}
          onClick={apply}
        >
          {busy ? "Preparing…" : "Apply media ↗"}
        </button>
      </div>
    </dialog>
  );
}
