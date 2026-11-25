import { useEffect, useRef } from "react";
import { generate, type SiteDocument } from "./model";
import canvasScript from "./canvas-bridge.js?raw";
import faces from "./type.css?raw";

const editorCss = `
section[data-node] { position: relative; outline: 1px dashed #d8dfe6; outline-offset: -1px; }
section[data-selected] { outline: 2px solid #245bb4; outline-offset: -2px; }
[data-node]:not(section) { cursor: pointer; }
[data-node][contenteditable] { cursor: text; }
[data-node]:not(section)[data-selected] { outline: 2px solid #245bb4; outline-offset: 4px; }
[data-node]:focus-visible, button:focus-visible { outline: 2px solid #245bb4; outline-offset: 4px; }
[contenteditable]:not(:focus) { min-height: 1em; }
.image-placeholder:hover { outline: 1px solid #6689bc; }
.add-content { display: inline-flex; gap: 8px; align-items: center; justify-self: center; background: #fff; color: #234f8c; padding: 10px 14px; border: 1px solid #bdcbdc; border-radius: 5px; cursor: pointer; font: inherit; }
.add-content:hover { background: #eef4fc; }
.canvas-insert { display: grid; place-items: center; padding: 26px; background: #fff; }
`;
const editorDocument =
  '<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Website canvas</title><style>' +
  faces +
  '</style><style id="page-style"></style><style>' +
  editorCss +
  '</style></head><body><div id="page"><main></main></div><div class="canvas-insert"><button class="add-content" data-action="insert" type="button">＋ Add section</button></div><script>' +
  canvasScript +
  "</script></body></html>";
export function viewerDocument(site: SiteDocument, inFrame = false) {
  return generate(site).document.replace(
    "</head>",
    () =>
      (inFrame ? '<base href="about:srcdoc">' : "") +
      "<style>" +
      faces +
      "</style></head>",
  );
}

export type CanvasMessage =
  | { type: "select"; id: string; openFormat?: boolean }
  | { type: "text"; id: string; text: string }
  | { type: "text-end" }
  | { type: "drop"; from: string; to: string }
  | { type: "insert"; sectionId?: string };

export function Canvas({
  site,
  preview,
  selection,
  scrollTo,
  onMessage,
}: {
  site: SiteDocument;
  preview: boolean;
  selection: string;
  scrollTo: string;
  onMessage: (event: CanvasMessage) => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const page = generate(site, true);
  const data = {
    type: "render",
    html: page.html,
    css: page.css,
    title: site.title,
    selection,
    scrollTo,
  };
  const current = useRef(data);
  const listener = useRef(onMessage);
  useEffect(() => {
    current.current = data;
    listener.current = onMessage;
    if (!preview) frame.current?.contentWindow?.postMessage(data, "*");
  }, [
    page.html,
    page.css,
    site.title,
    selection,
    scrollTo,
    preview,
    onMessage,
  ]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (
        event.source !== frame.current?.contentWindow ||
        !event.data?.workshop
      )
        return;
      if (event.data.type === "ready")
        frame.current?.contentWindow?.postMessage(current.current, "*");
      else listener.current(event.data as CanvasMessage);
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, []);
  return (
    <iframe
      key={preview ? "preview" : "edit"}
      ref={frame}
      title={preview ? "Website preview" : "Website canvas"}
      sandbox={
        preview
          ? "allow-popups allow-popups-to-escape-sandbox"
          : "allow-scripts"
      }
      srcDoc={preview ? viewerDocument(site, true) : editorDocument}
    />
  );
}
