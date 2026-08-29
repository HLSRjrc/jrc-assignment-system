// JRC Assignment System — app-db.js
// Database (Neon/localStorage), hours report, roster import, app init
// ============================================================
// DATABASE — Neon (Postgres) via Netlify Functions, localStorage fallback
// ============================================================
var LS_KEY = 'jrc_app_state_v1';
var DB_AVAILABLE = true;
var saveTimer = null;

function saveState(){
  if(saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(function(){
    var h = _stateHash();
    if(h === _lastSavedHash){
      // Nothing changed — skip this save entirely
      return;
    }
    _doSave();
  }, 8000);
}

function saveStateNow(){
  if(saveTimer) clearTimeout(saveTimer);
  _doSave();
}

var lastSaveTime = 0;
var isSaving = false;
var _lastSavedHash = '';
// Juniors changed locally but not yet confirmed written to Neon. Only these
// are allowed to survive an incoming poll — everything else defers to the
// server, so a clock-out on the kiosk is no longer undone on the dashboard.
var _inFlightJuniors = new Set();
// _simSetLocallyAt is declared in app-data.js alongside the sim setters.

function _stateHash(){
  // Quick fingerprint of the parts that matter — avoids saving unchanged state
  try {
    var sig = [
      activeSlots.length,
      activeSlots.map(function(s){ return s.id + ':' + s.assigned.length + ':' + (s.sent?1:0); }).join('|'),
      juniors.filter(function(j){ return j.checkedIn || j.assignment || (j.noteLog && j.noteLog.length) || dirtyJuniors.has(j.id); }).map(function(j){
        return j.id + ':' + (j.checkedIn?1:0) + ':' + (j.assignment||'') + ':' + j.order + ':' + (j.noteLog ? j.noteLog.length : 0) + ':' + (j.checkInDate||'');
      }).join('|'),
      committeeRequests.map(function(r){ return r.id + ':' + r.status; }).join('|'),
      currentDate, currentShift
    ].join('§');
    return sig;
  } catch(e){ return Math.random().toString(); }
}

function _doSave(){
  isSaving = true;
  lastSaveTime = Date.now();

  // Send juniors with any non-default data OR recently touched ones
  var activeJuniors = juniors.filter(function(j){
    return j.checkedIn || j.assignment || j.order > 0 ||
           (j.shiftLog && j.shiftLog.length > 0) ||
           (j.history && j.history.length > 0) ||
           (j.noteLog && j.noteLog.length > 0) ||
           j.last !== 'None' || j.hasHat || j.notes || j.ageout ||
           dirtyJuniors.has(j.id);
  });
  dirtyJuniors.forEach(function(id){ _inFlightJuniors.add(id); });
  dirtyJuniors.clear();

  var payload = {
    state: {
      clockedOut: clockedOut,
      clockedOutShifts: clockedOutShifts,
      onShiftJuniors: Array.from(onShiftJuniors),
      onShiftSlots: Array.from(onShiftSlots),
      currentDate: currentDate,
      currentShift: currentShift,
      checkInOrder: checkInOrder,
      lockedJuniors: Array.from(lockedJuniors),
      simTimeEnabled: simTimeEnabled,
      simTimeOffset: simTimeOffset,
      simTargetEpoch: simTargetEpoch,
      simDateSet: simDateSet,
      prioritySlots: prioritySlots,
    userRoles: userRoles,
    loginLog: loginLog,
    },
    juniors: activeJuniors,
    activeSlots: activeSlots,
    adults: (adults||[]).filter(function(a){ return !a.inactive; }).map(function(a){
      return {
        id: a.id, name: a.name, title: a.title||'', phone: a.phone||'', email: a.email||'',
        inactive: a.inactive||false, permission: a.permission||null,
        clockedIn: a.clockedIn||false, clockInTime: a.clockInTime||null,
        clockInShift: a.clockInShift||null, boardRole: a.boardRole||null,
        shiftLog: a.shiftLog||[]
      };
    }),
    // committeeRequests sent separately below when changed, to avoid payload size issues
  };
  try { localStorage.setItem(LS_KEY, JSON.stringify({state: payload.state, juniors: juniors, activeSlots: activeSlots, adults: adults})); } catch(e){}
  if(!DB_AVAILABLE) return;
  fetch('/.netlify/functions/state', {
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'x-api-token': API_TOKEN},
    body: JSON.stringify(payload)
  }).then(function(r){
    if(!r.ok){
      return r.text().then(function(body){
        console.error('Neon save HTTP error:', r.status, body);
        isSaving = false;
      });
    }
    console.log('State saved to Neon');
    lastSyncTime = Date.now();
    _inFlightJuniors.clear();
    _lastSavedHash = _stateHash();
    hideSyncError();
    isSaving = false;
  }).catch(function(e){
    console.error('Neon save network error:', e.message);
    isSaving = false;
    showSyncError(e.message);
  });

  // Save committeeRequests separately in batch mode (upsert only) to avoid size limits
  // Only when something changed — check against a hash (include statuses so approve/reject triggers save)
  var reqHash = committeeRequests.length + ':' + committeeRequests.map(function(r){ return r.id + '=' + r.status; }).join(',');
  if(reqHash !== (_lastReqHash || '')){
    _lastReqHash = reqHash;
    var CREQ_CHUNK = 200;
    function _saveReqChunk(start){
      var chunk = committeeRequests.slice(start, start + CREQ_CHUNK);
      if(!chunk.length) return;
      fetch('/.netlify/functions/state', {
        method: 'POST',
        headers: {'Content-Type':'application/json','x-api-token':API_TOKEN},
        body: JSON.stringify({committeeRequests: chunk, batchMode: true})
      }).then(function(r){
        if(r.ok && start + CREQ_CHUNK < committeeRequests.length){
          _saveReqChunk(start + CREQ_CHUNK);
        }
      }).catch(function(e){ console.warn('committeeRequests save error:', e.message); });
    }
    _saveReqChunk(0);
  }
}

var _lastReqHash = '';
var _lastEtag = ''; // ETag from last successful GET — sent as If-None-Match on polls

var syncErrorShown = false;
function showSyncError(msg){
  if(syncErrorShown) return;
  syncErrorShown = true;
  var banner = document.getElementById('sync-error-banner');
  if(banner){
    banner.style.display = 'flex';
    banner.querySelector('.sync-err-msg').textContent = 'Database offline: ' + (msg||'Connection failed') + ' — data is saved locally and will sync when restored.';
  }
}
function hideSyncError(){
  syncErrorShown = false;
  var banner = document.getElementById('sync-error-banner');
  if(banner) banner.style.display = 'none';
}

// Roster save — sends ALL juniors to Neon (used only on import)
function saveRosterToNeon(callback){
  console.log('Saving full roster to Neon (' + juniors.length + ' juniors)...');
  fetch('/.netlify/functions/state', {
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'x-api-token': API_TOKEN},
    body: JSON.stringify({ juniors: juniors, adults: adults })
  }).then(function(r){
    if(!r.ok) return r.text().then(function(b){ throw new Error(r.status + ': ' + b); });
    console.log('Roster saved to Neon');
    if(callback) callback(null);
  }).catch(function(e){
    console.error('Roster save failed:', e.message);
    if(callback) callback(e);
  });
}

function loadState(){
  if(!DB_AVAILABLE){ _loadFromLocalStorage(); return; }
  fetch('/.netlify/functions/state',{headers:{'x-api-token':API_TOKEN}})
    .then(function(r){
      var etag = r.headers.get('ETag') || r.headers.get('etag');
      if(etag) _lastEtag = etag;
      return r.json();
    })
    .then(function(data){
      _applyState(data);
      // Neon is authoritative for sim time so every device agrees what time
      // it is. localStorage is only a fallback for when Neon has none set.
      var st = (data && (data.state || data)) || {};
      if(st.simTimeEnabled === undefined && st.simTargetEpoch === undefined){
        _restoreSimFromLocalStorage();
      }
      console.log('State loaded from Neon');
      renderOfficer(); renderRoster(); renderSetup(); updateHeaderDate();
      if(document.documentElement.classList.contains('tv-mode')){ updateHeaderDate(); renderBoard(); }
    })
    .catch(function(e){
      console.warn('Neon load failed, using localStorage:', e.message);
      DB_AVAILABLE = false;
      _loadFromLocalStorage();
    });
}

