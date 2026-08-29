// JRC Assignment System — app-requests.js
// Committee request form, request approvals, filter system, email confirmation
// ============================================================
// COMMITTEE REQUEST FORM
// ============================================================

var specificShiftCount = 0;

function validatePhone(el){
  var digits = el.value.replace(/\D/g, '');
  var errEl = document.getElementById(el.id + '-err');
  if(el.value.trim() === ''){
    el.classList.remove('input-err','input-ok');
    if(errEl) errEl.style.display = 'none';
    return;
  }
  if(digits.length === 10){
    el.classList.remove('input-err');
    el.classList.add('input-ok');
    if(errEl) errEl.style.display = 'none';
  } else {
    el.classList.remove('input-ok');
    el.classList.add('input-err');
    if(errEl){
      errEl.textContent = digits.length < 10 ? 'Too short — must be 10 digits' : 'Too long — must be 10 digits';
      errEl.style.display = 'block';
    }
  }
}

var currentReqType = 'showtime';
var psRowCount = 1;

function setReqType(type){
  currentReqType = type;
  var showEl = document.getElementById('rf-showtime-section');
  var preEl  = document.getElementById('rf-preshow-section');
  var btnShow = document.getElementById('rf-btn-showtime');
  var btnPre  = document.getElementById('rf-btn-preshow');

  if(type === 'showtime'){
    showEl.style.display = 'block';
    preEl.style.display  = 'none';
    btnShow.style.background   = 'var(--navy)';
    btnShow.style.color        = '#fff';
    btnShow.style.borderColor  = 'var(--navy)';
    btnPre.style.background    = '#fff';
    btnPre.style.color         = 'var(--navy)';
    btnPre.style.borderColor   = 'var(--gray-200)';
  } else {
    showEl.style.display = 'none';
    preEl.style.display  = 'block';
    btnPre.style.background    = 'var(--navy)';
    btnPre.style.color         = '#fff';
    btnPre.style.borderColor   = 'var(--navy)';
    btnShow.style.background   = '#fff';
    btnShow.style.color        = 'var(--navy)';
    btnShow.style.borderColor  = 'var(--gray-200)';
  }
}

function removePsRow(id){
  var row = document.getElementById('rf-ps-row-' + id);
  if(row) row.remove();
}

function addPsRow(){
  psRowCount++;
  var id = psRowCount;
  var container = document.getElementById('rf-ps-rows');
  var div = document.createElement('div');
  div.className = 'rf-ps-row';
  div.id = 'rf-ps-row-' + id;
  div.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:10px;align-items:flex-end;margin-bottom:10px';
  var timeOpts = ['6:00 AM','6:30 AM','7:00 AM','7:30 AM','8:00 AM','8:30 AM','9:00 AM','9:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM','12:00 PM','12:30 PM','1:00 PM','1:30 PM','2:00 PM','2:30 PM','3:00 PM','3:30 PM','4:00 PM','4:30 PM','5:00 PM','5:30 PM','6:00 PM'];
  var endOpts = ['6:30 AM','7:00 AM','7:30 AM','8:00 AM','8:30 AM','9:00 AM','9:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM','12:00 PM','12:30 PM','1:00 PM','1:30 PM','2:00 PM','2:30 PM','3:00 PM','3:30 PM','4:00 PM','4:30 PM','5:00 PM','5:30 PM','6:00 PM','6:30 PM','7:00 PM','7:30 PM','8:00 PM','8:30 PM','9:00 PM','9:30 PM','10:00 PM'];
  div.innerHTML =
    '<div><div class="form-lbl">Date</div><input class="finput" type="date" id="rf-ps-date-' + id + '"></div>' +
    '<div><div class="form-lbl">Start Time</div><select class="finput" id="rf-ps-start-' + id + '"><option value="">-- Select --</option>' +
      timeOpts.map(function(t){ return '<option>' + t + '</option>'; }).join('') + '</select></div>' +
    '<div><div class="form-lbl">End Time</div><select class="finput" id="rf-ps-end-' + id + '"><option value="">-- Select --</option>' +
      endOpts.map(function(t){ return '<option>' + t + '</option>'; }).join('') + '</select></div>' +
    '<div style="display:flex;flex-direction:column"><div class="form-lbl">Juniors</div>' +
      '<div style="display:flex;align-items:center;gap:6px"><input class="finput" type="number" id="rf-ps-cap-' + id + '" min="1" max="40" value="4" style="width:70px">' +
      '<button class="btn" onclick="removePsRow(' + id + ')" style="padding:4px 8px;color:var(--red);border-color:var(--red)">&#x2715;</button></div></div>';
  container.appendChild(div);
}

function toggleAll20(){
  var checked = document.getElementById('rf-all20').checked;
  document.getElementById('rf-all20-section').style.display = checked ? 'block' : 'none';
  document.getElementById('rf-specific-section').style.display = checked ? 'none' : 'block';
}

function addSpecificShift(){
  specificShiftCount++;
  var id = specificShiftCount;
  var showDates = [];
  for(var d = 0; d < 19; d++){
    // Use UTC methods to avoid timezone rollback to Mar 1
    var dt = new Date(Date.UTC(2027, 2, 2 + d));
    var m = dt.getUTCMonth() + 1;
    var day = dt.getUTCDate();
    var dateVal = '2027-' + String(m).padStart(2,'0') + '-' + String(day).padStart(2,'0');
    showDates.push({val: dateVal,
                    lbl: 'Mar ' + day});
  }
  var row = document.createElement('div');
  row.className = 'specific-shift-row';
  row.id = 'shift-row-' + id;
  row.innerHTML =
    '<select class="finput" id="sr-date-' + id + '" style="font-size:12px;padding:4px 6px" onchange="checkMar20(' + id + ')">' +
      showDates.map(function(d){ return '<option value="' + d.val + '">' + d.lbl + '</option>'; }).join('') +
    '</select>' +
    '<select class="finput" id="sr-shift-' + id + '" style="font-size:12px;padding:4px 6px">' +
      '<option value="8am">8am &ndash; 12pm</option>' +
      '<option value="12pm" selected>12pm &ndash; 4pm</option>' +
      '<option value="4pm">4pm &ndash; 8pm</option>' +
    '</select>' +
    '<div style="display:flex;align-items:center;gap:6px"><span style="font-size:12px;color:#667788">Juniors:</span>' +
    '<input class="finput" type="number" id="sr-cap-' + id + '" min="1" max="40" value="4" style="width:60px;padding:4px 6px"></div>' +
    '<button class="btn btn-sm btn-danger" onclick="removeShiftRow(' + id + ')">&#x2715;</button>';
  document.getElementById('rf-specific-list').appendChild(row);
  checkMar20(id);
}

function removeShiftRow(id){
  var row = document.getElementById('shift-row-' + id);
  if(row) row.remove();
}

function checkMar20(id){
  var dateEl = document.getElementById('sr-date-' + id);
  var shiftEl = document.getElementById('sr-shift-' + id);
  if(!dateEl || !shiftEl) return;
  var is20 = dateEl.value === '2027-03-20';
  // Remove or restore the 4pm option
  var has4pm = false;
  for(var i = 0; i < shiftEl.options.length; i++){
    if(shiftEl.options[i].value === '4pm'){ has4pm = true; break; }
  }
  if(is20 && has4pm){
    if(shiftEl.value === '4pm') shiftEl.value = '12pm';
    for(var i = 0; i < shiftEl.options.length; i++){
      if(shiftEl.options[i].value === '4pm'){ shiftEl.remove(i); break; }
    }
  } else if(!is20 && !has4pm){
    var opt = document.createElement('option');
    opt.value = '4pm';
    opt.text = '4pm – 8pm';
    shiftEl.appendChild(opt);
  }
}

