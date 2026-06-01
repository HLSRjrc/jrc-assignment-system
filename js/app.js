// JRC Assignment System — Main Application Script
// Loaded via <script src="/js/app.js"></script>

// ============================================================
// DATA
// ============================================================

var SL = {'8am':'8:00am–12:00pm','12pm':'12:00pm–4:00pm','4pm':'4:00pm–8:00pm'};
var SHOW_START = new Date('2027-03-02');
var SHOW_END = new Date('2027-03-20');

var currentShift = '8am';
var currentDate = new Date().toISOString().slice(0,10); // always starts as today
var activePick = null;
var activePickShift = null;
var lockedJuniors = new Set(); // jid strings
var activeNotePick = null;
var checkInOrder = 0;
var APP_VERSION = 18;  // Major version — milestone releases
var APP_BUILD   = 11;  // Minor build — increments every small change
var clockedOut = {}; // jid -> true when clocked out after a shift
var dirtyJuniors = new Set(); // track juniors modified this session
var simTimeOffset = 0;    // ms offset from real time
var simTimeEnabled = false;
var simDateSet = false;   // true once user has explicitly set date/time
function getSimTime(){
  // Always apply offset — when sim not enabled, offset is 0 (real time behavior)
  return new Date(Date.now() + (simTimeEnabled ? simTimeOffset : 0));
}
function getShiftFromTime(t){
  // t = Date object
  var h = t.getHours() + t.getMinutes()/60;
  if(h >= 6  && h < 10) return '8am';
  if(h >= 10 && h < 14) return '12pm';
  if(h >= 14 && h < 21) return '4pm';
  return '8am'; // default outside show hours
}
function setSimTime(h, m){
  var now = new Date();
  var target = new Date();
  target.setHours(h, m, 0, 0);
  simTimeOffset = target - now;
  simTimeEnabled = true;
  simDateSet = true;
  // Persist sim settings to localStorage immediately — independent of Neon
  try { localStorage.setItem('jrc_simstate', JSON.stringify({
    simTimeEnabled: true, simTimeOffset: simTimeOffset,
    simDateSet: true, currentDate: currentDate, currentShift: currentShift
  })); } catch(e){}
}
function clearSimTime(){
  simTimeOffset = 0;
  simTimeEnabled = false;
  simDateSet = false;
  currentDate = new Date().toISOString().slice(0,10);
  currentShift = getShiftFromTime(new Date());
  try { localStorage.removeItem(('jrc_simstate_v' + APP_VERSION)); } catch(e){}
  try { localStorage.removeItem('jrc_simstate'); } catch(e){}
  updateHeaderDate();
}
var pendingJr = null;

// ROSTER — junior leaders sample
var juniors = []; // loaded from Neon on login
var adults  = []; // loaded from Neon on login
var userRoles = {}; // {adult_id: 'admin'|'officer'|'scheduling'} — set by admin
var loginLog  = []; // [{ts, name, role, device}] — last 500 entries
var loggedInAdult = null; // the currently authenticated adult


// COMMITTEE LIBRARY — all 43 real committees from 2025-2026 request forms
// Each shift entry: {shift, cap}
var committeeLibrary = [
  {id:1, name:'Agricultural Mechanics', hat:false, all20:false, shifts:[{shift:'12pm',cap:4}]},
  {id:2, name:'Agriculture Education', hat:false, all20:true, shifts:[{shift:'8am',cap:5},{shift:'12pm',cap:5},{shift:'4pm',cap:5}]},
  {id:3, name:'Armed Forces Appreciation', hat:true, all20:false, shifts:[{shift:'12pm',cap:4}]},
  {id:4, name:'Black Heritage', hat:false, all20:false, shifts:[{shift:'12pm',cap:4}]},
  {id:5, name:'Breeders Greeters', hat:false, all20:false, shifts:[{shift:'12pm',cap:4}]},
  {id:6, name:'Commercial Exhibits', hat:false, all20:true, shifts:[{shift:'8am',cap:2},{shift:'12pm',cap:2},{shift:'4pm',cap:2}]},
  {id:7, name:'Communications & Special Services', hat:false, all20:true, shifts:[{shift:'4pm',cap:2}]},
  {id:8, name:'Cutting Horse', hat:true, all20:false, shifts:[{shift:'12pm',cap:4}]},
  {id:9, name:'Directions & Assistance', hat:false, all20:true, shifts:[{shift:'8am',cap:4},{shift:'12pm',cap:6},{shift:'4pm',cap:8}]},
  {id:10, name:'Feed Store', hat:false, all20:true, shifts:[{shift:'8am',cap:2},{shift:'12pm',cap:2}]},
  {id:11, name:'Gatekeepers', hat:true, all20:true, shifts:[{shift:'8am',cap:4},{shift:'12pm',cap:4},{shift:'4pm',cap:4}]},
  {id:12, name:'Go Tejano', hat:true, all20:true, shifts:[{shift:'12pm',cap:3}]},
  {id:13, name:'Grand Entry', hat:true, all20:true, shifts:[{shift:'4pm',cap:4}]},
  {id:14, name:'Grounds Tickets', hat:false, all20:false, shifts:[{shift:'12pm',cap:4}]},
  {id:15, name:'Horse Show Chuckwagon', hat:true, all20:true, shifts:[{shift:'8am',cap:4}]},
  {id:16, name:'Horspitality', hat:true, all20:false, shifts:[{shift:'12pm',cap:4}]},
  {id:17, name:'Horticulture', hat:false, all20:true, shifts:[{shift:'8am',cap:4},{shift:'12pm',cap:2},{shift:'4pm',cap:2}]},
  {id:18, name:'Houston General Go Texan', hat:false, all20:false, shifts:[{shift:'12pm',cap:4}]},
  {id:19, name:'Industrial Craft Competition', hat:false, all20:false, shifts:[{shift:'12pm',cap:4}]},
  {id:20, name:'International', hat:false, all20:false, shifts:[{shift:'12pm',cap:4}]},
  {id:21, name:'Judging Contest', hat:false, all20:false, shifts:[{shift:'12pm',cap:4}]},
  {id:22, name:"Lamb & Goat Auction", hat:false, all20:false, shifts:[{shift:'12pm',cap:4}]},
  {id:23, name:'Livestock', hat:false, all20:true, shifts:[{shift:'8am',cap:5},{shift:'12pm',cap:5}]},
  {id:24, name:'Llama and Alpaca', hat:false, all20:false, shifts:[{shift:'12pm',cap:4}]},
  {id:25, name:'Magazine', hat:false, all20:false, shifts:[{shift:'12pm',cap:4}]},
  {id:26, name:"Mutton Bustin'", hat:true, all20:true, shifts:[{shift:'12pm',cap:10},{shift:'4pm',cap:10}]},
  {id:27, name:'Quarter Horse', hat:true, all20:false, shifts:[{shift:'12pm',cap:4}]},
  {id:28, name:'Rabbit', hat:false, all20:false, shifts:[{shift:'12pm',cap:4}]},
  {id:29, name:'Ranch Rodeo', hat:false, all20:false, shifts:[{shift:'12pm',cap:4}]},
  {id:30, name:'Ranch Sorting', hat:false, all20:false, shifts:[{shift:'12pm',cap:4}]},
  {id:31, name:'Ranching & Wildlife', hat:false, all20:false, shifts:[{shift:'12pm',cap:4}]},
  {id:32, name:'Recycling', hat:false, all20:true, shifts:[{shift:'8am',cap:2},{shift:'12pm',cap:2}]},
  {id:33, name:'Rodeo Contestant Services', hat:false, all20:true, shifts:[{shift:'4pm',cap:4}]},
  {id:34, name:'Rodeo Express', hat:false, all20:true, shifts:[{shift:'4pm',cap:12}]},
  {id:35, name:'Rodeo Merchandise', hat:false, all20:true, shifts:[{shift:'12pm',cap:2},{shift:'4pm',cap:4}]},
  {id:36, name:'Sheep & Goat', hat:false, all20:false, shifts:[{shift:'12pm',cap:4}]},
  {id:37, name:'Special Attractions', hat:false, all20:true, shifts:[{shift:'8am',cap:4},{shift:'12pm',cap:4},{shift:'4pm',cap:4}]},
  {id:38, name:"Special Children's", hat:false, all20:false, shifts:[{shift:'12pm',cap:4}]},
  {id:39, name:'Steer Auction', hat:true, all20:false, shifts:[{shift:'12pm',cap:4}]},
  {id:40, name:'Tours', hat:false, all20:true, shifts:[{shift:'8am',cap:5},{shift:'12pm',cap:4},{shift:'4pm',cap:4}]},
  {id:41, name:'Trailblazer', hat:false, all20:false, shifts:[{shift:'12pm',cap:4}]},
  {id:42, name:'Transportation', hat:true, all20:true, shifts:[{shift:'8am',cap:10},{shift:'12pm',cap:10},{shift:'4pm',cap:10}]},
  {id:43, name:'Wine Garden', hat:false, all20:false, shifts:[{shift:'12pm',cap:4}]}
];

var activeSlots = [];
var notesState = {};
var onShiftJuniors = new Set(); // jids marked as out on shift
var onShiftSlots = new Set();   // slot ids marked as sent
var onShiftSlots = new Set(); // slot ids marked as sent
var notesCollapsed = false;
var committeeRequests = [];
var requestIdCounter = 1;