// Fallback only — used when Neon has no sim state, or when Neon is offline.
function _restoreSimFromLocalStorage(){
  try {
    var simRaw = localStorage.getItem('jrc_simstate');
    if(!simRaw) return;
    var sim = JSON.parse(simRaw);
    simTimeEnabled = sim.simTimeEnabled || false;
    simDateSet     = sim.simDateSet     || false;
    if(sim.simTargetEpoch){
      simTargetEpoch = sim.simTargetEpoch;
      simTimeOffset  = sim.simTimeOffset !== undefined ? sim.simTimeOffset : (sim.simTargetEpoch - Date.now());
    } else {
      simTimeOffset  = sim.simTimeOffset || 0;
    }
    if(sim.currentDate)  currentDate  = sim.currentDate;
    if(sim.currentShift) currentShift = sim.currentShift;
  } catch(e){}
}

function _loadFromLocalStorage(){
  try {
    var raw = localStorage.getItem(LS_KEY);
    if(!raw){ console.log('No saved state'); return; }
    _applyState(JSON.parse(raw));
    console.log('State loaded from localStorage');
  } catch(e){ console.warn('localStorage load failed:', e); }
}

function _applyState(data){
  if(!data) return;
  var state = data.state || data;
  var jRows = data.juniors;

  // Rebuild juniors array from Neon — Neon is the authoritative source
  if(jRows && Array.isArray(jRows) && jRows.length > 0){
    juniors = jRows.map(function(row){
      return {
        id:              row.id,
        name:            row.name            || '',
        title:           row.title           || 'Committeeman',
        ageout:          row.ageout          || false,
        hasHat:          row.has_hat         || false,
        notes:           row.notes           || '',
        phone:           row.phone           || '',
        email:           row.email           || '',
        shiftLog:        row.shift_log       || [],
        checkedIn:       row.checked_in      || false,
        assignment:      row.assignment      || null,
        last:            row.last_assignment || 'None',
        order:           row.check_in_order  || 0,
        checkInShift:    row.check_in_shift  || '',
        shiftAssignments:row.shift_assignments || {},
        plannedShifts:   row.planned_shifts  || [],
        history:         row.history         || [],
        inactive:        row.inactive        || false,
        noteLog:         row.note_log        || [],
      };
    });
  }

  // Rebuild adults array from Neon
  if(data.adults && Array.isArray(data.adults) && data.adults.length > 0){
    adults = data.adults.map(function(row){
      return {
        id: row.id, name: row.name||'', title: row.title||'', noteLog: row.note_log||[],
        phone: row.phone||'', email: row.email||'', inactive: row.inactive||false,
        permission: row.permission||null,
        clockedIn: row.clocked_in||row.clockedIn||false,
        clockInTime: row.clock_in_time||row.clockInTime||null,
        clockInShift: row.clock_in_shift||row.clockInShift||null,
        boardRole: row.board_role||row.boardRole||null,
        shiftLog: row.shift_log||row.shiftLog||[]
      };
    });
  }
  if(data.activeSlots && data.activeSlots.length){
    activeSlots = data.activeSlots.map(function(s){
      return {
        id: s.id, name: s.name, shift: s.shift, capacity: s.capacity||4,
        assigned: s.assigned||[], hat: s.hat||false,
        liaison: s.liaison||'', liaisonPhone: s.liaison_phone||s.liaisonPhone||'',
        location: s.location||'', duties: s.duties||'',
        notes: s.slot_notes||s.notes||'', custom: s.custom||false,
        highPriority: s.high_priority||s.highPriority||false,
      };
    });
    // Stamp which date these slots belong to so date-change detection works
    window._activeSlotsDate = state.currentDate || currentDate || '';
  } else {
    // Neon has no slots — try to recover from localStorage backup
    try {
      var lsRaw = localStorage.getItem(LS_KEY);
      if(lsRaw){
        var lsData = JSON.parse(lsRaw);
        if(lsData.activeSlots && lsData.activeSlots.length){
          activeSlots = lsData.activeSlots;
          console.warn('Active slots recovered from localStorage backup');
        }

      }
    } catch(e){}
  }
  if(state.userRoles) userRoles = state.userRoles;
  if(state.loginLog)  loginLog  = state.loginLog;
  if(data.committeeRequests && data.committeeRequests.length){
    committeeRequests = data.committeeRequests.map(function(r){
      if(r.data && typeof r.data === 'string'){ try{ return JSON.parse(r.data); }catch(e){ return r; } }
      if(r.data && typeof r.data === 'object') return r.data;
      return r;
    });
  }
  if(state.clockedOut)       clockedOut       = state.clockedOut;
  if(state.clockedOutShifts) clockedOutShifts = state.clockedOutShifts;
  if(state.onShiftJuniors)   onShiftJuniors   = new Set(state.onShiftJuniors);
  if(state.onShiftSlots)   onShiftSlots   = new Set(state.onShiftSlots);
  if(state.currentDate){
    currentDate = state.currentDate;
    // Update setup-date picker so board/preview reflect correct date
    var sdEl = document.getElementById('setup-date');
    if(sdEl && state.currentDate) sdEl.value = state.currentDate;
    // Auto-load slots for this date if none in state
    if(!activeSlots.length) _loadSlotsForDate(state.currentDate);
  }
  if(state.currentShift)   currentShift   = state.currentShift;
  if(state.checkInOrder)   checkInOrder   = state.checkInOrder;
  if(state.lockedJuniors)  lockedJuniors  = new Set(state.lockedJuniors);
  if(state.simTimeEnabled !== undefined) simTimeEnabled = state.simTimeEnabled;
  if(state.simDateSet     !== undefined) simDateSet      = state.simDateSet;
  // Recompute simTimeOffset from absolute target epoch so TV/other devices show correct sim time
  if(state.prioritySlots) prioritySlots = state.prioritySlots;
  if(state.simTargetEpoch){
    simTargetEpoch = state.simTargetEpoch;
      simTimeOffset  = state.simTimeOffset !== undefined ? state.simTimeOffset : (state.simTargetEpoch - Date.now());
  } else if(state.simTimeOffset !== undefined){
    simTimeOffset  = state.simTimeOffset;
  }
}

function clearSavedState(){
  localStorage.removeItem(LS_KEY);
  try { localStorage.removeItem('jrc_simstate'); } catch(e){}
  console.log('Saved state cleared');
}

function confirmClearShift(){
  if(!confirm('Clear all check-ins and assignments for this shift?\n\nRoster data and shift history will NOT be affected.')) return;
  resetShift();
}

function confirmClearHistory(){
  var first = confirm('WARNING: This will permanently erase ALL committee assignment history for every junior.\n\nThis cannot be undone. Continue?');
  if(!first) return;
  var second = confirm('Are you absolutely sure? All "last assignment" and history data will be lost.');
  if(!second) return;
  resetAllHistory();
  saveRosterToNeon(null);
  showAlert('All assignment history cleared.', 'info');
}

function confirmFullReset(){
  var first = confirm('FULL DATABASE RESET\n\nThis will permanently delete:\n• All juniors and adults\n• All shift history and hours\n• All check-ins and assignments\n• All committee slots\n\nThis CANNOT be undone. Continue?');
  if(!first) return;
  var second = confirm('Last chance — type OK to confirm you want to wipe the entire database.');
  if(!second) return;
  // Clear everything in memory
  juniors = []; adults = []; activeSlots = []; committeeRequests = [];
  clockedOut = {}; onShiftJuniors = new Set(); onShiftSlots = new Set();
  checkInOrder = 0; lockedJuniors = new Set(); notesState = {};
  clearSimTime();
  localStorage.removeItem(LS_KEY);
  try { localStorage.removeItem('jrc_simstate'); } catch(e){}
  // Wipe Neon via the reset endpoint
  fetch('/.netlify/functions/reset', {method:'POST'})
    .then(function(r){ return r.json(); })
    .then(function(d){
      if(d.success){
        alert('Database wiped. You can now upload a fresh roster.');
        renderOfficer(); renderRoster(); renderBoard();
      } else {
        alert('Reset failed: ' + (d.error || 'unknown error'));
      }
    })
    .catch(function(e){ alert('Reset failed: ' + e.message); });
}

