import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ChevronRight,
  Columns2,
  Copy,
  GripVertical,
  Heading2,
  Image as ImageIcon,
  Link2,
  List,
  Minus,
  PaintBucket,
  PanelTop,
  Plus,
  SlidersHorizontal,
  Trash2,
  Type,
  Upload,
  X,
} from "lucide-react";
import { gallery, galleryUrl } from "./images";
import {
  safeImage,
  type Element,
  type ElementKind,
  type Section,
  type SectionLayout,
} from "./model";

const insertItems = [
  { type: "heading", label: "Heading", Icon: Heading2 },
  { type: "paragraph", label: "Text box", Icon: Type },
  { type: "image", label: "Image", Icon: ImageIcon },
  { type: "link", label: "Button", Icon: Link2 },
  { type: "divider", label: "Divider", Icon: Minus },
] as const;
const layouts: { layout: SectionLayout; label: string }[] = [
  { layout: "stack", label: "Text" },
  { layout: "split", label: "Image + text" },
  { layout: "split-reverse", label: "Text + image" },
  { layout: "columns", label: "Two images" },
];
const elementNames: Record<ElementKind, string> = {
  heading: "Heading",
  paragraph: "Text",
  image: "Image",
  link: "Button",
  divider: "Divider",
};
const backgrounds = [
  { name: "White", value: "#ffffff" },
  { name: "Stone", value: "#f2f1ed" },
  { name: "Blue", value: "#e4e9f1" },
  { name: "Sage", value: "#e6ece6" },
  { name: "Sand", value: "#f0e7dd" },
];
const textColors = [
  { name: "Ink", value: "#172233" },
  { name: "Slate", value: "#4a5767" },
  { name: "Blue", value: "#16458e" },
  { name: "Green", value: "#285b41" },
  { name: "White", value: "#ffffff" },
];

export type Panel = "insert" | "outline" | "format";
type FormatPage =
  | "main"
  | "text"
  | "font"
  | "color"
  | "section"
  | "layout"
  | "background"
  | "spacing"
  | "image"
  | "image-url"
  | "gallery"
  | "link"
  | "actions";
const pageNames: Record<FormatPage, string> = {
  main: "Format",
  text: "Typography",
  font: "Font",
  color: "Text color",
  section: "Section",
  layout: "Section layout",
  background: "Background",
  spacing: "Spacing",
  image: "Image",
  "image-url": "Image URL",
  gallery: "Image library",
  link: "Link",
  actions: "Arrange",
};
type Props = {
  panel: Panel;
  setPanel: (panel: Panel) => void;
  open: boolean;
  close: () => void;
  formatEntry: number;
  sections: Section[];
  selected?: Element;
  currentSection?: Section;
  selection: string;
  onSelect: (id: string) => void;
  insert: (type: ElementKind) => void;
  addSection: (layout: SectionLayout) => void;
  onDrop: (from: string, to: string) => void;
  patch: (values: Partial<Element>) => void;
  patchSection: (values: Partial<Section>) => void;
  upload: (file: File) => void;
  uploading: boolean;
  move: (delta: number) => void;
  duplicate: () => void;
  remove: () => void;
};

function LayoutArt({ layout }: { layout: SectionLayout }) {
  const picture = (
    <span className="layout-picture">
      <ImageIcon size={13} />
    </span>
  );
  const copy = (
    <span className="layout-copy">
      <i />
      <i />
      <i />
    </span>
  );
  return (
    <span className="layout-art" aria-hidden="true">
      {layout === "stack" ? (
        copy
      ) : layout === "columns" ? (
        <>
          {picture}
          {picture}
        </>
      ) : layout === "split" ? (
        <>
          {picture}
          {copy}
        </>
      ) : (
        <>
          {copy}
          {picture}
        </>
      )}
    </span>
  );
}

function SectionName({ section, index }: { section: Section; index: number }) {
  return (
    <>
      {section.elements.find(({ type }) => type === "heading")?.text.trim() ||
        "Section " + (index + 1)}
    </>
  );
}

function MenuRow({
  children,
  icon,
  value,
  onClick,
}: {
  children: ReactNode;
  icon?: ReactNode;
  value?: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className="panel-row" onClick={onClick}>
      {icon}
      <span className="row-label">{children}</span>
      {value && <small>{value}</small>}
      <ChevronRight className="row-chevron" size={16} />
    </button>
  );
}

function Swatches({
  choices,
  color,
  select,
  label,
}: {
  choices: typeof backgrounds;
  color: string;
  select: (value: string) => void;
  label: string;
}) {
  return (
    <>
      <div className="swatches">
        {choices.map(({ name, value }) => (
          <button
            type="button"
            title={name}
            key={name}
            aria-label={name}
            aria-pressed={color === value}
            onClick={() => select(value)}
          >
            <span style={{ backgroundColor: value }} />
          </button>
        ))}
      </div>
      <label className="control">
        Custom color
        <input
          aria-label={label}
          type="color"
          value={color}
          onChange={(event) => select(event.target.value)}
        />
      </label>
    </>
  );
}

