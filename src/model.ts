import { profilePhoto, portfolioPhoto, eventPhoto } from "./starter-assets";
import { resolveGalleryUrl, portableGalleryUrl } from "./images";

export type ElementKind =
  "heading" | "paragraph" | "image" | "link" | "divider";
export type SectionLayout =
  | "stack"
  | "columns"
  | "split"
  | "split-reverse"
  | "three"
  | "four"
  | "banner"
  | "feature";
export type Element = {
  id: string;
  type: ElementKind;
  text: string;
  href: string;
  src: string;
  alt: string;
  color: string;
  size: number;
  font?: "sans" | "serif" | "mono";
  align: "left" | "center" | "right";
  weight?: 400 | 500 | 700;
  headingLevel?: 1 | 2;
  imageRef?: string;
  imageWidth?: number;
  imageRatio?: "auto" | "1 / 1" | "16 / 9" | "4 / 3";
};
export type Section = {
  id: string;
  columns: 1 | 2 | 3 | 4;
  background: string;
  padding: number;
  elements: Element[];
  layout?: SectionLayout;
  banner?: boolean;
  backgroundImage?: Element;
  autoContrast?: boolean;
};
export type SiteDocument = {
  version: 1;
  id: string;
  title: string;
  sections: Section[];
  updatedAt?: number;
};

export const id = () => "w" + crypto.randomUUID();
export const sansFont =
  '"Helvetica Now Display", "Helvetica Neue", Helvetica, Arial, sans-serif';

export function element(type: ElementKind): Element {
  const labels: Record<ElementKind, string> = {
    heading: "Heading",
    paragraph: "Add your text here.",
    image: "",
    link: "Learn more",
    divider: "",
  };
  return {
    id: id(),
    type,
    text: labels[type],
    href: "",
    src: "",
    alt: "",
    color: type === "link" ? "#16458e" : "#172233",
    size: type === "heading" ? 34 : type === "link" ? 15 : 17,
    align: "left",
  };
}

export function section(layout: SectionLayout = "stack"): Section {
  if (["three", "four", "banner", "feature"].includes(layout)) {
    const count = layout === "three" ? 3 : layout === "four" ? 4 : 1;
    return {
      id: id(),
      columns: count,
      layout,
      background: "#ffffff",
      padding: 52,
      banner: layout === "banner",
      elements: (layout === "banner"
        ? ["heading"]
        : layout === "feature"
          ? ["image", "heading", "paragraph"]
          : Array(count).fill("image")
      ).map((type, index) =>
        type === "image"
          ? {
              ...element("image"),
              src:
                "gallery:" +
                ["architecture.webp", "profile.webp", "event.webp"][index % 3],
              alt: "Sample photograph",
            }
          : element(type as ElementKind),
      ),
    };
  }
  const group =
    layout === "columns"
      ? ["image", "image"]
      : layout === "stack"
        ? ["heading", "paragraph"]
        : ["image", "heading", "paragraph"];
  return {
    id: id(),
    columns: layout === "stack" ? 1 : 2,
    layout,
    background: "#ffffff",
    padding: 52,
    elements: (group as ElementKind[]).map((kind, index) =>
      kind === "image"
        ? {
            ...element(kind),
            src:
              "gallery:" +
              ["architecture.webp", "profile.webp", "event.webp"][index % 3],
            alt: "Sample photograph",
          }
        : element(kind),
    ),
  };
}

export const templates = ["Blank", "Personal", "Portfolio", "Event"] as const;
export function template(name: string): SiteDocument {
  const site: SiteDocument = {
    version: 1,
    id: id(),
    title: "Untitled site",
    sections: [],
  };
  if (name === "Blank page") return site;
  const cover = section();
  cover.banner = true;
  cover.background = "#e6ece6";
  cover.padding = 88;
  cover.elements = [
    {
      ...element("heading"),
      text: "Page title",
      align: "center",
      size: 67,
      weight: 500,
      headingLevel: 1,
    },
  ];
  site.sections.push(cover);
  if (name === "Blank") return site;

  const isPersonal = name === "Personal" || name === "Personal introduction";
  const isEvent = name === "Event" || name === "Event invitation";
  const body = section(isEvent ? "split-reverse" : "split");
  const [picture, heading, text] = body.elements;
  picture.src = isPersonal
    ? profilePhoto
    : isEvent
      ? eventPhoto
      : portfolioPhoto;
  picture.alt = isPersonal
    ? "A person looking out over a lake"
    : isEvent
      ? "People meeting around a table"
      : "A concrete building viewed from below";
  cover.background = isPersonal ? "#e6ece6" : isEvent ? "#f0e7dd" : "#e4e9f1";
  cover.elements[0].text = isPersonal
    ? "Your name"
    : isEvent
      ? "Event title"
      : "Your portfolio";
  heading.text = isPersonal
    ? "About me"
    : isEvent
      ? "Event details"
      : "Project title";
  text.text = "Add your text here.";
  const button = element("link");
  button.text = isEvent ? "RSVP" : isPersonal ? "Contact" : "Learn more";
  body.elements.push(button);
  site.sections.push(body);
  return site;
}

