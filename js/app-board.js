// JRC Assignment System — app-board.js
// Drag and drop, status board, board timer
// ============================================================
// DRAG & DROP — pool chip → slot card only
// ============================================================
var dragJid = null;

function onPoolChipDragStart(e){
  dragJid = e.currentTarget.getAttribute('data-jid');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', dragJid);
  setTimeout(function(){ e.currentTarget.classList.add('dragging'); }, 0);
}

function onPoolChipDragEnd(e){
  e.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.slot-card.drag-over').forEach(function(el){ el.classList.remove('drag-over'); });
  dragJid = null;
}

function initDragListeners(){
  var container = document.getElementById('off-slots');
  if(!container) return;

  function getCard(el){
    while(el){
      if(!el.classList) { el = el.parentNode; continue; }
      if(el.classList.contains('slot-card')) return el;
      if(el.id === 'off-slots') break;
      el = el.parentNode;
    }
    return null;
  }

  // Clone to remove stale listeners
  var fresh = container.cloneNode(false);
  while(container.firstChild){ fresh.appendChild(container.firstChild); }
  container.parentNode.replaceChild(fresh, container);
  container = fresh;

  container.addEventListener('dragover', function(e){
    if(!dragJid) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    var card = getCard(e.target);
    document.querySelectorAll('.slot-card.drag-over').forEach(function(el){ el.classList.remove('drag-over'); });
    if(card) card.classList.add('drag-over');
  });

  container.addEventListener('dragleave', function(e){
    if(!container.contains(e.relatedTarget)){
      document.querySelectorAll('.slot-card.drag-over').forEach(function(el){ el.classList.remove('drag-over'); });
    }
  });

  container.addEventListener('drop', function(e){
    e.preventDefault();
    document.querySelectorAll('.slot-card.drag-over').forEach(function(el){ el.classList.remove('drag-over'); });
    if(!dragJid) return;
    var card = getCard(e.target);
    if(!card) return;
    var toSlotId = parseInt(card.getAttribute('data-slotid'));
    if(!toSlotId) return;
    var jr = juniors.find(function(j){ return j.id === dragJid; });
    var toSl = activeSlots.find(function(s){ return String(s.id) === String(toSlotId); });
    if(!jr || !toSl) return;
    if(jr.assignment){
      showAlert(jr.name + ' is already assigned to ' + jr.assignment + '. Remove them first with the X.', 'warn');
      return;
    }
    if(toSl.assigned.length >= toSl.capacity){
      showAlert(toSl.name + ' is full (' + toSl.capacity + '/' + toSl.capacity + '). Remove someone or increase capacity.', 'warn');
      return;
    }
    assignJr(jr, toSl.name);
    toSl.assigned.push(jr.id);
    dragJid = null;
    renderOfficer();
    setTimeout(function(){
      document.querySelectorAll('.slot-card').forEach(function(c){
        if(parseInt(c.getAttribute('data-slotid')) === toSlotId){
          c.style.transition = 'box-shadow .3s';
          c.style.boxShadow = '0 0 0 3px var(--orange)';
          setTimeout(function(){ c.style.boxShadow = ''; }, 1800);
        }
      });
    }, 50);
  });
}

function toggleLock(jid){
  if(lockedJuniors.has(jid)){
    lockedJuniors.delete(jid);
  } else {
    lockedJuniors.add(jid);
  }
  renderOfficer();
}


// ============================================================
// STATUS BOARD
// ============================================================
var boardTimer = null;

