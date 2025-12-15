// =====================
// API SETUP
// =====================
const API_URL = 'https://script.google.com/macros/s/AKfycbxMZnEpnSUwu0MdJbFhb4WSWqklCW4QMHhZOQFmsruLMBqOY1VMNf33-Zu5-oQgOgmjvw/exec'; // ← Replace with your Apps Script Web App URL

const API = async (action, payload = {}) => {
  payload.action = action;
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' }
    });
    return await res.json();
  } catch (err) {
    console.error('API Error:', err);
    return { success: false, error: 'Network error' };
  }
};

// =====================
// DASHBOARD DATA
// =====================
document.addEventListener('DOMContentLoaded', function(){
  let data={income:[], expense:[]};
  let currentCategories={incomeCategories:[], expenseCategories:[], thresholds:{}};

  const sidebar=document.getElementById('sidebar');
  const navIcon=document.getElementById('navIcon');
  const closeSidebar=document.getElementById('closeSidebar');
  const content=document.querySelector('.content');

  // Sidebar toggle
  navIcon?.addEventListener('click', ()=>{ sidebar.style.width='250px'; content?.classList.add('open'); });
  closeSidebar?.addEventListener('click', ()=>{ sidebar.style.width='0'; content?.classList.remove('open'); });
  window.addEventListener('click', e=>{ if(!sidebar.contains(e.target) && e.target!==navIcon){ sidebar.style.width='0'; content?.classList.remove('open'); } });

  // Navigation
  document.querySelectorAll('.sidebar ul li').forEach(li=>{
    li.addEventListener('click', ()=>{
      document.querySelectorAll('.sidebar ul li').forEach(x=>x.classList.remove('active'));
      li.classList.add('active');
      showPage(li.dataset.page);
      sidebar.style.width='0';
      content?.classList.remove('open');
    });
  });

  function showPage(page){
    document.querySelectorAll('.content > div').forEach(d=>d.classList.add('hidden'));
    document.getElementById(page)?.classList.remove('hidden');
    updateDashboard();
  }

  // Theme toggle
  document.getElementById('themeSelect')?.addEventListener('change', e=>{ document.body.className=e.target.value==='dark'?'dark':''; });

  // =====================
  // MODAL
  // =====================
  const modal=document.getElementById('modal');
  const modalSubmit=document.getElementById('modalSubmit');
  const modalCancel=document.getElementById('modalCancel');

  function openModal(type,index=-1){
    modal.style.display='block';
    document.getElementById('modalType').value=type;
    document.getElementById('editIndex').value=index;
    document.getElementById('modalTitle').innerText=(index===-1?'Add ':'Edit ')+(type==='income'?'Income':'Expense');

    API('getCategories').then(d=>{
      currentCategories=d;
      const modalName=document.getElementById('modalName');
      modalName.innerHTML='';
      const opts=type==='income'?d.incomeCategories:d.expenseCategories;
      opts.forEach(opt=>{ let o=document.createElement('option'); o.value=opt; o.textContent=opt; modalName.appendChild(o); });

      if(index>=0){
        let entry=data[type][index];
        modalName.value=entry.name;
        document.getElementById('modalDate').value=entry.date;
        document.getElementById('modalAmount').value=entry.amount;
        document.getElementById('modalPayment').value=entry.payment;
        document.getElementById('modalAmount').style.backgroundColor=(type==='expense' && d.thresholds[entry.name]!==undefined && entry.amount>d.thresholds[entry.name])?'red':'';
      } else {
        document.getElementById('modalDate').value='';
        document.getElementById('modalAmount').value='';
        document.getElementById('modalPayment').value='Cash';
        document.getElementById('modalAmount').style.backgroundColor='';
      }
    });
  }

  function closeModal(){ modal.style.display='none'; }
  modalCancel?.addEventListener('click', closeModal);
  document.getElementById('addIncomeBtn')?.addEventListener('click', ()=>openModal('income'));
  document.getElementById('addExpenseBtn')?.addEventListener('click', ()=>openModal('expense'));

  document.getElementById('modalAmount')?.addEventListener('input', ()=>{
    const type=document.getElementById('modalType').value;
    const name=document.getElementById('modalName').value;
    const amt=parseFloat(document.getElementById('modalAmount').value)||0;
    document.getElementById('modalAmount').style.backgroundColor=(type==='expense' && currentCategories.thresholds[name]!==undefined && amt>currentCategories.thresholds[name])?'red':'';
  });

  // =====================
  // DATA LOADING
  // =====================
  async function loadData(){
    data = await API('getData') || {income:[], expense:[]};
    renderTables();
    updateDashboard();
  }

  // Submit entry
  modalSubmit?.addEventListener('click', async ()=>{
    let type=document.getElementById('modalType').value;
    let index=parseInt(document.getElementById('editIndex').value);
    let entry={
      date:document.getElementById('modalDate').value,
      name:document.getElementById('modalName').value,
      amount:parseFloat(document.getElementById('modalAmount').value),
      payment:document.getElementById('modalPayment').value
    };
    if(index>=0) data[type][index]=entry; else data[type].push(entry);
    renderTables(); updateDashboard(); closeModal();
    await API('submitEntry',{type,index,entry});
  });

  // Delete entry
  window.deleteEntry = async function(type,index){
    if(confirm('Are you sure?')){
      data[type].splice(index,1);
      renderTables();
      updateDashboard();
      await API('deleteEntry',{type,index});
    }
  };

  // Render tables
  function renderTables(){
    const render=(type,tableId)=>{
      const tBody=document.querySelector(`#${tableId} tbody`);
      tBody.innerHTML='';
      data[type].forEach((row,i)=>{
        let tr=document.createElement('tr');
        tr.innerHTML=`<td>${row.date}</td><td>${row.name}</td><td>${row.amount}</td><td>${row.payment}</td>
          <td>
            <button class="btn btn-edit" data-type="${type}" data-index="${i}">Edit</button>
            <button class="btn btn-delete" data-type="${type}" data-index="${i}">Delete</button>
          </td>`;
        tBody.appendChild(tr);
      });
    };
    render('income','incomeTable');
    render('expense','expenseTable');

    document.querySelectorAll('.btn-edit').forEach(btn=>btn.addEventListener('click', ()=>openModal(btn.dataset.type,parseInt(btn.dataset.index))));
    document.querySelectorAll('.btn-delete').forEach(btn=>btn.addEventListener('click', ()=>deleteEntry(btn.dataset.type,parseInt(btn.dataset.index))));
  }

  // =====================
  // CATEGORY HANDLERS
  // =====================
  document.getElementById('addIncomeCategoryBtn')?.addEventListener('click', async ()=>{
    const val=document.getElementById('newIncomeCategory').value.trim();
    if(!val) return alert('Enter a category name');
    await API('addIncomeCategory',{name:val});
    document.getElementById('newIncomeCategory').value='';
    alert('Income category added!');
  });

  document.getElementById('addExpenseCategoryBtn')?.addEventListener('click', async ()=>{
    const val=document.getElementById('newExpenseCategory').value.trim();
    const threshold=parseFloat(document.getElementById('newExpenseThreshold').value)||0;
    if(!val) return alert('Enter a category name');
    await API('addExpenseCategory',{name:val,threshold});
    document.getElementById('newExpenseCategory').value='';
    document.getElementById('newExpenseThreshold').value='';
    alert('Expense category added!');
  });

  // =====================
  // SEARCH
  // =====================
  document.getElementById('searchIncome')?.addEventListener('input', ()=>searchTable('income'));
  document.getElementById('searchExpense')?.addEventListener('input', ()=>searchTable('expense'));
  function searchTable(type){
    const input=document.getElementById(type==='income'?'searchIncome':'searchExpense').value.toLowerCase();
    const table=document.getElementById(type==='income'?'incomeTable':'expenseTable');
    Array.from(table.tBodies[0].rows).forEach(row=>{
      row.style.display=Array.from(row.cells).some(cell=>cell.innerText.toLowerCase().includes(input))?'':'none';
    });
  }

  document.getElementById('filterDate')?.addEventListener('change', updateDashboard);

  loadData();
});