var SCHEDULE_2026 = {
  "2026-03-02":[{name:"Agriculture Education",shift:"12pm",cap:5,hat:false},{name:"Breeders Greeters",shift:"12pm",cap:3,hat:false},{name:"Commercial Exhibits",shift:"12pm",cap:2,hat:false},{name:"Directions & Assistance",shift:"12pm",cap:6,hat:false},{name:"Feed Store",shift:"12pm",cap:2,hat:false},{name:"Gatekeepers",shift:"12pm",cap:4,hat:true},{name:"Go Tejano",shift:"12pm",cap:3,hat:true},{name:"Horticulture",shift:"12pm",cap:2,hat:false},{name:"Livestock",shift:"12pm",cap:5,hat:false},{name:"Mutton Bustin'",shift:"12pm",cap:10,hat:true},{name:"Rabbit",shift:"12pm",cap:6,hat:false},{name:"Recycling",shift:"12pm",cap:2,hat:false},{name:"Rodeo Merchandise",shift:"12pm",cap:2,hat:false},{name:"Sheep & Goat",shift:"12pm",cap:5,hat:false},{name:"Special Attractions",shift:"12pm",cap:4,hat:false},{name:"Tours",shift:"12pm",cap:4,hat:false},{name:"Transportation",shift:"12pm",cap:10,hat:true},{name:"Wine Garden",shift:"12pm",cap:15,hat:false},{name:"Agriculture Education",shift:"4pm",cap:5,hat:false},{name:"Commercial Exhibits",shift:"4pm",cap:2,hat:false},{name:"Communications & Special Services",shift:"4pm",cap:2,hat:false},{name:"Directions & Assistance",shift:"4pm",cap:8,hat:false},{name:"Gatekeepers",shift:"4pm",cap:4,hat:true},{name:"Grand Entry",shift:"4pm",cap:4,hat:true},{name:"Horticulture",shift:"4pm",cap:2,hat:false},{name:"Mutton Bustin'",shift:"4pm",cap:10,hat:true},{name:"Rodeo Contestant Services",shift:"4pm",cap:4,hat:false},{name:"Rodeo Express",shift:"4pm",cap:12,hat:false},{name:"Rodeo Merchandise",shift:"4pm",cap:4,hat:false},{name:"Sheep & Goat",shift:"4pm",cap:5,hat:false},{name:"Special Attractions",shift:"4pm",cap:4,hat:false},{name:"Special Children'S",shift:"4pm",cap:10,hat:false},{name:"Tours",shift:"4pm",cap:4,hat:false},{name:"Transportation",shift:"4pm",cap:10,hat:true},{name:"Wine Garden",shift:"4pm",cap:10,hat:false},{name:"Agriculture Education",shift:"8am",cap:5,hat:false},{name:"Breeders Greeters",shift:"8am",cap:3,hat:false},{name:"Commercial Exhibits",shift:"8am",cap:2,hat:false},{name:"Directions & Assistance",shift:"8am",cap:4,hat:false},{name:"Feed Store",shift:"8am",cap:2,hat:false},{name:"Gatekeepers",shift:"8am",cap:4,hat:true},{name:"Horse Show Chuckwagon",shift:"8am",cap:4,hat:true},{name:"Horticulture",shift:"8am",cap:4,hat:false},{name:"Livestock",shift:"8am",cap:5,hat:false},{name:"Rabbit",shift:"8am",cap:6,hat:false},{name:"Recycling",shift:"8am",cap:2,hat:false},{name:"Sheep & Goat",shift:"8am",cap:5,hat:false},{name:"Special Attractions",shift:"8am",cap:4,hat:false},{name:"Tours",shift:"8am",cap:5,hat:false},{name:"Transportation",shift:"8am",cap:10,hat:true}],
  "2026-03-03":[{name:"Agriculture Education",shift:"12pm",cap:5,hat:false},{name:"Breeders Greeters",shift:"12pm",cap:3,hat:false},{name:"Commercial Exhibits",shift:"12pm",cap:2,hat:false},{name:"Directions & Assistance",shift:"12pm",cap:6,hat:false},{name:"Feed Store",shift:"12pm",cap:2,hat:false},{name:"Gatekeepers",shift:"12pm",cap:4,hat:true},{name:"Go Tejano",shift:"12pm",cap:3,hat:true},{name:"Horticulture",shift:"12pm",cap:2,hat:false},{name:"Livestock",shift:"12pm",cap:5,hat:false},{name:"Magazine",shift:"12pm",cap:2,hat:false},{name:"Mutton Bustin'",shift:"12pm",cap:10,hat:true},{name:"Rabbit",shift:"12pm",cap:6,hat:false},{name:"Ranching & Wildlife",shift:"12pm",cap:5,hat:false},{name:"Recycling",shift:"12pm",cap:2,hat:false},{name:"Rodeo Merchandise",shift:"12pm",cap:2,hat:false},{name:"Sheep & Goat",shift:"12pm",cap:4,hat:false},{name:"Special Attractions",shift:"12pm",cap:4,hat:false},{name:"Tours",shift:"12pm",cap:4,hat:false},{name:"Transportation",shift:"12pm",cap:10,hat:true},{name:"Agriculture Education",shift:"4pm",cap:5,hat:false},{name:"Commercial Exhibits",shift:"4pm",cap:2,hat:false},{name:"Communications & Special Services",shift:"4pm",cap:2,hat:false},{name:"Directions & Assistance",shift:"4pm",cap:8,hat:false},{name:"Gatekeepers",shift:"4pm",cap:4,hat:true},{name:"Grand Entry",shift:"4pm",cap:4,hat:true},{name:"Horticulture",shift:"4pm",cap:2,hat:false},{name:"Magazine",shift:"4pm",cap:2,hat:false},{name:"Mutton Bustin'",shift:"4pm",cap:10,hat:true},{name:"Rodeo Contestant Services",shift:"4pm",cap:4,hat:false},{name:"Rodeo Express",shift:"4pm",cap:12,hat:false},{name:"Rodeo Merchandise",shift:"4pm",cap:4,hat:false},{name:"Sheep & Goat",shift:"4pm",cap:4,hat:false},{name:"Special Attractions",shift:"4pm",cap:4,hat:false},{name:"Tours",shift:"4pm",cap:4,hat:false},{name:"Transportation",shift:"4pm",cap:10,hat:true},{name:"Agriculture Education",shift:"8am",cap:5,hat:false},{name:"Breeders Greeters",shift:"8am",cap:3,hat:false},{name:"Commercial Exhibits",shift:"8am",cap:2,hat:false},{name:"Directions & Assistance",shift:"8am",cap:4,hat:false},{name:"Feed Store",shift:"8am",cap:2,hat:false},{name:"Gatekeepers",shift:"8am",cap:4,hat:true},{name:"Horse Show Chuckwagon",shift:"8am",cap:4,hat:true},{name:"Horticulture",shift:"8am",cap:4,hat:false},{name:"Judging Contest",shift:"8am",cap:6,hat:false},{name:"Livestock",shift:"8am",cap:5,hat:false},{name:"Magazine",shift:"8am",cap:2,hat:false},{name:"Rabbit",shift:"8am",cap:6,hat:false},{name:"Recycling",shift:"8am",cap:2,hat:false},{name:"Sheep & Goat",shift:"8am",cap:4,hat:false},{name:"Special Attractions",shift:"8am",cap:4,hat:false},{name:"Tours",shift:"8am",cap:5,hat:false},{name:"Transportation",shift:"8am",cap:10,hat:true}],
  "2026-03-04":[{name:"Agriculture Education",shift:"12pm",cap:5,hat:false},{name:"Armed Forces Appreciation",shift:"12pm",cap:10,hat:true},{name:"Commercial Exhibits",shift:"12pm",cap:2,hat:false},{name:"Directions & Assistance",shift:"12pm",cap:6,hat:false},{name:"Feed Store",shift:"12pm",cap:2,hat:false},{name:"Gatekeepers",shift:"12pm",cap:4,hat:true},{name:"Go Tejano",shift:"12pm",cap:3,hat:true},{name:"Horspitality",shift:"12pm",cap:4,hat:true},{name:"Horticulture",shift:"12pm",cap:2,hat:false},{name:"Livestock",shift:"12pm",cap:5,hat:false},{name:"Mutton Bustin'",shift:"12pm",cap:10,hat:true},{name:"Rabbit",shift:"12pm",cap:6,hat:false},{name:"Ranching & Wildlife",shift:"12pm",cap:5,hat:false},{name:"Recycling",shift:"12pm",cap:2,hat:false},{name:"Rodeo Merchandise",shift:"12pm",cap:2,hat:false},{name:"Sheep & Goat",shift:"12pm",cap:8,hat:false},{name:"Special Attractions",shift:"12pm",cap:4,hat:false},{name:"Tours",shift:"12pm",cap:4,hat:false},{name:"Transportation",shift:"12pm",cap:10,hat:true},{name:"Agriculture Education",shift:"4pm",cap:5,hat:false},{name:"Commercial Exhibits",shift:"4pm",cap:2,hat:false},{name:"Communications & Special Services",shift:"4pm",cap:2,hat:false},{name:"Directions & Assistance",shift:"4pm",cap:8,hat:false},{name:"Gatekeepers",shift:"4pm",cap:4,hat:true},{name:"Grand Entry",shift:"4pm",cap:4,hat:true},{name:"Horspitality",shift:"4pm",cap:4,hat:true},{name:"Horticulture",shift:"4pm",cap:2,hat:false},{name:"Mutton Bustin'",shift:"4pm",cap:10,hat:true},{name:"Rodeo Contestant Services",shift:"4pm",cap:4,hat:false},{name:"Rodeo Express",shift:"4pm",cap:12,hat:false},{name:"Rodeo Merchandise",shift:"4pm",cap:4,hat:false},{name:"Sheep & Goat",shift:"4pm",cap:8,hat:false},{name:"Special Attractions",shift:"4pm",cap:4,hat:false},{name:"Tours",shift:"4pm",cap:4,hat:false},{name:"Transportation",shift:"4pm",cap:10,hat:true},{name:"Agriculture Education",shift:"8am",cap:5,hat:false},{name:"Armed Forces Appreciation",shift:"8am",cap:10,hat:true},{name:"Commercial Exhibits",shift:"8am",cap:2,hat:false},{name:"Cutting Horse",shift:"8am",cap:4,hat:true},{name:"Directions & Assistance",shift:"8am",cap:4,hat:false},{name:"Feed Store",shift:"8am",cap:2,hat:false},{name:"Gatekeepers",shift:"8am",cap:4,hat:true},{name:"Horse Show Chuckwagon",shift:"8am",cap:4,hat:true},{name:"Horspitality",shift:"8am",cap:4,hat:true},{name:"Horticulture",shift:"8am",cap:4,hat:false},{name:"Livestock",shift:"8am",cap:5,hat:false},{name:"Rabbit",shift:"8am",cap:6,hat:false},{name:"Recycling",shift:"8am",cap:2,hat:false},{name:"Sheep & Goat",shift:"8am",cap:8,hat:false},{name:"Special Attractions",shift:"8am",cap:4,hat:false},{name:"Special Children'S",shift:"8am",cap:7,hat:false},{name:"Tours",shift:"8am",cap:5,hat:false},{name:"Transportation",shift:"8am",cap:10,hat:true}],
  "2026-03-05":[{name:"Agriculture Education",shift:"12pm",cap:5,hat:false},{name:"Commercial Exhibits",shift:"12pm",cap:2,hat:false},{name:"Directions & Assistance",shift:"12pm",cap:6,hat:false},{name:"Feed Store",shift:"12pm",cap:2,hat:false},{name:"Gatekeepers",shift:"12pm",cap:4,hat:true},{name:"Go Tejano",shift:"12pm",cap:3,hat:true},{name:"Horticulture",shift:"12pm",cap:2,hat:false},{name:"Livestock",shift:"12pm",cap:5,hat:false},{name:"Mutton Bustin'",shift:"12pm",cap:10,hat:true},{name:"Rabbit",shift:"12pm",cap:6,hat:false},{name:"Ranch Rodeo",shift:"12pm",cap:2,hat:true},{name:"Recycling",shift:"12pm",cap:2,hat:false},{name:"Rodeo Merchandise",shift:"12pm",cap:2,hat:false},{name:"Special Attractions",shift:"12pm",cap:4,hat:false},{name:"Tours",shift:"12pm",cap:4,hat:false},{name:"Transportation",shift:"12pm",cap:10,hat:true},{name:"Agriculture Education",shift:"4pm",cap:5,hat:false},{name:"Commercial Exhibits",shift:"4pm",cap:2,hat:false},{name:"Communications & Special Services",shift:"4pm",cap:2,hat:false},{name:"Directions & Assistance",shift:"4pm",cap:8,hat:false},{name:"Gatekeepers",shift:"4pm",cap:4,hat:true},{name:"Grand Entry",shift:"4pm",cap:4,hat:true},{name:"Horticulture",shift:"4pm",cap:2,hat:false},{name:"Mutton Bustin'",shift:"4pm",cap:10,hat:true},{name:"Ranch Rodeo",shift:"4pm",cap:2,hat:false},{name:"Rodeo Contestant Services",shift:"4pm",cap:4,hat:false},{name:"Rodeo Express",shift:"4pm",cap:12,hat:false},{name:"Rodeo Merchandise",shift:"4pm",cap:4,hat:false},{name:"Special Attractions",shift:"4pm",cap:4,hat:false},{name:"Tours",shift:"4pm",cap:4,hat:false},{name:"Transportation",shift:"4pm",cap:10,hat:true},{name:"Agriculture Education",shift:"8am",cap:5,hat:false},{name:"Commercial Exhibits",shift:"8am",cap:2,hat:false},{name:"Directions & Assistance",shift:"8am",cap:4,hat:false},{name:"Feed Store",shift:"8am",cap:2,hat:false},{name:"Gatekeepers",shift:"8am",cap:4,hat:true},{name:"Horse Show Chuckwagon",shift:"8am",cap:4,hat:true},{name:"Horticulture",shift:"8am",cap:4,hat:false},{name:"Livestock",shift:"8am",cap:5,hat:false},{name:"Rabbit",shift:"8am",cap:6,hat:false},{name:"Ranch Rodeo",shift:"8am",cap:2,hat:false},{name:"Recycling",shift:"8am",cap:2,hat:false},{name:"Special Attractions",shift:"8am",cap:4,hat:false},{name:"Tours",shift:"8am",cap:5,hat:false},{name:"Transportation",shift:"8am",cap:10,hat:true}],
  "2026-03-06":[{name:"Agriculture Education",shift:"12pm",cap:5,hat:false},{name:"Black Heritage",shift:"12pm",cap:10,hat:false},{name:"Commercial Exhibits",shift:"12pm",cap:2,hat:false},{name:"Directions & Assistance",shift:"12pm",cap:6,hat:false},{name:"Feed Store",shift:"12pm",cap:2,hat:false},{name:"Gatekeepers",shift:"12pm",cap:4,hat:true},{name:"Go Tejano",shift:"12pm",cap:3,hat:true},{name:"Horticulture",shift:"12pm",cap:2,hat:false},{name:"Livestock",shift:"12pm",cap:5,hat:false},{name:"Mutton Bustin'",shift:"12pm",cap:10,hat:true},{name:"Rabbit",shift:"12pm",cap:6,hat:false},{name:"Ranch Rodeo",shift:"12pm",cap:2,hat:true},{name:"Recycling",shift:"12pm",cap:2,hat:false},{name:"Rodeo Express",shift:"12pm",cap:12,hat:false},{name:"Rodeo Merchandise",shift:"12pm",cap:2,hat:false},{name:"Special Attractions",shift:"12pm",cap:4,hat:false},{name:"Tours",shift:"12pm",cap:4,hat:false},{name:"Trailblazer",shift:"12pm",cap:4,hat:false},{name:"Transportation",shift:"12pm",cap:10,hat:true},{name:"Agriculture Education",shift:"4pm",cap:5,hat:false},{name:"Commercial Exhibits",shift:"4pm",cap:2,hat:false},{name:"Communications & Special Services",shift:"4pm",cap:2,hat:false},{name:"Directions & Assistance",shift:"4pm",cap:8,hat:false},{name:"Gatekeepers",shift:"4pm",cap:4,hat:true},{name:"Grand Entry",shift:"4pm",cap:4,hat:true},{name:"Horticulture",shift:"4pm",cap:2,hat:false},{name:"Mutton Bustin'",shift:"4pm",cap:10,hat:true},{name:"Rabbit",shift:"4pm",cap:8,hat:false},{name:"Ranch Rodeo",shift:"4pm",cap:2,hat:false},{name:"Rodeo Contestant Services",shift:"4pm",cap:4,hat:false},{name:"Rodeo Express",shift:"4pm",cap:12,hat:false},{name:"Rodeo Merchandise",shift:"4pm",cap:4,hat:false},{name:"Special Attractions",shift:"4pm",cap:4,hat:false},{name:"Tours",shift:"4pm",cap:4,hat:false},{name:"Transportation",shift:"4pm",cap:10,hat:true},{name:"Agriculture Education",shift:"8am",cap:5,hat:false},{name:"Black Heritage",shift:"8am",cap:10,hat:false},{name:"Commercial Exhibits",shift:"8am",cap:2,hat:false},{name:"Directions & Assistance",shift:"8am",cap:4,hat:false},{name:"Feed Store",shift:"8am",cap:2,hat:false},{name:"Gatekeepers",shift:"8am",cap:4,hat:true},{name:"Horse Show Chuckwagon",shift:"8am",cap:4,hat:true},{name:"Horticulture",shift:"8am",cap:4,hat:false},{name:"Livestock",shift:"8am",cap:5,hat:false},{name:"Rabbit",shift:"8am",cap:6,hat:false},{name:"Ranch Rodeo",shift:"8am",cap:2,hat:false},{name:"Recycling",shift:"8am",cap:2,hat:false},{name:"Special Attractions",shift:"8am",cap:4,hat:false},{name:"Tours",shift:"8am",cap:5,hat:false},{name:"Transportation",shift:"8am",cap:10,hat:true}],
  "2026-03-07":[{name:"Agriculture Education",shift:"12pm",cap:5,hat:false},{name:"Breeders Greeters",shift:"12pm",cap:3,hat:false},{name:"Commercial Exhibits",shift:"12pm",cap:2,hat:false},{name:"Directions & Assistance",shift:"12pm",cap:6,hat:false},{name:"Feed Store",shift:"12pm",cap:2,hat:false},{name:"Gatekeepers",shift:"12pm",cap:4,hat:true},{name:"Go Tejano",shift:"12pm",cap:3,hat:true},{name:"Horspitality",shift:"12pm",cap:4,hat:true},{name:"Horticulture",shift:"12pm",cap:2,hat:false},{name:"Industrial Craft Competition",shift:"12pm",cap:4,hat:false},{name:"International",shift:"12pm",cap:2,hat:false},{name:"Livestock",shift:"12pm",cap:5,hat:false},{name:"Mutton Bustin'",shift:"12pm",cap:10,hat:true},{name:"Rabbit",shift:"12pm",cap:8,hat:false},{name:"Ranch Rodeo",shift:"12pm",cap:2,hat:true},{name:"Ranching & Wildlife",shift:"12pm",cap:5,hat:false},{name:"Recycling",shift:"12pm",cap:2,hat:false},{name:"Rodeo Express",shift:"12pm",cap:12,hat:false},{name:"Rodeo Merchandise",shift:"12pm",cap:2,hat:false},{name:"Special Attractions",shift:"12pm",cap:4,hat:false},{name:"Tours",shift:"12pm",cap:4,hat:false},{name:"Trailblazer",shift:"12pm",cap:4,hat:false},{name:"Transportation",shift:"12pm",cap:10,hat:true},{name:"Wine Garden",shift:"12pm",cap:5,hat:false},{name:"Agriculture Education",shift:"4pm",cap:5,hat:false},{name:"Commercial Exhibits",shift:"4pm",cap:2,hat:false},{name:"Communications & Special Services",shift:"4pm",cap:2,hat:false},{name:"Directions & Assistance",shift:"4pm",cap:8,hat:false},{name:"Gatekeepers",shift:"4pm",cap:4,hat:true},{name:"Grand Entry",shift:"4pm",cap:4,hat:true},{name:"Grounds Tickets",shift:"4pm",cap:4,hat:false},{name:"Horspitality",shift:"4pm",cap:4,hat:true},{name:"Horticulture",shift:"4pm",cap:2,hat:false},{name:"Industrial Craft Competition",shift:"4pm",cap:4,hat:false},{name:"Mutton Bustin'",shift:"4pm",cap:10,hat:true},{name:"Rabbit",shift:"4pm",cap:8,hat:false},{name:"Ranch Rodeo",shift:"4pm",cap:2,hat:false},{name:"Rodeo Contestant Services",shift:"4pm",cap:4,hat:false},{name:"Rodeo Express",shift:"4pm",cap:12,hat:false},{name:"Rodeo Merchandise",shift:"4pm",cap:4,hat:false},{name:"Sheep & Goat",shift:"4pm",cap:4,hat:false},{name:"Special Attractions",shift:"4pm",cap:4,hat:false},{name:"Tours",shift:"4pm",cap:4,hat:false},{name:"Transportation",shift:"4pm",cap:10,hat:true},{name:"Agriculture Education",shift:"8am",cap:5,hat:false},{name:"Breeders Greeters",shift:"8am",cap:3,hat:false},{name:"Commercial Exhibits",shift:"8am",cap:2,hat:false},{name:"Directions & Assistance",shift:"8am",cap:4,hat:false},{name:"Feed Store",shift:"8am",cap:2,hat:false},{name:"Gatekeepers",shift:"8am",cap:4,hat:true},{name:"Grounds Tickets",shift:"8am",cap:4,hat:false},{name:"Horse Show Chuckwagon",shift:"8am",cap:4,hat:true},{name:"Horspitality",shift:"8am",cap:4,hat:true},{name:"Horticulture",shift:"8am",cap:4,hat:false},{name:"Industrial Craft Competition",shift:"8am",cap:4,hat:false},{name:"International",shift:"8am",cap:2,hat:false},{name:"Livestock",shift:"8am",cap:5,hat:false},{name:"Rabbit",shift:"8am",cap:8,hat:false},{name:"Ranch Rodeo",shift:"8am",cap:2,hat:false},{name:"Ranching & Wildlife",shift:"8am",cap:5,hat:false},{name:"Recycling",shift:"8am",cap:2,hat:false},{name:"Special Attractions",shift:"8am",cap:4,hat:false},{name:"Tours",shift:"8am",cap:5,hat:false},{name:"Trailblazer",shift:"8am",cap:4,hat:false},{name:"Transportation",shift:"8am",cap:10,hat:true}],
  "2026-03-08":[{name:"Agriculture Education",shift:"12pm",cap:5,hat:false},{name:"Commercial Exhibits",shift:"12pm",cap:2,hat:false},{name:"Directions & Assistance",shift:"12pm",cap:6,hat:false},{name:"Feed Store",shift:"12pm",cap:2,hat:false},{name:"Gatekeepers",shift:"12pm",cap:4,hat:true},{name:"Go Tejano",shift:"12pm",cap:3,hat:true},{name:"Horticulture",shift:"12pm",cap:2,hat:false},{name:"Livestock",shift:"12pm",cap:5,hat:false},{name:"Mutton Bustin'",shift:"12pm",cap:10,hat:true},{name:"Rabbit",shift:"12pm",cap:6,hat:false},{name:"Ranch Sorting",shift:"12pm",cap:7,hat:false},{name:"Recycling",shift:"12pm",cap:2,hat:false},{name:"Rodeo Express",shift:"12pm",cap:12,hat:false},{name:"Rodeo Merchandise",shift:"12pm",cap:2,hat:false},{name:"Sheep & Goat",shift:"12pm",cap:6,hat:false},{name:"Special Attractions",shift:"12pm",cap:4,hat:false},{name:"Tours",shift:"12pm",cap:4,hat:false},{name:"Trailblazer",shift:"12pm",cap:4,hat:false},{name:"Transportation",shift:"12pm",cap:10,hat:true},{name:"Agriculture Education",shift:"4pm",cap:5,hat:false},{name:"Commercial Exhibits",shift:"4pm",cap:2,hat:false},{name:"Communications & Special Services",shift:"4pm",cap:2,hat:false},{name:"Directions & Assistance",shift:"4pm",cap:8,hat:false},{name:"Gatekeepers",shift:"4pm",cap:4,hat:true},{name:"Grand Entry",shift:"4pm",cap:4,hat:true},{name:"Grounds Tickets",shift:"4pm",cap:4,hat:false},{name:"Horticulture",shift:"4pm",cap:2,hat:false},{name:"Mutton Bustin'",shift:"4pm",cap:10,hat:true},{name:"Rabbit",shift:"4pm",cap:6,hat:false},{name:"Rodeo Contestant Services",shift:"4pm",cap:4,hat:false},{name:"Rodeo Express",shift:"4pm",cap:12,hat:false},{name:"Rodeo Merchandise",shift:"4pm",cap:4,hat:false},{name:"Sheep & Goat",shift:"4pm",cap:5,hat:false},{name:"Special Attractions",shift:"4pm",cap:4,hat:false},{name:"Tours",shift:"4pm",cap:4,hat:false},{name:"Transportation",shift:"4pm",cap:10,hat:true},{name:"Agriculture Education",shift:"8am",cap:5,hat:false},{name:"Commercial Exhibits",shift:"8am",cap:2,hat:false},{name:"Directions & Assistance",shift:"8am",cap:4,hat:false},{name:"Feed Store",shift:"8am",cap:2,hat:false},{name:"Gatekeepers",shift:"8am",cap:4,hat:true},{name:"Grounds Tickets",shift:"8am",cap:4,hat:false},{name:"Horse Show Chuckwagon",shift:"8am",cap:4,hat:true},{name:"Horticulture",shift:"8am",cap:4,hat:false},{name:"Livestock",shift:"8am",cap:5,hat:false},{name:"Rabbit",shift:"8am",cap:6,hat:false},{name:"Ranch Sorting",shift:"8am",cap:5,hat:false},{name:"Recycling",shift:"8am",cap:2,hat:false},{name:"Sheep & Goat",shift:"8am",cap:6,hat:false},{name:"Special Attractions",shift:"8am",cap:4,hat:false},{name:"Tours",shift:"8am",cap:5,hat:false},{name:"Trailblazer",shift:"8am",cap:4,hat:false},{name:"Transportation",shift:"8am",cap:10,hat:true}],
  "2026-03-09":[{name:"Agriculture Education",shift:"12pm",cap:5,hat:false},{name:"Armed Forces Appreciation",shift:"12pm",cap:10,hat:true},{name:"Breeders Greeters",shift:"12pm",cap:3,hat:false},{name:"Commercial Exhibits",shift:"12pm",cap:2,hat:false},{name:"Directions & Assistance",shift:"12pm",cap:6,hat:false},{name:"Feed Store",shift:"12pm",cap:2,hat:false},{name:"Gatekeepers",shift:"12pm",cap:4,hat:true},{name:"Go Tejano",shift:"12pm",cap:3,hat:true},{name:"Horticulture",shift:"12pm",cap:2,hat:false},{name:"Livestock",shift:"12pm",cap:5,hat:false},{name:"Mutton Bustin'",shift:"12pm",cap:10,hat:true},{name:"Rabbit",shift:"12pm",cap:6,hat:false},{name:"Ranch Sorting",shift:"12pm",cap:7,hat:false},{name:"Recycling",shift:"12pm",cap:2,hat:false},{name:"Rodeo Merchandise",shift:"12pm",cap:2,hat:false},{name:"Sheep & Goat",shift:"12pm",cap:8,hat:false},{name:"Special Attractions",shift:"12pm",cap:4,hat:false},{name:"Tours",shift:"12pm",cap:4,hat:false},{name:"Transportation",shift:"12pm",cap:10,hat:true},{name:"Agriculture Education",shift:"4pm",cap:5,hat:false},{name:"Commercial Exhibits",shift:"4pm",cap:2,hat:false},{name:"Communications & Special Services",shift:"4pm",cap:2,hat:false},{name:"Directions & Assistance",shift:"4pm",cap:8,hat:false},{name:"Gatekeepers",shift:"4pm",cap:4,hat:true},{name:"Grand Entry",shift:"4pm",cap:4,hat:true},{name:"Grounds Tickets",shift:"4pm",cap:4,hat:false},{name:"Horticulture",shift:"4pm",cap:2,hat:false},{name:"Mutton Bustin'",shift:"4pm",cap:10,hat:true},{name:"Rabbit",shift:"4pm",cap:6,hat:false},{name:"Rodeo Contestant Services",shift:"4pm",cap:4,hat:false},{name:"Rodeo Express",shift:"4pm",cap:12,hat:false},{name:"Rodeo Merchandise",shift:"4pm",cap:4,hat:false},{name:"Sheep & Goat",shift:"4pm",cap:8,hat:false},{name:"Special Attractions",shift:"4pm",cap:4,hat:false},{name:"Tours",shift:"4pm",cap:4,hat:false},{name:"Transportation",shift:"4pm",cap:10,hat:true},{name:"Agriculture Education",shift:"8am",cap:5,hat:false},{name:"Armed Forces Appreciation",shift:"8am",cap:10,hat:true},{name:"Breeders Greeters",shift:"8am",cap:3,hat:false},{name:"Commercial Exhibits",shift:"8am",cap:2,hat:false},{name:"Directions & Assistance",shift:"8am",cap:4,hat:false},{name:"Feed Store",shift:"8am",cap:2,hat:false},{name:"Gatekeepers",shift:"8am",cap:4,hat:true},{name:"Grounds Tickets",shift:"8am",cap:4,hat:false},{name:"Horse Show Chuckwagon",shift:"8am",cap:4,hat:true},{name:"Horticulture",shift:"8am",cap:4,hat:false},{name:"Livestock",shift:"8am",cap:5,hat:false},{name:"Rabbit",shift:"8am",cap:6,hat:false},{name:"Ranch Sorting",shift:"8am",cap:5,hat:false},{name:"Recycling",shift:"8am",cap:2,hat:false},{name:"Sheep & Goat",shift:"8am",cap:8,hat:false},{name:"Special Attractions",shift:"8am",cap:4,hat:false},{name:"Tours",shift:"8am",cap:5,hat:false},{name:"Transportation",shift:"8am",cap:10,hat:true}],
  "2026-03-10":[{name:"Agriculture Education",shift:"12pm",cap:5,hat:false},{name:"Breeders Greeters",shift:"12pm",cap:3,hat:false},{name:"Commercial Exhibits",shift:"12pm",cap:2,hat:false},{name:"Directions & Assistance",shift:"12pm",cap:6,hat:false},{name:"Feed Store",shift:"12pm",cap:2,hat:false},{name:"Gatekeepers",shift:"12pm",cap:4,hat:true},{name:"Go Tejano",shift:"12pm",cap:3,hat:true},{name:"Horspitality",shift:"12pm",cap:4,hat:true},{name:"Horticulture",shift:"12pm",cap:2,hat:false},{name:"Livestock",shift:"12pm",cap:5,hat:false},{name:"Mutton Bustin'",shift:"12pm",cap:10,hat:true},{name:"Rabbit",shift:"12pm",cap:8,hat:false},{name:"Ranch Sorting",shift:"12pm",cap:5,hat:false},{name:"Recycling",shift:"12pm",cap:2,hat:false},{name:"Rodeo Merchandise",shift:"12pm",cap:2,hat:false},{name:"Sheep & Goat",shift:"12pm",cap:3,hat:false},{name:"Special Attractions",shift:"12pm",cap:4,hat:false},{name:"Tours",shift:"12pm",cap:4,hat:false},{name:"Transportation",shift:"12pm",cap:10,hat:true},{name:"Agriculture Education",shift:"4pm",cap:5,hat:false},{name:"Commercial Exhibits",shift:"4pm",cap:2,hat:false},{name:"Communications & Special Services",shift:"4pm",cap:2,hat:false},{name:"Directions & Assistance",shift:"4pm",cap:8,hat:false},{name:"Gatekeepers",shift:"4pm",cap:4,hat:true},{name:"Grand Entry",shift:"4pm",cap:4,hat:true},{name:"Grounds Tickets",shift:"4pm",cap:4,hat:false},{name:"Horspitality",shift:"4pm",cap:4,hat:true},{name:"Horticulture",shift:"4pm",cap:2,hat:false},{name:"Mutton Bustin'",shift:"4pm",cap:10,hat:true},{name:"Rodeo Contestant Services",shift:"4pm",cap:4,hat:false},{name:"Rodeo Express",shift:"4pm",cap:12,hat:false},{name:"Rodeo Merchandise",shift:"4pm",cap:4,hat:false},{name:"Special Attractions",shift:"4pm",cap:4,hat:false},{name:"Special Children'S",shift:"4pm",cap:10,hat:false},{name:"Tours",shift:"4pm",cap:4,hat:false},{name:"Transportation",shift:"4pm",cap:10,hat:true},{name:"Agriculture Education",shift:"8am",cap:5,hat:false},{name:"Breeders Greeters",shift:"8am",cap:3,hat:false},{name:"Commercial Exhibits",shift:"8am",cap:2,hat:false},{name:"Directions & Assistance",shift:"8am",cap:4,hat:false},{name:"Feed Store",shift:"8am",cap:2,hat:false},{name:"Gatekeepers",shift:"8am",cap:4,hat:true},{name:"Grounds Tickets",shift:"8am",cap:4,hat:false},{name:"Horse Show Chuckwagon",shift:"8am",cap:4,hat:true},{name:"Horspitality",shift:"8am",cap:4,hat:true},{name:"Horticulture",shift:"8am",cap:4,hat:false},{name:"Livestock",shift:"8am",cap:5,hat:false},{name:"Rabbit",shift:"8am",cap:8,hat:false},{name:"Ranch Sorting",shift:"8am",cap:7,hat:false},{name:"Recycling",shift:"8am",cap:2,hat:false},{name:"Sheep & Goat",shift:"8am",cap:3,hat:false},{name:"Special Attractions",shift:"8am",cap:4,hat:false},{name:"Tours",shift:"8am",cap:5,hat:false},{name:"Transportation",shift:"8am",cap:10,hat:true}],
  "2026-03-11":[{name:"Agriculture Education",shift:"12pm",cap:5,hat:false},{name:"Commercial Exhibits",shift:"12pm",cap:2,hat:false},{name:"Directions & Assistance",shift:"12pm",cap:6,hat:false},{name:"Feed Store",shift:"12pm",cap:2,hat:false},{name:"Gatekeepers",shift:"12pm",cap:4,hat:true},{name:"Go Tejano",shift:"12pm",cap:3,hat:true},{name:"Horticulture",shift:"12pm",cap:2,hat:false},{name:"International",shift:"12pm",cap:2,hat:false},{name:"Lamb & Goat Auction",shift:"12pm",cap:5,hat:false},{name:"Livestock",shift:"12pm",cap:5,hat:false},{name:"Mutton Bustin'",shift:"12pm",cap:10,hat:true},{name:"Rabbit",shift:"12pm",cap:6,hat:false},{name:"Recycling",shift:"12pm",cap:2,hat:false},{name:"Rodeo Merchandise",shift:"12pm",cap:2,hat:false},{name:"Special Attractions",shift:"12pm",cap:4,hat:false},{name:"Tours",shift:"12pm",cap:4,hat:false},{name:"Transportation",shift:"12pm",cap:10,hat:true},{name:"Agriculture Education",shift:"4pm",cap:5,hat:false},{name:"Commercial Exhibits",shift:"4pm",cap:2,hat:false},{name:"Communications & Special Services",shift:"4pm",cap:2,hat:false},{name:"Directions & Assistance",shift:"4pm",cap:8,hat:false},{name:"Gatekeepers",shift:"4pm",cap:4,hat:true},{name:"Grand Entry",shift:"4pm",cap:4,hat:true},{name:"Grounds Tickets",shift:"4pm",cap:4,hat:false},{name:"Horticulture",shift:"4pm",cap:2,hat:false},{name:"International",shift:"4pm",cap:2,hat:false},{name:"Mutton Bustin'",shift:"4pm",cap:10,hat:true},{name:"Rodeo Contestant Services",shift:"4pm",cap:4,hat:false},{name:"Rodeo Express",shift:"4pm",cap:12,hat:false},{name:"Rodeo Merchandise",shift:"4pm",cap:4,hat:false},{name:"Special Attractions",shift:"4pm",cap:4,hat:false},{name:"Special Children'S",shift:"4pm",cap:5,hat:false},{name:"Tours",shift:"4pm",cap:4,hat:false},{name:"Transportation",shift:"4pm",cap:10,hat:true},{name:"Agriculture Education",shift:"8am",cap:5,hat:false},{name:"Commercial Exhibits",shift:"8am",cap:2,hat:false},{name:"Directions & Assistance",shift:"8am",cap:4,hat:false},{name:"Feed Store",shift:"8am",cap:2,hat:false},{name:"Gatekeepers",shift:"8am",cap:4,hat:true},{name:"Grounds Tickets",shift:"8am",cap:4,hat:false},{name:"Horse Show Chuckwagon",shift:"8am",cap:4,hat:true},{name:"Horticulture",shift:"8am",cap:4,hat:false},{name:"Lamb & Goat Auction",shift:"8am",cap:5,hat:false},{name:"Livestock",shift:"8am",cap:5,hat:false},{name:"Rabbit",shift:"8am",cap:6,hat:false},{name:"Recycling",shift:"8am",cap:2,hat:false},{name:"Special Attractions",shift:"8am",cap:4,hat:false},{name:"Tours",shift:"8am",cap:5,hat:false},{name:"Transportation",shift:"8am",cap:10,hat:true}],
  "2026-03-12":[{name:"Agriculture Education",shift:"12pm",cap:5,hat:false},{name:"Breeders Greeters",shift:"12pm",cap:3,hat:false},{name:"Commercial Exhibits",shift:"12pm",cap:2,hat:false},{name:"Directions & Assistance",shift:"12pm",cap:6,hat:false},{name:"Feed Store",shift:"12pm",cap:2,hat:false},{name:"Gatekeepers",shift:"12pm",cap:4,hat:true},{name:"Go Tejano",shift:"12pm",cap:3,hat:true},{name:"Horticulture",shift:"12pm",cap:2,hat:false},{name:"Lamb & Goat Auction",shift:"12pm",cap:5,hat:false},{name:"Livestock",shift:"12pm",cap:5,hat:false},{name:"Mutton Bustin'",shift:"12pm",cap:10,hat:true},{name:"Rabbit",shift:"12pm",cap:6,hat:false},{name:"Recycling",shift:"12pm",cap:2,hat:false},{name:"Rodeo Merchandise",shift:"12pm",cap:2,hat:false},{name:"Special Attractions",shift:"12pm",cap:4,hat:false},{name:"Tours",shift:"12pm",cap:4,hat:false},{name:"Transportation",shift:"12pm",cap:10,hat:true},{name:"Agriculture Education",shift:"4pm",cap:5,hat:false},{name:"Commercial Exhibits",shift:"4pm",cap:2,hat:false},{name:"Communications & Special Services",shift:"4pm",cap:2,hat:false},{name:"Directions & Assistance",shift:"4pm",cap:8,hat:false},{name:"Gatekeepers",shift:"4pm",cap:4,hat:true},{name:"Grand Entry",shift:"4pm",cap:4,hat:true},{name:"Grounds Tickets",shift:"4pm",cap:4,hat:false},{name:"Horticulture",shift:"4pm",cap:2,hat:false},{name:"Mutton Bustin'",shift:"4pm",cap:10,hat:true},{name:"Rodeo Contestant Services",shift:"4pm",cap:4,hat:false},{name:"Rodeo Express",shift:"4pm",cap:12,hat:false},{name:"Rodeo Merchandise",shift:"4pm",cap:4,hat:false},{name:"Special Attractions",shift:"4pm",cap:4,hat:false},{name:"Special Children'S",shift:"4pm",cap:5,hat:false},{name:"Tours",shift:"4pm",cap:4,hat:false},{name:"Transportation",shift:"4pm",cap:10,hat:true},{name:"Agriculture Education",shift:"8am",cap:5,hat:false},{name:"Breeders Greeters",shift:"8am",cap:3,hat:false},{name:"Commercial Exhibits",shift:"8am",cap:2,hat:false},{name:"Directions & Assistance",shift:"8am",cap:4,hat:false},{name:"Feed Store",shift:"8am",cap:2,hat:false},{name:"Gatekeepers",shift:"8am",cap:4,hat:true},{name:"Grounds Tickets",shift:"8am",cap:4,hat:false},{name:"Horse Show Chuckwagon",shift:"8am",cap:4,hat:true},{name:"Horticulture",shift:"8am",cap:4,hat:false},{name:"Lamb & Goat Auction",shift:"8am",cap:5,hat:false},{name:"Livestock",shift:"8am",cap:5,hat:false},{name:"Rabbit",shift:"8am",cap:6,hat:false},{name:"Recycling",shift:"8am",cap:2,hat:false},{name:"Special Attractions",shift:"8am",cap:4,hat:false},{name:"Tours",shift:"8am",cap:5,hat:false},{name:"Transportation",shift:"8am",cap:10,hat:true}],
  "2026-03-13":[{name:"Agriculture Education",shift:"12pm",cap:5,hat:false},{name:"Commercial Exhibits",shift:"12pm",cap:2,hat:false},{name:"Directions & Assistance",shift:"12pm",cap:6,hat:false},{name:"Feed Store",shift:"12pm",cap:2,hat:false},{name:"Gatekeepers",shift:"12pm",cap:4,hat:true},{name:"Go Tejano",shift:"12pm",cap:3,hat:true},{name:"Horspitality",shift:"12pm",cap:4,hat:true},{name:"Horticulture",shift:"12pm",cap:2,hat:false},{name:"Lamb & Goat Auction",shift:"12pm",cap:10,hat:false},{name:"Livestock",shift:"12pm",cap:5,hat:false},{name:"Mutton Bustin'",shift:"12pm",cap:10,hat:true},{name:"Rabbit",shift:"12pm",cap:6,hat:false},{name:"Recycling",shift:"12pm",cap:2,hat:false},{name:"Rodeo Express",shift:"12pm",cap:12,hat:false},{name:"Rodeo Merchandise",shift:"12pm",cap:2,hat:false},{name:"Special Attractions",shift:"12pm",cap:4,hat:false},{name:"Tours",shift:"12pm",cap:4,hat:false},{name:"Trailblazer",shift:"12pm",cap:4,hat:false},{name:"Transportation",shift:"12pm",cap:10,hat:true},{name:"Agriculture Education",shift:"4pm",cap:5,hat:false},{name:"Commercial Exhibits",shift:"4pm",cap:2,hat:false},{name:"Communications & Special Services",shift:"4pm",cap:2,hat:false},{name:"Directions & Assistance",shift:"4pm",cap:8,hat:false},{name:"Gatekeepers",shift:"4pm",cap:4,hat:true},{name:"Grand Entry",shift:"4pm",cap:4,hat:true},{name:"Grounds Tickets",shift:"4pm",cap:4,hat:false},{name:"Horspitality",shift:"4pm",cap:4,hat:true},{name:"Horticulture",shift:"4pm",cap:2,hat:false},{name:"Mutton Bustin'",shift:"4pm",cap:10,hat:true},{name:"Rodeo Contestant Services",shift:"4pm",cap:4,hat:false},{name:"Rodeo Express",shift:"4pm",cap:12,hat:false},{name:"Rodeo Merchandise",shift:"4pm",cap:4,hat:false},{name:"Special Attractions",shift:"4pm",cap:4,hat:false},{name:"Tours",shift:"4pm",cap:4,hat:false},{name:"Transportation",shift:"4pm",cap:10,hat:true},{name:"Agriculture Education",shift:"8am",cap:5,hat:false},{name:"Commercial Exhibits",shift:"8am",cap:2,hat:false},{name:"Directions & Assistance",shift:"8am",cap:4,hat:false},{name:"Feed Store",shift:"8am",cap:2,hat:false},{name:"Gatekeepers",shift:"8am",cap:4,hat:true},{name:"Grounds Tickets",shift:"8am",cap:4,hat:false},{name:"Horse Show Chuckwagon",shift:"8am",cap:4,hat:true},{name:"Horspitality",shift:"8am",cap:4,hat:true},{name:"Horticulture",shift:"8am",cap:4,hat:false},{name:"Livestock",shift:"8am",cap:5,hat:false},{name:"Rabbit",shift:"8am",cap:6,hat:false},{name:"Recycling",shift:"8am",cap:2,hat:false},{name:"Special Attractions",shift:"8am",cap:4,hat:false},{name:"Tours",shift:"8am",cap:5,hat:false},{name:"Trailblazer",shift:"8am",cap:4,hat:false},{name:"Transportation",shift:"8am",cap:10,hat:true}],
  "2026-03-14":[{name:"Agriculture Education",shift:"12pm",cap:5,hat:false},{name:"Breeders Greeters",shift:"12pm",cap:3,hat:false},{name:"Commercial Exhibits",shift:"12pm",cap:2,hat:false},{name:"Directions & Assistance",shift:"12pm",cap:6,hat:false},{name:"Feed Store",shift:"12pm",cap:2,hat:false},{name:"Gatekeepers",shift:"12pm",cap:4,hat:true},{name:"Go Tejano",shift:"12pm",cap:3,hat:true},{name:"Horticulture",shift:"12pm",cap:2,hat:false},{name:"Livestock",shift:"12pm",cap:5,hat:false},{name:"Mutton Bustin'",shift:"12pm",cap:10,hat:true},{name:"Rabbit",shift:"12pm",cap:6,hat:false},{name:"Recycling",shift:"12pm",cap:2,hat:false},{name:"Rodeo Express",shift:"12pm",cap:12,hat:false},{name:"Rodeo Merchandise",shift:"12pm",cap:2,hat:false},{name:"Special Attractions",shift:"12pm",cap:4,hat:false},{name:"Tours",shift:"12pm",cap:4,hat:false},{name:"Trailblazer",shift:"12pm",cap:4,hat:false},{name:"Transportation",shift:"12pm",cap:10,hat:true},{name:"Wine Garden",shift:"12pm",cap:5,hat:false},{name:"Agriculture Education",shift:"4pm",cap:5,hat:false},{name:"Commercial Exhibits",shift:"4pm",cap:2,hat:false},{name:"Communications & Special Services",shift:"4pm",cap:2,hat:false},{name:"Directions & Assistance",shift:"4pm",cap:8,hat:false},{name:"Gatekeepers",shift:"4pm",cap:4,hat:true},{name:"Grand Entry",shift:"4pm",cap:4,hat:true},{name:"Horticulture",shift:"4pm",cap:2,hat:false},{name:"Mutton Bustin'",shift:"4pm",cap:10,hat:true},{name:"Rodeo Contestant Services",shift:"4pm",cap:4,hat:false},{name:"Rodeo Express",shift:"4pm",cap:12,hat:false},{name:"Rodeo Merchandise",shift:"4pm",cap:4,hat:false},{name:"Special Attractions",shift:"4pm",cap:4,hat:false},{name:"Tours",shift:"4pm",cap:4,hat:false},{name:"Transportation",shift:"4pm",cap:10,hat:true},{name:"Agriculture Education",shift:"8am",cap:5,hat:false},{name:"Breeders Greeters",shift:"8am",cap:3,hat:false},{name:"Commercial Exhibits",shift:"8am",cap:2,hat:false},{name:"Directions & Assistance",shift:"8am",cap:4,hat:false},{name:"Feed Store",shift:"8am",cap:2,hat:false},{name:"Gatekeepers",shift:"8am",cap:4,hat:true},{name:"Horse Show Chuckwagon",shift:"8am",cap:4,hat:true},{name:"Horticulture",shift:"8am",cap:4,hat:false},{name:"Livestock",shift:"8am",cap:5,hat:false},{name:"Rabbit",shift:"8am",cap:6,hat:false},{name:"Recycling",shift:"8am",cap:2,hat:false},{name:"Special Attractions",shift:"8am",cap:4,hat:false},{name:"Tours",shift:"8am",cap:5,hat:false},{name:"Trailblazer",shift:"8am",cap:4,hat:false},{name:"Transportation",shift:"8am",cap:10,hat:true}],
  "2026-03-15":[{name:"Agriculture Education",shift:"12pm",cap:5,hat:false},{name:"Commercial Exhibits",shift:"12pm",cap:2,hat:false},{name:"Directions & Assistance",shift:"12pm",cap:6,hat:false},{name:"Feed Store",shift:"12pm",cap:2,hat:false},{name:"Gatekeepers",shift:"12pm",cap:4,hat:true},{name:"Go Tejano",shift:"12pm",cap:3,hat:true},{name:"Horticulture",shift:"12pm",cap:2,hat:false},{name:"Livestock",shift:"12pm",cap:5,hat:false},{name:"Mutton Bustin'",shift:"12pm",cap:10,hat:true},{name:"Rabbit",shift:"12pm",cap:6,hat:false},{name:"Recycling",shift:"12pm",cap:2,hat:false},{name:"Rodeo Express",shift:"12pm",cap:12,hat:false},{name:"Rodeo Merchandise",shift:"12pm",cap:2,hat:false},{name:"Special Attractions",shift:"12pm",cap:4,hat:false},{name:"Tours",shift:"12pm",cap:4,hat:false},{name:"Trailblazer",shift:"12pm",cap:6,hat:false},{name:"Transportation",shift:"12pm",cap:10,hat:true},{name:"Agriculture Education",shift:"4pm",cap:5,hat:false},{name:"Commercial Exhibits",shift:"4pm",cap:2,hat:false},{name:"Communications & Special Services",shift:"4pm",cap:2,hat:false},{name:"Directions & Assistance",shift:"4pm",cap:8,hat:false},{name:"Gatekeepers",shift:"4pm",cap:4,hat:true},{name:"Grand Entry",shift:"4pm",cap:4,hat:true},{name:"Horticulture",shift:"4pm",cap:2,hat:false},{name:"Mutton Bustin'",shift:"4pm",cap:10,hat:true},{name:"Rodeo Contestant Services",shift:"4pm",cap:4,hat:false},{name:"Rodeo Express",shift:"4pm",cap:12,hat:false},{name:"Rodeo Merchandise",shift:"4pm",cap:4,hat:false},{name:"Special Attractions",shift:"4pm",cap:4,hat:false},{name:"Tours",shift:"4pm",cap:4,hat:false},{name:"Transportation",shift:"4pm",cap:10,hat:true},{name:"Agriculture Education",shift:"8am",cap:5,hat:false},{name:"Commercial Exhibits",shift:"8am",cap:2,hat:false},{name:"Directions & Assistance",shift:"8am",cap:4,hat:false},{name:"Feed Store",shift:"8am",cap:2,hat:false},{name:"Gatekeepers",shift:"8am",cap:4,hat:true},{name:"Go Tejano",shift:"8am",cap:4,hat:false},{name:"Horse Show Chuckwagon",shift:"8am",cap:4,hat:true},{name:"Horticulture",shift:"8am",cap:4,hat:false},{name:"Livestock",shift:"8am",cap:5,hat:false},{name:"Rabbit",shift:"8am",cap:6,hat:false},{name:"Recycling",shift:"8am",cap:2,hat:false},{name:"Special Attractions",shift:"8am",cap:4,hat:false},{name:"Tours",shift:"8am",cap:5,hat:false},{name:"Trailblazer",shift:"8am",cap:6,hat:false},{name:"Transportation",shift:"8am",cap:10,hat:true}],
  "2026-03-16":[{name:"Agriculture Education",shift:"12pm",cap:5,hat:false},{name:"Commercial Exhibits",shift:"12pm",cap:2,hat:false},{name:"Directions & Assistance",shift:"12pm",cap:6,hat:false},{name:"Feed Store",shift:"12pm",cap:2,hat:false},{name:"Gatekeepers",shift:"12pm",cap:4,hat:true},{name:"Go Tejano",shift:"12pm",cap:3,hat:true},{name:"Horspitality",shift:"12pm",cap:4,hat:true},{name:"Horticulture",shift:"12pm",cap:2,hat:false},{name:"Houston General Go Texan",shift:"12pm",cap:6,hat:false},{name:"Judging Contest",shift:"12pm",cap:6,hat:false},{name:"Livestock",shift:"12pm",cap:5,hat:false},{name:"Mutton Bustin'",shift:"12pm",cap:10,hat:true},{name:"Rabbit",shift:"12pm",cap:6,hat:false},{name:"Recycling",shift:"12pm",cap:2,hat:false},{name:"Rodeo Merchandise",shift:"12pm",cap:2,hat:false},{name:"Special Attractions",shift:"12pm",cap:4,hat:false},{name:"Tours",shift:"12pm",cap:4,hat:false},{name:"Transportation",shift:"12pm",cap:10,hat:true},{name:"Agriculture Education",shift:"4pm",cap:5,hat:false},{name:"Commercial Exhibits",shift:"4pm",cap:2,hat:false},{name:"Communications & Special Services",shift:"4pm",cap:2,hat:false},{name:"Directions & Assistance",shift:"4pm",cap:8,hat:false},{name:"Gatekeepers",shift:"4pm",cap:4,hat:true},{name:"Grand Entry",shift:"4pm",cap:4,hat:true},{name:"Horspitality",shift:"4pm",cap:4,hat:true},{name:"Horticulture",shift:"4pm",cap:2,hat:false},{name:"Mutton Bustin'",shift:"4pm",cap:10,hat:true},{name:"Rodeo Contestant Services",shift:"4pm",cap:4,hat:false},{name:"Rodeo Express",shift:"4pm",cap:12,hat:false},{name:"Rodeo Merchandise",shift:"4pm",cap:4,hat:false},{name:"Special Attractions",shift:"4pm",cap:4,hat:false},{name:"Tours",shift:"4pm",cap:4,hat:false},{name:"Transportation",shift:"4pm",cap:10,hat:true},{name:"Agriculture Education",shift:"8am",cap:5,hat:false},{name:"Commercial Exhibits",shift:"8am",cap:2,hat:false},{name:"Directions & Assistance",shift:"8am",cap:4,hat:false},{name:"Feed Store",shift:"8am",cap:2,hat:false},{name:"Gatekeepers",shift:"8am",cap:4,hat:true},{name:"Horse Show Chuckwagon",shift:"8am",cap:4,hat:true},{name:"Horspitality",shift:"8am",cap:4,hat:true},{name:"Horticulture",shift:"8am",cap:4,hat:false},{name:"Judging Contest",shift:"8am",cap:4,hat:false},{name:"Livestock",shift:"8am",cap:5,hat:false},{name:"Rabbit",shift:"8am",cap:6,hat:false},{name:"Recycling",shift:"8am",cap:2,hat:false},{name:"Special Attractions",shift:"8am",cap:4,hat:false},{name:"Tours",shift:"8am",cap:5,hat:false},{name:"Transportation",shift:"8am",cap:10,hat:true}],
  "2026-03-17":[{name:"Agriculture Education",shift:"12pm",cap:5,hat:false},{name:"Commercial Exhibits",shift:"12pm",cap:2,hat:false},{name:"Directions & Assistance",shift:"12pm",cap:6,hat:false},{name:"Feed Store",shift:"12pm",cap:2,hat:false},{name:"Gatekeepers",shift:"12pm",cap:4,hat:true},{name:"Go Tejano",shift:"12pm",cap:3,hat:true},{name:"Horticulture",shift:"12pm",cap:2,hat:false},{name:"Livestock",shift:"12pm",cap:5,hat:false},{name:"Mutton Bustin'",shift:"12pm",cap:10,hat:true},{name:"Rabbit",shift:"12pm",cap:6,hat:false},{name:"Recycling",shift:"12pm",cap:2,hat:false},{name:"Rodeo Merchandise",shift:"12pm",cap:2,hat:false},{name:"Special Attractions",shift:"12pm",cap:4,hat:false},{name:"Tours",shift:"12pm",cap:4,hat:false},{name:"Transportation",shift:"12pm",cap:10,hat:true},{name:"Agriculture Education",shift:"4pm",cap:5,hat:false},{name:"Commercial Exhibits",shift:"4pm",cap:2,hat:false},{name:"Communications & Special Services",shift:"4pm",cap:2,hat:false},{name:"Directions & Assistance",shift:"4pm",cap:8,hat:false},{name:"Gatekeepers",shift:"4pm",cap:4,hat:true},{name:"Grand Entry",shift:"4pm",cap:4,hat:true},{name:"Horticulture",shift:"4pm",cap:2,hat:false},{name:"Mutton Bustin'",shift:"4pm",cap:10,hat:true},{name:"Rodeo Contestant Services",shift:"4pm",cap:4,hat:false},{name:"Rodeo Express",shift:"4pm",cap:12,hat:false},{name:"Rodeo Merchandise",shift:"4pm",cap:4,hat:false},{name:"Special Attractions",shift:"4pm",cap:4,hat:false},{name:"Special Children'S",shift:"4pm",cap:5,hat:false},{name:"Tours",shift:"4pm",cap:4,hat:false},{name:"Transportation",shift:"4pm",cap:10,hat:true},{name:"Agriculture Education",shift:"8am",cap:5,hat:false},{name:"Commercial Exhibits",shift:"8am",cap:2,hat:false},{name:"Directions & Assistance",shift:"8am",cap:4,hat:false},{name:"Feed Store",shift:"8am",cap:2,hat:false},{name:"Gatekeepers",shift:"8am",cap:4,hat:true},{name:"Horse Show Chuckwagon",shift:"8am",cap:4,hat:true},{name:"Horticulture",shift:"8am",cap:4,hat:false},{name:"Livestock",shift:"8am",cap:5,hat:false},{name:"Rabbit",shift:"8am",cap:6,hat:false},{name:"Recycling",shift:"8am",cap:2,hat:false},{name:"Special Attractions",shift:"8am",cap:4,hat:false},{name:"Tours",shift:"8am",cap:5,hat:false},{name:"Transportation",shift:"8am",cap:10,hat:true}],
  "2026-03-18":[{name:"Agriculture Education",shift:"12pm",cap:5,hat:false},{name:"Commercial Exhibits",shift:"12pm",cap:2,hat:false},{name:"Directions & Assistance",shift:"12pm",cap:6,hat:false},{name:"Feed Store",shift:"12pm",cap:2,hat:false},{name:"Gatekeepers",shift:"12pm",cap:4,hat:true},{name:"Go Tejano",shift:"12pm",cap:3,hat:true},{name:"Horspitality",shift:"12pm",cap:4,hat:true},{name:"Horticulture",shift:"12pm",cap:2,hat:false},{name:"Livestock",shift:"12pm",cap:5,hat:false},{name:"Mutton Bustin'",shift:"12pm",cap:10,hat:true},{name:"Rabbit",shift:"12pm",cap:6,hat:false},{name:"Recycling",shift:"12pm",cap:2,hat:false},{name:"Rodeo Merchandise",shift:"12pm",cap:2,hat:false},{name:"Special Attractions",shift:"12pm",cap:4,hat:false},{name:"Tours",shift:"12pm",cap:4,hat:false},{name:"Transportation",shift:"12pm",cap:10,hat:true},{name:"Agriculture Education",shift:"4pm",cap:5,hat:false},{name:"Commercial Exhibits",shift:"4pm",cap:2,hat:false},{name:"Communications & Special Services",shift:"4pm",cap:2,hat:false},{name:"Directions & Assistance",shift:"4pm",cap:8,hat:false},{name:"Gatekeepers",shift:"4pm",cap:4,hat:true},{name:"Grand Entry",shift:"4pm",cap:4,hat:true},{name:"Horspitality",shift:"4pm",cap:4,hat:true},{name:"Horticulture",shift:"4pm",cap:2,hat:false},{name:"Mutton Bustin'",shift:"4pm",cap:10,hat:true},{name:"Rodeo Contestant Services",shift:"4pm",cap:4,hat:false},{name:"Rodeo Express",shift:"4pm",cap:12,hat:false},{name:"Rodeo Merchandise",shift:"4pm",cap:4,hat:false},{name:"Special Attractions",shift:"4pm",cap:4,hat:false},{name:"Special Children'S",shift:"4pm",cap:10,hat:false},{name:"Tours",shift:"4pm",cap:4,hat:false},{name:"Transportation",shift:"4pm",cap:10,hat:true},{name:"Agriculture Education",shift:"8am",cap:5,hat:false},{name:"Commercial Exhibits",shift:"8am",cap:2,hat:false},{name:"Directions & Assistance",shift:"8am",cap:4,hat:false},{name:"Feed Store",shift:"8am",cap:2,hat:false},{name:"Gatekeepers",shift:"8am",cap:4,hat:true},{name:"Horse Show Chuckwagon",shift:"8am",cap:4,hat:true},{name:"Horspitality",shift:"8am",cap:4,hat:true},{name:"Horticulture",shift:"8am",cap:4,hat:false},{name:"Livestock",shift:"8am",cap:5,hat:false},{name:"Rabbit",shift:"8am",cap:6,hat:false},{name:"Recycling",shift:"8am",cap:2,hat:false},{name:"Special Attractions",shift:"8am",cap:4,hat:false},{name:"Tours",shift:"8am",cap:5,hat:false},{name:"Transportation",shift:"8am",cap:10,hat:true}],
  "2026-03-19":[{name:"Agriculture Education",shift:"12pm",cap:5,hat:false},{name:"Commercial Exhibits",shift:"12pm",cap:2,hat:false},{name:"Directions & Assistance",shift:"12pm",cap:6,hat:false},{name:"Feed Store",shift:"12pm",cap:2,hat:false},{name:"Gatekeepers",shift:"12pm",cap:4,hat:true},{name:"Go Tejano",shift:"12pm",cap:3,hat:true},{name:"Horticulture",shift:"12pm",cap:2,hat:false},{name:"Livestock",shift:"12pm",cap:5,hat:false},{name:"Llama And Alpaca",shift:"12pm",cap:6,hat:false},{name:"Mutton Bustin'",shift:"12pm",cap:10,hat:true},{name:"Rabbit",shift:"12pm",cap:6,hat:false},{name:"Recycling",shift:"12pm",cap:2,hat:false},{name:"Rodeo Merchandise",shift:"12pm",cap:2,hat:false},{name:"Special Attractions",shift:"12pm",cap:4,hat:false},{name:"Tours",shift:"12pm",cap:4,hat:false},{name:"Transportation",shift:"12pm",cap:10,hat:true},{name:"Agriculture Education",shift:"4pm",cap:5,hat:false},{name:"Commercial Exhibits",shift:"4pm",cap:2,hat:false},{name:"Communications & Special Services",shift:"4pm",cap:2,hat:false},{name:"Directions & Assistance",shift:"4pm",cap:8,hat:false},{name:"Gatekeepers",shift:"4pm",cap:4,hat:true},{name:"Grand Entry",shift:"4pm",cap:4,hat:true},{name:"Horticulture",shift:"4pm",cap:2,hat:false},{name:"Mutton Bustin'",shift:"4pm",cap:10,hat:true},{name:"Rodeo Contestant Services",shift:"4pm",cap:4,hat:false},{name:"Rodeo Express",shift:"4pm",cap:12,hat:false},{name:"Rodeo Merchandise",shift:"4pm",cap:4,hat:false},{name:"Special Attractions",shift:"4pm",cap:4,hat:false},{name:"Tours",shift:"4pm",cap:4,hat:false},{name:"Transportation",shift:"4pm",cap:10,hat:true},{name:"Agriculture Education",shift:"8am",cap:5,hat:false},{name:"Commercial Exhibits",shift:"8am",cap:2,hat:false},{name:"Directions & Assistance",shift:"8am",cap:4,hat:false},{name:"Feed Store",shift:"8am",cap:2,hat:false},{name:"Gatekeepers",shift:"8am",cap:4,hat:true},{name:"Horse Show Chuckwagon",shift:"8am",cap:4,hat:true},{name:"Horticulture",shift:"8am",cap:4,hat:false},{name:"Livestock",shift:"8am",cap:5,hat:false},{name:"Llama And Alpaca",shift:"8am",cap:6,hat:false},{name:"Quarter Horse",shift:"8am",cap:4,hat:true},{name:"Rabbit",shift:"8am",cap:6,hat:false},{name:"Recycling",shift:"8am",cap:2,hat:false},{name:"Special Attractions",shift:"8am",cap:4,hat:false},{name:"Tours",shift:"8am",cap:5,hat:false},{name:"Transportation",shift:"8am",cap:10,hat:true}],
  "2026-03-20":[{name:"Agricultural Mechanics",shift:"12pm",cap:10,hat:false},{name:"Agriculture Education",shift:"12pm",cap:5,hat:false},{name:"Commercial Exhibits",shift:"12pm",cap:2,hat:false},{name:"Directions & Assistance",shift:"12pm",cap:6,hat:false},{name:"Feed Store",shift:"12pm",cap:2,hat:false},{name:"Gatekeepers",shift:"12pm",cap:4,hat:true},{name:"Go Tejano",shift:"12pm",cap:3,hat:true},{name:"Horspitality",shift:"12pm",cap:4,hat:true},{name:"Horticulture",shift:"12pm",cap:2,hat:false},{name:"Livestock",shift:"12pm",cap:5,hat:false},{name:"Llama And Alpaca",shift:"12pm",cap:6,hat:false},{name:"Mutton Bustin'",shift:"12pm",cap:10,hat:true},{name:"Rabbit",shift:"12pm",cap:6,hat:false},{name:"Recycling",shift:"12pm",cap:2,hat:false},{name:"Rodeo Express",shift:"12pm",cap:12,hat:false},{name:"Rodeo Merchandise",shift:"12pm",cap:2,hat:false},{name:"Special Attractions",shift:"12pm",cap:4,hat:false},{name:"Tours",shift:"12pm",cap:4,hat:false},{name:"Trailblazer",shift:"12pm",cap:4,hat:false},{name:"Transportation",shift:"12pm",cap:10,hat:true},{name:"Agriculture Education",shift:"4pm",cap:5,hat:false},{name:"Commercial Exhibits",shift:"4pm",cap:2,hat:false},{name:"Communications & Special Services",shift:"4pm",cap:2,hat:false},{name:"Directions & Assistance",shift:"4pm",cap:8,hat:false},{name:"Gatekeepers",shift:"4pm",cap:4,hat:true},{name:"Grand Entry",shift:"4pm",cap:4,hat:true},{name:"Horspitality",shift:"4pm",cap:4,hat:true},{name:"Horticulture",shift:"4pm",cap:2,hat:false},{name:"Mutton Bustin'",shift:"4pm",cap:10,hat:true},{name:"Rodeo Contestant Services",shift:"4pm",cap:4,hat:false},{name:"Rodeo Express",shift:"4pm",cap:12,hat:false},{name:"Rodeo Merchandise",shift:"4pm",cap:4,hat:false},{name:"Special Attractions",shift:"4pm",cap:4,hat:false},{name:"Tours",shift:"4pm",cap:4,hat:false},{name:"Transportation",shift:"4pm",cap:10,hat:true},{name:"Agricultural Mechanics",shift:"8am",cap:10,hat:false},{name:"Agriculture Education",shift:"8am",cap:5,hat:false},{name:"Commercial Exhibits",shift:"8am",cap:2,hat:false},{name:"Directions & Assistance",shift:"8am",cap:4,hat:false},{name:"Feed Store",shift:"8am",cap:2,hat:false},{name:"Gatekeepers",shift:"8am",cap:4,hat:true},{name:"Horse Show Chuckwagon",shift:"8am",cap:4,hat:true},{name:"Horspitality",shift:"8am",cap:4,hat:true},{name:"Horticulture",shift:"8am",cap:4,hat:false},{name:"Livestock",shift:"8am",cap:5,hat:false},{name:"Llama And Alpaca",shift:"8am",cap:6,hat:false},{name:"Quarter Horse",shift:"8am",cap:4,hat:true},{name:"Rabbit",shift:"8am",cap:6,hat:false},{name:"Recycling",shift:"8am",cap:2,hat:false},{name:"Special Attractions",shift:"8am",cap:4,hat:false},{name:"Tours",shift:"8am",cap:5,hat:false},{name:"Trailblazer",shift:"8am",cap:4,hat:false},{name:"Transportation",shift:"8am",cap:10,hat:true}],
  "2026-03-21":[{name:"Agriculture Education",shift:"12pm",cap:5,hat:false},{name:"Commercial Exhibits",shift:"12pm",cap:2,hat:false},{name:"Directions & Assistance",shift:"12pm",cap:6,hat:false},{name:"Feed Store",shift:"12pm",cap:2,hat:false},{name:"Gatekeepers",shift:"12pm",cap:4,hat:true},{name:"Go Tejano",shift:"12pm",cap:3,hat:true},{name:"Horticulture",shift:"12pm",cap:2,hat:false},{name:"Livestock",shift:"12pm",cap:5,hat:false},{name:"Llama And Alpaca",shift:"12pm",cap:6,hat:false},{name:"Mutton Bustin'",shift:"12pm",cap:10,hat:true},{name:"Rabbit",shift:"12pm",cap:6,hat:false},{name:"Recycling",shift:"12pm",cap:2,hat:false},{name:"Rodeo Merchandise",shift:"12pm",cap:2,hat:false},{name:"Special Attractions",shift:"12pm",cap:4,hat:false},{name:"Steer Auction",shift:"12pm",cap:5,hat:true},{name:"Tours",shift:"12pm",cap:4,hat:false},{name:"Transportation",shift:"12pm",cap:10,hat:true},{name:"Agriculture Education",shift:"4pm",cap:5,hat:false},{name:"Commercial Exhibits",shift:"4pm",cap:2,hat:false},{name:"Communications & Special Services",shift:"4pm",cap:2,hat:false},{name:"Directions & Assistance",shift:"4pm",cap:8,hat:false},{name:"Gatekeepers",shift:"4pm",cap:4,hat:true},{name:"Grand Entry",shift:"4pm",cap:4,hat:true},{name:"Horticulture",shift:"4pm",cap:2,hat:false},{name:"Mutton Bustin'",shift:"4pm",cap:10,hat:true},{name:"Rodeo Contestant Services",shift:"4pm",cap:4,hat:false},{name:"Rodeo Express",shift:"4pm",cap:12,hat:false},{name:"Rodeo Merchandise",shift:"4pm",cap:4,hat:false},{name:"Special Attractions",shift:"4pm",cap:4,hat:false},{name:"Tours",shift:"4pm",cap:4,hat:false},{name:"Transportation",shift:"4pm",cap:10,hat:true},{name:"Agriculture Education",shift:"8am",cap:5,hat:false},{name:"Commercial Exhibits",shift:"8am",cap:2,hat:false},{name:"Directions & Assistance",shift:"8am",cap:4,hat:false},{name:"Feed Store",shift:"8am",cap:2,hat:false},{name:"Gatekeepers",shift:"8am",cap:4,hat:true},{name:"Horse Show Chuckwagon",shift:"8am",cap:4,hat:true},{name:"Horticulture",shift:"8am",cap:4,hat:false},{name:"Livestock",shift:"8am",cap:5,hat:false},{name:"Llama And Alpaca",shift:"8am",cap:6,hat:false},{name:"Quarter Horse",shift:"8am",cap:4,hat:true},{name:"Rabbit",shift:"8am",cap:6,hat:false},{name:"Recycling",shift:"8am",cap:2,hat:false},{name:"Special Attractions",shift:"8am",cap:4,hat:false},{name:"Steer Auction",shift:"8am",cap:5,hat:true},{name:"Tours",shift:"8am",cap:5,hat:false},{name:"Transportation",shift:"8am",cap:10,hat:true}],
};