function renderReqForm(){
  // Reset form
  ['rf-name','rf-chair','rf-chair-phone','rf-chair-email','rf-liaison','rf-liaison-phone',
   'rf-liaison-email','rf-location','rf-duties','rf-notes'].forEach(function(id){
    var el = document.getElementById(id);
    if(el) el.value = '';
  });
  var hat = document.getElementById('rf-hat'); if(hat) hat.checked = false;
  var all20 = document.getElementById('rf-all20'); if(all20) all20.checked = false;
  ['rf-s1-check','rf-s2-check','rf-s3-check'].forEach(function(id){
    var el = document.getElementById(id); if(el) el.checked = false;
  });
  document.getElementById('rf-all20-section').style.display = 'none';
  document.getElementById('rf-specific-section').style.display = 'block';
  document.getElementById('rf-specific-list').innerHTML = '';
  specificShiftCount = 0;
  var msg = document.getElementById('rf-submit-msg'); if(msg) msg.innerHTML = '';
  // Reset type to showtime
  currentReqType = 'showtime';
  psRowCount = 1;
  try { setReqType('showtime'); } catch(e){}
  // Reset pre-show rows
  var psRows = document.getElementById('rf-ps-rows');
  if(psRows) psRows.innerHTML = '<div class="rf-ps-row" style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:10px;align-items:flex-end;margin-bottom:10px" id="rf-ps-row-1">' +
    '<div><div class="form-lbl">Date *</div><input class="finput" type="date" id="rf-ps-date-1"></div>' +
    '<div><div class="form-lbl">Start Time *</div><select class="finput" id="rf-ps-start-1"><option value="">-- Select --</option>' +
    ['6:00 AM','6:30 AM','7:00 AM','7:30 AM','8:00 AM','8:30 AM','9:00 AM','9:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM','12:00 PM','12:30 PM','1:00 PM','1:30 PM','2:00 PM','2:30 PM','3:00 PM','3:30 PM','4:00 PM','4:30 PM','5:00 PM','5:30 PM','6:00 PM'].map(function(t){ return '<option>'+t+'</option>';}).join('') +
    '</select></div><div><div class="form-lbl">End Time *</div><select class="finput" id="rf-ps-end-1"><option value="">-- Select --</option>' +
    ['6:30 AM','7:00 AM','7:30 AM','8:00 AM','8:30 AM','9:00 AM','9:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM','12:00 PM','12:30 PM','1:00 PM','1:30 PM','2:00 PM','2:30 PM','3:00 PM','3:30 PM','4:00 PM','4:30 PM','5:00 PM','5:30 PM','6:00 PM','6:30 PM','7:00 PM','7:30 PM','8:00 PM','8:30 PM','9:00 PM','9:30 PM','10:00 PM'].map(function(t){ return '<option>'+t+'</option>';}).join('') +
    '</select></div><div><div class="form-lbl">Juniors</div><input class="finput" type="number" id="rf-ps-cap-1" min="1" max="40" value="4" style="width:70px"></div></div>';
  // Add one blank shift row by default
  addSpecificShift();
}

function submitRequest(){
  // Honeypot check — bots fill this hidden field, humans don't
  var _hp = document.getElementById('rf-website');
  if(_hp && _hp.value.trim().length > 0){ return; } // silently reject

  var name = (document.getElementById('rf-name').value || '').trim();
  var chair = (document.getElementById('rf-chair').value || '').trim();
  var chairPhone = (document.getElementById('rf-chair-phone').value || '').trim();
  var chairEmail = (document.getElementById('rf-chair-email').value || '').trim();
  var liaison = (document.getElementById('rf-liaison').value || '').trim();
  var liaisonPhone = (document.getElementById('rf-liaison-phone').value || '').trim();
  var liaisonEmail = (document.getElementById('rf-liaison-email').value || '').trim();
  var location = (document.getElementById('rf-location').value || '').trim();
  var duties = (document.getElementById('rf-duties').value || '').trim();
  var notes = (document.getElementById('rf-notes').value || '').trim();
  var hat = document.getElementById('rf-hat').checked;
  var msg = document.getElementById('rf-submit-msg');

  // Highlight missing required fields
  var requiredMap = {
    'rf-name': name, 'rf-chair': chair, 'rf-chair-phone': chairPhone,
    'rf-chair-email': chairEmail, 'rf-liaison': liaison,
    'rf-liaison-phone': liaisonPhone, 'rf-liaison-email': liaisonEmail,
    'rf-location': location, 'rf-duties': duties
  };
  var missing = false;
  Object.keys(requiredMap).forEach(function(id){
    var el = document.getElementById(id);
    if(!el) return;
    if(!requiredMap[id]){
      el.style.borderColor = '#CC0000';
      el.style.background = '#FFF5F5';
      missing = true;
    } else {
      el.style.borderColor = '';
      el.style.background = '';
    }
  });
  if(missing){
    msg.innerHTML = '<div class="alert alert-danger">Please fill in all required fields highlighted in red.</div>';
    msg.scrollIntoView({behavior:'smooth',block:'nearest'});
    return;
  }

  // Minimum length checks — catch single-character entries that pass the empty check
  if(name.length < 2){
    msg.innerHTML = '<div class="alert alert-danger">Committee name must be at least 2 characters.</div>';
    document.getElementById('rf-name').focus();
    return;
  }
  if(chair.length < 2){
    msg.innerHTML = '<div class="alert alert-danger">Chairman name must be at least 2 characters.</div>';
    document.getElementById('rf-chair').focus();
    return;
  }
  if(liaison.length < 2){
    msg.innerHTML = '<div class="alert alert-danger">Day of contact name must be at least 2 characters.</div>';
    document.getElementById('rf-liaison').focus();
    return;
  }
  if(location.length < 5){
    msg.innerHTML = '<div class="alert alert-danger">Location must be at least 5 characters — please describe where juniors should report.</div>';
    document.getElementById('rf-location').focus();
    return;
  }
  if(duties.length < 10){
    msg.innerHTML = '<div class="alert alert-danger">Please describe what juniors will be doing (at least 10 characters).</div>';
    document.getElementById('rf-duties').focus();
    return;
  }

  var cpDigits = chairPhone.replace(/\D/g,'');
  var lpDigits = liaisonPhone.replace(/\D/g,'');
  if(cpDigits.length !== 10){
    msg.innerHTML = '<div class="alert alert-danger">Chairman phone number must be 10 digits.</div>';
    document.getElementById('rf-chair-phone').focus();
    return;
  }
  if(lpDigits.length !== 10){
    msg.innerHTML = '<div class="alert alert-danger">Liaison phone number must be 10 digits.</div>';
    document.getElementById('rf-liaison-phone').focus();
    return;
  }

  var all20 = currentReqType === 'showtime' ? document.getElementById('rf-all20').checked : false;
  var shifts = [];
  var preshow = currentReqType === 'preshow';

  if(preshow){
    // Collect pre-show rows
    var psRowEls = document.getElementById('rf-ps-rows').querySelectorAll('.rf-ps-row');
    psRowEls.forEach(function(row){
      var rid = row.id.replace('rf-ps-row-','');
      var dt  = document.getElementById('rf-ps-date-'  + rid);
      var st  = document.getElementById('rf-ps-start-' + rid);
      var en  = document.getElementById('rf-ps-end-'   + rid);
      var cp  = document.getElementById('rf-ps-cap-'   + rid);
      if(dt && st && en && dt.value && st.value && en.value){
        shifts.push({preshow:true, date:dt.value, startTime:st.value, endTime:en.value, cap:parseInt(cp&&cp.value)||4});
      }
    });
    if(!shifts.length){
      msg.innerHTML = '<div class="alert alert-danger">Please fill in at least one date and time for the pre-show request.</div>';
      return;
    }
  } else {

  if(all20){
    var s1 = document.getElementById('rf-s1-check').checked;
    var s2 = document.getElementById('rf-s2-check').checked;
    var s3 = document.getElementById('rf-s3-check').checked;
    if(!s1 && !s2 && !s3){
      msg.innerHTML = '<div class="alert alert-danger">Please select at least one shift time.</div>';
      return;
    }
    if(s1) shifts.push({all20:true, shift:'8am', cap:parseInt(document.getElementById('rf-s1-cap').value)||4});
    if(s2) shifts.push({all20:true, shift:'12pm', cap:parseInt(document.getElementById('rf-s2-cap').value)||4});
    if(s3) shifts.push({all20:true, shift:'4pm', cap:parseInt(document.getElementById('rf-s3-cap').value)||4});
  } else {
    var rows = document.getElementById('rf-specific-list').children;
    for(var i = 0; i < rows.length; i++){
      var rowId = rows[i].id.replace('shift-row-','');
      var date = document.getElementById('sr-date-' + rowId).value;
      var shift = document.getElementById('sr-shift-' + rowId).value;
      var cap = parseInt(document.getElementById('sr-cap-' + rowId).value) || 4;
      shifts.push({all20:false, date:date, shift:shift, cap:cap});
    }
    if(!shifts.length){
      msg.innerHTML = '<div class="alert alert-danger">Please add at least one shift.</div>';
      return;
    }
  } } // end showtime; end preshow block

  var req = {
    id: Date.now(),
    submittedAt: new Date().toISOString(),
    status: 'pending',
    name:name, chair:chair, chairPhone:chairPhone, chairEmail:chairEmail,
    liaison:liaison, liaisonPhone:liaisonPhone, liaisonEmail:liaisonEmail,
    location:location, duties:duties, notes:notes, hat:hat,
    all20:all20, preshow:preshow, shifts:shifts,
    schedulingNotes: ''
  };
  committeeRequests.unshift(req);

  // Save to Neon immediately
  var reqMsg = document.getElementById('rf-submit-msg');
  fetch('/.netlify/functions/state', {
    method: 'POST',
    headers: {'Content-Type':'application/json','x-api-token':API_TOKEN},
    body: JSON.stringify({committeeRequests:[req], batchMode:true})
  }).then(function(r){
    if(!r.ok){
      r.text().then(function(t){
        console.error('[JRC] Request save HTTP error:', r.status, t);
        if(reqMsg) reqMsg.innerHTML += '<div style="color:#CC0000;font-size:12px;margin-top:4px">Warning: save error ' + r.status + ' — ' + t.slice(0,80) + '</div>';
      });
    } else {
      console.log('[JRC] Request saved to Neon ok, id:', req.id);
    }
  }).catch(function(e){
    console.warn('[JRC] Request save failed:', e.message);
    if(reqMsg) reqMsg.innerHTML += '<div style="color:#CC0000;font-size:12px;margin-top:4px">Warning: could not connect to save request.</div>';
  });

  // Send confirmation emails (fire-and-forget — don't block the success UX)
  fetch('/.netlify/functions/send-email', {
    method: 'POST',
    headers: {'Content-Type':'application/json','x-api-token':API_TOKEN},
    body: JSON.stringify({request: req})
  }).then(function(r){
    return r.json().then(function(d){
      if(!r.ok || !d.ok){
        console.warn('[JRC] Email send issue:', d);
      } else {
        console.log('[JRC] Confirmation emails sent ok');
      }
    });
  }).catch(function(e){
    console.warn('[JRC] Email send failed (non-blocking):', e.message);
  });

  msg.innerHTML = '<div class="alert alert-success">&#10003; Request submitted! A confirmation email has been sent to ' + (chairEmail || 'your email') + '.</div>';

  // If in partner mode, show a done screen
  var partnerHeader = document.getElementById('partner-header');
  if(partnerHeader && partnerHeader.style.display !== 'none'){
    setTimeout(function(){
      msg.innerHTML = '<div style="text-align:center;padding:24px">' +
        '<div style="font-size:40px;margin-bottom:12px">&#10003;</div>' +
        '<div style="font-size:18px;font-weight:700;color:var(--navy);margin-bottom:8px">Request Submitted!</div>' +
        '<div style="font-size:14px;color:#667788;margin-bottom:20px">The JRC scheduling team will be in touch if they have questions.</div>' +
        '<button class="btn btn-primary" onclick="partnerSubmitAnother()">&#43; Submit Another Request</button>' +
        '</div>';
    }, 1500);
  } else {
    setTimeout(function(){ renderReqForm(); }, 2000);
  }
}

