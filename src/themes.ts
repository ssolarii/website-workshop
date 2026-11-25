import { element, type SiteDocument } from "./model";
export const themes = [
  {
    name: "Simple",
    background: "#ffffff",
    header: "#e4e9f1",
    ink: "#172233",
    accent: "#16458e",
    font: "sans",
    photo: "",
  },
  {
    name: "Natural",
    background: "#f4f5ef",
    header: "#e6ece6",
    ink: "#253b30",
    accent: "#285b41",
    font: "serif",
    photo: "profile.webp",
  },
  {
    name: "Editorial",
    background: "#f5f0e8",
    header: "#eadfce",
    ink: "#392d24",
    accent: "#784827",
    font: "serif",
    photo: "architecture.webp",
  },
  {
    name: "Dark",
    background: "#18212d",
    header: "#101820",
    ink: "#f4f6fa",
    accent: "#a8c8ff",
    font: "sans",
    photo: "",
  },
  {
    name: "Studio",
    background: "#ffffff",
    header: "#e6e6e6",
    ink: "#222222",
    accent: "#234f8c",
    font: "mono",
    photo: "event.webp",
  },
] as const;
export function applyTheme(site: SiteDocument, name: string) {
  const theme = themes.find((t) => t.name === name);
  if (!theme) return false;
  for (const section of site.sections) {
    section.background = section.banner ? theme.header : theme.background;
    delete section.backgroundImage;
    if (section.banner && theme.photo)
      section.backgroundImage = {
        ...element("image"),
        src: "gallery:" + theme.photo,
      };
    section.autoContrast = true;
    section.padding = section.banner ? 88 : 52;
    for (const item of section.elements) {
      item.color = item.type === "link" ? theme.accent : theme.ink;
      item.font = theme.font;
    }
  }
  return true;
}
