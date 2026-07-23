// JRC Assignment System — app-helpers.js
// Helpers, date utils, tabs, kiosk lookup, assignment helpers
// ============================================================
// HELPERS
// ============================================================
function showDayOfShow(dateStr){
  var d = new Date(dateStr);
  var diff = Math.round((d - SHOW_START) / 86400000) + 1;
  if(diff >= 1 && diff <= 20) return 'Day ' + diff;
  return '';
}
function fmtDate(dateStr){
  if(!dateStr) return '';
  var parts = dateStr.split('-');
  var months = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return months[parseInt(parts[1])] + ' ' + parseInt(parts[2]) + ', ' + parts[0];
}
function updateHeaderDate(){
  var d = (document.getElementById('setup-date') ? document.getElementById('setup-date').value : '') || currentDate;
  var ds = showDayOfShow(d);
  var dow = d ? fmtDateLong(d).split(',')[0] : '';
  var infoEl = document.getElementById('hdr-info');
  if(infoEl){
    infoEl.innerHTML =
      (ds ? '<strong style="color:#fff;font-size:12px">' + ds + '</strong><br>' : '') +
      (dow ? '<span style="color:#99BBDD">' + dow + ' &bull; ' + fmtDate(d) + '</span>' : fmtDate(d));
  }
  var subEl = document.getElementById('hdr-date-sub');
  if(subEl) subEl.textContent = simTimeEnabled ? '⏱ Sim time active' : '';
  updateHeaderClock();
}

function updateHeaderClock(){
  var el = document.getElementById('hdr-clock');
  if(!el) return;
  var now = getSimTime();
  var h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();
  var ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  el.textContent = h + ':' + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0') + ' ' + ampm;
  // Also update date sub-line in case sim flag changed
  var subEl = document.getElementById('hdr-date-sub');
  if(subEl) subEl.textContent = simTimeEnabled ? '⏱ Sim time active' : '';
}
function applySimTime(){
  var h = parseInt(document.getElementById('sim-hour').value) || 8;
  var m = parseInt(document.getElementById('sim-min').value) || 0;
  m = Math.max(0, Math.min(59, m));
  var ampm = document.getElementById('sim-ampm').value;
  // Convert to 24h
  if(ampm === 'pm' && h !== 12) h += 12;
  if(ampm === 'am' && h === 12) h = 0;
  setSimTime(h, m, currentDate);
  var ampm = h >= 12 ? 'PM' : 'AM';
  var h12 = h > 12 ? h-12 : (h===0 ? 12 : h);
  var label = h12 + ':' + String(m).padStart(2,'0') + ' ' + ampm;
  document.getElementById('sim-time-status').innerHTML = '<strong style="color:var(--orange)">&#9201; Simulated time set: ' + label + '</strong> &mdash; advancing in real time from this point';
  // Update the board clock immediately
  updateBoardClock();
}

function simUpdate(){} // no-op — status shown after apply

function applySimDate(){
  simUpdate(); // refresh status display first
  var d = document.getElementById('sim-date').value;
  var h = parseInt(document.getElementById('sim-hour').value) || 8;
  var m = parseInt(document.getElementById('sim-min').value) || 0;
  m = Math.max(0, Math.min(59, m));
  var ampm2 = document.getElementById('sim-ampm').value;
  if(ampm2 === 'pm' && h !== 12) h += 12;
  if(ampm2 === 'am' && h === 12) h = 0;
  var tempDate = new Date(); tempDate.setHours(h, m, 0, 0);
  var s = getShiftFromTime(tempDate);
  // If date changed, clear all day-specific session data
  if(d !== currentDate){
    juniors.forEach(function(j){
      j.checkedIn       = false;
      j.assignment      = null;
      j.order           = 0;
      j.checkInShift    = '';
      j.shiftAssignments = {};
      j.plannedShifts   = [];
    });
    clockedOut       = {};
    onShiftJuniors   = new Set();
    onShiftSlots     = new Set();
    checkInOrder     = 0;
    activeSlots.forEach(function(s){ s.assigned = []; });
    activePick       = null;
    activePickShift  = null;
    notesState       = {};
  }
  currentDate = d;
  currentShift = s;
  var sd = document.getElementById('setup-date');
  if(sd) sd.value = d;
  var ss = document.getElementById('setup-shift');
  if(ss) ss.value = s;
  setSimTime(h, m, d); // pass date so offset is relative to that date, not today
  var ampm = h >= 12 ? 'PM' : 'AM';
  var h12 = h > 12 ? h-12 : (h===0 ? 12 : h);
  var label = h12 + ':' + String(m).padStart(2,'0') + ' ' + ampm;
  document.getElementById('sim-status').innerHTML = 'Set to <strong>' + fmtDate(d) + ' at ' + label + '</strong> &mdash; advancing from this point';
  updateHeaderDate();
  // Auto-load slots for the new date into dashboard
  _loadSlotsForDate(d);
  renderOfficer();
  renderSetup();
  updateBoardClock();
  saveStateNow();
}

// ============================================================
// TABS
// ============================================================