// ============================================================
// REQUEST APPROVALS
// ============================================================

function toggleReqDateLookup(){
  var body = document.getElementById('req-date-lookup-body');
  var icon = document.getElementById('req-date-lookup-toggle');
  if(!body) return;
  var open = body.style.display !== 'none';
  if(!open){
    // Populate date picker on first open
    initReqDateLookupPicker();
  }
  body.style.display = open ? 'none' : 'block';
  if(icon) icon.innerHTML = open ? '&#9660; Show' : '&#9650; Hide';
}

function initReqDateLookupPicker(){
  var sel = document.getElementById('req-date-lookup-sel');
  if(!sel || sel.options.length > 1) return; // already populated
  // Collect all unique dates from approved requests + SCHEDULE_2026
  var dateSet = {};
  Object.keys(SCHEDULE_2026).forEach(function(d){ dateSet[d] = true; });
  committeeRequests.filter(function(r){ return r.status === 'approved'; }).forEach(function(r){
    r.shifts.forEach(function(s){
      if(s.date && !s.all20) dateSet[s.date] = true;
    });
  });
  var dates = Object.keys(dateSet).sort();
  dates.forEach(function(d){
    var opt = document.createElement('option');
    opt.value = d;
    opt.textContent = fmtDateLong(d);
    sel.appendChild(opt);
  });
}

