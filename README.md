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
4. **API ka format same rahega** — URL, method, request fields, response JSON keys aur status codes
   purane jaise. Andar ka code clean hoga, bahar se API waisi hi dikhegi (frontend ko kam badalna pade).

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
| **1** | **Skeleton: app/server, env config, error handling, security middlewares** | 🟡 **Chal raha hai** |
| 2 | Prisma connect: `db pull`, sirf zaroori models, ek read query | ⬜ |
| 3 | `auth` module: login, guard middleware, profile, logout | ⬜ |
| 4 | Pehla asli module (read-only): location / customer info | ⬜ |
| 5 | Portfolio, dashboard, reports | ⬜ |
| 6 | PTP, disposition, assignment (write) | ⬜ |
| 7 | Payment, settlement (sabse aakhir — paisa) | ⬜ |

### Phase 1 ke steps

| Step | Kya | Status |
|---|---|---|
| 1 | Project setup + `app.js` + `server.js` + `/health` | ✅ Done |
| 2 | `config/env.js` — `.env` validate karna | ✅ Done |
| 3 | `ApiError` + central `errorHandler` | 🟡 chal raha hai |
| 4 | CORS, rate limit, logger (winston) | ⬜ |

---

## 9. Abhi kahan hoon (23 Sep 2026)

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

**Ab chal raha hai: Phase 1 / Step 3 — error handling**
- `src/utils/ApiError.js` — `Error` se banaya hua class, jisme `statusCode` bhi ho
- `src/middlewares/errorHandler.js` — 4-parameter wala middleware `(err, req, res, next)`,
  saare errors ka ek hi jagah se JSON response
- `app.js` ka 404 ab `next(new ApiError(404, ...))` karega, aur error handler sabse aakhir me lagega
- Note: **Express 5** me async controller ka error apne aap error handler tak chala jata hai,
  isliye purane repo wala `asyncHandler` (Express 4 ke liye tha) yahan zaroori nahi

---

## 10. Chalane ka tareeka

```bash
npm install
npm run dev                 # node --watch, file save karte hi restart
PORT=9000 npm run dev       # alag port pe chalane ke liye
```

Check:
```bash
curl -i http://localhost:3000/health     # 200 + {success, message, timestamp}
curl -i http://localhost:3000/kuchbhi    # 404 + {success:false, message me URL}
curl -I http://localhost:3000/health     # X-Powered-By nahi dikhna chahiye (helmet)
```

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
- [ ] Dev/test database ki `.env` (`PROD_DB` variable me **dev** DB ka URL, production ka nahi!)
- [ ] `CRM_JWT` ki value (purane backend wali hi honi chahiye)
- [ ] DB me koi change chahiye ho to process kya hai, aur kis se baat karni hai?
- [ ] Status/stage values ki list kahan maintained hai?

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
