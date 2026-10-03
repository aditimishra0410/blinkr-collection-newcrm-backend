# Blinkr Collection Backend (naya)

PayTracker (collection) ka naya, clean backend. Ye file poora context rakhti hai: kyun bana rahe hain,
kaise bana rahe hain, kahan tak pahunche hain, aur aage kya karna hai.

> **Agle session me Claude ke liye:** ye file poori padh lo, khaas kar "Kaam karne ka tareeka"
> wala section. Usme likha hai ki mujhe code likh ke nahi dena hai, sirf guide karna hai.

---

## 1. Background: ye project kyun

- Purana backend: `~/Projects/Work/blinkr_crm_backend` (Node + Express 4 + Prisma + PostgreSQL)
- Usme teen cheezein ek saath thi: **loansphere** (loan dena), **paytracker** (collection), **insights** (analytics)
- Ab **loansphere alag ho chuka hai** (apna alag backend)
- Mera kaam sirf **collection** ka hai, isliye collection ka backend naya aur clean likh rahi hoon

**Purane code ki dikkatein (jo naye me repeat nahi karni):**

| Problem | Purane code me |
|---|---|
| Bahut badi files | `leadController.js` 10,688 lines, `adminDashboardController.js` 8,092 lines |
| Sab kuch ek function me | route + validation + business logic + DB, sab ek jagah |
| Hardcoded token | `Middlewares/employee.js:27` me `prem@toekn12345` (backdoor) |
| Rate limiting band | `server.js` me limiter bana hua hai par `app.use` comment kiya hua hai |
| Kai `new PrismaClient()` | DB connections waste hote hain |
| `.env` ke bina server chal jata hai | Error baad me, request ke time aata hai |
| Response format alag-alag | Har API apna shape bhejti hai |
| Tests na ke barabar | Sirf 2 test files |
| Repo me real data | `utils/bsa.js` me asli PAN/account details commit hain |

---

## 2. Team ke saath tay hui baatein (design ki neev)

1. **Database same rahega** — loan ka bahut data hai, DB change nahi kar sakte. Loansphere backend aur
   collection backend, dono **ek hi PostgreSQL** use karenge.
2. **DB structure nahi badlega** — koi `prisma migrate` nahi. Sirf `prisma db pull` (existing DB se schema padho).
3. **JWT same rahega** — same `CRM_JWT` secret, same cookie naam `employee_jwt`, same token payload
   `{ id, email, roles }`. Isse purane aur naye backend ka token dono jagah chalega (migration ke dauraan zaroori).
4. ~~API ka format same rahega~~ → **Badla (29 Sep 2026): naya frontend bhi ban raha hai**, isliye
   URL naye aur saaf: `/api/v1/<module>/...` (purana `/api/paytracker/v1/...` copy nahi kiya).
   Naye APIs ka response shape `{ success, message, data }`. Login ka response abhi purane jaisa hai
   (`{ message, token, employee }`). **JWT format (rule 3) abhi bhi same** — token dono backend me chalna chahiye.

**Dependency ka sach:** collection backend loansphere ke **code** pe depend nahi karta (dono ek doosre ko
call nahi karte). Depend karta hai **DB ke structure aur data ke matlab** pe. Isliye dhyan rakhna:
- status/stage values ki list (koi nayi value add ho to pata hona chahiye)
- calculations (DPD, penalty, repayment amount) dono backends me alag na ho jayein

---

## 3. Tables: kiski kya

Purane paytracker code se nikala hua (kitni baar use hui, uske saath):

| Sirf PADHNI hain (loansphere ki) | Likh bhi sakte hain (collection ki) |
|---|---|
| `Lead` (28+), `Sanction` (9+), `Disbursal` (9+), `Customer` | `Collection`, `Payment`, `collection_logs`, `collection_ptp` |
| `Employee` (27+, shared), `Role`, `Employee_Role` | `collection_agency*`, `collection_disposition`, `collection_assignment` |
| `Bank_Statement_Report`, `references`, `location` | `settlement_requests`, `settlement_events`, `customer_remarks` |

**Rule:** loan tables sirf read. Payment aane pe loan status update karna ho to team se confirm karke karna.

---

## 4. Architecture

### Folder structure (feature-based)