var CD = {
  "Agricultural Mechanics":{chair:"Jerid Brown",cp:"713-555-1025",liaison:"Paige Meineke",lp:"713-555-1065",le:"test.contact@hlsr.com",loc:"NRG Center Hall A - east arena or tent behind NRG Center/Hall A.",duties:"Help stage/awards team set up prize stage and run contestant scramble. Assist with move in/move out.",notes:"Could get dirty. Prize stage inside, scramble outside mostly under tent."},
  "Agriculture Education":{chair:"Margaret Fritz",cp:"713-555-1025",liaison:"Tammy Cloud",lp:"713-555-1065",le:"test.contact@hlsr.com",loc:"Hall B - by Miss Moo barn (built office with bees).",duties:"Take pictures of kids with Miss Moo and Howdy, help characters maneuver, assist with Chuckwagon line and wagon loading.",notes:"Character suits available to wear if interested."},
  "Armed Forces Appreciation":{chair:"Kim Lewis",cp:"713-555-1025",liaison:"Clayton Dilday",lp:"713-555-1065",le:"test.contact@hlsr.com",loc:"Hideout for Armed Forces Day. Room 602 for First Responders Day.",duties:"Hospitality for Armed Forces/First Responder Guests.",notes:"Set up and tear down for events."},
  "Black Heritage":{chair:"LaShandra Boddy",cp:"713-555-1025",liaison:"Shala Walker",lp:"713-555-1065",le:"test.contact@hlsr.com",loc:"Carnival area / NRG Center",duties:"Escort guests on Black Heritage Day from entry to the Junction Stage.",notes:"Outdoor. Black Heritage Day (3.6.26) between 9am-2pm."},
  "Breeders Greeters":{chair:"Kevin O'Kelley",cp:"713-555-1025",liaison:"Julia Harris",lp:"713-555-1065",le:"test.contact@hlsr.com",loc:"Behind NRG Center - Breeders Greeters Livestock Gate Compound",duties:"Traffic control, moving exhibitor trailers in and out of staging behind the barn.",notes:"100% outdoor, rain or shine. Meet Vice Chairman or Captain on duty at the Breeders Greeters Tent."},
  "Commercial Exhibits":{chair:"Kenneth Lewis",cp:"713-555-1025",liaison:"Kenneth Lewis",lp:"713-555-1065",le:"test.contact@hlsr.com",loc:"NRG Center Room D 20",duties:"Assist committee members with duties.",notes:"N/A"},
  "Communications & Special Services":{chair:"Aaron McCready",cp:"713-555-1025",liaison:"Aaron McCready",lp:"713-555-1065",le:"test.contact@hlsr.com",loc:"NRG Center Room 108",duties:"Conduct onsite intercept surveys for guests. Surveys start 5:15pm weekdays / 1:15pm weekends.",notes:"Meet in Room 108. Always partnered with veteran committee member."},
  "Cutting Horse":{chair:"Charlie Hughes",cp:"713-555-1025",liaison:"Charlie Hughes",lp:"713-555-1065",le:"test.contact@hlsr.com",loc:"NRG Arena",duties:"Help set up for Armed Forces Appreciation Day, explore committee responsibilities, meet committeemen.",notes:"Will be placing Flag Holders (15 lbs) in the Arena walkway."},
  "Directions & Assistance":{chair:"David Quackenbush",cp:"713-555-1025",liaison:"Jennifer Arnold",lp:"713-555-1065",le:"test.contact@hlsr.com",loc:"D&A HQ Office - NRG Center Room 102. Captain on duty will check them in.",duties:"Help patrons find things, community interaction, directing patrons throughout the grounds.",notes:"Potential outdoors at D&A booths throughout grounds and inside Center and Stadium."},
  "Feed Store":{chair:"Ron Isbell",cp:"713-555-1025",liaison:"Lisa Saenz",lp:"713-555-1065",le:"test.contact@hlsr.com",loc:"East end of warehouse on north end (behind NRG Center) of the NRG complex.",duties:"Assisting with delivery of product to exhibitors.",notes:"Heavy lifting - most items 40-50 lbs."},
  "Gatekeepers":{chair:"Kristy Glazebrook",cp:"713-555-1025",liaison:"Chris Cannon",lp:"713-555-1065",le:"test.contact@hlsr.com",loc:"Gatekeeper shack at Gate 6 in Blue Lot.",duties:"Welcoming guests, scanning tickets, providing guest information at perimeter gates.",notes:"Outdoor - subject to weather. Food provided prior to shift."},
  "Go Tejano":{chair:"Naomi Favela",cp:"713-555-1025",liaison:"John Zavala",lp:"713-555-1065",le:"test.contact@hlsr.com",loc:"RP40 - Under first white tent from Fannin Street entrance.",duties:"Help prep condiments and restock supplies in the diner.",notes:"Meet just outside the diner when checking in."},
  "Grand Entry":{chair:"Jim Bob Taylor",cp:"713-555-1025",liaison:"Sheila Wells",lp:"713-555-1065",le:"test.contact@hlsr.com",loc:"Grand Entry Tent/barn through Gate 10 at North end of NRG. Barn is immediately right of Gate 10.",duties:"Dusting and sweeping wagons and firetrucks, assisting guests into firetrucks. Possibly riding in fire truck or wagon during Grand Entry.",notes:"Can be windy and dusty in tent/barn."},
  "Grounds Tickets":{chair:"Sarah Janda",cp:"713-555-1025",liaison:"MJ Yen",lp:"713-555-1065",le:"test.contact@hlsr.com",loc:"GTC HQ - mobile trailer office inside tent between blue and maroon lots.",duties:"Line directing, answering questions, learning ticket sales in cabins, delivering supplies by golf cart.",notes:"Mostly outdoors. Some lifting. Ask who the VC in charge is that day."},
  "Horse Show Chuckwagon":{chair:"Don Cullum",cp:"713-555-1025",liaison:"Gaylin Perry",lp:"713-555-1065",le:"test.contact@hlsr.com",loc:"NRG Arena Kitchen - Upstairs on East side, adjacent to the Stockman's Club.",duties:"Working alongside committee members preparing and cooking meals for Horse Show contestants and guests.",notes:"Working in a commercial kitchen."},
  "Horspitality":{chair:"Chipper Clawson",cp:"713-555-1025",liaison:"Chipper Clawson",lp:"713-555-1065",le:"test.contact@hlsr.com",loc:"NRG Arena - Horspitality Committee tent at the Naomi Exit.",duties:"Assisting with moving horse show exhibitors in and out of the arena.",notes:"Outside - could involve heavy lifting and dirty work."},
  "Horticulture":{chair:"Chad Hunter Franklin",cp:"713-555-1025",liaison:"Ricardo Reyes Jr",lp:"713-555-1065",le:"test.contact@hlsr.com",loc:"NRG Center - AgVenture Soil area next to the bees, pole #A11.",duties:"Helping kids plant sunflower seeds, watering plants, organizing the area.",notes:"A little bit of dirt and lifting soil bags."},
  "Houston General Go Texan":{chair:"Dennis Alters",cp:"713-555-1025",liaison:"Shannon Stone",lp:"713-555-1065",le:"test.contact@hlsr.com",loc:"2nd floor NRG Center, far west side closest to stadium, just left of Committeeman's Club.",duties:"Guiding people to Go Texan Day awards and escorting them to Grand Entry. Needed 2:30-6:45.",notes:"Indoors and some outdoors walking."},
  "Industrial Craft Competition":{chair:"JD Slaughter",cp:"713-555-1025",liaison:"Jon Johnson",lp:"713-555-1065",le:"test.contact@hlsr.com",loc:"Arena Rooms 3 & 4 - Upstairs across from the Stockman's.",duties:"Event setup and teardown.",notes:"Arena Rooms 3 & 4."},
  "International":{chair:"Tammy Barrier",cp:"713-555-1025",liaison:"Renee Humphrey",lp:"713-555-1065",le:"test.contact@hlsr.com",loc:"Bayou City Event Center, 9401 Knight Rd, Houston TX 77045",duties:"12-2pm: Assist Ladies Luncheon and fashion show. 2-4pm: Help break down event.",notes:"Check in at registration table and ask for Renee Humphrey or Angela Poujol. Parking is free."},
  "Judging Contest":{chair:"Angie Robertson",cp:"713-555-1025",liaison:"James Harris",lp:"713-555-1065",le:"test.contact@hlsr.com",loc:"NRG Center - Main Show Arena",duties:"Helping with Dairy Cattle Judging Contest as group leaders or cattle handlers.",notes:"Experience with cattle is a plus."},
  "Lamb & Goat Auction":{chair:"Scott Townsend",cp:"713-555-1025",liaison:"Annette Baker",lp:"713-555-1065",le:"test.contact@hlsr.com",loc:"NRG Exhibit Center - northeast corner.",duties:"Helping with Lamb & Goat SIFT - lining up kids and animals, weight lines, checking kids in.",notes:"Green shavings in arena could stain boots and clothes."},
  "Livestock":{chair:"Lori Diez",cp:"713-555-1025",liaison:"Lori Diez",lp:"713-555-1065",le:"test.contact@hlsr.com",loc:"Livestock Committee Office in the tent, behind Dock D.",duties:"Livestock Traffic Control and Animal Move Ins.",notes:"Move In shifts: work attire, heavy lifting, outdoors. Other shifts: western attire."},
  "Llama and Alpaca":{chair:"Jennifer Lewis",cp:"713-555-1025",liaison:"Victoria Smith",lp:"713-555-1065",le:"test.contact@hlsr.com",loc:"NRG Arena - right side through back entrance.",duties:"Assisting with Move In/Out, leading animals to stalls, helping in arena, staging animals and exhibitors.",notes:"Some heavy lifting. Meet liaison at Hospitality Room at back of arena."},
  "Magazine":{chair:"Sarah Tucker",cp:"713-555-1025",liaison:"Sarah Tucker",lp:"713-555-1065",le:"test.contact@hlsr.com",loc:"Varies - no set location.",duties:"Assist with photography, interviewing, writing/editing stories for Show articles.",notes:"Interest in media/journalism or photography required."},
  "Mutton Bustin'":{chair:"Keith Letsos",cp:"713-555-1025",liaison:"Jonathan Kopp",lp:"713-555-1065",le:"test.contact@hlsr.com",loc:"Mutton Bustin Tent in the Junction.",duties:"Check-in contestants, dressing contestants, moving and pushing livestock, participating as a sheep fighter, interaction with kids.",notes:"Outdoor event working with public and livestock. Dirt arena - potential to get dirty."},
  "Quarter Horse":{chair:"John Tom Powledge",cp:"713-555-1025",liaison:"Stacy Childs",lp:"713-555-1065",le:"test.contact@hlsr.com",loc:"Hospitality Room in Horse Arena and Arena area.",duties:"Preparing meals, cleaning tables, filling ice cups, serving coffee, working gates.",notes:"Possible dirty work. Meet at Hospitality Room in Horse Arena."},
  "Rabbit":{chair:"Jolene Nixon",cp:"713-555-1025",liaison:"Kenneth Willis / Jonni Lisy",lp:"713-555-1065",le:"test.contact@hlsr.com",loc:"NRG Arena, 1 NRG Park, Houston TX 77054",duties:"Table set up, assisting committeemen and exhibitors, working with committee as needed.",notes:"Light lifting, gloves. Meet Jonni Lisy in arena."},
  "Ranch Rodeo":{chair:"Bonny Battles",cp:"713-555-1025",liaison:"Brad Thompson",lp:"713-555-1065",le:"test.contact@hlsr.com",loc:"Arena - Horse Show",duties:"Assisting with gates between livestock and pedestrians.",notes:"Meet at info booth. If entering from carnival, follow the left hand wall."},
  "Ranch Sorting":{chair:"Quintes W Stark Jr",cp:"713-555-1025",liaison:"Wade Almazan / Brittany Connors",lp:"713-555-1065",le:"test.contact@hlsr.com",loc:"NRG Arena hospitality room and main arena.",duties:"Hospitality area: serving food and drinks. Crowd Control in arena.",notes:""},
  "Ranching & Wildlife":{chair:"Nathan Kelley",cp:"713-555-1025",liaison:"Amy Reynolds",lp:"713-555-1065",le:"test.contact@hlsr.com",loc:"NRG Center, 2nd floor, Outside Main Club.",duties:"Man the doors for seminars on the 2nd floor, help others find their way from the 1st to 2nd floor.",notes:"Best to meet on the 2nd floor, inside seminar rooms."},
  "Recycling":{chair:"Doyle Courtney",cp:"713-555-1025",liaison:"Doyle Courtney",lp:"713-555-1065",le:"test.contact@hlsr.com",loc:"Office in NRG Arena - work all over grounds.",duties:"Assisting committee collecting cardboard and aluminum from the stadium and around the grounds.",notes:"Can be messy. We will pick them up from the JRC office."},
  "Rodeo Contestant Services":{chair:"Ray Hicks",cp:"713-555-1025",liaison:"Elizabeth Burkett",lp:"713-555-1065",le:"test.contact@hlsr.com",loc:"Meet at Contestant Rodeo Shack Parking Lot at the Red Lot. Will be escorted to NRG Stadium Fan Zone.",duties:"Checking in contestants, moving them to signature stations, setting up interviews, assisting in Contestant Hospitality room.",notes:"Appropriate dress code important. Mostly indoor."},
  "Rodeo Express":{chair:"Jemmina Gauly",cp:"713-555-1025",liaison:"James Frakes",lp:"713-555-1065",le:"test.contact@hlsr.com",loc:"Bus Ops at NRG Stadium. COMMITTEE MEMBER WILL PICK UP JUNIORS AT JRC OFFICES.",duties:"Work in chuckwagon to prep and serve food, hand out equipment, assist in loading/unloading buses.",notes:"Outdoor event with shelter. COMMITTEE MEMBER WILL PICK UP JUNIORS AT JRC OFFICE."},
  "Rodeo Merchandise":{chair:"Chad Brown",cp:"713-555-1025",liaison:"Christie Smith",lp:"713-555-1065",le:"test.contact@hlsr.com",loc:"Meet in Hall D by the merch T-shirt Round Up booth.",duties:"Help customers find merch and sizes, answer questions, relieve committee members for breaks, move merch between booths.",notes:"Some booths inside NRG Center, some outside trailers."},
  "Sheep & Goat":{chair:"Rhonda McLeod",cp:"713-555-1025",liaison:"Anthony Lopez",lp:"713-555-1065",le:"test.contact@hlsr.com",loc:"East Arena of NRG Center - Sheep Shack.",duties:"Help move in/out exhibitors with animals and equipment, crowd control on show days.",notes:"Expect to get dirty when assisting with animals and equipment."},
  "Special Attractions":{chair:"Clint Castellow",cp:"713-555-1025",liaison:"Stephen Stalcup",lp:"713-555-1065",le:"test.contact@hlsr.com",loc:"NRG Center Room #101",duties:"Learn about exhibits: Fun On The Farm, Born to Buck, Rabbit Hole Exhibit, and Quilt Contest.",notes:"All weather conditions. Only western style hats meet dress code - no ballcaps."},
  "Special Children's":{chair:"Sylvia Pennywell",cp:"713-555-1025",liaison:"Sylvia Pennywell",lp:"713-555-1065",le:"test.contact@hlsr.com",loc:"Lil Rustlers - NRG Center",duties:"Handing out t-shirts, assisting kids with games, petting goats, bean bag toss.",notes:"In the back of the Center by the livestock."},
  "Steer Auction":{chair:"Jason Williams",cp:"713-555-1025",liaison:"Derek Causey",lp:"713-555-1065",le:"test.contact@hlsr.com",loc:"NRG Arena Sales Pavilion",duties:"Hand out yard sticks and auction programs, direct donors to seats and to/from VIP area and photo area.",notes:"Indoors. No heavy lifting."},
  "Tours":{chair:"Mandi Pillow",cp:"713-555-1025",liaison:"Amy Hoggatt",lp:"713-555-1065",le:"test.contact@hlsr.com",loc:"Tours Office - Hall A outside AgVenture.",duties:"Supporting tour guides leading groups through AgVenture. Assisting logistics team directing groups to/from buses.",notes:"Check in with the captain on shift in the office (Hall A)."},
  "Trailblazer":{chair:"Ann Massey",cp:"713-555-1025",liaison:"Gay Mayeux",lp:"713-555-1065",le:"test.contact@hlsr.com",loc:"Milking Parlor - NRG Center - in AgVenture Area.",duties:"Recruiting patrons and children for Rodeo Read Along. Reading and engaging with children, distributing favors and books.",notes:"Spanish speakers highly encouraged - especially on Go Tejano Day."},
  "Transportation":{chair:"Teresa Zepeda Saltzman",cp:"713-555-1025",liaison:"Candice Shute",lp:"713-555-1065",le:"test.contact@hlsr.com",loc:"Transportation Tent main office. Meet with the Office Captain.",duties:"Load/unload patrons on mini trams and tractors, ride golf cart, help Chuckwagons serve meals, stock drinks.",notes:"May work outside in inclement weather - bring jacket and rain gear."},
  "Wine Garden":{chair:"Lindsay Wied",cp:"713-555-1025",liaison:"Angie Reed",lp:"713-555-1065",le:"test.contact@hlsr.com",loc:"Wine Garden.",duties:"Assemble and hand out glow giveaways for the rodeo kick off glow party.",notes:"Come to back of Wine Garden and ask for Angie Reed."}
};


