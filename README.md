# C20 Fieldguide

A self-hosted, responsive California C-20 HVAC, Law & Business, and EPA Section 608 study application. Runs as a single unprivileged Node.js container with no runtime package dependencies, external APIs, telemetry, or account setup.

## Included

- **15 category learning guides** covering every topic heading from the supplied CSLB outlines, with original explanations, reference links, takeaways, and completion tracking.
- **152 original multiple-choice questions** with worked explanations (24 trade, 28 law/business, 100 EPA).
- Category practice, approximate outline-weighted mixed sessions (15 trade / 20 law), optional study timers, answer review, bookmarks, and missed-question practice.
- **EPA Section 608 learning page** with Core and Types I, II, and III; 25 questions each; Core-plus-Type exams (50 questions) and Universal practice (100 questions), plus separate section study targets.
- Session resume, history, category accuracy, and JSON progress backup/import.
- Five original local SVG illustrations, responsive phone/desktop layouts, semantic forms, keyboard navigation, and no remote font/image dependencies.

These are foundational study guides, not an exhaustive textbook or official exam simulator. The finite question bank repeats across sessions; an improved score can reflect familiarity. CSLB sessions do not represent official passing scores, question counts, or timing. EPA practice uses the supplied manual’s 25-question section structure, but uses original questions and custom optional timers; its 18/25 section study targets are not a certification decision. Use the referenced technical texts, current codes, official agency resources, and field training for full preparation.

## Docker Compose

On your Docker host, from the repository directory:

```sh
docker compose up -d --build --wait
```

Visit your host on port **8085**. To change the published port:

```sh
APP_PORT=8090 docker compose up -d --build --wait
```

Check or stop:

```sh
docker compose ps
docker compose logs --tail=100
docker compose down
```

The built-in `/health` endpoint reports process readiness. The container runs as `node`, with a read-only filesystem, dropped capabilities, no new privileges, a 128 MB memory limit, and log rotation. No database or application data volume is needed. The application is completely local after the image is built. Initial build needs access to Docker Hub for `node:24-alpine`.

## Portainer (Docker Standalone endpoint)

Portainer's web editor does **not** build a local Dockerfile. Build the image on the **same Docker endpoint** managed by Portainer first:

```sh
git clone https://github.com/bl1tzkr13g/HVAC.git
cd HVAC
docker build -t c20-fieldguide:local .
```

The repository must contain these new application files before a fresh clone can use them. When deploying from a working copy, run only the build command in that copy.

1. Open **Stacks → Add stack**, name it `c20-fieldguide`, and use **Web editor**.
2. Paste [portainer-stack.yml](portainer-stack.yml).
3. Optionally add `APP_PORT` (default `8085`) under stack environment variables.
4. Deploy the stack. Open the Docker host's address on the chosen port.

This stack uses `pull_policy: never` because the image is local; no public image is published. If Portainer manages a remote endpoint, build on that endpoint or push to your own registry, replace `image:` with the registry image, and change `pull_policy` to `always` (configure registry authentication in Portainer as needed). This file targets Docker Standalone, not Docker Swarm.

For updates, rebuild the image from the updated files and recreate/redeploy the service. The image's `/health` check should become healthy before use.

## Data and access

Progress is stored in **localStorage in each browser and origin**, including completed lessons, question bookmarks, the unfinished session, and up to 500 completed sessions. There are no shared accounts or server-side student records. Changing the hostname/port, switching browsers, using private browsing, or clearing browser data can lose progress. Use **Your progress → Export backup** and import it on the new browser. Import replaces current progress after confirmation. Export includes study answers but no credentials.

For internet access, terminate HTTPS at your reverse proxy; use proxy authentication if you want private access. The app itself has no login. Forward to container port 8080. Serving from the hostname root is supported; a URL subpath requires proxy rewriting and is not configured here. The service does not need external credentials or outbound network at runtime.

## Local development

Use Node.js 22 or newer (Node 24 is used by the image). No dependency install is necessary:

```sh
npm start
npm test
npm run check
```

`PORT` changes the native server port; the container expects its default 8080. Use `APP_PORT` to change only Docker's published host port. Edit `public/content.js` for C-20/law lessons/questions or `public/epa-content.js` for EPA content and `public/app.js` / `public/style.css` for the interface. Static assets are served without a build step.

### Browser verification (optional developer tools)

The smoke runner uses Playwright and a local Chromium. Install them on the test machine if absent (they are not needed to run the app):

```sh
npm install --no-save --package-lock=false playwright@1.62.1
# Install Chromium through your OS package manager, or set CHROMIUM_PATH to an existing browser.
CHROMIUM_PATH=/usr/bin/chromium node scripts/browser-smoke.cjs
```

Start the application first. For the Docker deployment use `APP_URL=http://127.0.0.1:8085 node scripts/browser-smoke.cjs` (or `scripts/epa-smoke.cjs`). The runners default to the native server at `http://127.0.0.1:8080`. The browser test checks search, lesson completion, saved progress, answer locking/scoring, bookmarks, timed exam expiration, resume, backup/import, and mobile overflow. It writes disposable screenshots/backups under `/tmp`. The `--no-sandbox` browser argument is for container-based test machines; this script is for local test use only.