function manualClockOut(jid, skipConfirm){
  var jr = juniors.find(function(j){ return j.id === jid; });
  if(!jr) return;
  if(!skipConfirm && !confirm('Sign out ' + jr.name + '?')) return;
  // Remove from slot if assigned
  if(jr.assignment){
    var sl = activeSlots.find(function(s){
      return String(s.id) === String(jid) || (s.name === jr.assignment && s.shift === currentShift);
    });
    // find by assignment name
    sl = activeSlots.find(function(s){ return s.name === jr.assignment && s.shift === currentShift; });
    if(sl) sl.assigned = sl.assigned.filter(function(id){ return String(id) !== String(jid); });
  }
  onShiftJuniors.delete(jid);
  onShiftJuniors.delete(String(jid));
  jr.checkedIn = false;
  jr.plannedShifts = [];
  jr.checkInShift = '';
  clockedOut[jid] = true;
  dirtyJuniors.add(jr.id);
  renderOfficer();
  renderBoard();
  saveStateNow();
}

function markAllSent(){
  var toSend = activeSlots.filter(function(s){
    return s.shift === currentShift &&
           s.assigned.length > 0 &&
           !onShiftSlots.has(String(s.id));
  });
  if(!toSend.length){ showAlert('No assigned committees to send.', 'info'); return; }
  toSend.forEach(function(s){ markSent(s.id); });
  showAlert(toSend.length + ' committee' + (toSend.length!==1?'s':'') + ' sent to assignments.', 'success');
}

function markSent(slotId){
  var sl = activeSlots.find(function(s){ return String(s.id) === String(slotId); });
  if(!sl) return;
  onShiftSlots.add(String(slotId));
  var isTV = document.documentElement.classList.contains('tv-mode');
  var date = isTV ? currentDate : ((document.getElementById('setup-date') ? document.getElementById('setup-date').value : '') || currentDate);
  // If no date set yet, show loading state on TV
  if(isTV && !date){
    el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:60vh;color:rgba(255,255,255,.4);font-size:20px">Loading...</div>';
    return;
  }
  onShiftSlots.add(slotId);
  sl.assigned.forEach(function(jid){
    onShiftJuniors.add(String(jid));
    // Log this shift for variety tracking
    var jr = juniors.find(function(j){ return j.id === jid; });
    if(jr){
      if(!jr.shiftLog) jr.shiftLog = [];
      // Avoid duplicate entries for same date+shift+committee
      var exists = jr.shiftLog.some(function(e){ return e.date===date && e.shift===sl.shift && e.committee===sl.name; });
      if(!exists) jr.shiftLog.push({date:date, shift:sl.shift, committee:sl.name, hours:4, note:'', noshow:false});
    }
  });
  renderOfficer();
  renderBoard();
  saveStateNow();
}

function undoSent(slotId){
  var sl = activeSlots.find(function(s){ return String(s.id) === String(slotId); });
  if(!sl){ alert('Slot not found — try refreshing.'); return; }
  if(!confirm('Undo "Out on Shift" for ' + sl.name + '?')) return;
  // Remove slot from sent set
  onShiftSlots.delete(String(slotId));
  onShiftSlots.delete(slotId);
  // Remove all assigned juniors from onShiftJuniors
  var date = (document.getElementById('setup-date') ? document.getElementById('setup-date').value : '') || currentDate;
  sl.assigned.forEach(function(jid){
    onShiftJuniors.delete(jid);
    onShiftJuniors.delete(String(jid));
    var jr = juniors.find(function(j){ return j.id === jid || String(j.id) === String(jid); });
    if(jr){
      // Remove shift log entry for this send
      if(jr.shiftLog){
        jr.shiftLog = jr.shiftLog.filter(function(e){
          return !(e.date===date && e.shift===sl.shift && e.committee===sl.name);
        });
      }
    }
  });
  renderOfficer();
  renderBoard();
  saveStateNow();
}


function getJuniorStatus(jr){
  // clockedOut ALWAYS takes precedence regardless of checkedIn flag
  if(clockedOut && (clockedOut[jr.id] || clockedOut[String(jr.id)])) return 'checked-out';
  if(!jr.checkedIn) return null;
  // Only use onShiftJuniors — this is cleared on clock-out so it's shift-specific
  if(onShiftJuniors.has(jr.id) || onShiftJuniors.has(String(jr.id))) return 'on-shift';
  // Check slot data only for current shift — prevents old sent slots bleeding into next shift
  var inSentSlot = activeSlots.some(function(s){
    if(s.shift !== currentShift) return false; // only current shift slots
    return (onShiftSlots.has(String(s.id)) || onShiftSlots.has(s.id)) &&
           (s.assigned.indexOf(jr.id) >= 0 || s.assigned.indexOf(String(jr.id)) >= 0);
  });
  if(inSentSlot) return 'on-shift';
  if(jr.assignment) return 'assigned';
  return 'checked-in';
}