export const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );

export function safeLink(input: string) {
  const value = input.trim();
  if (/^#[\w-]+$/.test(value)) return value;
  try {
    const url = new URL(value);
    return ["http:", "https:", "mailto:"].includes(url.protocol) ? value : "#";
  } catch {
    return "#";
  }
}

export function safeImage(input: string) {
  const value = input.trim();
  const galleryUrl = resolveGalleryUrl(portableGalleryUrl(value));
  if (galleryUrl) return galleryUrl;
  if (/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/]+=*$/i.test(value))
    return value;
  try {
    const url = new URL(value);
    if (url.protocol === "https:") return value;
    if (
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(url.hostname) &&
      /^\/(gallery\/[\w-]+\.(svg|jpg|webp)|v0\/b\/)/i.test(url.pathname)
    )
      return value;
    return "";
  } catch {
    return "";
  }
}

// CSS selectors can only use the app's safe identifier alphabet. The prefix covers early drafts.
function domId(value: string) {
  let clean = value.replace(/[^\w-]/g, "-");
  if (!/^[a-z_]/i.test(clean)) clean = "node-" + clean;
  return clean;
}
const color = (value: string) =>
  /^#[0-9a-f]{6}$/i.test(value) ? value : "#172233";
const bounded = (value: number, low: number, high: number, fallback: number) =>
  Number.isFinite(value) ? Math.max(low, Math.min(high, value)) : fallback;

function elementMarkup(item: Element, editing: boolean) {
  const attrs =
    'id="' +
    domId(item.id) +
    '"' +
    (editing ? ' data-node="' + escape(item.id) + '"' : "");
  switch (item.type) {
    case "image": {
      const source = safeImage(item.src);
      return source
        ? "<img " +
            attrs +
            ' src="' +
            escape(source) +
            '" alt="' +
            escape(item.alt) +
            '">'
        : "<div " +
            attrs +
            ' class="image-placeholder" role="img" aria-label="Image placeholder"><span></span></div>';
    }
    case "divider":
      return "<hr " + attrs + ">";
    case "link": {
      const target = safeLink(item.href);
      const anchor = target.startsWith("#");
      const href =
        anchor && target.length > 1 ? "#" + domId(target.slice(1)) : target;
      return (
        "<a " +
        attrs +
        ' href="' +
        escape(href) +
        '"' +
        (anchor ? "" : ' target="_blank" rel="noopener noreferrer"') +
        ">" +
        escape(item.text) +
        "</a>"
      );
    }
    case "heading": {
      const tag = item.headingLevel === 1 ? "h1" : "h2";
      return (
        "<" + tag + " " + attrs + ">" + escape(item.text) + "</" + tag + ">"
      );
    }
    default:
      return "<p " + attrs + ">" + escape(item.text) + "</p>";
  }
}

function sectionMarkup(item: Section, editing: boolean) {
  const attrs =
    'id="' +
    domId(item.id) +
    '"' +
    (editing ? ' data-node="' + escape(item.id) + '"' : "");
  const indent = (markup: string) => "    " + markup;
  let contents = item.elements
    .map((el) => indent(elementMarkup(el, editing)))
    .join("\n");
  const split = item.layout === "split" || item.layout === "split-reverse";
  const picture = split && item.elements.find((el) => el.type === "image");
  if (picture && item.columns === 2) {
    const image = indent(elementMarkup(picture, editing));
    const copy =
      '    <div class="text-column">\n' +
      item.elements
        .filter((el) => el !== picture)
        .map((el) => "  " + indent(elementMarkup(el, editing)))
        .join("\n") +
      "\n    </div>";
    contents =
      item.layout === "split-reverse"
        ? copy + "\n" + image
        : image + "\n" + copy;
  }
  if (!contents && editing)
    contents =
      '    <button type="button" class="add-content" data-action="insert">Add element</button>';
  return "  <section " + attrs + ">\n" + contents + "\n  </section>";
}

