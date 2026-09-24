# Northstar Learning

A React + Express + MySQL course enrollment website starter for a modern training institute.

## Included

- Responsive public homepage with mobile-first layout
- Database-backed course catalogue with search and category/level filters
- Course detail view with outcomes, curriculum, instructor, pricing and batch details
- Enrollment application form with pay-later or card preference
- Express API for courses, health checks and enrollment records
- MySQL schema and seed data for Digital Marketing, SEO, Content Writing and Web Development
- Vite development proxy and production build

## Run locally

1. Install Node.js 18+ and MySQL 8+.
2. Install dependencies: `npm install` in the root, then `npm install` in `frontend` and `backend`.
3. Create the database and seed the four courses: `mysql -u root -p < database/schema.sql`
4. Copy `.env.example` to `.env` and set the database values.
5. Start both apps from the root: `npm run dev`
6. Open `http://localhost:5173`

The frontend lives in `frontend/` and the API lives in `backend/`. Deploy `frontend/` as its own Vercel project. Deploy `backend/` as its own Node service on Render or Railway, and set `VITE_API_URL` in the Vercel project to the deployed API URL. Provision MySQL separately through Railway or PlanetScale, then provide the database connection variables to the backend service. The backend keeps database credentials in its environment variables.

The frontend includes a demo fallback if MySQL is not running, so the visual experience can be reviewed before database setup. When MySQL is connected, course cards and enrollments use the API records.

## Production direction

The schema is intentionally ready for the next delivery phases: users/roles, batches, payments, payment receipts, reviews, FAQs, blog posts and admin audit logs should be added as separate tables. Payment gateway credentials, SMTP credentials, CAPTCHA keys, analytics IDs and HTTPS belong in environment variables and should never be committed.

## Recommended delivery estimate

- Phase 1: wireframes and visual system, 3-4 working days
- Phase 2: public frontend and responsive QA, 5-7 working days
- Phase 3: authentication, batches and enrollment workflow, 7-10 working days
- Phase 4: payment integrations and role-based admin panel, 8-12 working days
- Phase 5: SEO, security, performance and acceptance testing, 4-6 working days
- Phase 6: deployment, training and handover, 2-3 working days

A realistic full launch estimate is 6-8 weeks for a small team. A custom React/Express/MySQL stack is recommended here because it keeps the student experience fast and flexible while giving the owner a proper admin surface; hosting, email, payment gateway and maintenance costs should be quoted separately after the launch scope is confirmed.

## Phase 6: deployment and handover

The repository includes a Render deployment blueprint in `render.yaml` for the backend API. Create the Vercel project with `frontend/` as its root directory. Set these environment variables in the hosting dashboards before the first deploy:

- `NODE_ENV=production`
- `JWT_SECRET` to a long, randomly generated value
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` and `DB_NAME`
- `PORT` is provided by the hosting platform
- `VITE_API_URL` is the public backend URL in Vercel

### Launch checklist

1. Provision MySQL 8 through Railway or PlanetScale and run `database/schema.sql` once.
2. Create the first admin account by registering, then set its `role` to `admin` in MySQL.
3. Deploy from the repository and confirm `/api/health` returns `{"ok":true,"database":"connected"}`.
4. Test registration, login, email verification logging, enrollment, admin approval and student dashboard access with non-production test data.
5. Configure the production domain, HTTPS, database backups and transactional email before accepting real enrollments.

### Owner handover

- Use the Admin button to manage courses, batches, instructors and enrollment statuses.
- Export the student list from the Students section before making database changes.
- Keep database credentials, JWT secrets, payment keys and SMTP credentials only in the hosting provider's environment settings.
- Take a database backup before schema changes or bulk data edits.
