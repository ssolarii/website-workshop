import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { get, keys, set, setMany } from "idb-keyval";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowUpRight,
  Check,
  Clipboard,
  Code2,
  FilePlus2,
  FolderOpen,
  Globe,
  LayoutPanelTop,
  Monitor,
  MoreHorizontal,
  Plus,
  Redo2,
  Settings2,
  Smartphone,
  Undo2,
  X,
} from "lucide-react";
import { Canvas, viewerDocument, type CanvasMessage } from "./Canvas";
import { Inspector, type Panel } from "./Inspector";
import { SourceView, SourceWindow, type SourcePayload } from "./SourceView";
import { compress, portableGalleryUrl, resolveGalleryUrl } from "./images";
import {
  template,
  templates,
  section,
  element,
  generate,
  id,
  type SiteDocument,
  type Element,
  type ElementKind,
  type Section,
  type SectionLayout,
} from "./model";
import * as cloud from "./cloud";
import "./style.css";

function IconButton({
  label,
  children,
  onClick,
  disabled,
  pressed,
  className = "",
}: {
  label: string;
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={"icon-button " + className}
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
    >
      {children}
    </button>
  );
}

function SiteDialog({
  label,
  children,
  close,
}: {
  label: string;
  children: ReactNode;
  close: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = dialog.current;
    el?.showModal();
    return () => el?.close();
  }, []);
  return (
    <dialog
      className="site-dialog"
      ref={dialog}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      aria-label={label}
    >
      <div className="dialog-inner">
        <div className="dialog-title">
          <h2>{label}</h2>
          <IconButton label="Close" onClick={close}>
            <X size={19} />
          </IconButton>
        </div>
        {children}
      </div>
    </dialog>
  );
}

