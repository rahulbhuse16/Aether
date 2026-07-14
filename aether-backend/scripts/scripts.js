const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "..", "src");

function walk(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const full = path.join(dir, file);

    if (fs.statSync(full).isDirectory()) {
      walk(full);
      continue;
    }

    if (!full.endsWith(".ts")) continue;

    let content = fs.readFileSync(full, "utf8");

    const currentDir = path.dirname(full);

    content = content.replace(
      /from\s+["']@\/(.+?)["']/g,
      (_, modulePath) => {
        const absolute = path.join(SRC, modulePath);

        let relative = path.relative(currentDir, absolute);

        relative = relative.replace(/\\/g, "/");

        if (!relative.startsWith(".")) {
          relative = "./" + relative;
        }

        return `from "${relative}"`;
      }
    );

    fs.writeFileSync(full, content);
    console.log("✔", full);
  }
}

walk(SRC);

console.log("Done!");