function renderReqByDate(){
  var sel = document.getElementById('req-date-lookup-sel');
  var listEl = document.getElementById('req-date-lookup-list');
  var summaryEl = document.getElementById('req-date-lookup-summary');
  if(!sel || !listEl) return;
  var date = sel.value;
  if(!date){ listEl.innerHTML = ''; if(summaryEl) summaryEl.textContent = ''; return; }

  // Gather all submitted requests that touch this date
  var hits = [];
  committeeRequests.forEach(function(r){
    r.shifts.forEach(function(s){
      if(s.all20 || s.date === date){
        var effShift = s.preshow ? psTimeToShift(s.startTime) : s.shift;
        hits.push({
          name:r.name, status:r.status, shift:effShift,
          cap:s.cap, hat:r.hat, all20:s.all20,
          liaison:r.liaison, liaisonPhone:r.liaisonPhone, liaisonEmail:r.liaisonEmail||'',
          chair:r.chair, chairPhone:r.chairPhone||'',
          location:r.location, duties:r.duties||'', notes:r.notes||'',
          rid:r.id, fromRequest:true
        });
      }
    });
  });

  // Also include SCHEDULE_2026 slots — pull full detail from CD directory
  var schedSlots = (SCHEDULE_2026[date] || []).map(function(s){
    var cd = CD[s.name] || {};
    return {
      name:s.name, status:'schedule', shift:s.shift,
      cap:s.cap, hat:s.hat, all20:false,
      liaison:cd.liaison||'', liaisonPhone:cd.lp||'', liaisonEmail:cd.le||'',
      chair:cd.chair||'', chairPhone:cd.cp||'',
      location:cd.loc||'', duties:cd.duties||'', notes:cd.notes||'',
      fromRequest:false
    };
  });

  // Merge: prefer submitted request over schedule for same name+shift
  var merged = hits.slice();
  schedSlots.forEach(function(ss){
    var exists = hits.some(function(h){ return h.name===ss.name && h.shift===ss.shift; });
    if(!exists) merged.push(ss);
  });

  if(merged.length === 0){
    listEl.innerHTML = '<div style="text-align:center;color:var(--gray-400);font-style:italic;padding:20px">No requests or scheduled slots found for this date.</div>';
    if(summaryEl) summaryEl.textContent = '';
    return;
  }

  var byShift = {'8am':[],'12pm':[],'4pm':[]};
  merged.forEach(function(h){ if(byShift[h.shift]) byShift[h.shift].push(h); });

  var shiftColors = {'8am':'#4499CC','12pm':'#D4860A','4pm':'#27AE60'};
  var shiftNames  = {'8am':'8:00 AM Shift','12pm':'12:00 PM Shift','4pm':'4:00 PM Shift'};
  var statusColors = {'approved':'#155724','pending':'#856404','rejected':'#721c24','schedule':'#445566'};
  var statusBg     = {'approved':'#D4EDDA','pending':'#FFF3CD','rejected':'#F8D7DA','schedule':'#F0F4F8'};

  var totalCount = merged.filter(function(h){ return h.status!=='rejected'; }).length;
  var totalCap   = merged.filter(function(h){ return h.status!=='rejected'; }).reduce(function(a,h){ return a+h.cap; },0);
  if(summaryEl) summaryEl.textContent = totalCount + ' committees • ' + totalCap + ' spots';

  // Store rows for detail toggle
  window._reqByDateRows = merged;

  var html = '';
  ['8am','12pm','4pm'].forEach(function(sh){
    var rows = byShift[sh];
    if(!rows.length) return;
    rows.sort(function(a,b){ return a.name.localeCompare(b.name); });
    var shiftCap = rows.reduce(function(a,h){ return a+h.cap; },0);

    html += '<div style="margin-bottom:16px;border:1px solid var(--gray-200);border-radius:8px;overflow:hidden">';
    html += '<div style="background:var(--navy);color:#fff;padding:8px 14px;display:flex;justify-content:space-between;align-items:center">';
    html += '<span style="font-weight:700;font-size:13px">' + (shiftNames[sh]||sh) + '</span>';
    html += '<span style="font-size:11px;opacity:.85">' + rows.length + ' committees &bull; ' + shiftCap + ' spots</span>';
    html += '</div>';

    rows.forEach(function(h, ri){
      var rowKey = sh + '-' + ri;
      var cd = h;
      var hasDetail = h.liaison||h.location||h.duties||h.notes;
      var detailHtml = '';
      // Determine current priority state for this row
      var rowIsPriority = h.fromRequest
        ? !!(committeeRequests.find(function(r){ return r.id === h.rid; }) || {}).highPriority
        : !!prioritySlots[h.name + '|' + h.shift];
      var safeKey = (h.name + '|' + h.shift).replace(/[^a-z0-9]/gi,'_');

      // Priority toggle — shown for all rows regardless of detail
      var priorityToggle =
        '<div style="padding:8px 14px;background:#F8F9FA;border-top:1px solid #EEE;display:flex;align-items:center;gap:10px">' +
          '<label id="sched-priority-lbl-' + safeKey + '" style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;padding:4px 12px;border-radius:20px;border:1.5px solid ' + (rowIsPriority ? '#CC0000' : '#DDD') + ';background:' + (rowIsPriority ? '#FFF0F0' : '#FAFAFA') + '">' +
            '<input type="checkbox"' + (rowIsPriority ? ' checked' : '') + ' style="accent-color:#CC0000;width:14px;height:14px" ' +
            (h.fromRequest
              ? 'onchange="toggleRequestPriority(' + h.rid + ',this.checked)"'
              : 'onchange="toggleSchedulePriority(\'' + h.name.replace(/'/g,"\'") + '\',\'' + h.shift + '\',this.checked)"'
            ) + '>' +
            '<span style="font-size:11px;font-weight:700;color:' + (rowIsPriority ? '#CC0000' : '#667788') + '">&#9650; Priority — gets full capacity before distribution</span>' +
          '</label>' +
        '</div>';

      detailHtml = priorityToggle;

      if(hasDetail){
        detailHtml +=
          '<div style="padding:10px 14px 12px 28px;background:#F8F9FA;font-size:12px;line-height:1.7">' +
          (h.chair ? '<div><strong>Chair:</strong> ' + h.chair + (h.chairPhone ? ' &bull; ' + h.chairPhone : '') + '</div>' : '') +
          (h.liaison ? '<div><strong>Liaison:</strong> ' + h.liaison + (h.liaisonPhone ? ' &bull; ' + h.liaisonPhone : '') + (h.liaisonEmail ? ' &bull; <a href="mailto:' + h.liaisonEmail + '" style="color:var(--navy)">' + h.liaisonEmail + '</a>' : '') + '</div>' : '') +
          (h.location ? '<div><strong>Location:</strong> ' + h.location + '</div>' : '') +
          (h.duties ? '<div><strong>Duties:</strong> ' + h.duties + '</div>' : '') +
          (h.notes ? '<div><strong>Notes:</strong> ' + h.notes + '</div>' : '') +
          '</div>';
      }

      html += '<div style="border-top:1px solid #F0F0F0">';
      // Clickable summary row
      html += '<div style="display:flex;align-items:center;padding:7px 14px;cursor:pointer;gap:10px" onclick="toggleReqRow(\'' + rowKey + '\')">'; 
      html += '<span id="req-row-icon-' + rowKey + '" style="font-size:10px;color:#99AABB;flex-shrink:0">&#9654;</span>';
      html += '<div style="flex:1;font-weight:500;font-size:13px">' + h.name + (h.all20 ? ' <span style="font-size:9px;color:#667788;font-weight:400">(all 20)</span>' : '') + '</div>';
      html += '<div style="font-size:12px;color:#667788;flex-shrink:0">' + h.cap + ' spots</div>';
      html += (h.hat ? '<img src="assets/hat.png" style="height:16px;vertical-align:middle;flex-shrink:0">' : '');
      html += '<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;flex-shrink:0;background:' + (statusBg[h.status]||'#eee') + ';color:' + (statusColors[h.status]||'#333') + '">' + h.status + '</span>';
      html += '</div>';
      // Collapsible detail panel — always shown (priority toggle always present)
      html += '<div id="req-row-detail-' + rowKey + '" style="display:none">' + detailHtml + '</div>';
      html += '</div>';
    });

    html += '</div>';
  });

  listEl.innerHTML = html;
}

function toggleReqRow(key){
  var detail = document.getElementById('req-row-detail-' + key);
  var icon   = document.getElementById('req-row-icon-' + key);
  if(!detail) return;
  var open = detail.style.display !== 'none';
  detail.style.display = open ? 'none' : 'block';
  if(icon) icon.innerHTML = open ? '&#9654;' : '&#9660;';
}


// ============================================================
// REQUESTS FILTER SYSTEM
// ============================================================
var _reqFilterStatus = 'all';
var _reqFilterNames  = [];
var _reqFilterDate   = '';
var _reqFilterDateFrom = '';
var _reqFilterDateTo   = '';
var _reqFilterKeyword  = '';


function reqStatusChange(sel){
  _reqFilterStatus = sel.value || 'all';
  renderRequests();
}

function reqCommitteeChange(sel){
  _reqFilterNames = sel.value ? [sel.value] : [];
  renderRequests();
}

function _populateReqCommitteeDropdown(){
  var sel = document.getElementById('req-committee-select');
  if(!sel) return;
  var current = sel.value;
  var names = {};
  committeeRequests.forEach(function(r){ if(r.name) names[r.name]=true; });
  var sorted = Object.keys(names).sort();
  sel.innerHTML = '<option value="">All Committees</option>' +
    sorted.map(function(n){ return '<option value="'+n+'"'+(n===current?' selected':'')+'>'+n+'</option>'; }).join('');
}

function reqChipClick(btn){
  var status = btn.getAttribute('data-status');
  _reqFilterStatus = (btn.classList.contains('active') && status !== 'all') ? 'all' : status;
  document.querySelectorAll('.req-chip[data-status]').forEach(function(b){
    b.classList.toggle('active', b.getAttribute('data-status') === _reqFilterStatus);
  });
  renderRequests();
}

function toggleReqNameDropdown(){
  var dd = document.getElementById('req-name-dropdown');
  if(!dd) return;
  if(dd.style.display !== 'none'){ dd.style.display='none'; return; }
  var names = {};
  committeeRequests.forEach(function(r){ if(r.name) names[r.name]=true; });
  renderReqNameOptions(Object.keys(names).sort(), '');
  dd.style.display = 'block';
  var inp = document.getElementById('req-name-search');
  if(inp){ inp.value=''; inp.focus(); }
  setTimeout(function(){
    document.addEventListener('click', _closeReqNameDropdown, {once:true, capture:true});
  }, 0);
}

function _closeReqNameDropdown(e){
  var wrap = document.getElementById('req-name-wrap');
  if(wrap && wrap.contains(e.target)) return;
  var dd = document.getElementById('req-name-dropdown');
  if(dd) dd.style.display='none';
}

function reqNameSearchFilter(){
  var q = (document.getElementById('req-name-search').value||'').toLowerCase();
  var names = {};
  committeeRequests.forEach(function(r){ if(r.name) names[r.name]=true; });
  var sorted = Object.keys(names).sort().filter(function(n){ return !q || n.toLowerCase().indexOf(q) >= 0; });
  renderReqNameOptions(sorted, q);
}

function renderReqNameOptions(names, q){
  var el = document.getElementById('req-name-options');
  if(!el) return;
  if(!names.length){
    el.innerHTML = '<div style="padding:10px 12px;font-size:12px;color:#999;font-style:italic">No matches</div>';
    return;
  }
  el.innerHTML = names.map(function(name){
    var checked = _reqFilterNames.indexOf(name) >= 0;
    var safeId = 'rno-' + name.replace(/[^a-z0-9]/gi,'_');
    var display = q ? (function(){
      var lo=name.toLowerCase(), qi=lo.indexOf(q);
      if(qi<0) return name;
      return name.slice(0,qi)+'<strong>'+name.slice(qi,qi+q.length)+'</strong>'+name.slice(qi+q.length);
    })() : name;
    return '<label class="req-name-option">' +
      '<input type="checkbox" id="'+safeId+'"'+(checked?' checked':'')+' data-rname="'+encodeURIComponent(name)+'" onchange="reqNameToggleEl(this)">' +
      '<span>'+display+'</span>' +
    '</label>';
  }).join('');
}

function reqNameToggleEl(el){
  var name = decodeURIComponent(el.getAttribute('data-rname')||'');
  if(!name) return;
  reqNameToggle(name, !!el.checked);
}

function reqNameToggle(name, checked){
  if(checked){ if(_reqFilterNames.indexOf(name)<0) _reqFilterNames.push(name); }
  else { _reqFilterNames = _reqFilterNames.filter(function(n){ return n!==name; }); }
  updateReqNameDisplay();
  renderRequests();
}

function updateReqNameDisplay(){
  var display = document.getElementById('req-name-display');
  var placeholder = document.getElementById('req-name-placeholder');
  if(!display) return;
  Array.from(display.querySelectorAll('.req-name-tag')).forEach(function(t){ t.remove(); });
  if(!_reqFilterNames.length){
    if(placeholder) placeholder.style.display='inline';
  } else {
    if(placeholder) placeholder.style.display='none';
    _reqFilterNames.forEach(function(name){
      var tag = document.createElement('span');
      tag.className = 'req-name-tag';
      tag.innerHTML = name + '<button data-rname="'+encodeURIComponent(name)+'" onclick="event.stopPropagation();reqNameToggleEl(this)" title="Remove">&#x2715;</button>';
      display.insertBefore(tag, placeholder);
    });
  }
}

function reqFilterUpdate(){
  _reqFilterDate     = (document.getElementById('req-search-date')||{}).value||'';
  _reqFilterDateFrom = (document.getElementById('req-date-from')||{}).value||'';
  _reqFilterDateTo   = (document.getElementById('req-date-to')||{}).value||'';
  _reqFilterKeyword  = ((document.getElementById('req-keyword-search')||{}).value||'').toLowerCase().trim();
  renderRequests();
  updateReqFilterSummary();
}

function updateReqFilterSummary(){
  var el = document.getElementById('req-filter-summary');
  var txt = document.getElementById('req-filter-summary-text');
  if(!el||!txt) return;
  var parts = [];
  if(_reqFilterStatus!=='all') parts.push('Status: '+_reqFilterStatus);
  if(_reqFilterNames.length) parts.push(_reqFilterNames.length+' committee'+(+_reqFilterNames.length!==1?'s':'')+' selected');
  if(_reqFilterDate) parts.push('Date: '+_reqFilterDate);
  if(_reqFilterKeyword) parts.push('Keyword: "'+_reqFilterKeyword+'"');
  if(parts.length){ el.style.display='flex'; txt.textContent=parts.join(' · '); }
  else { el.style.display='none'; }
}

function reqClearFilters(){
  _reqFilterStatus='all'; _reqFilterNames=[]; _reqFilterDate='';
  var ss=document.getElementById('req-status-select'); if(ss) ss.value='all';
  var sc=document.getElementById('req-committee-select'); if(sc) sc.value='';
  var sd=document.getElementById('req-search-date'); if(sd) sd.value='';
  var df=document.getElementById('req-date-from'); if(df) df.value='';
  var dt=document.getElementById('req-date-to'); if(dt) dt.value='';
  var kw=document.getElementById('req-keyword-search'); if(kw) kw.value='';
  _reqFilterDateFrom=''; _reqFilterDateTo=''; _reqFilterKeyword='';
  updateReqFilterSummary(); renderRequests();
}

function refreshRequests(){
  if(!DB_AVAILABLE){ renderRequests(); return; }
  var btn=document.getElementById('req-refresh-btn');
  if(btn){ btn.disabled=true; btn.textContent='Loading...'; }
  fetch('/.netlify/functions/state',{headers:{'x-api-token':API_TOKEN}})
    .then(function(r){ return r.json(); })
    .then(function(data){
      if(data && data.committeeRequests !== undefined){
        committeeRequests = data.committeeRequests.map(function(r){
          // data column may be a string or already parsed object
          if(r.data && typeof r.data === 'string'){ try{ return JSON.parse(r.data); }catch(e){ return r; } }
          if(r.data && typeof r.data === 'object') return r.data;
          return r;
        });
        var maxId = committeeRequests.reduce(function(m,r){ return Math.max(m,r.id||0);},0);
        if(maxId >= requestIdCounter) requestIdCounter = maxId+1;
      }
      _populateReqCommitteeDropdown(); renderRequests(); updateReqFilterSummary();
      if(btn){ btn.disabled=false; btn.textContent='↻ Refresh'; }
    })
    .catch(function(){
      if(btn){ btn.disabled=false; btn.textContent='↻ Refresh'; }
    });
}


function renderRequests(){
  var list = committeeRequests.filter(function(r){
    // Status chip filter
    if(_reqFilterStatus === 'virtual'){
      if(!(r.virtual || (r.shifts && r.shifts.length && r.shifts[0].virtual))) return false;
    } else if(_reqFilterStatus !== 'all'){
      if(r.status !== _reqFilterStatus) return false;
    }
    // Committee name filter
    if(_reqFilterNames.length && _reqFilterNames.indexOf(r.name) < 0) return false;
    // Keyword search — committee name, chair, liaison, location, duties, notes
    if(_reqFilterKeyword){
      var kw = _reqFilterKeyword;
      var haystack = [
        r.name||'', r.chair||'', r.liaison||'', r.location||'',
        r.duties||'', r.notes||'', r.chairEmail||'', r.liaisonEmail||''
      ].join(' ').toLowerCase();
      if(haystack.indexOf(kw) < 0) return false;
    }
    // Date range filter
    var dfrom = _reqFilterDateFrom || _reqFilterDate;
    var dto   = _reqFilterDateTo   || _reqFilterDate;
    if(dfrom || dto){
      var dateMatch = !r.shifts || r.shifts.length === 0;
      if(r.shifts) dateMatch = r.shifts.some(function(s){
        if(s.all20 || s.all_20 || s.all20==='true' || s.all_20==='true') return true;
        // Normalize date to YYYY-MM-DD for comparison
        var sd = (s.date||'').trim();
        // Handle M/D/YYYY format
        if(sd.indexOf('/') >= 0){
          var parts = sd.split('/');
          if(parts.length === 3) sd = parts[2].padStart(4,'0')+'-'+parts[0].padStart(2,'0')+'-'+parts[1].padStart(2,'0');
        }
        if(s.virtual || s.preshow){
          var se = (s.endDate||s.end_date||sd).trim();
          return (!dto || sd <= dto) && (!dfrom || se >= dfrom);
        }
        return (!dfrom || sd >= dfrom) && (!dto || sd <= dto);
      });
      if(!dateMatch) return false;
    }
    return true;
  });

  var el = document.getElementById('req-list');
  if(!el) return;

  if(!list.length){
    el.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--gray-400);font-size:14px">' +
      (_reqFilterStatus === 'pending' ? 'No pending requests. All caught up!' : 'No requests match your filters.') +
    '</div>';
    return;
  }

  el.innerHTML = list.map(function(r){
    var dt = new Date(r.submittedAt);
    var dateStr = 'Submitted ' + (dt.getMonth()+1) + '/' + dt.getDate() + ' at ' +
      dt.getHours() + ':' + String(dt.getMinutes()).padStart(2,'0');

    var shiftPills = r.shifts.map(function(s){
      return '<span class="shift-pill">' + (s.all20 ? 'All 20 &bull; ' : fmtDate(s.date) + ' &bull; ') +
        SL[s.shift] + ' &bull; ' + s.cap + ' juniors</span>';
    }).join('');

    var approvedFrom = '';
    if(r.status === 'approved'){
      var isPriority = !!r.highPriority;
      approvedFrom =
        '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-top:6px;margin-bottom:10px">' +
          '<div style="font-size:11px;color:#155724">&#10003; Approved — visible in Shift Setup.</div>' +
          '<label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;padding:4px 10px;border-radius:20px;border:1.5px solid ' + (isPriority ? '#CC0000' : '#DDD') + ';background:' + (isPriority ? '#FFF0F0' : '#FAFAFA') + '">' +
            '<input type="checkbox" id="req-priority-' + r.id + '"' + (isPriority ? ' checked' : '') + ' onchange="toggleRequestPriority(' + r.id + ',this.checked)" style="accent-color:#CC0000;width:14px;height:14px">' +
            '<span style="font-size:11px;font-weight:700;color:' + (isPriority ? '#CC0000' : '#667788') + '">&#9650; Priority</span>' +
          '</label>' +
        '</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
          '<button class="btn" style="font-size:12px;padding:5px 12px" onclick="editRequest(' + r.id + ')"><img src="assets/edit.png" style="width:13px;height:13px;vertical-align:middle"> Edit</button>' +
          '<button class="btn btn-danger" style="font-size:12px;padding:5px 12px" onclick="revokeRequest(' + r.id + ')">&#x21A9; Revoke Approval</button>' +
          '<button class="btn" style="font-size:12px;padding:5px 12px;border-color:#CC0000;color:#CC0000" onclick="rejectRequest(' + r.id + ')">&#x2715; Deny &amp; Archive</button>' +
          '<button class="btn" style="font-size:12px;padding:5px 10px;border-color:#CC0000;color:#CC0000" onclick="deleteRequest(' + r.id + ')" title="Delete">&#x1F5D1;</button>' +
        '</div>';
    }

    return '<div class="req-card ' + r.status + '">' +
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:8px">' +
        '<div>' +
          '<div style="font-size:15px;font-weight:700;color:var(--navy)">' + r.name + (r.hat ? ' <span class="badge b-hat"><img src="assets/hat.png" style="height:18px;vertical-align:middle;margin-right:3px"> Hat req.</span>' : '') + '</div>' +
          '<div style="font-size:12px;color:#667788;margin-top:2px">' + dateStr + ' &bull; ' + r.chair + ' &bull; ' + r.chairPhone + '</div>' +
        '</div>' +
        '<span class="req-badge ' + r.status + '">' + r.status + '</span>' +
      '</div>' +
      '<div style="font-size:12px;margin-bottom:6px"><strong>Liaison:</strong> ' + r.liaison + ' &bull; ' + r.liaisonPhone + (r.liaisonEmail ? ' &bull; ' + r.liaisonEmail : '') + '</div>' +
      '<div style="font-size:12px;margin-bottom:6px"><strong>Location:</strong> ' + r.location + '</div>' +
      '<div style="font-size:12px;margin-bottom:6px"><strong>Duties:</strong> ' + r.duties + '</div>' +
      (r.notes ? '<div style="font-size:12px;margin-bottom:6px"><strong>Notes/Attire:</strong> ' + r.notes + '</div>' : '') +
      '<div style="margin:8px 0">' + shiftPills + '</div>' +
      (r.status === 'pending' ?
        '<div style="margin-top:10px">' +
          '<div style="font-size:12px;color:#667788;margin-bottom:4px">Scheduling notes (optional — visible to officers)</div>' +
          '<input class="finput" id="req-note-' + r.id + '" style="font-size:12px;margin-bottom:8px" placeholder="e.g. Approved with reduced capacity, check location" value="' + (r.schedulingNotes||'') + '">' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
            '<button class="btn" style="font-size:12px;padding:5px 12px" onclick="editRequest(' + r.id + ')"><img src="assets/edit.png" style="width:13px;height:13px;vertical-align:middle"> Edit</button>' +
            '<button class="btn btn-primary" style="flex:1" onclick="approveRequest(' + r.id + ')">&#10003; Approve</button>' +
            '<button class="btn btn-danger" style="flex:1" onclick="rejectRequest(' + r.id + ')">&#x2715; Reject</button>' +
            '<button class="btn" style="padding:5px 10px;border-color:#CC0000;color:#CC0000" onclick="deleteRequest(' + r.id + ')" title="Delete">&#x1F5D1;</button>' +
          '</div>' +
        '</div>'
      : r.status === 'rejected' ?
        '<div style="margin-top:8px">' +
          '<div style="font-size:11px;color:#721c24;margin-bottom:8px">&#x2715; Denied / Archived</div>' +
          '<div style="display:flex;gap:8px">' +
            '<button class="btn" style="font-size:12px;padding:5px 12px" onclick="restoreRequest(' + r.id + ')">&#8617; Restore to Pending</button>' +
            '<button class="btn" style="font-size:12px;padding:5px 12px;border-color:#CC0000;color:#CC0000" onclick="deleteRequest(' + r.id + ')">&#x1F5D1; Delete</button>' +
          '</div>' +
        '</div>'
      : approvedFrom) +
    '</div>';
  }).join('');
}