// ── Real-time sync polling ────────────────────────────────────────────────────
var pollTimer = null;
var lastSyncTime = 0;

var headerClockTimer = null;

function startPolling(){
  if(pollTimer) clearInterval(pollTimer);
  var isTV = document.documentElement.classList.contains('tv-mode');
  var interval = isTV ? 10000 : 60000; // TV: 10s for live board; normal: 60s to spare Neon
  pollTimer = setInterval(function(){
    if(!document.hidden) pollForUpdates();
  }, interval);
  if(headerClockTimer) clearInterval(headerClockTimer);
  headerClockTimer = setInterval(function(){ updateHeaderClock(); updateBoardClock(); }, 1000); // 1s for seconds display

  // When user returns to tab after being away, poll immediately
  document.addEventListener('visibilitychange', function(){
    if(!document.hidden && currentRole){
      // Tab became visible — poll now to catch up, then resume normal interval
      pollForUpdates();
    }
  });
}

function stopPolling(){
  if(pollTimer) clearInterval(pollTimer);
  pollTimer = null;
}

function pollForUpdates(){
  if(!DB_AVAILABLE) return;
  if(isSaving) return;
  // Don't poll if we saved very recently — our local state is newer than Neon
  // Short grace only — long enough for our own POST to land, not long enough
  // to blind this device to what other devices are doing. (Was 60s, which on
  // a kiosk that saves every check-in meant polls effectively never ran.)
  if(Date.now() - lastSaveTime < 8000) return;
  var _pollHeaders = {'x-api-token':API_TOKEN};
  if(_lastEtag) _pollHeaders['If-None-Match'] = _lastEtag;
  fetch('/.netlify/functions/state',{headers:_pollHeaders})
    .then(function(r){
      // 304 Not Modified — nothing changed, skip re-render
      if(r.status === 304) return null;
      var etag = r.headers.get('ETag') || r.headers.get('etag');
      if(etag) _lastEtag = etag;
      return r.json();
    })
    .then(function(data){
      if(!data) return; // 304 — no-op
      if(data.error) return;

      // Preserve the officer's chosen shift TAB — that's a per-device UI
      // choice and must not be yanked around by another device.
      var localCurrentShift = currentShift;
      // Sim time set on this device in the last 15s hasn't round-tripped yet.
      var justSetSimHere = (Date.now() - _simSetLocallyAt) < 15000;
      var localSimEnabled = simTimeEnabled;
      var localSimOffset  = simTimeOffset;
      var localSimTarget  = simTargetEpoch;
      var localSimDateSet = simDateSet;

      // Snapshot ONLY juniors with unsaved local changes.
      var localJuniorState = {};
      juniors.forEach(function(j){
        if(!dirtyJuniors.has(j.id) && !_inFlightJuniors.has(j.id)) return;
        localJuniorState[j.id] = {
          checkedIn: j.checkedIn, assignment: j.assignment,
          plannedShifts: j.plannedShifts, shiftAssignments: j.shiftAssignments,
          checkInShift: j.checkInShift, order: j.order,
          clockedOut: !!(clockedOut[j.id] || clockedOut[String(j.id)]),
          clockedOutShifts: clockedOutShifts[j.id] || null
        };
      });

      _applyState(data);

      // Sim time is a SYSTEM setting — the server is authoritative so the
      // kiosk, the dashboard and the TV all agree what time it is. Only a
      // set we just made here overrides it.
      if(justSetSimHere){
        simTimeEnabled = localSimEnabled;
        simTimeOffset  = localSimOffset;
        simTargetEpoch = localSimTarget;
        simDateSet     = localSimDateSet;
      }
      // Officer's tab is local
      if(localCurrentShift) currentShift = localCurrentShift;

      // Reapply unsaved local junior changes — note these write falsy values
      // too, so a pending clock-out isn't resurrected by stale server data.
      Object.keys(localJuniorState).forEach(function(jid){
        var local = localJuniorState[jid];
        var j = juniors.find(function(x){ return String(x.id) === String(jid); });
        if(!j) return;
        j.checkedIn        = local.checkedIn;
        j.assignment       = local.assignment;
        j.checkInShift     = local.checkInShift;
        if(local.order) j.order = local.order;
        if(local.plannedShifts) j.plannedShifts = local.plannedShifts;
        if(local.shiftAssignments) j.shiftAssignments = local.shiftAssignments;
        if(local.clockedOut) clockedOut[j.id] = true;
        else { delete clockedOut[j.id]; delete clockedOut[String(j.id)]; }
        if(local.clockedOutShifts) clockedOutShifts[j.id] = local.clockedOutShifts;
      });
      lastSyncTime = Date.now();
      // Re-render current tab
      var activePanel = document.querySelector('.panel[style*="display: block"], .panel[style*="display:block"]');
      if(activePanel){
        var id = activePanel.id;
        if(id === 'panel-officer') renderOfficer();
        if(id === 'panel-roster') renderRoster();
        if(id === 'panel-board') renderBoard();
        if(id === 'panel-kiosk'){ renderKiosk(); updateKioskShiftBanner(); }
      }
      updateHeaderDate();
      // TV mode always re-renders board on every poll
      if(document.documentElement.classList.contains('tv-mode')){
        updateHeaderDate();
        renderBoard();
      }
    })
    .catch(function(){});
}

// ============================================================
// HOURS REPORT
// ============================================================

function getTotalHours(jr){
  if(!jr.shiftLog || !jr.shiftLog.length) return 0;
  return jr.shiftLog.reduce(function(sum, e){ return sum + (e.hours !== undefined ? e.hours : 4); }, 0);
}

function renderLoginHistory(){
  var el = document.getElementById('login-history-list');
  if(!el) return;
  if(!loginLog.length){
    el.innerHTML = '<div style="color:#999;font-size:13px">No logins recorded yet.</div>';
    return;
  }
  var html = '<table style="width:100%;border-collapse:collapse;font-size:12px">' +
    '<thead><tr>' +
    '<th style="text-align:left;padding:6px 8px;border-bottom:2px solid var(--gray-150);color:var(--navy);white-space:nowrap">Date &amp; Time</th>' +
    '<th style="text-align:left;padding:6px 8px;border-bottom:2px solid var(--gray-150);color:var(--navy)">Name</th>' +
    '<th style="text-align:left;padding:6px 8px;border-bottom:2px solid var(--gray-150);color:var(--navy)">Role</th>' +
    '<th style="text-align:left;padding:6px 8px;border-bottom:2px solid var(--gray-150);color:var(--navy)">Device</th>' +
    '</tr></thead><tbody>';

  loginLog.forEach(function(e, i){
    var d = new Date(e.ts);
    var dateStr = (d.getMonth()+1) + '/' + d.getDate() + '/' + d.getFullYear();
    var h = d.getHours(), m = String(d.getMinutes()).padStart(2,'0');
    var ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    var timeStr = h + ':' + m + ' ' + ampm;
    var rowBg = i % 2 === 0 ? '' : 'background:var(--gray-50)';
    html += '<tr style="' + rowBg + '">' +
      '<td style="padding:5px 8px;white-space:nowrap;color:#667788">' + dateStr + ' ' + timeStr + '</td>' +
      '<td style="padding:5px 8px;font-weight:600;color:var(--navy)">' + (e.name || '—') + '</td>' +
      '<td style="padding:5px 8px">' + (e.role || '—') + '</td>' +
      '<td style="padding:5px 8px;color:#667788">' + (e.device || '—') + '</td>' +
      '</tr>';
  });
  html += '</tbody></table>';
  el.innerHTML = html;
}

