"use strict";

// Optional keyboard enhancement: combo switching itself works with CSS only.
(() => {
  const widget = document.querySelector("#combo .widget");
  if (!widget) return;

  const labels = Array.from(widget.querySelectorAll(".tabs label[for]"));
  const updateState = () => {
    for (const label of labels) {
      const input = document.getElementById(label.htmlFor);
      if (input) label.setAttribute("aria-pressed", String(input.checked));
    }
  };

  for (const label of labels) {
    const input = document.getElementById(label.htmlFor);
    if (!input) continue;
    label.setAttribute("role", "button");
    label.tabIndex = 0;
    label.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      input.checked = true;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

  widget.addEventListener("change", (event) => {
    if (event.target.matches('input[name="combo"]')) updateState();
  });
  updateState();
})();


// Wiki page routing: anchors keep the single offline HTML linkable.
(() => {
  const pages = Array.from(document.querySelectorAll("[data-wiki-page]"));
  const sidebar = document.getElementById("wiki-sidebar");
  const menuButton = document.getElementById("wiki-menu-toggle");
  const backdrop = document.getElementById("wiki-backdrop");
  if (!pages.length || !sidebar || !menuButton || !backdrop) return;

  const navLinks = Array.from(sidebar.querySelectorAll('a[href^="#"]'));
  const closeMenu = (restoreFocus = false) => {
    const wasOpen = document.body.classList.contains("wiki-menu-open");
    document.body.classList.remove("wiki-menu-open");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "メニューを開く");
    if (wasOpen && restoreFocus) menuButton.focus();
  };
  const openMenu = () => {
    document.body.classList.add("wiki-menu-open");
    menuButton.setAttribute("aria-expanded", "true");
    menuButton.setAttribute("aria-label", "メニューを閉じる");
    const firstLink = sidebar.querySelector("a");
    if (firstLink) firstLink.focus();
  };

  menuButton.addEventListener("click", () => {
    if (document.body.classList.contains("wiki-menu-open")) closeMenu(true);
    else openMenu();
  });
  backdrop.addEventListener("click", () => closeMenu(true));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && document.body.classList.contains("wiki-menu-open")) closeMenu(true);
  });
  navLinks.forEach(link => link.addEventListener("click", () => closeMenu()));

  const activate = () => {
    const hash = decodeURIComponent(location.hash.slice(1));
    const target = hash ? document.getElementById(hash) : null;
    const selected = target ? target.closest("[data-wiki-page]") : null;
    const pageId = selected ? selected.dataset.wikiPage : "overview";

    for (const page of pages) page.hidden = page.dataset.wikiPage !== pageId;
    for (const link of navLinks) {
      link.removeAttribute("aria-current");
      if (link.dataset.pageLink === pageId) link.setAttribute("aria-current", "page");
      else if (target && target.id === link.getAttribute("href").slice(1)) link.setAttribute("aria-current", "location");
    }
    document.title = pageId === "motion" ? "攻撃モーション詳細 — LEIR" :
      pageId === "shooting" ? "撮影チェック — LEIR" : "LEIR — Game Design Wiki";

    // Run after changing display state so deep links scroll to visible content.
    requestAnimationFrame(() => {
      if (target) target.scrollIntoView({block:"start"});
      else window.scrollTo({top:0,behavior:"instant"});
    });
    closeMenu();
  };
  window.addEventListener("hashchange", activate);
  activate();
})();