// ============================================================
// LOGO — embed real JRC logo
// ============================================================
document.addEventListener('DOMContentLoaded', function(){
  var hlsrB64 = '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';
  var loginHlsrB64 = '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AIEOAAAAAh0AAAAQ6AAAACDQAQAAAIEOAAAAAh0AAAAQ6AAAACDQAQAAAIEOAAAAAh0AAAAQ6AAAACDQAQAAAIEOAAAAAh0AAAAQ6AAAACDQAQAAAIEOAAAAAh0AAAAQ6AAAACDQAQAAAIEOAAAAAh0AAAAQ6AAAACDQAQAAAIEOAAAAAh0AAAAQ6AAAACDQAQAAAIEOAAAAAh0AAAAQ6AAAACDQAQAAAIEOAAAAAh0AAAAQ6AAAACDQAQAAAIEOAAAAAh0AAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAMC77v8AZiM5D2GeenwAAAAASUVORK5CYII=';
  var h = document.getElementById('hlsr-logo');
  if(h) h.src = 'data:image/webp;base64,' + hlsrB64;
  var ll = document.getElementById('login-logo');
  if(ll) ll.src = 'data:image/png;base64,' + loginHlsrB64;
  if(window.location.search.indexOf('partner=1') < 0 && _restoreLogin()) return;
  document.addEventListener('keydown', function(e){ if(e.key==='Escape') closeReqEdit(); });

  // Pre-load adults from Neon so login form works immediately
  _preloadAdults();
  // Auto-enter partner mode if accessed via /partners redirect
  if(window.location.search.indexOf('partner=1') >= 0){
    setTimeout(function(){ enterPartnerMode(); }, 100);
    return;
  }
});