```
collection-backend/
├── src/
│   ├── server.js              # sirf server start + graceful shutdown
│   ├── app.js                 # express app: middlewares + routes + 404
│   ├── routes.js              # saare modules yahan mount honge
│   ├── config/env.js          # .env padho aur CHECK karo
│   ├── lib/
│   │   ├── prisma.js          # SIRF EK PrismaClient poore app me
│   │   └── logger.js
│   ├── middlewares/
│   │   ├── auth.js            # authenticate + authorizeRoles
│   │   ├── validate.js        # request body/query check (Joi)
│   │   └── errorHandler.js    # saare errors yahan aayenge
│   ├── utils/
│   │   ├── ApiError.js
│   │   └── asyncHandler.js
│   └── modules/               # ASLI KAAM YAHAN
│       ├── auth/              # auth.routes.js | auth.controller.js
│       │                      # auth.service.js | auth.validation.js
│       ├── portfolio/
│       ├── payment/
│       ├── ptp/
│       ├── settlement/
│       ├── collection-agency/
│       └── report/
├── prisma/schema.prisma
├── tests/
├── .env.example               # kaunse variables chahiye (values ke bina) — commit hoti hai
└── .gitignore                 # .env, node_modules, uploads, *.log
```

### Har module ke 4 layers

```
Request
  ↓
routes.js      → kaunsa URL, kaunsa guard, kaunsa controller   (sirf wiring)
  ↓
validation.js  → input sahi hai? (Joi schema)
  ↓
controller.js  → req se data lo → service ko do → res bhejo    (patla, 5-10 lines)
  ↓
service.js     → asli business logic (req/res ka naam bhi nahi hoga yahan)
  ↓
prisma         → database
```

**Service me `req`/`res` kyun nahi:** tab wo normal JS function rehta hai — test karna aasaan, aur
cron/script se bhi call kar sakte hain.

---

## 5. Tech stack

| Cheez | Version / choice | Note |
|---|---|---|
| Node | v24 (local) | Purana repo Node 18 pe hai (ab unsupported) |
| Express | **5.x** | ⚠️ Purana repo Express 4 pe hai. Express 5 me async errors apne aap error handler tak jaate hain, isliye `asyncHandler` optional ho sakta hai |
| Language | JavaScript (ESM, `"type": "module"`) | TypeScript baad me, abhi Express seekhna priority |
| DB | PostgreSQL + Prisma | `db pull` only, koi migration nahi |
| Validation | Joi | Purane repo me bhi Joi hai |
| Auth | jsonwebtoken + bcrypt | purane jaisa hi |
| Logging | winston | |
| Tests | `node:test` (built-in) + supertest | geoFence test purane repo me isi se bana hai |
| Format | ESLint + Prettier | |

---

## 6. Best practices (in par samjhauta nahi)

1. `.env` startup pe check karo — variable missing ho to server start hi na ho (`config/env.js`)
2. Code me kabhi secret/token/password mat likho — sab `.env` me
3. `PrismaClient` sirf ek baar (`lib/prisma.js`), har jagah wahi import
4. Ek file ~300 lines se badi ho jaye to tod do
5. Har response ek hi shape me: `{ success, message, data }`
6. Errors ke liye `ApiError` + ek central `errorHandler` (har controller me alag try/catch nahi)
7. `/login` pe rate limit zaroor
8. Test/scratch code `tests/` me, file ke top pe `console.log` bilkul nahi
9. Real customer data (PAN, mobile, account) na commit, na logs me
10. **Paisa:** `prisma.$transaction` use karo, `Decimal` use karo (JS `number` nahi),
    payment webhooks me duplicate check (idempotency)
11. Raw SQL me hamesha tagged template (`` prisma.$queryRaw`...${id}` ``), string joker kabhi nahi (SQL injection)
12. Time: DB me UTC, dikhane me IST. Ek hi helper se convert karo. API me hamesha `toISOString()`

---

## 7. Migration ka tareeka (strangler pattern)

Sab kuch ek saath dobara mat likho. Ek-ek module naye backend me le jao; purana backend chalta rahe;
jo module ready ho jaye, frontend usi ka URL badle. Isse production kabhi nahi tootega.

Har module ke liye process:
1. Purana route + controller padho: API karti kya hai?
2. Likho: input kya, output kya, kaunsi tables
3. Naye structure me likho (routes → validation → controller → service)
4. Purani aur nayi API ka response **compare** karo (contract testing)
5. Review karao, phir frontend switch

---

## 8. Roadmap

| Phase | Kya | Status |
|---|---|---|
| 0 | Team se sawaal, repo setup | ✅ Done |
| 1 | Skeleton: app/server, env config, error handling, security middlewares | ✅ Done |
| **2** | **Prisma connect: `db pull`, sirf zaroori models, ek read query** | ✅ Done |
| **3** | **`auth` module: login, guard middleware, profile, logout** | ✅ Done |
| **4** | **Pehla asli module (read-only): location (State → City → Pincode)** | 🟡 **Chal raha hai** |
| 5 | Portfolio, dashboard, reports | ⬜ |
| 6 | PTP, disposition, assignment (write) | ⬜ |
| 7 | Payment, settlement (sabse aakhir — paisa) | ⬜ |