export function Inspector(props: Props) {
  const { panel, setPanel, open, close, selected, currentSection, selection } =
    props;
  const [path, setPath] = useState<FormatPage[]>(["main"]);
  const page = path.at(-1) ?? "main";
  const pane = useRef<HTMLDivElement>(null);
  const upload = useRef<HTMLInputElement>(null);
  const lastMenu = useRef(page);
  const go = (page: FormatPage) => setPath((parents) => [...parents, page]);
  const back = () =>
    setPath((parents) => (parents.length > 1 ? parents.slice(0, -1) : parents));

  useEffect(() => {
    if (props.formatEntry > 0 && selected?.type === "image")
      setPath(["main", "image"]);
  }, [props.formatEntry]);
  useEffect(() => {
    if (page === "main" || path.length === 1) return;
    if (
      !currentSection ||
      (["image", "image-url", "gallery"].includes(page) &&
        selected?.type !== "image") ||
      (page === "link" && selected?.type !== "link") ||
      (["text", "font", "color"].includes(page) &&
        (!selected || selected.type === "image" || selected.type === "divider"))
    ) {
      setPath(["main"]);
    }
  }, [page, path.length, selection, currentSection, selected]);
  useEffect(() => {
    if (lastMenu.current !== page && panel === "format") {
      pane.current?.scrollTo({ top: 0 });
      pane.current
        ?.querySelector<HTMLElement>(".back-button")
        ?.focus({ preventScroll: true });
    }
    lastMenu.current = page;
  }, [page, panel]);

  const imageSource = selected && safeImage(selected.src);
  const editableText =
    selected && ["heading", "paragraph", "link"].includes(selected.type);
  function format() {
    if (!currentSection)
      return (
        <p className="panel-empty">Select an element or section on the page.</p>
      );
    if (page === "main")
      return (
        <>
          {selected && (
            <div className="selection-header">
              <span>{elementNames[selected.type]}</span>
            </div>
          )}
          {editableText && selected && (
            <>
              <div
                className="alignment"
                aria-label="Text alignment"
                role="group"
              >
                {(
                  [
                    ["left", AlignLeft],
                    ["center", AlignCenter],
                    ["right", AlignRight],
                  ] as const
                ).map(([align, Icon]) => (
                  <button
                    type="button"
                    key={align}
                    aria-label={"Align " + align}
                    title={"Align " + align}
                    aria-pressed={selected.align === align}
                    onClick={() => props.patch({ align })}
                  >
                    <Icon size={17} />
                  </button>
                ))}
              </div>
              <MenuRow
                icon={<Type size={17} />}
                value={selected.size + " px"}
                onClick={() => go("text")}
              >
                Typography
              </MenuRow>
              <MenuRow
                icon={<PaintBucket size={17} />}
                onClick={() => go("color")}
              >
                Text color
              </MenuRow>
            </>
          )}
          {selected?.type === "image" && (
            <MenuRow icon={<ImageIcon size={17} />} onClick={() => go("image")}>
              Image settings
            </MenuRow>
          )}
          {selected?.type === "link" && (
            <MenuRow icon={<Link2 size={17} />} onClick={() => go("link")}>
              Link
            </MenuRow>
          )}
          <MenuRow icon={<PanelTop size={17} />} onClick={() => go("section")}>
            Section settings
          </MenuRow>
          <MenuRow
            icon={<SlidersHorizontal size={17} />}
            onClick={() => go("actions")}
          >
            Arrange
          </MenuRow>
        </>
      );
    if (page === "text" && selected)
      return (
        <>
          <MenuRow
            icon={<Type size={17} />}
            onClick={() => go("font")}
            value={
              selected.font === "serif"
                ? "Serif"
                : selected.font === "mono"
                  ? "Mono"
                  : "Helvetica"
            }
          >
            Font
          </MenuRow>
          <label className="control">
            Size (px)
            <input
              type="number"
              min="12"
              max="80"
              value={selected.size}
              onChange={(event) => {
                if (event.target.value)
                  props.patch({ size: +event.target.value });
              }}
            />
          </label>
          <label className="control">
            Weight
            <select
              value={
                selected.weight ?? (selected.type === "heading" ? 700 : 400)
              }
              onChange={(event) =>
                props.patch({
                  weight: Number(event.target.value) as Element["weight"],
                })
              }
            >
              <option value="400">Regular</option>
              <option value="500">Medium</option>
              <option value="700">Bold</option>
            </select>
          </label>
        </>
      );
    if (page === "font" && selected)
      return (
        <div className="choices">
          {(
            [
              ["sans", "Helvetica Now Display"],
              ["serif", "Georgia"],
              ["mono", "Monospace"],
            ] as const
          ).map(([font, label]) => (
            <button
              type="button"
              key={font}
              aria-pressed={(selected.font || "sans") === font}
              onClick={() => props.patch({ font })}
            >
              {label}
            </button>
          ))}
        </div>
      );
    if (page === "color" && selected)
      return (
        <Swatches
          choices={textColors}
          color={selected.color}
          select={(color) => props.patch({ color })}
          label="Custom text color"
        />
      );
    if (page === "section")
      return (
        <>
          <MenuRow
            icon={<Columns2 size={17} />}
            value={currentSection.columns === 1 ? "1 column" : "2 columns"}
            onClick={() => go("layout")}
          >
            Layout
          </MenuRow>
          <MenuRow
            icon={<PaintBucket size={17} />}
            onClick={() => go("background")}
          >
            Background
          </MenuRow>
          <MenuRow
            icon={<SlidersHorizontal size={17} />}
            onClick={() => go("spacing")}
          >
            Spacing
          </MenuRow>
        </>
      );
    if (page === "layout")
      return (
        <div className="choices">
          <button
            type="button"
            aria-pressed={currentSection.columns === 1}
            onClick={() => props.patchSection({ columns: 1, layout: "stack" })}
          >
            One column
          </button>
          <button
            type="button"
            aria-pressed={currentSection.columns === 2}
            onClick={() =>
              props.patchSection({
                columns: 2,
                layout: currentSection.elements.some(
                  ({ type }) => type === "image",
                )
                  ? "split"
                  : "columns",
              })
            }
          >
            Two columns
          </button>
        </div>
      );
    if (page === "background")
      return (
        <Swatches
          choices={backgrounds}
          color={currentSection.background}
          select={(background) => props.patchSection({ background })}
          label="Custom background color"
        />
      );
    if (page === "spacing")
      return (
        <label className="control">
          Padding ({currentSection.padding} px)
          <input
            type="range"
            min="0"
            max="120"
            value={currentSection.padding}
            onChange={(event) =>
              props.patchSection({ padding: Number(event.target.value) })
            }
          />
        </label>
      );
    if (page === "image" && selected)
      return (
        <>
          {imageSource && (
            <img className="image-preview" src={imageSource} alt="" />
          )}
          <button
            type="button"
            className="upload-button"
            disabled={props.uploading}
            onClick={() => upload.current?.click()}
          >
            <Upload size={16} />
            {props.uploading ? "Adding image…" : "Upload image"}
          </button>
          <MenuRow icon={<ImageIcon size={17} />} onClick={() => go("gallery")}>
            Image library
          </MenuRow>
          <MenuRow icon={<Link2 size={17} />} onClick={() => go("image-url")}>
            Image URL
          </MenuRow>
          <label className="control">
            Alt text
            <input
              value={selected.alt}
              placeholder="Describe the image"
              onChange={(event) => props.patch({ alt: event.target.value })}
            />
          </label>
        </>
      );
    if (page === "gallery")
      return (
        <div className="photo-library">
          {gallery.map(({ name, path }) => (
            <button
              type="button"
              key={path}
              onClick={() => {
                props.patch({
                  src: "gallery:" + path,
                  alt: name,
                  imageRef: undefined,
                });
                back();
              }}
            >
              <img src={galleryUrl(path)} alt="" />
              <span>{name}</span>
            </button>
          ))}
        </div>
      );
    if (page === "image-url" && selected)
      return (
        <label className="control">
          Image URL
          <input
            type="url"
            placeholder="https://example.com/image.jpg"
            value={/^https:\/\//i.test(selected.src) ? selected.src : ""}
            onChange={(event) =>
              props.patch({ src: event.target.value, imageRef: undefined })
            }
          />
        </label>
      );
    if (page === "link" && selected)
      return (
        <>
          <label className="control">
            Button text
            <input
              value={selected.text}
              onChange={(event) => props.patch({ text: event.target.value })}
            />
          </label>
          <label className="control">
            Link URL
            <input
              placeholder="https://example.com"
              value={selected.href.startsWith("#") ? "" : selected.href}
              onChange={(event) => props.patch({ href: event.target.value })}
            />
          </label>
          <label className="control">
            Or link to a section
            <select
              value={
                selected.href.startsWith("#") ? selected.href.slice(1) : ""
              }
              onChange={(event) =>
                props.patch({
                  href: event.target.value ? "#" + event.target.value : "",
                })
              }
            >
              <option value="">Choose a section</option>
              {props.sections.map((section, index) => (
                <option key={section.id} value={section.id}>
                  <SectionName section={section} index={index} />
                </option>
              ))}
            </select>
          </label>
        </>
      );
    if (page === "actions")
      return (
        <div className="choices">
          <button type="button" onClick={() => props.move(-1)}>
            <ArrowUp size={16} />
            Move up
          </button>
          <button type="button" onClick={() => props.move(1)}>
            <ArrowDown size={16} />
            Move down
          </button>
          <button type="button" onClick={props.duplicate}>
            <Copy size={16} />
            Duplicate
          </button>
          <button
            type="button"
            className="danger"
            onClick={() => {
              props.remove();
              setPath(["main"]);
            }}
          >
            <Trash2 size={16} />
            Delete
          </button>
        </div>
      );
  }

  return (
    <aside
      className={"inspector" + (open ? " is-open" : "")}
      aria-label="Editor tools"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          if (panel === "format" && page !== "main") back();
          else close();
          event.stopPropagation();
        }
      }}
    >
      <nav className="tool-tabs" aria-label="Editor panels">
        {(
          [
            ["insert", "Insert", Plus],
            ["outline", "Outline", List],
            ["format", "Format", SlidersHorizontal],
          ] as const
        ).map(([value, label, Icon]) => (
          <button
            type="button"
            key={value}
            aria-pressed={panel === value}
            onClick={() => {
              setPanel(value);
              if (value === "format" && panel === "format") setPath(["main"]);
            }}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
        <button
          type="button"
          className="close-tools icon-button"
          aria-label="Close tools"
          onClick={close}
        >
          <X size={18} />
        </button>
      </nav>
      <div ref={pane} className="inspector-content">
        {panel === "insert" && (
          <>
            <h2>Elements</h2>
            <div className="element-grid">
              {insertItems.map(({ type, label, Icon }) => (
                <button
                  type="button"
                  key={type}
                  onClick={() => props.insert(type)}
                >
                  <span className="element-icon">
                    <Icon size={19} />
                  </span>
                  {label}
                </button>
              ))}
            </div>
            <h2 className="block-heading">Section layouts</h2>
            <div className="layout-grid">
              {layouts.map(({ layout, label }) => (
                <button
                  type="button"
                  key={layout}
                  onClick={() => props.addSection(layout)}
                >
                  <LayoutArt layout={layout} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </>
        )}
        {panel === "outline" && (
          <>
            <div className="outline-title">
              <h2>Sections</h2>
              <button
                type="button"
                className="icon-button"
                title="Add section"
                aria-label="Add section"
                onClick={() => props.addSection("stack")}
              >
                <Plus size={19} />
              </button>
            </div>
            <ol className="outline-list">
              {props.sections.map((section, index) => (
                <li
                  key={section.id}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    props.onDrop(
                      event.dataTransfer.getData("application/x-workshop-node"),
                      section.id,
                    );
                  }}
                >
                  <button
                    type="button"
                    draggable
                    title="Drag to reorder"
                    onDragStart={(event) =>
                      event.dataTransfer.setData(
                        "application/x-workshop-node",
                        section.id,
                      )
                    }
                    aria-pressed={currentSection?.id === section.id}
                    onClick={() => props.onSelect(section.id)}
                  >
                    <GripVertical size={15} />
                    <span className="row-label">
                      <SectionName section={section} index={index} />
                    </span>
                  </button>
                </li>
              ))}
            </ol>
            {currentSection && (
              <div className="outline-actions">
                <button
                  type="button"
                  className="icon-button"
                  title="Move up"
                  aria-label="Move up"
                  onClick={() => {
                    props.onSelect(currentSection.id);
                    props.onDrop(
                      currentSection.id,
                      props.sections[props.sections.indexOf(currentSection) - 1]
                        ?.id ?? "",
                    );
                  }}
                >
                  <ArrowUp size={17} />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  title="Move down"
                  aria-label="Move down"
                  onClick={() => {
                    props.onSelect(currentSection.id);
                    props.onDrop(
                      currentSection.id,
                      props.sections[props.sections.indexOf(currentSection) + 1]
                        ?.id ?? "",
                    );
                  }}
                >
                  <ArrowDown size={17} />
                </button>
              </div>
            )}
          </>
        )}
        {panel === "format" && (
          <>
            {page !== "main" && (
              <button type="button" className="back-button" onClick={back}>
                <ArrowLeft size={15} />
                {pageNames[path.at(-2) ?? "main"]}
              </button>
            )}
            {page !== "main" && (
              <h2 className="format-title">{pageNames[page]}</h2>
            )}
            {format()}
          </>
        )}
      </div>
      <input
        ref={upload}
        type="file"
        className="upload-input"
        aria-label="Upload image file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.currentTarget.value = "";
          if (file) props.upload(file);
        }}
      />
    </aside>
  );
}
