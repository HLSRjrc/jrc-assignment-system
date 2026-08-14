// JRC Assignment System — app-dashboard.js
// Officer dashboard, check-ins, library, shift setup, culling engine, schedule migration, simulator
// ============================================================
// OFFICER DASHBOARD
// ============================================================


function printDropOffReport(slotId){
  var sl = activeSlots.find(function(s){ return String(s.id) === String(slotId); });
  if(!sl) return;
  buildReports([sl]);
}
function printAllReports(){
  var ss = activeSlots.filter(function(s){ return s.shift === currentShift && s.assigned.length > 0; });
  if(!ss.length){ showAlert('No slots with assigned juniors to print.','warn'); return; }
  buildReports(ss);
}
function buildReports(slots){
  var dateEl = document.getElementById('setup-date');
  var d = (dateEl ? dateEl.value : '') || currentDate;
  document.getElementById('rpt-sub').textContent =
    fmtDate(d) + ' — ' + slots.length + ' committee' + (slots.length!==1?'s':'');
  var html = '';
  slots.forEach(function(sl){
    // Pull details from CD (bulk upload) OR directly from slot fields (request system)
    var cdDet = CD[sl.name] || {};
    var det = {
      loc:     sl.location    || cdDet.loc     || '',
      duties:  sl.duties      || cdDet.duties  || '',
      notes:   sl.notes       || cdDet.notes   || '',
      liaison: sl.liaison     || cdDet.liaison || '',
      lp:      sl.liaisonPhone|| cdDet.lp      || '',
      le:      sl.liaisonEmail|| cdDet.le      || '',
      chair:   sl.chair       || cdDet.chair   || '',
      cp:      sl.chairPhone  || cdDet.cp      || ''
    };
    var jrs = sl.assigned.map(function(jid){ return juniors.find(function(j){ return j.id===jid; }); }).filter(Boolean);
    // Total rows = max of assigned or capacity, min 1
    var totalRows = Math.max(sl.capacity, jrs.length);

    html += '<div class="rpt-page">';
    // Page header
    html += '<div class="rpt-ph">' +
      '<div>' +
        '<div class="rpt-org">Houston Livestock Show and Rodeo&#8482; &mdash; Jr. Rodeo Committee</div>' +
        '<div class="rpt-cname">' + sl.name.toUpperCase() + '</div>' +
        '<div class="rpt-shift">' + SL[sl.shift] + ' &bull; ' + fmtDate(d) + '</div>' +
      '</div>' +
      '<div style="text-align:right">' +
        '<div style="font-size:11px;color:#667788">Juniors needed</div>' +
        '<div style="font-size:28px;font-weight:700;color:var(--navy);line-height:1">' + sl.capacity + '</div>' +
      '</div>' +
    '</div>';
    if(sl.hat) html += '<div class="rpt-hat">&#9888; Cowboy hat required for this assignment</div>';
    // Details grid
    html += '<div class="rpt-grid">';
    if(det.loc)    html += '<div class="rpt-field full"><label>Location / Where to Report</label><p>' + det.loc + '</p></div>';
    if(det.liaison)html += '<div class="rpt-field"><label>Event Contact / Liaison</label><p><strong>' + det.liaison + '</strong>' + (det.lp ? '<br>' + det.lp : '') + (det.le ? '<br>' + det.le : '') + '</p></div>';
    if(det.chair)  html += '<div class="rpt-field"><label>Committee Chair</label><p><strong>' + det.chair + '</strong>' + (det.cp ? '<br>' + det.cp : '') + '</p></div>';
    if(det.duties) html += '<div class="rpt-field full"><label>Duties</label><p>' + det.duties + '</p></div>';
    if(det.notes)  html += '<div class="rpt-field full"><label>Notes / Attire</label><p>' + det.notes + '</p></div>';
    html += '</div>';

    // 2-column junior list, 20 per page
    var ROWS_PER_PAGE = 20;
    var pages = Math.ceil(totalRows / ROWS_PER_PAGE) || 1;
    for(var pg = 0; pg < pages; pg++){
      if(pg > 0) html += '<div class="rpt-page">';
      var startIdx = pg * ROWS_PER_PAGE;
      var endIdx = Math.min(startIdx + ROWS_PER_PAGE, totalRows);
      var pageRows = [];
      for(var i = startIdx; i < endIdx; i++){
        var jr = jrs[i];
        pageRows.push('<div class="rpt-jrow">' +
          '<span class="rpt-num">' + (i+1) + '.</span>' +
          '<span class="rpt-name">' + (jr ? jr.name + (jr.ageout?' &#9733;':'') : '') + '</span>' +
        '</div>');
      }
      // Split into 2 columns
      var half = Math.ceil(pageRows.length / 2);
      var col1 = pageRows.slice(0, half);
      var col2 = pageRows.slice(half);
      html += '<div class="rpt-jlist"><div class="rpt-jlabel">Juniors Sent to Assignment (' + jrs.length + ' of ' + sl.capacity + ')</div>';
      html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0 24px">';
      html += '<div>' + col1.join('') + '</div>';
      html += '<div>' + col2.join('') + '</div>';
      html += '</div></div>';
      if(pg < pages - 1) html += '</div>'; // close extra page div
    }
    html += '<div style="margin-top:20px;padding-top:16px;border-top:2px solid var(--navy)">' +
      '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--navy);margin-bottom:14px">Partner Committee Representative</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:18px">' +
        '<div>' +
          '<div style="font-size:10px;color:#8899AA;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Print Name</div>' +
          '<div style="border-bottom:1.5px solid #334455;height:26px"></div>' +
        '</div>' +
        '<div>' +
          '<div style="font-size:10px;color:#8899AA;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Phone Number</div>' +
          '<div style="border-bottom:1.5px solid #334455;height:26px"></div>' +
        '</div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:2fr 1fr;gap:20px">' +
        '<div>' +
          '<div style="font-size:10px;color:#8899AA;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Signature</div>' +
          '<div style="border-bottom:1.5px solid #334455;height:32px"></div>' +
        '</div>' +
        '<div>' +
          '<div style="font-size:10px;color:#8899AA;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Date</div>' +
          '<div style="border-bottom:1.5px solid #334455;height:32px"></div>' +
        '</div>' +
      '</div>' +
    '</div>';
    html += '<div class="rpt-foot">JRC Drop-Off Report &mdash; ' + sl.name + ' &mdash; ' + SL[sl.shift] + ' &mdash; ' + fmtDate(d) + '</div>';
    html += '</div>';
  });
  document.getElementById('rpt-body').innerHTML = html;
  document.getElementById('report-wrap').style.display = 'block';
  document.getElementById('report-wrap').scrollIntoView({behavior:'smooth'});
}
function closeReport(){
  document.getElementById('report-wrap').style.display = 'none';
}

function printReport(){
  var body = document.getElementById('rpt-body');
  if(!body) return;

  var css =
    'body{font-family:"DM Sans","Source Sans 3",sans-serif;margin:0;padding:0;background:white}' +
    '.rpt-page{padding:20px 24px;page-break-after:always}' +
    '.rpt-page:last-child{page-break-after:avoid}' +
    '.rpt-ph{display:flex;justify-content:space-between;align-items:flex-start;padding:14px 0;border-bottom:2px solid #002E5D;margin-bottom:12px}' +
    '.rpt-org{font-size:11px;color:#667788;text-transform:uppercase;letter-spacing:.06em}' +
    '.rpt-cname{font-size:22px;font-weight:700;color:#002E5D;margin:4px 0}' +
    '.rpt-shift{font-size:13px;color:#334455}' +
    '.rpt-hat{background:#FFF3CD;border:1px solid #F0A500;border-radius:6px;padding:6px 12px;font-size:13px;font-weight:600;color:#7D4E00;margin-bottom:10px}' +
    '.rpt-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}' +
    '.rpt-field{background:#F8F9FA;border-radius:6px;padding:8px 10px}' +
    '.rpt-field.full{grid-column:1/-1}' +
    '.rpt-field label{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#8899AA;display:block;margin-bottom:4px}' +
    '.rpt-field p{font-size:13px;color:#334455;margin:0}' +
    '.rpt-jlist{margin-bottom:16px}' +
    '.rpt-jlabel{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#8899AA;margin-bottom:6px}' +
    '.rpt-jrow{display:flex;align-items:center;padding:5px 0;border-bottom:1px solid #F0F4F8;font-size:13px;gap:8px}' +
    '.rpt-num{font-size:11px;font-weight:700;color:#8899AA;width:20px;flex-shrink:0}' +
    '.rpt-name{flex:1;font-weight:600;color:#002E5D}' +
    '.rpt-foot{font-size:10px;color:#8899AA;text-align:center;margin-top:12px;padding-top:8px;border-top:1px solid #eee}';

  // Use a hidden iframe — no popup needed, no browser block
  var iframe = document.getElementById('print-iframe');
  if(!iframe){
    iframe = document.createElement('iframe');
    iframe.id = 'print-iframe';
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none';
    document.body.appendChild(iframe);
  }
  var doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open();
  doc.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><style>' + css + '</style></head><body>' + body.innerHTML + '</body></html>');
  doc.close();
  iframe.contentWindow.focus();
  setTimeout(function(){ iframe.contentWindow.print(); }, 300);
}
function toggleNotesCollapse(){
  notesCollapsed = !notesCollapsed;
  renderNotesQueue();
}

function renderNotesQueue(){
  var el = document.getElementById('notes-queue-section');
  if(!el) return;

  // Notes queue only shows NON-age-out juniors who left a note.
  // Age-outs with notes: their note is surfaced inside the age-out pick panel instead.
  var ci = juniors.filter(function(j){
    return j.checkedIn && !clockedOut[j.id] && j.notes && j.notes.length > 0 && !j.ageout;
  });
  if(ci.length === 0){ el.style.display='none'; el.innerHTML=''; return; }
  el.style.display='block';

  var pending   = ci.filter(function(j){ return !notesState[j.id] || notesState[j.id] === 'pending'; });
  var handled   = ci.filter(function(j){ return notesState[j.id] && notesState[j.id] !== 'pending'; });
  // Auto-collapse card when all items are handled
  if(pending.length === 0 && handled.length > 0 && !notesCollapsed) notesCollapsed = true;
  // If all dismissed, hide entirely
  if(pending.length === 0 && handled.every(function(j){ return notesState[j.id]==='dismissed'; })){
    el.style.display='none'; el.innerHTML=''; return;
  }
  var doneCount = handled.length;

  var html = '<div class="notes-card">' +
    '<div class="notes-card-title" style="cursor:pointer;user-select:none;display:flex;align-items:center" onclick="toggleNotesCollapse()">' +
      '<span>&#9432; Additional Info Queue</span>' +
      '<span style="font-weight:400;color:#4A6CF7;text-transform:none;letter-spacing:0">' + doneCount + ' of ' + ci.length + ' reviewed</span>' +
      '<span style="margin-left:auto;font-size:11px;font-weight:400;color:#' + (pending.length === 0 ? '155724' : '2A3DB5') + '">' +
        (pending.length === 0 ? 'All reviewed' : pending.length + ' need' + (pending.length===1?'s':'') + ' your attention') +
      '</span>' +
      '<span style="margin-left:10px;font-size:14px;color:#4A6CF7">' + (notesCollapsed ? '&#9660;' : '&#9650;') + '</span>' +
    '</div>' +
    (notesCollapsed ? '' : '<div id="notes-items-wrap">');

  // Pending first, then handled
  var allItems = pending.concat(handled);
  allItems.forEach(function(j){
    var state = notesState[j.id] || 'pending';
    var isActive = activeNotePick === j.id;
    var isAssigned = !!j.assignment;
    var isDismissed = state === 'dismissed';

    html += '<div class="notes-item' + (isDismissed ? ' dismissed' : isAssigned && state === 'locked' ? ' locked' : '') + '">' +
      '<div class="notes-item-name">' + (j.hasHat ? '<img src="assets/hat.png" style="height:18px;vertical-align:middle;margin-right:3px"> ' : '') + j.name +
        (isAssigned && state === 'locked' ? ' <span class="locked-tag">&#128274; ' + j.assignment + '</span>' : '') +
        (isDismissed ? ' <span style="font-size:11px;color:#999;font-style:italic">&mdash; dismissed to regular pool</span>' : '') +
      '</div>' +
      '<div class="notes-item-text">&ldquo;' + j.notes + '&rdquo;</div>';

    if(!isDismissed && !(isAssigned && state === 'locked')){
      html += '<div class="notes-item-actions">' +
        '<button class="ao-btn' + (isActive ? ' active' : '') + '" onclick="openNotePick(\'' + j.id + '\')">' +
          (isActive ? 'Choosing&hellip;' : 'Choose Assignment') +
        '</button>' +
        '<button class="btn btn-sm btn-dismiss" onclick="dismissNote(\'' + j.id + '\')">Dismiss to pool</button>' +
      '</div>';
    } else if(isAssigned && state === 'locked'){
      html += '<div class="notes-item-actions">' +
        '<span style="font-size:12px;color:#155724">Assigned &amp; locked.</span>' +
        '<button class="btn btn-sm btn-dismiss" style="margin-left:auto" onclick="unlockNote(\'' + j.id + '\')">Undo</button>' +
      '</div>';
    }
    html += '</div>';
  });

  if(!notesCollapsed) html += '</div>';
  html += '</div>';
  el.innerHTML = html;
}

function openNotePick(jid){
  activeNotePick = (activeNotePick === jid) ? null : jid;
  renderNotesQueue();
  renderNotePick();
}

function closeNotePick(){
  activeNotePick = null;
  renderNotesQueue();
  renderNotePick();
}

function renderNotePick(){
  var pp = document.getElementById('note-pick-panel');
  if(!pp) return;
  var jr = activeNotePick ? juniors.find(function(j){ return j.id === activeNotePick; }) : null;
  pp.style.display = jr ? 'block' : 'none';
  if(!jr) return;

  var openSlots = activeSlots.filter(function(s){ return s.shift === currentShift && s.assigned.length < s.capacity; });

  pp.innerHTML = openSlots.length === 0 ?
    '<div class="pick-panel"><div class="pick-header">No open slots</div>' +
    '<button class="btn btn-sm" onclick="closeNotePick()">Close</button></div>' :
    '<div class="pick-panel">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">' +
        '<div class="pick-header">' + (jr.hasHat ? '<img src="assets/hat.png" style="height:18px;vertical-align:middle;margin-right:3px"> ' : '') + jr.name + ' &mdash; choose assignment</div>' +
        '<button class="btn btn-sm" onclick="closeNotePick()">Cancel</button>' +
      '</div>' +
      '<div class="pick-sub" style="margin-bottom:8px">' +
        '<strong>Note:</strong> &ldquo;' + jr.notes + '&rdquo; &nbsp;|&nbsp; Last: <strong>' + jr.last + '</strong>' +
      '</div>' +
      '<div class="pick-grid">' +
      openSlots.map(function(s){
        var isRep = s.name === jr.last;
        var left = s.capacity - s.assigned.length;
        var hatWarn = s.hat && !jr.hasHat;
        return '<button class="pick-btn' + (isRep ? ' repeat' : '') + '" onclick="pickNoteSlot(\'' + jr.id + '\',' + s.id + ')">' +
          '<div class="pick-btn-name">' + s.name + '</div>' +
          '<div class="pick-btn-cap">' + SL[s.shift] +
            (s.hat ? ' &bull; Hat req.' : '') +
            ' &bull; ' + left + ' spot' + (left!==1?'s':'') + ' left' +
            (isRep ? ' &bull; <span style="color:var(--orange)">Repeat</span>' : '') +
            (hatWarn ? ' &bull; <span style="color:var(--red);font-weight:700">&#9888; No hat</span>' : '') +
          '</div>' +
        '</button>';
      }).join('') +
      '</div></div>';
}

function pickNoteSlot(jid, slotId){
  var jr = juniors.find(function(j){ return j.id === jid; });
  var sl = activeSlots.find(function(s){ return String(s.id) === String(slotId); });
  if(!jr || !sl || sl.assigned.length >= sl.capacity) return;
  // Remove from current slot if already assigned
  if(jr.assignment){
    var oldSl = activeSlots.find(function(s){ return s.name === jr.assignment; });
    if(oldSl) unassignJr(jr, oldSl);
  }
  assignJr(jr, sl.name);
  sl.assigned.push(jr.id);
  notesState[jid] = 'locked';
  activeNotePick = null;
  renderNotesQueue();
  renderNotePick();
  renderOfficer();
  saveStateNow();
  // Highlight and scroll to the slot
  setTimeout(function(){
    var cards = document.querySelectorAll('.slot-card');
    cards.forEach(function(card){
      var nameEl = card.querySelector('.slot-name');
      if(nameEl && nameEl.textContent.trim() === sl.name){
        card.style.transition = 'box-shadow .3s';
        card.style.boxShadow = '0 0 0 3px #4A6CF7';
        card.scrollIntoView({behavior:'smooth', block:'center'});
        setTimeout(function(){ card.style.boxShadow = ''; }, 2500);
      }
    });
  }, 100);
}

function dismissNote(jid){
  // Return to regular pool — clear any lock and note state
  notesState[jid] = 'dismissed';
  // If they were assigned via lock, unassign them back to the pool
  var jr = juniors.find(function(j){ return j.id === jid; });
  if(jr && jr.assignment){
    var sl = activeSlots.find(function(s){ return s.name === jr.assignment; });
    if(sl) unassignJr(jr, sl);
  }
  if(activeNotePick === jid) activeNotePick = null;
  renderNotesQueue();
  renderNotePick();
  renderOfficer();
}

function unlockNote(jid){
  notesState[jid] = 'pending';
  var jr = juniors.find(function(j){ return j.id === jid; });
  if(jr && jr.assignment){
    var sl = activeSlots.find(function(s){ return s.name === jr.assignment; });
    if(sl) unassignJr(jr, sl);
  }
  renderNotesQueue();
  renderNotePick();
  renderOfficer();
}


