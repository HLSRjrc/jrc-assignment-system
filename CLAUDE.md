[CLAUDE.md](https://github.com/user-attachments/files/29980801/CLAUDE.md)
# JRC Assignment System — Claude Project Context

## Project Overview
This is the **JRC Assignment System** for the Houston Livestock Show & Rodeo (HLSR) Jr. Rodeo Committee (JRC). It manages 800+ junior volunteer assignments across show day shifts.

- **Live app:** `jrc.hlsr.app`
- **Partner portal:** `jrcpartner.hlsr.app` (committee request submission)
- **TV status board:** `jrc.hlsr.app/?tv=1`
- **Repo:** `HLSRjrc/jrc-assignment-system` (private)
- **Current version:** V21

---

## Tech Stack
- **Frontend:** Single-page JS app — `js/app.js`, `index.html`, `css/app.css`
- **Build:** esbuild minification (`npx esbuild js/app.js --bundle=false --minify`)
- **Backend:** Netlify serverless functions — `netlify/functions/state.js`
- **Database:** Neon PostgreSQL (separate dev/prod databases)
- **Deployment:** GitHub Actions → Netlify auto-deploy from `main` branch
- **Domain:** Porkbun (hlsr.app)
- **Brand colors:** Navy `#002E5D`, Orange `#EF7622`, Font: DM Sans

---

## Assignment Rules (CRITICAL — never break these)

### Core Rules
1. **No solo rule:** Never send exactly 1 junior to a committee slot. Minimum is 2. If only 1 person would go, send 0 instead and give that junior to a slot that already has people.
2. **Everyone gets 2 before anyone gets a 3rd:** Fill all slots to 2 before filling any slot to 3. Fill all to 3 before any get 4, etc.
3. **Hat slots require hat juniors:** Non-hat juniors cannot be assigned to hat-required slots (committees like Mutton Bustin'). Hat juniors CAN go to non-hat slots.
4. **Hat priority:** When hat slot filling is at risk (hat juniors remaining ≤ hat spots needed + 2), route hat juniors to hat slots FIRST before non-hat slots.
5. **History variety:** Avoid repeating the most recent committee assignment. Use `jr.last` field to track.
6. **High priority slots:** Fill HP slots to capacity before distributing to regular slots.
7. **Last resort fallback:** If a junior truly has no eligible slot (all remaining open slots are hat-required and they have no hat), they CAN be placed in a hat slot rather than left stranded.

### Age-Out Rules
- Age-outs work multiple shifts in one day (8am, 12pm, 4pm or any combo)
- They check in ONCE at the kiosk and select all shifts they're working
- They get **first pick** on assignments — `autoAssign` pools them first
- After completing a shift, kiosk shows: "Clock out for your 8am shift?" → auto-detects next planned shift → "Check in for your 12pm — [committee] assignment?"
- Between shifts they enter `onBreak: true` state — slot stays reserved
- **Late warning:** 15 minutes before next shift, pending age-outs turn red on status board
- **Late alert:** Yellow banner on officer dashboard with "Release Slot" button per person
- `releaseAgeOutSlot(jid)` — removes pre-assignment, removes from plannedShifts, fully signs them out

### Night-Before Planner Rules (Shift Setup)
- Officer enters: "I have 45 at 8am, 67 at 12pm, 38 at 4pm"
- System simulates distribution using the same no-solo rules above:
  - Pass 1: Give every slot min(2, cap) 
  - Pass 2+: Round-robin fill remaining
  - Solo fix: Any slot with exactly 1 gets zeroed, that junior goes to most-filled partial slot
- Shows `3/4` yellow, `0/4` red, `8/8` green per committee
- Purpose: call committees to cancel the night before if they won't fill

---

## Key Data Structures

### Junior Object
```js
{
  id: '1234567',           // 7-digit HLSR member number (never changes)
  name: 'Last, First',
  title: 'Junior Member',
  ageout: false,
  hasHat: false,           // DAILY check-in question — NOT stored on profile
  checkedIn: false,
  checkInShift: '8am',     // '8am' | '12pm' | '4pm'
  checkInDate: '2026-03-10',
  checkInTimestamp: 1234567890,
  assignment: 'Agriculture Education',
  last: 'Agriculture Education',
  history: [],
  plannedShifts: ['8am', '12pm'],  // age-outs only
  shiftAssignments: {'8am': 'AG Ed', '12pm': 'Livestock'},  // age-outs only
  onBreak: false,          // true when age-out between shifts
  onBreakNextShift: '12pm',
  order: 42,               // check-in sequence number
  noteLog: [],
  notes: '',
  shiftLog: [],
  inactive: false
}
```

### Slot Object (activeSlots)
```js
{
  id: 1234567890,
  name: 'Agriculture Education',
  capacity: 4,
  shift: '8am',
  hat: false,
  assigned: ['1234567', '7654321'],
  sent: false,             // true when "Send to Assignment" clicked
  custom: false
}
```

### Committee Request
```js
{
  id: 1782420274898,       // MUST be BIGINT in Neon (epoch ms)
  status: 'pending' | 'approved' | 'rejected',
  name: 'Agriculture Education',
  virtual: false,
  shifts: [{date:'2026-03-10', shift:'8am', cap:4, all20:false}],
  chair: '', chairPhone: '', chairEmail: '',
  liaison: '', liaisonPhone: '', liaisonEmail: '',
  location: '', duties: '', notes: '', hat: false,
  schedulingNotes: '',
  source: 'schedule_2026' | 'request_form' | undefined
}
```

---

## State Management

### Key Global Variables
- `juniors[]` — full roster
- `adults[]` — login credentials
- `activeSlots[]` — current day's loaded slots
- `committeeRequests[]` — all requests
- `clockedOut{}` — `{jid: true}` for clocked-out juniors
- `onShiftJuniors` — Set of jids currently out on shift
- `onShiftSlots` — Set of slot ids that have been sent
- `currentDate` — ISO date string (e.g. `'2026-03-10'`)
- `currentShift` — `'8am'` | `'12pm'` | `'4pm'`
- `dirtyJuniors` — Set of jids needing save
- `_lastSavedHash` — set to `''` to force next save

### Save Pattern (CRITICAL)
For any operation that MUST sync to Neon:
```js
dirtyJuniors.add(jr.id);
_lastSavedHash = '';  // force save
saveStateNow();       // immediate, not debounced
```

Never use `saveState()` for critical operations — it's debounced 8s and skips if hash unchanged.

### Hash System
`_stateHash()` fingerprints the state. If hash matches `_lastSavedHash`, the save is skipped. Always set `_lastSavedHash = ''` before calling `saveStateNow()` for critical ops.

---

## getJuniorStatus() — Source of Truth
```js
function getJuniorStatus(jr){
  if(clockedOut[jr.id]) return 'checked-out';  // FIRST — takes precedence
  if(!jr.checkedIn) return null;
  if(onShiftJuniors.has(jr.id)) return 'on-shift';
  // Also check sent slots matching junior's checkInShift (not currentShift)
  var jrShift = jr.checkInShift || currentShift;
  var inSentSlot = activeSlots.some(function(s){
    return s.shift === jrShift &&
           onShiftSlots.has(String(s.id)) &&
           s.assigned.indexOf(jr.id) >= 0;
  });
  if(inSentSlot) return 'on-shift';
  if(jr.assignment) return 'assigned';
  return 'checked-in';
}
```

**Key:** Always check `clockedOut` FIRST regardless of `checkedIn` flag.

---

## Clock-Out Convention (ALL paths must follow this)
```js
clockedOut[jr.id] = true;
jr.assignment = null;
onShiftJuniors.delete(jr.id);
onShiftJuniors.delete(String(jr.id));
activeSlots.forEach(function(s){
  s.assigned = s.assigned.filter(function(id){ return String(id) !== String(jr.id); });
});
dirtyJuniors.add(jr.id);
_lastSavedHash = '';
saveStateNow();
```

**Re-check-in convention (clearing clock-out):**
```js
clockedOut[jr.id] = false;
delete clockedOut[jr.id];
delete clockedOut[String(jr.id)];
onShiftJuniors.delete(jr.id);
onShiftJuniors.delete(String(jr.id));
```

---

## committeeRequests Save Pattern (CRITICAL)
- ALWAYS use `batchMode: true` — never send `batchMode: false` unless doing a full wipe
- `batchMode: false` triggers `DELETE FROM committee_requests` before insert — will wipe everything
- `deleteIds` array for deletions — sends direct `DELETE WHERE id = ?`
- IDs are epoch ms (13 digits) — `committee_requests.id` MUST be BIGINT in Neon

---

## esbuild Landmines (WILL break build)
1. **Regex literals in strings:** Never use `name.replace(/'/g, "\'")` inside an inline `onclick` string
2. **Quote-escaped onclick with variables:** Never concatenate variables inside onclick strings with `\'` escaping
3. **Always use `window._ps` cache with `data-k` attributes** for passing data to onclick handlers:
   ```js
   window._ps = window._ps || {};
   window._ps[key] = {name: s.name, shift: sh};
   // In HTML:
   '<button data-k="' + key + '" onclick="myFn(this)">'
   // In JS:
   function myFn(btn){ var s = window._ps[btn.getAttribute('data-k')]; }
   ```
4. **Validate before every deploy:** `npx esbuild js/app.js --bundle=false --minify --outfile=/tmp/test.js`

---

## Neon Schema Notes
- `committee_requests.id` — MUST be `BIGINT` (epoch ms overflows INTEGER)
- `juniors.note_log` — exists on `juniors` table, NOT on `adults` table
- Roster saves batch in chunks of 150 to avoid 502 timeouts
- Run ALTER: `ALTER TABLE committee_requests ALTER COLUMN id TYPE BIGINT USING id::BIGINT`

---

## Time System
- `getSimTime()` returns `new Date(Date.now() + simTimeOffset)`
- When sim disabled, `simTimeOffset = 0` → real time
- `simTargetEpoch` stores absolute epoch of the set time — offset recalculated on load
- **This is NOT a simulation mode** — it's a one-time time offset that runs continuously
- Set before show, never change during show
- TV mode trusts Neon completely — never overrides with localStorage sim state

---

## Roles
- `admin` — all tabs including Settings
- `officer` — dashboard, setup, kiosk, checkins, roster, board
- `slt` — officer + requests, simulate
- `scheduling` — reqform, requests, setup
- `mentor` — kiosk, board
- `kiosk` — kiosk only
- `board` — status board only (TV mode)

---

## TV Mode (`?tv=1`)
- Auto-logins as `board` role after 600ms (retry at 2500ms)
- Never overrides Neon state with localStorage
- Polls every 15 seconds (normal mode: 15 minutes)
- No grace period on polls (TV never saves)
- Status board layout: left panel (CI + pending) dynamically sizes 14%–65% based on waiting:out ratio

---

## Hat Flag
**IMPORTANT:** `hasHat` is a **daily check-in question** — it is NOT a stored profile attribute. It gets randomized/asked fresh on every check-in. Do not treat it as a permanent junior property.

---

## Key Functions Reference
- `autoAssign()` — main assignment algorithm
- `placeStragglers()` — force-places remaining pool members
- `activateShift()` — auto-loads slots for date, sets currentShift to earliest, switches to dashboard
- `clearAllSlots()` — clears activeSlots + onShiftJuniors + onShiftSlots + slot.sent, force saves
- `clearAssignments()` — clears assignments but keeps check-ins, also clears onShift tracking
- `saveStateNow()` — immediate save (use for critical ops)
- `saveState()` — debounced 8s (use for non-critical background saves)
- `refreshRequests()` — direct Neon fetch bypassing poll timer
- `simCheckIn()` / `simClockOut()` — bulk simulator with progress bars
- `releaseAgeOutSlot(jid)` — releases age-out's next shift slot back to pool

---

## File Locations
- Working files: `/home/claude/`
- Outputs: `/mnt/user-data/outputs/`
- Deploy to repo: `js/app.js`, `css/app.css`, `index.html`, `netlify/functions/state.js`
