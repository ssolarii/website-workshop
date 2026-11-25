import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { generate, type SiteDocument } from "./model";
import { viewerDocument } from "./Canvas";
export type ScreenPayload = { site: SiteDocument; published: string };
export function SecondScreen({ session }: { session: string }) {
  const [data, setData] = useState<ScreenPayload | null>(null);
  const [qr, setQr] = useState("");
  const [panels, setPanels] = useState({ preview: true, html: true, qr: true });
  const [connected, setConnected] = useState(true);
  useEffect(() => {
    document.title = "Second screen · Website Workshop";
    const channel = new BroadcastChannel(session);
    let last = Date.now();
    channel.onmessage = (event) => {
      if (event.data?.type === "screen") {
        setData(event.data.data);
        last = Date.now();
        setConnected(true);
      }
    };
    const ping = () => {
      channel.postMessage({ type: "screen-ready" });
      setConnected(Date.now() - last < 10000);
    };
    ping();
    const timer = setInterval(ping, 3000);
    return () => {
      clearInterval(timer);
      channel.close();
    };
  }, [session]);
  useEffect(() => {
    let active = true;
    setQr("");
    if (data?.published)
      QRCode.toDataURL(data.published, {
        width: 480,
        margin: 4,
        errorCorrectionLevel: "M",
      })
        .then((url) => {
          if (active) setQr(url);
        })
        .catch(() => {});
    return () => {
      active = false;
    };
  }, [data?.published]);
  const code = data ? generate(data.site).html : "";
  return (
    <div className="second-screen">
      <header>
        <strong>{data?.site.title || "Second screen"}</strong>
        <nav aria-label="Visible panels">
          {(["preview", "html", "qr"] as const).map((key) => (
            <button
              key={key}
              aria-pressed={panels[key]}
              onClick={() => setPanels((p) => ({ ...p, [key]: !p[key] }))}
            >
              {key === "qr" ? "QR code" : key === "html" ? "HTML" : "Preview"}
            </button>
          ))}
        </nav>
      </header>
      {!connected && (
        <p role="status">
          Editor disconnected. Reopen Second screen from the editor to
          reconnect.
        </p>
      )}
      {!data ? (
        <p role="status">Waiting for the editor…</p>
      ) : (
        <main className="screen-panels">
          {panels.preview && (
            <section className="screen-preview">
              <h2>Preview</h2>
              <iframe
                title="Second screen preview"
                sandbox="allow-popups allow-popups-to-escape-sandbox"
                srcDoc={viewerDocument(data.site, true)}
              />
            </section>
          )}
          {panels.html && (
            <section className="screen-code">
              <h2>HTML</h2>
              <pre tabIndex={0}>{code}</pre>
            </section>
          )}
          {panels.qr && (
            <section className="screen-qr">
              <h2>Open this site</h2>
              {data.published ? (
                <>
                  <img
                    src={qr || undefined}
                    alt="QR code for the published site"
                  />
                  <a
                    href={data.published}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {data.published}
                  </a>
                </>
              ) : (
                <p>Publish the site to show its QR code.</p>
              )}
            </section>
          )}
        </main>
      )}
    </div>
  );
}