function deleteRequest(id){
  var r = committeeRequests.find(function(x){ return x.id === id; });
  if(!r) return;
  if(!confirm('Permanently delete the request from "' + r.name + '"? This cannot be undone.')) return;
  committeeRequests = committeeRequests.filter(function(x){ return x.id !== id; });
  renderRequests();
  saveStateNow();
  showAlert('Request deleted.', 'info');
}

function restoreRequest(id){
  var r = committeeRequests.find(function(x){ return x.id === id; });
  if(!r) return;
  r.status = 'pending';
  renderRequests();
  saveStateNow();
  showAlert(r.name + ' restored to pending.', 'info');
}

var _editingReqId = null;
var _editShiftCount = 0;

function editRequest(id){
  var r = committeeRequests.find(function(x){ return x.id === id; });
  if(!r) return;
  _editingReqId = id;
  _editShiftCount = 0;

  // Build shift rows HTML
  var shiftRowsHtml = '';
  var shifts = r.shifts || [];
  shifts.forEach(function(s, idx){
    _editShiftCount++;
    var rowId = _editShiftCount;
    if(s.preshow){
      shiftRowsHtml += '<div class="rf-ps-row" id="edit-shift-row-'+rowId+'" style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:8px;align-items:flex-end;margin-bottom:8px">' +
        '<div><div class="form-lbl">Date</div><input class="finput" type="date" id="edit-ps-date-'+rowId+'" value="'+(s.date||'')+'"></div>' +
        '<div><div class="form-lbl">Start</div><select class="finput" id="edit-ps-start-'+rowId+'">'+buildTimeOpts(s.startTime)+'</select></div>' +
        '<div><div class="form-lbl">End</div><select class="finput" id="edit-ps-end-'+rowId+'">'+buildTimeOpts(s.endTime, true)+'</select></div>' +
        '<div><div class="form-lbl">Juniors</div><input class="finput" type="number" id="edit-ps-cap-'+rowId+'" value="'+(s.cap||4)+'" min="1" max="40" style="width:70px"></div>' +
        '</div>';
    } else {
      var showDateOpts = buildShowDateOpts(s.date);
      shiftRowsHtml += '<div id="edit-shift-row-'+rowId+'" style="display:grid;grid-template-columns:1fr 1fr auto;gap:8px;align-items:flex-end;margin-bottom:8px">' +
        '<div><div class="form-lbl">Date</div><select class="finput" id="edit-date-'+rowId+'">'+showDateOpts+'</select></div>' +
        '<div><div class="form-lbl">Shift</div><select class="finput" id="edit-shift-'+rowId+'">' +
          '<option value="8am"'+(s.shift==='8am'?' selected':'')+'>8am – 12pm</option>' +
          '<option value="12pm"'+(s.shift==='12pm'?' selected':'')+'>12pm – 4pm</option>' +
          '<option value="4pm"'+(s.shift==='4pm'?' selected':'')+'>4pm – 8pm</option>' +
        '</select></div>' +
        '<div><div class="form-lbl">Juniors</div><input class="finput" type="number" id="edit-cap-'+rowId+'" value="'+(s.cap||4)+'" min="1" max="40" style="width:70px"></div>' +
        '</div>';
    }
  });

  var isPreshow = r.preshow || (shifts.length && shifts[0].preshow);
  var body =
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">' +
      '<div style="grid-column:1/-1"><div class="form-lbl">Committee Name *</div><input class="finput" id="edit-name" value="'+escHtml(r.name||'')+'"></div>' +
      '<div><div class="form-lbl">Chairman Name</div><input class="finput" id="edit-chair" value="'+escHtml(r.chair||'')+'"></div>' +
      '<div><div class="form-lbl">Chairman Phone</div><input class="finput" id="edit-chair-phone" value="'+escHtml(r.chairPhone||'')+'"></div>' +
      '<div style="grid-column:1/-1"><div class="form-lbl">Chairman Email</div><input class="finput" id="edit-chair-email" value="'+escHtml(r.chairEmail||'')+'"></div>' +
      '<div><div class="form-lbl">Liaison Name</div><input class="finput" id="edit-liaison" value="'+escHtml(r.liaison||'')+'"></div>' +
      '<div><div class="form-lbl">Liaison Phone</div><input class="finput" id="edit-liaison-phone" value="'+escHtml(r.liaisonPhone||'')+'"></div>' +
      '<div style="grid-column:1/-1"><div class="form-lbl">Liaison Email</div><input class="finput" id="edit-liaison-email" value="'+escHtml(r.liaisonEmail||'')+'"></div>' +
      '<div style="grid-column:1/-1"><div class="form-lbl">Location</div><input class="finput" id="edit-location" value="'+escHtml(r.location||'')+'"></div>' +
      '<div style="grid-column:1/-1"><div class="form-lbl">Duties</div><textarea class="finput" id="edit-duties" rows="2" style="resize:none">'+escHtml(r.duties||'')+'</textarea></div>' +
      '<div style="grid-column:1/-1"><div class="form-lbl">Notes</div><textarea class="finput" id="edit-notes" rows="2" style="resize:none">'+escHtml(r.notes||'')+'</textarea></div>' +
      '<div style="grid-column:1/-1"><label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer">' +
        '<input type="checkbox" id="edit-hat"'+(r.hat?' checked':'')+' style="width:18px;height:18px;accent-color:var(--navy)"> Hats required</label></div>' +
    '</div>' +
    '<div class="section-lbl" style="margin-bottom:8px">'+(isPreshow ? 'Pre-Show ' : '')+'Shifts</div>' +
    '<div id="edit-shift-rows">'+shiftRowsHtml+'</div>' +
    '<button type="button" class="btn" style="font-size:12px;margin-top:4px" onclick="addEditShiftRow('+!!isPreshow+')">&#43; Add shift</button>';

  document.getElementById('req-edit-body').innerHTML = body;
  document.getElementById('req-edit-modal').style.display = 'flex';
}

function escHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function buildShowDateOpts(selected){
  var opts = '';
  for(var d = 0; d < 19; d++){
    var dt = new Date(Date.UTC(2027, 2, 2 + d));
    var m = dt.getUTCMonth()+1;
    var day = dt.getUTCDate();
    var val = '2027-'+String(m).padStart(2,'0')+'-'+String(day).padStart(2,'0');
    var lbl = 'Mar '+day;
    opts += '<option value="'+val+'"'+(val===selected?' selected':'')+'>'+lbl+'</option>';
  }
  return opts;
}

function buildTimeOpts(selected, isEnd){
  var startH = 6, startM = 0, endH = isEnd ? 22 : 18, endM = 0;
  if(isEnd){ startH = 6; startM = 30; }
  var opts = '<option value="">-- Select --</option>';
  var h = startH, m = startM;
  while((h < endH)||(h===endH&&m<=endM)){
    var ampm = h<12?'AM':'PM';
    var h12 = h%12||12;
    var label = h12+':'+String(m).padStart(2,'0')+' '+ampm;
    opts += '<option value="'+label+'"'+(label===selected?' selected':'')+'>'+label+'</option>';
    m += 30; if(m>=60){ m-=60; h++; }
  }
  return opts;
}

function addEditShiftRow(isPreshow){
  _editShiftCount++;
  var id = _editShiftCount;
  var container = document.getElementById('edit-shift-rows');
  var div = document.createElement('div');
  div.id = 'edit-shift-row-'+id;
  if(isPreshow){
    div.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:8px;align-items:flex-end;margin-bottom:8px';
    div.innerHTML =
      '<div><div class="form-lbl">Date</div><input class="finput" type="date" id="edit-ps-date-'+id+'"></div>' +
      '<div><div class="form-lbl">Start</div><select class="finput" id="edit-ps-start-'+id+'">'+buildTimeOpts('',false)+'</select></div>' +
      '<div><div class="form-lbl">End</div><select class="finput" id="edit-ps-end-'+id+'">'+buildTimeOpts('',true)+'</select></div>' +
      '<div><div class="form-lbl">Juniors</div><div style="display:flex;gap:4px"><input class="finput" type="number" id="edit-ps-cap-'+id+'" value="4" min="1" max="40" style="width:70px"><button class="btn" onclick="this.parentNode.parentNode.remove()" style="padding:4px 8px;color:var(--red);border-color:var(--red)">&#x2715;</button></div></div>';
  } else {
    div.style.cssText = 'display:grid;grid-template-columns:1fr 1fr auto;gap:8px;align-items:flex-end;margin-bottom:8px';
    div.innerHTML =
      '<div><div class="form-lbl">Date</div><select class="finput" id="edit-date-'+id+'">'+buildShowDateOpts('')+'</select></div>' +
      '<div><div class="form-lbl">Shift</div><select class="finput" id="edit-shift-'+id+'"><option value="8am">8am – 12pm</option><option value="12pm" selected>12pm – 4pm</option><option value="4pm">4pm – 8pm</option></select></div>' +
      '<div><div class="form-lbl">Juniors</div><div style="display:flex;gap:4px"><input class="finput" type="number" id="edit-cap-'+id+'" value="4" min="1" max="40" style="width:70px"><button class="btn" onclick="this.parentNode.parentNode.remove()" style="padding:4px 8px;color:var(--red);border-color:var(--red)">&#x2715;</button></div></div>';
  }
  container.appendChild(div);
}

