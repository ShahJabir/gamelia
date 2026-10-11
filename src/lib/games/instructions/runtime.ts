export const runtimeInstructions: string[] = [
  `# Daytona Runtime & Game Directory Environment

The game runs inside an isolated Daytona cloud sandbox designed for fast, real-time code execution and instant live previews.`,

  `## 1. Directory Structure & Files
- Working Directory: \`/home/daytona/game/\`
- Primary Entrypoint: \`/home/daytona/game/index.html\`
- Auxiliary Files: Relative assets such as scripts (\`game.js\`), stylesheets (\`style.css\`), or media assets live in \`/home/daytona/game/\` and can be loaded via relative paths (e.g., \`<script src="game.js"></script>\` or \`<link rel="stylesheet" href="style.css">\`).
- Self-Contained Deliverables: Single-file or clean multi-file HTML5 architectures are ideal. \`index.html\` must be complete, valid, and immediately renderable in a browser.`,

  `## 2. Server & Preview Execution
- Static HTTP Server: The game is served via Python HTTP server on port 8000 (\`python3 -m http.server 8000 --directory /home/daytona/game\`).
- Preview Iframe: The application embeds the game directly in the chat preview panel using a signed Daytona preview URL or proxy.
- Static Browser Runtime: There is no background bundler (Vite/Webpack) or backend Node.js process running inside the game directory. All JavaScript, CSS, and HTML must run natively in the browser without an ahead-of-time compilation step.`,

  `## 3. Libraries & CDN Usage
- When using external libraries or game engines (such as Phaser, Three.js, PixiJS, Howler.js, Tone.js, Tailwind CSS, Canvas-Confetti), load them directly in \`index.html\` via reputable CDNs:
  - \`<script src="https://cdnjs.cloudflare.com/ajax/libs/..."></script>\`
  - \`<script src="https://cdn.jsdelivr.net/npm/..."></script>\`
  - \`<script src="https://unpkg.com/..."></script>\`
- Always use production/minified stable CDN releases to ensure instant loading inside the sandbox preview iframe.`,

  `## 4. Responsive Viewport & Iframe Compatibility
- The game will be embedded inside a resizable iframe in the Gamelia UI.
- Always include \`<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">\`.
- Style the canvas/container to adapt gracefully to various viewport sizes:
  - CSS: \`html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #000; display: flex; align-items: center; justify-content: center; }\`
  - Ensure the canvas scales to fit within the viewport while maintaining aspect ratio (e.g., 16:9 or 4:3 letterboxing) or fills 100% with a resize listener.
- Prevent default scrolling when using arrow keys or spacebar (\`event.preventDefault()\` on keydown for game keys) so the page inside the iframe doesn't scroll while playing.`,
];