function renderOfficer(search){
  // Stats filtered by currentShift so numbers match what you're looking at
  var allCI = juniors.filter(function(j){ return j.checkedIn && !clockedOut[j.id]; });
  var ci   = allCI.filter(function(j){ return (j.checkInShift||currentShift) === currentShift; });
  var asgn = juniors.filter(function(j){ return j.assignment && (j.checkInShift||currentShift) === currentShift; });
  var un   = ci.filter(function(j){ return !j.assignment; });
  var totalOpen = activeSlots.filter(function(s){ return s.shift === currentShift; })
                   .reduce(function(a, s){ return a + Math.max(0, s.capacity - s.assigned.length); }, 0);
  document.getElementById('s-ci').textContent = ci.length;
  document.getElementById('s-asgn').textContent = asgn.length;
  document.getElementById('s-un').textContent = un.length;
  document.getElementById('s-open').textContent = totalOpen;

  // Shift tabs
  var tabHtml = ['8am', '12pm', '4pm'].map(function(s){
    var cnt = activeSlots.filter(function(x){ return x.shift === s; }).length;
    return '<button class="shift-tab' + (currentShift === s ? ' active' : '') + '" onclick="setShift(\'' + s + '\')">' +
      (s === '8am' ? '8am&ndash;12pm' : s === '12pm' ? '12pm&ndash;4pm' : '4pm&ndash;8pm') +
      (cnt ? ' <span style="font-size:10px;opacity:.7">(' + cnt + ')</span>' : '') +
    '</button>';
  }).join('');
  document.getElementById('shift-tabs').innerHTML = tabHtml;
  document.getElementById('slot-shift-lbl').textContent = SL[currentShift];

  // Adults on shift strip — set up click delegation once
  var adultStrip = document.getElementById('adult-on-shift');
  if(adultStrip){
    var onShift = (adults||[]).filter(function(a){ return a.clockedIn && !a.inactive; });
    if(onShift.length){
      adultStrip.style.display = 'flex';
      // Build pills as actual DOM elements so onclick works reliably
      adultStrip.innerHTML = '';
      var lbl = document.createElement('span');
      lbl.style.cssText = 'font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;opacity:.7;white-space:nowrap';
      lbl.innerHTML = '&#128084; Adults on Shift:';
      adultStrip.appendChild(lbl);
      onShift.forEach(function(a){
        var wrapper = document.createElement('div');
        wrapper.style.cssText = 'position:relative;display:inline-block';

        var pill = document.createElement('span');
        pill.style.cssText = 'background:rgba(255,255,255,.15);border-radius:20px;padding:2px 10px;white-space:nowrap;cursor:pointer;user-select:none;display:inline-block';
        var roleBadge = a.boardRole === 'vc'
          ? ' <span style="background:#4A6CF7;color:#fff;font-size:9px;padding:1px 5px;border-radius:8px;margin-left:3px">VC</span>'
          : a.boardRole === 'so'
          ? ' <span style="background:#F5A623;color:#fff;font-size:9px;padding:1px 5px;border-radius:8px;margin-left:3px">SO</span>'
          : '';
        pill.innerHTML = a.name + roleBadge +
          (a.clockInShift ? ' <span style="opacity:.6;font-size:10px">' + a.clockInShift + '</span>' : '');

        // Dropdown menu
        var menu = document.createElement('div');
        menu.style.cssText = 'display:none;position:absolute;top:100%;left:0;background:#fff;border:1px solid #E0E8F0;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.15);z-index:999;min-width:150px;overflow:hidden;margin-top:4px';
        var menuItems = [
          {label: a.boardRole === 'vc' ? '&#10003; VC on Shift' : 'VC on Shift', role: 'vc'},
          {label: a.boardRole === 'so' ? '&#10003; Shift Officer' : 'Shift Officer', role: 'so'},
          {label: a.boardRole ? 'Remove Role' : '&#10003; Mentor (no role)', role: null},
          {label: '&#9679; Clock Out', role: 'clockout'}
        ];
        menuItems.forEach(function(item){
          var opt = document.createElement('div');
          opt.innerHTML = item.label;
          opt.style.cssText = 'padding:8px 14px;font-size:12px;cursor:pointer;color:' +
            (item.role === 'clockout' ? '#CC0000' : 'var(--navy)') + ';font-weight:' +
            (item.role === a.boardRole || (!item.role && !a.boardRole) ? '700' : '400');
          opt.addEventListener('mouseenter', function(){ opt.style.background = '#F0F4F8'; });
          opt.addEventListener('mouseleave', function(){ opt.style.background = ''; });
          (function(adultId, role){
            opt.addEventListener('click', function(e){
              e.stopPropagation();
              menu.style.display = 'none';
              if(role === 'clockout'){
                adultClockOut(adultId);
              } else {
                var ad = adults.find(function(x){ return x.id === adultId; });
                if(ad) ad.boardRole = (ad.boardRole === role) ? null : role;
                saveStateNow();
                renderOfficer();
              }
            });
          })(a.id, item.role);
          menu.appendChild(opt);
        });

        (function(pillEl, menuEl){
          pillEl.addEventListener('click', function(e){
            e.stopPropagation();
            // Close any other open menus
            document.querySelectorAll('.adult-pill-menu').forEach(function(m){ m.style.display = 'none'; });
            menuEl.style.display = menuEl.style.display === 'block' ? 'none' : 'block';
          });
        })(pill, menu);

        wrapper.appendChild(pill);
        wrapper.appendChild(menu);
        menu.className = 'adult-pill-menu';
        adultStrip.appendChild(wrapper);
      });

      // Close menus when clicking elsewhere
      if(!adultStrip._menuClose){
        adultStrip._menuClose = true;
        document.addEventListener('click', function(){
          document.querySelectorAll('.adult-pill-menu').forEach(function(m){ m.style.display = 'none'; });
        });
      }
    } else {
      adultStrip.style.display = 'none';
      adultStrip.innerHTML = '';
    }
  }
  renderNotesQueue();
  renderNotePick();
  setTimeout(initDragListeners, 0);
  updateHeaderDate();

  // Age-out section
  var aoJuniors = ci.filter(function(j){ return j.ageout; }).sort(function(a,b){ return a.order - b.order; });
  var aoHtml = '';
  if(aoJuniors.length > 0){
    // Build one entry per age-out per planned shift
    var aoItems = [];
    aoJuniors.forEach(function(j){
      var shifts = getJrPlannedShifts(j);
      if(!shifts.length) shifts = [getJrActiveShift(j)];
      shifts.forEach(function(sh){
        aoItems.push({jr:j, shift:sh});
      });
    });
    var doneCount = aoItems.filter(function(item){
      return item.jr.shiftAssignments && item.jr.shiftAssignments[item.shift];
    }).length;
    var allDone = doneCount === aoItems.length;
    aoHtml = '<div class="ao-card">' +
      '<div class="ao-title">' +
        '<span>&#9733; Age-Out Selection Queue</span>' +
        '<span style="font-weight:400;color:#A05000;text-transform:none;letter-spacing:0">' + doneCount + ' of ' + aoItems.length + ' assigned</span>' +
        '<span style="margin-left:auto;font-size:11px;font-weight:400;color:' + (allDone ? '#155724' : '#A05000') + '">' +
          (allDone ? 'All age-outs have been assigned' : 'Call names in order &mdash; first checked in, first to choose') +
        '</span>' +
      '</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:8px">' +
      aoItems.map(function(item, i){
        var j = item.jr;
        var sh = item.shift;
        var assigned = j.shiftAssignments && j.shiftAssignments[sh];
        var isActive = activePick === j.id + '_' + sh;
        var shiftLabel = sh === '8am' ? '8am' : sh === '12pm' ? '12pm' : '4pm';
        return '<button class="ao-btn' + (assigned ? ' done' : isActive ? ' active' : '') + '" onclick="' + (assigned ? '' : 'openPickForShift(\'' + j.id + '\',\'' + sh + '\')') + '">' +
          '<span class="order-badge">' + (i + 1) + '</span>' +
          (assigned ? '&#10003; ' : '') +
          (j.hasHat ? '<img src="assets/hat.png" style="height:18px;vertical-align:middle;margin-right:3px"> ' : '') + j.name +
          ' <span style="font-size:10px;opacity:.75">' + shiftLabel + '</span>' +
          (assigned ? ' &rarr; ' + assigned : '') +
        '</button>' +
        '<button onclick="removeFromAoQueue(\'' + j.id + '\')" ' +
        'style="background:none;border:none;cursor:pointer;color:#ccc;font-size:16px;padding:2px 4px;line-height:1;margin-left:-2px" ' +
        'title="Remove from queue">&#x2715;</button>';
      }).join('') +
      '</div></div>';
  }
  document.getElementById('ao-section').innerHTML = aoHtml;

  // Pick panel
  var pickJrId = activePick ? activePick.split('_')[0] : null;
  var pickJr = pickJrId ? juniors.find(function(j){ return j.id === pickJrId; }) : null;
  var pp = document.getElementById('pick-panel');
  pp.style.display = pickJr ? 'block' : 'none';
  if(pickJr){
    var pickingShift = activePickShift || currentShift;
    var openSlots = activeSlots.filter(function(s){ return s.shift === pickingShift && s.assigned.length < s.capacity; });
    pp.innerHTML = openSlots.length === 0 ?
      '<div class="pick-panel"><div class="pick-header">No open slots</div><div class="pick-sub">All slots for this shift are full.</div><button class="btn btn-sm" onclick="closePick()">Close</button></div>' :
      '<div class="pick-panel">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">' +
          '<div class="pick-header">' + (pickJr.hasHat ? '<img src="assets/hat.png" style="height:18px;vertical-align:middle;margin-right:3px"> ' : '') + pickJr.name + ', choose your assignment</div>' +
          (getJrPlannedShifts(pickJr).length > 1 ? '<div style="font-size:12px;color:#2A3DB5;margin-top:3px">&#9432; Planned shifts: <strong>' + getJrPlannedShifts(pickJr).map(function(s){ return SL[s]; }).join(', ') + '</strong></div>' : '') +
        '</div>' +
          '<button class="btn btn-sm" onclick="closePick()">Cancel</button>' +
        '</div>' +
        '<div class="pick-sub">Last assignment: <strong>' + pickJr.last + '</strong> &nbsp;|&nbsp; Select any open committee below</div>' +
        (pickJr.notes ? '<div style="background:#FFF0F0;border:3px solid #C0392B;border-radius:7px;padding:10px 14px;margin-bottom:10px;font-size:15px;color:#7B0000;font-weight:600"><span style="font-size:17px">&#9888;</span> Additional info from check-in: &ldquo;' + pickJr.notes + '&rdquo;</div>' : '') +
        '<div class="pick-grid">' +
        openSlots.map(function(s){
          var isRep = s.name === pickJr.last;
          var left = s.capacity - s.assigned.length;
          var hatBlocked = s.hat && !pickJr.hasHat;
          return '<button class="pick-btn' + (isRep ? ' repeat' : '') + '" ' +
            (hatBlocked
              ? 'disabled style="opacity:0.35;cursor:not-allowed;background:#F0F0F0;border:2px solid #CCC;pointer-events:none"'
              : 'style="' + (s.hat ? 'border:3px solid #1A56DB;' : '') + '" onclick="pickSlot(\'' + pickJr.id + '\',' + s.id + ')"') +
            '>' +
            '<div class="pick-btn-name" style="' + (hatBlocked ? 'color:#AAA;text-decoration:line-through' : '') + '">' + s.name + '</div>' +
            '<div class="pick-btn-cap">' + SL[s.shift] +
              (s.hat ? ' &bull; Hat req.' : '') +
              ' &bull; ' + left + ' spot' + (left !== 1 ? 's' : '') + ' left' +
              (isRep ? ' &bull; <span style="color:var(--orange)">Same as last time</span>' : '') +
              (hatBlocked ? ' &bull; <span style="color:#AAA;font-weight:700">No hat &mdash; unavailable</span>' : '') +
            '</div>' +
          '</button>';
        }).join('') +
        '</div></div>';
  }

  // Unassigned pool (regular juniors only)
  var unReg = ci.filter(function(j){ return !j.assignment && !j.ageout; });
  var poolEl = document.getElementById('off-pool');
  poolEl.innerHTML = unReg.length === 0 ?
    '<span class="empty-note">' + (ci.filter(function(j){ return !j.ageout; }).length === 0 ? 'No regular juniors checked in yet' : 'All regular juniors are assigned') + '</span>' :
    unReg.map(function(j){ return '<span class="chip' + (j.hasHat ? ' has-hat' : '') + '" ' +
        'draggable="true" data-jid="' + j.id + '" ' +
        'title="Last: ' + j.last + (j.notes ? ' | Note: ' + j.notes : '') + ' — drag to assign" ' +
        'ondragstart="onPoolChipDragStart(event)" ondragend="onPoolChipDragEnd(event)">' +
        (j.hasHat ? '<img src="assets/hat.png" style="height:18px;vertical-align:middle;margin-right:3px"> ' : '') + j.name +
        ' <button onclick="event.stopPropagation();manualClockOut(\'' + j.id + '\')" ' +
        'style="background:none;border:none;cursor:pointer;color:#999;font-size:11px;padding:0 2px;line-height:1;margin-left:2px" ' +
        'title="Sign out" style="color:#CC6600">&#x2715;</button>' +
        '</span>'; }).join('');

  // Slots
  var shiftSlots = activeSlots.filter(function(s){ return s.shift === currentShift; });
  if(search) shiftSlots = shiftSlots.filter(function(s){ return s.name.toLowerCase().includes(search.toLowerCase()); });
  var slotsEl = document.getElementById('off-slots');
  if(shiftSlots.length === 0){
    slotsEl.innerHTML = '<div style="font-size:13px;color:var(--gray-400);padding:1.5rem 0;text-align:center">No committee slots for this shift.<br>Go to <strong>Shift Setup</strong> to add committees.</div>';
    return;
  }
  // Responsive grid based on slot count
  var colCount = shiftSlots.length <= 2 ? 1 : shiftSlots.length <= 4 ? 'repeat(auto-fill,minmax(320px,1fr))' : 'repeat(auto-fill,minmax(300px,1fr))';
  slotsEl.style.gridTemplateColumns = typeof colCount === 'number' ? '1fr' : colCount;
  slotsEl.innerHTML = shiftSlots.map(function(s){
    var pct = s.capacity > 0 ? Math.round((s.assigned.length / s.capacity) * 100) : 0;
    var full = s.assigned.length >= s.capacity;
    var avail = ci.filter(function(j){ return !j.assignment; });
    var fillClass = full ? 'done' : pct >= 75 ? 'warn' : '';
    var isSent = onShiftSlots.has(String(s.id));

    var pillsHtml = s.assigned.map(function(jid){
      var jr = juniors.find(function(j){ return j.id === jid; });
      if(!jr) return '';
      var isOut = (clockedOutShifts[jid] && clockedOutShifts[jid][s.shift]) ||
                  (clockedOutShifts[jr.id] && clockedOutShifts[jr.id][s.shift]);
      return '<span class="pill' + (jr.ageout ? ' ao' : '') + (jr.hasHat ? ' has-hat' : '') + '" ' +
             'style="' + (isOut ? 'opacity:.5;text-decoration:line-through;' : '') + '" ' +
             'title="' + (jr.notes ? 'Note: ' + jr.notes : '') + (isOut ? ' [Clocked out]' : '') + '">' +
             (jr.hasHat ? '<img src="assets/hat.png" style="height:18px;vertical-align:middle;margin-right:3px"> ' : '') + jr.name +
             (jr.ageout ? ' <span class="badge b-ageout" style="font-size:11px;padding:1px 4px;background:none;border:none;color:#F5A623">⭐</span>' : '') +
             (jr.notes ? ' <span style="font-size:11px;color:var(--orange);font-weight:700">&#9432;</span>' : '') +
             (isOut ? ' <span style="font-size:10px;color:#888">(out)</span>' : '') +
             ' <button class="pill-x" data-jid="' + jid + '" data-slotid="' + s.id + '" data-sent="' + isSent + '" data-jrid="' + jr.id + '" onclick="pillAction(this)">&#x2715;</button>' +

             '</span>';
    }).join('');

    var sentBanner = isSent ? '<div style="background:#27AE60;color:#fff;font-size:12px;font-weight:800;text-align:center;padding:5px 10px;border-radius:4px;margin-bottom:8px;letter-spacing:.08em;text-transform:uppercase">&#9650; OUT ON SHIFT</div>' : '';

    var cardStyle = 'slot-card' + (full ? ' full' : '') + (isSent ? ' sent' : '');

    var hpBorder = s.highPriority && !isSent ? 'border:1px solid #CC0000;border-left:3px solid #CC0000;background:#FFF8F8;' : '';
    return '<div class="' + cardStyle + '" data-slotid="' + s.id + '" style="' + (isSent ? '' : hpBorder) + '">' +
      sentBanner +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px;gap:8px">' +
        '<div style="flex:1">' +
          '<div class="slot-name">' + s.name + '</div>' +
          '<div class="slot-meta">' +
            '<span class="badge b-shift">' + SL[s.shift] + '</span>' +
            (s.hat ? '<span class="badge b-hat"><img src="assets/hat.png" style="height:18px;vertical-align:middle;margin-right:3px"> Hat Required</span>' : '') +
            (s.highPriority ? '<span class="badge" style="background:#CC0000;color:#fff">&#9650; HIGH PRIORITY</span>' : '') +
          '</div>' +
        '</div>' +
        ((currentRole==='admin'||currentRole==='slt') ?
          '<div style="display:flex;align-items:center;gap:4px">' +
            '<button onclick="adjustSlotCapacity(\'' + s.id + '\',-1)" style="background:none;border:1px solid var(--gray-200);border-radius:4px;width:22px;height:22px;font-size:14px;line-height:1;cursor:pointer;color:var(--gray-400);display:flex;align-items:center;justify-content:center" title="Decrease capacity">&#8722;</button>' +
            '<span class="badge ' + (full ? 'b-full' : 'b-open') + '" style="min-width:48px;text-align:center">' + s.assigned.length + ' / ' + s.capacity + '</span>' +
            '<button onclick="adjustSlotCapacity(\'' + s.id + '\',1)" style="background:none;border:1px solid var(--gray-200);border-radius:4px;width:22px;height:22px;font-size:14px;line-height:1;cursor:pointer;color:var(--navy);display:flex;align-items:center;justify-content:center" title="Increase capacity">&#43;</button>' +
          '</div>'
        : '<span class="badge ' + (full ? 'b-full' : 'b-open') + '">' + s.assigned.length + ' / ' + s.capacity + '</span>') +
      '</div>' +
      '<div class="prog-bar"><div class="prog-fill ' + fillClass + '" style="width:' + pct + '%"></div></div>' +
      '<div class="assignees">' +
        (s.assigned.length === 0 ? '<span style="font-size:12px;color:var(--gray-400)">No one assigned yet</span>' : '') +
        pillsHtml +
      '</div>' +
      (!full && avail.length > 0 ?
        '<div style="margin-top:8px"><select class="finput" style="font-size:12px" onchange="doManualAssign(this.value,' + s.id + ',this)">' +
          '<option value="">+ Assign a junior manually&hellip;</option>' +
          avail.map(function(j){
            var rep = j.last === s.name;
            return '<option value="' + j.id + '">' + (j.ageout ? '[Age-out] ' : '') + (j.hasHat ? '<img src="assets/hat.png" style="height:18px;vertical-align:middle;margin-right:3px"> ' : '') + j.name + (j.notes ? ' [NOTE]' : '') + ' — last: ' + j.last + (rep ? ' (repeat!)' : '') + '</option>';
          }).join('') +
        '</select></div>' : '') +
      (s.assigned.length > 0 ?
        '<div style="margin-top:8px;display:flex;gap:6px;justify-content:flex-end">' +
          '<button class="btn btn-sm" style="border-color:#4A6CF7;color:#4A6CF7" onclick="printDropOffReport(' + s.id + ')">&#128438; Drop-Off Report</button>' +
          '<button class="btn btn-sm" style="' + (isSent ? 'background:var(--green);color:#fff;border-color:var(--green)' : 'border-color:var(--navy);color:var(--navy)') + '" onclick="' + (isSent ? 'undoSent' : 'markSent') + '(' + s.id + ')" title="' + (isSent ? 'Click to undo' : 'Mark juniors as out on shift') + '">' +
          (isSent ? '&#9989; Out on Shift &mdash; undo' : '&#128228; Mark Sent') +
          '</button></div>' : '') +
    '<div style="height:4px;border-radius:0 0 8px 8px;background:var(--gray-100);margin:10px -14px -12px;overflow:hidden">' +
      '<div style="height:100%;width:' + pct + '%;background:' + (full ? '#27AE60' : pct >= 75 ? '#F39C12' : 'var(--navy)') + ';transition:width .4s ease;border-radius:0 0 8px 0"></div>' +
    '</div>' +
    '</div>';
  }).join('');
}


function renderTabs(activeTab){
  var bar = document.getElementById('tab-bar');
  if(!bar) return;
  bar.style.display = 'flex';
  bar.style.flexWrap = 'wrap';
  bar.style.gap = '0';

  // Tab definitions per role — [id, label, row]
  var TAB_DEFS = {
    // Row 1: Status Board, Dashboard, Kiosk
    // Row 2: Check Ins, Roster, Hours Report
    // Row 3: Submit Request, Requests, Shift Setup, Settings
    // A=admin, V=slt, O=officer, S=scheduling
    admin: [
      ['board',    'Status Board',    1],
      ['officer',  'Dashboard',       1],
      ['kiosk',    'Kiosk',           1],
      ['checkins', 'Check-ins',       2],
      ['roster',   'Roster',          2],
      ['hours',    'Hours Report',    2],
      ['reqform',  'Submit Request',  3],
      ['requests', 'Requests',        3],
      ['setup',    'Shift Setup',     3],
      ['simulate', 'Settings',        3],
    ],
    slt: [
      ['board',    'Status Board',    1],
      ['officer',  'Dashboard',       1],
      ['kiosk',    'Kiosk',           1],
      ['checkins', 'Check-ins',       2],
      ['roster',   'Roster',          2],
      ['hours',    'Hours Report',    2],
      ['reqform',  'Submit Request',  3],
      ['requests', 'Requests',        3],
      ['setup',    'Shift Setup',     3],
    ],
    officer: [
      ['board',    'Status Board',    1],
      ['officer',  'Dashboard',       1],
      ['kiosk',    'Kiosk',           1],
      ['checkins', 'Check-ins',       2],
      ['roster',   'Roster',          2],
      ['hours',    'Hours Report',    2],
    ],
    scheduling: [
      ['board',    'Status Board',    1],
      ['officer',  'Dashboard',       1],
      ['kiosk',    'Kiosk',           1],
      ['checkins', 'Check-ins',       2],
      ['roster',   'Roster',          2],
      ['hours',    'Hours Report',    2],
      ['reqform',  'Submit Request',  3],
      ['requests', 'Requests',        3],
    ],
    kiosk: [
      ['kiosk',    'Kiosk',           1],
    ],
    board: [
      ['board',    'Status Board',    1],
    ],
  };

  var defs = TAB_DEFS[currentRole] || [];
  var row1 = defs.filter(function(d){ return d[2]===1; });
  var row2 = defs.filter(function(d){ return d[2]===2; });
  var row3 = defs.filter(function(d){ return d[2]===3; });

  function makeBtn(d){
    var isActive = d[0] === (activeTab || currentTab);
    return '<button class="tab' + (isActive ? ' active' : '') + '" style="flex:1;min-width:80px;text-align:center" onclick="switchTab(\'' + d[0] + '\',this)">' + d[1] + '</button>';
  }

  function makeRow(tabs, extra){
    return '<div style="display:flex;flex-wrap:nowrap;width:100%;' + (extra||'') + '">' + tabs.map(makeBtn).join('') + '</div>';
  }

  var html = makeRow(row1);
  if(row2.length) html += makeRow(row2, 'border-top:1px solid var(--gray-100)');
  if(row3.length) html += makeRow(row3, 'border-top:1px solid var(--gray-100)');
  bar.innerHTML = html;
}

function setShift(s){ currentShift = s; activePick = null; renderOfficer(); }
function openPick(jid){ activePick = jid; renderOfficer(); }
function removeFromAoQueue(jid){
  var jr = juniors.find(function(j){ return j.id === jid; });
  if(!jr) return;
  if(!confirm('Remove ' + jr.name.split(',')[0] + ' from the age-out queue? This will sign them out of the current shift.')) return;
  // Clear all session state for this junior
  if(jr.assignment){
    var sl = activeSlots.find(function(s){ return s.name === jr.assignment && s.shift === currentShift; });
    if(sl) sl.assigned = sl.assigned.filter(function(id){ return id !== jr.id; });
  }
  jr.checkedIn      = false;
  jr.assignment     = null;
  jr.order          = 0;
  jr.checkInShift   = '';
  jr.plannedShifts  = [];
  jr.shiftAssignments = {};
  clockedOut[jr.id] = false;
  onShiftJuniors.delete(jr.id);
  renderOfficer();
  saveStateNow();
  showAlert(jr.name.split(',')[0] + ' removed from queue.', 'info');
}

var _pickReturnShift = null; // legacy — kept so old saved state can't strand us
function openPickForShift(jid, shift){
  // NOTE: deliberately does NOT touch currentShift. currentShift is the
  // officer's tab; the pick panel scopes itself with activePickShift. Moving
  // the global shift here was silently reassigning the whole app to whatever
  // shift an age-out happened to be picking for.
  activePick = jid + '_' + shift;
  activePickShift = shift;
  renderOfficer();
}
function closePick(){
  activePick = null; activePickShift = null;
  if(_pickReturnShift){ currentShift = _pickReturnShift; _pickReturnShift = null; }
  renderOfficer();
}

function pickSlot(jid, slotId){
  var realJid = jid.split('_')[0]; // strip shift suffix if present
  var jr = juniors.find(function(j){ return j.id === realJid; });
  var sl = activeSlots.find(function(s){ return String(s.id) === String(slotId); });
  if(!jr || !sl) return;

  if(jr.ageout){
    // Age-out picking a slot
    if(!jr.shiftAssignments) jr.shiftAssignments = {};
    if(jr.shiftAssignments[sl.shift]) return; // already assigned to this shift

    // If slot is full, check if we can bump a regular junior (only if slot not sent)
    if(sl.assigned.length >= sl.capacity){
      if(sl.sent) return; // locked — slot already sent out
      // Find a regular (non-age-out) junior in this slot who is NOT locked
      var bumpable = sl.assigned.map(function(id){
        return juniors.find(function(j){ return j.id === id; });
      }).filter(function(j){ return j && !j.ageout && !lockedJuniors.has(j.id); });
      if(!bumpable.length) return; // no one to bump
      // Bump the last-added regular junior back to pool
      var bump = bumpable[bumpable.length - 1];
      bump.assignment = null;
      bump.prevLast   = bump.last;
      sl.assigned = sl.assigned.filter(function(id){ return id !== bump.id; });
      showAlert(bump.name.split(',')[0] + ' moved back to pool.', 'info');
    }

    jr.shiftAssignments[sl.shift] = sl.name;
    // Only go "live" if this pick is for the shift they're actually working
    // now. Picks for later shifts stay parked in shiftAssignments.
    if(sl.shift === getJrActiveShift(jr)){
      assignJr(jr, sl.name);
      lockedJuniors.add(jr.id);
    }
  } else {
    if(jr.assignment || sl.assigned.length >= sl.capacity) return;
    assignJr(jr, sl.name);
  }
  sl.assigned.push(jr.id);
  activePick = null;
  activePickShift = null;
  if(_pickReturnShift){ currentShift = _pickReturnShift; _pickReturnShift = null; }
  renderOfficer();
  saveStateNow();
}

function doManualAssign(jid, slotId, sel){
  if(!jid) return;
  var jr = juniors.find(function(j){ return j.id === jid; });
  var sl = activeSlots.find(function(s){ return String(s.id) === String(slotId); });
  if(!jr || !sl || jr.assignment || sl.assigned.length >= sl.capacity) return;
  assignJr(jr, sl.name);
  sl.assigned.push(jr.id);
  sel.value = '';
  renderOfficer();
  saveStateNow();
  saveStateNow();
}

var _pillActionData = {};

function pillAction(btn){
  var jid    = btn.getAttribute('data-jid');
  var slotId = btn.getAttribute('data-slotid');
  var sent   = btn.getAttribute('data-sent') === 'true';
  var jrid   = btn.getAttribute('data-jrid');
  var jr  = juniors.find(function(j){ return j.id === jrid; });
  var sl  = activeSlots.find(function(s){ return String(s.id) === String(slotId); });
  if(!jr || !sl) return;

  _pillActionData = { jid: jid, jrid: jrid, slotId: slotId, sent: sent };

  var modal = document.getElementById('pill-modal');
  document.getElementById('pill-modal-name').textContent = jr.name;
  document.getElementById('pill-modal-slot').textContent = 'Currently assigned to: ' + sl.name;
  document.getElementById('pill-modal-confirm').style.display = 'none';

  // If slot is sent, can't return to queue — only sign out
  var qBtn = document.getElementById('pill-modal-queue');
  if(sent){
    qBtn.style.display = 'none';
  } else {
    qBtn.style.display = '';
  }
  modal.style.display = 'flex';
}

function pillModalClose(){
  document.getElementById('pill-modal').style.display = 'none';
  _pillActionData = {};
}

function pillModalQueue(){
  var d = _pillActionData;
  var jr = juniors.find(function(j){ return j.id === d.jrid; });
  var sl = activeSlots.find(function(s){ return String(s.id) === String(d.slotId); });
  if(jr && sl){ unassignJr(jr, sl); renderOfficer(); saveStateNow(); }
  pillModalClose();
}

function pillModalSignOut(){
  var d = _pillActionData;
  var jr = juniors.find(function(j){ return j.id === d.jrid; });
  if(!jr) return;
  document.getElementById('pill-modal-confirm-name').textContent = jr.name.split(',')[0];
  document.getElementById('pill-modal-confirm').style.display = 'block';
}

function pillModalConfirmSignOut(){
  var d = _pillActionData;
  pillModalClose();
  manualClockOut(d.jrid, true); // true = skip built-in confirm
}

function doUnassign(jid, slotId){
  var jr = juniors.find(function(j){ return j.id === jid; });
  var sl = activeSlots.find(function(s){ return String(s.id) === String(slotId); });
  if(!jr || !sl) return;
  unassignJr(jr, sl);
  renderOfficer();
  saveState();
}


function toggleHighPriority(slotId){
  var sl = activeSlots.find(function(s){ return String(s.id) === String(slotId); });
  if(!sl) return;
  sl.highPriority = !sl.highPriority;
  renderOfficer();
  saveState();
}

function placeStragglers(){
  var ci = juniors.filter(function(j){ return j.checkedIn && !j.assignment && !j.ageout; });
  if(ci.length === 0){ showAlert('No unassigned juniors to place.', 'info'); return; }
  var open = activeSlots.filter(function(s){ return s.shift === currentShift && s.assigned.length < s.capacity; });
  if(open.length === 0){ showAlert('No open slots in this shift.', 'warn'); return; }
  var placed = 0;
  ci.forEach(function(jr){
    var eligible = jr.hasHat ? open : open.filter(function(s){ return !s.hat; });
    if(!eligible.length) return;

    // Respect history block unless every eligible slot is already sent
    var last = (jr.shiftLog && jr.shiftLog.length) ? jr.shiftLog[jr.shiftLog.length-1].committee : null;
    var noRepeat = last ? eligible.filter(function(s){ return s.name !== last; }) : eligible;
    // Only apply history block if there are non-sent options available
    var unsentOptions = noRepeat.filter(function(s){ return !s.sent; });
    if(unsentOptions.length > 0) eligible = noRepeat;
    // else: all options are sent or only last committee available — use any slot

    // Add to most-filled slot first (become a 3rd rather than starting alone)
    eligible.sort(function(a,b){ return b.assigned.length - a.assigned.length; });
    var pick = eligible[0];
    assignJr(jr, pick.name);
    pick.assigned.push(jr.id);
    placed++;
  });
  showAlert(placed + ' straggler' + (placed !== 1 ? 's' : '') + ' placed.', placed > 0 ? 'success' : 'warn');
  renderOfficer();
  saveStateNow();
}