### Phase 1 ke steps

| Step | Kya | Status |
|---|---|---|
| 1 | Project setup + `app.js` + `server.js` + `/health` | ✅ Done |
| 2 | `config/env.js` — `.env` validate karna | ✅ Done |
| 3 | `ApiError` + central `errorHandler` | ✅ Done |
| 4 | CORS, rate limit, logger (winston) | ✅ Done |

---

## 9. Abhi kahan hoon (3 Oct 2026)

**Phase 1 / Step 1 — ✅ COMPLETE (commit `899477f`, GitHub pe push ho chuka)**

Repo: `git@github.com:aditimishra0410/blinkr-collection-newcrm-backend.git`

- `npm init`, `"type": "module"`, scripts: `dev` (`node --watch`), `start`
- `.gitignore` (node_modules, .env, uploads, *.log)
- Packages: express, helmet, cookie-parser, dotenv
- `src/app.js` — helmet → express.json(1mb) → cookieParser → `/` → `/health` → 404 handler → export
- `src/server.js` — PORT (env se, fallback 3000), `const server = app.listen(...)`,
  `shutdown(signal)` function + `process.on` SIGINT aur SIGTERM dono ke liye ✅ (test ho chuka)

**Chhoti cheezein jo pending hain:** kuch jagah `;` missing; `/` route text bhejta hai (JSON kar sakte hain)

**Phase 1 / Step 2 — ✅ COMPLETE (commit `1b5e832`, push ho chuka)**
- `.env` (PORT=8080, NODE_ENV=development) — commit nahi hoti; `.env.example` (values ke bina) — hoti hai
- `src/config/env.js`: `dotenv.config()` → `required` naamon ki list → `filter` se missing nikalo →
  missing ho to error + `process.exit(1)` (fail fast) → `{ port, nodeEnv }` object `export default`
- `server.js` ab `import env from "./config/env.js"` karke `env.port` use karta hai
- **Rule:** `process.env` ko poore app me sirf `config/env.js` chhuegi. Naya variable chahiye to
  usi file me `required` list aur `env` object dono me add karo.

**Phase 1 / Step 3 — ✅ COMPLETE (commit `5a19ab0`, push ho chuka)**
- `src/utils/ApiError.js` — `class ApiError extends Error`, `super(message)` + `this.statusCode`
- `src/middlewares/errorHandler.js` — `(err, req, res, next)` (4 parameters se hi Express ise
  error handler maanta hai), `err.statusCode || 500`, `err.message || "Internal Server Error"`,
  `console.error(err)` sirf server logs me, client ko `{ success: false, message }`
- `src/app.js` ka order: middlewares → routes (`/`, `/health`, `/boom`) →
  404 (`next(new ApiError(404, ...))`) → `app.use(errorHandler)` **sabse last** → export
- Sikha: Express upar se neeche chalta hai — 404 handler ke **baad** likha route kabhi match nahi hota
- `next(error)` me kuch pass karte hi Express baaki middlewares chhod ke seedha error handler pe jata hai
- Note: **Express 5** me async controller ka error apne aap error handler tak chala jata hai,
  isliye purane repo wala `asyncHandler` (Express 4 ke liye tha) yahan zaroori nahi
- `/boom` test route abhi rakha hai (Step 4 me kaam aayega), Phase 1 ke end me delete karna hai

**Phase 1 / Step 4 — ✅ COMPLETE (commit `c6dd3a5`, push ho chuka) → PHASE 1 KHATAM 🎉**
- **CORS** (`src/app.js`): `cors({ origin: env.allowedOrigins, credentials: true })`, helmet ke ठीक baad.
  `ALLOWED_ORIGINS` `.env` me comma-separated string hai; `config/env.js` me `.split(",")` se array banti hai
  (array zaroori hai — string dene par cors poori list ek header me bhej deta hai, jo browser reject karta hai).
  `credentials: true` isliye ki login cookie cross-origin ja sake.
- **Rate limit** (`src/middlewares/rateLimiter.js`): named exports `generalLimiter` (12 min / 100)
  aur `loginLimiter` (12 min / 5, Phase 3 me lagega). `app.set("trust proxy", 1)` bhi lagaya hai,
  warna proxy ke peeche har request ka IP ek jaisa dikhta hai.
