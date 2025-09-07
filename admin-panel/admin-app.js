// Admin panel app (localStorage-backed)
// Keys: ft_employees, ft_products, ft_logs, ft_currentUser

const uid = ()=> Math.random().toString(36).slice(2,9);
const today = ()=> new Date().toISOString().slice(0,10);

function get(key, fallback){ try{return JSON.parse(localStorage.getItem(key))||fallback}catch(e){return fallback} }
function set(key,val){ localStorage.setItem(key, JSON.stringify(val)) }

// bootstrap if missing
if (!localStorage.getItem('ft_admin_init')) {
  set('ft_products', [
    { id: uid(), type:'Sleeve', code: 'SL-100', sizes: ['S','M','L'] },
    { id: uid(), type:'Rod', partName: 'RD-A', sizes: ['10mm','12mm'] },
    { id: uid(), type:'Pin', partName: 'PN-1', sizes: ['3mm','4mm'] }
  ]);
  set('ft_employees', []);
  set('ft_logs', []);
  localStorage.setItem('ft_admin_init','1');
}

// UI refs
const views = document.querySelectorAll('.view');
const sidebarBtns = document.querySelectorAll('.sidebar button[data-view]');
const logoutBtn = document.getElementById('logout');
const loginView = document.getElementById('login-view');
const loginForm = document.getElementById('login-form');

function showView(id){ views.forEach(v=> v.id===id ? v.classList.remove('hidden') : v.classList.add('hidden')) }

sidebarBtns.forEach(b=> b.addEventListener('click', ()=>{
  const view = b.getAttribute('data-view');
  showView(view);
  if (view === 'manage-employees') renderEmployees();
  if (view === 'add-product') renderProducts();
  if (view === 'view-logs') renderLogs();
}));

// Login (admin only)
loginForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const fd = new FormData(loginForm);
  const u = fd.get('username').trim(), p = fd.get('password').trim();
  if (u === 'admin' && p === 'admin'){
    set('ft_currentUser', { role:'admin', username:'admin' });
    // default to add-employee view
    showView('add-employee');
    document.querySelector('.sidebar').classList.remove('hidden');
    return;
  }
  alert('Invalid admin credentials. Use admin/admin.');
});

// Logout
logoutBtn.addEventListener('click', ()=>{
  localStorage.removeItem('ft_currentUser');
  document.querySelector('.sidebar').classList.add('hidden');
  showView('login-view');
});

// if already logged in as admin, show admin UI
if (get('ft_currentUser', null) && get('ft_currentUser').role === 'admin'){
  document.querySelector('.sidebar').classList.remove('hidden');
  showView('add-employee');
} else {
  document.querySelector('.sidebar').classList.add('hidden');
  showView('login-view');
}

// ---- Employees ----nconst addEmpForm = document.getElementById('add-employee-form');
addEmpForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const fd = new FormData(addEmpForm);
  const emp = {
    id: uid(),
    name: fd.get('name').trim(),
    contact: fd.get('contact').trim(),
    address: fd.get('address').trim(),
    username: fd.get('username').trim(),
    password: fd.get('password'),
    department: fd.get('department')
  };
  const emps = get('ft_employees', []);
  if (emps.some(x=>x.username === emp.username)){ return alert('Username exists') }
  emps.push(emp); set('ft_employees', emps);
  alert('Employee added');
  addEmpForm.reset();
});

