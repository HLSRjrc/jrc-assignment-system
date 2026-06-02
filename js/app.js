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
var APP_VERSION = 19;  // Major version — milestone releases
var APP_BUILD   = 50;  // Minor build — increments every small change
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
  "2026-07-09":[{name:"Agriculture Education",shift:"8am",cap:2,hat:false},{name:"Armed Forces Appreciation",shift:"8am",cap:4,hat:true},{name:"Breeders Greeters",shift:"8am",cap:2,hat:false},{name:"Commercial Exhibits",shift:"8am",cap:4,hat:false},{name:"Directions & Assistance",shift:"8am",cap:2,hat:false},{name:"Agriculture Education",shift:"12pm",cap:4,hat:false},{name:"Breeders Greeters",shift:"12pm",cap:2,hat:false},{name:"Directions & Assistance",shift:"12pm",cap:2,hat:false},{name:"Gatekeepers",shift:"12pm",cap:4,hat:true},{name:"Go Tejano",shift:"12pm",cap:2,hat:true},{name:"Directions & Assistance",shift:"4pm",cap:4,hat:false},{name:"Gatekeepers",shift:"4pm",cap:4,hat:true},{name:"Grand Entry",shift:"4pm",cap:2,hat:true},{name:"Grounds Tickets",shift:"4pm",cap:2,hat:false},{name:"Horticulture",shift:"4pm",cap:2,hat:false}]
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
  // TV mode — add ?tv=1 to URL to activate full-screen board layout
  if(window.location.search.indexOf('tv=1') >= 0){
    document.documentElement.classList.add('tv-mode');
    // Auto-login to status board role so the TV goes straight to the board
    setTimeout(function(){ loginAs('board'); }, 150);
    return;
  }

  var hlsrB64 = null; // loaded from /assets/hlsr-header.webp
  var loginHlsrB64 = null; // loaded from /assets/hlsr-logo-login.png
  var h = document.getElementById('hlsr-logo');
  if(h) h.src = '/assets/hlsr-header.webp';
  var ll = document.getElementById('login-logo');
  if(ll) ll.src = '/assets/hlsr-logo-login.png';
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
    document.getElementById('kco-name').innerHTML = (jr.hasHat ? '<img src="assets/hat.png" style="height:18px;vertical-align:middle;margin-right:3px"> ' : '') + jr.name;
    document.getElementById('kco-assignment').textContent = jr.assignment ? 'Currently assigned to: ' + jr.assignment : 'Not yet assigned to a committee';
    var nextEl = document.getElementById('kco-next-shift');
    if(nextEl) nextEl.textContent = '';
    document.getElementById('k-entry').style.display = 'none';
    document.getElementById('k-clockout').style.display = 'block';
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
        '<span class="rpt-name">' + (jr ? (jr.hasHat ? '<img src="assets/hat.png" style="height:18px;vertical-align:middle;margin-right:3px"> ' : '') + jr.name + (jr.ageout?' &#9733;':'') : '') + '</span>' +
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
      var isOut = clockedOut[jid] || clockedOut[jr.id];
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
            (s.hat ? '<span class="badge b-hat"><img src="assets/hat.png" style="height:18px;vertical-align:middle;margin-right:3px"> Hat Required</span>' : '') +
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
      ['roster',   'Roster',                    1],
      ['board',    'Status Board',              1],
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
      '<td style="font-weight:600;color:var(--navy);cursor:pointer" title="View activity log" onclick="openNoteLog(' + ri + ')">' + (j.hasHat ? '<img src="assets/hat.png" style="height:18px;vertical-align:middle;margin-right:3px"> ' : '') + j.name + ' <span style="font-size:10px;color:var(--orange)"><img src="assets/edit.png" style="width:13px;height:13px;vertical-align:middle"></span>' + '</td>' +
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
          (s.hat ? '<span class="hat-icon"><img src="assets/hat.png" style="height:18px;vertical-align:middle;margin-right:3px"></span>' : '') +
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
var API_TOKEN  = '__API_SECRET__'; // replaced at build time by netlify
var ROLE_LABELS = { admin:'Administrator', officer:'Shift Officer', scheduling:'Scheduling', mentor:'Mentor', kiosk:'Kiosk Mode', board:'Status Board' };

// Tabs each role can see
var ROLE_TABS = {
  admin:       ['officer','kiosk','roster','setup','requests','reqform','simulate','board','hours'],
  officer:     ['officer','setup','kiosk','roster','board'],
  scheduling:  ['reqform','requests','setup'],
  mentor:      ['kiosk','board'],
  kiosk:       ['kiosk'],
  board:       ['board']
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
    // Mentor goes straight to kiosk
    loggedInAdult = adult;
    try { localStorage.setItem('jrc_logged_adult', JSON.stringify({id:adult.id, name:adult.name, role:role})); } catch(e){}
    document.getElementById('personal-login').style.display = 'none';
    loginAs('mentor');
    return;
  } else {
    // Everyone else goes straight to their dashboard
    loginAs(role);
  }
}



function selectRole(role){
  loginAs(role);
}



