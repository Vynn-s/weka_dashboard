# Deployment Guide

## Project Type

This project is a static HTML/CSS/vanilla JavaScript dashboard.

Vercel settings:

- Framework Preset: `Other`
- Build Command: leave empty
- Output Directory: leave empty or use `.`
- Install Command: leave empty
- Development Command: optional, use `python3 -m http.server 8000` locally

## Files Required For Deployment

The deployed site needs these files in the repository root:

- `index.html`
- `styles.css`
- `script.js`
- `model_metrics.json`
- `IBM_HR_Attrition_Preprocessed.csv`

The dashboard loads Chart.js from the CDN at `https://cdn.jsdelivr.net/npm/chart.js`.

## Environment Variables

No environment variables are required.

An `.env.example` file is not needed because the application does not read `process.env`, `import.meta.env`, `VITE_*`, `NEXT_PUBLIC_*`, or any runtime secret values.

## Local Verification

Run these commands from the project root:

```bash
node --check script.js
node -e "JSON.parse(require('fs').readFileSync('model_metrics.json','utf8')); console.log('valid json')"
python3 -m http.server 8000
```

Open:

```text
http://localhost:8000
```

## Push To GitHub

If the repository already has a GitHub remote configured:

```bash
git status
git add index.html styles.css script.js model_metrics.json DEPLOYMENT.md .gitignore IBM_HR_Attrition_Preprocessed.csv J48 RandomForest Logistic SMO NaiveBayes
git commit -m "Prepare static WEKA dashboard for Vercel deployment"
git push origin main
```

If your branch is not `main`, replace `main` with your current branch name.

If no GitHub remote exists yet:

```bash
git remote add origin https://github.com/<your-username>/<your-repository>.git
git branch -M main
git push -u origin main
```

## Deploy On Vercel

1. Go to `https://vercel.com/new`.
2. Import the GitHub repository.
3. Set Framework Preset to `Other`.
4. Leave Build Command empty.
5. Leave Install Command empty.
6. Leave Output Directory empty, or set it to `.` if Vercel asks for a value.
7. Do not add environment variables.
8. Click `Deploy`.

## Optional Vercel CLI Deployment

```bash
npm i -g vercel
vercel login
vercel
vercel --prod
```

When prompted, choose no framework or `Other`, no build command, and current directory as the static output.

## Notes And Warnings

- `vercel.json` is not required for this project because there are no rewrites, headers, serverless functions, or custom build outputs.
- There is no `package.json` because the project has no bundled dependencies. Chart.js is loaded from a CDN.
- The deployed dashboard requires internet access to load Chart.js from jsDelivr.
- `model_metrics.json` must stay in the project root because `script.js` fetches it with a relative path.
- If you later add npm dependencies or a bundler, create a `package.json` and update the Vercel build settings accordingly.