// Large login logo
(function(){
  var lb64 = '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';
  var ll = document.getElementById('login-logo');
  if(ll) ll.src = 'data:image/webp;base64,' + lb64;
})();

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
  document.getElementById('hdr-info').innerHTML =
    (ds ? '<strong style="color:#fff">' + ds + '</strong> &bull; ' : '') +
    (dow ? '<span style="color:#99BBDD">' + dow + '</span><br>' : '') +
    fmtDate(d) + '<br><span id="hdr-clock"></span>';
  updateHeaderClock();
}

function updateHeaderClock(){
  var el = document.getElementById('hdr-clock');
  if(!el) return;
  var now = getSimTime();
  var h = now.getHours(), m = now.getMinutes();
  var ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  el.textContent = h + ':' + String(m).padStart(2,'0') + ' ' + ampm + (simTimeEnabled ? ' ⏱' : '');
}
function applySimTime(){
  var h = parseInt(document.getElementById('sim-hour').value);
  var m = parseInt(document.getElementById('sim-min').value);
  var ampm = document.getElementById('sim-ampm').value;
  // Convert to 24h
  if(ampm === 'pm' && h !== 12) h += 12;
  if(ampm === 'am' && h === 12) h = 0;
  setSimTime(h, m);
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
  var h = parseInt(document.getElementById('sim-hour').value);
  var m = parseInt(document.getElementById('sim-min').value);
  // h is already 24h value from select
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
  setSimTime(h, m);
  var ampm = h >= 12 ? 'PM' : 'AM';
  var h12 = h > 12 ? h-12 : (h===0 ? 12 : h);
  var label = h12 + ':' + String(m).padStart(2,'0') + ' ' + ampm;
  document.getElementById('sim-status').innerHTML = 'Set to <strong>' + fmtDate(d) + ' at ' + label + '</strong> &mdash; advancing from this point';
  updateHeaderDate();
  onSetupDateChange();
  renderOfficer();
  updateBoardClock();
  saveStateNow();
}

// ============================================================
// TABS
// ============================================================
var _boardUnlocked = false;

function promptBoardPin(){
  var pin = prompt('Enter Status Board PIN:');
  if(pin === '2222'){
    _boardUnlocked = true;
    switchTab('board', null);
  } else if(pin !== null){
    alert('Incorrect PIN.');
  }
}