function renderUserMgmt(){
  var el = document.getElementById('user-mgmt-list');
  if(!el) return;
  if(!adults.length){ el.innerHTML = '<div style="color:#999;font-size:13px">No adults loaded yet. Import a roster first.</div>'; return; }

  var roleOpts = [
    {val:'', lbl:'-- No Access --'},
    {val:'admin', lbl:'Administrator (all tabs)'},
    {val:'slt', lbl:'VC / SLT (all except settings)'},
    {val:'officer', lbl:'Shift Officer (dashboard, checkins, roster, board, hours, submit request)'},
    {val:'scheduling', lbl:'Scheduling Team (submit request + requests tab)'},
    {val:'junior', lbl:'Junior Committeeman (kiosk only)'}
  ];

  var html = '<table style="width:100%;border-collapse:collapse;font-size:13px">' +
    '<thead><tr>' +
    '<th style="text-align:left;padding:6px 8px;border-bottom:2px solid var(--gray-150);color:var(--navy)">Name</th>' +
    '<th style="text-align:left;padding:6px 8px;border-bottom:2px solid var(--gray-150);color:var(--navy)">Email</th>' +
    '<th style="text-align:left;padding:6px 8px;border-bottom:2px solid var(--gray-150);color:var(--navy)">Member #</th>' +
    '<th style="text-align:left;padding:6px 8px;border-bottom:2px solid var(--gray-150);color:var(--navy)">Role</th>' +
    '</tr></thead><tbody>';

  adults.filter(function(a){ return !a.inactive; }).forEach(function(a){
    var cur = userRoles[a.id] || '';
    var opts = roleOpts.map(function(o){
      return '<option value="'+o.val+'"'+(o.val===cur?' selected':'')+'>'+o.lbl+'</option>';
    }).join('');
    html += '<tr style="border-bottom:1px solid var(--gray-100)">' +
      '<td style="padding:6px 8px">'+a.name+'</td>' +
      '<td style="padding:6px 8px;color:#667788;font-size:12px">'+(a.email||'<span style="color:#ccc">no email</span>')+'</td>' +
      '<td style="padding:6px 8px;color:#667788;font-size:12px">'+a.id+'</td>' +
      '<td style="padding:6px 8px"><select class="finput" style="font-size:12px;padding:4px 8px" id="umr-'+a.id+'">'+opts+'</select></td>' +
      '</tr>';
  });
  html += '</tbody></table>';
  el.innerHTML = html;
}

function saveUserRoles(){
  var newRoles = {};
  adults.filter(function(a){ return !a.inactive; }).forEach(function(a){
    var sel = document.getElementById('umr-' + a.id);
    if(sel && sel.value) newRoles[a.id] = sel.value;
  });
  userRoles = newRoles;
  saveStateNow();
  var msg = document.getElementById('user-mgmt-msg');
  if(msg){ msg.style.color = '#155724'; msg.textContent = '✓ Role assignments saved.'; setTimeout(function(){ msg.textContent=''; }, 3000); }
}

function renderHours(){
  var el = document.getElementById('hours-body');
  var summaryEl = document.getElementById('hours-summary');
  if(!el) return;

  var q = (document.getElementById('hours-search').value || '').toLowerCase();
  var sort = document.getElementById('hours-sort').value;

  var list = juniors.filter(function(j){ return !q || j.name.toLowerCase().includes(q); });

  // Sort
  list.sort(function(a, b){
    if(sort === 'hours-desc') return getTotalHours(b) - getTotalHours(a);
    if(sort === 'hours-asc') return getTotalHours(a) - getTotalHours(b);
    return a.name.localeCompare(b.name);
  });

  // Summary stats
  var totalShifts = juniors.reduce(function(s, j){ return s + (j.shiftLog ? j.shiftLog.length : 0); }, 0);
  var totalHours  = juniors.reduce(function(s, j){ return s + getTotalHours(j); }, 0);
  var noShows     = juniors.reduce(function(s, j){
    var fromShiftLog = j.shiftLog ? j.shiftLog.filter(function(e){ return e.noshow; }).length : 0;
    var fromNoteLog  = j.noteLog  ? j.noteLog.filter(function(e){
      return e.type === 'noshow-nocall' || e.type === 'noshow-prior' || e.type === 'noshow-dayof';
    }).length : 0;
    return s + fromShiftLog + fromNoteLog;
  }, 0);


  summaryEl.innerHTML =
    '<div class="stat-card" style="flex:1;min-width:120px"><div class="stat-lbl">Total Shifts</div><div class="stat-val">' + totalShifts + '</div></div>' +
    '<div class="stat-card" style="flex:1;min-width:120px"><div class="stat-lbl">Total Hours</div><div class="stat-val">' + totalHours + '</div></div>' +
    '<div class="stat-card" style="flex:1;min-width:120px"><div class="stat-lbl">No-Shows</div><div class="stat-val" style="color:var(--red)">' + noShows + '</div></div>';

  el.innerHTML = list.map(function(j){
    var hrs = getTotalHours(j);
    var log = j.shiftLog || [];
    var noShowCount = log.filter(function(e){ return e.noshow; }).length +
      ((j.noteLog||[]).filter(function(e){
        return e.type==='noshow-nocall'||e.type==='noshow-prior'||e.type==='noshow-dayof';
      }).length);


    // Expandable shift log rows
    var logRows = log.length === 0 ? '<tr><td colspan="6" style="font-size:11px;color:var(--gray-400);padding:4px 12px">No shifts recorded</td></tr>' :
      log.map(function(e, ei){
        var ri = juniors.indexOf(j);
        return '<tr style="background:#F8F9FA">' +
          '<td colspan="2" style="font-size:11px;padding:3px 12px;color:var(--gray-500)">' +
            fmtDate(e.date) + ' &mdash; ' + SL[e.shift] + ' &mdash; ' + e.committee +
          '</td>' +
          '<td style="font-size:11px;padding:3px 8px">' +
            '<select class="finput" style="font-size:11px;padding:1px 4px;width:70px" onchange="updateShiftHours(' + ri + ',' + ei + ',this.value)">' +
              [0,1,2,3,4].map(function(h){ return '<option value="' + h + '"' + (e.hours === h ? ' selected' : '') + '>' + h + ' hr' + (h !== 1 ? 's' : '') + '</option>'; }).join('') +
            '</select>' +
          '</td>' +
          '<td style="font-size:11px;padding:3px 8px">' +
            '<label style="display:flex;align-items:center;gap:4px;font-size:11px"><input type="checkbox"' + (e.noshow ? ' checked' : '') + ' onchange="updateShiftNoShow(' + ri + ',' + ei + ',this.checked)"> No-show</label>' +
          '</td>' +
          '<td colspan="2" style="font-size:11px;padding:3px 8px">' +
            '<input class="finput" style="font-size:11px;padding:1px 6px;width:100%" placeholder="Note..." value="' + (e.note||'') + '" onchange="updateShiftNote(' + ri + ',' + ei + ',this.value)">' +
          '</td>' +
        '</tr>';
      }).join('');

    return '<tr style="cursor:pointer" onclick="var s=this.nextElementSibling;s.style.display=s.style.display===\'none\'?\'\':\'none\'">' +
      '<td style="font-weight:600;color:var(--navy)">' + j.name + (j.ageout ? ' <span class="badge b-ageout" style="font-size:11px;padding:1px 4px;background:none;border:none;color:#F5A623">⭐</span>' : '') + '</td>' +
      '<td style="font-size:12px">' + j.title.replace('Junior ','') + '</td>' +
      '<td style="font-weight:700;color:' + (hrs >= 8 ? 'var(--green)' : hrs > 0 ? 'var(--navy)' : 'var(--gray-400)') + '">' + hrs + ' hrs</td>' +
      '<td style="font-size:12px">' + log.length + '</td>' +
      '<td style="font-size:12px;color:' + (noShowCount > 0 ? 'var(--red)' : 'var(--gray-400)') + '">' + (noShowCount || '—') + '</td>' +

    '</tr>' +
    '<tr style="display:none"><td colspan="6" style="padding:0"><table style="width:100%;border-collapse:collapse">' + logRows + '</table></td></tr>';
  }).join('');
}

function getAdultTotalHours(a){
  if(!Array.isArray(a.shiftLog)) return 0;
  return a.shiftLog.reduce(function(s, e){ return s + (e.out ? 4 : 0); }, 0); // 4hrs per completed shift
}

