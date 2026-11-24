import { spawnSync } from "node:child_process";

const { JWT_ISSUER, JWT_SECRET } = process.env;
if (!JWT_ISSUER || !JWT_SECRET) {
  console.error("JWT_ISSUER and JWT_SECRET must be set in .env");
  process.exit(1);
}

const result = spawnSync(
  "npx",
  [
    "web-ext", "sign", "--channel=unlisted", "--source-dir=.",
    `--api-key=${JWT_ISSUER}`, `--api-secret=${JWT_SECRET}`,
    "--ignore-files", "tests/**", "specs/**", "node_modules/**", "package*.json",
    "README.md", "scripts/**", ".specify/**", ".github/**", ".env*",
  ],
  { stdio: "inherit" },
);
process.exit(result.status ?? 1);