function switchTab(t, el){
  // Status board requires PIN 2222 unless already unlocked this session
  // Skip PIN check if this is an auto/initial tab switch (el === null means programmatic)
  if(t === 'board' && !_boardUnlocked && el !== null){
    promptBoardPin();
    return;
  }
  if(t === 'board' && el !== null) _boardUnlocked = true;
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
  if(t === 'requests') renderRequests();
  if(t === 'reqform') renderReqForm();
  if(t === 'board') renderBoard();
  if(t === 'hours') renderHours();
  if(t === 'simulate') renderUserMgmt();
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
    document.getElementById('kco-name').textContent = (jr.hasHat ? '🤠 ' : '') + jr.name;
    document.getElementById('kco-assignment').textContent = jr.assignment ? 'Currently assigned to: ' + jr.assignment : 'Not yet assigned to a committee';
    var nextEl = document.getElementById('kco-next-shift');
    if(nextEl) nextEl.textContent = '';
    document.getElementById('k-entry').style.display = 'none';
    document.getElementById('k-clockout').style.display = 'block';
    return;
  }
  pendingJr = jr;
  document.getElementById('kc-name').textContent = (jr.hasHat ? '🤠 ' : '') + jr.name;
  document.getElementById('kc-title').textContent = jr.title;
  document.getElementById('kc-last').textContent = 'Last assignment: ' + jr.last;
  var b = '<span class="badge b-title">' + jr.title.replace('Junior ', '') + '</span>';
  if(jr.ageout) b += ' <span class="badge b-ageout">Age-Out</span>';
  document.getElementById('kc-badges').innerHTML = b;
  document.getElementById('k-entry').style.display = 'none';
  // Age-outs get extra shift-selection screen
  if(jr.ageout){
    document.getElementById('kao-name').textContent = (jr.hasHat ? '🤠 ' : '') + jr.name;
    // Pre-check current shift
    ['8am','12pm','4pm'].forEach(function(sh){
      var cb = document.getElementById('kao-shift-' + sh);
      if(cb) cb.checked = (sh === currentShift);
    });
    document.getElementById('k-ao-shifts').style.display = 'block';
  } else {
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
  document.getElementById('kc-name').textContent = (pendingJr.hasHat ? '🤠 ' : '') + pendingJr.name;
  document.getElementById('kc-title').textContent = pendingJr.title;
  document.getElementById('kc-last').textContent = 'Last assignment: ' + pendingJr.last;
  var b = '<span class="badge b-title">' + pendingJr.title.replace('Junior ', '') + '</span>';
  b += ' <span class="badge b-ageout">Age-Out</span>';
  if(pendingJr.plannedShifts.length > 1){
    b += ' <span class="badge" style="background:#E8F0FF;color:#2A3DB5;border:1px solid #4A6CF7">Working ' + pendingJr.plannedShifts.length + ' shifts</span>';
  }
  document.getElementById('kc-badges').innerHTML = b;
  document.getElementById('k-ao-shifts').style.display = 'none';
  document.getElementById('k-confirm').style.display = 'block';
}

function kConfirm(){
  if(!pendingJr) return;
  checkInOrder++;
  pendingJr.checkedIn = true;
  pendingJr.order = checkInOrder;
  pendingJr.hasHat = document.getElementById('k-hat').checked;
  pendingJr.notes = document.getElementById('k-notes').value.trim();
  pendingJr.checkInShift = getShiftFromTime(getSimTime()); // record which shift they checked in for
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
  document.getElementById('kd-name').textContent = (pendingJr.hasHat ? '🤠 ' : '') + pendingJr.name;
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
  document.getElementById('kdo-name').textContent = (pendingJr.hasHat ? '🤠 ' : '') + pendingJr.name;
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
  jr.assignment = null;
  jr.last = jr.prevLast !== null ? jr.prevLast : jr.last;
  if(jr.history.length > 0 && jr.history[jr.history.length - 1] === sl.name) jr.history.pop();
  jr.prevLast = null;
  sl.assigned = sl.assigned.filter(function(id){ return id !== jr.id; });
}

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
    var det = CD[sl.name] || {};
    // For custom slots, use their directly-entered contact data
    if(!CD[sl.name] && sl.custom){
      det = {loc:sl.location||'', duties:sl.duties||'', notes:sl.notes||'',
             liaison:sl.liaison||'', lp:sl.liaisonPhone||'', le:sl.liaisonEmail||'',
             chair:sl.chair||'', cp:sl.chairPhone||''};
    }
    var jrs = sl.assigned.map(function(jid){ return juniors.find(function(j){ return j.id===jid; }); }).filter(Boolean);
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
    // Details
    html += '<div class="rpt-grid">';
    if(det.loc)    html += '<div class="rpt-field full"><label>Location / Where to Report</label><p>' + det.loc + '</p></div>';
    if(det.liaison)html += '<div class="rpt-field"><label>Event Contact / Liaison</label><p><strong>' + det.liaison + '</strong>' + (det.lp ? '<br>' + det.lp : '') + (det.le ? '<br>' + det.le : '') + '</p></div>';
    if(det.chair)  html += '<div class="rpt-field"><label>Committee Chair</label><p><strong>' + det.chair + '</strong>' + (det.cp ? '<br>' + det.cp : '') + '</p></div>';
    if(det.duties) html += '<div class="rpt-field full"><label>Duties</label><p>' + det.duties + '</p></div>';
    if(det.notes)  html += '<div class="rpt-field full"><label>Notes / Attire</label><p>' + det.notes + '</p></div>';
    html += '</div>';
    // Junior lines
    html += '<div class="rpt-jlist"><div class="rpt-jlabel">Juniors Sent to Assignment (' + jrs.length + ' of ' + sl.capacity + ')</div>';
    for(var i=0;i<sl.capacity;i++){
      var jr = jrs[i];
      html += '<div class="rpt-jrow">' +
        '<span class="rpt-num">' + (i+1) + '.</span>' +
        '<span class="rpt-name">' + (jr ? (jr.hasHat ? '🤠 ' : '') + jr.name + (jr.ageout?' &#9733;':'') : '') + '</span>' +
      '</div>';
    }
    html += '</div>';
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
    return j.checkedIn && j.notes && j.notes.length > 0 && !j.ageout;
  });
  if(ci.length === 0){ el.innerHTML = ''; return; }

  var pending   = ci.filter(function(j){ return !notesState[j.id] || notesState[j.id] === 'pending'; });
  var handled   = ci.filter(function(j){ return notesState[j.id] && notesState[j.id] !== 'pending'; });
  var doneCount = handled.length;

  var html = '<div class="notes-card">' +
    '<div class="notes-card-title" style="cursor:pointer;user-select:none" onclick="toggleNotesCollapse()">' +
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
      '<div class="notes-item-name">' + (j.hasHat ? '🤠 ' : '') + j.name +
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
        '<div class="pick-header">' + (jr.hasHat ? '🤠 ' : '') + jr.name + ' &mdash; choose assignment</div>' +
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
  var ci = juniors.filter(function(j){ return j.checkedIn; });
  var asgn = juniors.filter(function(j){ return j.assignment; });
  var un = ci.filter(function(j){ return !j.assignment; });
  var totalOpen = activeSlots.reduce(function(a, s){ return a + Math.max(0, s.capacity - s.assigned.length); }, 0);
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
      var shifts = (j.plannedShifts && j.plannedShifts.length > 0) ? j.plannedShifts : [currentShift];
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
          (j.hasHat ? '🤠 ' : '') + j.name +
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
          '<div class="pick-header">' + (pickJr.hasHat ? '🤠 ' : '') + pickJr.name + ', choose your assignment</div>' +
          (pickJr.plannedShifts && pickJr.plannedShifts.length > 1 ? '<div style="font-size:12px;color:#2A3DB5;margin-top:3px">&#9432; Planned shifts: <strong>' + pickJr.plannedShifts.map(function(s){ return SL[s]; }).join(', ') + '</strong></div>' : '') +
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
        (j.hasHat ? '🤠 ' : '') + j.name +
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
      var isOut = clockedOut[jid] || clockedOut[jr.id];
      return '<span class="pill' + (jr.ageout ? ' ao' : '') + (jr.hasHat ? ' has-hat' : '') + '" ' +
             'style="' + (isOut ? 'opacity:.5;text-decoration:line-through;' : '') + '" ' +
             'title="' + (jr.notes ? 'Note: ' + jr.notes : '') + (isOut ? ' [Clocked out]' : '') + '">' +
             (jr.hasHat ? '🤠 ' : '') + jr.name +
             (jr.ageout ? ' <span class="badge b-ageout" style="font-size:11px;padding:1px 4px;background:none;border:none;color:#F5A623">⭐</span>' : '') +
             (jr.notes ? ' <span style="font-size:11px;color:var(--orange);font-weight:700">&#9432;</span>' : '') +
             (isOut ? ' <span style="font-size:10px;color:#888">(out)</span>' : '') +
             ' <button class="pill-x" data-jid="' + jid + '" data-slotid="' + s.id + '" data-sent="' + isSent + '" data-jrid="' + jr.id + '" onclick="pillAction(this)">&#x2715;</button>' +

             '</span>';
    }).join('');

    var sentBanner = isSent ? '<div style="background:#E8F5ED;color:#155724;font-size:11px;font-weight:600;text-align:center;padding:4px 10px;border-radius:4px;margin-bottom:8px;letter-spacing:.05em">Out on Shift</div>' : '';

    var cardStyle = 'slot-card' + (full ? ' full' : '') + (isSent ? ' sent' : '');

    var hpBorder = s.highPriority && !isSent ? 'border:1px solid #CC0000;border-left:3px solid #CC0000;background:#FFF8F8;' : '';
    return '<div class="' + cardStyle + '" data-slotid="' + s.id + '" style="' + (isSent ? 'border:1px solid #97C459;border-left:3px solid #27AE60;background:#F7FDF9;' : hpBorder) + '">' +
      sentBanner +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px;gap:8px">' +
        '<div style="flex:1">' +
          '<div class="slot-name">' + s.name + '</div>' +
          '<div class="slot-meta">' +
            '<span class="badge b-shift">' + SL[s.shift] + '</span>' +
            (s.hat ? '<span class="badge b-hat">🤠 Hat Required</span>' : '') +
            (s.highPriority ? '<span class="badge" style="background:#CC0000;color:#fff">&#9650; HIGH PRIORITY</span>' : '') +
            '<button onclick="toggleHighPriority(' + s.id + ')" style="font-size:10px;padding:1px 6px;border:1px solid ' + (s.highPriority ? '#CC0000' : '#ccc') + ';border-radius:8px;background:' + (s.highPriority ? '#FFF0F0' : '#F8F8F8') + ';color:' + (s.highPriority ? '#CC0000' : '#888') + ';cursor:pointer">&#9650; Priority</button>' +
          '</div>' +
        '</div>' +
        '<span class="badge ' + (full ? 'b-full' : 'b-open') + '">' + s.assigned.length + ' / ' + s.capacity + '</span>' +
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
            return '<option value="' + j.id + '">' + (j.ageout ? '[Age-out] ' : '') + (j.hasHat ? '🤠 ' : '') + j.name + (j.notes ? ' [NOTE]' : '') + ' — last: ' + j.last + (rep ? ' (repeat!)' : '') + '</option>';
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
    admin: [
      ['kiosk',    'Junior Login',              1],
      ['officer',  'Officer Dashboard',         1],
      ['setup',    'Shift Setup',               1],
      ['board',    'Status Board',              2],
      ['roster',   'Roster',                    2],
      ['requests', 'Requests',                  2],
      ['reqform',  'Submit Request',            3],
      ['simulate', 'Settings',                  3],
      ['hours',    'Hours Report',              3],
    ],
    officer: [
      ['officer',  'Shift Officer Dashboard',   1],
      ['setup',    'Shift Setup',               1],
      ['kiosk',    'Kiosk',                     1],
    ],
    scheduling: [
      ['reqform',  '&#43; Submit Request',      1],
      ['requests', '&#128203; Requests',        1],
      ['setup',    'Shift Setup',               1],
    ],
    kiosk: [
      ['kiosk',    'Kiosk',                     1],
    ],
    board: [
      ['board',    '&#128250; Status Board',    1],
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

function openPickForShift(jid, shift){
  activePick = jid + '_' + shift;
  activePickShift = shift;
  renderOfficer();
}
function closePick(){ activePick = null; activePickShift = null; renderOfficer(); }

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
    if(sl.shift === currentShift){
      assignJr(jr, sl.name);
      lockedJuniors.add(jr.id);
    }
  } else {
    if(jr.assignment || sl.assigned.length >= sl.capacity) return;
    assignJr(jr, sl.name);
  }
  sl.assigned.push(jr.id);
  activePick = null;
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
}
  saveState();


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

    // Rule 2 (history): hard block on most recent committee, soft variety preference
    var last = lastCommittee(jr);
    var noRepeat = last ? eligible.filter(function(s){ return s.name !== last; }) : eligible;
    if(noRepeat.length > 0) eligible = noRepeat; // fallback to all if no other options

    var visited = visitMap(jr);

    // Rule 4 (high priority): fill HP slots to capacity first
    var hpOpen = eligible.filter(function(s){ return s.highPriority; });
    if(hpOpen.length){
      var hpAtOne = hpOpen.filter(function(s){ return s.assigned.length === 1; });
      var hpCands = hpAtOne.length ? hpAtOne : hpOpen;
      hpCands = hatPool(jr, hpCands, pool);
      hpCands.sort(function(a,b){ return (visited[a.name]||0)-(visited[b.name]||0); });
      if(hpCands.length) return hpCands[0];
    }

    // Rules 1+3 (no-solo + even fill): slots at 1 first, then min fill
    var regular = eligible.filter(function(s){ return !s.highPriority; });
    if(!regular.length) regular = eligible;

    var atOne = regular.filter(function(s){ return s.assigned.length === 1; });
    var minFill = regular.reduce(function(m,s){ return Math.min(m, s.assigned.length); }, Infinity);
    var cands = atOne.length ? atOne : regular.filter(function(s){ return s.assigned.length === minFill; });

    // Rule 5 (hat)
    cands = hatPool(jr, cands, pool);

    // Rule 6 (variety): least visited
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
  fetch('/.netlify/functions/state', {method:'DELETE'})
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
  onShiftJuniors = new Set();
  onShiftSlots = new Set();
  onShiftSlots = new Set();
  lockedJuniors = new Set();
  document.getElementById('off-alert').style.display = 'none';
  renderOfficer();
}

function clearAll(){
  if(!confirm('Clear all check-ins and assignments for today?')) return;
  resetShift();
}