- **Logging**: `src/lib/logger.js` — winston, level production me `info` warna `debug`,
  format `timestamp + json`, transport Console. `src/app.js` me morgan (`"tiny"`) ka output
  `stream.write` se winston me jata hai, taaki request logs bhi usi format me rahen.
  `server.js` aur `errorHandler.js` ab `console` ki jagah `logger` use karte hain
  (`config/env.js` ka `console` waisa hi hai — wo logger banne se pehle chalti hai).

**Phase 1 ka natija:** ek chalta hua, secure, clean skeleton — `/health`, 404, central error handling,
CORS, rate limit aur proper logging ke saath. Ab DB aur asli modules ka kaam shuru.

**Ab chal raha hai: Phase 2 — Prisma + database**

**Local dev database (ho gaya ✅)**
- Production/real DB ko local pe **kabhi** copy nahi kiya — sirf schema use kiya, data nahi.
- Postgres: `brew install postgresql@16`. Port **5433** (5432 pe pehle se ek doosra embedded
  Postgres chalta hai — `~/Projects/Work/Extra Folders/blinkrextra/local-db`, user `kuber`,
  db `kubercash_crm` — usse takraav se bachne ke liye).
  Port badla: `echo "port = 5433" >> /opt/homebrew/var/postgresql@16/postgresql.conf`
- DB: `createdb -p 5433 collection_dev`. `psql`/`createdb` me hamesha `-p 5433` lagana.
- `.env`: `DATABASE_URL=postgresql://aditimishra@localhost:5433/collection_dev`
- PATH me: `/opt/homebrew/opt/postgresql@16/bin` (keg-only formula hai)

**Prisma (ho gaya ✅)**
- Version **6.8.2 pin kiya** (purane repo jaisa hi). `prisma init` ne pehle Prisma 8-rc/7 laga diya tha —
  CLI aur client ke version mismatch ki wajah se commands fail ho rahe the. "Update available 8.0.0-rc"
  wala message **ignore karna hai**.
- Schema **poori copy** ki (141 models), trim nahi kiya — DB shared hai, to schema uska aaina honi chahiye.
  Kal `db pull` se refresh karna aasaan rahega.
- `datasource.url` ko `env("PROD_DB")` se **`env("DATABASE_URL")`** kiya — zaroori, warna galti se
  production DB pe push ho sakta tha.
- ⚠️ **PostGIS workaround:** 3 `Unsupported("geography")` fields (Lead, fraud_cases,
  blacklisted_location) aur `blacklisted_location` ka `@@index([location])` **comment kiye hain**.
  `geography` PostGIS extension se aata hai, jo local Postgres@16 me nahi hai (brew ka postgis
  doosre Postgres version ke liye bana). Ye columns app kahin use nahi karta.
  **Jab kabhi `prisma db pull` chalao, ye lines wapas aa jayengi — dobara comment karna padega.**
- `npx prisma db push` → local DB me **140 tables** ban gayi + Prisma client generate ho gaya

**Prisma client + DB check (ho gaya ✅, commit `9bca205`)**
- `src/lib/prisma.js` — poore app me ek hi `PrismaClient` (`log: ["warn", "error"]`), `export default`
- `server.js` — listen se **pehle** `await prisma.$connect()` (top-level await). Fail ho to
  `logger.error("...", { reason: error.message })` + `process.exit(1)`. Poora `error` log nahi karte
  (usme DB URL aa sakta hai).
- `shutdown()` — `server.close(async () => { await prisma.$disconnect(); ...; process.exit(0) })`.
  Order: pehle nayi requests band → phir DB → phir exit.
- Shutdown guard: `let shutdownWindow` flag, taaki signal kai baar aaye to bhi shutdown ek hi baar chale
- `GET /health/db` — `` prisma.$queryRaw`SELECT 1` ``, route ke **andar** `try/catch`;
  DB band ho to `throw new ApiError(503, "Database is not reachable")` (andar ka Prisma message bahar nahi jata)
- `/boom` test route hata diya

**Fake seed data (ho gaya ✅, commit `6a0c1b4`) — `prisma/seed.js` → PHASE 2 KHATAM 🎉**

Maqsad: Phase 3 (login) test karne ke liye local DB me ek **nakli** employee jiske paas valid role ho.
Asli customer/employee data kabhi nahi.

Purana login (`controllers/paytracker/v1/controller.auth.js`) kya check karta hai → isliye ye 3 tables:

| Table (Prisma me) | Kya daalna hai | Status |
|---|---|---|
| `Role` (`prisma.role`) | `role_name: "COLLECTION-EXECUTIVE"` (login sirf `COLLECTION-HEAD`, `COLLECTION-EXECUTIVE`, `ADMIN`, `ACM` allow karta hai) | ✅ ban gaya (`id: 1`) |
| `Employee` (`prisma.employee`) | `emp_id: "EMP-TEST-001"`, `email: "test.exec@example.com"`, `password`: **bcrypt hash** of `Test@123`, `f_name: "Test"`, `l_name: "Executive"`, `gender: "F"` (`M/F/O`), `is_logged_in: false` | ✅ (`id: 1`) |
| `Employee_Role` (`prisma.employee_Role`) | `employee_id` + `role_id` (upar wali dono `id`) | ✅ |

**Test login:** `test.exec@example.com` / `Test@123` (sirf local, nakli)

- Har jagah `upsert` (`where` / `update` / `create`), `create` nahi — taaki seed kai baar chalane pe duplicate/error na aaye
- `Employee_Role` ka `where` compound key se: `employee_id_role_id: { employee_id, role_id }`
- `update: {}` = "row mil gayi to kuch mat badlo" (Prisma me `update` key zaroori hai, isliye khaali object)
- Employee ka `update: { password }` — seed dobara chalao to password `Test@123` pe reset ho jata hai
- `bcrypt` (`^6.0.0`) install
- Chalana: `node prisma/seed.js` (kitni baar bhi chalao, duplicate nahi banega)
- Check: `psql -p 5433 collection_dev -c 'SELECT id, email, password FROM "Employee";'` →
  password `$2b$10$...` jaisa dikhna chahiye, `Test@123` nahi

**Yaad rakhna:** file edit karke `Cmd+S` zaroor dabao, aur `head`/`grep` se check karo ki save hua —
kai baar edit save nahi hua tha, isliye test purane code pe chal raha tha.

**Phase 3 — `auth` module ✅ COMPLETE (commits `d5d8d12` → `c0ce023`) → PHASE 3 KHATAM 🎉**

`.env` me naya variable `CRM_JWT` (local me nakli value; asli team se). `env.js` me `env.crmJwt`.
Packages: `jsonwebtoken`, `joi`.

**APIs** (prefix `/api/v1/auth`, `app.js` me `app.use("/api/v1/auth", authRoutes)`):

| API | Guard | Kya karta hai | Errors |
|---|---|---|---|
| `POST /login` | `loginLimiter` → `validate(loginSchema)` | email se employee (+roles) → role check → password check → `is_logged_in=true` → JWT (2d) → cookie `employee_jwt` + `{ message, token, employee }` | 400 validation, 404 employee nahi, 403 role nahi, 401 password, 429-jaisa limit message |
| `GET /profile` | `authenticate` | `req.employee.id` se profile (`select`, password kabhi nahi) → `{ success, message, data }` | 401 |
| `POST /logout` | `authenticate` | `is_logged_in=false` + `clearCookie` (same options ke saath) | 401 |

**Files:**
- `src/modules/auth/auth.service.js` — `login`, `getProfile`, `logout` (asli logic, `req`/`res` nahi)
- `src/modules/auth/auth.controller.js` — req se lo → service → res (patle functions)
- `src/modules/auth/auth.routes.js` — URL + guards + controller
- `src/modules/auth/auth.validation.js` — `loginSchema` (Joi: email `trim().lowercase().email()`, password required)
- `src/middlewares/auth.js`
  - `authenticate` — token cookie ya `Authorization: Bearer` se → `jwt.verify` (sirf ye `try` me) →
    DB me employee active hai? → `req.employee = { id, email, f_name, l_name, roles }` (password nahi) → `next()`
  - `authorizeRoles(...roles)` — `authenticate` ke **baad** lagta hai; role na ho to 403.
    Abhi kisi route pe nahi laga — aage ke modules me: `authorizeRoles("COLLECTION-HEAD", "ADMIN")`
- `src/middlewares/validate.js` — `validate(schema)`: `abortEarly:false`, `stripUnknown:true`, saaf data `req.body` me
- `src/middlewares/rateLimiter.js` — `loginLimiter`: 12 min / 5 **galat** try (`skipSuccessfulRequests`), JSON message
- `src/middlewares/errorHandler.js` — `ApiError` ya <500 → asli message; baaki (achanak 500) →
  sirf `"Internal Server Error"`, asli wajah + stack sirf logs me

**Purane code se jo jaan-boojh ke copy NAHI kiya:** `prem@toekn12345` backdoor token; poora employee
(password hash ke saath) `req` me; 500 pe andar ka message client ko.

**Baaki / baad me (chhote kaam):**
- `employee_Logs` entry (purana login/logout banata hai) — abhi skip
- Logout token ko khatam nahi karta (JWT 2 din valid rehta hai) — purana bhi aisa hi; baad me sochna
- Cookie `maxAge` 30 din hai par token 2 din — purane jaisa; baad me dono ek karna
- `errorHandler` ke `else` me `logger.warn` hona chahiye (abhi `logger.error`)
- 404/403 vs ek jaisa 401 (email exist karta hai ya nahi pata chalta hai) — team se poochna

