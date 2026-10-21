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
