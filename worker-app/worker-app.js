// Worker app (localStorage-backed) — reads same keys as admin-panel
const uid = ()=> Math.random().toString(36).slice(2,9);
const todayISO = ()=> new Date().toISOString().slice(0,10);

function get(key, fallback){ try{return JSON.parse(localStorage.getItem(key))||fallback}catch(e){return fallback} }
function set(key,val){ localStorage.setItem(key, JSON.stringify(val)) }

// UI refs
const loginSection = document.getElementById('login-section');
const loginForm = document.getElementById('login-form');
const dashboard = document.getElementById('dashboard');
const empNameEl = document.getElementById('emp-name');
const jobs = document.querySelectorAll('.job');
const jobArea = document.getElementById('job-area');
const jobTitle = document.getElementById('job-title');
const primarySelect = document.getElementById('primary-select');
const sizeSelect = document.getElementById('size-select');
const jobForm = document.getElementById('job-form');
const countInput = document.getElementById('count');
const logoutBtn = document.getElementById('logout');
const userArea = document.getElementById('user-area');

function showLogin(){ loginSection.classList.remove('hidden'); dashboard.classList.add('hidden'); userArea.textContent = '' }
function showDashboard(user){ loginSection.classList.add('hidden'); dashboard.classList.remove('hidden'); empNameEl.textContent = user.name; userArea.textContent = \\`${user.name} (${user.department})\\` }

// Auto-login: if ft_currentUser exists and role is 'employee', go straight to dashboard
const current = get('ft_currentUser', null);
if (current && current.role === 'employee'){
  showDashboard(current);
} else {
  showLogin();
}

// Login handler (employee)
loginForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const fd = new FormData(loginForm);
  const username = (fd.get('username')||'').trim();
  const password = (fd.get('password')||'').trim();
  const emp = (get('ft_employees', [])).find(x=>x.username === username && x.password === password);
  if (!emp){ return alert('Invalid credentials. Have admin create employee. (admin/admin is admin)'); }
  set('ft_currentUser', { role:'employee', id: emp.id, username: emp.username, name: emp.name, department: emp.department });
  showDashboard(emp);
});

// Logout
logoutBtn.addEventListener('click', ()=>{
  localStorage.removeItem('ft_currentUser');
  showLogin();
});

// Job selection & dependent dropdowns
let currentJobType = null;
jobs.forEach(b=> b.addEventListener('click', ()=>{
  currentJobType = b.getAttribute('data-type');
  jobTitle.textContent = `Log — ${currentJobType}`;
  jobArea.classList.remove('hidden');
  populatePrimary(currentJobType);
}));

function populatePrimary(type){
  primarySelect.innerHTML = '';
  sizeSelect.innerHTML = '';
  const products = get('ft_products', []);
  if (type === 'Sleeve'){
    const sleeves = products.filter(p=>p.type === 'Sleeve');
    if (!sleeves.length){ primarySelect.innerHTML = '<option value="">No sleeves</option>'; return; }
    sleeves.forEach(s => primarySelect.appendChild(optionFor(s.id, s.code)));
    populateSizes(primarySelect.value);
  } else {
    const list = products.filter(p=>p.type === type);
    if (!list.length){ primarySelect.innerHTML = '<option value="">No items</option>'; return; }
    list.forEach(s => primarySelect.appendChild(optionFor(s.id, s.partName)));
    populateSizes(primarySelect.value);
  }
  primarySelect.onchange = ()=> populateSizes(primarySelect.value);
}

function optionFor(val, txt){ const o = document.createElement('option'); o.value = val; o.textContent = txt; return o; }

function populateSizes(prodId){
  sizeSelect.innerHTML = '';
  const p = (get('ft_products', [])).find(x=>x.id === prodId);
  if (!p || !p.sizes || !p.sizes.length){ sizeSelect.innerHTML = '<option value="">No sizes</option>'; return; }
  p.sizes.forEach(s=> sizeSelect.appendChild(optionFor(s, s)));
}

// Submit job
jobForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const user = get('ft_currentUser', null);
  if (!user || user.role !== 'employee') return alert('Not logged in as employee');
  const productId = primarySelect.value;
  const size = sizeSelect.value;
  const count = Number(countInput.value) || 0;
  if (!productId || !size || count <= 0) return alert('Fill all fields');
  const p = (get('ft_products', [])).find(x=>x.id === productId) || {};
  const log = {
    id: uid(),
    employeeId: user.id,
    employeeName: user.name,
    date: todayISO(),
    type: currentJobType,
    productId,
    code: p.type === 'Sleeve' ? p.code : undefined,
    partName: p.type !== 'Sleeve' ? p.partName : undefined,
    size, count
  };
  const logs = get('ft_logs', []);
  logs.push(log);
  set('ft_logs', logs);
  alert('Log submitted.');
  jobForm.reset();
  jobArea.classList.add('hidden');
});

// Clear button on login
document.getElementById('clear').addEventListener('click', ()=> loginForm.reset());