function switchTab(t, el){
  currentTab = t;
  // Re-render tabs to update active state
  renderTabs(t);
  // Show correct panel
  document.querySelectorAll('.panel').forEach(function(p){ p.style.display='none'; p.classList.remove('active'); });
  var panel = document.getElementById('panel-' + t);
  if(panel){ panel.style.display = 'block'; panel.classList.add('active'); }
  if(t === 'officer') renderOfficer();
  if(t === 'roster') renderRoster();
  if(t === 'setup') renderSetup();
  if(t === 'requests') refreshRequests();
  if(t === 'reqform') renderReqForm();
  if(t === 'board'){
    // Board tab looks identical to TV page — apply tv-mode class to body
    document.body.classList.add('board-tab-active');
    renderBoard();
  } else {
    document.body.classList.remove('board-tab-active');
  }
  if(t === 'checkins') renderCheckins();
  if(t === 'hours') renderHours();
  if(t === 'simulate'){ renderUserMgmt(); renderStrandedPanel(); renderSimulateMigrationStatus(); }
}

// ============================================================
// KIOSK
// ============================================================
function kLookup(){
  var v = document.getElementById('kid').value.trim();
  var jr = juniors.find(function(j){ return j.id === v; });
  var ad = adults.find(function(a){ return a.id === v; });
  document.getElementById('k-msg').textContent = '';
  if(ad){
    document.getElementById('k-msg').textContent = 'Welcome, ' + ad.name + '! Adult leaders check in with the Shift Officer.';
    return;
  }
  if(!jr){
    document.getElementById('k-msg').textContent = 'Member ID not found. Please see a Shift Officer for help.';
    return;
  }
  // Already checked in and NOT clocked out → show clock-out screen
  if(jr.checkedIn && !clockedOut[jr.id]){
    pendingJr = jr;
    document.getElementById('kco-name').innerHTML = (jr.hasHat ? '<img src="assets/hat.png" style="height:18px;vertical-align:middle;margin-right:3px"> ' : '') + jr.name;
    document.getElementById('kco-assignment').textContent = jr.assignment ? 'Currently assigned to: ' + jr.assignment : 'Not yet assigned to a committee';
    var nextEl = document.getElementById('kco-next-shift');
    if(nextEl) nextEl.textContent = '';
    document.getElementById('k-entry').style.display = 'none';
    document.getElementById('k-clockout').style.display = 'block';
    return;
  }
  // Block check-in if outside the strict time windows
  if(!getShiftFromTime(getSimTime())){
    document.getElementById('k-entry').style.display = 'none';
    document.getElementById('k-outside').style.display = 'block';
    return;
  }
  pendingJr = jr;
  document.getElementById('kc-name').innerHTML = (jr.hasHat ? '<img src="assets/hat.png" style="height:18px;vertical-align:middle;margin-right:3px"> ' : '') + jr.name;
  document.getElementById('kc-title').textContent = jr.title;
  document.getElementById('kc-last').textContent = 'Last assignment: ' + jr.last;
  var b = '<span class="badge b-title">' + jr.title.replace('Junior ', '') + '</span>';
  if(jr.ageout) b += ' <span class="badge b-ageout">Age-Out</span>';
  document.getElementById('kc-badges').innerHTML = b;
  document.getElementById('k-entry').style.display = 'none';
  // Age-outs get extra shift-selection screen
  if(jr.ageout){
    document.getElementById('kao-name').innerHTML = (jr.hasHat ? '<img src="assets/hat.png" style="height:18px;vertical-align:middle;margin-right:3px"> ' : '') + jr.name;
    // Pre-check current shift
    ['8am','12pm','4pm'].forEach(function(sh){
      var cb = document.getElementById('kao-shift-' + sh);
      if(cb) cb.checked = (sh === currentShift);
    });
    document.getElementById('k-ao-shifts').style.display = 'block';
  } else {
    updateKioskShiftBanner();
    document.getElementById('k-confirm').style.display = 'block';
  }
}
function kAoNext(){
  // Age-out confirmed their planned shifts — move to hat/notes confirm screen
  pendingJr.plannedShifts = [];
  ['8am','12pm','4pm'].forEach(function(sh){
    var cb = document.getElementById('kao-shift-' + sh);
    if(cb && cb.checked) pendingJr.plannedShifts.push(sh);
  });
  document.getElementById('kc-name').innerHTML = (pendingJr.hasHat ? '<img src="assets/hat.png" style="height:18px;vertical-align:middle;margin-right:3px"> ' : '') + pendingJr.name;
  document.getElementById('kc-title').textContent = pendingJr.title;
  document.getElementById('kc-last').textContent = 'Last assignment: ' + pendingJr.last;
  var b = '<span class="badge b-title">' + pendingJr.title.replace('Junior ', '') + '</span>';
  b += ' <span class="badge b-ageout">Age-Out</span>';
  if(pendingJr.plannedShifts.length > 1){
    b += ' <span class="badge" style="background:#E8F0FF;color:#2A3DB5;border:1px solid #4A6CF7">Working ' + pendingJr.plannedShifts.length + ' shifts</span>';
  }
  document.getElementById('kc-badges').innerHTML = b;
  document.getElementById('k-ao-shifts').style.display = 'none';
  updateKioskShiftBanner();
  document.getElementById('k-confirm').style.display = 'block';
}