function renderAdultHours(){
  var el = document.getElementById('adult-hours-body');
  var summaryEl = document.getElementById('adult-hours-summary');
  if(!el) return;

  var q = (document.getElementById('adult-hours-search') ? document.getElementById('adult-hours-search').value : '').toLowerCase();
  var sort = document.getElementById('adult-hours-sort') ? document.getElementById('adult-hours-sort').value : 'name';

  var list = (adults||[]).filter(function(a){ return !a.inactive && (!q || a.name.toLowerCase().includes(q)); });
  list.sort(function(a,b){
    if(sort === 'hours-desc') return getAdultTotalHours(b) - getAdultTotalHours(a);
    if(sort === 'hours-asc') return getAdultTotalHours(a) - getAdultTotalHours(b);
    return a.name.localeCompare(b.name);
  });

  var totalShifts = list.reduce(function(s,a){ return s + (Array.isArray(a.shiftLog) ? a.shiftLog.length : 0); }, 0);
  var totalHours  = list.reduce(function(s,a){ return s + getAdultTotalHours(a); }, 0);
  var noShows     = list.reduce(function(s,a){
    return s + ((a.noteLog||[]).filter(function(e){
      return e.type==='noshow-nocall'||e.type==='noshow-prior'||e.type==='noshow-dayof';
    }).length);
  }, 0);

  if(summaryEl){
    summaryEl.innerHTML =
      '<div class="stat-card" style="flex:1;min-width:120px"><div class="stat-lbl">Total Shifts</div><div class="stat-val">' + totalShifts + '</div></div>' +
      '<div class="stat-card" style="flex:1;min-width:120px"><div class="stat-lbl">Total Hours</div><div class="stat-val">' + totalHours + '</div></div>' +
      '<div class="stat-card" style="flex:1;min-width:120px"><div class="stat-lbl">No-Shows</div><div class="stat-val" style="color:var(--red)">' + noShows + '</div></div>';
  }

  el.innerHTML = list.map(function(a){
    var hrs = getAdultTotalHours(a);
    var shiftLog = Array.isArray(a.shiftLog) ? a.shiftLog : [];
    var noShowCount = ((a.noteLog||[]).filter(function(e){
      return e.type==='noshow-nocall'||e.type==='noshow-prior'||e.type==='noshow-dayof';
    }).length);
    var logRows = shiftLog.length === 0
      ? '<tr><td colspan="5" style="font-size:11px;color:var(--gray-400);padding:4px 12px">No shifts recorded</td></tr>'
      : shiftLog.map(function(e){
          var ROLE_LABELS = {vc:'VC on Shift', so:'Shift Officer', mentor:'Mentor'};
          var roleStr = ROLE_LABELS[e.role] || e.role || 'Mentor';
          return '<tr style="background:#F8F9FA">' +
            '<td colspan="2" style="font-size:11px;padding:3px 12px;color:var(--gray-500)">' +
              (e.date||'') + ' &mdash; ' + (e.shift||'') + (e.in ? ' (In: ' + e.in + (e.out ? ', Out: ' + e.out : '') + ')' : '') +
            '</td>' +
            '<td style="font-size:11px;padding:3px 8px;color:var(--gray-500)">' + roleStr + '</td>' +
            '<td colspan="2" style="font-size:11px;padding:3px 8px;color:var(--gray-400)">' + (e.out ? '4 hrs' : 'In progress') + '</td>' +
          '</tr>';
        }).join('');

    var PERM_LABELS = {admin:'Admin','vc-slt':'VC/SLT',officer:'Shift Officer',scheduling:'Scheduler'};
    return '<tr style="cursor:pointer" onclick="var s=this.nextElementSibling;s.style.display=s.style.display===\'none\'?\'\':\'none\'">' +
      '<td style="font-weight:600;color:var(--navy)">' + a.name + '</td>' +
      '<td style="font-size:12px">' + (a.title||'') + '</td>' +
      '<td style="font-weight:700;color:' + (hrs >= 8 ? 'var(--green)' : hrs > 0 ? 'var(--navy)' : 'var(--gray-400)') + '">' + hrs + ' hrs</td>' +
      '<td style="font-size:12px">' + shiftLog.length + '</td>' +
      '<td style="font-size:12px;color:' + (noShowCount > 0 ? 'var(--red)' : 'var(--gray-400)') + '">' + (noShowCount || '—') + '</td>' +
    '</tr>' +
    '<tr style="display:none"><td colspan="5" style="padding:0"><table style="width:100%;border-collapse:collapse">' + logRows + '</table></td></tr>';
  }).join('');
}

function updateShiftHours(jri, ei, val){
  if(juniors[jri] && juniors[jri].shiftLog[ei] !== undefined){
    juniors[jri].shiftLog[ei].hours = parseInt(val);
    renderHours();
    saveState();
  }
}

function updateShiftNoShow(jri, ei, val){
  if(juniors[jri] && juniors[jri].shiftLog[ei] !== undefined){
    juniors[jri].shiftLog[ei].noshow = val;
    if(val) juniors[jri].shiftLog[ei].hours = 0;
    renderHours();
    saveState();
  }
}

function updateShiftNote(jri, ei, val){
  if(juniors[jri] && juniors[jri].shiftLog[ei] !== undefined){
    juniors[jri].shiftLog[ei].note = val;
    saveState();
  }
}

function exportHoursCSV(){
  var NOTE_LABELS = {
    'noshow-nocall': 'NO SHOW: No Call',
    'noshow-prior':  'NO SHOW: Called Prior to Shift Date',
    'noshow-dayof':  'NO SHOW: Called Day of Shift',
    'incident':      'Incident on Shift',
    'note':          'Additional Information'
  };

  var list = juniors.filter(function(j){ return !j.inactive; })
    .sort(function(a,b){ return a.name.localeCompare(b.name); });

  // ── Sheet 1: Detail — one row per shift entry or manager note ────────────
  var detail = [['Member #','Name','Title','Age-Out','Date','Shift','Committee','Hours','No-Show','Shift Note','Manager Note Type','Manager Note']];

  list.forEach(function(j){
    var shiftLog = Array.isArray(j.shiftLog) ? j.shiftLog : [];
    var noteLog  = Array.isArray(j.noteLog)  ? j.noteLog  : [];

    shiftLog.forEach(function(e){
      detail.push([
        j.id, j.name, j.title||'', j.ageout?'Yes':'No',
        e.date ? fmtDate(e.date) : '', SL[e.shift]||e.shift||'', e.committee||'',
        e.noshow ? 0 : (e.hours||4),
        e.noshow ? 'Yes' : 'No',
        e.note||'', '', ''
      ]);
    });

    noteLog.forEach(function(e){
      var d = new Date(e.ts);
      var ds = (d.getMonth()+1)+'/'+d.getDate()+'/'+d.getFullYear();
      detail.push([
        j.id, j.name, j.title||'', j.ageout?'Yes':'No',
        ds, '', '', '', '', '',
        NOTE_LABELS[e.type]||e.type||'Note',
        (e.by?'['+e.by+'] ':'')+( e.text||'')
      ]);
    });

    if(!shiftLog.length && !noteLog.length){
      detail.push([j.id, j.name, j.title||'', j.ageout?'Yes':'No', '', '', '', 0, 'No', '', '', '']);
    }
  });

  // ── Sheet 2: Summary — one row per junior ────────────────────────────────
  var summary = [['Member #','Name','Title','Age-Out','Total Hours','Shifts Worked','No-Shows']];

  list.forEach(function(j){
    var shiftLog = Array.isArray(j.shiftLog) ? j.shiftLog : [];
    var noteLog  = Array.isArray(j.noteLog)  ? j.noteLog  : [];

    var totalHrs    = shiftLog.reduce(function(s,e){ return s + (e.noshow ? 0 : (e.hours||4)); }, 0);
    var shiftsWorked = shiftLog.filter(function(e){ return !e.noshow; }).length;
    var noShowsLog  = shiftLog.filter(function(e){ return e.noshow; }).length;
    var noShowsNote = noteLog.filter(function(e){
      return e.type==='noshow-nocall'||e.type==='noshow-prior'||e.type==='noshow-dayof';
    }).length;

    summary.push([
      j.id, j.name, j.title||'', j.ageout?'Yes':'No',
      totalHrs, shiftsWorked, noShowsLog + noShowsNote
    ]);
  });

  // ── Build workbook with two sheets ───────────────────────────────────────
  var wb = XLSX.utils.book_new();
  var ws1 = XLSX.utils.aoa_to_sheet(detail);
  var ws2 = XLSX.utils.aoa_to_sheet(summary);

  // Column widths for detail sheet
  ws1['!cols'] = [
    {wch:12},{wch:28},{wch:20},{wch:8},{wch:12},{wch:12},{wch:28},
    {wch:8},{wch:9},{wch:20},{wch:30},{wch:50}
  ];
  // Column widths for summary sheet
  ws2['!cols'] = [{wch:12},{wch:28},{wch:20},{wch:8},{wch:12},{wch:14},{wch:10}];

  XLSX.utils.book_append_sheet(wb, ws1, 'Detail');
  XLSX.utils.book_append_sheet(wb, ws2, 'Summary');

  var fname = 'JRC_Hours_' + (currentDate||new Date().toISOString().slice(0,10)) + '.xlsx';
  XLSX.writeFile(wb, fname);
}