**Phase 4 — Location module (chal raha hai 🟡, 3 Oct 2026 ko yahan ruke)**

Kya hai: frontend ke filter dropdowns — **State → City → Pincode** — `location` table se.
Pehla module isliye: sirf read, table simple (`region, state, city, pincode, status`), auth guard ka pehla asli use.

Purana: `GET /api/paytracker/v1/master/location?type=states|cities|pincodes|cases` (ek URL, switch,
`controllers/paytracker/v1/controller.location.js`, 275 lines). **Naya (naya frontend hai):** alag-alag saaf URLs:

| Naya URL | Deta hai | Rules (purane se) |
|---|---|---|
| `GET /api/v1/locations/states` | `["Delhi", ...]` | `status: true`, state null/"" nahi, `distinct`, A-Z |
| `GET /api/v1/locations/cities?state=Delhi` | us state ki cities | `state` zaroori (400) |
| `GET /api/v1/locations/pincodes?state=..&city=..` | us city ke pincodes | `state` + `city` zaroori (400) |

Purane ka `type=cases` asal me **portfolio** hai (loans ki list, bada raw SQL) → Phase 5 me.
Purane route pe roles: `ADMIN, COLLECTION-EXECUTIVE, COLLECTION-HEAD, VISITOR, ACCOUNTS, RECOVERY_HEAD` —
par purana login sirf 4 roles allow karta hai (`VISITOR/ACCOUNTS/RECOVERY_HEAD` login hi nahi kar sakte?) → team se poochna.

| Step | Kya | Status |
|---|---|---|
| 4.1 | `prisma/seed.js` me 7 nakli locations (`if (count === 0) createMany`, kyunki `location` me unique column nahi → `upsert` nahi chalega). Ek row `status: false` (Pune 411002) — API me nahi aani chahiye | ✅ |
| 4.2 | `src/modules/location/` me 4 files | ✅ |
| 4.3 | States API — service `getStates()` (`findMany` + `distinct` + `select` + `orderBy`, phir `map` se seedhi list) | 🟡 service likhi, **import me `.js` missing** (`"../../lib/prisma"` → `"../../lib/prisma.js"`); controller + route + `app.js` baaki |
| 4.4 | Cities API + query validation | ⬜ |
| 4.5 | Pincodes API | ⬜ |
| 4.6 | Commit + README | ⬜ |

⚠️ Query validation ke liye dhyan: **Express 5 me `req.query` read-only hai** — `validate` middleware me
`req.query = value` nahi kar sakte (abhi wo sirf `req.body` sambhalta hai). 4.4 me isse sambhalna hai.

⚠️ Abhi commit nahi hua: `prisma/seed.js` (locations), `src/modules/location/`, aur ye README.

---

## 10. Chalane ka tareeka

```bash
npm install
npm run dev                 # node --watch, file save karte hi restart
PORT=9000 npm run dev       # alag port pe chalane ke liye
```

Check:
```bash
curl -i http://localhost:8080/health     # 200 + {success, message, timestamp}
curl -i http://localhost:8080/health/db  # 200 (DB chalu) / 503 (DB band)
curl -i http://localhost:8080/kuchbhi    # 404 + {success:false, message me URL}
curl -I http://localhost:8080/health     # X-Powered-By nahi dikhna chahiye (helmet)
```

Auth (test employee: `test.exec@example.com` / `Test@123`, `node prisma/seed.js` se bante hain):
```bash
curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test.exec@example.com","password":"Test@123"}'      # response se "token" copy karo
curl -s http://localhost:8080/api/v1/auth/profile -H "Authorization: Bearer <TOKEN>"
curl -s -X POST http://localhost:8080/api/v1/auth/logout -H "Authorization: Bearer <TOKEN>"
```
Login 5 baar galat → 12 min block (jaldi kholna ho to server restart).

Postgres (port 5433):
```bash
pg_isready -p 5433                  # chal raha hai ya nahi
brew services start postgresql@16
brew services stop postgresql@16    # beech me Ctrl+C mat dabana, khatam hone do
```

⚠️ Graceful shutdown (`Ctrl+C`) test karna ho to `npm start` use karo, `npm run dev` nahi —
`node --watch` beech me signal sambhalta hai, logs 0 ya kai baar aa sakte hain.
Port 8080 pe koi purana server atka ho to: `lsof -iTCP:8080 -sTCP:LISTEN` → `kill <PID>`.