function autoAssign(){
  var ci = juniors.filter(function(j){ return j.checkedIn && !j.assignment; });
  var reg = ci.filter(function(j){ return !j.ageout; });
  if(reg.length === 0){
    var aoWaiting = ci.filter(function(j){ return j.ageout; }).length;
    showAlert(aoWaiting > 0
      ? aoWaiting + ' age-out' + (aoWaiting !== 1 ? 's are' : ' is') + ' waiting — use the Age-Out Queue. No regular juniors to assign.'
      : 'No unassigned juniors to place.', 'info');
    return;
  }
  var open = activeSlots.filter(function(s){ return s.shift === currentShift && s.assigned.length < s.capacity; });
  if(open.length === 0){ showAlert('No open slots in this shift.', 'warn'); return; }

  // Get most recent committee for hard history block
  function lastCommittee(jr){
    if(jr.shiftLog && jr.shiftLog.length > 0) return jr.shiftLog[jr.shiftLog.length-1].committee;
    return jr.last && jr.last !== 'None' ? jr.last : null;
  }

  // Visit count map for variety soft sort
  function visitMap(jr){
    var v = {};
    if(jr.shiftLog) jr.shiftLog.forEach(function(e){ v[e.committee] = (v[e.committee]||0)+1; });
    return v;
  }

  // Hat pool selection
  function hatPool(jr, candidates, pool){
    if(!jr.hasHat) return candidates;
    var hatC    = candidates.filter(function(s){ return s.hat; });
    var nonHatC = candidates.filter(function(s){ return !s.hat; });
    var nonHatLeft = pool.filter(function(j){ return !j.assignment && !j.hasHat; }).length;
    var hatSolo = hatC.filter(function(s){ return s.assigned.length === 1; });
    if(hatSolo.length) return hatSolo;           // must fill solo in hat slot
    if(nonHatLeft > 0 && nonHatC.length) return nonHatC;  // pair with non-hat junior
    if(hatC.length) return hatC;                 // pair with other hat-wearers
    return candidates;
  }

  // Pick best slot for this junior
  function pickSlot(jr, pool){
    var allOpen = activeSlots.filter(function(s){
      return s.shift === currentShift && s.assigned.length < s.capacity;
    });
    if(!allOpen.length) return null;

    // Hard filter: non-hat juniors cannot go to hat slots
    var eligible = jr.hasHat ? allOpen : allOpen.filter(function(s){ return !s.hat; });
    if(!eligible.length) return null;

    var last = lastCommittee(jr);
    var visited = visitMap(jr);

    // Rule 4 (high priority): fill HP slots to capacity first
    var hpOpen = eligible.filter(function(s){ return s.highPriority; });
    if(hpOpen.length){
      // Even-fill within HP slots: 1s first, then min
      var hpAtOne = hpOpen.filter(function(s){ return s.assigned.length === 1; });
      var hpMinFill = hpOpen.reduce(function(m,s){ return Math.min(m, s.assigned.length); }, Infinity);
      var hpCands = hpAtOne.length ? hpAtOne : hpOpen.filter(function(s){ return s.assigned.length === hpMinFill; });
      var hpNoRepeat = last ? hpCands.filter(function(s){ return s.name !== last; }) : hpCands;
      if(hpNoRepeat.length) hpCands = hpNoRepeat;
      hpCands = hatPool(jr, hpCands, pool);
      hpCands.sort(function(a,b){ return (visited[a.name]||0)-(visited[b.name]||0); });
      if(hpCands.length) return hpCands[0];
    }

    // Regular slots — core rule: everyone gets 2 before anyone gets 3, etc.
    var regular = eligible.filter(function(s){ return !s.highPriority; });
    if(!regular.length) regular = eligible;

    // STEP 1: Find the global minimum fill across all regular slots
    var minFill = regular.reduce(function(m,s){ return Math.min(m, s.assigned.length); }, Infinity);

    // STEP 2: Candidates are ONLY slots at the minimum fill level
    // (never skip ahead to give someone a 3rd when another slot has 0 or 1)
    var atMin = regular.filter(function(s){ return s.assigned.length === minFill; });

    // STEP 3: Prefer slots at 1 (no-solo fix) within the min-fill group
    // Exception: if minFill is 0 and there are also slots at 1, fill the 1s first
    var atOne = regular.filter(function(s){ return s.assigned.length === 1; });
    var cands;
    if(atOne.length && minFill === 0){
      // Some empty, some at 1 — fill the 1s first (no-solo priority)
      cands = atOne;
    } else {
      cands = atMin;
    }

    // STEP 4: History soft-block — avoid last committee if other options exist
    var noRepeat = last ? cands.filter(function(s){ return s.name !== last; }) : cands;
    if(noRepeat.length) cands = noRepeat;
    // (if noRepeat is empty, stay with original cands — don't fall back to overfilled slots)

    // STEP 5: Hat priority
    cands = hatPool(jr, cands, pool);

    // STEP 6: Variety — least visited committee
    cands.sort(function(a,b){ return (visited[a.name]||0)-(visited[b.name]||0); });
    var minV = cands.length ? (visited[cands[0].name]||0) : 0;
    var freshest = cands.filter(function(s){ return (visited[s.name]||0) === minV; });
    return freshest[0] || null;
  }

  // Assign in check-in order
  var pool = reg.slice().sort(function(a,b){ return a.order - b.order; });
  var placed = 0, skipped = 0;

  pool.forEach(function(jr){
    var stillUnassigned = pool.filter(function(j){ return !j.assignment; });

    // Rule 1 (no solo): if last person left, only assign if there's a solo to complete
    if(stillUnassigned.length === 1 && stillUnassigned[0].id === jr.id){
      var canCompleteSolo = activeSlots.some(function(s){
        return s.shift === currentShift &&
               s.assigned.length === 1 &&
               s.assigned.length < s.capacity &&
               (jr.hasHat || !s.hat);
      });
      if(!canCompleteSolo){ skipped++; return; }
    }

    var pick = pickSlot(jr, pool);
    if(!pick){ skipped++; return; }
    assignJr(jr, pick.name);
    pick.assigned.push(jr.id);
    placed++;
  });

  var msg = placed + ' junior' + (placed !== 1 ? 's' : '') + ' assigned.';
  if(skipped) msg += ' ' + skipped + ' junior' + (skipped !== 1 ? 's' : '') + ' left in pool — use Place Straggler.';
  showAlert(msg, placed > 0 ? 'success' : 'warn');
  renderOfficer();
  saveStateNow();
}


function clearAssignments(){
  juniors.forEach(function(j){
    if(j.assignment){
      j.last = j.prevLast !== null ? j.prevLast : j.last;
      if(j.history.length > 0 && j.history[j.history.length - 1] === j.assignment) j.history.pop();
      j.assignment = null; j.prevLast = null;
    }
  });
  activeSlots.forEach(function(s){ s.assigned = []; });
  activePick = null;
  document.getElementById('off-alert').style.display = 'none';
  renderOfficer();
  renderBoard();
  // Reset Neon session state — DELETE clears app_state + active_slots + resets checked_in
  fetch('/.netlify/functions/state', {method:'DELETE',headers:{'x-api-token':API_TOKEN}})
    .then(function(){ console.log('Session cleared in Neon'); })
    .catch(function(e){ console.warn('Neon session clear failed:', e.message); });
  // Also save all juniors with checkedIn=false to Neon so no ghost check-ins remain
  saveRosterToNeon(null);
}

function resetShift(){
  if(!confirm('Reset the full shift? Check-ins and assignments will be cleared. Assignment history is preserved.')) return;
  checkInOrder = 0;
  juniors.forEach(function(j){
    if(j.assignment){
      j.last = j.prevLast !== null ? j.prevLast : j.last;
      if(j.history.length > 0 && j.history[j.history.length - 1] === j.assignment) j.history.pop();
      j.assignment = null; j.prevLast = null;
    }
    j.checkedIn      = false;
    j.order          = 0;
    j.checkInShift   = '';
    j.plannedShifts  = [];
    j.shiftAssignments = {};
  });
  activeSlots.forEach(function(s){ s.assigned = []; });
  activePick = null;
  activePickShift = null;
  activeNotePick = null;
  notesState = {};
  notesCollapsed = false;
  clockedOut = {};
  clockedOutShifts = {};
  onShiftJuniors = new Set();
  onShiftSlots = new Set();
  lockedJuniors = new Set();
  juniors.forEach(function(j){ dirtyJuniors.add(j.id); });
  _lastSavedHash = '';
  saveStateNow();
  renderBoard();
  document.getElementById('off-alert').style.display = 'none';
  renderOfficer();
  showAlert('Shift cleared.', 'info');
}

function clearAll(){
  if(!confirm('Clear all check-ins and assignments for today?')) return;
  resetShift();
}

function clearStrandedCheckins(){
  var stranded = juniors.filter(function(j){
    if(!j.checkedIn) return false;
    return !j.checkInDate || j.checkInDate !== currentDate;
  });
  if(stranded.length === 0){
    showAlert('No stranded check-ins — all checked-in juniors match today (' + currentDate + ').', 'info');
    renderStrandedPanel();
    return;
  }
  if(!confirm('Clear ' + stranded.length + ' stranded check-in' + (stranded.length !== 1 ? 's' : '') + ' from dates other than ' + currentDate + '?')) return;
  stranded.forEach(function(j){
    j.checkedIn    = false;
    j.assignment   = null;
    j.checkInShift = '';
    j.checkInDate  = '';
    j.checkInTimestamp = 0;
    j.order        = 0;
    clockedOut[j.id] = false;
    delete clockedOut[j.id];
    dirtyJuniors.add(j.id); // force these juniors into the next save
    activeSlots.forEach(function(s){
      var idx = s.assigned.indexOf(j.id);
      if(idx >= 0) s.assigned.splice(idx, 1);
    });
  });
  _lastSavedHash = ''; // invalidate hash so saveStateNow always fires
  saveStateNow();
  showAlert(stranded.length + ' stranded check-in' + (stranded.length !== 1 ? 's' : '') + ' cleared.', 'success');
  renderStrandedPanel();
  renderBoard();
}

function renderStrandedPanel(){
  var el = document.getElementById('stranded-list');
  if(!el) return;
  var allCI = juniors.filter(function(j){ return j.checkedIn; });
  if(allCI.length === 0){
    el.innerHTML = '<div style="font-size:12px;color:var(--gray-400);font-style:italic">No juniors currently checked in.</div>';
    return;
  }
  var byDate = {};
  allCI.forEach(function(j){
    var d = j.checkInDate || '(unknown date)';
    if(!byDate[d]) byDate[d] = [];
    byDate[d].push(j);
  });
  var dates = Object.keys(byDate).sort();
  var html = '';
  dates.forEach(function(d){
    var isToday = d === currentDate;
    var color = isToday ? 'var(--green)' : '#FF6B6B';
    var label = isToday ? '&#10003; Today (' + d + ')' : '&#9888; ' + d + ' &mdash; NOT today';
    html += '<div style="margin-bottom:10px">';
    html += '<div style="font-size:11px;font-weight:700;color:' + color + ';margin-bottom:4px">' + label + ' &mdash; ' + byDate[d].length + ' junior' + (byDate[d].length !== 1 ? 's' : '') + '</div>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:4px">';
    byDate[d].forEach(function(j){
      var status = getJuniorStatus(j);
      html += '<span style="font-size:11px;background:' + (isToday ? 'var(--navy-lt)' : '#FDEDED') + ';color:' + (isToday ? 'var(--navy)' : 'var(--red)') + ';padding:2px 8px;border-radius:20px;border:1px solid ' + (isToday ? 'var(--gray-200)' : '#F5C6CB') + '">' +
        j.name + ' <span style="opacity:.6">(' + (j.checkInShift||'?') + ' / ' + status + ')</span></span>';
    });
    html += '</div></div>';
  });
  el.innerHTML = html;
}

function confirmClearHistory(){
  if(!confirm('Clear all assignment history AND hours for every junior and adult? This cannot be undone.')) return;
  resetAllHistory();
}

function resetAllHistory(){
  // Clear juniors: assignment history, last committee, shift log (hours), note log
  juniors.forEach(function(j){
    j.history  = [];
    j.last     = 'None';
    j.shiftLog = [];
    j.noteLog  = [];
    dirtyJuniors.add(j.id); // force every junior into the save payload
  });
  // Clear adults: shift log (hours)
  (adults||[]).forEach(function(a){
    a.shiftLog = [];
  });
  _lastSavedHash = '';
  saveStateNow();
  renderRoster();
  showAlert('All assignment history and hours cleared.', 'info');
}

var _alertTimer = null;
function showAlert(msg, type){
  var el = document.getElementById('off-alert');
  if(!el) return;
  if(_alertTimer) clearTimeout(_alertTimer);
  el.className = 'alert alert-' + (type||'info') + ' animating';
  el.innerHTML = msg;
  el.style.display = 'block';
  // Force reflow to restart animation
  void el.offsetWidth;
  el.className = 'alert alert-' + (type||'info') + ' animating';
  _alertTimer = setTimeout(function(){
    el.style.opacity = '0';
    el.style.transition = 'opacity .3s';
    setTimeout(function(){ el.style.display='none'; el.style.opacity=''; el.style.transition=''; }, 300);
  }, 4000);
}


// ============================================================
// CHECK-INS TAB
// ============================================================
function renderCheckins(){
  var el = document.getElementById('checkins-content');
  if(!el) return;

  var active       = juniors.filter(function(j){ return j.checkedIn && !clockedOut[j.id]; });
  var clockedOutList = juniors.filter(function(j){ return j.checkedIn && clockedOut[j.id]; });
  var allCI        = active.concat(clockedOutList);

  // Group by date
  var stale = allCI.filter(function(j){ return j.checkInDate && j.checkInDate !== currentDate; });

  function fmtTs(j){
    if(!j.checkInTimestamp) return j.checkInDate || '—';
    var d = new Date(j.checkInTimestamp);
    var h = d.getHours(), m = d.getMinutes();
    var ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + ':' + String(m).padStart(2,'0') + ' ' + ampm + ', ' + (j.checkInDate || '');
  }

  function buildRow(j){
    var status = getJuniorStatus(j);
    var isClockedOut = clockedOut[j.id];
    var isStale = j.checkInDate && j.checkInDate !== currentDate;
    var statusLabel = {
      'checked-in':  '<span style="color:#4A90D9">&#9679; Checked In</span>',
      'assigned':    '<span style="color:#F0C040">&#9632; Assigned</span>',
      'on-shift':    '<span style="color:#5CDB95;font-weight:700">&#9650; Out on Shift</span>',
      'checked-out': '<span style="color:#999">&#10003; Clocked Out</span>',
    }[status] || '<span style="color:#999">' + status + '</span>';
    var rowStyle = isStale ? 'background:#FFF5F5;' : isClockedOut ? 'opacity:.55;' : '';
    return '<tr style="' + rowStyle + '">' +
      '<td style="padding:8px 12px;font-weight:600">' + j.name + (isStale ? ' <span style="font-size:10px;color:#CC0000;font-weight:700">STALE</span>' : '') + '</td>' +
      '<td style="padding:8px 12px;color:#667788">' + (j.checkInShift||'—') + '</td>' +
      '<td style="padding:8px 12px">' + fmtTs(j) + '</td>' +
      '<td style="padding:8px 12px">' + statusLabel + '</td>' +
      '<td style="padding:8px 12px">' + (j.assignment||'—') + '</td>' +
      '<td style="padding:8px 12px;text-align:right">' +
        (!isClockedOut ?
          '<button class="btn btn-sm btn-danger" onclick="adminClockOut(\''+ j.id +'\')" >Clock Out</button>' :
          '<button class="btn btn-sm" style="color:#999;border-color:#ccc" onclick="adminUndoClockOut(\''+ j.id +'\')" >Undo</button>'
        ) +
      '</td>' +
    '</tr>';
  }

  // ── Active check-ins section ──────────────────────────────
  var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px">' +
    '<div id="checkins-summary" style="font-size:13px;color:#667788">' +
      '<strong style="color:var(--navy)">' + active.length + '</strong> currently checked in' +
      (clockedOutList.length > 0 ? ' &bull; <strong>' + clockedOutList.length + '</strong> clocked out this session' : '') +
      (stale.length > 0 ? ' &bull; <strong style="color:#CC0000">' + stale.length + '</strong> stale' : '') +
    '</div>' +
    '<div style="display:flex;gap:6px">' +
      (stale.length > 0 ? '<button class="btn btn-sm btn-danger" onclick="clearStrandedCheckins()">Clear Stale</button>' : '') +
      '<button class="btn btn-sm" style="border-color:var(--navy);color:var(--navy)" onclick="renderCheckins()">&#8635; Refresh</button>' +
    '</div>' +
  '</div>';

  html += '<div id="checkins-table-wrap">';
  if(allCI.length === 0){
    html += '<div style="padding:20px;background:var(--gray-50);border-radius:8px;text-align:center;color:var(--gray-400);font-style:italic;margin-bottom:16px">No juniors checked in right now.</div>';
  } else {
    html += '<div style="overflow-x:auto;margin-bottom:16px"><table style="width:100%;border-collapse:collapse;font-size:13px">' +
      '<thead><tr style="background:var(--navy);color:#fff;font-size:11px;text-transform:uppercase;letter-spacing:.07em">' +
        '<th style="padding:8px 12px;text-align:left;font-weight:600">Name</th>' +
        '<th style="padding:8px 12px;text-align:left;font-weight:600">Shift</th>' +
        '<th style="padding:8px 12px;text-align:left;font-weight:600">Checked In At</th>' +
        '<th style="padding:8px 12px;text-align:left;font-weight:600">Status</th>' +
        '<th style="padding:8px 12px;text-align:left;font-weight:600">Assignment</th>' +
        '<th style="padding:8px 12px;text-align:right;font-weight:600">Action</th>' +
      '</tr></thead>' +
      '<tbody>' +
        allCI.slice().sort(function(a,b){
          var aStale = a.checkInDate && a.checkInDate !== currentDate ? 1 : 0;
          var bStale = b.checkInDate && b.checkInDate !== currentDate ? 1 : 0;
          if(aStale !== bStale) return aStale - bStale;
          return (a.checkInTimestamp||0) - (b.checkInTimestamp||0);
        }).map(buildRow).join('') +
      '</tbody>' +
    '</table></div>';
  }
  html += '</div>'; // checkins-table-wrap

  // ── Junior Roster (collapsible) ──────────────────────────
  var notCI = juniors.filter(function(j){
    return !j.inactive && !j.checkedIn;
  }).slice().sort(function(a,b){ return a.name.localeCompare(b.name); });

  var outsideWindow = !getShiftFromTime(getSimTime());
  var windowWarn = outsideWindow
    ? '<div style="font-size:11px;color:#856404;background:#FFF3CD;border:1px solid #FFEAA7;border-radius:6px;padding:6px 10px;margin-bottom:10px">&#9888; Outside check-in hours &mdash; quick check-ins will be logged under the current officer shift (' + currentShift + ').</div>'
    : '';

  var searchVal = '';
  var searchEl = document.getElementById('ci-roster-search');
  if(searchEl) searchVal = searchEl.value || '';
  var filtered = searchVal
    ? notCI.filter(function(j){ return j.name.toLowerCase().indexOf(searchVal.toLowerCase()) >= 0; })
    : notCI;

  function buildRosterRow(j){
    return '<tr>' +
      '<td style="padding:6px 10px;font-size:13px;font-weight:500">' + j.name + '</td>' +
      '<td style="padding:6px 10px;font-size:11px;color:#667788">' + (j.title||'').replace('Junior ','') + '</td>' +
      '<td style="padding:6px 10px;text-align:right">' +
        '<button class="btn btn-sm" style="background:var(--navy);color:#fff;border-color:var(--navy);padding:4px 12px" ' +
        'onclick="quickCheckIn(\''+ j.id +'\')">&#43; Check In</button>' +
      '</td>' +
    '</tr>';
  }

  // Adult roster
  var notCIAdults = (adults||[]).filter(function(a){ return !a.inactive && !a.clockedIn; })
    .slice().sort(function(a,b){ return a.name.localeCompare(b.name); });
  var searchAdultVal = '';
  var searchAdultEl = document.getElementById('ci-adult-roster-search');
  if(searchAdultEl) searchAdultVal = searchAdultEl.value || '';
  var filteredAdults = searchAdultVal
    ? notCIAdults.filter(function(a){ return a.name.toLowerCase().indexOf(searchAdultVal.toLowerCase()) >= 0; })
    : notCIAdults;

  function buildAdultRosterRow(a){
    return '<tr>' +
      '<td style="padding:6px 10px;font-size:13px;font-weight:500">' + a.name + '</td>' +
      '<td style="padding:6px 10px;font-size:11px;color:#667788">' + (a.title||'') + '</td>' +
      '<td style="padding:6px 10px;text-align:right">' +
        '<button class="btn btn-sm" style="background:var(--orange);color:#fff;border-color:var(--orange);padding:4px 12px" ' +
        'onclick="quickAdultCheckIn(\''+ a.id +'\')">&#43; Check In</button>' +
      '</td>' +
    '</tr>';
  }

  html += '<div style="display:flex;flex-direction:column;gap:10px">' +

  // Junior Roster
  '<div style="border:1px solid var(--gray-200);border-radius:8px;overflow:hidden">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--gray-50);cursor:pointer;user-select:none" onclick="toggleCIRoster()">' +
      '<div style="font-size:13px;font-weight:600;color:var(--navy)">&#128101; Junior Roster <span style="font-weight:400;color:#667788;font-size:12px">(' + notCI.length + ' not yet checked in)</span></div>' +
      '<span id="ci-roster-toggle-icon" style="font-size:11px;color:#667788">tap to expand</span>' +
    '</div>' +
    '<div id="ci-roster-body" style="display:none">' +
      '<div style="padding:10px 14px;border-top:1px solid var(--gray-200)">' +
        windowWarn +
        '<div style="display:flex;gap:8px;margin-bottom:10px;align-items:center">' +
          '<input type="text" id="ci-roster-search" placeholder="Search by name..." ' +
          'style="flex:1;padding:7px 10px;border:1px solid var(--gray-200);border-radius:6px;font-size:13px;font-family:var(--font)" ' +
          'oninput="renderCIRosterRows()" />' +
          '<select id="ci-roster-shift" style="padding:7px 10px;border:1px solid var(--gray-200);border-radius:6px;font-size:13px;font-family:var(--font);color:var(--gray-700)">' +
            '<option value="8am"' + (currentShift==='8am'?' selected':'') + '>8:00 AM</option>' +
            '<option value="12pm"' + (currentShift==='12pm'?' selected':'') + '>12:00 PM</option>' +
            '<option value="4pm"' + (currentShift==='4pm'?' selected':'') + '>4:00 PM</option>' +
          '</select>' +
        '</div>' +
        '<div id="ci-roster-rows">' +
          (filtered.length === 0
            ? '<div style="text-align:center;color:var(--gray-400);font-style:italic;padding:12px">All juniors are already checked in.</div>'
            : '<table style="width:100%;border-collapse:collapse"><tbody>' + filtered.map(buildRosterRow).join('') + '</tbody></table>'
          ) +
        '</div>' +
      '</div>' +
    '</div>' +
  '</div>' +

  // Adult Roster
  '<div style="border:1px solid var(--orange);border-radius:8px;overflow:hidden">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#FFF8F0;cursor:pointer;user-select:none" onclick="toggleCIAdultRoster()">' +
      '<div style="font-size:13px;font-weight:600;color:var(--orange)">&#128084; Adult Roster <span style="font-weight:400;color:#667788;font-size:12px">(' + notCIAdults.length + ' not yet checked in)</span></div>' +
      '<span id="ci-adult-roster-toggle-icon" style="font-size:11px;color:#667788">tap to expand</span>' +
    '</div>' +
    '<div id="ci-adult-roster-body" style="display:none">' +
      '<div style="padding:10px 14px;border-top:1px solid var(--orange)">' +
        '<input type="text" id="ci-adult-roster-search" placeholder="Search by name..." ' +
        'style="width:100%;padding:7px 10px;border:1px solid var(--gray-200);border-radius:6px;font-size:13px;font-family:var(--font);margin-bottom:10px" ' +
        'oninput="renderCIAdultRosterRows()" />' +
        '<div id="ci-adult-roster-rows">' +
          (filteredAdults.length === 0
            ? '<div style="text-align:center;color:var(--gray-400);font-style:italic;padding:12px">All adults are already checked in.</div>'
            : '<table style="width:100%;border-collapse:collapse"><tbody>' + filteredAdults.map(buildAdultRosterRow).join('') + '</tbody></table>'
          ) +
        '</div>' +
      '</div>' +
    '</div>' +
  '</div></div>';

  el.innerHTML = html;
}