// ============================================================
// ROSTER IMPORT — Junior, Adult, Age-Out (separate uploads)
// ============================================================

// TITLE → PERMISSION MAPPING (adults)
var ADULT_PERMISSION_TITLES = {
  'admin':         'admin',
  'vc/slt':        'vc-slt',
  'shift officer': 'officer',
  'scheduler':     'scheduling'
};
// Titles that get NO system permissions (hours tracking only)
var ADULT_NO_PERM_TITLES = [
  'ambassador','past committee chairman','committee member','coordinator',
  'officer in charge','lifetime vice president','lifetime director',
  'lifetime committeeman'
];

var pendingImports = { junior: null, adult: null, ageout: null };

function _titleToPermission(title){
  var t = String(title||'').toLowerCase().trim();
  for(var k in ADULT_PERMISSION_TITLES){
    if(t === k) return ADULT_PERMISSION_TITLES[k];
  }
  return null; // no system login
}

function handleRosterUpload(event, type){
  var file = event.target.files[0];
  if(!file) return;
  var statusEl = document.getElementById(type + '-upload-status');
  statusEl.textContent = 'Reading file...';

  var reader = new FileReader();
  reader.onload = function(e){
    try {
      var wb   = XLSX.read(new Uint8Array(e.target.result), {type:'array'});
      var rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {header:1});

      var members = [];

      if(type === 'ageout'){
        // Age-out sheet: col B (index 1) = member#, col G (index 6) = YES
        for(var i = 1; i < rows.length; i++){
          var row = rows[i];
          if(!row || !row[1]) continue;
          var id = String(Math.round(parseFloat(row[1]))).trim();
          if(isNaN(parseInt(id))) continue;
          var ao = String(row[6]||'').trim().toUpperCase();
          members.push({id:id, ageout: (ao === 'YES' || ao === 'Y')});
        }

        if(!members.length){ statusEl.textContent = 'No members found in age-out file.'; return; }
        pendingImports.ageout = members;

        var aoCount = members.filter(function(m){ return m.ageout; }).length;
        document.getElementById('ageout-preview-title').textContent =
          members.length + ' members scanned — ' + aoCount + ' flagged as age-out';
        document.getElementById('ageout-preview-list').innerHTML =
          members.filter(function(m){ return m.ageout; }).slice(0,60).map(function(m){
            var jr = juniors.find(function(j){ return j.id === m.id; });
            return '<div style="padding:2px 0;border-bottom:1px solid #F0F0F0">' +
              '&#11088; <strong>' + (jr ? jr.name : m.id) + '</strong> — ' + m.id + '</div>';
          }).join('') + (aoCount > 60 ? '<div style="color:#888">…and ' + (aoCount-60) + ' more</div>' : '');
        document.getElementById('ageout-roster-preview').style.display = 'block';
        statusEl.textContent = '';
        return;
      }

      // Junior and Adult share same column layout:
      // A=title(0), B=member#(1), H=preferred(7), G=last(6), P=phone(15), R=email(17)
      for(var i = 1; i < rows.length; i++){
        var row = rows[i];
        if(!row || !row[1]) continue;
        var id = String(Math.round(parseFloat(row[1]))).trim();
        if(isNaN(parseInt(id))) continue;

        var preferred = String(row[7]||'').trim();
        var last      = String(row[6]||'').trim();
        var first     = preferred || String(row[5]||'').trim(); // col F fallback
        var name      = (first + ' ' + last).trim();
        if(!name) continue;

        // Phone: col P (index 15)
        var phone = '';
        if(row[15]){
          var digits = String(row[15]).replace(/\D/g,'');
          if(digits.length === 11 && digits[0] === '1') digits = digits.slice(1);
          if(digits.length === 10) phone = '(' + digits.slice(0,3) + ') ' + digits.slice(3,6) + '-' + digits.slice(6);
        }

        // Email: col R (index 17)
        var email = String(row[17]||'').trim();
        if(email.startsWith('=')) email = '';

        // Title: col A (index 0)
        var title = String(row[0]||'').trim() || (type === 'junior' ? 'Junior Committeeman' : 'Committee Member');

        members.push({id:id, name:name, title:title, phone:phone, email:email});
      }

      if(!members.length){ statusEl.textContent = 'No members found — check file format.'; return; }
      pendingImports[type] = members;

      // Build preview
      var existing = type === 'junior' ? juniors : adults;
      var importIds = {};
      members.forEach(function(m){ importIds[m.id] = true; });
      var newCount = 0, updateCount = 0, inactiveCount = 0;
      members.forEach(function(m){
        var ex = existing.find(function(x){ return x.id === m.id; });
        if(ex) updateCount++; else newCount++;
      });
      existing.forEach(function(x){
        if(!importIds[x.id] && !x.inactive) inactiveCount++;
      });

      var permLabel = type === 'adult' ? ' (existing permissions preserved)' : '';
      document.getElementById(type + '-preview-title').textContent =
        members.length + ' members — ' + newCount + ' new, ' + updateCount + ' updates' +
        (inactiveCount ? ', ' + inactiveCount + ' will be marked inactive' : '') + permLabel;

      document.getElementById(type + '-preview-list').innerHTML =
        members.slice(0,60).map(function(m){
          var ex = existing.find(function(x){ return x.id === m.id; });
          var permBadge = '';  // permissions not changed by roster upload
          var action = ex ? '<span style="color:#2A7D2A;font-size:10px">update</span> ' : '<span style="color:#4A6CF7;font-size:10px">new</span> ';
          return '<div style="padding:2px 0;border-bottom:1px solid #F0F0F0">' + action +
            '<strong>' + m.name + '</strong> — ' + m.id +
            ' <span style="color:#888;font-size:10px">' + m.title + '</span>' + permBadge +
            (m.phone ? ' &bull; ' + m.phone : '') + '</div>';
        }).join('') + (members.length > 60 ? '<div style="color:#888">…and ' + (members.length-60) + ' more</div>' : '');

      document.getElementById(type + '-roster-preview').style.display = 'block';
      statusEl.textContent = '';
    } catch(err){
      statusEl.textContent = 'Error reading file: ' + err.message;
      console.error(err);
    }
  };
  reader.readAsArrayBuffer(file);
}

