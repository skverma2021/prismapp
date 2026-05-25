import { readFileSync, writeFileSync } from "fs";

const b = String.raw`C:\uProj-MIS\next\prismapp\course`;

const HDR = `<!--
  Speaker notes file. Copy narration into Camtasia or PPT notes panel before recording.
-->

---

`;

const splits = [
  ["A", "scope",      "# 04 ",      "Section A1 - Speaker Notes (Part 1)", "Section A2 - Speaker Notes (Part 2)"],
  ["B", "erd",        "# 04 ",      "Section B1 - Speaker Notes (Part 1)", "Section B2 - Speaker Notes (Part 2)"],
  ["C", "technology", "## C-04 ",   "Section C1 - Speaker Notes (Part 1)", "Section C2 - Speaker Notes (Part 2)"],
  ["D", "crud",       "## D-05 ",   "Section D1 - Speaker Notes (Part 1)", "Section D2 - Speaker Notes (Part 2)"],
  ["E", "hardening",  "## E-04 ",   "Section E1 - Speaker Notes (Part 1)", "Section E2 - Speaker Notes (Part 2)"],
  ["F", "reporting",  "## F-05-01", "Section F1 - Speaker Notes (Part 1)", "Section F2 - Speaker Notes (Part 2)"],
];

for (const [sec, nm, needle, l1, l2] of splits) {
  const src = `${b}\\${sec}-${nm}\\slides\\${sec}-${nm}-notes.md`;
  const raw = readFileSync(src, "utf8");
  const idx = raw.indexOf(needle);
  if (idx < 0) { console.error(`NOT FOUND: ${sec}-${nm} '${needle}'`); continue; }
  const p1 = `# ${l1}\n${HDR}` + raw.slice(0, idx).trimEnd();
  const p2 = `# ${l2}\n${HDR}` + raw.slice(idx).trimStart();
  writeFileSync(`${b}\\${sec}1-${nm}\\slides\\${sec}1-${nm}-notes.md`, p1, "utf8");
  writeFileSync(`${b}\\${sec}2-${nm}\\slides\\${sec}2-${nm}-notes.md`, p2, "utf8");
  console.log(`Split ${sec}-${nm} OK`);
}
