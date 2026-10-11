window.addEventListener("error", function (event) {
  console.error("[Runtime Error]", event.error || event.message);
  let banner = document.getElementById("runtime-error-banner");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "runtime-error-banner";
    banner.style.position = "fixed";
    banner.style.bottom = "12px";
    banner.style.left = "12px";
    banner.style.right = "12px";
    banner.style.background = "rgba(239, 68, 68, 0.95)";
    banner.style.color = "#ffffff";
    banner.style.padding = "10px 14px";
    banner.style.borderRadius = "8px";
    banner.style.fontSize = "12px";
    banner.style.fontFamily = "monospace";
    banner.style.zIndex = "999999";
    banner.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
    banner.style.whiteSpace = "pre-wrap";
    banner.style.wordBreak = "break-all";
    document.body.appendChild(banner);
  }
  banner.textContent =
    "Error: " + (event.error ? event.error.message : event.message);
});

window.addEventListener("unhandledrejection", function (event) {
  console.error("[Runtime Unhandled Rejection]", event.reason);
});