---

## 11. Ab tak kya seekha (mera record)

- **Routing:** URL tukdon me katta hai — `app.use("/api", ...)` → module router → route file
- **Middleware:** `(req, res, next)` wala function; `next()` se agla function chalta hai; order upar se neeche
- **`helmet()`** — response me security headers jodta hai, `X-Powered-By` hata deta hai
- **`express.json({ limit })`** — request body ka JSON text → `req.body`; limit se bada body → 413
- **`cookieParser()`** — `Cookie` header string → `req.cookies` object (sirf **padhne** ke liye;
  `res.cookie()` / `res.clearCookie()` ko iski zaroorat nahi)
- **`app.js` vs `server.js`** — kya hai vs kahan chalega; testing ke liye alag rakhte hain
- **PORT** — `process.env.PORT || 3000`, taaki port badalne pe code na badle
- **Graceful shutdown** — `server.close()` chalu requests poori hone deta hai, phir `process.exit(0)`;
  SIGINT = Ctrl+C, SIGTERM = Docker/PM2 (deploy ke waqt asli case yahi hai)
- **Function banana ≠ function chalna** — call karna padta hai
- **`toString()` vs `toISOString()`** — ISO = UTC + standard, API me hamesha ISO
- **Response shape** — `success: true/false` boolean, har API me ek jaisa
- **`await` sirf `async` function ke andar** — file ke top level pe (ESM) bina `async` chalta hai,
  par kisi function/callback ke andar ho to wahi function `async` banana padta hai.
  `await` bhoolne pe error nahi aata, par kaam adhoora reh jata hai (jaise disconnect se pehle exit)
- **`try/catch` wahan lagao jahan code request ke time chalta hai** — route function ke andar,
  `app.get(...)` ke bahar nahi (wo sirf startup pe ek baar route register karta hai)
- **`const` vs `let`** — value badalni ho (jaise flag `false` → `true`) to `let`
- **503** — "service abhi available nahi" (jaise DB down); 500 = "code me kuch toota"
- **Service vs controller** — dono me `login` naam ho sakta hai, kaam alag: controller HTTP sambhalta hai
  (`req`/`res`), service asli kaam (sirf `email`, `password`). Controller service ko `authService.login` se bulata hai.
- **Service me `throw new ApiError(...)`, `res.status()` nahi** — Express 5 error ko `errorHandler` tak le jata hai.
  `new Error()` me status code nahi hota → 500 ban jata hai.
- **Prisma `include` vs `select`** — `include` = poori row + relation; `select` = sirf chune columns (password
  bahar rakhne ka sabse safe tareeka). `include: { roles: { include: { role: true } } }` = employee → jodiyan
  (`Employee_Role`, plural `roles`) → har jodi ka `role` (singular).
- **`upsert`** — `where` / `update` / `create`; `update: {}` = "mil gaya to kuch mat badlo". Seed baar-baar chal sakta hai.
- **bcrypt** — DB me password ka hash; login pe `bcrypt.compare(plain, hash)`. `password` `null` ho sakta hai → pehle check.
- **JWT** — `jwt.sign(payload, secret, { expiresIn })` / `jwt.verify`. Payload base64 hai, **encrypted nahi** —
  koi bhi padh sakta hai, isliye usme kabhi secret mat daalo. Secret sirf chhedchhaad rokta hai.
- **401 vs 403** — 401 = "pata nahi tum kaun ho" (token nahi/galat); 403 = "pata hai, par ijazat nahi" (role)
- **Middleware chain** — `router.get(url, mw1, mw2, controller)` left se right; koi `throw` kare to aage nahi jata
- **Function jo middleware lautaye** (`authorizeRoles(...roles)`, `validate(schema)`) — bahar wala setting leta hai,
  andar wala asli `(req, res, next)`. `...roles` = jitne bhi do, sab ek list me.
- **`try` me sirf wahi rakho jiska error pakadna hai** — warna doosre errors (DB down, inactive) bhi galat message ban jaate hain
- **Import rules** — ESM me `.js` zaroori; `export default x` → `import x` (bina `{}`), `export function x` → `import { x }`;
  path `./` = isi folder, `../` = ek upar. Editor kabhi apne aap faltu import jod deta hai — file ke upar dekh lo.
- **Error padhna** — sirf pehli line: kya hua + kaunsi file + `imported from` kahan. `at ...` wali lines Node ki hain, ignore.
  `X is not defined` → banaya/import nahi; `Cannot find module` → path; `does not provide an export` → `{}` galat.