// Refresh only the active check-ins table (called after quickCheckIn to avoid collapsing the drawer)
function renderCheckinsTable(){
  var el = document.getElementById('checkins-table-wrap');
  var summary = document.getElementById('checkins-summary');
  if(!el) return; // full panel not rendered yet

  var active         = juniors.filter(function(j){ return j.checkedIn && !clockedOut[j.id]; });
  var clockedOutList = juniors.filter(function(j){ return j.checkedIn && clockedOut[j.id]; });
  var allCI          = active.concat(clockedOutList);
  var stale          = allCI.filter(function(j){ return j.checkInDate && j.checkInDate !== currentDate; });
  var activeAdults   = (adults||[]).filter(function(a){ return a.clockedIn && !a.inactive; });
  var total          = active.length + activeAdults.length;

  if(summary){
    summary.innerHTML =
      '<strong style="color:var(--navy)">' + total + '</strong> currently checked in' +
      ' (' + active.length + ' juniors, ' + activeAdults.length + ' adults)' +
      (clockedOutList.length > 0 ? ' &bull; <strong>' + clockedOutList.length + '</strong> clocked out this session' : '') +
      (stale.length > 0 ? ' &bull; <strong style="color:#CC0000">' + stale.length + '</strong> stale' : '');
  }

  function fmtTs(j){
    if(!j.checkInTimestamp) return j.checkInDate || '—';
    var d = new Date(j.checkInTimestamp);
    var h = d.getHours(), m = d.getMinutes();
    var ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + ':' + String(m).padStart(2,'0') + ' ' + ampm + ', ' + (j.checkInDate || '');
  }

  if(allCI.length === 0){
    el.innerHTML = '<div style="padding:20px;background:var(--gray-50);border-radius:8px;text-align:center;color:var(--gray-400);font-style:italic;margin-bottom:16px">No juniors checked in right now.</div>';
    return;
  }

  var rows = allCI.slice().sort(function(a,b){
    var aStale = a.checkInDate && a.checkInDate !== currentDate ? 1 : 0;
    var bStale = b.checkInDate && b.checkInDate !== currentDate ? 1 : 0;
    if(aStale !== bStale) return aStale - bStale;
    return (a.checkInTimestamp||0) - (b.checkInTimestamp||0);
  }).map(function(j){
    var status = getJuniorStatus(j);
    var isClockedOut = clockedOut[j.id];
    var isStale = j.checkInDate && j.checkInDate !== currentDate;
    var statusLabel = {
      'checked-in':  '<span style="color:#4A90D9">&#9679; Checked In</span>',
      'assigned':    '<span style="color:#F0C040">&#9632; Assigned</span>',
      'on-shift':    '<span style="color:#5CDB95;font-weight:700">&#9650; Out on Shift</span>',
      'checked-out': '<span style="color:#999">&#10003; Clocked Out</span>',
    }[status] || '<span style="color:#999">' + status + '</span>';
    var rowStyle = isStale ? 'background:#FFF5F5;' : isClockedOut ? 'opacity:.55;' : '';
    return '<tr style="' + rowStyle + '">' +
      '<td style="padding:8px 12px;font-weight:600">' + j.name + (isStale ? ' <span style="font-size:10px;color:#CC0000;font-weight:700">STALE</span>' : '') + '</td>' +
      '<td style="padding:8px 12px;color:#667788">' + (j.checkInShift||'—') + '</td>' +
      '<td style="padding:8px 12px">' + fmtTs(j) + '</td>' +
      '<td style="padding:8px 12px">' + statusLabel + '</td>' +
      '<td style="padding:8px 12px">' + (j.assignment||'—') + '</td>' +
      '<td style="padding:8px 12px;text-align:right">' +
        (!isClockedOut ?
          '<button class="btn btn-sm btn-danger" onclick="adminClockOut(\''+ j.id +'\')">Clock Out</button>' :
          '<button class="btn btn-sm" style="color:#999;border-color:#ccc" onclick="adminUndoClockOut(\''+ j.id +'\')">Undo</button>'
        ) +
      '</td>' +
    '</tr>';
  }).join('');

  // Build adult rows
  var adultRows = activeAdults.map(function(a){
    return '<tr style="background:#FFF8F0">' +
      '<td style="padding:8px 12px;font-weight:600">' + a.name + ' <span style="font-size:10px;background:var(--orange);color:#fff;padding:1px 5px;border-radius:8px">Adult</span></td>' +
      '<td style="padding:8px 12px;color:#667788">' + (a.clockInShift||'—') + '</td>' +
      '<td style="padding:8px 12px">' + (a.clockInTime||'—') + '</td>' +
      '<td style="padding:8px 12px"><span style="color:var(--orange)">&#9679; On Shift</span></td>' +
      '<td style="padding:8px 12px">—</td>' +
      '<td style="padding:8px 12px;text-align:right">' +
        '<button class="btn btn-sm btn-danger" onclick="adultClockOut(\''+ a.id +'\')" style="font-size:11px">Clock Out</button>' +
      '</td>' +
    '</tr>';
  }).join('');

  el.innerHTML = '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px">' +
    '<thead><tr style="background:var(--navy);color:#fff;font-size:11px;text-transform:uppercase;letter-spacing:.07em">' +
      '<th style="padding:8px 12px;text-align:left;font-weight:600">Name</th>' +
      '<th style="padding:8px 12px;text-align:left;font-weight:600">Shift</th>' +
      '<th style="padding:8px 12px;text-align:left;font-weight:600">Checked In At</th>' +
      '<th style="padding:8px 12px;text-align:left;font-weight:600">Status</th>' +
      '<th style="padding:8px 12px;text-align:left;font-weight:600">Assignment</th>' +
      '<th style="padding:8px 12px;text-align:right;font-weight:600">Action</th>' +
    '</tr></thead>' +
    '<tbody>' + adultRows + rows + '</tbody>' +
  '</table></div>';
}

// Toggle the quick check-in roster drawer
function toggleCIRoster(){
  var body = document.getElementById('ci-roster-body');
  var icon = document.getElementById('ci-roster-toggle-icon');
  if(!body) return;
  var isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : 'block';
  if(icon) icon.textContent = isOpen ? 'tap to expand' : 'tap to collapse';
}

// Re-render just the roster rows based on current search input (avoids full re-render)
function renderCIRosterRows(){
  var searchEl = document.getElementById('ci-roster-search');
  var rowsEl   = document.getElementById('ci-roster-rows');
  if(!searchEl || !rowsEl) return;
  var q = searchEl.value.toLowerCase();
  var notCI = juniors.filter(function(j){
    return !j.inactive && !j.checkedIn;
  }).slice().sort(function(a,b){ return a.name.localeCompare(b.name); });
  var filtered = q ? notCI.filter(function(j){ return j.name.toLowerCase().indexOf(q) >= 0; }) : notCI;
  if(filtered.length === 0){
    rowsEl.innerHTML = '<div style="text-align:center;color:var(--gray-400);font-style:italic;padding:12px">' + (q ? 'No matches.' : 'All juniors are already checked in.') + '</div>';
    return;
  }
  var rows = filtered.map(function(j){
    return '<tr>' +
      '<td style="padding:6px 10px;font-size:13px;font-weight:500">' + j.name + '</td>' +
      '<td style="padding:6px 10px;font-size:11px;color:#667788">' + (j.title||'').replace('Junior ','') + '</td>' +
      '<td style="padding:6px 10px;text-align:right">' +
        '<button class="btn btn-sm" style="background:var(--navy);color:#fff;border-color:var(--navy);padding:4px 12px" ' +
        'onclick="quickCheckIn(\''+ j.id +'\')">&#43; Check In</button>' +
      '</td>' +
    '</tr>';
  }).join('');
  rowsEl.innerHTML = '<table style="width:100%;border-collapse:collapse"><tbody>' + rows + '</tbody></table>';
}

// One-click check-in from the roster — no hat, no notes, uses current shift window
function quickCheckIn(jid){
  var jr = juniors.find(function(j){ return j.id === jid; });
  if(!jr) return;
  if(jr.checkedIn){ showAlert(jr.name + ' is already checked in.', 'info'); return; }
  checkInOrder++;
  jr.checkedIn        = true;
  jr.order            = checkInOrder;
  jr.hasHat           = false;
  jr.notes            = '';
  var ciShiftEl = document.getElementById('ci-roster-shift');
  jr.checkInShift = (ciShiftEl ? ciShiftEl.value : null) || getShiftFromTime(getSimTime()) || currentShift;
  jr.checkInDate      = currentDate;
  jr.checkInTimestamp = getSimTime().getTime();
  // Clear any previous assignment/clock-out state
  jr.assignment       = null;
  clockedOut[jr.id]   = false;
  delete clockedOut[jr.id];
  dirtyJuniors.add(jr.id);
  _lastSavedHash = '';
  saveStateNow();
  showAlert(jr.name + ' checked in for ' + jr.checkInShift + '.', 'success');
  // Refresh the check-in table and roster rows without collapsing the drawer
  renderCheckinsTable();
  renderCIRosterRows();
  renderOfficer();
  renderBoard();
}

function toggleCIAdultRoster(){
  var body = document.getElementById('ci-adult-roster-body');
  var icon = document.getElementById('ci-adult-roster-toggle-icon');
  if(!body) return;
  var open = body.style.display !== 'none';
  body.style.display = open ? 'none' : 'block';
  if(icon) icon.textContent = open ? 'tap to expand' : 'tap to collapse';
}

function renderCIAdultRosterRows(){
  var rowsEl = document.getElementById('ci-adult-roster-rows');
  if(!rowsEl) return;
  var searchEl = document.getElementById('ci-adult-roster-search');
  var q = searchEl ? (searchEl.value||'').toLowerCase() : '';
  var notCIAdults = (adults||[]).filter(function(a){ return !a.inactive && !a.clockedIn; })
    .slice().sort(function(a,b){ return a.name.localeCompare(b.name); });
  var filtered = q ? notCIAdults.filter(function(a){ return a.name.toLowerCase().indexOf(q) >= 0; }) : notCIAdults;
  if(!filtered.length){
    rowsEl.innerHTML = '<div style="text-align:center;color:var(--gray-400);font-style:italic;padding:12px">All adults are already checked in.</div>';
    return;
  }
  rowsEl.innerHTML = '<table style="width:100%;border-collapse:collapse"><tbody>' +
    filtered.map(function(a){
      return '<tr>' +
        '<td style="padding:6px 10px;font-size:13px;font-weight:500">' + a.name + '</td>' +
        '<td style="padding:6px 10px;font-size:11px;color:#667788">' + (a.title||'') + '</td>' +
        '<td style="padding:6px 10px;text-align:right">' +
          '<button class="btn btn-sm" style="background:var(--orange);color:#fff;border-color:var(--orange);padding:4px 12px" ' +
          'onclick="quickAdultCheckIn(\'' + a.id + '\')">&#43; Check In</button>' +
        '</td></tr>';
    }).join('') +
  '</tbody></table>';
}

function quickAdultCheckIn(adultId){
  var ad = adults.find(function(a){ return a.id === adultId; });
  if(!ad) return;
  if(ad.clockedIn){ showAlert(ad.name + ' is already checked in.', 'info'); return; }
  var now = getSimTime();
  var h = now.getHours();
  var adultShift = (h >= 7 && h < 14) ? '8am-2pm' : (h >= 13 && h < 20) ? '2pm-8pm' : null;
  if(!adultShift) adultShift = '8am-2pm'; // fallback
  var nowStr = now.toLocaleTimeString('en-US', {hour:'numeric', minute:'2-digit'});
  ad.clockedIn = true;
  ad.clockInTime = nowStr;
  ad.clockInShift = adultShift;
  ad.clockInDate = currentDate;
  if(!Array.isArray(ad.shiftLog)) ad.shiftLog = [];
  ad.shiftLog.push({shift: adultShift, in: nowStr, out: null, date: currentDate});
  saveStateNow();
  showAlert(ad.name + ' checked in for ' + adultShift + ' shift.', 'success');
  // Update table and adult roster rows without collapsing the accordion
  renderCheckinsTable();
  renderCIAdultRosterRows();
  renderOfficer();
}

function adminClockOut(jid){
  var jr = juniors.find(function(j){ return j.id === jid; });
  if(!jr) return;
  if(!confirm('Clock out ' + jr.name + '? This will remove them from the queue and any assignment.')) return;
  // Must set checkedIn false so Neon stores them as not checked in — otherwise
  // a page refresh pulls checkedIn:true back and they reappear on the tab.
  jr.checkedIn = false;
  clockedOut[jr.id] = true;
  if(!clockedOutShifts[jr.id]) clockedOutShifts[jr.id] = {};
  clockedOutShifts[jr.id][getJrActiveShift(jr)] = true;
  jr.assignment = null;
  onShiftJuniors.delete(jr.id);
  onShiftJuniors.delete(String(jr.id));
  dirtyJuniors.add(jr.id);
  _lastSavedHash = '';
  saveStateNow();
  renderCheckinsTable();
  renderOfficer();
  renderBoard();
}

function adminUndoClockOut(jid){
  var jr = juniors.find(function(j){ return j.id === jid; });
  if(!jr) return;
  jr.checkedIn = true;
  clockedOut[jr.id] = false;
  delete clockedOut[jr.id];
  dirtyJuniors.add(jr.id);
  _lastSavedHash = '';
  saveStateNow();
  renderCheckinsTable();
  renderOfficer();
  renderBoard();
}



function renderRoster(){
  var q = (document.getElementById('r-search').value || '').toLowerCase();
  var f = document.getElementById('r-filter').value;
  var aoCount = juniors.filter(function(j){ return j.ageout; }).length;

  if(f === 'adult'){
    var al = adults.filter(function(a){
      return !a.inactive && (!q || a.name.toLowerCase().includes(q) || a.id.includes(q) || (a.title||'').toLowerCase().includes(q));
    });
    document.getElementById('r-count').innerHTML = al.length + ' adult members';
    var PERM_LABELS = { admin:'Admin', 'vc-slt':'VC/SLT', officer:'Shift Officer', scheduling:'Scheduler' };
    document.getElementById('r-body').innerHTML = al.map(function(a){
      var permBadge = a.permission
        ? '<span class="badge" style="background:#D4EDDA;color:#155724;font-size:9px;margin-left:4px">' + (PERM_LABELS[a.permission]||a.permission) + '</span>'
        : '';
      var reportIcon = '';
      var contact = '<div style="font-size:11px">' +
        (a.phone ? '<div>&#128222; ' + a.phone + '</div>' : '') +
        (a.email ? '<div style="color:#4A6CF7">' + a.email + '</div>' : '') +
        '</div>';
      // Last worked: find most recent shiftLog entry
      var lastWorked = '—';
      if(Array.isArray(a.shiftLog) && a.shiftLog.length){
        var last = a.shiftLog[a.shiftLog.length - 1];
        if(last && last.date){
          var ampm = (last.shift||'').indexOf('2pm') >= 0 ? 'PM' : 'AM';
          lastWorked = last.date + ' ' + ampm;
        }
      }
      return '<tr>' +
        '<td style="font-size:11px;color:var(--gray-400)">' + a.id + '</td>' +
        '<td style="font-weight:600;color:var(--navy)">' + a.name + permBadge + reportIcon + '</td>' +
        '<td><span class="badge" style="background:var(--navy-lt);color:var(--navy);font-size:9px">' + (a.title||'') + '</span></td>' +
        '<td>' + contact + '</td>' +
        '<td style="font-size:12px;color:var(--gray-400)">' + lastWorked + '</td>' +
        '<td colspan="2"></td>' +
        '<td></td></tr>';
    }).join('');
    return;
  }

  var list = juniors.slice().sort(function(a,b){ return a.name.localeCompare(b.name); });
  if(f === 'inactive'){
    list = list.filter(function(j){ return j.inactive; });
  } else if(f === 'ageout'){
    list = list.filter(function(j){ return j.ageout && !j.inactive; });
  } else {
    // Default: hide inactive members from all active views
    list = list.filter(function(j){ return !j.inactive; });
  }
  if(q) list = list.filter(function(j){ return j.name.toLowerCase().includes(q) || j.id.includes(q) || (j.phone && j.phone.includes(q)) || (j.email && j.email.toLowerCase().includes(q)); });

  var countLabel = list.length + ' junior' + (list.length !== 1 ? 's' : '');
  if(f === 'inactive') countLabel += ' (inactive)';
  else if(f === 'ageout') countLabel += ' (age-outs)';
  else countLabel += ' &bull; ' + aoCount + ' age-outs total';
  document.getElementById('r-count').innerHTML = countLabel;

  document.getElementById('r-body').innerHTML = list.map(function(j){
    var ri = juniors.indexOf(j);

    // Contact info
    var contact = '';
    if(j.phone || j.email){
      contact = '<div style="font-size:11px;line-height:1.5">' +
        (j.phone ? '<div>' + j.phone + '</div>' : '') +
        (j.email ? '<div style="color:#4A6CF7">' + j.email + '</div>' : '') +
        '</div>';
    } else {
      contact = '<div style="font-size:11px;color:var(--gray-400);font-style:italic">No contact info</div>';
    }
    // Display contact read-only — edits via roster upload only
    if(j.phone || j.email){
      contact = '<div style="font-size:11px;line-height:1.6">' +
        (j.phone ? '<div>&#128222; ' + j.phone + '</div>' : '') +
        (j.email ? '<div style="color:#4A6CF7">&#9993; ' + j.email + '</div>' : '') +
        '</div>';
    }

    // Shift log — shiftLog: [{date, shift, committee}]
    var log = j.shiftLog || [];
    var logHtml = '';
    if(log.length === 0){
      logHtml = '<span style="font-size:11px;color:var(--gray-200)">No shifts yet</span>';
    } else {
      // Group by date
      var byDate = {};
      log.forEach(function(e){ if(!byDate[e.date]) byDate[e.date]=[]; byDate[e.date].push(e); });
      logHtml = '<div style="font-size:10px;line-height:1.6;max-height:60px;overflow-y:auto">' +
        Object.keys(byDate).sort().slice(-5).map(function(d){
          return '<div><span style="color:var(--gray-400)">' + fmtDate(d) + ':</span> ' +
            byDate[d].map(function(e){ return e.committee + ' (' + SL[e.shift] + ')'; }).join(', ') +
          '</div>';
        }).join('') +
        (Object.keys(byDate).length > 5 ? '<div style="color:var(--gray-400)">+' + (Object.keys(byDate).length-5) + ' more dates</div>' : '') +
      '</div>';
    }

    // Committees visited (for variety tracking)
    var committees = log.map(function(e){ return e.committee; });
    var uniqueCount = [...new Set(committees)].length;
    if(uniqueCount > 0){
      logHtml += '<div style="font-size:10px;color:var(--orange);margin-top:2px">' + uniqueCount + ' unique committee' + (uniqueCount!==1?'s':'') + ' &bull; ' + log.length + ' total shift' + (log.length!==1?'s':'') + '</div>';
    }

    return '<tr class="' + (j.ageout ? 'ao-row' : '') + '">' +
      '<td style="font-size:11px;color:var(--gray-400)">' + j.id + '</td>' +
      '<td style="font-weight:600;color:var(--navy)">' +
        (j.ageout ? '<span style="color:#F5A623;margin-right:3px">&#11088;</span>' : '') +
        '<span style="cursor:pointer" title="View activity log" onclick="openNoteLog(' + ri + ')">' + j.name + ' <span style="font-size:10px;color:var(--orange)"><img src="assets/edit.png" style="width:13px;height:13px;vertical-align:middle"></span></span>' +

      '</td>' +
      '<td><span class="badge b-title" style="font-size:9px">' + j.title.replace('Junior ', '') + '</span></td>' +
      '<td>' + contact + '</td>' +
      '<td style="font-size:12px">' + j.last + '</td>' +
      '<td>' + logHtml + '</td>' +
      '<td style="text-align:center">' +
        '<label style="display:flex;align-items:center;justify-content:center;gap:5px;cursor:pointer">' +
          '<input type="checkbox" ' + (j.ageout ? 'checked' : '') + ' onchange="juniors[' + ri + '].ageout=this.checked;renderRoster()">' +
          (j.ageout ? '<span class="badge b-ageout" style="font-size:9px">Yes</span>' : '<span style="font-size:11px;color:var(--gray-200)">No</span>') +
        '</label>' +
      '</td>' +
      '<td><button class="btn btn-sm btn-danger" onclick="if(confirm(\'Remove ' + j.name + '?\'))juniors.splice(' + ri + ',1),renderRoster()">&#x2715;</button></td>' +
    '</tr>';
  }).join('');
}

function addJunior(){
  juniors.push({id:'', name:'New Junior', title:'Junior', last:'None', history:[], ageout:false, checkedIn:false, assignment:null, prevLast:null, order:0, hasHat:false, notes:''});
  renderRoster();
}

// ============================================================
// COMMITTEE LIBRARY
// ============================================================
function renderLibrary(search){
  var q = search ? search.toLowerCase() : '';
  var list = committeeLibrary.filter(function(c){ return !q || c.name.toLowerCase().includes(q); });
  document.getElementById('lib-count').textContent = list.length + ' committees';
  document.getElementById('lib-body').innerHTML = list.map(function(c){
    var ri = committeeLibrary.indexOf(c);
    var defShift = c.shifts.length > 0 ? c.shifts[0].shift : '12pm';
    var defCap = c.shifts.length > 0 ? c.shifts[0].cap : 4;
    return '<div class="lib-row">' +
      '<div style="display:flex;align-items:center;gap:6px">' +
        (c.all20 ? '<span class="badge b-all20">All 20</span>' : '') +
        '<input class="finput" style="font-size:12px;padding:4px 7px" value="' + c.name + '" onchange="committeeLibrary[' + ri + '].name=this.value;renderSetup()">' +
      '</div>' +
      '<input class="finput" type="number" min="1" max="40" style="font-size:12px;padding:4px 7px" value="' + defCap + '" onchange="committeeLibrary[' + ri + '].shifts[0].cap=parseInt(this.value)||1">' +
      '<select class="finput" style="font-size:12px;padding:4px 7px" onchange="committeeLibrary[' + ri + '].shifts[0].shift=this.value;renderSetup()">' +
        ['8am','12pm','4pm'].map(function(s){ return '<option value="' + s + '"' + (defShift === s ? ' selected' : '') + '>' + SL[s] + '</option>'; }).join('') +
      '</select>' +
      '<label style="font-size:12px;display:flex;align-items:center;gap:4px;color:#667788;justify-content:center"><input type="checkbox" ' + (c.hat ? 'checked' : '') + ' onchange="committeeLibrary[' + ri + '].hat=this.checked"> Yes</label>' +
      '<button class="btn btn-sm btn-danger" onclick="committeeLibrary.splice(' + ri + ',1);renderLibrary()">Remove</button>' +
    '</div>';
  }).join('');
}

function addLibCommittee(){
  committeeLibrary.push({id: Date.now(), name:'New Committee', hat:false, all20:false, shifts:[{shift:'12pm',cap:4}]});
  renderLibrary();
}