function Templates({
  choose,
  library,
}: {
  choose: (name: string) => void;
  library: () => void;
}) {
  return (
    <div className="starter">
      <header className="topbar starter-bar">
        <div className="brand">
          <span className="app-mark">
            <LayoutPanelTop size={19} />
          </span>
          <strong>Website Workshop</strong>
        </div>
        <button className="quiet-button" type="button" onClick={library}>
          <FolderOpen size={17} />
          My sites
        </button>
      </header>
      <main className="starter-main">
        <h1>Start a new site</h1>
        <div className="templates">
          {templates.map((name) => (
            <button
              className="template"
              key={name}
              onClick={() => choose(name)}
              type="button"
            >
              <div
                className={"template-preview template-" + name.toLowerCase()}
                aria-hidden="true"
              >
                <div className="mini-page">
                  {name === "Blank" ? (
                    <Plus size={29} />
                  ) : (
                    <>
                      <div className="mini-banner">
                        {name === "Personal"
                          ? "Your name"
                          : name === "Portfolio"
                            ? "Your portfolio"
                            : "Event title"}
                      </div>
                      <div className="mini-body">
                        <img
                          alt=""
                          src={resolveGalleryUrl(
                            "gallery:" +
                              (name === "Personal"
                                ? "profile"
                                : name === "Portfolio"
                                  ? "architecture"
                                  : "event") +
                              ".webp",
                          )}
                        />
                        <div>
                          <i />
                          <i />
                          <i />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <span>{name}</span>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}

function Editor() {
  const [site, setSite] = useState<SiteDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<{
    past: SiteDocument[];
    future: SiteDocument[];
  }>({ past: [], future: [] });
  const [selection, setSelection] = useState("");
  const [scrollTo, setScrollTo] = useState("");
  const [panel, setPanel] = useState<Panel>("insert");
  const [toolsOpen, setToolsOpen] = useState(false);
  const [formatEntry, setFormatEntry] = useState(0);
  const [preview, setPreview] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [source, setSource] = useState(
    localStorage.getItem("source") === "true",
  );
  const [sourceMode, setSourceMode] = useState<"dock" | "float">(
    localStorage.getItem("mode") === "float" ? "float" : "dock",
  );
  const [status, setStatus] = useState("");
  const [syncError, setSyncError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sites, setSites] = useState<{ draft: SiteDocument; cloud: boolean }[]>(
    [],
  );
  const [dialog, setDialog] = useState<"sites" | "publish" | null>(null);
  const [dialogError, setDialogError] = useState("");
  const [published, setPublished] = useState("");
  const [menu, setMenu] = useState(false);
  const menuRoot = useRef<HTMLDivElement>(null);
  const current = useRef<SiteDocument | null>(null);
  const editGroup = useRef("");
  const session = useRef(id());
  const channel = useRef<BroadcastChannel | null>(null);
  const sourcePayload = useRef<SourcePayload | null>(null);

  useEffect(() => {
    get<SiteDocument>("draft")
      .then((draft) => {
        if (draft?.version === 1) {
          current.current = draft;
          setSite(draft);
        }
      })
      .catch(() => setStatus("Local drafts unavailable"))
      .finally(() => setLoading(false));
    const peer = new BroadcastChannel(session.current);
    channel.current = peer;
    peer.onmessage = (event) => {
      if (event.data?.type === "ready" && sourcePayload.current)
        peer.postMessage({ type: "source", data: sourcePayload.current });
    };
    return () => peer.close();
  }, []);

  useEffect(() => {
    if (!site) return;
    document.title = site.title.trim()
      ? site.title + " · Website Workshop"
      : "Website Workshop";
    let active = true;
    const save = setTimeout(() => {
      if (!cloud.configured) return;
      cloud
        .save(site)
        .then(() => {
          if (active) {
            setStatus("Saved");
            setSyncError(false);
          }
        })
        .catch(() => {
          if (active) {
            setStatus("Saved on this device");
            setSyncError(true);
          }
        });
    }, 650);
    return () => {
      active = false;
      clearTimeout(save);
    };
  }, [site]);
  useEffect(() => {
    localStorage.setItem("source", String(source));
  }, [source]);
  useEffect(() => {
    localStorage.setItem("mode", sourceMode);
  }, [sourceMode]);
  useEffect(() => {
    const siteId = site?.id;
    if (!siteId) {
      setPublished("");
      return;
    }
    const saved = localStorage.getItem("published:" + siteId);
    const prior = localStorage.getItem("published-link");
    setPublished(saved || (prior?.endsWith("#" + siteId) ? prior : ""));
  }, [site?.id]);
  useEffect(() => {
    if (!menu) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (!menuRoot.current?.contains(event.target as Node)) setMenu(false);
    };
    document.addEventListener("pointerdown", closeOnOutside);
    return () => document.removeEventListener("pointerdown", closeOnOutside);
  }, [menu]);

  const generated = useMemo(() => (site ? generate(site) : null), [site]);
  useEffect(() => {
    sourcePayload.current = generated && {
      html: generated.html,
      css: generated.css,
      selection,
    };
    if (sourcePayload.current)
      channel.current?.postMessage({
        type: "source",
        data: sourcePayload.current,
      });
  }, [generated, selection]);

  function saveLocal(next: SiteDocument) {
    setMany([
      ["draft", next],
      ["site:" + next.id, next],
    ])
      .then(() => {
        if (current.current === next)
          setStatus(cloud.configured ? "Saving…" : "Saved on this device");
      })
      .catch(() => setStatus("Could not save on this device"));
  }
  function openDraft(draft: SiteDocument) {
    current.current = draft;
    setSite(draft);
    setHistory({ past: [], future: [] });
    editGroup.current = "";
    setSelection("");
    setPanel("insert");
    setPreview(false);
    setDialog(null);
    saveLocal(draft);
  }
  function edit(transform: (next: SiteDocument) => boolean, group = "") {
    const old = current.current;
    if (!old) return;
    const next = structuredClone(old);
    if (!transform(next)) return;
    if (!group || editGroup.current !== group) {
      setHistory((history) => ({
        past: [...history.past, old].slice(-35),
        future: [],
      }));
    }
    editGroup.current = group;
    current.current = next;
    setSite(next);
    saveLocal(next);
  }
  function historyAction(direction: "undo" | "redo") {
    const old = current.current;
    if (!old) return;
    const next = direction === "undo" ? history.past.at(-1) : history.future[0];
    if (!next) return;
    setHistory(
      direction === "undo"
        ? { past: history.past.slice(0, -1), future: [old, ...history.future] }
        : { past: [...history.past, old], future: history.future.slice(1) },
    );
    editGroup.current = "";
    current.current = next;
    setSite(next);
    saveLocal(next);
  }

  const selected = site?.sections
    .flatMap(({ elements }) => elements)
    .find(({ id }) => id === selection);
  const selectedSection = site?.sections.find(
    (section) =>
      section.id === selection ||
      section.elements.some(({ id }) => id === selection),
  );
  const select = (node: string, bringIntoView = false) => {
    setSelection(node);
    if (bringIntoView) setScrollTo(id());
  };
  function patchAt(target: string, values: Partial<Element>) {
    edit((draft) => {
      const match = draft.sections
        .flatMap(({ elements }) => elements)
        .find(({ id }) => id === target);
      if (!match) return false;
      Object.assign(match, values);
      if (values.imageRef === undefined && Object.hasOwn(values, "imageRef"))
        delete match.imageRef;
      return true;
    });
  }
  function patchSection(values: Partial<Section>) {
    edit((draft) => {
      const match = draft.sections.find(({ id }) => id === selectedSection?.id);
      if (!match) return false;
      Object.assign(match, values);
      return true;
    });
  }
  function addSection(layout: SectionLayout) {
    const added = section(layout);
    edit((draft) => {
      const at = draft.sections.findIndex(
        ({ id }) => id === selectedSection?.id,
      );
      draft.sections.splice(at < 0 ? draft.sections.length : at + 1, 0, added);
      return true;
    });
    select(added.id, true);
    setToolsOpen(false);
  }
  function insert(kind: ElementKind) {
    const added = element(kind);
    edit((draft) => {
      const active =
        draft.sections.find(({ id }) => id === selectedSection?.id) ??
        draft.sections.at(-1);
      if (!active || active.banner) {
        const next = { ...section(), elements: [added] };
        const index = active
          ? draft.sections.indexOf(active) + 1
          : draft.sections.length;
        draft.sections.splice(index, 0, next);
      } else {
        const at = active.elements.findIndex(({ id }) => id === selection);
        active.elements.splice(
          at < 0 ? active.elements.length : at + 1,
          0,
          added,
        );
      }
      return true;
    });
    select(added.id, true);
    if (kind === "image") {
      setPanel("format");
      setFormatEntry((n) => n + 1);
      setToolsOpen(true);
    } else setToolsOpen(false);
  }
  function reorder(from: string, to: string) {
    if (!from || !to || from === to) return;
    edit((draft) => {
      const source = draft.sections.find((section) => section.id === from);
      const target = draft.sections.findIndex(
        (section) =>
          section.id === to || section.elements.some(({ id }) => id === to),
      );
      if (target < 0) return false;
      if (source) {
        if (draft.sections.indexOf(source) === target) return false;
        draft.sections.splice(draft.sections.indexOf(source), 1);
        draft.sections.splice(target, 0, source);
        return true;
      }
      const parent = draft.sections.find(({ elements }) =>
        elements.some(({ id }) => id === from),
      );
      if (!parent) return false;
      const targetElements = draft.sections[target].elements;
      const targetIndex = targetElements.findIndex(({ id }) => id === to);
      const [item] = parent.elements.splice(
        parent.elements.findIndex(({ id }) => id === from),
        1,
      );
      targetElements.splice(
        targetIndex < 0 ? targetElements.length : targetIndex,
        0,
        item,
      );
      return true;
    });
  }
  function move(delta: number) {
    if (!site || !selectedSection) return;
    const collection = selected ? selectedSection.elements : site.sections;
    const at = collection.findIndex(({ id }) => id === selection);
    reorder(selection, collection[at + delta]?.id ?? "");
    setScrollTo(id());
  }
  function duplicate() {
    if (!selectedSection) return;
    const newId = id();
    edit((draft) => {
      const index = draft.sections.findIndex(
        ({ id }) => id === selectedSection.id,
      );
      const current = draft.sections[index];
      if (!current) return false;
      if (selected) {
        current.elements.splice(
          current.elements.findIndex(({ id }) => id === selected.id) + 1,
          0,
          { ...selected, id: newId },
        );
      } else {
        draft.sections.splice(index + 1, 0, {
          ...current,
          id: newId,
          elements: current.elements.map((item) => ({ ...item, id: id() })),
        });
      }
      return true;
    });
    select(newId, true);
  }
  function remove() {
    if (!selectedSection) return;
    edit((draft) => {
      if (selected) {
        const section = draft.sections.find(
          ({ id }) => id === selectedSection.id,
        );
        if (section)
          section.elements = section.elements.filter(
            ({ id }) => id !== selected.id,
          );
      } else
        draft.sections = draft.sections.filter(
          ({ id }) => id !== selectedSection.id,
        );
      return true;
    });
    select(selected ? selectedSection.id : "");
  }

  function onCanvas(event: CanvasMessage) {
    if (event.type === "select") {
      select(event.id);
      if (event.openFormat) {
        setFormatEntry((n) => n + 1);
        setPanel("format");
        setToolsOpen(true);
      }
    } else if (event.type === "text") {
      const target = event.id;
      edit((draft) => {
        const item = draft.sections
          .flatMap(({ elements }) => elements)
          .find(({ id }) => id === target);
        if (!item || item.text === event.text) return false;
        item.text = event.text;
        return true;
      }, "text:" + target);
    } else if (event.type === "text-end") editGroup.current = "";
    else if (event.type === "drop") reorder(event.from, event.to);
    else if (event.type === "insert") {
      if (!event.sectionId) {
        addSection("stack");
        return;
      }
      select(event.sectionId);
      setPanel("insert");
      setToolsOpen(true);
      setTimeout(
        () =>
          document.querySelector<HTMLElement>(".element-grid button")?.focus(),
        0,
      );
    }
  }
  async function upload(file: File) {
    if (!selected || !site) return;
    const siteId = site.id;
    const target = selected.id;
    const count = site.sections
      .flatMap(({ elements }) => elements)
      .filter(
        (item) =>
          item.id !== target &&
          item.type === "image" &&
          item.src.startsWith("data:image/"),
      ).length;
    if (count >= 10) {
      setStatus("Maximum ten uploaded images per site");
      return;
    }
    setUploading(true);
    try {
      const src = await compress(file);
      if (current.current?.id === siteId)
        patchAt(target, { src, alt: selected.alt, imageRef: undefined });
    } catch {
      setStatus("Could not add this image. Try a JPEG, PNG, or WebP.");
    } finally {
      setUploading(false);
    }
  }
  async function download() {
    if (!site) return;
    const copy = structuredClone(site);
    await Promise.all(
      copy.sections
        .flatMap(({ elements }) => elements)
        .map(async (item) => {
          const source = resolveGalleryUrl(portableGalleryUrl(item.src));
          if (!source) return;
          try {
            const response = await fetch(source);
            if (!response.ok) return;
            const blob = await response.blob();
            if (
              !["image/webp", "image/jpeg", "image/png"].includes(blob.type)
            ) {
              item.src = source;
              return;
            }
            item.src = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(String(reader.result));
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          } catch {
            item.src = source;
          }
        }),
    );
    const url = URL.createObjectURL(
      new Blob([viewerDocument(copy)], { type: "text/html" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download =
      (copy.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "website") + ".html";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function showSites() {
    setMenu(false);
    setDialogError("");
    setDialog("sites");
    setBusy(true);
    try {
      const localKeys = (await keys()).filter(
        (key) => typeof key === "string" && key.startsWith("site:"),
      );
      const locals = (
        await Promise.all(localKeys.map((key) => get<SiteDocument>(key)))
      ).filter((draft): draft is SiteDocument => Boolean(draft));
      if (
        current.current &&
        !locals.some(({ id }) => id === current.current?.id)
      )
        locals.push(current.current);
      const entries = locals.map((draft) => ({ draft, cloud: false }));
      setSites(entries);
      if (cloud.configured) {
        try {
          const remote = await cloud.drafts();
          setSites([
            ...entries,
            ...remote
              .filter((draft) => !locals.some(({ id }) => id === draft.id))
              .map((draft) => ({ draft, cloud: true })),
          ]);
        } catch {
          setDialogError("Cloud drafts are unavailable.");
        }
      }
    } catch {
      setDialogError("Could not open saved sites.");
    } finally {
      setBusy(false);
    }
  }
  function newSite() {
    setMenu(false);
    setDialog(null);
    setSite(null);
    current.current = null;
    set("draft", null);
    setStatus("");
    setPreview(false);
    setToolsOpen(false);
  }
  async function publish() {
    const draft = current.current;
    if (!draft) return;
    setBusy(true);
    setDialogError("");
    try {
      const url = await cloud.publish(draft);
      localStorage.setItem("published:" + draft.id, url);
      setPublished(url);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      setDialogError(
        message.startsWith("Firebase:") || !message
          ? "Could not publish. Check your connection and try again."
          : message,
      );
    } finally {
      setBusy(false);
    }
  }
  async function unpublish() {
    if (!site) return;
    setBusy(true);
    setDialogError("");
    try {
      await cloud.unpublish(site.id);
      localStorage.removeItem("published:" + site.id);
      if (localStorage.getItem("published-link") === published)
        localStorage.removeItem("published-link");
      setPublished("");
    } catch {
      setDialogError("Could not unpublish. Try again.");
    } finally {
      setBusy(false);
    }
  }
  const libraryDialog = dialog === "sites" && (
    <SiteDialog label="My sites" close={() => setDialog(null)}>
      <div className="saved-sites">
        {sites.map(({ draft, cloud: remote }) => (
          <button
            type="button"
            key={draft.id}
            disabled={busy}
            onClick={() => {
              if (!remote) {
                openDraft(draft);
                return;
              }
              setBusy(true);
              cloud
                .hydrate(draft)
                .then(openDraft)
                .catch(() => setDialogError("Could not restore this site."))
                .finally(() => setBusy(false));
            }}
          >
            <LayoutPanelTop size={17} />
            {draft.title || "Untitled site"}
          </button>
        ))}
      </div>
      {!busy && !sites.length && <p>No saved sites yet.</p>}
      {busy && <p role="status">Opening sites…</p>}
      {dialogError && (
        <p role="alert" className="error">
          {dialogError}
        </p>
      )}
      <button type="button" className="quiet-button" onClick={newSite}>
        <Plus size={17} />
        New site
      </button>
    </SiteDialog>
  );
  if (loading)
    return (
      <p className="connection-text" role="status">
        Opening Website Workshop…
      </p>
    );
  if (!site)
    return (
      <>
        <Templates
          choose={(name) => openDraft(template(name))}
          library={showSites}
        />
        {libraryDialog}
      </>
    );
  const sourceProps = generated && {
    data: { html: generated.html, css: generated.css, selection },
    mode: sourceMode,
    setMode: setSourceMode,
    close: () => setSource(false),
    download,
    popOut: () => {
      const url = new URL(location.href);
      url.searchParams.set("source", session.current);
      url.hash = "";
      if (
        !window.open(url, "source-" + session.current, "width=680,height=680")
      )
        setStatus("Popup blocked");
    },
  };
  return (
    <div
      className="editor"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setMenu(false);
          setToolsOpen(false);
        }
      }}
    >
      <header className="topbar">
        <div className="brand">
          <span className="app-mark" aria-label="Website Workshop">
            <LayoutPanelTop size={19} />
          </span>
          <input
            className="title-input"
            aria-label="Website title"
            placeholder="Untitled site"
            value={site.title}
            onChange={(event) =>
              edit((draft) => {
                draft.title = event.target.value;
                return true;
              }, "title")
            }
            onBlur={() => {
              editGroup.current = "";
            }}
          />
        </div>
        <div className="toolbar">
          <span className="save-status" aria-live="polite">
            {status === "Saved" && <Check size={14} />}
            <span>{status}</span>
          </span>
          <div className="tool-group history-tools">
            <IconButton
              label="Undo"
              disabled={!history.past.length}
              onClick={() => historyAction("undo")}
            >
              <Undo2 size={19} />
            </IconButton>
            <IconButton
              label="Redo"
              disabled={!history.future.length}
              onClick={() => historyAction("redo")}
            >
              <Redo2 size={19} />
            </IconButton>
          </div>
          <div className="tool-group">
            <IconButton
              label="Source View"
              pressed={source}
              onClick={() => setSource(!source)}
            >
              <Code2 size={20} />
            </IconButton>
            <IconButton
              label={preview ? "Back to editor" : "Preview"}
              pressed={preview}
              onClick={() => {
                setPreview(!preview);
                setToolsOpen(false);
              }}
            >
              {preview ? <ArrowLeft size={20} /> : <Monitor size={20} />}
            </IconButton>
            {!preview && (
              <IconButton
                className="tools-toggle"
                label="Tools"
                pressed={toolsOpen}
                onClick={() => setToolsOpen(!toolsOpen)}
              >
                <Settings2 size={20} />
              </IconButton>
            )}
          </div>
          <div ref={menuRoot} className="more-wrap">
            <IconButton
              label="More actions"
              pressed={menu}
              onClick={() => setMenu(!menu)}
            >
              <MoreHorizontal size={22} />
            </IconButton>
            {menu && (
              <div className="action-menu" aria-label="Site actions">
                <button type="button" onClick={newSite}>
                  <FilePlus2 size={17} />
                  New site
                </button>
                <button type="button" onClick={showSites}>
                  <FolderOpen size={17} />
                  My sites
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenu(false);
                    void download();
                  }}
                >
                  <ArrowDownToLine size={17} />
                  Download HTML
                </button>
                {syncError && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenu(false);
                      cloud
                        .save(site)
                        .then(() => {
                          setStatus("Saved");
                          setSyncError(false);
                        })
                        .catch(() => setStatus("Cloud save unavailable"));
                    }}
                  >
                    Retry cloud save
                  </button>
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            className="primary publish-button"
            onClick={() => {
              setDialogError("");
              setDialog("publish");
            }}
            disabled={uploading}
          >
            <Globe size={15} />
            Publish
          </button>
        </div>
      </header>
      <div className={"workspace" + (preview ? " preview-mode" : "")}>
        <div className="main-column">
          <div className="workspace-bar">
            <div className="workspace-label">
              {preview ? "Preview" : "Home"}
            </div>
            <div className="device-group" aria-label="Canvas size" role="group">
              <IconButton
                label="Desktop"
                pressed={!mobile}
                onClick={() => setMobile(false)}
              >
                <Monitor size={17} />
              </IconButton>
              <IconButton
                label="Mobile"
                pressed={mobile}
                onClick={() => setMobile(true)}
              >
                <Smartphone size={17} />
              </IconButton>
            </div>
          </div>
          <main className={"desk" + (mobile ? " mobile" : "")}>
            <div className="paper">
              <Canvas
                site={site}
                preview={preview}
                selection={selection}
                scrollTo={scrollTo}
                onMessage={onCanvas}
              />
            </div>
          </main>
          {source && sourceMode === "dock" && sourceProps && (
            <SourceView {...sourceProps} />
          )}
        </div>
        {!preview && (
          <>
            {toolsOpen && (
              <button
                className="tools-scrim"
                type="button"
                aria-label="Close editor tools"
                onClick={() => setToolsOpen(false)}
              />
            )}
            <Inspector
              panel={panel}
              setPanel={setPanel}
              open={toolsOpen}
              close={() => setToolsOpen(false)}
              formatEntry={formatEntry}
              sections={site.sections}
              selection={selection}
              selected={selected}
              currentSection={selectedSection}
              onSelect={(id) => {
                select(id, true);
                setToolsOpen(false);
              }}
              insert={insert}
              addSection={addSection}
              onDrop={reorder}
              patch={(values) => patchAt(selection, values)}
              patchSection={patchSection}
              upload={upload}
              uploading={uploading}
              move={move}
              duplicate={duplicate}
              remove={remove}
            />
          </>
        )}
      </div>
      {source && sourceMode === "float" && sourceProps && (
        <SourceView {...sourceProps} />
      )}
      {libraryDialog}
      {dialog === "publish" && (
        <SiteDialog label="Publish site" close={() => setDialog(null)}>
          {published ? (
            <div className="published-links">
              <label className="control">
                Published URL
                <input
                  readOnly
                  value={published}
                  onFocus={(event) => event.target.select()}
                />
              </label>
              <div className="dialog-actions">
                <a
                  className="quiet-button"
                  href={published}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open site <ArrowUpRight size={15} />
                </a>
                <button
                  type="button"
                  className="quiet-button"
                  onClick={() =>
                    navigator.clipboard
                      .writeText(published)
                      .then(() => setDialogError("Link copied"))
                      .catch(() => setDialogError("Copy unavailable"))
                  }
                >
                  <Clipboard size={16} />
                  Copy link
                </button>
                <button
                  type="button"
                  className="quiet-button danger"
                  disabled={busy}
                  onClick={unpublish}
                >
                  Unpublish
                </button>
              </div>
            </div>
          ) : (
            <p>Anyone with the link can view the published page.</p>
          )}
          {dialogError && (
            <p className="dialog-message" role="status">
              {dialogError}
            </p>
          )}
          <div className="publish-footer">
            <button
              type="button"
              className="primary"
              disabled={busy || uploading}
              onClick={publish}
            >
              {busy
                ? "Working…"
                : published
                  ? "Publish changes"
                  : "Publish site"}
            </button>
          </div>
        </SiteDialog>
      )}
    </div>
  );
}

function PublicSite({ siteId }: { siteId: string }) {
  const [site, setSite] = useState<SiteDocument>();
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    cloud
      .read(siteId)
      .then((site) => {
        if (active) {
          setSite(site);
          document.title = site.title || "Untitled site";
        }
      })
      .catch((error) => {
        if (active) setError(error.message);
      });
    return () => {
      active = false;
    };
  }, [siteId]);
  if (site)
    return (
      <iframe
        className="public"
        title={site.title || "Published site"}
        sandbox="allow-popups allow-popups-to-escape-sandbox"
        srcDoc={viewerDocument(site)}
      />
    );
  return (
    <main className="connection-text">
      <p role="status">{error || "Opening website…"}</p>
    </main>
  );
}
function App() {
  const sourceId = new URLSearchParams(location.search).get("source");
  const [hash, setHash] = useState(location.hash.slice(1));
  useEffect(() => {
    const listener = () => setHash(location.hash.slice(1));
    addEventListener("hashchange", listener);
    return () => removeEventListener("hashchange", listener);
  }, []);
  if (sourceId) return <SourceWindow session={sourceId} />;
  return hash ? <PublicSite key={hash} siteId={hash} /> : <Editor />;
}
createRoot(document.getElementById("root")!).render(<App />);
