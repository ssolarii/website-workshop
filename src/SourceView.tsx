import { useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpRight,
  Code2,
  Copy,
  Dock,
  PanelTop,
  X,
} from "lucide-react";
import Prism from "prismjs";
import type { CSSProperties } from "react";

export type SourcePayload = { html: string; css: string; selection: string };

type Props = {
  data: SourcePayload;
  mode?: "dock" | "float";
  setMode?: (mode: "dock" | "float") => void;
  popOut?: () => void;
  close?: () => void;
  download?: () => void;
};

function startGeometry() {
  try {
    const raw = JSON.parse(localStorage.getItem("source-geometry") || "{}");
    if (
      Number.isFinite(parseFloat(raw.left)) &&
      Number.isFinite(parseFloat(raw.top))
    ) {
      return {
        width: Math.min(
          Math.max(Number(raw.width) || 620, 260),
          window.innerWidth - 16,
        ),
        height: Math.min(
          Math.max(Number(raw.height) || 345, 180),
          window.innerHeight - 20,
        ),
        left: Math.max(
          8,
          Math.min(parseFloat(raw.left), window.innerWidth - 270),
        ),
        top: Math.max(
          8,
          Math.min(parseFloat(raw.top), window.innerHeight - 190),
        ),
        right: "auto",
        bottom: "auto",
      } as CSSProperties;
    }
  } catch {
    /* A fresh panel can use its default position. */
  }
  return undefined;
}

export function SourceView({
  data,
  mode,
  setMode,
  popOut,
  close,
  download,
}: Props) {
  const [tab, setTab] = useState<"html" | "css">(
    localStorage.getItem("source-tab") === "css" ? "css" : "html",
  );
  const [copied, setCopied] = useState("");
  const box = useRef<HTMLElement>(null);
  const code = useRef<HTMLPreElement>(null);
  const geometry = useRef(startGeometry());
  const text = data[tab];
  useEffect(() => {
    localStorage.setItem("source-tab", tab);
    setCopied("");
  }, [tab]);
  useEffect(() => {
    const area = code.current;
    const line = area?.querySelector<HTMLElement>(".code-selected");
    if (
      area &&
      line &&
      (line.offsetTop < area.scrollTop ||
        line.offsetTop + line.offsetHeight > area.scrollTop + area.clientHeight)
    ) {
      area.scrollTop = Math.max(0, line.offsetTop - area.clientHeight / 3);
    }
  }, [data.selection, tab]);
  useEffect(() => {
    const panel = box.current;
    if (mode !== "float" || !panel) return;
    function save() {
      if (!panel) return;
      const { left, top, width, height } = panel.getBoundingClientRect();
      localStorage.setItem(
        "source-geometry",
        JSON.stringify({ left, top, width, height }),
      );
    }
    const observer = new ResizeObserver(save);
    observer.observe(panel);
    panel.addEventListener("pointerup", save);
    return () => {
      observer.disconnect();
      panel.removeEventListener("pointerup", save);
    };
  }, [mode]);
  return (
    <section
      ref={box}
      className={"source-panel " + (mode ?? "source-standalone")}
      style={mode === "float" ? geometry.current : undefined}
      aria-label="Source View"
    >
      <header
        className="source-header"
        onPointerDown={(event) => {
          const panel = box.current;
          if (
            mode !== "float" ||
            !panel ||
            (event.target as HTMLElement).closest("button")
          )
            return;
          const target = event.currentTarget;
          const rect = panel.getBoundingClientRect();
          const from = { x: event.clientX, y: event.clientY };
          target.setPointerCapture(event.pointerId);
          function move(event: PointerEvent) {
            if (!panel) return;
            panel.style.left =
              Math.max(
                8,
                Math.min(
                  rect.left + event.clientX - from.x,
                  window.innerWidth - 90,
                ),
              ) + "px";
            panel.style.top =
              Math.max(
                8,
                Math.min(
                  rect.top + event.clientY - from.y,
                  window.innerHeight - 60,
                ),
              ) + "px";
            panel.style.right = "auto";
            panel.style.bottom = "auto";
          }
          target.addEventListener("pointermove", move);
          target.addEventListener(
            "lostpointercapture",
            () => target.removeEventListener("pointermove", move),
            { once: true },
          );
        }}
      >
        <strong>
          <Code2 size={17} />
          Source View
        </strong>
        <div className="source-tabs" aria-label="Source language">
          {(["html", "css"] as const).map((language) => (
            <button
              type="button"
              key={language}
              onClick={() => setTab(language)}
              aria-pressed={tab === language}
            >
              {language.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="source-actions">
          <button
            type="button"
            className="icon-button"
            title="Copy source"
            aria-label="Copy source"
            onClick={() =>
              navigator.clipboard
                .writeText(text)
                .then(() => setCopied("Copied"))
                .catch(() => setCopied("Copy unavailable"))
            }
          >
            <Copy size={16} />
          </button>
          {download && (
            <button
              type="button"
              className="icon-button source-download"
              title="Download HTML"
              aria-label="Download HTML"
              onClick={download}
            >
              <ArrowDownToLine size={16} />
            </button>
          )}
          {setMode && (
            <button
              type="button"
              className="icon-button"
              title={mode === "dock" ? "Float source" : "Dock source"}
              aria-label={mode === "dock" ? "Float source" : "Dock source"}
              onClick={() => {
                geometry.current = startGeometry();
                setMode(mode === "dock" ? "float" : "dock");
              }}
            >
              {mode === "dock" ? <PanelTop size={16} /> : <Dock size={16} />}
            </button>
          )}
          {popOut && (
            <button
              type="button"
              className="icon-button"
              title="Pop out source"
              aria-label="Pop out source"
              onClick={popOut}
            >
              <ArrowUpRight size={17} />
            </button>
          )}
          {close && (
            <button
              type="button"
              className="icon-button"
              title="Close source"
              aria-label="Close source"
              onClick={close}
            >
              <X size={17} />
            </button>
          )}
        </div>
      </header>
      {copied && (
        <span role="status" className="copy-feedback">
          {copied}
        </span>
      )}
      <pre ref={code} tabIndex={0} aria-label={tab.toUpperCase() + " source"}>
        {text.split("\n").map((line, index) => (
          <span
            className={
              "code-line" +
              (data.selection && line.includes(data.selection)
                ? " code-selected"
                : "")
            }
            key={index}
          >
            <span className="line-number" aria-hidden="true">
              {index + 1}
            </span>
            <code
              dangerouslySetInnerHTML={{
                __html: Prism.highlight(
                  line,
                  Prism.languages[tab === "html" ? "markup" : "css"],
                  tab,
                ),
              }}
            />
          </span>
        ))}
      </pre>
    </section>
  );
}

export function SourceWindow({ session }: { session: string }) {
  const [data, setData] = useState<SourcePayload>();
  useEffect(() => {
    document.title = "Source View · Website Workshop";
    const channel = new BroadcastChannel(session);
    channel.onmessage = (event) => {
      if (event.data?.type === "source") setData(event.data.data);
    };
    channel.postMessage({ type: "ready" });
    return () => channel.close();
  }, [session]);
  return data ? (
    <SourceView data={data} />
  ) : (
    <p className="connection-text" role="status">
      Waiting for the editor…
    </p>
  );
}