// ============================================================
// SHIFT SETUP
// ============================================================
function bulkAddShift(shift, silent){
  var date = document.getElementById('setup-date') ? document.getElementById('setup-date').value : '';
  var toAdd = [];
  if(date && SCHEDULE_2026[date]){
    toAdd = SCHEDULE_2026[date].filter(function(s){ return s.shift === shift; });
  } else if(!date){
    if(!silent) document.getElementById('bulk-result').textContent = 'Please select a show date first.';
    return 0;
  }
  committeeRequests.filter(function(r){ return r.status==='approved'; }).forEach(function(r){
    r.shifts.forEach(function(s){
      if(s.preshow){
        // Pre-show: map startTime to nearest standard shift slot
        if(s.date !== date) return;
        var psShift = '8am';
        if(s.startTime){
          var hr = parseInt(s.startTime);
          var isPM = s.startTime.indexOf('PM') >= 0;
          if(isPM && hr !== 12) hr += 12;
          if(hr >= 16) psShift = '4pm';
          else if(hr >= 12) psShift = '12pm';
          else psShift = '8am';
        }
        if(psShift !== shift) return;
        var slotName = r.name + (s.startTime ? ' (' + s.startTime + '–' + s.endTime + ')' : '');
        toAdd.push({name:slotName, shift:shift, cap:s.cap, hat:r.hat, liaison:r.liaison||'', liaisonPhone:r.liaisonPhone||'', liaisonEmail:r.liaisonEmail||'', chair:r.chair||'', chairPhone:r.chairPhone||'', location:r.location||'', duties:r.duties||'', notes:r.notes||''});
      } else {
        if(s.shift !== shift) return;
        // Match specific-date requests OR all-show requests (all20:true)
        if(s.date === date || s.all20){
          toAdd.push({name:r.name, shift:shift, cap:s.cap, hat:r.hat, liaison:r.liaison||'', liaisonPhone:r.liaisonPhone||'', liaisonEmail:r.liaisonEmail||'', chair:r.chair||'', chairPhone:r.chairPhone||'', location:r.location||'', duties:r.duties||'', notes:r.notes||''});
        }
      }
    });
  });
  var added = 0, skipped = 0;
  toAdd.forEach(function(c){
    var alreadyHas = activeSlots.some(function(s){ return s.name === c.name && s.shift === shift; });
    if(alreadyHas){ skipped++; return; }
    activeSlots.push({id:Date.now() + Math.random(), name:c.name, capacity:c.cap, shift:shift, hat:c.hat, assigned:[], liaison:c.liaison||'', liaisonPhone:c.liaisonPhone||'', liaisonEmail:c.liaisonEmail||'', chair:c.chair||'', chairPhone:c.chairPhone||'', location:c.location||'', duties:c.duties||'', notes:c.notes||''});
    added++;
  });
  if(!silent){
    var msg = '';
    if(added > 0) msg += added + ' committee' + (added !== 1 ? 's' : '') + ' added for ' + SL[shift] + '.';
    if(skipped > 0) msg += ' ' + skipped + ' already added, skipped.';
    if(added === 0 && skipped === 0) msg = 'No ' + SL[shift] + ' slots found for this date.';
    document.getElementById('bulk-result').textContent = msg;
    onSetupDateChange();
    renderSetup();
  }
  return added;
}

function bulkAddAllShifts(){
  var date = document.getElementById('setup-date') ? document.getElementById('setup-date').value : '';
  if(!date){ document.getElementById('bulk-result').textContent = 'Please select a show date first.'; return; }
  var total = 0;
  ['8am','12pm','4pm'].forEach(function(shift){ total += bulkAddShift(shift, true); });
  var msg = total + ' committee slot' + (total !== 1 ? 's' : '') + ' added for ' + fmtDateLong(date) + '.';
  document.getElementById('bulk-result').textContent = msg;
  onSetupDateChange();
  renderSetup();
}

function clearAllSlots(){
  if(activeSlots.some(function(s){ return s.assigned.length > 0; })){
    if(!confirm('Some slots already have juniors assigned. Clear everything?')) return;
  }
  activeSlots = [];
  // Also clear assignments on juniors
  juniors.forEach(function(j){ j.assignment = null; j.prevLast = null; });
  document.getElementById('bulk-result').textContent = 'All slots cleared.';
  saveState();
  renderSetup();
}

function initSetupDatePicker(){
  var sel = document.getElementById('setup-date');
  if(!sel) return;
  var current = sel.value; // preserve selected date before rebuild
  sel.innerHTML = '<option value="">-- Select a date --</option>';

  // ── 2026 show dates ───────────────────────────────────────────────────
  var optgroup2026 = document.createElement('optgroup');
  optgroup2026.label = '2026 Show — March 2–21';
  Object.keys(SCHEDULE_2026).sort().forEach(function(d){
    var opt = document.createElement('option');
    opt.value = d;
    opt.textContent = fmtDateLong(d);
    optgroup2026.appendChild(opt);
  });
  sel.appendChild(optgroup2026);

  // ── Pre-Show 2027 — any date after 2026 show and before 2027 show ─────
  var preShowDates = {};

  // Include hardcoded SCHEDULE_2026 dates that are outside the 2026 show window
  Object.keys(SCHEDULE_2026).forEach(function(d){
    if(!isShow2026Date(d) || (function(){
      var dt = new Date(d + 'T00:00:00');
      // Outside 2026 show (March 2-21): after 2026-03-21 or before 2026-03-02
      return dt > new Date('2026-03-21T23:59:59');
    })()){
      var dt = new Date(d + 'T00:00:00');
      var in2027Show = dt.getFullYear() === 2027 && dt.getMonth() === 2 && dt.getDate() >= 2 && dt.getDate() <= 20;
      if(!in2027Show) preShowDates[d] = true;
    }
  });

  // Also include approved requests not in 2026 show or 2027 show
  var show2026Keys = Object.keys(SCHEDULE_2026);
  committeeRequests.filter(function(r){ return r.status==='approved'; }).forEach(function(r){
    r.shifts.forEach(function(s){
      if(!s.date) return;
      var in2026Show = show2026Keys.indexOf(s.date) >= 0;
      var in2027Show = (function(){
        var dt = new Date(s.date + 'T00:00:00');
        return dt.getFullYear() === 2027 && dt.getMonth() === 2 && dt.getDate() >= 2 && dt.getDate() <= 20;
      })();
      if(!in2026Show && !in2027Show) preShowDates[s.date] = true;
    });
  });

  var psDates = Object.keys(preShowDates).sort();
  if(psDates.length){
    var optgroupPS = document.createElement('optgroup');
    optgroupPS.label = 'Pre-Show 2027';
    psDates.forEach(function(d){
      var opt = document.createElement('option');
      opt.value = d;
      opt.textContent = fmtDateLong(d) + (SCHEDULE_2026[d] ? '' : ' ✓');
      optgroupPS.appendChild(opt);
    });
    sel.appendChild(optgroupPS);
  }

  // ── 2027 show dates (March 2-20 always shown) ─────────────────────────
  var allDates2027 = {};
  for(var d = 0; d < 19; d++){
    var dt = new Date(Date.UTC(2027, 2, 2 + d));
    var key = '2027-' + String(dt.getUTCMonth()+1).padStart(2,'0') + '-' + String(dt.getUTCDate()).padStart(2,'0');
    allDates2027[key] = true;
  }
  // Approved 2027 requests outside March 2-20 still go here
  committeeRequests.filter(function(r){ return r.status==='approved'; }).forEach(function(r){
    r.shifts.forEach(function(s){
      if(s.date && s.date.startsWith('2027') && !isShow2026Date(s.date)) allDates2027[s.date] = true;
    });
  });
  var requestedDates2027 = {};
  committeeRequests.filter(function(r){ return r.status==='approved'; }).forEach(function(r){
    r.shifts.forEach(function(s){ if(s.date && s.date.startsWith('2027')) requestedDates2027[s.date] = true; });
  });
  var optgroup2027 = document.createElement('optgroup');
  optgroup2027.label = '2027 Show — March 2–20';
  Object.keys(allDates2027).sort().forEach(function(d){
    var opt = document.createElement('option');
    opt.value = d;
    var hasReq = !!requestedDates2027[d];
    opt.textContent = fmtDateLong(d) + (hasReq ? ' ✓' : '');
    if(!hasReq) opt.style.color = '#AAAAAA';
    optgroup2027.appendChild(opt);
  });
  sel.appendChild(optgroup2027);

  // Restore previously selected date
  if(current) sel.value = current;
}

function isShow2026Date(d){ return !!SCHEDULE_2026[d]; }


function fmtDateLong(dateStr){
  if(!dateStr) return '';
  var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  var months = ['','January','February','March','April','May','June','July','August','September','October','November','December'];
  var parts = dateStr.split('-');
  var d = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
  return days[d.getDay()] + ', ' + months[parseInt(parts[1])] + ' ' + parseInt(parts[2]) + ', ' + parts[0];
}

function setSlotCapacity(idx, val){ return setSlotCapacityById(idx, val, null); } // legacy

function setSlotCapacityById(slotId, val, inputEl){
  var n = parseInt(val);
  if(isNaN(n) || n <= 0){
    // Delete the slot
    activeSlots = activeSlots.filter(function(s){ return String(s.id) !== String(slotId); });
    renderSetup();
    saveState();
    return 0;
  }
  if(n === 1) n = 2; // minimum 2
  var sl = activeSlots.find(function(s){ return String(s.id) === String(slotId); });
  if(sl){
    sl.capacity = n;
    if(inputEl) inputEl.value = n; // update input to show corrected value
  }
  saveState();
  return n;
  // Restore previously selected date if still valid
  if(current) sel.value = current;
}

function onSetupDateChange(){
  var date = document.getElementById('setup-date').value;
  var prevSetupDate = (window._setupDate || '');
  window._setupDate = date || prevSetupDate;


  // Clear active slots when date changes
  // Clear active slots when setup date changes
  if(date && date !== prevSetupDate && activeSlots.length > 0){
    var hasAssigned = juniors.some(function(j){ return j.assignment; });
    if(hasAssigned){
      if(!confirm('Changing the date will clear all current slots and assignments. Continue?')) {
        document.getElementById('setup-date').value = prevSetupDate;
        window._setupDate = prevSetupDate;
        return;
      }
    }
    activeSlots = [];
    juniors.forEach(function(j){ j.assignment = null; });
    var brEl = document.getElementById('bulk-result'); if(brEl) brEl.textContent = '';
  }
  // Auto-load slots for this date — clears stale slots from other dates
  if(date && date !== prevSetupDate){
    currentDate = date;
    _loadSlotsForDate(date);
    _lastSavedHash = '';
    saveState();
    renderSetupApproved(); // re-render night-before planner for new date
    renderSetup();
  }
  // Note: currentDate updated above; activateShift also updates it
  var prev = document.getElementById('setup-date-slots-preview');
  if(!prev) return;
  if(!date){ prev.style.display='none'; prev.innerHTML=''; return; }

  // Gather all slots for this date
  var slots = SCHEDULE_2026[date] || [];
  // Also pull from approved 2027 requests for this specific date
  committeeRequests.filter(function(r){
    return r.status==='approved' && r.shifts.some(function(s){ return s.date===date || s.all20; });
  }).forEach(function(r){
    r.shifts.filter(function(s){ return s.date===date || s.all20; }).forEach(function(s){
      // avoid duplicates if same committee/shift already in slots
      var exists = slots.some(function(x){ return x.name===r.name && x.shift===s.shift; });
      if(!exists) slots.push({name:r.name, shift:s.shift, cap:s.cap, hat:r.hat, isNew:true});
    });
  });

  if(!slots.length){ prev.style.display='none'; prev.innerHTML=''; return; }

  // Group by shift
  var groups = {'8am':[], '12pm':[], '4pm':[]};
  slots.forEach(function(s){ if(groups[s.shift]) groups[s.shift].push(s); });
  // Sort each group by name
  Object.keys(groups).forEach(function(sh){
    groups[sh].sort(function(a,b){ return a.name.localeCompare(b.name); });
  });

  var totalSlots = slots.length;
  var totalJuniors = slots.reduce(function(a,s){ return a + s.cap; }, 0);

  // Night-before planning: get scheduled counts if set
  var planned8 = parseInt((window._plannedJuniors||{})['8am'])||0;
  var planned12 = parseInt((window._plannedJuniors||{})['12pm'])||0;
  var planned4 = parseInt((window._plannedJuniors||{})['4pm'])||0;

  var html = '<div class="shift-preview">';
  html += '<div class="shift-preview-header">' +
    '<div>' +
      '<div class="shift-preview-title">' + fmtDateLong(date) + '</div>' +
      '<div class="shift-preview-count">' + totalSlots + ' committee slots &bull; ' + totalJuniors + ' junior spots requested</div>' +
    '</div>' +
    '<button class="btn btn-sm" style="background:var(--navy);color:#fff;border-color:var(--navy);font-size:12px" onclick="loadAllPreviewSlotsForDate()">&#43; Load All to Dashboard</button>' +
  '</div>';

  // Night-before planner
  html += '<div id="nbp-section" style="background:#F8F9FA;border-radius:8px;padding:12px;margin-bottom:12px">' +
    '<div style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:8px">&#128196; Night-Before Planner — How many juniors scheduled?</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:8px;align-items:flex-end">' +
    ['8am','12pm','4pm'].map(function(sh){
      var v = (window._plannedJuniors||{})[sh] || '';
      return '<div><div style="font-size:11px;color:#667788;margin-bottom:3px">' + SL[sh] + '</div>' +
        '<input type="number" class="finput" style="font-size:12px" placeholder="# juniors" value="' + v + '" ' +
        'oninput="if(!window._plannedJuniors)window._plannedJuniors={};window._plannedJuniors[\'' + sh + '\']=this.value;if(window._nbpTimer)clearTimeout(window._nbpTimer);window._nbpTimer=setTimeout(onSetupDateChange,600)" min="0" max="500"></div>';
    }).join('') +
    '<button class="btn btn-sm" style="background:var(--navy);color:#fff;border-color:var(--navy)" onclick="onSetupDateChange()">&#9654; Preview Fill</button>' +
    '</div>' +
  '</div>';

  // Pre-compute distribution estimates for all shifts using no-solo-aware logic
  window._nbpEstimates = {};
  ['8am','12pm','4pm'].forEach(function(sh){
    var list = groups[sh];
    var planned = parseInt((window._plannedJuniors||{})[sh])||0;
    if(!planned || !list.length){ window._nbpEstimates[sh] = {}; return; }
    // Simulate distribution: assign minimum 2 to each slot first, then fill remaining
    var slots = list.map(function(s){ return {name:s.name, cap:s.cap, assigned:0}; });
    var remaining = planned;
    // Pass 1: give each slot min(2, cap) — guarantees no solo
    slots.forEach(function(sl){
      if(remaining <= 0) return;
      var give = Math.min(2, sl.cap, remaining);
      // Don't put 1 person in a cap-2 slot if that's all we can spare and others need filling
      sl.assigned += give;
      remaining -= give;
    });
    // Pass 2: fill remaining capacity round-robin style (everyone gets 2 before anyone gets 3rd etc)
    var pass = 3;
    while(remaining > 0 && pass <= 100){
      var placed = false;
      slots.forEach(function(sl){
        if(remaining <= 0) return;
        if(sl.assigned < pass && sl.assigned < sl.cap){
          sl.assigned++;
          remaining--;
          placed = true;
        }
      });
      if(!placed) break;
      pass++;
    }
    // No-solo rule: any slot with exactly 1 gets zeroed out.
    // That freed junior goes to the slot with the most room (closest to full).
    slots.forEach(function(sl){
      if(sl.assigned === 1){
        sl.assigned = 0; // can't send 1 alone
        // Give the freed junior to the slot with highest current fill that isn't at cap
        var best = null;
        slots.forEach(function(s){
          if(s.assigned < s.cap && s.assigned > 0 && (!best || s.assigned > best.assigned)) best = s;
        });
        // If no partially-filled slot, give to any slot under cap
        if(!best) slots.forEach(function(s){ if(!best && s.assigned < s.cap) best = s; });
        if(best) best.assigned++;
      }
    });
    var est = {};
    slots.forEach(function(sl){ est[sl.name] = sl.assigned; });
    window._nbpEstimates[sh] = est;
  });

  ['8am','12pm','4pm'].forEach(function(sh){
    var list = groups[sh];
    if(!list.length) return;
    var shJuniors = list.reduce(function(a,s){ return a + s.cap; }, 0);
    var planned = parseInt((window._plannedJuniors||{})[sh])||0;

    html += '<div class="shift-block">';
    html += '<div class="shift-block-header">' +
      '<div>' +
        '<span class="shift-block-title">' + SL[sh] + '</span>' +
        '<span class="shift-block-meta" style="margin-left:8px">' + list.length + ' committees &bull; ' + shJuniors + ' spots</span>' +
        (planned > 0 ? '<span style="margin-left:8px;font-size:11px;font-weight:700;color:' + (planned >= shJuniors ? '#155724' : '#856404') + '">' +
          planned + ' scheduled / ' + shJuniors + ' needed' +
          (planned >= shJuniors ? ' &#10003;' : ' &#9888;') + '</span>' : '') +
      '</div>' +
    '</div>';

    list.forEach(function(s, si){
      var isAdded = activeSlots.some(function(a){ return a.name===s.name && a.shift===sh; });
      var rowKey = 'prev-' + sh + '-' + si;
      var cd = CD[s.name] || {};
      // Fill ratio when planned count set — simulate actual distribution with no-solo rule
      var fillRatio = '';
      if(planned > 0){
        var est = window._nbpEstimates && window._nbpEstimates[sh] ? (window._nbpEstimates[sh][s.name] || 0) : 0;
        var fillColor = est >= s.cap ? '#155724' : est === 0 ? '#CC0000' : est === 1 ? '#CC0000' : '#856404';
        var fillLabel = est + '/' + s.cap;
        if(est === 1) fillLabel += ' ⚠solo';
        fillRatio = '<span style="font-size:11px;font-weight:700;color:' + fillColor + ';margin-left:8px">' + fillLabel + '</span>';
      }
      // Editable cap
      var capKey = 'prevcap_' + sh + '_' + si;
      window._ps = window._ps || {};
      window._ps[capKey] = {name:s.name, shift:sh, cap:s.cap, hat:s.hat||false};

      html += '<div class="preview-row' + (isAdded ? ' added' : '') + '" style="display:block;padding:0">';
      // Collapsed header row
      html += '<div style="display:flex;align-items:center;padding:6px 10px;cursor:pointer;gap:8px" onclick="togglePreviewRow(\'' + rowKey + '\')">';
      html += '<span id="' + rowKey + '-icon" style="font-size:10px;color:#99AABB;flex-shrink:0">&#9654;</span>';
      html += '<div style="flex:1;font-weight:500;font-size:13px">' +
        (s.hat ? '<img src="assets/hat.png" style="height:14px;vertical-align:middle;margin-right:4px">' : '') +
        s.name + '</div>';
      html += fillRatio;
      html += '<input type="number" class="finput" style="width:60px;font-size:12px;padding:3px 6px" value="' + s.cap + '" ' +
        'data-pskey="' + capKey + '" onclick="event.stopPropagation()" ' +
        'oninput="event.stopPropagation();(window._ps[\'' + capKey + '\']).cap=parseInt(this.value)||2;if(window._nbpTimer)clearTimeout(window._nbpTimer);window._nbpTimer=setTimeout(onSetupDateChange,600)" min="1" max="40">';
      html += '<span style="font-size:11px;color:#667788">juniors</span>';
      html += (isAdded
        ? '<span style="color:#155724;font-size:11px;font-weight:600">&#10003; Added</span>'
        : '<button class="btn btn-sm" style="font-size:11px;padding:2px 8px" data-k="' + capKey + '" onclick="event.stopPropagation();addSinglePreviewSlotEl(this)">&#43; Add</button>');
      html += '</div>';
      // Expandable details
      html += '<div id="' + rowKey + '-detail" style="display:none;padding:6px 14px 10px 32px;font-size:12px;color:#667788;line-height:1.8;background:#FAFBFC;border-top:1px solid #F0F0F0">';
      if(cd.chair) html += '<div><strong>Chair:</strong> ' + cd.chair + (cd.cp ? ' &bull; ' + cd.cp : '') + '</div>';
      if(cd.liaison) html += '<div><strong>Liaison:</strong> ' + cd.liaison + (cd.lp ? ' &bull; ' + cd.lp : '') + (cd.le ? ' &bull; ' + cd.le : '') + '</div>';
      if(cd.loc) html += '<div><strong>Location:</strong> ' + cd.loc + '</div>';
      if(cd.duties) html += '<div><strong>Duties:</strong> ' + cd.duties + '</div>';
      if(cd.notes) html += '<div><strong>Notes:</strong> ' + cd.notes + '</div>';
      if(!cd.chair && !cd.liaison && !cd.loc) html += '<div style="font-style:italic;color:#AAA">No contact info on file</div>';
      html += '</div>';
      html += '</div>';
    });

    html += '</div>';
  });

  html += '</div>';
  prev.innerHTML = html;
  prev.style.display = 'block';
}

function togglePreviewRow(key){
  var detail = document.getElementById(key + '-detail');
  var icon = document.getElementById(key + '-icon');
  if(!detail) return;
  var open = detail.style.display !== 'none';
  detail.style.display = open ? 'none' : 'block';
  if(icon) icon.innerHTML = open ? '&#9654;' : '&#9660;';
}

function loadAllPreviewSlotsForDate(){
  var date = (document.getElementById('setup-date')||{}).value || currentDate;
  var added = 0;
  var slots = SCHEDULE_2026[date] ? SCHEDULE_2026[date].slice() : [];
  committeeRequests.filter(function(r){
    return r.status==='approved' && !r.virtual &&
      r.shifts && r.shifts.some(function(s){ return !s.virtual && (s.date===date||s.all20); });
  }).forEach(function(r){
    r.shifts.filter(function(s){ return !s.virtual && (s.date===date||s.all20); }).forEach(function(s){
      var ex = slots.some(function(x){ return x.name===r.name && x.shift===(s.shift||'8am'); });
      if(!ex) slots.push({name:r.name, shift:s.shift||'8am', cap:s.cap||2, hat:r.hat||false});
    });
  });
  slots.forEach(function(s){
    var already = activeSlots.some(function(a){ return a.name===s.name && a.shift===s.shift; });
    if(already) return;
    // Check if cap was overridden in the preview
    var capKey = 'prevcap_' + s.shift + '_0'; // approximate — use slot cap
    activeSlots.push({id:Date.now()+Math.random(), name:s.name, capacity:s.cap, shift:s.shift, hat:s.hat||false, assigned:[]});
    added++;
  });
  onSetupDateChange();
  renderSetup();
  showAlert('Loaded ' + added + ' slot' + (added!==1?'s':'') + ' to dashboard.', 'success');
}

function addSinglePreviewSlot(name, shift, cap, hat){
  var already = activeSlots.some(function(s){ return s.name===name && s.shift===shift; });
  if(already) return;
  activeSlots.push({id:Date.now()+Math.random(), name:name, capacity:cap, shift:shift, hat:hat, assigned:[]});
  onSetupDateChange();
  renderSetup();
  renderSetupApproved();
}

function addSinglePreviewSlotEl(btn){
  var name = btn.getAttribute('data-name');
  var shift = btn.getAttribute('data-shift');
  var cap = parseInt(btn.getAttribute('data-cap')) || 4;
  var hat = btn.getAttribute('data-hat') === '1';
  addSinglePreviewSlot(name, shift, cap, hat);
}


// ============================================================
// SHIFT CULLING ENGINE
// ============================================================

// Compute how many show dates each committee appears on per shift
// Returns {committeeName: {shiftKey: count}} across all SCHEDULE_2026 dates
function getCommitteeDateCounts(){
  var counts = {}; // {name: {shift: Set of dates}}
  var allDates = Object.keys(SCHEDULE_2026);
  var showDates = allDates.filter(function(d){ return d.indexOf('2026-03') === 0 || d.indexOf('2026-07') === 0; });
  showDates.forEach(function(date){
    (SCHEDULE_2026[date]||[]).forEach(function(slot){
      if(!counts[slot.name]) counts[slot.name] = {};
      if(!counts[slot.name][slot.shift]) counts[slot.name][slot.shift] = 0;
      counts[slot.name][slot.shift]++;
    });
  });
  return counts;
}