- **Terminal se file badli (`git restore`) to editor ka tab band karke dobara kholo** — warna `Cmd+S` purana version wapas likh deta hai
- **Rate limit** — brute force rokta hai; count memory me, server restart pe reset
- **Production me andar ki galti bahar nahi** — client ko generic 500, details sirf logs me

### Login flow jo purane code se samjha (`controllers/paytracker/v1/controller.auth.js`)
```
POST /login → body check (400) → employee DB me dhundho (404) → role check (403)
            → bcrypt.compare (401) → is_logged_in update → jwt.sign(CRM_JWT, 2d)
            → employee_Logs entry → cookie employee_jwt + JSON (200)

GET /profile → authenticateEmployee (cookie/Bearer se token → jwt.verify → DB se employee
            → req.employee set → next()) → getProfile (req.employee.id use karta hai)

POST /logout → authenticateEmployee → is_logged_in false → log → res.clearCookie()
```
Teeno APIs independent hain; inhe jodne wali cheez **token/cookie** hai (HTTP stateless hota hai).

**Purane code ki security seekh:** 404/403 password check se pehle aate hain — isse pata chal jata hai
ki kaunsa email exist karta hai. Best practice: teeno cases me ek jaisa `401 "Invalid credentials"`.

---

## 12. Team se poochhne wale sawaal (pending)

- [ ] Naya backend kis URL/domain pe deploy hoga? (cookie domain ka asar padta hai — agar frontend
      token header me bhejta hai to koi dikkat nahi)
- [ ] Dev/test database ki `.env` (`DATABASE_URL` variable me **dev** DB ka URL, production ka nahi!)
- [ ] `CRM_JWT` ki value (purane backend wali hi honi chahiye)
- [ ] DB me koi change chahiye ho to process kya hai, aur kis se baat karni hai?
- [ ] Status/stage values ki list kahan maintained hai?
- [ ] Login pe 404/403 alag rakhein ya sab ke liye ek jaisa `401 "Invalid credentials"` (security)? Naya frontend kya expect karta hai?
- [ ] Naya frontend token cookie se bhejega ya `Authorization: Bearer` header se? (dono support hai)
- [ ] `VISITOR`, `ACCOUNTS`, `RECOVERY_HEAD` roles purane location/customer routes pe allowed hain, par login
      sirf 4 roles (`COLLECTION-HEAD`, `COLLECTION-EXECUTIVE`, `ADMIN`, `ACM`) ko andar aane deta hai — ye log login kaise karte hain?

---

## 13. Kaam karne ka tareeka (Claude ke liye zaroori)

Main Express me fresher hoon (JavaScript aati hai). Sikhna aur khud code likhna, dono zaroori hai.

**Rules:**
1. **Poora code likh ke mat do.** Requirement, hints, structure aur "kyun" batao — code main likhungi.
   Ek hi cheez pe 2-3 baar atak jaun tabhi zyada seedha hint dena.
2. **Chhote steps** me kaam do, ek baar me ek cheez.
3. **Hinglish me** samjhao, table aur misaalon ke saath.
4. Code bhejun to **review** karo: kya sahi hai, kya theek karna hai, aur **kyun**.
5. Har naye concept pe: ye kya hai, kyun chahiye, aur is project me kahan kaam aayega.
6. Jahan ho sake, purane repo (`~/Projects/Work/blinkr_crm_backend`) se asli misaal do —
   dono codebase saath samajh aate hain.
7. Har step ke baad **verify** ka tareeka batao (curl command / expected output).
8. **Seedhi aur aasaan bhasha** — lambi kahani/misaal nahi. Pehle chhota flow (kaunsa step, kyun), phir
   exact kya karna hai (kaunsi file, kaunsi line). Naya code ho to snippet + har line ka matlab de sakte ho.
9. Mere bheje code pe bharosa mat karo — **asli file disk pe check karo** (kai baar save nahi hota / purana paste hota hai).
10. Mera code bina pooche mat badlo. Toot gaya ho (galat jagah paste) to bata ke theek kar sakte ho.

**Session shuru karte waqt:** ye README padho, section 9 se pata chalega ki main kahan hoon,
aur wahi se continue karao.

---

## 14. Zaroori paths

| Kya | Kahan |
|---|---|
| Naya backend (ye repo) | `~/Projects/Work/BlinkCrmNewCollectionBackend` |
| Purana backend (reference) | `~/Projects/Work/blinkr_crm_backend` |
| Purana paytracker code | `Routes/paytracker/v1/`, `controllers/paytracker/v1/` |
| Purana auth (login/guard) | `controllers/paytracker/v1/controller.auth.js`, `Middlewares/employee.js` |
| DB schema (2916 lines) | `prisma/schema.prisma` |
