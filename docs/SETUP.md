# Local Development Setup Guide

This guide walks you through setting up SkyrakSys HRM on your own machine for the
first time — step by step, no assumed knowledge.

By the end you will have:
- A PostgreSQL database running locally
- The backend API running on http://localhost:5000
- The frontend running on http://localhost:3000

---

## What you need to install first

Install these tools before you start. Each link takes you to the official download page.

| Tool | Why | Download |
|------|-----|----------|
| **Node.js 18+** | Runs the backend and frontend | https://nodejs.org (choose LTS) |
| **PostgreSQL 15+** | The database | https://www.postgresql.org/download/ |
| **Git** | To clone the repository | https://git-scm.com/downloads |

After installing, verify each one by opening a terminal and running:

`ash
node -v        # should print v18 or higher
psql --version # should print PostgreSQL 15 or higher
git --version  # any version is fine
`

If any of these fail, close and reopen your terminal and try again.

---

## Step 1 — Clone the Repository

`ash
git clone https://github.com/myhrmapp/skyraksys_hrm.git
cd skyraksys_hrm
`

---

## Step 2 — Set Up the Database

### 2a. Open psql as the postgres superuser

**Windows (PowerShell):**
`powershell
psql -U postgres
`
It will prompt you for the password you set during PostgreSQL installation.

**Mac / Linux:**
`ash
sudo -u postgres psql
`

### 2b. Create the database and a dedicated app user

Paste these commands inside the psql prompt one by one:

`sql
-- Create the database
CREATE DATABASE skyraksys_hrm;

-- Create a dedicated user for the app (not the superuser)
CREATE USER hrm_app WITH PASSWORD 'ChangeMe_StrongLocal!';

-- Grant the app user full access to the database
GRANT ALL PRIVILEGES ON DATABASE skyraksys_hrm TO hrm_app;
GRANT ALL ON SCHEMA public TO hrm_app;

-- Exit psql
\q
`

> Keep the password you chose here — you will need it in the next step.

### 2c. Create the test database (needed for running tests)

`sql
CREATE DATABASE skyraksys_hrm_test;
GRANT ALL PRIVILEGES ON DATABASE skyraksys_hrm_test TO hrm_app;
`

---

## Step 3 — Configure the Backend

`ash
cd backend
cp .env.example .env
`

Now open ackend/.env in any text editor and fill in the values below.
Everything else in the file can stay as-is for local development.

`env
NODE_ENV=development
PORT=5000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=skyraksys_hrm
DB_USER=hrm_app
DB_PASSWORD=ChangeMe_StrongLocal!   # <-- the password you chose in Step 2b

JWT_SECRET=any-long-random-string-at-least-32-chars
JWT_REFRESH_SECRET=a-different-long-random-string-at-least-32-chars

SEED_DEFAULT_PASSWORD=Skyraksys123$
CORS_ORIGIN=http://localhost:3000
FRONTEND_URL=http://localhost:3000
`

> **Tip:** To generate a proper JWT secret, run this in your terminal:
> `ash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> `

---

## Step 4 — Install Backend Dependencies and Run Migrations

`ash
# Still inside the backend/ folder
npm install
`

This downloads all the libraries the backend needs (~1-2 minutes).

Then run the database migrations to create all the tables:

`ash
npx sequelize-cli db:migrate
`

You should see output like:
`
== 20260101000001-create-users: migrating =======
== 20260101000001-create-users: migrated (0.5s)
...
`

Then seed the initial data (creates the default admin accounts):

`ash
npx sequelize-cli db:seed:all
`

---

## Step 5 — Start the Backend

`ash
npm run dev
`

You should see:
`
[INFO] Server running on http://localhost:5000
[INFO] Database connected successfully
`

Verify it is working by opening http://localhost:5000/health in your browser.
You should see: {"status":"ok"}

> Leave this terminal running. Open a new terminal for the frontend.

---

## Step 6 — Configure the Frontend

In a **new terminal window**:

`ash
cd frontend
cp .env.development .env
`

Open rontend/.env and confirm it contains:

`env
REACT_APP_API_URL=http://localhost:5000/api
`

That is the only setting needed for local development.

---

## Step 7 — Install Frontend Dependencies and Start

`ash
# Inside the frontend/ folder
npm install
`

This downloads the React libraries (~2-3 minutes, the node_modules folder is large).

Then start the frontend:

`ash
npm start
`

Your browser should automatically open http://localhost:3000.

---

## First Login

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@skyraksys.com | Skyraksys123$ |
| HR Manager | hr@skyraksys.com | Skyraksys123$ |
| Manager | manager@skyraksys.com | Skyraksys123$ |
| Employee | employee@skyraksys.com | Skyraksys123$ |

---

## Running Tests

**Backend unit tests:**
`ash
cd backend
npm test
`

**Frontend E2E tests (Playwright) — backend and frontend must be running first:**
`ash
cd frontend
npx playwright test
`

---

## Troubleshooting

### "password authentication failed for user hrm_app"
The password in ackend/.env does not match what you set in PostgreSQL.
Go back to Step 2b and reset it:
`sql
ALTER USER hrm_app WITH PASSWORD 'your-new-password';
`

### "database skyraksys_hrm does not exist"
You are connected to PostgreSQL but the database was not created.
Run Step 2b again.

### "npm install" fails with EACCES or permission error (Mac/Linux)
Do not use sudo npm install. Instead, fix your npm permissions:
https://docs.npmjs.com/resolving-eacces-permissions-errors

### Port 5000 is already in use
Something else is using port 5000. Either stop that process, or change PORT=5001
in ackend/.env and update REACT_APP_API_URL=http://localhost:5001/api in rontend/.env.

### Port 3000 is already in use
React will automatically ask: "Something is already running on port 3000. Would you like to run on a different port?" — just press Y.

### Backend starts but immediately crashes
Check the backend terminal for the error message.
The most common causes are:
1. Wrong database password in .env
2. PostgreSQL is not running — start it in your system services
3. A required .env variable is missing or still has a placeholder value