// The culling algorithm — pure function, no side effects
// slots: array of {name, shift, cap, hat, highPriority}
// target: integer — how many juniors we have for this shift
// dateCounts: output of getCommitteeDateCounts()
// totalShowDays: number of show days for threshold
// Returns: {kept: [{name, cap, hat, shift, originalCap, reason}], dropped: [{name, reason}], total: number}
function cullShift(slots, target, dateCounts, totalShowDays){
  if(!slots || slots.length === 0) return {kept:[], dropped:[], total:0};

  var DAILY_THRESHOLD = Math.ceil(totalShowDays * 0.75); // 75%+ of days = daily requester

  // Step 1: Separate high-priority (full requested capacity) from regular
  var priority = slots.filter(function(s){ return s.highPriority; });
  var regular  = slots.filter(function(s){ return !s.highPriority; });

  var priorityTotal = priority.reduce(function(a,s){ return a + s.cap; }, 0);
  var remaining = target - priorityTotal;

  // If we don't even have enough for priority slots, scale them down proportionally
  if(remaining < 0){
    // Scale priority slots down proportionally
    var scale = target / priorityTotal;
    priority = priority.map(function(s){
      return Object.assign({}, s, {cap: Math.max(1, Math.round(s.cap * scale)), originalCap: s.cap, reason: 'scaled — priority overage (not enough juniors for minimum 2 per committee)'});
    });
    // Recalculate
    var newTotal = priority.reduce(function(a,s){ return a + s.cap; }, 0);
    // Trim any remainder
    var diff = newTotal - target;
    for(var i = priority.length-1; i >= 0 && diff > 0; i--){
      var trim = Math.min(diff, priority[i].cap - 1);
      priority[i].cap -= trim;
      diff -= trim;
    }
    return {
      kept: priority.map(function(s){ return Object.assign({}, s, {originalCap: s.originalCap||s.cap}); }),
      dropped: regular.map(function(s){ return {name:s.name, originalCap:s.cap, reason:'insufficient juniors (priority slots consumed all spots)'}; }),
      total: priority.reduce(function(a,s){ return a+s.cap; }, 0)
    };
  }

  // Step 2: Distribute remaining juniors across regular slots using round-robin
  // If not enough for everyone to get 1, eliminate daily requesters first, then smallest-cap committees
  var working = regular.map(function(s){
    var daysActive = (dateCounts[s.name] && dateCounts[s.name][s.shift]) ? dateCounts[s.name][s.shift] : 1;
    var isDaily = daysActive >= DAILY_THRESHOLD;
    return {name:s.name, originalCap:s.cap, cap:s.cap, hat:s.hat, shift:s.shift,
            highPriority:false, isDaily:isDaily, daysActive:daysActive, allocated:0, dropped:false};
  });

  // Minimum allocation is 2 — we never send 1 junior alone.
  // If we can't give everyone 2 — start dropping daily requesters first, then smallest-cap.
  var MIN_ALLOC = 2;
  if(remaining < working.length * MIN_ALLOC){
    // Sort: drop daily requesters first (they'll be back tomorrow), then smallest-cap, then alphabetical
    working.sort(function(a,b){
      if(a.isDaily !== b.isDaily) return b.isDaily - a.isDaily; // daily = drop first
      if(a.originalCap !== b.originalCap) return a.originalCap - b.originalCap; // smallest cap = drop first
      return a.name.localeCompare(b.name);
    });
    // Drop committees until remaining budget can give everyone left at least 2
    for(var d = 0; d < working.length; d++){
      var active = working.filter(function(s){ return !s.dropped; });
      if(remaining >= active.length * MIN_ALLOC) break;
      working[d].dropped = true;
    }
  }

  // Step 3: Round-robin distribution — give 2 to each kept committee first, then 1 more each round
  var kept = working.filter(function(s){ return !s.dropped; });
  var budgetLeft = remaining;

  // Round 1: give everyone their minimum of 2
  kept.forEach(function(s){
    var give = Math.min(MIN_ALLOC, s.originalCap, budgetLeft);
    s.allocated = give;
    budgetLeft -= give;
  });

  // Subsequent rounds: give 1 more to each until we hit their original cap or run out
  var maxRounds = kept.reduce(function(a,s){ return Math.max(a, s.originalCap); }, 0);
  for(var round = MIN_ALLOC + 1; round <= maxRounds && budgetLeft > 0; round++){
    for(var k = 0; k < kept.length && budgetLeft > 0; k++){
      if(kept[k].allocated < kept[k].originalCap){
        kept[k].allocated++;
        budgetLeft--;
      }
    }
  }

  // Build results
  var keptResult = priority.map(function(s){
    return {name:s.name, shift:s.shift, cap:s.cap, originalCap:s.originalCap||s.cap, hat:s.hat, highPriority:true, reason:'priority — full capacity'};
  });

  kept.forEach(function(s){
    keptResult.push({name:s.name, shift:s.shift, cap:s.allocated, originalCap:s.originalCap,
      hat:s.hat, highPriority:false,
      reason: s.allocated === s.originalCap ? 'full' : 'trimmed to ' + s.allocated + ' (from ' + s.originalCap + ')'
    });
  });

  var dropped = working.filter(function(s){ return s.dropped; }).map(function(s){
    return {name:s.name, originalCap:s.originalCap,
      reason: s.isDaily ? 'dropped — daily requester (' + s.daysActive + '/' + totalShowDays + ' days), will be back tomorrow' : 'dropped — insufficient juniors to give minimum of 2'
    };
  });

  var total = keptResult.reduce(function(a,s){ return a + s.cap; }, 0);
  return {kept:keptResult, dropped:dropped, total:total};
}

// Run the cull preview — called from UI
function runCullPreview(){
  var date = document.getElementById('setup-date') ? document.getElementById('setup-date').value : currentDate;
  if(!date || !SCHEDULE_2026[date]){
    showAlert('Please select a valid show date first.', 'warn'); return;
  }

  var t8   = parseInt(document.getElementById('cull-target-8am').value)||0;
  var t12  = parseInt(document.getElementById('cull-target-12pm').value)||0;
  var t4   = parseInt(document.getElementById('cull-target-4pm').value)||0;

  if(t8 + t12 + t4 === 0){ showAlert('Enter at least one junior count.', 'warn'); return; }

  var allSlots = SCHEDULE_2026[date];
  var dateCounts = getCommitteeDateCounts();
  // Count only the 20 main show days (March dates)
  var totalShowDays = Object.keys(SCHEDULE_2026).filter(function(d){ return d.indexOf('2026-03') === 0; }).length;

  // Get priority flag — check prioritySlots (schedule slots), committeeRequests, then activeSlots
  function isPriority(name, shift){
    if(prioritySlots[name + '|' + shift]) return true;
    var fromReq = committeeRequests.find(function(r){
      return r.status === 'approved' && !!r.highPriority &&
        r.shifts && r.shifts.some(function(s){
          var effShift = s.preshow ? psTimeToShift(s.startTime) : s.shift;
          var effName  = s.preshow ? (r.name + ' (' + (s.startTime||'') + (s.endTime?'–'+s.endTime:'') + ')') : r.name;
          return effName === name && effShift === shift;
        });
    });
    if(fromReq) return true;
    var as = activeSlots.find(function(s){ return s.name === name && s.shift === shift; });
    return as ? !!as.highPriority : false;
  }

  var results = {};
  ['8am','12pm','4pm'].forEach(function(sh){
    var target = sh === '8am' ? t8 : sh === '12pm' ? t12 : t4;
    if(target === 0){ results[sh] = null; return; }
    var shSlots = allSlots.filter(function(s){ return s.shift === sh; }).map(function(s){
      return {name:s.name, shift:s.shift, cap:s.cap, hat:s.hat, highPriority:isPriority(s.name, s.shift)};
    });
    results[sh] = cullShift(shSlots, target, dateCounts, totalShowDays);
  });

  renderCullPreview(results, date);
}

function renderCullPreview(results, date){
  var el = document.getElementById('cull-preview');
  if(!el) return;

  // Store results on window for applyCullByShift
  window._cullResults = window._cullResults || {};

  var shiftNames = {'8am':'8:00 AM Shift','12pm':'12:00 PM Shift','4pm':'4:00 PM Shift'};
  var html = '';

  ['8am','12pm','4pm'].forEach(function(sh){
    var r = results[sh];
    if(!r) return;

    window._cullResults[sh] = r.kept;

    var totalRequested = r.kept.reduce(function(a,s){return a+s.originalCap;},0)
      + r.dropped.reduce(function(a,s){return a+s.originalCap;},0);
    var totalCulled = r.total;

    html += '<div style="margin-bottom:16px;border:1px solid var(--gray-200);border-radius:8px;overflow:hidden">';

    // Header
    html += '<div style="background:var(--navy);color:#fff;padding:8px 14px;display:flex;justify-content:space-between;align-items:center">';
    html += '<span style="font-weight:700;font-size:13px">' + shiftNames[sh] + '</span>';
    html += '<span style="font-size:11px;opacity:.8">' + r.kept.length + ' committees kept' + (r.dropped.length > 0 ? ' &bull; ' + r.dropped.length + ' dropped' : '') + '</span>';
    html += '</div>';

    // Table — "Culled To" column is editable
    html += '<table style="width:100%;border-collapse:collapse;font-size:12px">';
    html += '<thead><tr style="background:#F8F9FA;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#667788">';
    html += '<th style="padding:6px 12px;text-align:left">Committee</th>';
    html += '<th style="padding:6px 10px;text-align:center">Requested</th>';
    html += '<th style="padding:6px 10px;text-align:center">Culled To<span style="font-weight:400;opacity:.7"> (editable)</span></th>';
    html += '<th style="padding:6px 12px;text-align:left">Note</th>';
    html += '</tr></thead><tbody>';

    r.kept.forEach(function(s, ki){
      var trimmed = s.cap < s.originalCap;
      var rowKey = 'cull-cap-' + sh + '-' + ki;
      html += '<tr style="border-top:1px solid #F0F0F0' + (trimmed ? ';background:#FFFDF0' : '') + '">';
      html += '<td style="padding:6px 12px;font-weight:500">' + s.name +
        (s.highPriority ? ' <span style="font-size:9px;background:#CC0000;color:#fff;padding:1px 4px;border-radius:3px">PRIORITY</span>' : '') + '</td>';
      html += '<td style="padding:6px 10px;text-align:center;color:#667788">' + s.originalCap + '</td>';
      // Editable number input
      html += '<td style="padding:4px 10px;text-align:center">' +
        '<input type="number" id="' + rowKey + '" value="' + s.cap + '" min="0" ' +
        'style="width:52px;text-align:center;font-size:12px;font-weight:700;padding:3px 4px;border:1.5px solid ' + (trimmed ? '#D4860A' : 'var(--gray-200)') + ';border-radius:4px;color:' + (trimmed ? '#D4860A' : 'var(--navy)') + '" ' +
        'onchange="updateCullCap(\'' + sh + '\',' + ki + ',this.value)" oninput="updateCullCap(\'' + sh + '\',' + ki + ',this.value)">' +
        '</td>';
      html += '<td style="padding:6px 12px;color:#667788;font-size:11px">' + (trimmed ? '&#9660; trimmed' : '&#10003; full') + '</td>';
      html += '</tr>';
    });

    if(r.dropped.length > 0){
      r.dropped.forEach(function(s, di){
        // Store dropped slots in _cullResults so updateCullCap can reach them
        if(!window._cullResults[sh + '_dropped']) window._cullResults[sh + '_dropped'] = [];
        window._cullResults[sh + '_dropped'][di] = Object.assign({}, s, {cap: 0});
        var dropKey = 'cull-cap-' + sh + '-d' + di;
        html += '<tr id="cull-drop-row-' + sh + '-' + di + '" style="border-top:1px solid #F0F0F0;background:#FFF5F5">';
        html += '<td style="padding:6px 12px;color:#CC0000;text-decoration:line-through" id="cull-drop-name-' + sh + '-' + di + '">' + s.name + '</td>';
        html += '<td style="padding:6px 10px;text-align:center;color:#CC0000">' + s.originalCap + '</td>';
        html += '<td style="padding:4px 10px;text-align:center">' +
          '<input type="number" id="' + dropKey + '" value="0" min="0" ' +
          'style="width:52px;text-align:center;font-size:12px;font-weight:700;padding:3px 4px;border:1.5px solid #CC0000;border-radius:4px;color:#CC0000;background:#FFF5F5" ' +
          'onchange="updateDroppedCap(\'' + sh + '\',' + di + ',this.value)" oninput="updateDroppedCap(\'' + sh + '\',' + di + ',this.value)">' +
          '</td>';
        html += '<td style="padding:6px 12px;color:#CC0000;font-size:11px" id="cull-drop-note-' + sh + '-' + di + '">&#10007; dropped</td>';
        html += '</tr>';
      });
    }

    // Totals row
    // Store dropped requested total for live update calculations
    var droppedRequested = r.dropped.reduce(function(a,s){return a+(s.originalCap||0);},0);
    html += '<tr style="border-top:2px solid var(--navy);background:#F0F4F8;font-weight:700">';
    html += '<td style="padding:7px 12px;font-size:12px">TOTAL</td>';
    html += '<td style="padding:7px 10px;text-align:center;font-size:12px" id="cull-dropped-total-' + sh + '" data-requested="' + droppedRequested + '">' + totalRequested + '</td>';
    html += '<td style="padding:7px 10px;text-align:center;font-size:12px" id="cull-total-' + sh + '">' + totalCulled + '</td>';
    html += '<td style="padding:7px 12px;font-size:11px;color:#667788" id="cull-reduced-' + sh + '">' + (totalRequested - totalCulled) + ' spots reduced</td>';
    html += '</tr>';

    html += '</tbody></table>';

    // Apply button
    html += '<div style="padding:10px 14px;background:#F8F9FA;border-top:1px solid var(--gray-200);display:flex;justify-content:flex-end">';
    html += '<button class="btn btn-sm" style="background:var(--navy);color:#fff;border-color:var(--navy)" data-shift="' + sh + '" onclick="applyCullByShift(this)">&#9654; Apply ' + shiftNames[sh] + ' to Dashboard</button>';
    html += '</div>';
    html += '</div>';
  });

  el.innerHTML = html || '<div style="color:var(--gray-400);text-align:center;padding:20px">No shifts to preview.</div>';
  el.style.display = 'block';
}

// Called when user edits a culled-to number in the preview table
function updateDroppedCap(sh, di, val){
  if(!window._cullResults) return;
  var n = Math.max(0, parseInt(val)||0);
  if(!window._cullResults[sh + '_dropped']) return;
  window._cullResults[sh + '_dropped'][di].cap = n;

  var inputEl = document.getElementById('cull-cap-' + sh + '-d' + di);
  var nameEl  = document.getElementById('cull-drop-name-' + sh + '-' + di);
  var noteEl  = document.getElementById('cull-drop-note-' + sh + '-' + di);

  var orig = window._cullResults[sh+'_dropped'][di].originalCap || 0;
  if(n > 0){
    // Restored — black name, navy input (within request) or orange (above request)
    var over = n > orig;
    if(inputEl){
      inputEl.style.borderColor = over ? '#D4860A' : 'var(--gray-200)';
      inputEl.style.color       = over ? '#D4860A' : 'var(--navy)';
      inputEl.style.background  = '';
    }
    if(nameEl){ nameEl.style.textDecoration='none'; nameEl.style.color=''; }
    if(noteEl) noteEl.innerHTML = over
      ? '<span style="color:#D4860A">&#9650; ' + n + ' (above ' + orig + ' requested)</span>'
      : '<span style="color:var(--green)">&#10003; restored (' + n + ' of ' + orig + ')</span>';
  } else {
    if(inputEl){ inputEl.style.borderColor='#CC0000'; inputEl.style.color='#CC0000'; inputEl.style.background='#FFF5F5'; }
    if(nameEl){ nameEl.style.textDecoration='line-through'; nameEl.style.color='#CC0000'; }
    if(noteEl) noteEl.innerHTML = '&#10007; dropped';
  }

  // Recalculate total from kept + restored dropped
  _recalcCullTotal(sh);
}

function _recalcCullTotal(sh){
  if(!window._cullResults || !window._cullResults[sh]) return;
  var keptTotal = window._cullResults[sh].reduce(function(a,s){return a+s.cap;},0);
  var dropTotal = ((window._cullResults[sh+'_dropped'])||[]).reduce(function(a,s){return a+(s.cap||0);},0);
  var total = keptTotal + dropTotal;

  var totalEl = document.getElementById('cull-total-' + sh);
  if(totalEl) totalEl.textContent = total;

  var droppedEl = document.getElementById('cull-dropped-total-' + sh);
  var requestedBase = window._cullResults[sh].reduce(function(a,s){return a+(s.originalCap||s.cap);},0);
  var droppedRequested = droppedEl ? parseInt(droppedEl.getAttribute('data-requested')||0) : 0;
  var requested = requestedBase + droppedRequested;

  var diff = requested - total;
  var reducedEl = document.getElementById('cull-reduced-' + sh);
  if(reducedEl){
    reducedEl.textContent = diff > 0 ? diff + ' spots reduced' : diff < 0 ? Math.abs(diff) + ' spots added above request' : 'matches requested';
    reducedEl.style.color = diff < 0 ? '#CC0000' : '#667788';
  }
}

function updateCullCap(sh, ki, val){
  if(!window._cullResults || !window._cullResults[sh]) return;
  var n = Math.max(0, parseInt(val)||0);
  window._cullResults[sh][ki].cap = n;
  var originalCap = window._cullResults[sh][ki].originalCap || n;

  // Color the input: blue if at or below original request, red if above
  var inputEl = document.getElementById('cull-cap-' + sh + '-' + ki);
  if(inputEl){
    var over   = n > originalCap;
    var zeroed = n === 0;
    inputEl.style.borderColor = zeroed ? '#CC0000' : over ? '#CC0000' : (n < originalCap ? '#D4860A' : 'var(--gray-200)');
    inputEl.style.color       = zeroed ? '#CC0000' : over ? '#CC0000' : (n < originalCap ? '#D4860A' : 'var(--navy)');
    inputEl.style.background  = (zeroed || over) ? '#FFF5F5' : '';
  }

  // If zeroed out — strikethrough the name cell to show it's effectively dropped
  var nameCell = inputEl ? inputEl.closest('tr').querySelector('td:first-child') : null;
  if(nameCell){
    nameCell.style.textDecoration = n === 0 ? 'line-through' : 'none';
    nameCell.style.color = n === 0 ? '#CC0000' : '';
  }
  var noteCell = inputEl ? inputEl.closest('tr').querySelector('td:last-child') : null;
  if(noteCell && n === 0) noteCell.innerHTML = '<span style="color:#CC0000">&#10007; zeroed out</span>';

  _recalcCullTotal(sh);
}

function applyCullByShift(btn){
  var sh = btn.getAttribute('data-shift');
  var slots = (window._cullResults || {})[sh];
  if(!slots){ showAlert('Preview data not found — run Preview first.', 'warn'); return; }
  // Include any dropped slots that were manually given a cap > 0
  var restored = ((window._cullResults || {})[sh + '_dropped'] || []).filter(function(s){ return s.cap > 0; });
  applyCull(slots.concat(restored), sh);
}

function applyCull(keptSlots, shift){
  if(!confirm('Apply culled ' + shift + ' slots to the dashboard? This will replace existing ' + shift + ' slots.')) return;

  // Remove existing slots for this shift
  activeSlots = activeSlots.filter(function(s){ return s.shift !== shift; });

  // Add culled slots
  var nextId = Date.now();
  keptSlots.forEach(function(s){
    activeSlots.push({
      id: nextId++,
      name: s.name,
      shift: s.shift,
      capacity: s.cap,
      hat: s.hat||false,
      highPriority: s.highPriority||false,
      assigned: [],
      liaison: s.liaison||'',
      liaisonPhone: s.liaisonPhone||'',
      liaisonEmail: s.liaisonEmail||'',
      chair: s.chair||'',
      chairPhone: s.chairPhone||'',
      location: s.location||'',
      duties: s.duties||'',
      notes: s.notes||''
    });
  });

  saveState();
  renderOfficer();
  renderSetup();
  showAlert('Applied ' + keptSlots.length + ' slots for ' + shift + ' (' + keptSlots.reduce(function(a,s){return a+s.cap;},0) + ' spots).', 'success');
}

function toggleSetupRequests(){
  var el = document.getElementById('setup-approved-section');
  var icon = document.getElementById('setup-req-toggle');
  if(!el) return;
  var open = el.style.display !== 'none';
  el.style.display = open ? 'none' : 'block';
  if(icon) icon.innerHTML = open ? '&#9660; Show' : '&#9650; Hide';
}

function toggleSchedulePriority(name, shift, val){
  var key = name + '|' + shift;
  if(val) prioritySlots[key] = true;
  else delete prioritySlots[key];
  // Also sync to any matching activeSlot
  activeSlots.forEach(function(s){
    if(s.name === name && s.shift === shift) s.highPriority = val;
  });
  saveState();
  // Re-render the checkbox label styling
  var lbl = document.getElementById('sched-priority-lbl-' + key.replace(/[^a-z0-9]/gi,'_'));
  if(lbl){
    lbl.style.borderColor  = val ? '#CC0000' : '#DDD';
    lbl.style.background   = val ? '#FFF0F0' : '#FAFAFA';
    lbl.querySelector('span').style.color = val ? '#CC0000' : '#667788';
  }
}

function toggleRequestPriority(rid, val){
  var r = committeeRequests.find(function(x){ return x.id === rid; });
  if(!r) return;
  r.highPriority = val;
  // Update any matching activeSlots already applied
  activeSlots.forEach(function(s){
    // Match by committee name prefix
    if(s.name === r.name || s.name.indexOf(r.name) === 0) s.highPriority = val;
  });
  saveState();
  renderRequests();
  showAlert((val ? '&#9650; Priority set' : 'Priority removed') + ' for ' + r.name + '.', 'success');
}

function setRequestPriority(rid, si, val){
  // Set priority flag on the committeeRequest so runCullPreview picks it up
  var r = committeeRequests.find(function(x){ return x.id === rid; });
  if(!r) return;
  r.highPriority = val;
  // Also update any matching activeSlot if already applied
  var date = document.getElementById('setup-date') ? document.getElementById('setup-date').value : '';
  if(r.shifts && r.shifts[si]){
    var s = r.shifts[si];
    var effShift = s.preshow ? psTimeToShift(s.startTime) : s.shift;
    var slotName = s.preshow ? (r.name + ' (' + (s.startTime||'') + (s.endTime ? '–'+s.endTime : '') + ')') : r.name;
    var sl = activeSlots.find(function(x){ return x.name === slotName && x.shift === effShift; });
    if(sl) sl.highPriority = val;
  }
  saveState();
  renderSetupApproved();
}


function renderSetupApproved(){
  var approvedEl = document.getElementById('setup-approved-section');
  if(!approvedEl) return;
  var date = document.getElementById('setup-date') ? document.getElementById('setup-date').value : '';
  var approved = committeeRequests.filter(function(r){ return r.status === 'approved'; });
  var relevant = [];
  approved.forEach(function(r){
    r.shifts.forEach(function(s, si){
      if(!s.all20 && s.date !== date) return;
      var effShift = s.preshow ? psTimeToShift(s.startTime) : s.shift;
      var effLabel = s.preshow ? ((s.startTime||'') + (s.endTime ? '–'+s.endTime : '')) : (SL[s.shift]||'');
      var slotName = s.preshow ? (r.name + ' (' + effLabel + ')') : r.name;
      var existingSlot = activeSlots.find(function(sl){ return sl.name === slotName && sl.shift === effShift; });
      var isPriority = existingSlot ? !!existingSlot.highPriority : !!(r.highPriority);
      relevant.push({name:slotName, shift:effShift, shiftLabel:effLabel, cap:s.cap, rid:r.id, si:si, isPriority:isPriority, liaison:r.liaison||'', liaisonPhone:r.liaisonPhone||'', liaisonEmail:r.liaisonEmail||'', chair:r.chair||'', chairPhone:r.chairPhone||'', location:r.location||'', duties:r.duties||'', notes:r.notes||''});
    });
  });

  if(relevant.length === 0){
    approvedEl.innerHTML = '<div style="font-size:12px;color:#667788;font-style:italic">No approved requests for this date.</div>';
    return;
  }

  var byShift = {'8am':[],'12pm':[],'4pm':[]};
  relevant.forEach(function(r){ if(byShift[r.shift]) byShift[r.shift].push(r); });
  var shiftColors = {'8am':'#4499CC','12pm':'#D4860A','4pm':'#27AE60'};
  var shiftNames  = {'8am':'8:00 AM','12pm':'12:00 PM','4pm':'4:00 PM'};
  var apHtml = '';
  ['8am','12pm','4pm'].forEach(function(sh){
    var rows = byShift[sh];
    if(!rows.length) return;
    apHtml += '<div style="margin-bottom:12px">';
    apHtml += '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:' + shiftColors[sh] + ';margin-bottom:6px">' + shiftNames[sh] + ' Shift (' + rows.length + ' committees, ' + rows.reduce(function(a,r){return a+r.cap;},0) + ' spots requested)</div>';
    apHtml += '<table style="width:100%;border-collapse:collapse;font-size:12px">';
    apHtml += '<thead><tr style="background:#F5F6F8;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#667788"><th style="padding:5px 10px;text-align:left;font-weight:600">Committee</th><th style="padding:5px 10px;text-align:center;font-weight:600">Spots</th><th style="padding:5px 10px;text-align:center;font-weight:600">Priority</th></tr></thead>';
    apHtml += '<tbody>';
    rows.forEach(function(r){
      apHtml += '<tr style="border-top:1px solid #F0F0F0' + (r.isPriority ? ';background:#FFF8F8' : '') + '">';
      apHtml += '<td style="padding:6px 10px;font-weight:500">' + r.name + '</td>';
      apHtml += '<td style="padding:6px 10px;text-align:center;color:#667788">' + r.cap + '</td>';
      apHtml += '<td style="padding:6px 10px;text-align:center">' +
        '<label style="display:inline-flex;align-items:center;gap:5px;cursor:pointer;font-size:11px;color:#CC0000;font-weight:600">' +
        '<input type="checkbox"' + (r.isPriority ? ' checked' : '') + ' onchange="setRequestPriority(' + r.rid + ',' + r.si + ',this.checked)" style="accent-color:#CC0000;width:15px;height:15px"> Priority</label>' +
        '</td></tr>';
    });
    apHtml += '</tbody></table></div>';
  });
  approvedEl.innerHTML = apHtml;
}


// ============================================================
// SCHEDULE_2026 → committeeRequests ONE-TIME MIGRATION
// ============================================================
function hasMigratedSchedule(){
  // Count expected records from SCHEDULE_2026
  var expected = 0;
  Object.keys(SCHEDULE_2026).forEach(function(d){ expected += SCHEDULE_2026[d].length; });
  var actual = committeeRequests.filter(function(r){ return r.source === 'schedule_2026'; }).length;
  return actual >= expected * 0.9; // 90% threshold to handle minor discrepancies
}

