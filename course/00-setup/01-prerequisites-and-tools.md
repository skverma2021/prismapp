# Slide Script — 00-01: Prerequisites and Tools

---

## Slide 1 — What You Need Before You Clone

**Type:** `Concept`

**Headline:**
> Four things must be on your machine before a single command will work.

**Visual / layout:**
Four large icons in a row: Node.js logo, Git logo, VS Code logo, a database cylinder. Below each: version requirement. Clean, icon-focused slide.

**Narration:**
Before cloning any repository, check that four tools are installed and at the right version. Missing any one of them will produce a confusing error at exactly the wrong moment.

The four tools are Node.js, Git, a code editor (VS Code is the course default), and a way to view your PostgreSQL database. Let me go through each one.

**On-screen action / demo:**
Open a terminal and run each verification command shown on the next slide.

**Key takeaway:**
Verify all four tools before touching the repository.

---

## Slide 2 — Tool Verification Commands

**Type:** `Code`

**Headline:**
> Run these four commands. If each one returns a version number, you are ready.

**Visual / layout:**
Terminal-style code block showing four commands and their expected output ranges.

**Narration:**
Open your terminal — PowerShell on Windows, Terminal on macOS or Linux — and run each of these.

```bash
node --version    # Expected: v20.x.x or higher
npm --version     # Expected: 10.x or higher
git --version     # Expected: 2.40 or higher
```

If `node --version` returns something below v20, you need to upgrade. The easiest way is to use **nvm** (Node Version Manager) on macOS/Linux, or **nvm-windows** on Windows. With nvm installed:

```bash
nvm install 20
nvm use 20
```

The project was developed on Node v22. Node v20 LTS is the minimum. Node v18 will not work — it lacks features that Next.js 16 depends on.

For the code editor, install [VS Code](https://code.visualstudio.com) if you do not have it. The course will reference VS Code keyboard shortcuts and the integrated terminal.

**On-screen action / demo:**
Run each command in the terminal. Show the output. If node is too old, show the nvm upgrade step.

**Key takeaway:**
Node 20 LTS minimum. Node 22 is the recommended version.

---

## Slide 3 — PostgreSQL: Two Options

**Type:** `Concept`

**Headline:**
> You need PostgreSQL — either installed locally or hosted for free on Neon.

**Visual / layout:**
Two-column split. Left: "Option A — Local Install" with PostgreSQL elephant logo. Right: "Option B — Neon Cloud" with Neon logo. Below each: a 3-bullet list of what is needed.

**Narration:**
The app talks to a PostgreSQL database. You have two options for getting one.

**Option A — Install PostgreSQL locally.** Download the installer from [postgresql.org/download](https://www.postgresql.org/download/). Install version 15 or 16. During setup, set a password for the `postgres` superuser. Keep note of the port (default: 5432) and the password.

After installing, open **pgAdmin** (installed alongside PostgreSQL) or use the `psql` command-line tool to confirm the database server is running.

**Option B — Use Neon (free cloud database).** Go to [console.neon.tech](https://console.neon.tech) and create a free account. Create a new project. You will get a connection string that the app uses exactly like a local database.

Option B requires no local installation. It is simpler for students who are new to PostgreSQL. The downside is that it requires internet access while developing.

Either path is fully supported by the course.

**On-screen action / demo:**
Show the Neon console "New Project" button if taking Option B. Show pgAdmin briefly if taking Option A.

**Key takeaway:**
Pick one path — local PostgreSQL or Neon — and stick with it throughout the course.