function saveReqEdit(){
  var r = committeeRequests.find(function(x){ return x.id === _editingReqId; });
  if(!r) return;

  r.name        = document.getElementById('edit-name').value.trim();
  r.chair       = document.getElementById('edit-chair').value.trim();
  r.chairPhone  = document.getElementById('edit-chair-phone').value.trim();
  r.chairEmail  = document.getElementById('edit-chair-email').value.trim();
  r.liaison     = document.getElementById('edit-liaison').value.trim();
  r.liaisonPhone= document.getElementById('edit-liaison-phone').value.trim();
  r.liaisonEmail= document.getElementById('edit-liaison-email').value.trim();
  r.location    = document.getElementById('edit-location').value.trim();
  r.duties      = document.getElementById('edit-duties').value.trim();
  r.notes       = document.getElementById('edit-notes').value.trim();
  r.hat         = document.getElementById('edit-hat').checked;

  var isPreshow = r.preshow || (r.shifts && r.shifts.length && r.shifts[0].preshow);
  var newShifts = [];
  var rows = document.getElementById('edit-shift-rows').querySelectorAll('[id^="edit-shift-row-"]');
  rows.forEach(function(row){
    var rid = row.id.replace('edit-shift-row-','');
    if(isPreshow){
      var dt  = document.getElementById('edit-ps-date-'+rid);
      var st  = document.getElementById('edit-ps-start-'+rid);
      var en  = document.getElementById('edit-ps-end-'+rid);
      var cp  = document.getElementById('edit-ps-cap-'+rid);
      if(dt && dt.value) newShifts.push({preshow:true, date:dt.value, startTime:st?st.value:'', endTime:en?en.value:'', cap:parseInt(cp&&cp.value)||4});
    } else {
      var dateEl  = document.getElementById('edit-date-'+rid);
      var shiftEl = document.getElementById('edit-shift-'+rid);
      var capEl   = document.getElementById('edit-cap-'+rid);
      if(dateEl && dateEl.value) newShifts.push({all20:false, date:dateEl.value, shift:shiftEl?shiftEl.value:'8am', cap:parseInt(capEl&&capEl.value)||4});
    }
  });
  if(newShifts.length) r.shifts = newShifts;

  closeReqEdit();
  renderRequests();
  saveStateNow();
  showAlert(r.name + ' updated.', 'success');
}

