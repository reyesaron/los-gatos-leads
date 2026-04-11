# Los Gatos Construction Leads

Internal tool for tracking pending planning projects from the Town of Los Gatos. Scrapes and displays project data from [losgatosca.gov](https://www.losgatosca.gov/2216/Pending-Planning-Projects) with lead scoring, filtering, and direct links to city documents.

## Features
- **Lead scoring (1–10)** based on scope, recency, and approval status
- **Filtering** by category, minimum score, and free-text search
- **Direct links** to project pages and plan PDFs on losgatosca.gov
- **Square footage tracking** fields for existing/proposed (populated from plan review)
- **A–Z navigation** to browse all street pages on the city website

## Tech Stack
- Next.js 14 (App Router)
- React 18
- Deployed on Vercel

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure
```
src/
  app/           # Next.js app router
  components/    # LeadsApp UI component
  data/          # Project data + scoring logic
```

## Adding Projects
Edit `src/data/projects.js` to add or update project entries.