function renderEmployees(){
  const tbody = document.querySelector('#employees-table tbody');
  tbody.innerHTML = '';
  const emps = get('ft_employees', []);
  emps.forEach(e=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${e.name}</td><td>${e.username}</td><td>${e.department}</td><td>${e.contact}</td>
      <td><button data-id="${e.id}" class="del">Delete</button> <button data-id="${e.id}" class="imp">Impersonate</button></td>`;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll('.del').forEach(b=> b.onclick = ()=>{
    if (!confirm('Delete employee?')) return;
    const id = b.getAttribute('data-id');
    set('ft_employees', get('ft_employees', []).filter(x=>x.id !== id));
    renderEmployees();
  });
  tbody.querySelectorAll('.imp').forEach(b=> b.onclick = ()=>{
    const id = b.getAttribute('data-id');
    const emp = get('ft_employees', []).find(x=>x.id===id);
    if (!emp) return;
    // set current user as employee so admin can quickly open worker-app in same browser if needed
    set('ft_currentUser', { role:'employee', id: emp.id, name: emp.name, username: emp.username, department: emp.department });
    alert('Impersonation set in localStorage (ft_currentUser). Open worker-app to test worker flow.');
  });
}

// ---- Products ----
const productType = document.getElementById('product-type');
const sleeveFields = document.getElementById('sleeve-fields');
const rodpinFields = document.getElementById('rodpin-fields');
productType.addEventListener('change', ()=> {
  if (productType.value === 'Sleeve'){ sleeveFields.classList.remove('hidden'); rodpinFields.classList.add('hidden'); }
  else { sleeveFields.classList.add('hidden'); rodpinFields.classList.remove('hidden'); }
});

const productForm = document.getElementById('product-form');
let editing = null;
productForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const fd = new FormData(productForm);
  const type = fd.get('type');
  const products = get('ft_products', []);
  if (type === 'Sleeve'){
    const code = (fd.get('code')||'').trim();
    const sizes = (fd.get('sizes_sleeve')||'').split(',').map(s=>s.trim()).filter(Boolean);
    if (!code) return alert('Enter code');
    if (editing){
      const p = products.find(x=>x.id===editing);
      p.code = code; p.sizes = sizes; editing = null;
    } else {
      products.push({ id: uid(), type:'Sleeve', code, sizes });
    }
  } else {
    const partName = (fd.get('partName')||'').trim();
    const sizes = (fd.get('sizes_rodpin')||'').split(',').map(s=>s.trim()).filter(Boolean);
    if (!partName) return alert('Enter part name');
    if (editing){
      const p = products.find(x=>x.id===editing);
      p.partName = partName; p.sizes = sizes; editing = null;
    } else {
      products.push({ id: uid(), type, partName, sizes });
    }
  }
  set('ft_products', products);
  productForm.reset();
  productType.dispatchEvent(new Event('change'));
  renderProducts();
});

document.getElementById('clear-prod').addEventListener('click', ()=> {
  editing = null;
  productForm.reset();
  productType.dispatchEvent(new Event('change'));
});

function renderProducts(){
  const products = get('ft_products', []);
  const tS = document.querySelector('#table-sleeve tbody');
  const tR = document.querySelector('#table-rod tbody');
  const tP = document.querySelector('#table-pin tbody');
  [tS,tR,tP].forEach(t=>t.innerHTML='');
  products.filter(p=>p.type==='Sleeve').forEach(s=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${s.code}</td><td>${s.sizes.join(', ')}</td><td><button data-id="${s.id}" class="edit">Edit</button> <button data-id="${s.id}" class="del">Delete</button></td>`;
    tS.appendChild(tr);
  });
  products.filter(p=>p.type==='Rod').forEach(s=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${s.partName}</td><td>${s.sizes.join(', ')}</td><td><button data-id="${s.id}" class="edit">Edit</button> <button data-id="${s.id}" class="del">Delete</button></td>`;
    tR.appendChild(tr);
  });
  products.filter(p=>p.type==='Pin').forEach(s=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${s.partName}</td><td>${s.sizes.join(', ')}</td><td><button data-id="${s.id}" class="edit">Edit</button> <button data-id="${s.id}" class="del">Delete</button></td>`;
    tP.appendChild(tr);
  });

  document.querySelectorAll('#product-lists .del').forEach(b=> b.onclick = ()=>{
    if (!confirm('Delete product?')) return;
    const id = b.getAttribute('data-id');
    set('ft_products', get('ft_products', []).filter(x=>x.id!==id));
    renderProducts();
  });
  document.querySelectorAll('#product-lists .edit').forEach(b=> b.onclick = ()=>{
    const id = b.getAttribute('data-id');
    const p = get('ft_products', []).find(x=>x.id===id);
    if (!p) return;
    editing = id;
    productType.value = p.type;
    productType.dispatchEvent(new Event('change'));
    if (p.type === 'Sleeve'){ productForm.code.value = p.code || ''; productForm.sizes_sleeve.value = (p.sizes||[]).join(','); }
    else { productForm.partName.value = p.partName || ''; productForm.sizes_rodpin.value = (p.sizes||[]).join(','); }
    window.scrollTo({top:0,behavior:'smooth'});
  });
}

// ---- Logs ----
function renderLogs(){
  const logs = get('ft_logs', []);
  const container = document.getElementById('logs-container');
  container.innerHTML = '';
  if (!logs.length){ container.textContent = 'No logs yet'; return; }
  const grouped = logs.reduce((acc,l)=>{ (acc[l.date] = acc[l.date]||[]).push(l); return acc; }, {});
  Object.keys(grouped).sort((a,b)=> b.localeCompare(a)).forEach(date=>{
    const box = document.createElement('div');
    box.innerHTML = `<h4>${date}</h4>`;
    const tbl = document.createElement('table');
    tbl.innerHTML = `<thead><tr><th>Employee</th><th>Type</th><th>Item</th><th>Size</th><th>Count</th></tr></thead>`;
    const tb = document.createElement('tbody');
    grouped[date].forEach(l=>{
      const item = l.type === 'Sleeve' ? (l.code||'') : (l.partName||'');
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${l.employeeName}</td><td>${l.type}</td><td>${item}</td><td>${l.size}</td><td>${l.count}</td>`;
      tb.appendChild(tr);
    });
    tbl.appendChild(tb);
    box.appendChild(tbl);
    container.appendChild(box);
  });
}

// initialize
productType.dispatchEvent(new Event('change'));
renderProducts();
renderEmployees();
