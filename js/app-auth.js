// JRC Assignment System — app-auth.js
// Login system, role management, session handling
// ============================================================
// LOGIN SYSTEM
// Roles: admin | officer | kiosk
// PINs (change these before going live):
//   admin:   1234
//   officer: 5678
//   kiosk:   0000  (no PIN needed — just tap Enter or the button)
// ============================================================
var API_TOKEN  = '__API_SECRET__'; // replaced at build time by netlify
var ROLE_LABELS = { admin:'Administrator', slt:'VC / SLT', officer:'Shift Officer', scheduling:'Scheduling Team', junior:'Junior Committeeman', kiosk:'Kiosk Mode', board:'Status Board' };

// Tabs each role can see
var ROLE_TABS = {
  // Admin — every tab
  admin:      ['officer','kiosk','checkins','roster','setup','requests','reqform','simulate','board','hours'],
  // SLT/VC — everything except settings (simulate)
  slt:        ['officer','kiosk','checkins','roster','setup','requests','reqform','board','hours'],
  // Shift Officer — dashboard, roster, checkins, status board, hours, submit request
  officer:    ['officer','kiosk','checkins','roster','board','hours','reqform'],
  // Scheduling Team — submit request + requests tab
  scheduling: ['officer','checkins','roster','setup','reqform','requests','board','kiosk'],
  // Junior Committeeman — kiosk only
  junior:     ['kiosk'],
  // System roles
  kiosk:      ['kiosk'],
  board:      ['board']
};

var currentRole = null;
var currentTab = 'kiosk';

function enterPartnerMode(){
  // Hide everything except the partner form
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('main-app').style.display = 'block';

  // Hide nav elements
  var els = ['tab-bar','logout-wrap','main-header','app-footer'];
  els.forEach(function(id){ var e = document.getElementById(id); if(e) e.style.display='none'; });
  var lwi = document.getElementById('logout-wrap-inner'); if(lwi) lwi.style.display='none';

  // Hide sidebar + app-layout structural elements
  var sidebar = document.getElementById('sidebar-nav'); if(sidebar) sidebar.style.display='none';
  var appLayout = document.querySelector('.app-layout'); if(appLayout) appLayout.style.display='block';
  var appContent = document.querySelector('.app-content'); if(appContent) appContent.style.cssText='width:100%;display:block';

  // Partner header is hidden — orb background handles the look
  var po = document.getElementById('partner-orbs'); if(po) po.style.display='block';

  // Hide all panels then show only reqform
  document.querySelectorAll('.panel').forEach(function(p){ p.style.display='none'; });
  var pf = document.getElementById('panel-reqform');
  if(pf){ pf.style.display='block'; pf.style.opacity='1'; }

  // Render the form
  try { renderReqForm(); } catch(e){ console.warn('renderReqForm error:', e); }

  // Guard: re-show after any async state loads
  setTimeout(function(){
    document.querySelectorAll('.panel').forEach(function(p){ p.style.display='none'; });
    var pf2 = document.getElementById('panel-reqform');
    if(pf2){ pf2.style.display='block'; pf2.style.opacity='1'; }
  }, 500);

  // Load state for show dates (no render side-effects)
  fetch('/.netlify/functions/state',{headers:{'x-api-token':API_TOKEN}})
    .then(function(r){ return r.json(); })
    .then(function(data){ if(data && !data.error) _applyState(data); })
    .catch(function(){});
}

function partnerSubmitAnother(){
  var m = document.getElementById('rf-submit-msg');
  if(m) m.innerHTML = '';
  renderReqForm();
}


// ── Personal Login ─────────────────────────────────────────────────────
function showDeviceMode(){
  document.getElementById('personal-login').style.display = 'none';
  document.getElementById('device-mode-select').style.display = 'block';
}
function hideDeviceMode(){
  document.getElementById('device-mode-select').style.display = 'none';
  document.getElementById('personal-login').style.display = 'block';
  var mp = document.getElementById('mentor-picker'); if(mp) mp.style.display = 'none';
}

function doPersonalLogin(){
  var email    = (document.getElementById('pl-email').value || '').trim().toLowerCase();
  var password = (document.getElementById('pl-password').value || '').trim();
  var errEl    = document.getElementById('pl-err');
  var btnEl    = document.getElementById('pl-submit-btn');
  if(errEl) errEl.textContent = '';

  if(!email || !password){
    if(errEl) errEl.textContent = 'Please enter your email and password.';
    return;
  }

  // Show loading state
  if(btnEl){ btnEl.disabled = true; btnEl.textContent = 'Signing in...'; }
  if(errEl) errEl.textContent = '';

  fetch('/.netlify/functions/auth', {
    method: 'POST',
    headers: {'Content-Type':'application/json','x-api-token': API_TOKEN},
    body: JSON.stringify({email: email, password: password})
  })
  .then(function(r){ return r.json().then(function(d){ return {ok: r.ok, data: d}; }); })
  .then(function(res){
    if(btnEl){ btnEl.disabled = false; btnEl.textContent = 'Sign In'; }
    if(!res.ok || !res.data.ok){
      if(errEl) errEl.textContent = res.data.error || 'Login failed. Please try again.';
      return;
    }
    var adult = res.data.adult;
    var permMap = {'admin':'admin','vc-slt':'slt','officer':'officer','scheduling':'scheduling'};
    var role = adult.permission ? (permMap[adult.permission] || 'kiosk') : 'kiosk';

    // Store locally for session restore
    loggedInAdult = adult;
    try { localStorage.setItem('jrc_logged_adult', JSON.stringify({id:adult.id, name:adult.name, role:role})); } catch(e){}

    // Show role picker filtered by permission
    if(role === 'admin'){
      _showRolePicker(['admin','slt','officer','scheduling','board','kiosk']);
    } else if(role === 'slt'){
      _showRolePicker(['slt','board','kiosk']);
    } else if(role === 'officer'){
      _showRolePicker(['officer','board','kiosk']);
    } else if(role === 'scheduling'){
      _showRolePicker(['scheduling','board','kiosk']);
    } else {
      document.getElementById('personal-login').style.display = 'none';
      loginAs('kiosk');
    }
  })
  .catch(function(e){
    if(btnEl){ btnEl.disabled = false; btnEl.textContent = 'Sign In'; }
    if(errEl) errEl.textContent = 'Connection error. Please try again.';
    console.error('[auth] Login error:', e.message);
  });
}



