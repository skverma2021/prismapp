# Slide Script — 00-01: Prerequisites and Tools

---

## Slide 1 — What You Need Before You Clone

**Type:** `Concept`

**Headline:**
> Four things must be on your machine before a single command will work.

**Visual / layout:**
Four large icons in a row: Node.js logo, Git logo, VS Code logo, a database cylinder. Below each: version requirement. Clean, icon-focused slide.

**Narration:**
Before you clone any repository, check that four tools are installed. Each tool must have the right version.

If one tool is missing, you will see a confusing error at the worst moment.

The four tools are Node.js, Git, a code editor, and a way to view your PostgreSQL database. VS Code is the course default editor.

Let me go through each one.

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
Open your terminal. Use PowerShell on Windows. Use Terminal on macOS or Linux.

Now run each of these commands.

```bash
node --version    # Expected: v20.x.x or higher
npm --version     # Expected: 10.x or higher
git --version     # Expected: 2.40 or higher
```

If `node --version` returns a version below v20, you need to upgrade.

The easiest way is to use **nvm**, the Node Version Manager, on macOS or Linux. On Windows, use **nvm-windows**. With nvm installed, run these commands:

```bash
nvm install 20
nvm use 20
```

The project was developed on Node v22. Node v20 LTS is the minimum.

Node v18 will not work. It does not have features that Next.js 16 needs.

For the code editor, install [VS Code](https://code.visualstudio.com) if you do not have it. The course uses VS Code keyboard shortcuts and the integrated terminal.

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

**Option A: Install PostgreSQL locally.** Download the installer from [postgresql.org/download](https://www.postgresql.org/download/). Install version 15 or 16.

During setup, set a password for the `postgres` superuser. Write down the port. The default port is 5432. Also write down the password.

After installing, open **pgAdmin**. It is installed together with PostgreSQL. You can also use the `psql` command-line tool. Either one confirms that the database server is running.

**Option B: Use Neon, a free cloud database.** Go to [console.neon.tech](https://console.neon.tech) and create a free account. Then create a new project.

You will get a connection string. The app uses it exactly like a local database.

Option B needs no local installation. It is simpler for students who are new to PostgreSQL. The downside is that you need internet access while you develop.

The course fully supports either path.

**On-screen action / demo:**
Show the Neon console "New Project" button if taking Option B. Show pgAdmin briefly if taking Option A.

**Key takeaway:**
Pick one path — local PostgreSQL or Neon — and stick with it throughout the course.