function loginAs(role){
  currentRole = role;

  // Persist login so refresh doesn't log out
  try {
    var sessionExpiry = Date.now() + (8 * 60 * 60 * 1000);
    localStorage.setItem('jrc_saved_role', role);
    localStorage.setItem('jrc_session_expiry', String(sessionExpiry));
  } catch(e){{}}

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

  // Reset login form to personal login
  document.getElementById('personal-login').style.display = 'block';
  document.getElementById('role-select').style.display = 'none';
  var e = document.getElementById('pl-email'); if(e) e.value = '';
  var p = document.getElementById('pl-password'); if(p) p.value = '';
  var err = document.getElementById('pl-err'); if(err) err.textContent = '';
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
  jr.plannedShifts = [];
  jr.checkInShift = '';
  clockedOut[jid] = true;
  dirtyJuniors.add(jr.id);
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
      if(clockedOut[j.id]) return false;
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
    var h = '<div class="board-waiting-col">';
    // Pending age-outs at top
    var pending = ciAll.filter(function(r){ return r.pending; });
    var normal  = ciAll.filter(function(r){ return !r.pending; });
    if(pending.length > 0){
      h += '<div class="board-col-hdr pending">&#9711; Pending (' + pending.length + ')</div>';
      pending.slice().sort(function(a,b){ return a.j.name.localeCompare(b.j.name); })
        .forEach(function(r){
          h += '<div class="board-name pending">' +
            (showTagCI ? shiftPill(r.sh) : '') +
            fmtNameShort(r.j.name) + '</div>';
        });
      h += '<div class="board-col-gap"></div>';
    }
    h += '<div class="board-col-hdr ci">&#9679; Checked In (' + normal.length + ')</div>';
    if(normal.length === 0){
      h += '<div class="board-empty">None waiting</div>';
    } else {
      normal.slice().sort(function(a,b){ return (a.j.order||0)-(b.j.order||0); })
        .forEach(function(r){
          h += '<div class="board-name">' +
            (showTagCI ? shiftPill(r.sh) : '') +
            fmtNameShort(r.j.name) + '</div>';
        });
    }
    h += '</div>';
    return h;
  }

  // Build Assigned column HTML
  function buildAssigned(){
    var h = '<div class="board-waiting-col">';
    h += '<div class="board-col-hdr assigned">&#9632; Assigned (' + assAll.length + ')</div>';
    if(assAll.length === 0){
      h += '<div class="board-empty">None yet</div>';
    } else {
      assAll.slice().sort(function(a,b){ return (a.j.order||0)-(b.j.order||0); })
        .forEach(function(r){
          h += '<div class="board-name">' +
            (showTagAss ? shiftPill(r.sh) : '') +
            fmtNameShort(r.j.name) + '</div>';
        });
    }
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
    var subCols = totalGroups >= 15 ? 'cols3' : totalGroups >= 6 ? 'cols2' : 'cols1';

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
          h += '<div class="board-committee-label' + (isLate ? ' late' : '') + '">' + committee + '</div>';
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

  var html = '<div class="board-wrap">' +
    '<div class="board-header">' +
      '<div>' +
        '<div class="board-title">JRC Live Status Board</div>' +
        '<div class="board-clock" id="board-date-lbl">' + fmtDateLong(date) + '</div>' +
      '</div>' +
      '<div style="text-align:right">' +
        '<div id="board-clock" style="font-size:22px;font-weight:700;color:#fff;font-variant-numeric:tabular-nums"></div>' +
        '<div style="font-size:11px;color:#99BBDD;margin-top:2px">' + totalActive + ' juniors active</div>' +
      '</div>' +
    '</div>' +
    '<div class="board-body">' +
      buildCI() +
      buildAssigned() +
      buildOut() +
    '</div>' +
  '</div>';

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
      juniors.filter(function(j){ return j.checkedIn || j.assignment || (j.noteLog && j.noteLog.length); }).map(function(j){
        return j.id + ':' + (j.checkedIn?1:0) + ':' + (j.assignment||'') + ':' + j.order + ':' + (j.noteLog ? j.noteLog.length : 0);
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
        noteLog:         row.note_log        || [],
      };
    });
  }

  // Rebuild adults array from Neon
  if(data.adults && Array.isArray(data.adults) && data.adults.length > 0){
    adults = data.adults.map(function(row){
      return {
        id: row.id, name: row.name||'', title: row.title||'', noteLog: row.note_log||[],
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
  fetch('/.netlify/functions/state',{headers:{'x-api-token':API_TOKEN}})
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
        plannedShifts:[], shiftLog:[], history:[], noteLog:[], inactive:false
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

  var typeColors = { note:'var(--navy)', 'check-in':'#27AE60', dismissed:'#EF7622', system:'#8899AA' };
  var typeLabels = { note:'Note', 'check-in':'Check-In', dismissed:'Dismissed to Pool', system:'System' };

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
      '<div style="font-size:12px;color:#8899AA;margin-bottom:6px">Add a note — visible to all officers</div>' +
      '<textarea id="note-log-input" class="finput" rows="3" placeholder="Type a note..." style="width:100%;resize:vertical;margin-bottom:8px"></textarea>' +
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
  var input = document.getElementById('note-log-input');
  var text = (input ? input.value.trim() : '');
  if(!text){ input.focus(); return; }
  addJuniorNote(jIdx, text, 'note');
  closeNoteLog();
  // Re-open to show the new entry
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