function closeReqEdit(){
  document.getElementById('req-edit-modal').style.display = 'none';
  _editingReqId = null;
}

function revokeRequest(id){
  var r = committeeRequests.find(function(x){ return x.id === id; });
  if(!r) return;
  if(!confirm('Revoke approval for "' + r.name + '"? It will go back to pending.')) return;
  r.status = 'pending';
  _lastReqHash = ''; // force save
  renderRequests();
  saveStateNow();
  showAlert(r.name + ' approval revoked — back to pending.', 'warn');
}

function approveRequest(id){
  var r = committeeRequests.find(function(x){ return x.id === id; });
  if(!r) return;
  var noteEl = document.getElementById('req-note-' + id);
  r.schedulingNotes = noteEl ? noteEl.value.trim() : '';
  r.status = 'approved';
  r.approvedAt = new Date().toISOString();
  _lastReqHash = ''; // force committeeRequests save on next tick
  saveStateNow();

  // Add to committee library if not already there
  var exists = committeeLibrary.find(function(c){ return c.name.toLowerCase() === r.name.toLowerCase(); });
  if(!exists){
    committeeLibrary.push({
      id: Date.now(),
      name: r.name,
      hat: r.hat,
      all20: r.all20,
      shifts: r.shifts.map(function(s){ return {shift:s.shift, cap:s.cap}; }),
      fromRequest: true,
      chair: r.chair, chairPhone: r.chairPhone,
      liaison: r.liaison, liaisonPhone: r.liaisonPhone, liaisonEmail: r.liaisonEmail,
      location: r.location, duties: r.duties, notes: r.notes
    });
  }
  renderRequests();
}

function rejectRequest(id){
  var r = committeeRequests.find(function(x){ return x.id === id; });
  if(!r) return;
  var noteEl = document.getElementById('req-note-' + id);
  r.schedulingNotes = noteEl ? noteEl.value.trim() : '';
  r.status = 'rejected';
  _lastReqHash = ''; // force save
  saveStateNow();
  renderRequests();
}

function psTimeToShift(startTime){
  if(!startTime) return '8am';
  var hr = parseInt(startTime);
  var isPM = startTime.indexOf('PM') >= 0 && hr !== 12;
  if(isPM) hr += 12;
  if(hr >= 16) return '4pm';
  if(hr >= 12) return '12pm';
  return '8am';
}

function addApprovedSlotByIdx(reqId, shiftIdx){
  var r = committeeRequests.find(function(x){ return x.id === reqId; });
  if(!r || !r.shifts[shiftIdx]) return;
  var s = r.shifts[shiftIdx];
  var effShift = s.shift || psTimeToShift(s.startTime);
  var slotName = s.preshow ? (r.name + ' (' + (s.startTime||'') + (s.endTime ? '–'+s.endTime : '') + ')') : r.name;
  var alreadyAdded = activeSlots.some(function(sl){ return sl.name === slotName && sl.shift === effShift; });
  if(alreadyAdded){ renderSetup(); return; }
  activeSlots.push({
    id: Date.now() + Math.random(),
    name: slotName,
    capacity: s.cap || 4,
    shift: effShift,
    hat: r.hat,
    assigned: []
  });
  CD[slotName] = {
    chair: r.chair, cp: r.chairPhone,
    liaison: r.liaison, lp: r.liaisonPhone, le: r.liaisonEmail,
    loc: r.location, duties: r.duties, notes: r.notes
  };
  renderSetup();
  saveState();
}

function addApprovedSlot(reqId, shift){
  // Legacy: find by shift key (showtime requests)
  var r = committeeRequests.find(function(x){ return x.id === reqId; });
  if(!r) return;
  var shiftData = r.shifts.find(function(s){ return s.shift === shift; });
  if(!shiftData) return;
  var alreadyAdded = activeSlots.some(function(s){ return s.name === r.name && s.shift === shift; });
  if(alreadyAdded) return;
  activeSlots.push({
    id: Date.now() + Math.random(),
    name: r.name,
    capacity: shiftData.cap,
    shift: shift,
    hat: r.hat,
    assigned: []
  });
  CD[r.name] = {
    chair: r.chair, cp: r.chairPhone,
    liaison: r.liaison, lp: r.liaisonPhone, le: r.liaisonEmail,
    loc: r.location, duties: r.duties, notes: r.notes
  };
  renderSetup();
  saveState();
}