const pageCss = `* { box-sizing: border-box; }
body { margin: 0; color: #172233; background: #fff; font-family: ${sansFont}; line-height: 1.6; }
section { align-items: start; justify-items: stretch; gap: 24px; padding-inline: max(36px, calc((100% - 1200px) / 2)); }
h1, h2, p, a { min-width: 0; margin: 0; overflow-wrap: anywhere; white-space: pre-wrap; }
h1, h2 { line-height: 1.06; letter-spacing: -0.04em; }
img, .image-placeholder { display: block; width: 100%; }
img { height: auto; }
.image-placeholder { display: grid; place-items: center; min-height: 160px; aspect-ratio: 16 / 10; background: #f0f2f4; color: #697788; }
.image-placeholder span { width: 30px; height: 24px; border: 2px solid currentColor; border-radius: 4px; background: linear-gradient(135deg, transparent 55%, currentColor 56%, currentColor 61%, transparent 62%) center / 21px 13px no-repeat; }
.text-column { display: grid; gap: 14px; min-width: 0; }
a { width: max-content; max-width: 100%; padding: 9px 15px; border: 1px solid currentColor; border-radius: 5px; text-decoration: none; line-height: 1.4; }
a:hover { text-decoration: underline; }
hr { width: 100%; margin: 12px 0; border: 0; border-top: 1px solid #cdd4dc; }`;

function styleFor(item: Element) {
  const faces = { sans: "inherit", serif: "Georgia, serif", mono: "monospace" };
  const rules = [
    "color: " + color(item.color),
    "font-size: " +
      (item.headingLevel === 1
        ? "clamp(36px, 7vw, " + bounded(item.size, 36, 80, 67) + "px)"
        : bounded(item.size, 12, 80, 17) + "px"),
    "text-align: " +
      (["left", "center", "right"].includes(item.align) ? item.align : "left"),
  ];
  if (item.font && Object.hasOwn(faces, item.font))
    rules.push("font-family: " + faces[item.font]);
  if (item.weight && [400, 500, 700].includes(item.weight))
    rules.push("font-weight: " + item.weight);
  if (item.type === "link")
    rules.push(
      "justify-self: " +
        (item.align === "center"
          ? "center"
          : item.align === "right"
            ? "end"
            : "start"),
    );
  if (item.type === "image") {
    rules.push("width: " + bounded(item.imageWidth ?? 100, 10, 100, 100) + "%");
    if (["1 / 1", "16 / 9", "4 / 3"].includes(item.imageRatio ?? ""))
      rules.push("aspect-ratio: " + item.imageRatio, "object-fit: cover");
  }
  return "#" + domId(item.id) + " { " + rules.join("; ") + "; }";
}

export function generate(site: SiteDocument, editing = false) {
  const html =
    "<main>\n" +
    site.sections.map((s) => sectionMarkup(s, editing)).join("\n") +
    "\n</main>";
  const sectionsCss = site.sections
    .map((s) => {
      const banner = s.banner
        ? " min-height: 310px; align-content: center;"
        : "";
      return (
        "#" +
        domId(s.id) +
        " { display: grid; grid-template-columns: repeat(" +
        ([1, 2, 3, 4].includes(s.columns) ? s.columns : 1) +
        ", minmax(0, 1fr)); padding-block: " +
        bounded(s.padding, 0, 120, 48) +
        "px; background: " +
        color(s.background) +
        ";" +
        banner +
        " }\n" +
        s.elements.map(styleFor).join("\n") +
        (s.backgroundImage && safeImage(s.backgroundImage.src)
          ? "\n#" +
            domId(s.id) +
            " { background-image: " +
            (s.autoContrast !== false
              ? "linear-gradient(#000a, #000a), "
              : "") +
            "url(" +
            JSON.stringify(safeImage(s.backgroundImage.src)).replace(
              /</g,
              "\\3c ",
            ) +
            "); background-size: cover; background-position: center; }" +
            (s.autoContrast !== false
              ? "\n#" + domId(s.id) + " :is(h1,h2,p,a) { color: #ffffff; }"
              : "")
          : "")
      );
    })
    .join("\n");
  const css =
    pageCss +
    "\n" +
    sectionsCss +
    "\n@media (max-width: 600px) { main section[id] { grid-template-columns: minmax(0, 1fr) !important; padding-inline: 24px; } }";
  const document =
    '<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>' +
    escape(site.title) +
    "</title><style>" +
    css +
    "</style></head><body>" +
    html +
    "</body></html>";
  return { html, css, document };
}