function fmtNameShort(name){
  var parts = name.trim().split(' ');
  if(parts.length < 2) return name;
  return parts[0] + ' ' + parts[parts.length - 1].charAt(0) + '.';
}

function renderBoard(){
  var el = document.getElementById('board-content');
  if(!el) return;

  var shifts = ['8am','12pm','4pm'];
  var date = (document.getElementById('setup-date') ? document.getElementById('setup-date').value : '') || currentDate;
  var shiftOrder = {'8am':0, '12pm':1, '4pm':2};

  // Late thresholds: minutes since midnight after which "Out on Shift" names go red
  // 8am → red at 11:55am (715 min), 12pm → red at 3:55pm (955 min), 4pm → red at 7:55pm (1195 min)
  var lateAfter = {'8am': 715, '12pm': 955, '4pm': 1195};

  // Current sim-aware time in minutes since midnight
  var nowDate = getSimTime();
  var nowMins = nowDate.getHours() * 60 + nowDate.getMinutes();

  // Collect ALL active juniors across all shifts into flat lists for the 3 board columns
  var ciAll = [], assAll = [], outAll = [];

  shifts.forEach(function(sh){
    var checkedInForShift = juniors.filter(function(j){
      if(!j.checkedIn) return false;
      if(clockedOut[j.id] || clockedOut[String(j.id)]) return false;
      var jShift = j.checkInShift || currentShift;
      return jShift === sh;
    });
    checkedInForShift.forEach(function(j){
      var status = getJuniorStatus(j);
      var rec = {j:j, sh:sh};
      if(status === 'checked-in')  ciAll.push(rec);
      else if(status === 'assigned') assAll.push(rec);
      else if(status === 'on-shift') outAll.push(rec);
    });
    // Clocked-out juniors not shown on board (strikethrough is dashboard-only)

    // Age-out pending (future shifts) — bucket into CI column with pending style
    var isFuture = shiftOrder[sh] > shiftOrder[currentShift];
    if(isFuture){
      juniors.forEach(function(j){
        if(!j.ageout) return;
        if(!j.plannedShifts || j.plannedShifts.indexOf(sh) < 0) return;
        if(!j.checkInShift) return;
        if(j.checkedIn && j.checkInShift === sh) return;
        if(checkedInForShift.indexOf(j) >= 0) return;
        ciAll.push({j:j, sh:sh, pending:true});
      });
    }
  });

  // Are multiple shifts represented in any column? (drives shift tag visibility)
  function multiShift(list){
    var seen = {};
    list.forEach(function(r){ seen[r.sh] = true; });
    return Object.keys(seen).length > 1;
  }
  var showTagCI  = multiShift(ciAll);
  var showTagAss = multiShift(assAll);
  var showTagOut = multiShift(outAll);

  // Shift label pill for a name row (only rendered when tags are shown)
  function shiftPill(sh){
    var colors = {'8am':'#4499CC','12pm':'#F0C040','4pm':'#5CDB95'};
    return '<span class="board-shift-pill" style="background:' + (colors[sh]||'#99BBDD') + '">' + sh + '</span>';
  }

  // Build Checked-In column HTML
  function buildCI(){
    var normal  = ciAll.filter(function(r){ return !r.pending; });
    var h = '<div class="board-col-hdr ci">&#9679; Checked In (' + normal.length + ')</div>';
    if(normal.length === 0){
      h += '<div class="board-empty">None waiting</div>';
    } else {
      h += '<div>';
      normal.slice().sort(function(a,b){ return (a.j.order||0)-(b.j.order||0); })
        .forEach(function(r){
          h += '<div class="board-name">' + shiftPill(r.sh) + fmtNameShort(r.j.name) + '</div>';
        });
      h += '</div>';
    }
    return h;
  }

  // Pending age-outs — news ticker strip at bottom
  function buildPendingStrip(){
    var pending = ciAll.filter(function(r){ return r.pending; });
    if(!pending.length) return '';
    // Build ticker content — repeats so it scrolls continuously
    var items = pending.slice().sort(function(a,b){ return a.j.name.localeCompare(b.j.name); })
      .map(function(r){
        var late = r.lateBreak;
        return '<span style="margin-right:32px;color:' + (late?'#FF6B6B':'#F5A623') + ';white-space:nowrap">' +
          shiftPill(r.sh) + fmtNameShort(r.j.name) +
          (late ? ' <span style="font-size:9px;background:#FF6B6B;color:#fff;padding:0 4px;border-radius:3px;margin-left:3px">LATE</span>' : '') +
          '</span>';
      }).join('');
    // Duplicate for seamless loop
    var ticker = items + items;
    return '<div style="border-top:1px solid rgba(255,255,255,.15);padding:5px 0;overflow:hidden;flex-shrink:0;background:rgba(0,0,0,.2)">' +
      '<div style="display:flex;align-items:center">' +
        '<span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#F5A623;white-space:nowrap;padding:0 12px;flex-shrink:0">&#9711; Later Shifts:</span>' +
        '<div style="overflow:hidden;flex:1">' +
          '<div id="board-ticker" style="display:inline-flex;animation:boardTicker 20s linear infinite;white-space:nowrap;font-size:15px">' +
            ticker +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  // Build Assigned section HTML — lives in left panel below CI
  function buildAssigned(){
    if(assAll.length === 0) return '';
    var h = '<div class="board-col-hdr assigned">&#9632; Assigned (' + assAll.length + ')</div>';
    h += '<div>';
    assAll.slice().sort(function(a,b){ return (a.j.order||0)-(b.j.order||0); })
      .forEach(function(r){
        h += '<div class="board-name">' + shiftPill(r.sh) + fmtNameShort(r.j.name) + '</div>';
      });
    h += '</div>';
    return h;
  }

  // Build Out-on-Shift column HTML — grouped by committee, late names in red
  function buildOut(){
    // Group by shift → committee
    var byShift = {};
    shifts.forEach(function(sh){ byShift[sh] = {}; });
    outAll.forEach(function(r){
      var sh = r.sh;
      var committee = r.j.assignment || (r.j.shiftAssignments && r.j.shiftAssignments[sh]) || 'Unassigned';
      if(!byShift[sh][committee]) byShift[sh][committee] = [];
      byShift[sh][committee].push(r.j);
    });

    // Total committee groups across all shifts — drives sub-column count
    var totalGroups = 0;
    shifts.forEach(function(sh){ totalGroups += Object.keys(byShift[sh]).length; });
    var subCols = totalGroups >= 35 ? 'cols5' : totalGroups >= 10 ? 'cols4' : totalGroups >= 6 ? 'cols3' : totalGroups >= 3 ? 'cols2' : 'cols1';

    var h = '<div class="board-out-col">';
    h += '<div class="board-col-hdr out">&#9650; Out on Shift (' + outAll.length + ')</div>';

    if(outAll.length === 0){
      h += '<div class="board-empty">None sent yet</div>';
    } else {
      h += '<div class="board-out-inner ' + subCols + '">';
      var isLate, shiftLabel;
      shifts.forEach(function(sh){
        var committees = Object.keys(byShift[sh]).sort();
        if(committees.length === 0) return;
        isLate = nowMins >= lateAfter[sh];
        // Shift divider — only when multiple shifts are on board
        if(showTagOut){
          h += '<div class="board-shift-divider' + (isLate ? ' late' : '') + '">' + SL[sh] + (isLate ? ' &#9888; LATE' : '') + '</div>';
        }
        committees.forEach(function(committee){
          h += '<div class="board-committee-group">';
          var shBadgeColor = sh==='8am'?'#4499CC':sh==='12pm'?'#F0C040':'#5CDB95';
          var shBadgeText  = sh==='8am'?'8AM':sh==='12pm'?'12PM':'4PM';
          h += '<div class="board-committee-label' + (isLate ? ' late' : '') + '">' + committee +
            ' <span style="font-size:8px;font-weight:700;padding:1px 5px;border-radius:4px;background:' + shBadgeColor + ';color:#001F40">' + shBadgeText + '</span>' +
          '</div>';
          byShift[sh][committee].forEach(function(j){
            h += '<div class="board-name out' + (isLate ? ' late' : '') + '">' + fmtNameShort(j.name) + '</div>';
          });
          h += '</div>';
        });
      });
      h += '</div>';
    }
    h += '</div>';
    return h;
  }

  // Total active across all shifts for header
  var totalActive = ciAll.filter(function(r){ return !r.pending; }).length + assAll.length + outAll.length;

  // CI column is fixed width via CSS (180px) — no dynamic calculation needed

  var html = '<div class="board-wrap">' +
    '<div class="board-header">' +
      '<div>' +
        '<div class="board-title">JRC Live Status Board</div>' +
        '<div id="board-date-lbl" style="font-size:13px;color:#99BBDD;font-weight:600">' + fmtDateLong(date) + '</div>' +
      '</div>' +
      '<div style="text-align:right">' +
        '<div id="board-clock" style="font-size:22px;font-weight:700;color:#fff;font-variant-numeric:tabular-nums"></div>' +
        '<div style="font-size:11px;color:#99BBDD;margin-top:2px">' + totalActive + ' juniors active</div>' +
      '</div>' +
    '</div>' +
    '<div style="display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden">' +
      '<div class="board-body" id="board-body-el">' +
        '<div class="board-waiting-col">' +
          '<div class="board-ci-section" id="brd-ci">' + buildCI() + '</div>' +
          (assAll.length > 0 ? '<div class="board-ass-section" id="brd-ass">' + buildAssigned() + '</div>' : '') +
        '</div>' +
        '<div class="board-right-col">' + buildOut() + '</div>' +
      '</div>' +
      buildPendingStrip() +
    '</div>' +
  '</div>';

  el.innerHTML = html;

  // Force ticker animation restart after DOM insertion
  var ticker = document.getElementById('board-ticker');
  if(ticker){
    ticker.style.animation = 'none';
    ticker.offsetHeight; // reflow
    ticker.style.animation = '';
  }

  // Live clock
  updateBoardClock();
  if(boardTimer) clearInterval(boardTimer);
  boardTimer = setInterval(updateBoardClock, 1000);

  // Auto-scroll CI + Assigned sections (slow ping-pong crawl when overflowing)
  startBoardAutoScroll();
}

var _boardScrollTimer = null;
function startBoardAutoScroll(){
  if(_boardScrollTimer) clearInterval(_boardScrollTimer);
  _boardScrollTimer = setInterval(function(){
    // Continuous loop scroll — silently resets to top when reaching bottom
    ['#brd-ci','#brd-ass','.board-out-col'].forEach(function(sel){
      var el = document.querySelector(sel);
      if(!el) return;
      var max = el.scrollHeight - el.clientHeight;
      if(max <= 4) return;
      el.scrollTop += 1;
      if(el.scrollTop >= max - 1){
        // Jump silently to top — no bounce
        el.scrollTop = 0;
      }
    });
  }, 75);
}

function updateBoardClock(){
  var el = document.getElementById('board-clock');
  if(!el){ clearInterval(boardTimer); return; }
  var now = getSimTime();
  var h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();
  var ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  el.textContent = h + ':' + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0') + ' ' + ampm + (simTimeEnabled ? ' ⏱' : '');
}