function kConfirm(){
  if(!pendingJr) return;
  checkInOrder++;
  pendingJr.checkedIn = true;
  pendingJr.order = checkInOrder;
  pendingJr.hasHat = document.getElementById('k-hat').checked;
  pendingJr.notes = document.getElementById('k-notes').value.trim();
  // Shift is guaranteed valid here — kLookup blocks outside-window check-ins
  pendingJr.checkInShift     = getShiftFromTime(getSimTime()) || currentShift;
  pendingJr.checkInDate      = currentDate; // stamp today's date — used for stale check-in detection
  pendingJr.checkInTimestamp = getSimTime().getTime(); // epoch ms — used in Check-ins tab
  clockedOut[pendingJr.id] = false;
  delete clockedOut[pendingJr.id];
  // If age-out has a pre-assignment for the current shift, restore it
  if(pendingJr.ageout && pendingJr.shiftAssignments && pendingJr.shiftAssignments[currentShift]){
    var preSlot = activeSlots.find(function(s){ return s.name === pendingJr.shiftAssignments[currentShift] && s.shift === currentShift; });
    if(preSlot && preSlot.assigned.indexOf(pendingJr.id) < 0){
      preSlot.assigned.push(pendingJr.id);
      assignJr(pendingJr, preSlot.name);
    }
  }
  // Reset inputs
  document.getElementById('k-hat').checked = false;
  document.getElementById('k-notes').value = '';
  document.getElementById('kd-name').innerHTML = (pendingJr.hasHat ? '<img src="assets/hat.png" style="height:18px;vertical-align:middle;margin-right:3px"> ' : '') + pendingJr.name;
  // Done screen age-out message
  var aoMsg = '';
  if(pendingJr.ageout){
    var shifts = (pendingJr.plannedShifts && pendingJr.plannedShifts.length > 0)
      ? pendingJr.plannedShifts.map(function(s){ return SL[s]; }).join(', ')
      : SL[currentShift];
    aoMsg = '';
  }
  document.getElementById('kd-ao').innerHTML = aoMsg;
  document.getElementById('k-confirm').style.display = 'none';
  document.getElementById('k-done').style.display = 'block';
  if(pendingJr) dirtyJuniors.add(pendingJr.id);
  pendingJr = null;
  saveStateNow();
}

function kClockOut(){
  if(!pendingJr) return;
  // Keep them in their slot — just mark as clocked out so pill shows strikethrough
  // They stay on the dashboard card but disappear from status board
  onShiftJuniors.delete(pendingJr.id);
  onShiftJuniors.delete(String(pendingJr.id));
  pendingJr.checkedIn = false;
  // Keep pendingJr.assignment so they stay in the slot card
  clockedOut[pendingJr.id] = true;
  dirtyJuniors.add(pendingJr.id);
  saveStateNow();
  document.getElementById('kdo-name').innerHTML = (pendingJr.hasHat ? '<img src="assets/hat.png" style="height:18px;vertical-align:middle;margin-right:3px"> ' : '') + pendingJr.name;
  document.getElementById('k-clockout').style.display = 'none';
  document.getElementById('k-clockout-done').style.display = 'block';
  renderOfficer();
  pendingJr = null;
}

function kCancelClockOut(){
  pendingJr = null;
  kReset();
}
function kReset(){
  pendingJr = null;
  document.getElementById('kid').value = '';
  document.getElementById('k-msg').textContent = '';
  document.getElementById('k-shift-lbl').textContent = 'Enter your 7-digit member ID &mdash; ' + SL[currentShift];
  document.getElementById('k-entry').style.display = 'block';
  document.getElementById('k-confirm').style.display = 'none';
  document.getElementById('k-done').style.display = 'none';
  document.getElementById('k-clockout').style.display = 'none';
  document.getElementById('k-clockout-done').style.display = 'none';
  document.getElementById('k-outside').style.display = 'none';
  document.getElementById('k-ao-shifts').style.display = 'none';
  document.getElementById('kid').focus();
}

// ============================================================
// ASSIGNMENT HELPERS
// ============================================================
function assignJr(jr, slotName){
  jr.prevLast = jr.last;
  jr.assignment = slotName;
  jr.last = slotName;
  if(jr.history[jr.history.length - 1] !== slotName) jr.history.push(slotName);
}
function unassignJr(jr, sl){
  // Log the dismissal
  var jIdx = juniors.indexOf(jr);
  if(jIdx >= 0 && sl) addJuniorNote(jIdx, 'Dismissed from ' + (sl.name||sl) + ' back to pool', 'dismissed');
  jr.assignment = null;
  jr.last = jr.prevLast !== null ? jr.prevLast : jr.last;
  if(jr.history.length > 0 && jr.history[jr.history.length - 1] === sl.name) jr.history.pop();
  jr.prevLast = null;
  sl.assigned = sl.assigned.filter(function(id){ return id !== jr.id; });
}