function migrateSchedule2026(){
  if(hasMigratedSchedule()){
    showAlert('Migration already completed — schedule data is already in the requests system.', 'info');
    renderSimulateMigrationStatus();
    return;
  }

  var dates = Object.keys(SCHEDULE_2026).sort();
  var nextId = Date.now();
  var count = 0;

  dates.forEach(function(date){
    var slots = SCHEDULE_2026[date];
    slots.forEach(function(slot){
      var cd = CD[slot.name] || {};
      // Each date+committee+shift = one request record
      var record = {
        id: nextId++,
        name: slot.name,
        status: 'approved',
        source: 'schedule_2026',
        submittedAt: new Date('2025-01-01').toISOString(), // placeholder submission date
        // Contact info from CD
        chair: cd.chair || '',
        chairPhone: cd.cp || '',
        liaison: cd.liaison || '',
        liaisonPhone: cd.lp || '',
        liaisonEmail: cd.le || '',
        location: cd.loc || '',
        duties: cd.duties || '',
        notes: cd.notes || '',
        hat: slot.hat || false,
        highPriority: false,
        schedulingNotes: '',
        // Single shift entry for this specific date
        shifts: [{
          date: date,
          shift: slot.shift,
          cap: slot.cap,
          all20: false,
          preshow: false
        }]
      };
      committeeRequests.push(record);
      count++;
    });
  });

  // Send migrated records to Neon in batches of 200 using batchMode (upsert only, no delete)
  var CHUNK_SIZE = 200;
  var newRecords = committeeRequests.filter(function(r){ return r.source === 'schedule_2026'; });
  var chunks = [];
  for(var ci = 0; ci < newRecords.length; ci += CHUNK_SIZE){
    chunks.push(newRecords.slice(ci, ci + CHUNK_SIZE));
  }

  var el = document.getElementById('migration-status');
  if(el) el.innerHTML = '<div style="padding:12px;background:#FFF3CD;border-radius:8px;font-size:13px;color:#856404">&#9203; Saving ' + newRecords.length + ' records to Neon in ' + chunks.length + ' batches...</div>';

  function sendChunk(idx){
    if(idx >= chunks.length){
      showAlert('Migration complete — ' + count + ' slots saved to Neon.', 'success');
      renderSimulateMigrationStatus();
      renderRequests();
      return;
    }
    fetch('/.netlify/functions/state', {
      method: 'POST',
      headers: {'Content-Type':'application/json', 'x-api-token': API_TOKEN},
      body: JSON.stringify({
        committeeRequests: chunks[idx],
        batchMode: true  // upsert only — don't delete existing records
      })
    }).then(function(r){
      if(!r.ok){
        return r.text().then(function(body){
          showAlert('Batch ' + (idx+1) + ' failed: ' + body, 'error');
          if(el) el.innerHTML = '<div style="padding:12px;background:#FFF5F5;border-radius:8px;font-size:13px;color:#CC0000">&#9888; Batch ' + (idx+1) + '/' + chunks.length + ' failed: ' + body + '</div>';
        });
      }
      // Update progress
      if(el) el.innerHTML = '<div style="padding:12px;background:#FFF3CD;border-radius:8px;font-size:13px;color:#856404">&#9203; Saved batch ' + (idx+1) + ' of ' + chunks.length + '...</div>';
      sendChunk(idx + 1);
    }).catch(function(e){
      showAlert('Migration network error: ' + e.message, 'error');
    });
  }

  sendChunk(0);
}

function renderSimulateMigrationStatus(){
  var el = document.getElementById('migration-status');
  if(!el) return;
  var done = hasMigratedSchedule();
  // Hide the entire card once migration is done
  var card = el.closest('.card');
  if(done){
    if(card) card.style.display = 'none';
    return;
  } else {
    if(card) card.style.display = 'block';
    el.innerHTML =
      '<div style="padding:12px 14px;background:#FFF3CD;border:1px solid #FFEAA7;border-radius:8px;font-size:13px;color:#856404;margin-bottom:10px">' +
        '&#9888; The 2026 hardcoded schedule has <strong>not yet been migrated</strong>. ' +
        'Click the button below to convert all ' + Object.values(SCHEDULE_2026).reduce(function(a,v){return a+v.length;},0) + ' schedule slots into request records.' +
      '</div>' +
      '<button class="btn btn-primary" style="font-size:13px;padding:10px 18px" onclick="migrateSchedule2026()">&#9654; Migrate SCHEDULE_2026 to Request Records</button>';
  }
}

// ============================================================
// BULK CHECK-IN / CLOCK-OUT SIMULATOR
// ============================================================
var _simCITimers = [], _simCOTimers = [];
var _simCIRunning = false, _simCORunning = false;

var _SIM_NOTES = [
  'Working with mom', 'Working with dad', 'Working with parent',
  'Medical issue', 'Injury — light duty only', 'Needs bathroom break accommodation',
  'First time volunteer', 'Requested indoor assignment',
  'Working with sibling', 'Has equipment to carry'
];

function _simStaggeredDelays(count, totalMs){
  var delays = [], used = 0;
  for(var i = 0; i < count; i++){
    var remaining = count - i;
    var d = i === 0 ? Math.random() * (totalMs / remaining * 0.5)
                    : Math.random() * ((totalMs - used) / remaining * 1.8);
    used += d;
    delays.push(Math.round(Math.min(used, totalMs - 100)));
  }
  return delays.sort(function(a,b){ return a-b; });
}

function simStopCI(){
  _simCITimers.forEach(function(t){ clearTimeout(t); }); _simCITimers = []; _simCIRunning = false;
  document.getElementById('sim-ci-status').textContent = 'Stopped.';
}
function simStopCO(){
  _simCOTimers.forEach(function(t){ clearTimeout(t); }); _simCOTimers = []; _simCORunning = false;
  document.getElementById('sim-co-status').textContent = 'Stopped.';
}
function simStopAll(){ simStopCI(); simStopCO(); }

function simCheckIn(){
  if(_simCIRunning){ showAlert('Check-in already running — stop it first.', 'warn'); return; }
  var count = Math.min(650, Math.max(1, parseInt(document.getElementById('sim-ci-count').value)||30));
  var mins  = Math.min(60, Math.max(1, parseInt(document.getElementById('sim-ci-mins').value)||5));
  var shift = document.getElementById('sim-ci-shift').value || '8am';
  var totalMs = mins * 60 * 1000;

  var available = juniors.filter(function(j){ return !j.inactive && (!j.checkedIn || clockedOut[j.id]); });
  if(!available.length){ showAlert('No juniors available to check in.', 'warn'); return; }
  count = Math.min(count, available.length);

  var selected = available.slice().sort(function(){ return Math.random()-.5; }).slice(0, count);
  var delays = _simStaggeredDelays(count, totalMs);

  _simCIRunning = true;
  var wrap = document.getElementById('sim-ci-progress-wrap');
  var bar  = document.getElementById('sim-ci-bar');
  var stat = document.getElementById('sim-ci-status');
  if(wrap) wrap.style.display = 'block';
  if(stat) stat.textContent = 'Starting...';

  var done = 0;
  selected.forEach(function(jr, idx){
    var t = setTimeout(function(){
      if(!_simCIRunning) return;
      checkInOrder++;
      jr.checkedIn        = true;
      jr.order            = checkInOrder;
      jr.checkInShift     = shift;
      jr.checkInDate      = currentDate;
      jr.checkInTimestamp = Date.now();
      jr.assignment       = null;
      jr.onBreak          = false;
      clockedOut[jr.id]   = false;
      delete clockedOut[jr.id];
      onShiftJuniors.delete(jr.id);
      onShiftJuniors.delete(String(jr.id));

      // Randomize hat — 75%
      jr.hasHat = Math.random() < 0.75;

      // Age-out: ~15% chance, gets 2-3 planned shifts randomly
      if(jr.ageout && Math.random() < 0.7){
        var allShifts = ['8am','12pm','4pm'];
        var shiftIdx = allShifts.indexOf(shift);
        var future = allShifts.filter(function(s, i){ return i >= shiftIdx; });
        future = future.sort(function(){ return Math.random()-.5; }).slice(0, 1 + Math.floor(Math.random()*2));
        jr.plannedShifts = future.indexOf(shift) < 0 ? [shift].concat(future) : future;
      } else if(!jr.ageout){
        jr.plannedShifts = [shift];
      }

      // Notes: only assign to the last junior in each shift batch (1 per shift total)
      // Using index to find the last one: track via simulated slot
      jr.notes = '';

      dirtyJuniors.add(jr.id);
      done++;
      if(bar) bar.style.width = Math.round(done/count*100) + '%';
      if(stat) stat.textContent = done + ' / ' + count + ' checked in...';
      renderOfficer(); renderBoard();
      if(done % 5 === 0){ _lastSavedHash=''; saveStateNow(); }
      // Assign exactly 2 notes per shift run — medical and wants-to-be-with-mom
      if(done === Math.floor(count * 0.3)){
        jr.notes = 'Medical issue — indoor assignment needed';
        dirtyJuniors.add(jr.id);
      }
      if(done === Math.floor(count * 0.7)){
        jr.notes = 'Would like to work with mom at Tours';
        dirtyJuniors.add(jr.id);
      }
      if(done === count){
        _simCIRunning = false;
        _lastSavedHash=''; saveStateNow();
        if(stat) stat.textContent = '&#10003; Done — ' + done + ' checked in for ' + shift;
        showAlert(done + ' juniors checked in!', 'success');
      }
    }, delays[idx]);
    _simCITimers.push(t);
  });
}

function simClockOut(){
  if(_simCORunning){ showAlert('Clock-out already running — stop it first.', 'warn'); return; }
  var mins = Math.min(60, Math.max(1, parseInt(document.getElementById('sim-co-mins').value)||5));
  var coShift = (document.getElementById('sim-co-shift')||{}).value || '';
  var totalMs = mins * 60 * 1000;

  var onShift = juniors.filter(function(j){
    if(!j.checkedIn || clockedOut[j.id]) return false;
    if(!(onShiftJuniors.has(j.id) || onShiftJuniors.has(String(j.id)))) return false;
    if(coShift && j.checkInShift !== coShift) return false; // filter by shift
    return true;
  });
  if(!onShift.length){ showAlert('No juniors out on shift' + (coShift ? ' for ' + coShift : '') + '.', 'warn'); return; }

  var delays = _simStaggeredDelays(onShift.length, totalMs);
  var shuffled = onShift.slice().sort(function(){ return Math.random()-.5; });

  _simCORunning = true;
  var wrap = document.getElementById('sim-co-progress-wrap');
  var bar  = document.getElementById('sim-co-bar');
  var stat = document.getElementById('sim-co-status');
  if(wrap) wrap.style.display = 'block';
  if(stat) stat.textContent = 'Starting...';

  var done = 0;
  shuffled.forEach(function(jr, idx){
    var t = setTimeout(function(){
      if(!_simCORunning) return;
      clockedOut[jr.id] = true;
      jr.checkedIn = false;
      jr.assignment = null;
      activeSlots.forEach(function(s){
        s.assigned = s.assigned.filter(function(id){ return String(id) !== String(jr.id); });
      });
      onShiftJuniors.delete(jr.id);
      onShiftJuniors.delete(String(jr.id));
      dirtyJuniors.add(jr.id);
      done++;
      if(bar) bar.style.width = Math.round(done/shuffled.length*100) + '%';
      if(stat) stat.textContent = done + ' / ' + shuffled.length + ' clocked out...';
      renderOfficer(); renderBoard();
      if(done % 5 === 0){ _lastSavedHash=''; saveStateNow(); }
      if(done === shuffled.length){
        _simCORunning = false;
        _lastSavedHash=''; saveStateNow();
        if(stat) stat.textContent = '&#10003; Done — ' + done + ' clocked out';
        showAlert(done + ' juniors clocked out!', 'success');
      }
    }, delays[idx]);
    _simCOTimers.push(t);
  });
}


function renderSetup(){
  // Initialize sim-date picker to today if not already set
  var sdEl = document.getElementById('sim-date');
  if(sdEl && !sdEl.value){
    sdEl.value = new Date().toISOString().slice(0,10);
  }
  initSetupDatePicker();
  var sel = document.getElementById('add-sel');
  if(sel) sel.innerHTML = committeeLibrary.map(function(c){
    var s = c.shifts.length > 0 ? c.shifts[0] : {shift:'12pm',cap:4};
    return '<option value="' + c.id + '">' + c.name + ' &mdash; ' + SL[s.shift] + ' (cap: ' + s.cap + ')' + (c.hat ? ' [hat]' : '') + '</option>';
  }).join('');

  renderSetupApproved();

  var sl = document.getElementById('setup-list');
  if(!sl) return; // setup-list removed from panel
  sl.innerHTML = activeSlots.map(function(s, i){
    var sid = s.id;
    var contactSection = '';
    if(s.custom){
      if(s.saved){
        // Saved state — show summary with Edit button
        contactSection =
          '<div style="margin-top:6px;padding:10px 14px;background:#F0FAF0;border:1.5px solid var(--green);border-radius:7px;display:flex;justify-content:space-between;align-items:flex-start;gap:12px">' +
            '<div style="font-size:12px;color:#334">' +
              '<strong>' + (s.liaison||'—') + '</strong>' + (s.liaisonPhone ? ' &bull; ' + s.liaisonPhone : '') + (s.liaisonEmail ? ' &bull; ' + s.liaisonEmail : '') + '<br>' +
              (s.chair ? '<span style="color:#667788">Chair: ' + s.chair + (s.chairPhone ? ' ' + s.chairPhone : '') + '</span><br>' : '') +
              '<span style="color:#667788">' + (s.location||'No location entered') + '</span>' +
            '</div>' +
            '<button class="btn btn-sm" style="flex-shrink:0" onclick="editCustomSlot(' + sid + ')"><img src="assets/edit.png" style="width:13px;height:13px;vertical-align:middle"> Edit</button>' +
          '</div>';
      } else {
        // Edit state — show full form with Save button
        contactSection =
          '<div style="margin-top:6px;padding:12px 14px;background:#FFF8F0;border:2px solid var(--orange);border-radius:7px">' +
            '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--navy);margin-bottom:10px">' +
              'New Committee Assignment' +
            '</div>' +
            '<div style="margin-bottom:10px">' +
              '<label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:13px;font-weight:700;color:var(--navy)">' +
              '<input type="checkbox" ' + (s.hat ? 'checked' : '') + ' style="width:18px;height:18px;accent-color:var(--navy)" onchange="activeSlots[' + i + '].hat=this.checked"> <img src="assets/hat.png" style="height:18px;vertical-align:middle;margin-right:3px"> Hat required for this assignment' +
              '</label></div>' +
              '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">' +
              '<div>' +
                '<div style="font-size:11px;color:var(--red);font-weight:700;margin-bottom:3px">Liaison Name *</div>' +
                '<input class="finput" id="cs-liaison-' + sid + '" style="font-size:12px;padding:5px 8px;border:2px solid ' + (!s.liaison ? 'var(--red)' : 'var(--gray-200)') + ';background:' + (!s.liaison ? '#FFF5F5' : 'var(--white)') + '" value="' + (s.liaison||'') + '" placeholder="Required">' +
              '</div>' +
              '<div>' +
                '<div style="font-size:11px;color:var(--red);font-weight:700;margin-bottom:3px">Liaison Phone *</div>' +
                '<input class="finput" id="cs-lp-' + sid + '" style="font-size:12px;padding:5px 8px;border:2px solid ' + (!s.liaisonPhone ? 'var(--red)' : 'var(--gray-200)') + ';background:' + (!s.liaisonPhone ? '#FFF5F5' : 'var(--white)') + '" value="' + (s.liaisonPhone||'') + '" placeholder="Required">' +
              '</div>' +
              '<div>' +
                '<div style="font-size:11px;color:#667788;margin-bottom:3px">Liaison Email</div>' +
                '<input class="finput" id="cs-le-' + sid + '" style="font-size:12px;padding:5px 8px" value="' + (s.liaisonEmail||'') + '" placeholder="Optional">' +
              '</div>' +
              '<div>' +
                '<div style="font-size:11px;color:#667788;margin-bottom:3px">Committee Chair</div>' +
                '<input class="finput" id="cs-chair-' + sid + '" style="font-size:12px;padding:5px 8px" value="' + (s.chair||'') + '" placeholder="Optional">' +
              '</div>' +
              '<div>' +
                '<div style="font-size:11px;color:#667788;margin-bottom:3px">Chair Phone</div>' +
                '<input class="finput" id="cs-cp-' + sid + '" style="font-size:12px;padding:5px 8px" value="' + (s.chairPhone||'') + '" placeholder="Optional">' +
              '</div>' +
            '</div>' +
            '<div style="margin-bottom:8px">' +
              '<div style="font-size:11px;color:var(--red);font-weight:700;margin-bottom:3px">Location / Where juniors should report *</div>' +
              '<input class="finput" id="cs-loc-' + sid + '" style="font-size:12px;padding:5px 8px;border:2px solid ' + (!s.location ? 'var(--red)' : 'var(--gray-200)') + ';background:' + (!s.location ? '#FFF5F5' : 'var(--white)') + '" value="' + (s.location||'') + '" placeholder="Required — building, room, gate number, etc.">' +
            '</div>' +
            '<div style="margin-bottom:8px">' +
              '<div style="font-size:11px;color:#667788;margin-bottom:3px">Duties</div>' +
              '<textarea class="finput" id="cs-duties-' + sid + '" style="font-size:12px;padding:5px 8px;resize:none" rows="2" placeholder="Optional">' + (s.duties||'') + '</textarea>' +
            '</div>' +
            '<div style="margin-bottom:10px">' +
              '<div style="font-size:11px;color:#667788;margin-bottom:3px">Notes / Attire</div>' +
              '<textarea class="finput" id="cs-notes-' + sid + '" style="font-size:12px;padding:5px 8px;resize:none" rows="2" placeholder="Optional">' + (s.notes||'') + '</textarea>' +
            '</div>' +
            '<div id="cs-err-' + sid + '" style="display:none;font-size:12px;color:var(--red);font-weight:600;margin-bottom:8px"></div>' +
            '<button class="btn btn-orange" style="width:100%;padding:8px;font-size:13px" onclick="saveCustomSlot(' + sid + ')">&#10003; Save Committee Info</button>' +
          '</div>';
      }
    }
    return '<div style="padding:10px 0;border-bottom:1px solid var(--gray-100)">' +
      '<div style="display:grid;grid-template-columns:2fr 70px 1fr 55px auto;gap:6px;align-items:center">' +
      '<input class="finput" id="cs-name-' + sid + '" style="font-size:12px;padding:5px 7px" value="' + s.name + '" onchange="activeSlots[' + i + '].name=this.value">' +
      '<input class="finput" id="cs-cap-' + sid + '" type="number" min="2" max="40" style="font-size:12px;padding:5px 7px" value="' + s.capacity + '" onchange="setSlotCapacityById(' + sid + ',this.value,this)" title="Juniors needed (min 2)">' +
      '<select class="finput" id="cs-shift-' + sid + '" style="font-size:12px;padding:5px 7px" onchange="activeSlots.find(function(x){return String(x.id)===String(' + sid + ')}).shift=this.value">' +
        ['8am','12pm','4pm'].map(function(sh){ return '<option value="' + sh + '"' + (s.shift === sh ? ' selected' : '') + '>' + SL[sh] + '</option>'; }).join('') +
      '</select>' +
      '<label style="font-size:12px;display:flex;align-items:center;gap:4px;color:#667788;justify-content:center"><input type="checkbox" id="cs-hat-' + sid + '" ' + (s.hat ? 'checked' : '') + ' onchange="activeSlots[' + i + '].hat=this.checked"> Hat</label>' +
      (currentRole==='admin'||currentRole==='slt' ? '<button class="btn btn-sm btn-danger" onclick="activeSlots=activeSlots.filter(function(x){return String(x.id)!==String(' + sid + ')});renderSetup();saveState()">Remove</button>' : '') +
      '</div>' + contactSection +
    '</div>';
  }).join('');
}

function addSlotFromLib(){
  var id = parseInt(document.getElementById('add-sel').value);
  var c = committeeLibrary.find(function(x){ return x.id === id; });
  if(!c) return;
  // Add a slot for each shift this committee participates in
  var firstShift = c.shifts[0];
  activeSlots.push({id: Date.now(), name: c.name, capacity: firstShift.cap, shift: firstShift.shift, hat: c.hat, assigned: []});
  renderSetup();
}

function addBlankSlot(){
  activeSlots.push({id: Date.now(), name:'New Committee', capacity:4, shift: currentShift, hat:false, assigned:[],
    custom:true, saved:false, location:'', duties:'', notes:'', liaison:'', liaisonPhone:'', liaisonEmail:'', chair:'', chairPhone:''});
  renderSetup();
}

function saveCustomSlot(slotId){
  var s = activeSlots.find(function(x){ return x.id === slotId; });
  if(!s) return;
  // Read current field values directly from DOM inputs
  var nameEl = document.getElementById('cs-name-' + slotId);
  var capEl = document.getElementById('cs-cap-' + slotId);
  var shiftEl = document.getElementById('cs-shift-' + slotId);
  var hatEl = document.getElementById('cs-hat-' + slotId);
  var liaisonEl = document.getElementById('cs-liaison-' + slotId);
  var lpEl = document.getElementById('cs-lp-' + slotId);
  var leEl = document.getElementById('cs-le-' + slotId);
  var chairEl = document.getElementById('cs-chair-' + slotId);
  var cpEl = document.getElementById('cs-cp-' + slotId);
  var locEl = document.getElementById('cs-loc-' + slotId);
  var dutiesEl = document.getElementById('cs-duties-' + slotId);
  var notesEl = document.getElementById('cs-notes-' + slotId);

  // Validate required fields — highlight in red if empty
  var ok = true;
  [liaisonEl, lpEl, locEl].forEach(function(el){
    if(!el) return;
    if(!el.value.trim()){
      el.style.borderColor = 'var(--red)';
      el.style.background = '#FFF5F5';
      ok = false;
    } else {
      el.style.borderColor = '';
      el.style.background = '';
    }
  });
  if(!ok){
    var errEl = document.getElementById('cs-err-' + slotId);
    if(errEl){ errEl.textContent = 'Please fill in the required fields (marked in red) before saving.'; errEl.style.display='block'; }
    return;
  }

  // Save all values
  if(nameEl) s.name = nameEl.value.trim() || s.name;
  if(capEl) s.capacity = parseInt(capEl.value) || 1;
  if(shiftEl) s.shift = shiftEl.value;
  if(hatEl) s.hat = hatEl.checked;
  s.liaison = liaisonEl ? liaisonEl.value.trim() : '';
  s.liaisonPhone = lpEl ? lpEl.value.trim() : '';
  s.liaisonEmail = leEl ? leEl.value.trim() : '';
  s.chair = chairEl ? chairEl.value.trim() : '';
  s.chairPhone = cpEl ? cpEl.value.trim() : '';
  s.location = locEl ? locEl.value.trim() : '';
  s.duties = dutiesEl ? dutiesEl.value.trim() : '';
  s.notes = notesEl ? notesEl.value.trim() : '';
  s.saved = true;

  // Also update CD so drop-off report pulls this data
  CD[s.name] = {chair:s.chair, cp:s.chairPhone, liaison:s.liaison, lp:s.liaisonPhone, le:s.liaisonEmail,
    loc:s.location, duties:s.duties, notes:s.notes};

  renderSetup();
}

function editCustomSlot(slotId){
  var s = activeSlots.find(function(x){ return x.id === slotId; });
  if(!s) return;
  s.saved = false;
  renderSetup();
}


function _loadSlotsForDate(date){
  if(!date) return;
  console.log('[JRC] _loadSlotsForDate:', date, 'activeSlots:', activeSlots.length, 'committeeRequests:', committeeRequests.length, '_activeSlotsDate:', window._activeSlotsDate);
  // If already loaded for this date, skip
  if(window._activeSlotsDate === date && activeSlots.length > 0){ console.log('[JRC] already loaded, skipping'); return; }
  // Clear any existing slots (different date)
  if(activeSlots.length > 0){
    activeSlots = [];
    onShiftSlots = new Set();
    onShiftJuniors = new Set();
    juniors.forEach(function(j){ j.assignment = null; });
  }
  window._activeSlotsDate = '';
  var slots = SCHEDULE_2026[date] ? SCHEDULE_2026[date].slice() : [];
  committeeRequests.filter(function(r){
    return r.status==='approved' && !r.virtual &&
      r.shifts && r.shifts.some(function(s){ return !s.virtual && (s.date===date || s.all20); });
  }).forEach(function(r){
    r.shifts.filter(function(s){ return !s.virtual && (s.date===date || s.all20); }).forEach(function(s){
      var exists = slots.some(function(x){ return x.name===r.name && x.shift===(s.shift||'8am'); });
      if(!exists) slots.push({name:r.name, shift:s.shift||'8am', cap:s.cap||2, hat:r.hat||false});
    });
  });
  slots.forEach(function(s){
    var already = activeSlots.some(function(a){ return a.name===s.name && a.shift===s.shift; });
    if(already) return;
    activeSlots.push({id:Date.now()+Math.random(), name:s.name, capacity:s.cap||s.cap, shift:s.shift, hat:s.hat||false, assigned:[]});
  });
  if(activeSlots.length > 0){
    window._activeSlotsDate = date; // only stamp if slots actually loaded
  }
}