function resetAllHistory(){
  juniors.forEach(function(j){ j.history = []; j.last = 'None'; });
  renderRoster();
  showAlert('All assignment history cleared.', 'info');
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


function renderRoster(){
  var q = (document.getElementById('r-search').value || '').toLowerCase();
  var f = document.getElementById('r-filter').value;
  var aoCount = juniors.filter(function(j){ return j.ageout; }).length;

  if(f === 'adult'){
    var al = adults.filter(function(a){ return !q || a.name.toLowerCase().includes(q) || a.id.includes(q); });
    document.getElementById('r-count').textContent = al.length + ' adult leaders';
    document.getElementById('r-body').innerHTML = al.map(function(a){
      return '<tr><td style="font-size:11px;color:var(--gray-400)">' + a.id + '</td><td style="font-weight:600;color:var(--navy)">' + a.name + '</td>' +
        '<td><span class="badge" style="background:var(--navy-lt);color:var(--navy)">' + a.title + '</span></td>' +
        '<td colspan="4" style="font-size:12px;color:var(--gray-400)">Admin &mdash; not assigned to committees</td><td></td></tr>';
    }).join('');
    return;
  }

  var list = juniors.slice();
  if(f === 'ageout') list = list.filter(function(j){ return j.ageout; });
  if(q) list = list.filter(function(j){ return j.name.toLowerCase().includes(q) || j.id.includes(q) || (j.phone && j.phone.includes(q)) || (j.email && j.email.toLowerCase().includes(q)); });

  document.getElementById('r-count').textContent = list.length + ' junior' + (list.length !== 1 ? 's' : '') + (f === 'ageout' ? ' (age-outs)' : '') + ' &bull; ' + aoCount + ' age-outs total';

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
      contact = '<div style="display:flex;gap:4px">' +
        '<input class="finput" style="font-size:11px;padding:2px 5px;width:100px" placeholder="Phone" value="' + (j.phone||'') + '" onchange="juniors[' + ri + '].phone=this.value;renderRoster()">' +
        '<input class="finput" style="font-size:11px;padding:2px 5px;width:130px" placeholder="Email" value="' + (j.email||'') + '" onchange="juniors[' + ri + '].email=this.value;renderRoster()">' +
        '</div>';
    }
    // Click to edit contact
    if(j.phone || j.email){
      contact = '<div style="cursor:pointer;font-size:11px;line-height:1.6" title="Click to edit" onclick="juniors[' + ri + ']._editContact=true;renderRoster()">' +
        (j.phone ? '<div>&#128222; ' + j.phone + '</div>' : '<div style="color:var(--gray-400)">No phone</div>') +
        (j.email ? '<div style="color:#4A6CF7">&#9993; ' + j.email + '</div>' : '<div style="color:var(--gray-400)">No email</div>') +
        '</div>';
      if(j._editContact){
        contact = '<div style="display:flex;flex-direction:column;gap:3px">' +
          '<input class="finput" style="font-size:11px;padding:2px 5px" placeholder="Phone" value="' + (j.phone||'') + '" onchange="juniors[' + ri + '].phone=this.value">' +
          '<input class="finput" style="font-size:11px;padding:2px 5px" placeholder="Email" value="' + (j.email||'') + '" onchange="juniors[' + ri + '].email=this.value">' +
          '<button class="btn btn-sm" style="font-size:10px;padding:1px 6px" onclick="juniors[' + ri + ']._editContact=false;renderRoster()">Done</button>' +
          '</div>';
      }
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
      '<td style="font-weight:600;color:var(--navy)">' + (j.hasHat ? '🤠 ' : '') + j.name + '</td>' +
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
        toAdd.push({name:slotName, shift:shift, cap:s.cap, hat:r.hat});
      } else {
        if(s.shift !== shift) return;
        // Match specific-date requests OR all-show requests (all20:true)
        if(s.date === date || s.all20){
          toAdd.push({name:r.name, shift:shift, cap:s.cap, hat:r.hat});
        }
      }
    });
  });
  var added = 0, skipped = 0;
  toAdd.forEach(function(c){
    var alreadyHas = activeSlots.some(function(s){ return s.name === c.name && s.shift === shift; });
    if(alreadyHas){ skipped++; return; }
    activeSlots.push({id:Date.now() + Math.random(), name:c.name, capacity:c.cap, shift:shift, hat:c.hat, assigned:[]});
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

  // ── Pre-Show / Other dates (between 2026 and 2027) ────────────────────
  var preShowDates = {};
  var show2026Keys = Object.keys(SCHEDULE_2026);
  committeeRequests.filter(function(r){ return r.status==='approved'; }).forEach(function(r){
    r.shifts.forEach(function(s){
      if(!s.date) return;
      var in2026Show = show2026Keys.indexOf(s.date) >= 0;
      // Temporarily check against 2027 show — we'll build that below
      var in2027Show = (function(){
        var dt = new Date(s.date + 'T00:00:00');
        return dt.getFullYear() === 2027 && dt.getMonth() === 2 && dt.getDate() >= 2 && dt.getDate() <= 20;
      })();
      if(!in2026Show && !in2027Show){
        preShowDates[s.date] = true;
      }
    });
  });
  var psDates = Object.keys(preShowDates).sort();
  if(psDates.length){
    var optgroupPS = document.createElement('optgroup');
    optgroupPS.label = 'Pre-Show / Other';
    psDates.forEach(function(d){
      var opt = document.createElement('option');
      opt.value = d;
      opt.textContent = fmtDateLong(d) + ' ✓';
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
}

function onSetupDateChange(){
  var date = document.getElementById('setup-date').value;
  var prevSetupDate = (window._setupDate || '');
  window._setupDate = date || prevSetupDate;


  // Clear active slots when date changes
  // Clear active slots when setup date changes
  if(date && date !== prevSetupDate && activeSlots.length > 0){
    if(hasAssigned){
      if(!confirm('Changing the date will clear all current slots and assignments. Continue?')) {
        document.getElementById('setup-date').value = prevSetupDate;
        window._setupDate = prevSetupDate;
        return;
      }
    }
    activeSlots = [];
    juniors.forEach(function(j){ j.assignment = null; });
    document.getElementById('bulk-result').textContent = '';
  }
  // Note: we do NOT update currentDate or header here — only activateShift does that
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

  var html = '<div class="shift-preview">';
  html += '<div class="shift-preview-header">' +
    '<div>' +
      '<div class="shift-preview-title">' + fmtDateLong(date) + '</div>' +
      '<div class="shift-preview-count">' + totalSlots + ' committee slots &bull; ' + totalJuniors + ' junior spots requested</div>' +
    '</div>' +
    '<div style="display:flex;gap:6px">' +
      '<button class="btn btn-orange" style="font-size:12px;padding:6px 12px" onclick="bulkAddAllShifts()">+ Load Entire Day</button>' +
    '</div>' +
  '</div>';

  ['8am','12pm','4pm'].forEach(function(sh){
    var list = groups[sh];
    if(!list.length) return;
    var shJuniors = list.reduce(function(a,s){ return a + s.cap; }, 0);
    var allAdded = list.every(function(s){ return activeSlots.some(function(a){ return a.name===s.name && a.shift===sh; }); });

    html += '<div class="shift-block">';
    html += '<div class="shift-block-header">' +
      '<div>' +
        '<span class="shift-block-title">' + SL[sh] + '</span>' +
        '<span class="shift-block-meta" style="margin-left:8px">' + list.length + ' committees &bull; ' + shJuniors + ' juniors</span>' +
      '</div>' +
      '<div class="shift-block-actions">' +
        (allAdded
          ? '<span style="font-size:11px;color:#155724;font-weight:600">&#10003; All added</span>'
          : '<button class="btn btn-primary" style="font-size:11px;padding:4px 10px" onclick="bulkAddShift(\'' + sh + '\')">+ Add All ' + SL[sh].split('–')[0].trim() + ' Committees</button>'
        ) +
      '</div>' +
    '</div>';

    list.forEach(function(s){
      var isAdded = activeSlots.some(function(a){ return a.name===s.name && a.shift===sh; });
      html += '<div class="preview-row' + (isAdded ? ' added' : '') + '">' +
        '<div class="preview-name">' +
          (s.hat ? '<span class="hat-icon" style="font-size:12px">🤠 </span>' : '') +
          s.name +
          (s.isNew ? ' <span class="badge" style="background:#E8F4E8;color:#155724;font-size:9px">New</span>' : '') +
        '</div>' +
        '<div class="preview-cap">' + s.cap + '</div>' +
        '<div class="preview-status">' +
          (isAdded
            ? '<span style="color:#155724;font-size:11px;font-weight:600">&#10003; Added</span>'
            : '<button class="btn btn-sm btn-add-one" onclick="addSinglePreviewSlotEl(this)" data-name=\'\'' + s.name + '\'\' data-shift=\'\'' + sh + '\'\' data-cap=\'\'' + s.cap + '\'\' data-hat=\'\'' + (s.hat?1:0) + '\'\'>+ Add</button>'
          ) +
        '</div>' +
      '</div>';
    });

    html += '</div>';
  });

  html += '</div>';
  prev.innerHTML = html;
  prev.style.display = 'block';
}

function addSinglePreviewSlot(name, shift, cap, hat){
  var already = activeSlots.some(function(s){ return s.name===name && s.shift===shift; });
  if(already) return;
  activeSlots.push({id:Date.now()+Math.random(), name:name, capacity:cap, shift:shift, hat:hat, assigned:[]});
  onSetupDateChange();
  renderSetup();
}

function addSinglePreviewSlotEl(btn){
  var name = btn.getAttribute('data-name');
  var shift = btn.getAttribute('data-shift');
  var cap = parseInt(btn.getAttribute('data-cap')) || 4;
  var hat = btn.getAttribute('data-hat') === '1';
  addSinglePreviewSlot(name, shift, cap, hat);
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

  // Show approved requests panel
  var approvedEl = document.getElementById('setup-approved-section');
  if(approvedEl){
    var approved = committeeRequests.filter(function(r){ return r.status === 'approved'; });
    if(approved.length > 0){
      var apHtml = '<div style="background:#D4EDDA;border:1px solid #97C459;border-radius:8px;padding:12px 14px;margin-bottom:12px">' +
        '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#155724;margin-bottom:8px">Approved committee requests (' + approved.length + ')</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:6px">';
      approved.forEach(function(r){
        r.shifts.forEach(function(s, si){
          var date = document.getElementById('setup-date') ? document.getElementById('setup-date').value : '';
          if(!s.all20 && s.date !== date) return;

          // Determine the effective shift key and display label
          var effShift = s.shift;
          var effLabel = SL[s.shift] || '';
          if(s.preshow){
            effShift = psTimeToShift(s.startTime);
            effLabel = (s.startTime || '') + (s.endTime ? '–' + s.endTime : '');
          }

          var slotName = s.preshow ? (r.name + ' (' + effLabel + ')') : r.name;
          var alreadyAdded = activeSlots.some(function(sl){ return sl.name === slotName && sl.shift === effShift; });
          apHtml += '<button class="btn btn-sm" style="font-size:11px;' + (alreadyAdded ? 'opacity:.5;cursor:default' : 'border-color:#27AE60;color:#155724') + '" ' +
            (alreadyAdded ? 'disabled' : 'onclick="addApprovedSlotByIdx(' + r.id + ',' + si + ')"') + '>' +
            (alreadyAdded ? '&#10003; ' : '+ ') + r.name +
            (effLabel ? ' &mdash; ' + effLabel : '') + ' (' + s.cap + ')' +
            (s.all20 ? ' <span style="font-size:9px;opacity:.7">(all days)</span>' : '') +
          '</button>';
        });
      });
      apHtml += '</div></div>';
      approvedEl.innerHTML = apHtml;
    } else {
      approvedEl.innerHTML = '';
    }
  }

  var sl = document.getElementById('setup-list');
  if(!sl) return;
  if(activeSlots.length === 0){
    sl.innerHTML = '<div style="font-size:13px;color:var(--gray-400);padding:.5rem 0">No custom slots added yet.</div>';
    return;
  }
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
            '<button class="btn btn-sm" style="flex-shrink:0" onclick="editCustomSlot(' + sid + ')">&#9998; Edit</button>' +
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
              '<input type="checkbox" ' + (s.hat ? 'checked' : '') + ' style="width:18px;height:18px;accent-color:var(--navy)" onchange="activeSlots[' + i + '].hat=this.checked"> 🤠 Hat required for this assignment' +
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
      '<button class="btn btn-sm btn-danger" onclick="activeSlots=activeSlots.filter(function(x){return String(x.id)!==String(' + sid + ')});renderSetup();saveState()">Remove</button>' +
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
  activeSlots.push({id: Date.now(), name:'New Committee', capacity:4, shift: document.getElementById('setup-shift').value, hat:false, assigned:[],
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
  currentDate = (dateEl ? dateEl.value : '') || currentDate;

  // Auto-detect shift: use the shift that has the most loaded slots,
  // falling back to the dropdown selection, then real time
  var shiftCounts = {'8am':0, '12pm':0, '4pm':0};
  activeSlots.forEach(function(s){ if(shiftCounts[s.shift] !== undefined) shiftCounts[s.shift]++; });
  var dominantShift = document.getElementById('setup-shift').value;
  var maxCount = 0;
  Object.keys(shiftCounts).forEach(function(sh){
    if(shiftCounts[sh] > maxCount){ maxCount = shiftCounts[sh]; dominantShift = sh; }
  });
  currentShift = dominantShift;

  // Also update the setup-shift dropdown to reflect what we picked
  var ss = document.getElementById('setup-shift');
  if(ss) ss.value = currentShift;

  updateHeaderDate();
  saveStateNow();
  switchTab('officer', document.querySelector('.tab[onclick*="officer"]'));
  renderOfficer();
  window.scrollTo({top:0, behavior:'smooth'});
}



// ============================================================
// LOGIN SYSTEM
// Roles: admin | officer | kiosk
// PINs (change these before going live):
//   admin:   1234
//   officer: 5678
//   kiosk:   0000  (no PIN needed — just tap Enter or the button)
// ============================================================
var PINS = { admin:'1234', officer:'5678', scheduling:'1111', kiosk:'0000', board:'2222' };
var ROLE_LABELS = { admin:'Administrator', officer:'Shift Officer', scheduling:'Scheduling', mentor:'Mentor', kiosk:'Kiosk Mode', board:'Status Board' };

// Tabs each role can see
var ROLE_TABS = {
  admin:       ['officer','kiosk','roster','setup','requests','reqform','simulate','board','hours'],
  officer:     ['officer','setup','kiosk'],
  scheduling:  ['reqform','requests','setup'],
  mentor:      ['kiosk','board'],
  kiosk:       ['kiosk'],
  board:       ['board']
};

var currentRole = null;
var currentTab = 'kiosk';
var pendingRole = null;

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
  fetch('/.netlify/functions/state')
    .then(function(r){ return r.json(); })
    .then(function(data){ if(data && !data.error) _applyState(data); })
    .catch(function(){});
}

function partnerSubmitAnother(){
  var m = document.getElementById('rf-submit-msg');
  if(m) m.innerHTML = '';
  renderReqForm();
}

function exitPartnerMode(){
  var po = document.getElementById('partner-orbs'); if(po) po.style.display='none';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('main-app').style.display = 'none';
  document.getElementById('partner-header').style.display = 'none';
  document.getElementById('main-header').style.display = 'block';
  document.getElementById('tab-bar').style.display = '';
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
  var memberId = (document.getElementById('pl-password').value || '').trim();
  var errEl    = document.getElementById('pl-err');
  errEl.textContent = '';

  if(!email || !memberId){ errEl.textContent = 'Please enter your email and member number.'; return; }

  // Adults must be loaded — if not, fetch first
  if(!adults.length){
    errEl.style.color = '#667788';
    errEl.textContent = 'Still connecting... please wait a moment and try again.';
    _preloadAdults();
    return;
  }

  // Find matching adult
  var adult = adults.find(function(a){
    return (a.email || '').trim().toLowerCase() === email && String(a.id).trim() === memberId;
  });

  if(!adult){ errEl.textContent = 'Email or member number not found. Please try again.'; return; }

  // Check explicit role first, then fall back to title-based role
  var role = userRoles[adult.id] || _titleToRole(adult.title);
  if(!role){
    // If NO roles have been configured at all, allow any authenticated adult
    // to access the admin role picker so someone can bootstrap the system
    var anyRolesConfigured = Object.keys(userRoles).length > 0;
    if(!anyRolesConfigured){
      loggedInAdult = adult;
      try { localStorage.setItem('jrc_logged_adult', JSON.stringify({id:adult.id, name:adult.name, role:'admin'})); } catch(e){}
      document.getElementById('personal-login').style.display = 'none';
      document.getElementById('role-select').style.display = 'block';
      return;
    }
    // Default: give basic access (kiosk + status board)
    role = 'mentor';
  }

  // Success — store who logged in
  loggedInAdult = adult;
  try { localStorage.setItem('jrc_logged_adult', JSON.stringify({id:adult.id, name:adult.name, role:role})); } catch(e){}

  if(role === 'admin'){
    // Admin sees full role picker
    document.getElementById('personal-login').style.display = 'none';
    document.getElementById('role-select').style.display = 'block';
  } else if(role === 'mentor'){
    // Mentor sees kiosk/status board choice
    loggedInAdult = adult;
    try { localStorage.setItem('jrc_logged_adult', JSON.stringify({id:adult.id, name:adult.name, role:role})); } catch(e){}
    document.getElementById('personal-login').style.display = 'none';
    document.getElementById('mentor-picker').style.display = 'block';
  } else {
    // Everyone else goes straight to their dashboard
    loginAs(role);
  }
}

function openBoardWithPin(){
  var pin = prompt('Enter Status Board PIN:');
  if(pin === '2222'){
    _boardUnlocked = true;
    document.getElementById('mentor-picker').style.display = 'none';
    loginAs('mentor');
    // Switch to board after login
    setTimeout(function(){ switchTab('board', 'pinVerified'); }, 300);
  } else if(pin !== null){
    alert('Incorrect PIN. Please try again.');
  }
}

function showDeviceModePins(){
  document.getElementById('role-select').style.display = 'none';
  document.getElementById('device-mode-select').style.display = 'block';
  document.getElementById('personal-login').style.display = 'none';
}

function selectRole(role){
  pendingRole = role;
  // If user already authenticated via personal login, skip PIN entirely
  if(loggedInAdult || role === 'kiosk'){
    loginAs(role);
    return;
  }
  // Device Mode (no personal login) — still requires PIN
  document.getElementById('role-select').style.display = 'none';
  document.getElementById('pin-screen').style.display = 'block';
  document.getElementById('pin-role-lbl').textContent = ROLE_LABELS[role];
  document.getElementById('pin-err').textContent = '';
  document.getElementById('pin-input').value = '';
  setTimeout(function(){ document.getElementById('pin-input').focus(); }, 50);
}

function backToRoles(){
  pendingRole = null;
  document.getElementById('pin-screen').style.display = 'none';
  document.getElementById('role-select').style.display = 'block';
  document.getElementById('pin-input').value = '';
  document.getElementById('pin-err').textContent = '';
}

function submitPin(){
  var entered = document.getElementById('pin-input').value.trim();
  if(entered === PINS[pendingRole]){
    loginAs(pendingRole);
  } else {
    document.getElementById('pin-err').textContent = 'Incorrect PIN. Please try again.';
    document.getElementById('pin-input').value = '';
    document.getElementById('pin-input').focus();
  }
}

function loginAs(role){
  currentRole = role;
  pendingRole = null;

  // Persist login so refresh doesn't log out
  try { localStorage.setItem('jrc_saved_role', role); } catch(e){}

  // Hide login, show app
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('main-app').style.display = 'block';

  // Show user badge + logout button
  var badgeName = loggedInAdult ? loggedInAdult.name.split(',')[0].trim() + ' (' + ROLE_LABELS[role] + ')' : ROLE_LABELS[role];
  document.getElementById('user-badge').textContent = badgeName;
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
    document.getElementById('logout-wrap').style.display = 'none';
  var lwi = document.getElementById('logout-wrap-inner'); if(lwi) lwi.style.display = 'none'; // cleaner for kiosk tablets
  }
}

function doLogout(){
  _clearInactivityTimer();
  _boardUnlocked = false;
  currentRole = null;
  loggedInAdult = null;
  try { localStorage.removeItem('jrc_saved_role'); } catch(e){}
  try { localStorage.removeItem('jrc_logged_adult'); } catch(e){}
  pendingRole = null;

  // Hide app, show login
  document.getElementById('main-app').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  var ft = document.getElementById('app-footer'); if(ft) ft.style.display = 'none';
  var lwi = document.getElementById('logout-wrap-inner'); if(lwi) lwi.style.display = 'none';

  // Reset login form to personal login
  document.getElementById('personal-login').style.display = 'block';
  document.getElementById('role-select').style.display = 'none';
  document.getElementById('pin-screen').style.display = 'none';
  var e = document.getElementById('pl-email'); if(e) e.value = '';
  var p = document.getElementById('pl-password'); if(p) p.value = '';
  var err = document.getElementById('pl-err'); if(err) err.textContent = '';
  var pin = document.getElementById('pin-input'); if(pin) pin.value = '';
  var perr = document.getElementById('pin-err'); if(perr) perr.textContent = '';
}

// Logo set by hlsrB64 block above


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
    id: requestIdCounter++,
    submittedAt: new Date().toISOString(),
    status: 'pending',
    name:name, chair:chair, chairPhone:chairPhone, chairEmail:chairEmail,
    liaison:liaison, liaisonPhone:liaisonPhone, liaisonEmail:liaisonEmail,
    location:location, duties:duties, notes:notes, hat:hat,
    all20:all20, preshow:preshow, shifts:shifts,
    schedulingNotes: ''
  };
  committeeRequests.unshift(req);

  msg.innerHTML = '<div class="alert alert-success">Request submitted! The JRC scheduling team will review it shortly.</div>';

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

function renderRequests(){
  var filter = (document.getElementById('req-filter') ? document.getElementById('req-filter').value : 'all');
  var list = committeeRequests.filter(function(r){
    return filter === 'all' || r.status === filter;
  });

  var el = document.getElementById('req-list');
  if(!el) return;

  if(!list.length){
    el.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--gray-400);font-size:14px">' +
      (filter === 'pending' ? 'No pending requests. All caught up!' : 'No requests found.') +
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
      approvedFrom =
        '<div style="font-size:11px;color:#155724;margin-top:6px;margin-bottom:10px">&#10003; Approved — visible in Shift Setup.</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
          '<button class="btn" style="font-size:12px;padding:5px 12px" onclick="editRequest(' + r.id + ')">&#9998; Edit</button>' +
          '<button class="btn btn-danger" style="font-size:12px;padding:5px 12px" onclick="revokeRequest(' + r.id + ')">&#x21A9; Revoke Approval</button>' +
          '<button class="btn" style="font-size:12px;padding:5px 12px;border-color:#CC0000;color:#CC0000" onclick="rejectRequest(' + r.id + ')">&#x2715; Deny &amp; Archive</button>' +
          '<button class="btn" style="font-size:12px;padding:5px 10px;border-color:#CC0000;color:#CC0000" onclick="deleteRequest(' + r.id + ')" title="Delete">&#x1F5D1;</button>' +
        '</div>';
    }

    return '<div class="req-card ' + r.status + '">' +
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:8px">' +
        '<div>' +
          '<div style="font-size:15px;font-weight:700;color:var(--navy)">' + r.name + (r.hat ? ' <span class="badge b-hat">🤠 Hat req.</span>' : '') + '</div>' +
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
            '<button class="btn" style="font-size:12px;padding:5px 12px" onclick="editRequest(' + r.id + ')">&#9998; Edit</button>' +
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
  saveState();

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
  saveState();
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
  clockedOut[jid] = true;
  renderOfficer();
  renderBoard();
  saveStateNow();
}

function markSent(slotId){
  var sl = activeSlots.find(function(s){ return String(s.id) === String(slotId); });
  if(!sl) return;
  onShiftSlots.add(String(slotId));
  var date = (document.getElementById('setup-date') ? document.getElementById('setup-date').value : '') || currentDate;
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
  if(!jr.checkedIn && clockedOut && (clockedOut[jr.id] || clockedOut[String(jr.id)])) return 'checked-out';
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

  var html = '<div class="board-wrap">' +
    '<div class="board-header">' +
      '<div>' +
        '<div class="board-title">JRC Live Status Board</div>' +
        '<div class="board-clock" id="board-date-lbl">' + fmtDateLong(date) + '</div>' +
      '</div>' +
      '<div id="board-clock" style="font-size:22px;font-weight:700;color:#fff;font-variant-numeric:tabular-nums"></div>' +
    '</div>' +
    '<div class="board-body">';

  shifts.forEach(function(sh){
    // Get all juniors who have ANY activity for this shift
    var slotsForShift = activeSlots.filter(function(s){ return s.shift === sh; });
    var checkedInForShift = juniors.filter(function(j){
      if(!j.checkedIn) return false;
      if(clockedOut[j.id]) return false; // clocked out — don't show on board
      var jShift = j.checkInShift || currentShift;
      return jShift === sh;
    });

    var ciList    = checkedInForShift.filter(function(j){ return getJuniorStatus(j) === 'checked-in'; });
    var assList   = checkedInForShift.filter(function(j){ return getJuniorStatus(j) === 'assigned'; });
    var outList   = checkedInForShift.filter(function(j){ return getJuniorStatus(j) === 'on-shift'; });

    // PENDING — age-outs who have pre-selected this shift but haven't physically checked in for it yet
    // Only shown for FUTURE shifts (not current and not past shifts)
    var shiftOrder = {'8am':0, '12pm':1, '4pm':2};
    var isFutureShift = shiftOrder[sh] > shiftOrder[currentShift];
    var pendList = [];
    if(isFutureShift){
      pendList = juniors.filter(function(j){
        if(!j.ageout) return false;
        if(!j.plannedShifts || !j.plannedShifts.length) return false;
        if(j.plannedShifts.indexOf(sh) < 0) return false;
        // Must have checked in at least once today (checkInShift set) to show as pending
        // This prevents stale plannedShifts from old sessions from appearing
        if(!j.checkInShift) return false;
        // Don't show if currently checked in for this shift
        if(j.checkedIn && j.checkInShift === sh) return false;
        // Don't show if already in checkedInForShift list
        if(checkedInForShift.indexOf(j) >= 0) return false;
        return true;
      });
    }

    var total = ciList.length + assList.length + outList.length + pendList.length;

    html += '<div class="board-shift">' +
      '<div class="board-shift-header">' +
        '<span class="board-shift-label">' + SL[sh] + '</span>' +
        '<span class="board-shift-count">' + (ciList.length + assList.length + outList.length) + ' juniors &bull; ' +
          outList.length + ' out on shift' + (pendList.length > 0 ? ' &bull; ' + pendList.length + ' pending' : '') +
        '</span>' +
      '</div>' +
      '<div class="board-cols' + (isFutureShift ? ' four' : '') + '">' +

      // Pending column — only shown on future shifts that have pre-assigned juniors
      (isFutureShift ?
        '<div class="board-col">' +
          '<div class="board-col-hdr pending">&#9711; Pending (' + pendList.length + ')</div>' +
          (pendList.length === 0 ? '<div class="board-empty">None pre-selected</div>' :
            pendList.slice().sort(function(a,b){ return a.name.localeCompare(b.name); })
              .map(function(j){ return '<div class="board-name pending">' + fmtNameShort(j.name) + '</div>'; }).join('')) +
        '</div>' : '') +

      // Checked In column — order by check-in time, no assignment shown
      '<div class="board-col">' +
        '<div class="board-col-hdr ci">&#9679; Checked In (' + ciList.length + ')</div>' +
        (ciList.length === 0 ? '<div class="board-empty">None waiting</div>' :
          ciList.slice().sort(function(a,b){ return (a.order||0)-(b.order||0); })
            .map(function(j){ return '<div class="board-name">' + fmtNameShort(j.name) + '</div>'; }).join('')) +
      '</div>' +

      // Assigned column — order by check-in time, no assignment shown
      '<div class="board-col">' +
        '<div class="board-col-hdr assigned">&#9632; Assigned (' + assList.length + ')</div>' +
        (assList.length === 0 ? '<div class="board-empty">None</div>' :
          assList.slice().sort(function(a,b){ return (a.order||0)-(b.order||0); })
            .map(function(j){ return '<div class="board-name">' + fmtNameShort(j.name) + '</div>'; }).join('')) +
      '</div>' +

      // Out on Shift — sorted by committee name, shows assignment
      (function(){
        var sorted = outList.slice().sort(function(a,b){ return (a.assignment||'').localeCompare(b.assignment||''); });
        var grouped = {};
        sorted.forEach(function(j){
          // Use shiftAssignments for the current shift as fallback (age-outs pre-assigned)
          var committee = j.assignment || (j.shiftAssignments && j.shiftAssignments[sh]) || 'Unassigned';
          if(!grouped[committee]) grouped[committee]=[];
          grouped[committee].push(j);
        });
        var html = '<div class="board-col"><div class="board-col-hdr out">&#9650; Out on Shift (' + outList.length + ')</div>';
        if(outList.length === 0){
          html += '<div class="board-empty">None sent yet</div>';
        } else {
          Object.keys(grouped).sort().forEach(function(committee){
            html += '<div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--orange);margin-top:6px;margin-bottom:2px">' + committee + '</div>';
            grouped[committee].forEach(function(j){
              html += '<div class="board-name out" style="padding-left:6px">' + fmtNameShort(j.name) + '</div>';
            });
          });
        }
        html += '</div>';
        return html;
      })() +

      '</div>' + // board-cols
    '</div>'; // board-shift
  });

  html += '</div></div>'; // board-body, board-wrap
  el.innerHTML = html;

  // Live clock
  updateBoardClock();
  if(boardTimer) clearInterval(boardTimer);
  boardTimer = setInterval(updateBoardClock, 1000);
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

function _stateHash(){
  // Quick fingerprint of the parts that matter — avoids saving unchanged state
  try {
    var sig = [
      activeSlots.length,
      activeSlots.map(function(s){ return s.id + ':' + s.assigned.length + ':' + (s.sent?1:0); }).join('|'),
      juniors.filter(function(j){ return j.checkedIn || j.assignment; }).map(function(j){
        return j.id + ':' + (j.checkedIn?1:0) + ':' + (j.assignment||'') + ':' + j.order;
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
           j.last !== 'None' || j.hasHat || j.notes || j.ageout ||
           dirtyJuniors.has(j.id);
  });
  dirtyJuniors.clear();

  var payload = {
    state: {
      clockedOut: clockedOut,
      onShiftJuniors: Array.from(onShiftJuniors),
      onShiftSlots: Array.from(onShiftSlots),
      currentDate: currentDate,
      currentShift: currentShift,
      checkInOrder: checkInOrder,
      lockedJuniors: Array.from(lockedJuniors),
      simTimeEnabled: simTimeEnabled,
      simTimeOffset: simTimeOffset,
      simDateSet: simDateSet,
    userRoles: userRoles,
    loginLog: loginLog,
    },
    juniors: activeJuniors,
    activeSlots: activeSlots,
    committeeRequests: committeeRequests,
  };
  try { localStorage.setItem(LS_KEY, JSON.stringify({state: payload.state, juniors: juniors, activeSlots: activeSlots, adults: adults})); } catch(e){}
  if(!DB_AVAILABLE) return;
  fetch('/.netlify/functions/state', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
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
    _lastSavedHash = _stateHash();
    hideSyncError();
    isSaving = false;
  }).catch(function(e){
    console.error('Neon save network error:', e.message);
    isSaving = false;
    showSyncError(e.message);
  });
}

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
    headers: {'Content-Type': 'application/json'},
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
  fetch('/.netlify/functions/state')
    .then(function(r){ return r.json(); })
    .then(function(data){
      _applyState(data);
      // Re-apply sim state from localStorage — always wins over Neon
      _restoreSimFromLocalStorage();
      console.log('State loaded from Neon');
      renderOfficer(); renderRoster(); renderSetup(); updateHeaderDate();
    })
    .catch(function(e){
      console.warn('Neon load failed, using localStorage:', e.message);
      DB_AVAILABLE = false;
      _loadFromLocalStorage();
    });
}

function _restoreSimFromLocalStorage(){
  try {
    var simRaw = localStorage.getItem('jrc_simstate');
    if(!simRaw) return;
    var sim = JSON.parse(simRaw);
    simTimeEnabled = sim.simTimeEnabled || false;
    simTimeOffset  = sim.simTimeOffset  || 0;
    simDateSet     = sim.simDateSet     || false;
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
      };
    });
  }

  // Rebuild adults array from Neon
  if(data.adults && Array.isArray(data.adults) && data.adults.length > 0){
    adults = data.adults.map(function(row){
      return {
        id: row.id, name: row.name||'', title: row.title||'',
        phone: row.phone||'', email: row.email||'', inactive: row.inactive||false
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
    committeeRequests = data.committeeRequests.map(function(r){ return r.data||r; });
  }
  if(state.clockedOut)    clockedOut    = state.clockedOut;
  if(state.onShiftJuniors) onShiftJuniors = new Set(state.onShiftJuniors);
  if(state.onShiftSlots)   onShiftSlots   = new Set(state.onShiftSlots);
  if(state.currentDate)    currentDate    = state.currentDate;
  if(state.currentShift)   currentShift   = state.currentShift;
  if(state.checkInOrder)   checkInOrder   = state.checkInOrder;
  if(state.lockedJuniors)  lockedJuniors  = new Set(state.lockedJuniors);
  if(state.simTimeEnabled !== undefined) simTimeEnabled = state.simTimeEnabled;
  if(state.simTimeOffset  !== undefined) simTimeOffset  = state.simTimeOffset;
  if(state.simDateSet     !== undefined) simDateSet      = state.simDateSet;
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
  pollTimer = setInterval(function(){
    // Only poll when tab is visible — saves ~70% of idle function calls
    if(!document.hidden) pollForUpdates();
  }, 180000);
  if(headerClockTimer) clearInterval(headerClockTimer);
  headerClockTimer = setInterval(function(){ updateHeaderClock(); updateBoardClock(); }, 30000);

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
  if(Date.now() - lastSaveTime < 60000) return; // 60s grace after any save — prevents poll from overwriting recent changes
  fetch('/.netlify/functions/state')
    .then(function(r){ return r.json(); })
    .then(function(data){
      if(!data || data.error) return;
      // Preserve critical local state before applying remote data
      var localSimEnabled = simTimeEnabled;
      var localSimOffset  = simTimeOffset;
      var localSimDateSet = simDateSet;
      var localCurrentDate = currentDate;
      var localCurrentShift = currentShift;
      // Snapshot local junior state (check-ins, assignments, plannedShifts)
      var localJuniorState = {};
      juniors.forEach(function(j){
        if(j.checkedIn || j.assignment || (j.plannedShifts && j.plannedShifts.length)){
          localJuniorState[j.id] = {
            checkedIn: j.checkedIn, assignment: j.assignment,
            plannedShifts: j.plannedShifts, shiftAssignments: j.shiftAssignments,
            checkInShift: j.checkInShift, order: j.order
          };
        }
      });
      _applyState(data);
      // Restore sim time — localStorage always wins
      _restoreSimFromLocalStorage();
      if(!simDateSet && (localSimDateSet || localSimEnabled)){
        simTimeEnabled = localSimEnabled;
        simTimeOffset  = localSimOffset;
        simDateSet     = localSimDateSet;
        if(localCurrentDate)  currentDate  = localCurrentDate;
        if(localCurrentShift) currentShift = localCurrentShift;
      }
      // Always restore date/shift if user explicitly set them
      if(simDateSet){ currentDate = localCurrentDate; currentShift = localCurrentShift; }
      // Restore junior active state — local state wins for checked-in juniors
      juniors.forEach(function(j){
        var local = localJuniorState[j.id];
        if(!local) return;
        if(local.checkedIn) j.checkedIn = local.checkedIn;
        if(local.assignment) j.assignment = local.assignment;
        if(local.plannedShifts && local.plannedShifts.length) j.plannedShifts = local.plannedShifts;
        if(local.shiftAssignments && Object.keys(local.shiftAssignments).length) j.shiftAssignments = local.shiftAssignments;
        if(local.checkInShift) j.checkInShift = local.checkInShift;
        if(local.order) j.order = local.order;
      });
      lastSyncTime = Date.now();
      // Re-render current tab
      var activePanel = document.querySelector('.panel[style*="display: block"], .panel[style*="display:block"]');
      if(activePanel){
        var id = activePanel.id;
        if(id === 'panel-officer') renderOfficer();
        if(id === 'panel-roster') renderRoster();
        if(id === 'panel-board') renderBoard();
        if(id === 'panel-kiosk') renderKiosk();
      }
      updateHeaderDate();
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
    {val:'', lbl:'-- No Access (uses title default if set) --'},
    {val:'admin', lbl:'Administrator (all tabs)'},
    {val:'officer', lbl:'Shift Officer'},
    {val:'scheduling', lbl:'Scheduler (requests + partner)'}
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
  var noShows     = juniors.reduce(function(s, j){ return s + (j.shiftLog ? j.shiftLog.filter(function(e){ return e.noshow; }).length : 0); }, 0);
  var earlyOuts   = juniors.reduce(function(s, j){ return s + (j.shiftLog ? j.shiftLog.filter(function(e){ return !e.noshow && e.hours < 4; }).length : 0); }, 0);

  summaryEl.innerHTML =
    '<div class="stat-card" style="flex:1;min-width:120px"><div class="stat-lbl">Total Shifts</div><div class="stat-val">' + totalShifts + '</div></div>' +
    '<div class="stat-card" style="flex:1;min-width:120px"><div class="stat-lbl">Total Hours</div><div class="stat-val">' + totalHours + '</div></div>' +
    '<div class="stat-card" style="flex:1;min-width:120px"><div class="stat-lbl">No-Shows</div><div class="stat-val" style="color:var(--red)">' + noShows + '</div></div>' +
    '<div class="stat-card" style="flex:1;min-width:120px"><div class="stat-lbl">Early Departures</div><div class="stat-val" style="color:var(--orange)">' + earlyOuts + '</div></div>';

  el.innerHTML = list.map(function(j){
    var hrs = getTotalHours(j);
    var log = j.shiftLog || [];
    var noShowCount = log.filter(function(e){ return e.noshow; }).length;
    var earlyCount  = log.filter(function(e){ return !e.noshow && e.hours < 4; }).length;

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
      '<td style="font-size:12px;color:' + (earlyCount > 0 ? 'var(--orange)' : 'var(--gray-400)') + '">' + (earlyCount || '—') + '</td>' +
    '</tr>' +
    '<tr style="display:none"><td colspan="6" style="padding:0"><table style="width:100%;border-collapse:collapse">' + logRows + '</table></td></tr>';
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
  // One row per shift entry, plus a summary row per junior
  var rows = [['Name','Title','Age-Out','Date','Shift','Committee','Hours','No-Show','Note']];
  juniors.forEach(function(j){
    var log = j.shiftLog || [];
    if(!log.length) return;
    log.forEach(function(e){
      rows.push([
        j.name, j.title||'', j.ageout ? 'Yes' : 'No',
        fmtDate(e.date), SL[e.shift]||e.shift, e.committee||'',
        e.noshow ? 0 : (e.hours||4),
        e.noshow ? 'Yes' : 'No',
        e.note || ''
      ]);
    });
  });
  var csv = rows.map(function(r){ return r.map(function(c){ return '"' + String(c).replace(/"/g,'""') + '"'; }).join(','); }).join('\n');
  var blob = new Blob([csv], {type:'text/csv'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'jrc_hours_' + currentDate + '.csv';
  a.click();
}


// ============================================================
// ROSTER IMPORT — reads HLSR .xlsx, writes to Neon
// ============================================================
var pendingRosterImport = null;

function handleRosterUpload(event){
  var file = event.target.files[0];
  if(!file) return;
  var statusEl = document.getElementById('roster-upload-status');
  statusEl.textContent = 'Reading file...';

  var reader = new FileReader();
  reader.onload = function(e){
    try {
      var wb   = XLSX.read(new Uint8Array(e.target.result), {type:'array'});
      var rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {header:1});
      var hdrs = rows[0];
      var col  = {};
      hdrs.forEach(function(h, i){
        var k = String(h||'').toLowerCase().trim();
        if(k.includes('customer') || k.includes('number')) col.id = i;
        if(k.includes('first') && !k.includes('last'))     col.first = i;
        if(k.includes('last') && !k.includes('assignment'))col.last = i;
        if(k.includes('preferred'))                         col.preferred = i;
        if(k.includes('title'))                             col.title = i;
        if(k.includes('phone'))                             col.phone = i;
        if(k.includes('email'))                             col.email = i;
        if(k.includes('age out') || k === 'ageout')        col.ageout = i;
        if(k.includes('permission'))                        col.permission = i;
      });

      var members = [];
      for(var i = 1; i < rows.length; i++){
        var row = rows[i];
        if(!row || row[col.id] === undefined || row[col.id] === '') continue;
        var id = String(Math.round(parseFloat(row[col.id])));
        if(isNaN(parseInt(id))) continue;

        var first = String(col.preferred !== undefined && row[col.preferred] ? row[col.preferred] : (row[col.first]||'')).trim();
        var last  = String(row[col.last]||'').trim();
        var name  = (first + ' ' + last).trim();
        if(!name) continue;

        // Phone formatting
        var phone = '';
        if(col.phone !== undefined && row[col.phone]){
          var digits = String(Math.round(parseFloat(row[col.phone]))).replace(/\D/g,'');
          if(digits.length === 11 && digits[0] === '1') digits = digits.slice(1);
          if(digits.length === 10) phone = '(' + digits.slice(0,3) + ') ' + digits.slice(3,6) + '-' + digits.slice(6);
        }

        var email = col.email !== undefined ? String(row[col.email]||'').trim() : '';
        if(email.startsWith('=')) email = ''; // skip Excel formulas

        var ageout = false;
        if(col.ageout !== undefined){
          var av = String(row[col.ageout]||'').trim().toUpperCase();
          ageout = (av === 'Y' || av === 'YES' || av === 'TRUE' || av === '1');
        }

        var title = col.title !== undefined ? String(row[col.title]||'Committeeman').trim() : 'Committeeman';
        var perm  = col.permission !== undefined ? String(row[col.permission]||'').toLowerCase() : '';
        var isAdult = perm.includes('administrator') || perm.includes('chairman') ||
                      perm.includes('vice president') || perm.includes('officer');

        members.push({id:id, name:name, title:title, phone:phone, email:email, ageout:ageout, isAdult:isAdult});
      }

      if(!members.length){ statusEl.textContent = 'No members found — check column headers.'; return; }

      pendingRosterImport = members;

      // Build preview counts
      var importIds = {};
      members.forEach(function(m){ importIds[m.id] = true; });
      var newCount = 0, updateCount = 0, adultCount = 0, inactiveCount = 0;
      members.forEach(function(m){
        if(m.isAdult){ adultCount++; return; }
        var ex = juniors.find(function(j){ return j.id === m.id; });
        if(ex) updateCount++; else newCount++;
      });
      juniors.forEach(function(j){
        if(!importIds[j.id] && !j.inactive) inactiveCount++;
      });

      document.getElementById('roster-preview-title').textContent =
        members.length + ' members found — ' + newCount + ' new, ' +
        updateCount + ' updates, ' + adultCount + ' adults' +
        (inactiveCount ? ', ' + inactiveCount + ' will be marked inactive' : '');

      document.getElementById('roster-preview-list').innerHTML =
        members.slice(0, 60).map(function(m){
          var ex = !m.isAdult && juniors.find(function(j){ return j.id === m.id; });
          var tag = m.isAdult ? '<span style="background:#EEE;color:#555;font-size:10px;padding:1px 5px;border-radius:8px;margin-right:4px">Adult</span>' :
                    m.ageout  ? '<span style="font-size:11px;color:#F5A623;margin-right:2px">⭐</span>' : '';
          var action = m.isAdult ? '' : (ex ? '<span style="color:#2A7D2A;font-size:10px">update</span> ' : '<span style="color:#4A6CF7;font-size:10px">new</span> ');
          return '<div style="padding:2px 0;border-bottom:1px solid #F0F0F0">' + action + tag + '<strong>' + m.name + '</strong> &mdash; ' + m.id + (m.phone ? ' &bull; ' + m.phone : '') + '</div>';
        }).join('') + (members.length > 60 ? '<div style="color:#888;padding:4px 0">…and ' + (members.length-60) + ' more</div>' : '');

      document.getElementById('roster-preview').style.display = 'block';
      statusEl.textContent = '';
    } catch(err){
      statusEl.textContent = 'Error reading file: ' + err.message;
      console.error(err);
    }
  };
  reader.readAsArrayBuffer(file);
}

function applyRosterImport(){
  if(!pendingRosterImport) return;
  var statusEl = document.getElementById('roster-upload-status');
  statusEl.textContent = 'Applying import…';

  // Build set of IDs in this import
  var importIds = {};
  pendingRosterImport.forEach(function(m){ importIds[m.id] = true; });

  // Update in-memory arrays
  var added = 0, updated = 0, reactivated = 0, deactivated = 0, adultCount = 0;

  pendingRosterImport.forEach(function(m){
    if(m.isAdult){
      var ex = adults.find(function(a){ return a.id === m.id; });
      if(ex){ ex.name=m.name; ex.phone=m.phone; ex.email=m.email; ex.title=m.title; ex.inactive=false; }
      else   adults.push({id:m.id, name:m.name, title:m.title, phone:m.phone, email:m.email, inactive:false});
      adultCount++;
      return;
    }
    var ex = juniors.find(function(j){ return j.id === m.id; });
    if(ex){
      ex.name=m.name; ex.phone=m.phone; ex.email=m.email; ex.title=m.title; ex.ageout=m.ageout;
      if(ex.inactive){ ex.inactive=false; reactivated++; } else updated++;
    } else {
      juniors.push({
        id:m.id, name:m.name, title:m.title, phone:m.phone, email:m.email,
        ageout:m.ageout, hasHat:false, notes:'', checkedIn:false, assignment:null,
        last:'None', order:0, checkInShift:'', shiftAssignments:{},
        plannedShifts:[], shiftLog:[], history:[], inactive:false
      });
      added++;
    }
  });

  // Mark anyone missing from the import as inactive
  juniors.forEach(function(j){
    if(!importIds[j.id] && !j.inactive){ j.inactive=true; deactivated++; }
  });

  // Save full roster to Neon (separate call — too large for regular save)
  renderRoster();
  cancelRosterImport();
  var statusEl2 = document.getElementById('roster-upload-status');
  statusEl2.textContent = 'Saving to database…';

  saveRosterToNeon(function(err){
    if(err){
      document.getElementById('roster-upload-status').innerHTML = '&#9888; Import applied locally but database save failed. Try again.';
      return;
    }
    // Also save session state so check-ins/assignments sync to other devices
    _doSave();
    var msg = '&#10003; Import complete: ' + added + ' new';
    if(updated)     msg += ', ' + updated + ' updated';
    if(reactivated) msg += ', ' + reactivated + ' reactivated';
    if(adultCount)  msg += ', ' + adultCount + ' adults';
    if(deactivated) msg += ', ' + deactivated + ' marked inactive';
    document.getElementById('roster-upload-status').innerHTML = msg;
  });

  document.getElementById('roster-file-input').value = '';
}

function cancelRosterImport(){
  pendingRosterImport = null;
  document.getElementById('roster-preview').style.display = 'none';
  document.getElementById('roster-preview-title').textContent = '';
  document.getElementById('roster-preview-list').innerHTML = '';
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
  if(t.indexOf('shift officer') >= 0 || t.indexOf('shift ofcr') >= 0) return 'officer';
  if(t.indexOf('schedul') >= 0) return 'scheduling';
  if(t.indexOf('mentor') >= 0) return 'mentor';
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

  fetch('/.netlify/functions/state')
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
    if(saved && ROLE_TABS[saved]){
      window._restoringSession = true;
      loginAs(saved);
      window._restoringSession = false;
      return true;
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
