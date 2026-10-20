// report.js - Error reporter loaded before main.js in the game iframe
(function () {
  var firstError = null;

  function extractErrorMessage(event) {
    if (!event) return "Unknown error";
    if (typeof event === "string") return event;
    if (event.error && event.error.message) return event.error.message;
    if (event.message) return event.message;
    if (event.reason) {
      if (typeof event.reason === "string") return event.reason;
      if (event.reason && event.reason.message) return event.reason.message;
      return String(event.reason);
    }
    return String(event);
  }

  function formatErrorWithLocation(event) {
    var msg = extractErrorMessage(event);
    if (event && event.filename) {
      var fileName = event.filename.split("/").pop();
      if (fileName) {
        msg += " (" + fileName + (event.lineno ? ":" + event.lineno : "") + ")";
      }
    }
    return msg;
  }

  function renderBanner(message) {
    function append() {
      if (!document.body) return;
      var banner = document.getElementById("runtime-error-banner");
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
      banner.textContent = "Error: " + message;
    }

    if (document.body) {
      append();
    } else {
      window.addEventListener("DOMContentLoaded", append);
    }
  }

  // Catch script parse/syntax errors and runtime exceptions early (capture phase)
  window.addEventListener(
    "error",
    function (event) {
      console.error("[Runtime Error]", event.error || event.message || event);
      var formatted = formatErrorWithLocation(event);
      if (!firstError) {
        firstError = formatted;
      }
      renderBanner(formatted);
    },
    true
  );

  // Catch unhandled promise rejections
  window.addEventListener("unhandledrejection", function (event) {
    console.error("[Runtime Unhandled Rejection]", event.reason || event);
    var formatted = extractErrorMessage(event);
    if (!firstError) {
      firstError = formatted;
    }
    renderBanner(formatted);
  });

  // Listen for parent game-ping and reply with game-status
  // Parent polls "game-ping", frame answers "game-status" with first error caught, or nothing if healthy
  window.addEventListener("message", function (event) {
    var data = event.data;
    var isPing =
      data === "game-ping" ||
      (data && typeof data === "object" && data.type === "game-ping");

    if (isPing) {
      var target = event.source || window.parent;
      if (!target) return;

      var response = {
        type: "game-status",
      };

      if (firstError) {
        response.error = firstError;
      }

      target.postMessage(response, "*");
    }
  });
})();