function activateShift(){
  // Validate required fields on custom slots before activating
  var missing = [];
  activeSlots.forEach(function(s){
    if(!s.custom) return;
    if(!s.liaison || !s.liaison.trim()) missing.push(s.name + ' — Liaison Name');
    if(!s.liaisonPhone || !s.liaisonPhone.trim()) missing.push(s.name + ' — Liaison Phone');
    if(!s.location || !s.location.trim()) missing.push(s.name + ' — Location');
  });
  if(missing.length > 0){
    var el = document.getElementById('bulk-result');
    if(el) el.innerHTML = '<div class="alert alert-danger" style="margin:0"><strong>Required fields missing on custom slots:</strong><br>' + missing.join('<br>') + '</div>';
    return;
  }

  var dateEl = document.getElementById('setup-date');
  var selectedDate = (dateEl ? dateEl.value : '') || currentDate;
  currentDate = selectedDate;

  // If no slots loaded yet, auto-load all approved slots for this date
  if(activeSlots.length === 0 && selectedDate){
    var autoSlots = SCHEDULE_2026[selectedDate] ? SCHEDULE_2026[selectedDate].slice() : [];
    committeeRequests.filter(function(r){
      return r.status==='approved' && !r.virtual &&
        r.shifts && r.shifts.some(function(s){ return !s.virtual && (s.date===selectedDate || s.all20); });
    }).forEach(function(r){
      r.shifts.filter(function(s){ return !s.virtual && (s.date===selectedDate || s.all20); }).forEach(function(s){
        var exists = autoSlots.some(function(x){ return x.name===r.name && x.shift===(s.shift||'8am'); });
        if(!exists) autoSlots.push({name:r.name, shift:s.shift||'8am', cap:s.cap||2, hat:r.hat||false});
      });
    });
    autoSlots.forEach(function(s){
      activeSlots.push({id:Date.now()+Math.random(), name:s.name, capacity:s.cap, shift:s.shift, hat:s.hat||false, assigned:[]});
    });
  }

  // Set active shift: always earliest shift that has slots
  var shiftCounts = {'8am':0, '12pm':0, '4pm':0};
  activeSlots.forEach(function(s){ if(shiftCounts[s.shift] !== undefined) shiftCounts[s.shift]++; });
  var shiftOrder = ['8am','12pm','4pm'];
  var chosenShift = null;
  for(var si = 0; si < shiftOrder.length; si++){
    if(shiftCounts[shiftOrder[si]] > 0){ chosenShift = shiftOrder[si]; break; }
  }
  currentShift = chosenShift || '8am';

  updateHeaderDate();
  saveStateNow();
  switchTab('officer', document.querySelector('.tab[onclick*="officer"]'));
  renderOfficer();
  window.scrollTo({top:0, behavior:'smooth'});
}




// ============================================================
// PERMISSIONS MANAGEMENT — admin-only settings screen
// ============================================================
function renderPermsTable(){
  var wrap = document.getElementById('perms-table-wrap');
  if(!wrap) return;
  var q          = ((document.getElementById('perms-search')||{}).value||'').toLowerCase().trim();
  var filter     = ((document.getElementById('perms-filter')||{}).value)||'all';
  var titleFilter= ((document.getElementById('perms-title-filter')||{}).value)||'all';

  // Populate title dropdown from unique adult titles
  var titleEl = document.getElementById('perms-title-filter');
  if(titleEl && titleEl.options.length <= 1){
    var titles = [];
    (adults||[]).forEach(function(a){ if(a.title && titles.indexOf(a.title) < 0) titles.push(a.title); });
    titles.sort();
    titles.forEach(function(t){
      var opt = document.createElement('option');
      opt.value = t; opt.textContent = t;
      titleEl.appendChild(opt);
    });
  }

  var PERM_VALS = ['admin','vc-slt','officer','scheduling'];
  var list = (adults||[]).filter(function(a){
    if(a.inactive) return false;
    if(q && !a.name.toLowerCase().includes(q) && !a.id.includes(q) && !(a.title||'').toLowerCase().includes(q)) return false;
    if(filter === 'permissioned' && !a.permission) return false;
    if(filter === 'none' && a.permission) return false;
    if(PERM_VALS.indexOf(filter) >= 0 && a.permission !== filter) return false;
    if(titleFilter !== 'all' && a.title !== titleFilter) return false;
    return true;
  });

  if(!list.length){ wrap.innerHTML = '<div style="color:#999;font-size:13px;padding:8px">No adults found.</div>'; return; }

  var PERM_OPTS = [
    {val:'', label:'Kiosk only'},
    {val:'admin', label:'Admin'},
    {val:'vc-slt', label:'VC / SLT'},
    {val:'officer', label:'Shift Officer'},
    {val:'scheduling', label:'Scheduling'}
  ];

  wrap.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:12px">' +
    '<thead><tr style="background:var(--navy);color:#fff">' +
      '<th style="padding:6px 8px;text-align:left;font-weight:600">Name</th>' +
      '<th style="padding:6px 8px;text-align:left;font-weight:600">Member #</th>' +
      '<th style="padding:6px 8px;text-align:left;font-weight:600">Title</th>' +
      '<th style="padding:6px 8px;text-align:left;font-weight:600">Permission</th>' +
      '<th style="padding:6px 8px;text-align:left;font-weight:600">Password</th>' +
      '<th style="padding:6px 8px;text-align:center;font-weight:600">Save</th>' +
    '</tr></thead><tbody>' +
    list.map(function(a, i){
      var bg = i % 2 === 0 ? '#fff' : 'var(--surface-2,#F8F9FA)';
      var permSel = PERM_OPTS.map(function(o){
        return '<option value="' + o.val + '"' + (a.permission === o.val || (!a.permission && o.val === '') ? ' selected' : '') + '>' + o.label + '</option>';
      }).join('');
      var needsPass = a.permission && a.permission !== 'officer';
      return '<tr style="background:' + bg + ';border-bottom:1px solid var(--gray-100)">' +
        '<td style="padding:6px 8px;font-weight:600;color:var(--navy)">' + a.name + '</td>' +
        '<td style="padding:6px 8px;color:#667788">' + a.id + '</td>' +
        '<td style="padding:6px 8px;color:#667788;font-size:11px">' + (a.title||'') + '</td>' +
        '<td style="padding:6px 8px"><select class="finput" id="perm-sel-' + a.id + '" style="font-size:11px;padding:3px 6px">' + permSel + '</select></td>' +
        '<td style="padding:6px 8px">' +
          (needsPass
            ? '<input type="password" class="finput" id="perm-pw-' + a.id + '" placeholder="New password (6+ chars)" style="font-size:11px;padding:3px 6px;min-width:160px">'
            : '<span style="color:#999;font-size:11px">Uses member #</span>') +
        '</td>' +
        '<td style="padding:6px 8px;text-align:center">' +
          '<button class="btn btn-primary" style="font-size:11px;padding:4px 10px" onclick="saveAdultPerm(\'' + a.id + '\')">Save</button>' +
        '</td>' +
      '</tr>';
    }).join('') +
    '</tbody></table>';
}

function saveAdultPerm(adultId){
  var selEl = document.getElementById('perm-sel-' + adultId);
  var pwEl  = document.getElementById('perm-pw-' + adultId);
  var msg   = document.getElementById('perms-msg');
  if(!selEl) return;

  var newPerm = selEl.value || null;
  var newPass = pwEl ? pwEl.value.trim() : '';

  // Validate password if required
  var needsPass = newPerm && newPerm !== 'officer';
  if(needsPass && newPass && newPass.length < 6){
    if(msg) msg.innerHTML = '<span style="color:#CC0000">Password must be at least 6 characters.</span>';
    return;
  }

  if(msg) msg.textContent = 'Saving...';

  var payload = {adultId: adultId, newPermission: newPerm};
  if(needsPass && newPass) payload.newPassword = newPass;

  fetch('/.netlify/functions/set-password', {
    method: 'POST',
    headers: {'Content-Type':'application/json','x-api-token': API_TOKEN},
    body: JSON.stringify(payload)
  }).then(function(r){ return r.json(); }).then(function(d){
    if(d.ok){
      // Update local adult object
      var ad = adults.find(function(a){ return a.id === adultId; });
      if(ad){ ad.permission = newPerm; }
      if(pwEl) pwEl.value = '';
      if(msg) msg.innerHTML = '<span style="color:#2A7D2A">&#10003; Saved.</span>';
      setTimeout(function(){ if(msg) msg.textContent = ''; renderPermsTable(); }, 1500);
    } else {
      if(msg) msg.innerHTML = '<span style="color:#CC0000">Error: ' + (d.error||'Save failed') + '</span>';
    }
  }).catch(function(e){
    if(msg) msg.innerHTML = '<span style="color:#CC0000">Connection error.</span>';
  });
}

// ============================================================
// ADULT CLOCK OUT — manual clock out from dashboard
// ============================================================
function adultClockOut(adultId){
  var ad = adults.find(function(a){ return a.id === adultId; });
  if(!ad) return;
  var nowStr = new Date().toLocaleTimeString('en-US', {hour:'numeric', minute:'2-digit'});
  var log = ad.shiftLog && ad.shiftLog[ad.shiftLog.length - 1];
  if(log && !log.out){
    log.out = nowStr;
    log.role = ad.boardRole || 'mentor'; // save role at clock-out time
  }
  ad.clockedIn = false;
  ad.clockInTime = null;
  ad.boardRole = null;
  saveStateNow();
  renderOfficer();
  showAlert(ad.name + ' clocked out at ' + nowStr + '.', 'info');
}

// ============================================================
// COLLAPSIBLE SETTINGS SECTIONS
// ============================================================
function saveAllAdultPerms(){
  var msg = document.getElementById('perms-msg');
  if(msg) msg.textContent = 'Saving...';
  var wrap = document.getElementById('perms-table-wrap');
  if(!wrap) return;
  var selects = wrap.querySelectorAll('[id^="perm-sel-"]');
  var promises = [];
  var saved = 0, errors = 0;

  selects.forEach(function(sel){
    var adultId = sel.id.replace('perm-sel-', '');
    var newPerm = sel.value || null;
    var pwEl = document.getElementById('perm-pw-' + adultId);
    var newPass = pwEl ? pwEl.value.trim() : '';
    var needsPass = newPerm && newPerm !== 'officer';
    if(needsPass && newPass && newPass.length < 6){ errors++; return; }

    var payload = {adultId: adultId, newPermission: newPerm};
    if(needsPass && newPass) payload.newPassword = newPass;

    var ad = adults.find(function(a){ return a.id === adultId; });
    var p = fetch('/.netlify/functions/set-password', {
      method: 'POST',
      headers: {'Content-Type':'application/json','x-api-token': API_TOKEN},
      body: JSON.stringify(payload)
    }).then(function(r){ return r.json(); }).then(function(d){
      if(d.ok){
        if(ad){ ad.permission = newPerm; }
        if(pwEl) pwEl.value = '';
        saved++;
      } else { errors++; }
    }).catch(function(){ errors++; });
    promises.push(p);
  });

  Promise.all(promises).then(function(){
    if(msg){
      if(errors > 0)
        msg.innerHTML = '<span style="color:#CC0000">&#10003; ' + saved + ' saved, ' + errors + ' failed (passwords must be 6+ chars).</span>';
      else
        msg.innerHTML = '<span style="color:#2A7D2A">&#10003; All ' + saved + ' saved successfully.</span>';
      setTimeout(function(){ if(msg) msg.textContent = ''; renderPermsTable(); }, 2000);
    }
  });
}

function toggleSection(id){
  var body = document.getElementById(id);
  var arrow = document.getElementById(id + '-arrow');
  if(!body) return;
  var open = body.style.display !== 'none';
  body.style.display = open ? 'none' : 'block';
  if(arrow) arrow.innerHTML = open ? '&#9660;' : '&#9650;';
  if(!open && id === 'sec-perms') renderPermsTable();
}

// ============================================================
// INDIVIDUAL MEMBER REPORT — printable profile for one junior or adult
// ============================================================
function openMemberReportPicker(){
  var modal = document.getElementById('member-report-modal');
  if(!modal){
    modal = document.createElement('div');
    modal.id = 'member-report-modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,16,40,.6);display:flex;align-items:flex-start;justify-content:center;padding:40px 20px;overflow-y:auto';
    modal.onclick = function(e){ if(e.target===modal) closeMemberReport(); };
    document.body.appendChild(modal);
  }

  var allMembers = juniors.filter(function(j){ return !j.inactive; })
    .sort(function(a,b){ return a.name.localeCompare(b.name); });
  var adultMembers = (adults||[]).filter(function(a){ return !a.inactive; })
    .sort(function(a,b){ return a.name.localeCompare(b.name); });

  modal.innerHTML = '<div style="background:#fff;border-radius:12px;width:100%;max-width:480px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.25)">' +
    '<div style="background:var(--navy);padding:16px 20px;display:flex;align-items:center;justify-content:space-between">' +
      '<div style="color:#fff;font-weight:700;font-size:16px">&#128438; Print Member Record</div>' +
      '<button onclick="closeMemberReport()" style="background:rgba(255,255,255,.15);border:none;color:#fff;font-size:18px;width:30px;height:30px;border-radius:50%;cursor:pointer;line-height:1">&times;</button>' +
    '</div>' +
    '<div style="padding:20px">' +
      '<div style="font-size:13px;font-weight:600;color:var(--navy);margin-bottom:8px">Select member:</div>' +
      '<input type="text" id="rpt-member-search" class="finput" placeholder="Type name to search..." style="width:100%;margin-bottom:8px" oninput="filterMemberReportList()">' +
      '<select id="rpt-member-select" class="finput" size="8" style="width:100%;margin-bottom:16px;height:180px">' +
        '<optgroup label="Juniors">' +
          allMembers.map(function(m){ return '<option value="' + m.id + '|junior">' + m.name + ' (' + m.id + ')</option>'; }).join('') +
        '</optgroup>' +
        '<optgroup label="Adults">' +
          adultMembers.map(function(m){ return '<option value="' + m.id + '|adult">' + m.name + ' (' + m.id + ')</option>'; }).join('') +
        '</optgroup>' +
      '</select>' +
      '<div style="font-size:13px;font-weight:600;color:var(--navy);margin-bottom:8px">Include in report:</div>' +
      '<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">' +
        '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px"><input type="checkbox" id="rpt-inc-contact" checked style="width:16px;height:16px;accent-color:var(--navy)"> Contact Information</label>' +
        '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px"><input type="checkbox" id="rpt-inc-hours" checked style="width:16px;height:16px;accent-color:var(--navy)"> Shifts Worked &amp; Hours</label>' +
        '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px"><input type="checkbox" id="rpt-inc-history" style="width:16px;height:16px;accent-color:var(--navy)"> Committee History (juniors only)</label>' +
        '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px"><input type="checkbox" id="rpt-inc-notes" style="width:16px;height:16px;accent-color:var(--navy)"> Manager Notes</label>' +
      '</div>' +
      '<div style="display:flex;gap:8px">' +
        '<button class="btn btn-primary" style="flex:1" onclick="printMemberReportFromPicker()">&#128438; Print Report</button>' +
        '<button class="btn" onclick="closeMemberReport()">Cancel</button>' +
      '</div>' +
    '</div>' +
  '</div>';

  modal.style.display = 'flex';
}

function filterMemberReportList(){
  var q = (document.getElementById('rpt-member-search').value||'').toLowerCase();
  var sel = document.getElementById('rpt-member-select');
  if(!sel) return;
  Array.from(sel.options).forEach(function(opt){
    opt.style.display = (!q || opt.text.toLowerCase().indexOf(q) >= 0) ? '' : 'none';
  });
}

function printMemberReportFromPicker(){
  var sel = document.getElementById('rpt-member-select');
  if(!sel || !sel.value){ showAlert('Please select a member first.', 'warn'); return; }
  var parts = sel.value.split('|');
  printMemberReport(parts[0], parts[1] === 'adult');
}

function openMemberReport(memberId, isAdult){
  openMemberReportPicker();
}
function closeMemberReport(){
  var modal = document.getElementById('member-report-modal');
  if(modal) modal.style.display = 'none';
}

function printMemberReport(memberId, isAdult){
  var member = isAdult
    ? (adults||[]).find(function(a){ return a.id === memberId; })
    : juniors.find(function(j){ return j.id === memberId; });
  if(!member) return;

  var incContact  = document.getElementById('rpt-inc-contact')  && document.getElementById('rpt-inc-contact').checked;
  var incHours    = document.getElementById('rpt-inc-hours')     && document.getElementById('rpt-inc-hours').checked;
  var incHistory  = document.getElementById('rpt-inc-history')   && document.getElementById('rpt-inc-history') && document.getElementById('rpt-inc-history').checked;
  var incNotes    = document.getElementById('rpt-inc-notes')     && document.getElementById('rpt-inc-notes').checked;

  var NOTE_LABELS = {
    'noshow-nocall':'NO SHOW: No Call','noshow-prior':'NO SHOW: Called Prior to Shift Date',
    'noshow-dayof':'NO SHOW: Called Day of Shift','incident':'Incident on Shift','note':'Additional Information'
  };
  var NOTE_COLORS = {'noshow-nocall':'#CC0000','noshow-prior':'#E65100','noshow-dayof':'#BF360C','incident':'#6A1B9A','note':'#002E5D'};

  var shiftLog = Array.isArray(member.shiftLog) ? member.shiftLog : [];
  var noteLog  = Array.isArray(member.noteLog)  ? member.noteLog  : [];
  var history  = Array.isArray(member.history)  ? member.history  : [];

  var totalHrs = shiftLog.reduce(function(s,e){ return s + (e.noshow ? 0 : (e.hours||4)); }, 0);

  var html = '<div style="font-family:\'DM Sans\',sans-serif;padding:32px;max-width:700px;margin:0 auto;color:#334455">';

  // Header
  html += '<div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:16px;border-bottom:3px solid #002E5D;margin-bottom:20px">' +
    '<div>' +
      '<div style="font-size:11px;color:#667788;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Houston Livestock Show & Rodeo &mdash; Jr. Rodeo Committee</div>' +
      '<div style="font-size:26px;font-weight:700;color:#002E5D;margin-bottom:2px">' + member.name + '</div>' +
      '<div style="font-size:13px;color:#667788">Member #' + member.id + (member.title ? ' &bull; ' + member.title : '') + (member.ageout ? ' &bull; &#11088; Age-Out' : '') + '</div>' +
    '</div>' +
    '<div style="text-align:right;font-size:11px;color:#8899AA">Printed ' + new Date().toLocaleDateString() + '</div>' +
  '</div>';

  // Contact
  if(incContact){
    html += '<div style="margin-bottom:20px">' +
      '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#8899AA;margin-bottom:8px">Contact Information</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
        (member.phone ? '<div style="background:#F8F9FA;border-radius:6px;padding:8px 12px"><div style="font-size:10px;color:#8899AA;margin-bottom:2px">Phone</div><div style="font-size:13px">' + member.phone + '</div></div>' : '') +
        (member.email ? '<div style="background:#F8F9FA;border-radius:6px;padding:8px 12px"><div style="font-size:10px;color:#8899AA;margin-bottom:2px">Email</div><div style="font-size:13px">' + member.email + '</div></div>' : '') +
      '</div>' +
    '</div>';
  }

  // Hours / shifts
  if(incHours){
    html += '<div style="margin-bottom:20px">' +
      '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#8899AA;margin-bottom:8px">Shifts & Hours</div>' +
      '<div style="display:flex;gap:12px;margin-bottom:10px">' +
        '<div style="background:#F0F4FF;border-radius:6px;padding:10px 16px;text-align:center"><div style="font-size:22px;font-weight:700;color:#002E5D">' + totalHrs + '</div><div style="font-size:10px;color:#667788">Total Hours</div></div>' +
        '<div style="background:#F0F4FF;border-radius:6px;padding:10px 16px;text-align:center"><div style="font-size:22px;font-weight:700;color:#002E5D">' + shiftLog.filter(function(e){ return !e.noshow; }).length + '</div><div style="font-size:10px;color:#667788">Shifts Worked</div></div>' +
      '</div>' +
      (shiftLog.length ? '<table style="width:100%;border-collapse:collapse;font-size:12px">' +
        '<thead><tr style="background:#002E5D;color:#fff">' +
          '<th style="padding:6px 10px;text-align:left">Date</th>' +
          '<th style="padding:6px 10px;text-align:left">Shift</th>' +
          (isAdult ? '<th style="padding:6px 10px;text-align:left">Role</th>' : '<th style="padding:6px 10px;text-align:left">Committee</th>') +
          '<th style="padding:6px 10px;text-align:left">Hours</th>' +
        '</tr></thead><tbody>' +
        shiftLog.map(function(e,i){
          var bg = i%2===0?'#fff':'#F8F9FA';
          var ROLE_LABELS = {vc:'VC on Shift', so:'Shift Officer', mentor:'Mentor'};
          return '<tr style="background:' + bg + '">' +
            '<td style="padding:5px 10px">' + (e.date||'') + '</td>' +
            '<td style="padding:5px 10px">' + (SL[e.shift]||e.shift||'') + '</td>' +
            (isAdult ? '<td style="padding:5px 10px">' + (ROLE_LABELS[e.role]||e.role||'Mentor') + '</td>' : '<td style="padding:5px 10px">' + (e.committee||'') + '</td>') +
            '<td style="padding:5px 10px;' + (e.noshow?'color:#CC0000':'') + '">' + (e.noshow?'No-Show':(e.hours||4)+' hrs') + '</td>' +
          '</tr>';
        }).join('') +
        '</tbody></table>' : '<div style="font-size:12px;color:#8899AA;font-style:italic">No shifts recorded yet.</div>') +
    '</div>';
  }

  // Committee history (juniors only)
  if(incHistory && !isAdult && history.length){
    html += '<div style="margin-bottom:20px">' +
      '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#8899AA;margin-bottom:8px">Committee History</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:6px">' +
        history.map(function(h){ return '<span style="background:#F0F4FF;color:#002E5D;font-size:12px;padding:3px 10px;border-radius:20px">' + h + '</span>'; }).join('') +
      '</div>' +
    '</div>';
  }

  // Manager notes
  if(incNotes){
    html += '<div style="margin-bottom:20px">' +
      '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#8899AA;margin-bottom:8px">Manager Notes</div>' +
      (noteLog.length === 0
        ? '<div style="font-size:12px;color:#8899AA;font-style:italic">No manager notes on file.</div>'
        : noteLog.map(function(e){
            var d = new Date(e.ts);
            var ds = (d.getMonth()+1)+'/'+d.getDate()+'/'+d.getFullYear();
            var color = NOTE_COLORS[e.type] || '#002E5D';
            var label = NOTE_LABELS[e.type] || e.type || 'Note';
            return '<div style="border-left:3px solid ' + color + ';padding:8px 12px;margin-bottom:8px;background:#F8FAFC;border-radius:0 6px 6px 0">' +
              '<div style="display:flex;justify-content:space-between;margin-bottom:4px">' +
                '<span style="font-size:11px;font-weight:700;color:' + color + ';text-transform:uppercase">' + label + '</span>' +
                '<span style="font-size:11px;color:#8899AA">' + ds + (e.by ? ' &mdash; by ' + e.by : '') + '</span>' +
              '</div>' +
              '<div style="font-size:13px">' + (e.text||'') + '</div>' +
            '</div>';
          }).join('')
      ) +
    '</div>';
  }

  html += '<div style="font-size:10px;color:#8899AA;text-align:center;margin-top:20px;padding-top:12px;border-top:1px solid #eee">JRC Assignment System &mdash; jrc.hlsr.app &mdash; Confidential</div>';
  html += '</div>';

  // Print via iframe
  var iframe = document.getElementById('print-iframe');
  if(!iframe){
    iframe = document.createElement('iframe');
    iframe.id = 'print-iframe';
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none';
    document.body.appendChild(iframe);
  }
  var doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open();
  doc.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Member Report - ' + member.name + '</title><style>@media print{body{margin:0}} body{font-family:"DM Sans",sans-serif}</style></head><body>' + html + '</body></html>');
  doc.close();
  iframe.contentWindow.focus();
  setTimeout(function(){ iframe.contentWindow.print(); closeMemberReport(); }, 300);
}