function applyRosterImport(type){
  var data = pendingImports[type];
  if(!data) return;
  var statusEl = document.getElementById(type + '-upload-status');
  statusEl.textContent = 'Applying...';

  if(type === 'ageout'){
    // Apply age-out flags to juniors only
    var changed = 0;
    data.forEach(function(m){
      var jr = juniors.find(function(j){ return j.id === m.id; });
      if(jr && jr.ageout !== m.ageout){ jr.ageout = m.ageout; changed++; }
    });
    // Clear age-out for juniors not in this list
    juniors.forEach(function(j){
      var found = data.find(function(m){ return m.id === j.id; });
      if(!found && j.ageout){ j.ageout = false; changed++; }
    });
    cancelRosterImport('ageout');
    saveRosterToNeon(function(err){
      statusEl.innerHTML = err
        ? '&#9888; Age-out list applied locally but save failed.'
        : '&#10003; Age-out list applied: ' + changed + ' junior' + (changed!==1?'s':'') + ' updated.';
    });
    return;
  }

  if(type === 'junior'){
    var importIds = {};
    data.forEach(function(m){ importIds[m.id] = true; });
    var added = 0, updated = 0, reactivated = 0, deactivated = 0;

    data.forEach(function(m){
      var ex = juniors.find(function(j){ return j.id === m.id; });
      if(ex){
        ex.name=m.name; ex.phone=m.phone; ex.email=m.email; ex.title=m.title;
        if(ex.inactive){ ex.inactive=false; reactivated++; } else updated++;
      } else {
        juniors.push({
          id:m.id, name:m.name, title:m.title, phone:m.phone, email:m.email,
          ageout:false, hasHat:false, notes:'', checkedIn:false, assignment:null,
          last:'None', order:0, checkInShift:'', shiftAssignments:{},
          plannedShifts:[], shiftLog:[], history:[], noteLog:[], inactive:false
        });
        added++;
      }
    });
    juniors.forEach(function(j){
      if(!importIds[j.id] && !j.inactive){ j.inactive=true; deactivated++; }
    });

    renderRoster();
    cancelRosterImport('junior');
    statusEl.textContent = 'Saving...';
    saveRosterToNeon(function(err){
      if(err){ statusEl.innerHTML = '&#9888; Applied locally but save failed.'; return; }
      _doSave();
      var msg = '&#10003; Junior import: ' + added + ' new';
      if(updated)     msg += ', ' + updated + ' updated';
      if(reactivated) msg += ', ' + reactivated + ' reactivated';
      if(deactivated) msg += ', ' + deactivated + ' marked inactive';
      statusEl.innerHTML = msg;
    });
    document.getElementById('junior-roster-input').value = '';
    return;
  }

  if(type === 'adult'){
    var importIds = {};
    data.forEach(function(m){ importIds[m.id] = true; });
    var added = 0, updated = 0, reactivated = 0, deactivated = 0;

    data.forEach(function(m){
      var ex = adults.find(function(a){ return a.id === m.id; });
      if(ex){
        // Only update contact/name/title — NEVER overwrite permission or password
        ex.name=m.name; ex.phone=m.phone; ex.email=m.email; ex.title=m.title;
        if(ex.inactive){ ex.inactive=false; reactivated++; } else updated++;
      } else {
        // New adult — add with no permission by default (set manually in Settings)
        adults.push({
          id:m.id, name:m.name, title:m.title, phone:m.phone, email:m.email,
          shiftLog:[], noteLog:[], inactive:false, permission:null
        });
        added++;
      }
    });
    adults.forEach(function(a){
      if(!importIds[a.id] && !a.inactive){ a.inactive=true; deactivated++; }
    });

    renderRoster();
    cancelRosterImport('adult');
    statusEl.textContent = 'Saving...';
    saveRosterToNeon(function(err){
      if(err){ statusEl.innerHTML = '&#9888; Applied locally but save failed.'; return; }
      _doSave();
      var msg = '&#10003; Adult import: ' + added + ' new';
      if(updated)     msg += ', ' + updated + ' updated';
      if(reactivated) msg += ', ' + reactivated + ' reactivated';
      if(deactivated) msg += ', ' + deactivated + ' marked inactive';
      statusEl.innerHTML = msg;
    });
    document.getElementById('adult-roster-input').value = '';
    return;
  }
}

function cancelRosterImport(type){
  pendingImports[type] = null;
  document.getElementById(type + '-roster-preview').style.display = 'none';
  document.getElementById(type + '-preview-title').textContent = '';
  document.getElementById(type + '-preview-list').innerHTML = '';
}

// ============================================================
// INIT — runs after login, not on page load
// ============================================================
function _getDeviceInfo(){
  var ua = navigator.userAgent;
  var browser = 'Unknown';
  var os = 'Unknown';
  if(ua.indexOf('Chrome') > -1 && ua.indexOf('Edg') < 0) browser = 'Chrome';
  else if(ua.indexOf('Safari') > -1 && ua.indexOf('Chrome') < 0) browser = 'Safari';
  else if(ua.indexOf('Firefox') > -1) browser = 'Firefox';
  else if(ua.indexOf('Edg') > -1) browser = 'Edge';
  if(ua.indexOf('iPhone') > -1) os = 'iPhone';
  else if(ua.indexOf('iPad') > -1) os = 'iPad';
  else if(ua.indexOf('Android') > -1) os = 'Android';
  else if(ua.indexOf('Mac') > -1) os = 'Mac';
  else if(ua.indexOf('Windows') > -1) os = 'Windows';
  return browser + ' / ' + os;
}

// ── Junior Activity Log ──────────────────────────────────────────────────────
function addJuniorNote(jIdx, text, type){
  type = type || 'note';
  var j = juniors[jIdx];
  if(!j) return;
  if(!j.noteLog) j.noteLog = [];
  var entry = {
    ts:   new Date().toISOString(),
    by:   loggedInAdult ? loggedInAdult.name.split(',')[0].trim() : (currentRole || 'System'),
    type: type,   // 'note' | 'check-in' | 'dismissed' | 'system'
    text: text
  };
  j.noteLog.unshift(entry); // newest first
  dirtyJuniors.add(j.id);   // ensure this junior is included in next save
  saveStateNow();            // save immediately — don't wait for debounce
}

function openNoteLog(jIdx){
  var j = juniors[jIdx];
  if(!j) return;
  var log = j.noteLog || [];

  var typeColors = {
    note:'var(--navy)', 'check-in':'#27AE60', dismissed:'#EF7622', system:'#8899AA',
    'noshow-nocall':'#CC0000', 'noshow-prior':'#E65100', 'noshow-dayof':'#BF360C',
    incident:'#6A1B9A'
  };
  var typeLabels = {
    note:'Additional Information', 'check-in':'Check-In', dismissed:'Dismissed to Pool', system:'System',
    'noshow-nocall':'NO SHOW: No Call',
    'noshow-prior':'NO SHOW: Called Prior to Shift Date',
    'noshow-dayof':'NO SHOW: Called Day of Shift',
    incident:'Incident on Shift'
  };

  var logHtml = log.length === 0
    ? '<div style="color:#aaa;font-size:13px;padding:20px 0;text-align:center">No entries yet</div>'
    : log.map(function(e){
        var d = new Date(e.ts);
        var dateStr = (d.getMonth()+1)+'/'+d.getDate()+'/'+d.getFullYear();
        var h = d.getHours(), m = String(d.getMinutes()).padStart(2,'0');
        var ampm = h >= 12 ? 'PM' : 'AM'; h = h%12||12;
        var color = typeColors[e.type] || typeColors.note;
        var label = typeLabels[e.type] || e.type;
        return '<div style="border-left:3px solid '+color+';padding:8px 12px;margin-bottom:10px;background:#F8FAFC;border-radius:0 6px 6px 0">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">' +
            '<span style="font-size:11px;font-weight:700;color:'+color+';text-transform:uppercase;letter-spacing:.04em">'+label+'</span>' +
            '<span style="font-size:11px;color:#8899AA">'+dateStr+' '+h+':'+m+' '+ampm+'</span>' +
          '</div>' +
          (e.by ? '<div style="font-size:11px;color:#8899AA;margin-bottom:4px">by '+e.by+'</div>' : '') +
          (e.text ? '<div style="font-size:13px;color:#334455">'+e.text+'</div>' : '') +
        '</div>';
      }).join('');

  var modal = document.getElementById('note-log-modal');
  if(!modal){
    modal = document.createElement('div');
    modal.id = 'note-log-modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,16,40,.6);display:flex;align-items:flex-start;justify-content:center;padding:40px 20px;overflow-y:auto';
    modal.onclick = function(e){ if(e.target===modal) closeNoteLog(); };
    document.body.appendChild(modal);
  }

  modal.innerHTML = '<div style="background:#fff;border-radius:12px;width:100%;max-width:560px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.25)">' +
    '<div style="background:var(--navy);padding:16px 20px;display:flex;align-items:center;justify-content:space-between">' +
      '<div>' +
        '<div style="color:#fff;font-weight:700;font-size:16px">'+j.name+'</div>' +
        '<div style="color:rgba(255,255,255,.6);font-size:12px">Member #'+j.id+' &nbsp;&bull;&nbsp; Activity Log</div>' +
      '</div>' +
      '<button onclick="closeNoteLog()" style="background:rgba(255,255,255,.15);border:none;color:#fff;font-size:18px;width:30px;height:30px;border-radius:50%;cursor:pointer;line-height:1">&times;</button>' +
    '</div>' +
    '<div style="padding:16px 20px;max-height:380px;overflow-y:auto">' +
      logHtml +
    '</div>' +
    '<div style="padding:16px 20px;border-top:1px solid #eee;background:#F8FAFC">' +
      '<div style="margin-bottom:8px">' +
        '<div style="font-size:11px;color:#8899AA;margin-bottom:4px;font-weight:700;text-transform:uppercase;letter-spacing:.04em">Note Type</div>' +
        '<select id="note-log-type" class="finput" style="font-size:12px;width:100%">' +
          '<option value="" disabled selected>— Select a note type —</option>' +
          '<option value="noshow-nocall">NO SHOW: No Call</option>' +
          '<option value="noshow-prior">NO SHOW: Called Prior to Shift Date</option>' +
          '<option value="noshow-dayof">NO SHOW: Called Day of Shift</option>' +
          '<option value="incident">Incident on Shift</option>' +
          '<option value="note">Additional Information</option>' +
        '</select>' +
      '</div>' +
      '<div style="font-size:11px;color:#8899AA;margin-bottom:4px;font-weight:700;text-transform:uppercase;letter-spacing:.04em">Details</div>' +
      '<div style="font-size:11px;color:#667788;margin-bottom:6px">Please add all information available. If this information is sensitive it should be sent directly to <a href="mailto:JRCchairman@hlsr.com" style="color:var(--navy)">JRCchairman@hlsr.com</a> rather than input here.</div>' +
      '<textarea id="note-log-input" class="finput" rows="3" placeholder="Add all available details..." style="width:100%;resize:vertical;margin-bottom:8px"></textarea>' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">' +
        '<input id="note-log-initials" class="finput" type="text" maxlength="6" placeholder="Initials *" style="width:90px;font-size:13px;text-transform:uppercase;font-weight:700;letter-spacing:.1em">' +
        '<span style="font-size:11px;color:#667788">Required — your initials to confirm this entry</span>' +
      '</div>' +
      '<div style="display:flex;gap:8px;justify-content:flex-end">' +
        '<button class="btn" onclick="closeNoteLog()">Cancel</button>' +
        '<button class="btn btn-primary" onclick="submitNoteFromLog('+jIdx+')">Add Note</button>' +
      '</div>' +
    '</div>' +
  '</div>';

  modal.style.display = 'flex';
  setTimeout(function(){ document.getElementById('note-log-input').focus(); }, 100);
}

