// Runs only in the script-enabled, opaque editing frame.
const page = document.querySelector("#page");
const style = document.querySelector("#page-style");
const send = (type, values = {}) =>
  parent.postMessage({ workshop: true, type, ...values }, "*");
const editable = "h1, h2, p, a";
const attributes = [
  "id",
  "class",
  "src",
  "alt",
  "href",
  "target",
  "rel",
  "role",
  "aria-label",
  "type",
  "data-node",
  "data-action",
];
let lastHtml = "";
let lastScroll = "";
let lastSelection = "";

function updateChildren(current, next) {
  const existing = Array.from(current.children);
  let index = 0;
  for (const incoming of next.children) {
    const key = incoming.dataset.node || incoming.className;
    const found = existing.findIndex(
      (candidate) =>
        candidate.tagName === incoming.tagName &&
        (candidate.dataset.node || candidate.className) === key,
    );
    const child =
      found < 0
        ? document.createElement(incoming.localName)
        : existing.splice(found, 1)[0];
    if (current.children[index] !== child)
      current.insertBefore(child, current.children[index] || null);
    index += 1;
    for (const name of attributes) {
      const value = incoming.getAttribute(name);
      if (value === child.getAttribute(name)) continue;
      if (value === null) child.removeAttribute(name);
      else child.setAttribute(name, value);
    }
    if (incoming.dataset.node) {
      child.tabIndex = 0;
      child.draggable = true;
    }
    if (incoming.matches(editable)) {
      child.contentEditable = "plaintext-only";
      // The canvas sends each keystroke to the editor. Ignore its echo while typing.
      if (child !== document.activeElement || !document.hasFocus()) {
        if (child.textContent !== incoming.textContent)
          child.textContent = incoming.textContent;
      }
    } else if (incoming.children.length || child.children.length) {
      updateChildren(child, incoming);
    } else if (child.textContent !== incoming.textContent) {
      child.textContent = incoming.textContent;
    }
  }
  for (const child of existing) child.remove();
}

function render(html) {
  const next = new DOMParser()
    .parseFromString(html, "text/html")
    .querySelector("main");
  if (next) updateChildren(page.firstElementChild, next);
}

addEventListener("message", (event) => {
  if (event.source !== parent || event.data?.type !== "render") return;
  const data = event.data;
  if (data.css !== style.textContent) style.textContent = data.css;
  if (lastHtml !== data.html) {
    lastHtml = data.html;
    render(data.html);
  }
  if (document.title !== data.title) document.title = data.title;
  const selected = Array.from(page.querySelectorAll("[data-node]")).find(
    (node) => node.dataset.node === data.selection,
  );
  const current = page.querySelector("[data-selected]");
  if (current !== selected) {
    current?.removeAttribute("data-selected");
    selected?.setAttribute("data-selected", "");
  }
  if (lastScroll !== data.scrollTo) {
    lastScroll = data.scrollTo;
    selected?.scrollIntoView({ block: "nearest" });
  }
});
document.addEventListener("click", (event) => {
  const target = event.target;
  const part = target.closest("[data-node]");
  if (target.closest("[data-action='insert']")) {
    send("insert", { sectionId: part?.dataset.node });
    return;
  }
  if (target.closest("a")) event.preventDefault();
  if (part)
    send("select", {
      id: part.dataset.node,
      openFormat: part.matches("img, .image-placeholder"),
    });
});
document.addEventListener("focusin", (event) => {
  const node = event.target.closest("[data-node]");
  if (node && node.dataset.node !== lastSelection) {
    lastSelection = node.dataset.node;
    send("select", { id: lastSelection });
  }
});
document.addEventListener("keydown", (event) => {
  if (
    event.key === "Enter" &&
    event.target.matches(".image-placeholder, img")
  ) {
    event.preventDefault();
    send("select", { id: event.target.dataset.node, openFormat: true });
  }
});
document.addEventListener("input", (event) => {
  if (event.target.isContentEditable)
    send("text", {
      id: event.target.dataset.node,
      text: event.target.innerText,
    });
});
document.addEventListener("focusout", (event) => {
  if (event.target.isContentEditable && event.relatedTarget !== event.target)
    send("text-end");
});
document.addEventListener("dragstart", (event) => {
  const node = event.target.closest("[data-node]");
  if (node)
    event.dataTransfer.setData(
      "application/x-workshop-node",
      node.dataset.node,
    );
});
document.addEventListener("dragover", (event) => {
  if (
    event.dataTransfer.types.includes("Files") ||
    event.dataTransfer.types.includes("application/x-workshop-node")
  )
    event.preventDefault();
});
document.addEventListener("drop", (event) => {
  if (event.dataTransfer.files[0]) {
    event.preventDefault();
    send("file", {
      file: event.dataTransfer.files[0],
      target: event.target.closest("[data-node]")?.dataset.node,
    });
    return;
  }
  const from = event.dataTransfer.getData("application/x-workshop-node");
  const to = event.target.closest("[data-node]")?.dataset.node;
  if (from && to) {
    event.preventDefault();
    send("drop", { from, to });
  }
});
send("ready");
