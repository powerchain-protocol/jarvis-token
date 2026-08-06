import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(
    path,
    `${JSON.stringify(value, (_key, item) =>
      typeof item === "bigint" ? item.toString() : item, 2)}\n`,
    { encoding: "utf8", flag: "wx" },
  );
}