function closeNoteLog(){
  var modal = document.getElementById('note-log-modal');
  if(modal) modal.style.display = 'none';
}

function submitNoteFromLog(jIdx){
  var input      = document.getElementById('note-log-input');
  var typeEl     = document.getElementById('note-log-type');
  var initialsEl = document.getElementById('note-log-initials');
  var text       = (input ? input.value.trim() : '');
  var type       = (typeEl ? typeEl.value : '') || '';
  var initials   = (initialsEl ? initialsEl.value.trim().toUpperCase() : '');

  if(!type){
    if(typeEl){ typeEl.style.border='2px solid #CC0000'; typeEl.focus(); }
    return;
  }
  if(typeEl) typeEl.style.border='';

  if(!text){ if(input) input.focus(); return; }

  if(!initials){
    if(initialsEl){ initialsEl.style.border='2px solid #CC0000'; initialsEl.focus(); }
    return;
  }
  if(initialsEl) initialsEl.style.border='';

  // Append initials to text so they appear in the saved note
  var fullText = text + '  —  ' + initials;
  addJuniorNote(jIdx, fullText, type);
  closeNoteLog();
  setTimeout(function(){ openNoteLog(jIdx); }, 100);
}

function _recordLogin(role){
  var entry = {
    ts:     new Date().toISOString(),
    name:   loggedInAdult ? loggedInAdult.name : '(Device: ' + ROLE_LABELS[role] + ')',
    id:     loggedInAdult ? loggedInAdult.id : '',
    role:   ROLE_LABELS[role] || role,
    device: _getDeviceInfo()
  };
  loginLog.unshift(entry); // newest first
  if(loginLog.length > 500) loginLog = loginLog.slice(0, 500); // cap at 500
  saveStateNow();
}

// ── Inactivity auto-logout (5 minutes) ─────────────────────────────────
var _inactivityTimer = null;
var INACTIVITY_MS = 5 * 60 * 1000; // 5 minutes

function _resetInactivityTimer(){
  if(_inactivityTimer) clearTimeout(_inactivityTimer);
  _inactivityTimer = setTimeout(function(){
    if(currentRole) doLogout();
  }, INACTIVITY_MS);
}

function _clearInactivityTimer(){
  if(_inactivityTimer){ clearTimeout(_inactivityTimer); _inactivityTimer = null; }
}

// Reset timer on any user interaction
['click','keydown','touchstart','scroll','mousemove'].forEach(function(evt){
  document.addEventListener(evt, function(){
    if(currentRole) _resetInactivityTimer();
  }, {passive:true});
});

// ── Title → Role auto-mapping ────────────────────────────────────────────
function _titleToRole(title){
  if(!title) return null;
  var t = title.toLowerCase().trim();
  if(t.indexOf('admin') >= 0 || t.indexOf('president') >= 0 || t.indexOf('chairman') >= 0 || t.indexOf('chair') >= 0) return 'admin';
  if(t.indexOf('vice') >= 0 || t.indexOf('slt') >= 0 || t.indexOf(' vc') >= 0) return 'slt';
  if(t.indexOf('shift officer') >= 0 || t.indexOf('shift ofcr') >= 0 || t.indexOf('officer') >= 0) return 'officer';
  if(t.indexOf('schedul') >= 0) return 'scheduling';
  if(t.indexOf('junior') >= 0 || t.indexOf('committeeman') >= 0) return 'junior';
  return null;
}

function _autoAssignRolesFromRoster(){
  // Only auto-assign if no explicit assignment exists for this adult
  var changed = false;
  adults.forEach(function(a){
    if(userRoles[a.id]) return; // already has explicit role — don't override
    var role = _titleToRole(a.title);
    if(role){ userRoles[a.id] = role; changed = true; }
  });
  if(changed) saveState();
}

function _preloadAdults(){
  // Show loading state on login form
  var btn = document.querySelector('#personal-login .btn-primary');
  var errEl = document.getElementById('pl-err');
  if(btn) btn.disabled = true;
  if(errEl){ errEl.style.color = '#667788'; errEl.textContent = 'Connecting...'; }

  fetch('/.netlify/functions/state',{headers:{'x-api-token':API_TOKEN}})
    .then(function(r){ return r.json(); })
    .then(function(data){
      if(data && !data.error){
        _applyState(data);
      }
    })
    .catch(function(){
      if(errEl){ errEl.style.color = '#CC0000'; errEl.textContent = 'Could not connect to server. Check your connection.'; }
    })
    .finally(function(){
      if(btn) btn.disabled = false;
      if(errEl && errEl.textContent === 'Connecting...') errEl.textContent = '';
    });
}

function _restoreLogin(){
  // Restore personal adult identity first
  try {
    var savedAdult = localStorage.getItem('jrc_logged_adult');
    if(savedAdult){ loggedInAdult = JSON.parse(savedAdult); }
  } catch(e){}
  // Then restore role
  try {
    var saved = localStorage.getItem('jrc_saved_role');
    var expiry = parseInt(localStorage.getItem('jrc_session_expiry') || '0', 10);
    if(saved && ROLE_TABS[saved] && expiry && Date.now() < expiry){
      window._restoringSession = true;
      loginAs(saved);
      window._restoringSession = false;
      return true;
    } else if(saved) {
      // Session expired — clear it
      try { localStorage.removeItem('jrc_saved_role'); } catch(e){}
      try { localStorage.removeItem('jrc_logged_adult'); } catch(e){}
      try { localStorage.removeItem('jrc_session_expiry'); } catch(e){}
    }
  } catch(e){}
  return false;
}

function initApp(){
  // Set version display
  loadState(); // _restoreSimFromLocalStorage is called inside after Neon loads
  startPolling();
  updateHeaderDate();
  if(document.getElementById('lib-count')) renderLibrary();
  renderSetup();
  renderRoster();
  simUpdate();
  var el = document.getElementById('k-shift-lbl');
  if(el) el.textContent = 'Enter your 7-digit member ID';
}