// Role card mapping — which onclick value maps to which role key
var _ROLE_CARD_MAP = {
  'admin':      "selectRole('admin')",
  'slt':        "selectRole('slt')",
  'officer':    "selectRole('officer')",
  'scheduling': "selectRole('scheduling')",
  'junior':     "selectRole('junior')",
  'board':      "selectRole('board')",
  'kiosk':      "selectRole('kiosk')"
};

function _showRolePicker(allowedRoles){
  document.getElementById('personal-login').style.display = 'none';
  var roleSelect = document.getElementById('role-select');
  roleSelect.style.display = 'block';
  // Hide buttons not in allowedRoles; always hide junior (duplicate of kiosk) and partner
  var btns = roleSelect.querySelectorAll('.role-btn');
  btns.forEach(function(btn){
    var onclick = btn.getAttribute('onclick') || '';
    var role = null;
    for(var r in _ROLE_CARD_MAP){
      if(onclick === _ROLE_CARD_MAP[r]){ role = r; break; }
    }
    // Always hide junior (same as kiosk) and partner button
    if(!role || role === 'junior' || onclick.indexOf('enterPartnerMode') >= 0){
      btn.style.display = 'none';
      return;
    }
    btn.style.display = allowedRoles.indexOf(role) >= 0 ? '' : 'none';
  });
}

function selectRole(role){
  loginAs(role);
}



function loginAs(role){
  currentRole = role;

  // Persist login so refresh doesn't log out
  // Exception: TV/board/kiosk modes don't save to localStorage — they shouldn't
  // override another user's session in the same browser
  try {
    if(role !== 'board' && role !== 'kiosk'){
      var sessionExpiry = Date.now() + (8 * 60 * 60 * 1000);
      localStorage.setItem('jrc_saved_role', role);
      localStorage.setItem('jrc_session_expiry', String(sessionExpiry));
    }
  } catch(e){{}}

  // Hide login, show app
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('main-app').style.display = 'block';

  // Show user badge + logout button
  var _displayName = loggedInAdult ? loggedInAdult.name.split(',')[0].trim() : '';
  var _roleLabel    = ROLE_LABELS[role] || role;
  var badgeEl = document.getElementById('user-badge');
  var roleLblEl = document.getElementById('user-role-lbl');
  if(badgeEl)    badgeEl.textContent    = _displayName || _roleLabel;
  if(roleLblEl)  roleLblEl.textContent  = _displayName ? _roleLabel : '';
  var lwi = document.getElementById('logout-wrap-inner'); if(lwi){ lwi.style.display = 'flex'; }
  var ft = document.getElementById('app-footer'); if(ft) ft.style.display = 'flex';
  var fv = document.getElementById('footer-version'); if(fv) fv.textContent = 'v' + APP_VERSION + '.' + APP_BUILD;

  // Record login (skip on session restore to avoid duplicate log entries)
  if(!window._restoringSession) _recordLogin(role);

  // Start inactivity timer
  _resetInactivityTimer();

  // Init app panels
  initApp();

  // Render tabs and land on first one
  var firstTab = ROLE_TABS[role][0];
  currentTab = firstTab;
  renderTabs(firstTab);
  switchTab(firstTab, null);
}

function applyRoleTabs(role){
  var allowed = ROLE_TABS[role];
  // Hide/show tab buttons
  document.querySelectorAll('.tab').forEach(function(btn){
    var onclick = btn.getAttribute('onclick') || '';
    var match = onclick.match(/switchTab\('([^']+)'/);
    var tabId = match ? match[1] : '';
    btn.style.display = allowed.indexOf(tabId) >= 0 ? '' : 'none';
  });
  // Kiosk role: hide header controls too (logout stays)
  if(role === 'kiosk'){
    // Kiosk: show who's logged in but no Sign Out button
    var lbtn = document.getElementById('logout-btn'); if(lbtn) lbtn.style.display = 'none';
    document.getElementById('logout-wrap').style.display = 'none';
  }
}

function doLogout(){
  _clearInactivityTimer();
  currentRole = null;
  loggedInAdult = null;
  try { localStorage.removeItem('jrc_saved_role'); } catch(e){}
  try { localStorage.removeItem('jrc_logged_adult'); } catch(e){}
  try { localStorage.removeItem('jrc_session_expiry'); } catch(e){}

  // Hide app, show login
  document.getElementById('main-app').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  var ft = document.getElementById('app-footer'); if(ft) ft.style.display = 'none';
  var lwi = document.getElementById('logout-wrap-inner'); if(lwi) lwi.style.display = 'none';
  var lbtn = document.getElementById('logout-btn'); if(lbtn) lbtn.style.display = '';

  // Reset login form to personal login
  document.getElementById('personal-login').style.display = 'block';
  document.getElementById('role-select').style.display = 'none';
  var e = document.getElementById('pl-email'); if(e) e.value = '';
  var p = document.getElementById('pl-password'); if(p) p.value = '';
  var err = document.getElementById('pl-err'); if(err) err.textContent = '';
}

// Logo set by hlsrB64 block above


