/**
 * Write the JSON Schema files from the declarations in src/schema.ts: `bun run schema`.
 * `bun run schema --check` fails when a committed file is stale.
 */
import { join } from "node:path";
import { z } from "zod";
import { namesSchema, recordSchema } from "../src/schema";

const check = process.argv.includes("--check");
const targets = [
  { file: "doi-record.schema.json", title: "NEMAR DOI registry record", schema: recordSchema },
  { file: "names.schema.json", title: "NEMAR DOI registry name table", schema: namesSchema },
];

let stale = 0;
for (const { file, title, schema } of targets) {
  const path = join(import.meta.dir, "..", "schema", file);
  const document = {
    $id: `https://doi.nemar.org/schema/${file}`,
    title,
    ...z.toJSONSchema(schema),
  };
  const text = `${JSON.stringify(document, null, 2)}\n`;
  const current = (await Bun.file(path).exists()) ? await Bun.file(path).text() : null;
  if (current === text) continue;
  if (check) {
    console.error(`schema/${file} is stale: run "bun run schema" and commit the result`);
    stale += 1;
  } else {
    await Bun.write(path, text);
    console.log(`wrote schema/${file}`);
  }
}
if (stale > 0) process.exit(1);