## Source edition and content maintenance

The user supplied:

- `C20StudyGuide.pdf`: 13E-20 (01-2026), effective for exams on/after April 1, 2026; publisher information current March 2026. Trade weights: planning 22%, fabrication/installation/startup 38%, troubleshooting/repair/maintenance 20%, safety 20%.
- `LawStudyGuide.pdf`: 13E-LAW (03-2026), applicable to exams on/after December 1, 2021. Law/business weights: organization/licensing 13%, finances 15%, employment 20%, insurance/liens 12%, contracts 21%, public works 5%, safety 14%.
- `2026_CSLB_Law_Book.pdf`: California Contractors License Law & Reference Book, 2026 edition. Selected legal summaries checked against printed pp. 11–12 (contracts/payments), 19 (bonds), 22–23 (workers’ compensation/reporting), and 51–53 (notices/liens), with relevant statutory references.

Original practice items are **not official CSLB questions**. The outlines define coverage and weights; they do not verify every technical answer. Original trade lessons draw on standard HVAC principles and direct readers to the technical resources listed by CSLB (ACCA, ASHRAE, SMACNA, California codes, Cal/OSHA, and EPA). Do not use conceptual illustrations as installation instructions.

The original PDFs are not included or served; no full copyrighted reference book is redistributed. External CSLB pages were blocked by the authoring environment's network policy and were not independently retrieved. Before relying on legal rules or code requirements in the field, check current statutes, effective dates, local amendments, manufacturer instructions, and the authority having jurisdiction. This application is independent of CSLB and makes no passing guarantee.

## Validation in the development environment

- Ten Node test cases: category totals, question integrity, weighted sampling over 300 generated exams, scoring/missed-answer resolution, backup/session validation, HTTP delivery, methods, and path handling; EPA path membership, individual section targets, and existing-backup compatibility.
- Chromium C-20 smoke flow on desktop and seven mobile routes, plus EPA flows on desktop and nine mobile routes.
- Docker image build, Compose startup/health, and functional requests.

No deployment to a user's external host, registry push, or live Portainer UI operation is performed by these checks.

## EPA Section 608 addition

Open **EPA certification** in the main navigation for the dedicated learning page. The same four lessons are available under **Learning library → EPA Section 608**. **Practice tests → EPA Section 608** offers:

| Preparation path | Sections | Questions | Optional custom timer |
| --- | --- | --- | --- |
| Universal | Core + Types I, II, III | 100 | 120 minutes |
| Type I | Core + Type I | 50 | 60 minutes |
| Type II | Core + Type II | 50 | 60 minutes |
| Type III | Core + Type III | 50 | 60 minutes |

Individual lesson/category practice includes all 25 questions in that section with immediate answer checks. Path exams reveal explanations after submission. Each section is scored separately against an **18/25 study target**, drawn from the supplied historical manual’s preparation approach. A high total average cannot mask a section below the target. The app does not administer an EPA-approved exam, grant certification, or verify current provider passing/admin rules.

EPA lessons are original summaries of the user-supplied **ESCO 608PrepManual.pdf, copyright 2001**, including the introduction, Core printed pp. 1–5, Type I pp. 6–7, Type II pp. 8–10, and Type III pp. 11–12. They cover ozone/ODP, Clean Air Act and Montreal Protocol concepts, the three Rs, recovery devices and techniques, refrigerants/oils, dehydration, cylinders, safety/shipping, appliance-specific recovery, leak detection, purge systems, and freezing hazards. Printed-page references are shown with lessons.

The edition date is displayed prominently. Its old penalties, blanket sales restrictions, future phaseout schedules, 15%/35% leak thresholds, and example recovery/charging values are **not presented as current universal requirements**. Regulatory-number questions based on these outdated rules are intentionally excluded. EPA’s site was blocked by the authoring network, so current legal and approved testing requirements were not independently verified. Follow the linked EPA resources, actual refrigerant safety information, applicable standards, and manufacturer procedures before field work. The manual PDF is not redistributed.

Existing C-20/law v1 browser progress and backups remain compatible. EPA attempts, bookmarks, completion, and exam scope use the same storage and backup system. No additional dependency, environment variable, data volume, or Portainer change is needed. Rebuild and redeploy the existing image to install this update:

```sh
docker compose up -d --build --wait
```

Additional EPA browser verification (requires Playwright/Chromium as above):

```sh
node scripts/epa-smoke.cjs
```

This checks a 25-question section quiz, 50-question Type II path, 100-question Universal path, section scoring with an intentionally weak Core, session resume, timer configuration, previous C-20 progress retention, backup/import, and phone layouts. The 100-question EPA bank is finite; a Universal practice session uses every EPA question and subsequent sessions randomize the same bank rather than inventing unseen items.
