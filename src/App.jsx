import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Login from "./pages/Login";
import logo from "./assets/dabba-wala-logo.png";
import "./App.css";


function AdminPanel() {
  const today = new Date().toISOString().slice(0, 10);
  const [loggedIn, setLoggedIn] = useState(() => localStorage.getItem("dw_admin_auth") === "1");
  const [password, setPassword] = useState("");
  const [whatsappEnabled, setWhatsappEnabled] = useState(() => localStorage.getItem("dw_whatsapp_enabled") === "1");
  const [customers, setCustomers] = useState(() => {
    try { return JSON.parse(localStorage.getItem("dw_customers") || "[]"); } catch { return []; }
  });
  const [form, setForm] = useState({
    name:"", mobile:"", address:"", area:"", plan:"Monthly Subscription",
    ratePerTiffin:"50", totalTiffins:"56", totalAmount:"2800", paidAmount:"0",
    startDate:today, notes:""
  });
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedDate, setSelectedDate] = useState(today);
  const [editPayment, setEditPayment] = useState(null);

  const saveCustomers = (next) => {
    setCustomers(next);
    localStorage.setItem("dw_customers", JSON.stringify(next));
  };

  const used = (c) => Object.values(c.dailyRecords || {}).reduce(
    (n,d) => n + (d?.morning === "Delivered" ? 1 : 0) + (d?.evening === "Delivered" ? 1 : 0), 0
  );
  const remaining = (c) => Math.max(0, Number(c.totalTiffins || 0) - used(c));
  const pending = (c) => Math.max(0, Number(c.totalAmount || 0) - Number(c.paidAmount || 0));
  const paymentStatus = (c) => {
    const total = Number(c.totalAmount || 0), paid = Number(c.paidAmount || 0);
    if (paid >= total && total > 0) return "Paid";
    if (paid > 0) return "Half Payment";
    return "Pending";
  };

  const login = (e) => {
    e.preventDefault();
    if (password === "7223") {
      localStorage.setItem("dw_admin_auth", "1");
      setLoggedIn(true); setPassword("");
    } else alert("Wrong admin PIN");
  };

  const recalcAmount = (field, value) => {
    const next = { ...form, [field]: value };
    if (field === "ratePerTiffin" || field === "totalTiffins") {
      const rate = Number(field === "ratePerTiffin" ? value : form.ratePerTiffin) || 0;
      const qty = Number(field === "totalTiffins" ? value : form.totalTiffins) || 0;
      next.totalAmount = String(rate * qty);
    }
    setForm(next);
  };

  const addCustomer = (e) => {
    e.preventDefault();
    const mobile = form.mobile.replace(/\D/g, "");
    const rate = Number(form.ratePerTiffin), qty = Number(form.totalTiffins);
    const total = Number(form.totalAmount), paid = Math.min(Math.max(Number(form.paidAmount || 0),0), total);
    if (!form.name.trim() || mobile.length !== 10 || !form.address.trim() || !rate || !qty || !total) {
      alert("Name, 10-digit mobile, address, rate and total tiffins are required."); return;
    }
    const start = new Date(form.startDate + "T00:00:00");
    const end = new Date(start);
    if (form.plan === "Monthly Subscription") end.setDate(end.getDate() + 30);

    const customer = {
      id: Date.now(), name:form.name.trim(), mobile, address:form.address.trim(), area:form.area.trim(),
      plan:form.plan, ratePerTiffin:rate, totalTiffins:qty, totalAmount:total, paidAmount:paid,
      paymentStatus:paymentStatus({totalAmount:total,paidAmount:paid}),
      startDate:form.startDate, endDate:end.toISOString().slice(0,10),
      notes:form.notes.trim(), status:"Active", dailyRecords:{}
    };
    saveCustomers([customer, ...customers]);

    const message = [
      "🍱 *Dabba Wala – Subscription Started*","",`Hello ${customer.name} 👋`,
      `*Plan:* ${customer.plan}`,`*Rate:* ₹${rate} per tiffin`,`*Total Tiffins:* ${qty}`,
      `*Total Amount:* ₹${total}`,`*Paid:* ₹${paid}`,`*Pending:* ₹${total-paid}`,
      `*Payment Status:* ${paymentStatus(customer)}`,`*Start Date:* ${customer.startDate}`,
      `*Valid Till:* ${customer.endDate}`,`*Delivery Address:* ${customer.address}`,
      customer.area ? `*Area:* ${customer.area}` : "",
      "*Meal:* Dal, Chawal, 4 Roti, Sabji, Aachar / Papad / Salad",
      "*Schedule:* Monday to Saturday – 2 Meals, Sunday – 1 Meal","",
      "Thank you for choosing *Dabba Wala* ❤️"
    ].filter(Boolean).join("\n");
    if (whatsappEnabled) {
      window.open(`https://wa.me/91${mobile}?text=${encodeURIComponent(message)}`, "_blank");
    }

    setForm({name:"",mobile:"",address:"",area:"",plan:"Monthly Subscription",ratePerTiffin:"50",
      totalTiffins:"56",totalAmount:"2800",paidAmount:"0",startDate:today,notes:""});
  };

  const removeCustomer = (id) => {
    if (window.confirm("Delete this customer?")) {
      saveCustomers(customers.filter(c => c.id !== id));
      if (selectedCustomer?.id === id) setSelectedCustomer(null);
    }
  };

  const updatePayment = (c, value) => {
    const paidAmount = Math.min(Math.max(Number(value) || 0, 0), Number(c.totalAmount || 0));
    const next = customers.map(x => x.id === c.id
      ? {...x, paidAmount, paymentStatus:paymentStatus({...x,paidAmount})} : x);
    saveCustomers(next);
    setSelectedCustomer(next.find(x => x.id === c.id) || null);
    setEditPayment(null);
  };

  const setMeal = (c, date, meal, status) => {
    const day = c.dailyRecords?.[date] || {morning:"Not Updated",evening:"Not Updated"};
    const next = customers.map(x => x.id === c.id ? {
      ...x, dailyRecords:{...(x.dailyRecords||{}),[date]:{...day,[meal]:status}}
    } : x);
    saveCustomers(next);
    setSelectedCustomer(next.find(x => x.id === c.id) || null);
  };

  const fullDayOff = (c,date) => {
    const next = customers.map(x => x.id === c.id ? {
      ...x,dailyRecords:{...(x.dailyRecords||{}),[date]:{morning:"OFF",evening:"OFF"}}
    } : x);
    saveCustomers(next);
    setSelectedCustomer(next.find(x => x.id === c.id) || null);
  };

  const sendMessage = (c) => {
    const day = c.dailyRecords?.[today] || {};
    const message = [
      "🍱 *Dabba Wala – Subscription Update*","",`Hello ${c.name} 👋`,
      `*Total Tiffins:* ${c.totalTiffins}`,`*Used:* ${used(c)}`,`*Remaining:* ${remaining(c)}`,
      `*Rate:* ₹${c.ratePerTiffin}/tiffin`,`*Total Amount:* ₹${c.totalAmount}`,
      `*Paid:* ₹${c.paidAmount}`,`*Pending:* ₹${pending(c)}`,`*Payment Status:* ${paymentStatus(c)}`,
      `*Today:* Morning – ${day.morning||"Not Updated"}, Evening – ${day.evening||"Not Updated"}`,
      "","Thank you for choosing Dabba Wala ❤️"
    ].join("\n");
    window.open(`https://wa.me/91${c.mobile}?text=${encodeURIComponent(message)}`,"_blank");
  };

  const filtered = customers.filter(c => [c.name,c.mobile,c.plan,c.address,c.area].join(" ").toLowerCase().includes(search.toLowerCase()));
  const active = customers.filter(c => c.status === "Active").length;
  const totalAmount = customers.reduce((s,c)=>s+Number(c.totalAmount||c.amount||0),0);
  const totalPaid = customers.reduce((s,c)=>s+Number(c.paidAmount||0),0);
  const totalPending = Math.max(0,totalAmount-totalPaid);
  const totalRemaining = customers.reduce((s,c)=>s+remaining(c),0);

  if (!loggedIn) return <div className="dw-admin-login"><div className="dw-admin-card">
    <img className="dw-logo-img" src={logo} alt="Dabba Wala Logo"/><h1>Dabba Wala</h1><p>Owner Admin Panel</p>
    <form onSubmit={login}><input type="password" placeholder="Admin PIN" value={password} onChange={e=>setPassword(e.target.value)} autoFocus/><button>Login to Admin</button></form>
    <small>Owner access only</small>
  </div></div>;

  return <div className="dw-admin-page">
    <header className="dw-admin-top"><div><div className="dw-admin-brand"><img src={logo} alt="Dabba Wala Logo"/><div><strong>Dabba Wala</strong><span>OWNER ADMIN</span></div></div><small>Customer, Tiffin & Payment Management</small></div>
      <div className="dw-admin-actions">
        <button className={`dw-wa-toggle ${whatsappEnabled ? "on" : "off"}`} onClick={()=>{
          const next = !whatsappEnabled;
          setWhatsappEnabled(next);
          localStorage.setItem("dw_whatsapp_enabled", next ? "1" : "0");
        }}>
          {whatsappEnabled ? "🟢 WhatsApp ON" : "⚪ WhatsApp OFF"}
        </button>
        <button onClick={()=>{localStorage.removeItem("dw_admin_auth");setLoggedIn(false)}}>Logout</button>
      </div>
    </header>

    <main className="dw-admin-wrap">
      <div className="dw-stats">
        <div><b>{customers.length}</b><span>Total Customers</span></div>
        <div><b>{active}</b><span>Active Subscriptions</span></div>
        <div><b>{totalRemaining}</b><span>Tiffins Remaining</span></div>
        <div><b>₹{totalPaid.toLocaleString("en-IN")}</b><span>Total Paid</span></div>
        <div><b>₹{totalPending.toLocaleString("en-IN")}</b><span>Total Pending</span></div>
      </div>

      <section className="dw-admin-grid">
        <div className="dw-admin-card dw-add-card"><h2>➕ Add Customer</h2><p>Set customer-wise rate, tiffin quota and payment.</p>
          <form onSubmit={addCustomer}>
            <label>Customer Name<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Full name"/></label>
            <label>WhatsApp Mobile<input required inputMode="numeric" maxLength="10" value={form.mobile} onChange={e=>setForm({...form,mobile:e.target.value.replace(/\D/g,"")})} placeholder="10-digit mobile"/></label>
            <label>Delivery Address<textarea required rows="3" value={form.address} onChange={e=>setForm({...form,address:e.target.value})} placeholder="House / Room / Street / Area"/></label>
            <label>Area<input value={form.area} onChange={e=>setForm({...form,area:e.target.value})} placeholder="e.g. Kota / DD Nagar"/></label>
            <div className="dw-two">
              <label>Plan<select value={form.plan} onChange={e=>setForm({...form,plan:e.target.value})}><option>Monthly Subscription</option><option>Custom Subscription</option><option>First Meal Trial</option></select></label>
              <label>Rate / Tiffin (₹)<input type="number" min="1" value={form.ratePerTiffin} onChange={e=>recalcAmount("ratePerTiffin",e.target.value)}/></label>
            </div>
            <div className="dw-two">
              <label>Total Tiffins<input type="number" min="1" value={form.totalTiffins} onChange={e=>recalcAmount("totalTiffins",e.target.value)}/></label>
              <label>Total Amount (₹)<input type="number" min="0" value={form.totalAmount} onChange={e=>setForm({...form,totalAmount:e.target.value})}/></label>
            </div>
            <div className="dw-two">
              <label>Paid Amount (₹)<input type="number" min="0" value={form.paidAmount} onChange={e=>setForm({...form,paidAmount:e.target.value})}/></label>
              <label>Pending Amount<input readOnly value={Math.max(0,Number(form.totalAmount||0)-Number(form.paidAmount||0))}/></label>
            </div>
            <label>Start Date<input type="date" value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})}/></label>
            <label>Notes<textarea rows="2" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Meal timing, instructions, etc."/></label>
            <div className="dw-live-summary"><b>Subscription Summary</b><span>{form.totalTiffins} tiffins × ₹{form.ratePerTiffin} = ₹{form.totalAmount}</span><span>Paid ₹{form.paidAmount} • Pending ₹{Math.max(0,Number(form.totalAmount||0)-Number(form.paidAmount||0))}</span></div>
            <button className="dw-primary">Save Customer {whatsappEnabled ? "+ Open WhatsApp →" : ""}</button>
          </form>
        </div>

        <div className="dw-admin-card"><div className="dw-list-head"><div><h2>👥 Customers</h2><p>Search and open a customer's daily tiffin account.</p></div><input placeholder="Search name, mobile, area..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
          {filtered.length===0 ? <div className="dw-empty">No customers added yet.</div> :
            <div className="dw-customer-cards">{filtered.map(c=>{
              const pay=paymentStatus(c);
              return <div className="dw-customer-card" key={c.id}>
                <div className="dw-customer-main"><div><h3>{c.name}</h3><small>{c.mobile} • {c.area||"Area not set"}</small><p>{c.address}</p></div><span className={`dw-status ${pay.toLowerCase().replace(" ","-")}`}>{pay}</span></div>
                <div className="dw-balance-grid">
                  <div><b>{c.totalTiffins}</b><span>Total Tiffins</span></div><div><b>{used(c)}</b><span>Used</span></div><div><b>{remaining(c)}</b><span>Remaining</span></div><div><b>₹{c.ratePerTiffin}</b><span>Per Tiffin</span></div>
                </div>
                <div className="dw-payment-row"><span>Total ₹{Number(c.totalAmount).toLocaleString("en-IN")}</span><span>Paid ₹{Number(c.paidAmount).toLocaleString("en-IN")}</span><span className="pending-text">Pending ₹{pending(c).toLocaleString("en-IN")}</span></div>
                <div className="dw-actions"><button onClick={()=>setSelectedCustomer(c)}>📅 Daily Update</button><button onClick={()=>setEditPayment(c)}>💰 Payment</button><button className="dw-wa" onClick={()=>sendMessage(c)}>WhatsApp</button><button className="dw-delete" onClick={()=>removeCustomer(c.id)}>Delete</button></div>
              </div>;
            })}</div>}
        </div>
      </section>

      {selectedCustomer && <section className="dw-admin-card dw-daily-card">
        <div className="dw-daily-head"><div><h2>📅 Daily Tiffin Update — {selectedCustomer.name}</h2><p>{used(selectedCustomer)} used • <strong>{remaining(selectedCustomer)} remaining</strong></p></div><button onClick={()=>setSelectedCustomer(null)}>Close</button></div>
        <div className="dw-date-control"><label>Select Date<input type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)}/></label><button className="dw-off-btn" onClick={()=>fullDayOff(selectedCustomer,selectedDate)}>🟡 Mark Full Day OFF</button></div>
        <div className="dw-meal-grid">{["morning","evening"].map(meal=>{
          const status=selectedCustomer.dailyRecords?.[selectedDate]?.[meal]||"Not Updated";
          return <div className="dw-meal-card" key={meal}><h3>{meal==="morning"?"☀️ Morning Tiffin":"🌙 Evening Tiffin"}</h3><strong className={`meal-${status.toLowerCase().replace(" ","-")}`}>{status}</strong>
            <div><button onClick={()=>setMeal(selectedCustomer,selectedDate,meal,"Delivered")}>✅ Delivered</button><button onClick={()=>setMeal(selectedCustomer,selectedDate,meal,"OFF")}>🟡 OFF</button></div>
          </div>;
        })}</div>
        <div className="dw-daily-note"><b>Rule:</b> Delivered = 1 used. OFF / Not Updated = balance does not decrease. Sunday can be used for one meal only according to the service schedule.</div>
      </section>}

      {editPayment && <div className="dw-modal-overlay" onClick={()=>setEditPayment(null)}><div className="dw-payment-modal" onClick={e=>e.stopPropagation()}>
        <button className="dw-modal-close" onClick={()=>setEditPayment(null)}>×</button><h2>💰 Update Payment</h2><p>{editPayment.name}</p>
        <label>Total Amount<input readOnly value={`₹${editPayment.totalAmount}`}/></label>
        <label>Paid Amount<input id="dw-paid-input" type="number" min="0" max={editPayment.totalAmount} defaultValue={editPayment.paidAmount}/></label>
        <div className="dw-payment-preview">Pending: ₹{pending(editPayment)}</div>
        <button className="dw-primary" onClick={()=>updatePayment(editPayment,document.getElementById("dw-paid-input")?.value)}>Save Payment</button>
      </div></div>}

      <div className="dw-note">⚠️ Current version stores customer/tiffin/payment data in this browser only. To show the same live balance on the customer's phone, we need a shared database connected to Admin and Customer Login.</div>
    </main>

    <style>{`
      .dw-admin-page{min-height:100vh;background:linear-gradient(180deg,#f8f5f2 0%,#f4f0ec 100%);color:#292524;font-family:inherit}
      .dw-admin-top{position:sticky;top:0;z-index:100;background:rgba(255,255,255,.96);backdrop-filter:blur(12px);border-bottom:1px solid #eadfd7;padding:12px 26px;display:flex;align-items:center;justify-content:space-between;gap:20px;box-shadow:0 2px 14px rgba(50,35,25,.04)}
      .dw-admin-actions{display:flex;align-items:center;gap:9px}.dw-admin-top>button,.dw-admin-actions>button,.dw-daily-head>button{border:1px solid #ddd3cc;background:#fff;border-radius:11px;padding:10px 15px;cursor:pointer;font-weight:700;transition:.18s}.dw-admin-top>button:hover,.dw-admin-actions>button:hover,.dw-daily-head>button:hover{transform:translateY(-1px);box-shadow:0 5px 14px rgba(50,35,25,.08)}.dw-wa-toggle.on{border-color:#b9e8c7;background:#effcf3;color:#087a2f;font-weight:800}.dw-wa-toggle.off{border-color:#e3ddd7;background:#faf8f6;color:#777}
      .dw-admin-brand{display:flex;align-items:center;gap:11px}.dw-admin-brand img{width:120px;height:52px;object-fit:contain;display:block}.dw-admin-brand div{display:flex;flex-direction:column;gap:2px}.dw-admin-brand strong{font-size:19px;line-height:1.1}.dw-admin-brand span{font-size:9px;font-weight:900;color:#f06b2d;letter-spacing:1px}.dw-admin-top small{color:#777;display:block;margin-top:3px;font-size:11px}.dw-admin-wrap{max-width:1420px;margin:auto;padding:26px 26px 42px}
      .dw-stats{display:grid;grid-template-columns:repeat(5,1fr);gap:13px;margin-bottom:20px}.dw-stats>div{position:relative;overflow:hidden;background:#fff;border:1px solid #eadfd7;border-radius:16px;padding:18px 17px;display:flex;flex-direction:column;gap:5px;box-shadow:0 7px 24px rgba(50,35,25,.045);transition:.18s}.dw-stats>div:hover{transform:translateY(-2px);box-shadow:0 10px 28px rgba(50,35,25,.08)}.dw-stats>div:before{content:"";position:absolute;left:0;top:0;width:4px;height:100%;background:#f06b2d}.dw-stats>div:nth-child(2):before{background:#22a45b}.dw-stats>div:nth-child(3):before{background:#7651bd}.dw-stats>div:nth-child(4):before{background:#3578c4}.dw-stats>div:nth-child(5):before{background:#d33b3b}.dw-stats b{font-size:25px;line-height:1.1;letter-spacing:-.3px}.dw-stats span{font-size:11px;color:#777}
      .dw-admin-grid{display:grid;grid-template-columns:minmax(340px,400px) minmax(0,1fr);gap:19px;align-items:start}.dw-admin-card{background:#fff;border:1px solid #eadfd7;border-radius:18px;padding:20px;box-shadow:0 8px 30px rgba(50,35,25,.045)}.dw-admin-card h2{margin:0 0 6px;font-size:20px}.dw-admin-card p{color:#777;font-size:12px}.dw-add-card form{display:flex;flex-direction:column;gap:12px}
      .dw-add-card label,.dw-payment-modal label,.dw-date-control label{display:flex;flex-direction:column;gap:6px;font-size:12px;font-weight:800;color:#3f3935}.dw-add-card input,.dw-add-card textarea,.dw-add-card select,.dw-list-head input,.dw-payment-modal input,.dw-date-control input{width:100%;box-sizing:border-box;border:1px solid #ddd3cc;border-radius:10px;padding:11px 12px;background:#fff;font:inherit;color:#292524;outline:none;transition:.18s}.dw-add-card input:hover,.dw-add-card textarea:hover,.dw-add-card select:hover{border-color:#cfc3bb}.dw-add-card input:focus,.dw-add-card textarea:focus,.dw-add-card select:focus,.dw-list-head input:focus,.dw-payment-modal input:focus,.dw-date-control input:focus{border-color:#f06b2d;box-shadow:0 0 0 3px rgba(240,107,45,.09)}.dw-two{display:grid;grid-template-columns:1fr 1fr;gap:10px}.dw-primary{border:0;border-radius:11px;padding:13px 15px;background:linear-gradient(135deg,#f06b2d,#e85d20);color:#fff;font-weight:900;cursor:pointer;box-shadow:0 8px 18px rgba(240,107,45,.2);transition:.18s}.dw-primary:hover{transform:translateY(-1px);box-shadow:0 11px 24px rgba(240,107,45,.26)}
      .dw-live-summary{display:flex;flex-direction:column;gap:5px;background:linear-gradient(135deg,#fff7ed,#fffdf9);border:1px solid #f1d5bd;border-radius:13px;padding:13px;font-size:11px}.dw-live-summary b{font-size:17px;color:#f06b2d}.dw-live-summary span{font-weight:800;color:#3d3732}.dw-live-summary>span{font-size:12px}.dw-live-summary>span+span{font-size:10px;color:#777;font-weight:500}
      .dw-list-head{display:flex;justify-content:space-between;align-items:flex-start;gap:15px;margin-bottom:16px}.dw-list-head>input{max-width:270px}.dw-customer-cards{display:flex;flex-direction:column;gap:12px}.dw-customer-card{border:1px solid #e8ded7;border-radius:15px;padding:16px;background:#fff;transition:.18s;position:relative}.dw-customer-card:hover{border-color:#efc6a8;box-shadow:0 8px 24px rgba(50,35,25,.06);transform:translateY(-1px)}.dw-customer-main{display:flex;justify-content:space-between;gap:15px}.dw-customer-main h3{margin:0 0 4px;font-size:17px}.dw-customer-main small{color:#777;font-size:11px}.dw-customer-main p{margin:6px 0 0;color:#5f5852;font-size:12px}.dw-status{height:max-content;border-radius:999px;padding:7px 11px;font-size:10px;font-weight:900;background:#fff0e8;color:#f06b2d;white-space:nowrap}.dw-status.paid{background:#eaf8ef;color:#16803b}.dw-status.half-payment{background:#fff7df;color:#9a6800}.dw-status.pending{background:#fff0f0;color:#c62828}
      .dw-balance-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:14px 0}.dw-balance-grid div{background:#faf8f6;border:1px solid #f0e9e4;border-radius:10px;padding:10px}.dw-balance-grid b,.dw-balance-grid span{display:block}.dw-balance-grid b{font-size:16px}.dw-balance-grid span{font-size:9px;color:#777;margin-top:3px}.dw-payment-row{display:flex;gap:22px;flex-wrap:wrap;font-size:11px;padding:10px 0;border-top:1px solid #eee}.pending-text{font-weight:900;color:#c62828}.dw-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:2px}.dw-actions button,.dw-meal-card button,.dw-off-btn{border:1px solid #ddd3cc;background:#fff;border-radius:9px;padding:8px 10px;cursor:pointer;font-weight:800;font-size:11px;transition:.16s}.dw-actions button:hover,.dw-meal-card button:hover{background:#faf6f2;transform:translateY(-1px)}.dw-actions .dw-wa{background:#25d366;color:#fff;border-color:#25d366}.dw-delete{color:#c62828!important}.dw-empty{padding:45px;text-align:center;color:#777;border:1px dashed #ded4cc;border-radius:12px;background:#fcfbfa}
      .dw-daily-card{margin-top:20px}.dw-daily-head{display:flex;justify-content:space-between;align-items:center;gap:15px}.dw-date-control{display:flex;align-items:end;gap:12px;margin:18px 0}.dw-date-control label{width:220px}.dw-off-btn{background:#fff7df;border-color:#f0d890;color:#7c6415}.dw-meal-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.dw-meal-card{border:1px solid #eadfd7;border-radius:14px;padding:16px;background:#fcfbfa}.dw-meal-card h3{margin:0 0 8px;font-size:15px}.dw-meal-card strong{display:block;margin-bottom:12px;font-size:11px}.meal-delivered{color:#16803b}.meal-off{color:#9a6800}.meal-not-updated{color:#777}.dw-meal-card>div{display:flex;gap:8px}.dw-daily-note{margin-top:14px;background:#faf8f6;border-radius:10px;padding:11px;font-size:11px;color:#666;line-height:1.5}
      .dw-modal-overlay{position:fixed;inset:0;background:rgba(30,25,20,.58);display:flex;align-items:center;justify-content:center;padding:20px;z-index:99999}.dw-payment-modal{width:min(420px,100%);background:#fff;border-radius:18px;padding:25px;position:relative;box-sizing:border-box;box-shadow:0 25px 80px rgba(0,0,0,.22)}.dw-payment-modal h2{margin:0 0 4px;font-size:21px}.dw-payment-modal>p{margin:0 0 18px}.dw-payment-modal label{margin-bottom:12px}.dw-modal-close{position:absolute;right:12px;top:12px;border:1px solid #ddd3cc;background:#fff;border-radius:50%;width:32px;height:32px;font-size:20px;cursor:pointer}.dw-payment-preview{background:#fff8ef;border-radius:10px;padding:11px;margin-bottom:12px;font-weight:800}.dw-payment-modal>.dw-primary{width:100%}.dw-note{margin-top:18px;padding:13px 15px;background:#fff7df;border:1px solid #f0d890;border-radius:12px;color:#725b16;font-size:11px;line-height:1.5}
      .dw-admin-login{min-height:100vh;background:radial-gradient(circle at 50% 0,#fff7ef 0,#f7f3ef 48%,#eee8e2 100%);display:flex;align-items:center;justify-content:center;padding:20px}.dw-admin-card.dw-login-card{width:min(390px,100%);text-align:center;padding:34px 30px}.dw-login-card .dw-logo-img{width:150px;height:70px;object-fit:contain;margin:0 auto 6px}.dw-login-card h1{margin:4px 0}.dw-login-card p{margin:0 0 22px}.dw-login-card form{display:flex;flex-direction:column;gap:9px;text-align:left}.dw-login-card input{padding:12px;border:1px solid #ddd3cc;border-radius:10px;font:inherit}.dw-login-card button{margin-top:4px}.dw-login-card small{display:block;margin-top:16px;color:#999}
      @media(max-width:1050px){.dw-stats{grid-template-columns:repeat(3,1fr)}.dw-admin-grid{grid-template-columns:1fr}}
      @media(max-width:650px){.dw-admin-wrap{padding:14px 12px 28px}.dw-admin-top{padding:10px 12px}.dw-admin-brand img{width:100px;height:45px}.dw-admin-brand strong{font-size:16px}.dw-admin-brand small{display:none}.dw-admin-actions{flex-wrap:wrap;justify-content:flex-end}.dw-admin-top>button,.dw-admin-actions>button{padding:8px 9px;font-size:10px}.dw-stats{grid-template-columns:repeat(2,1fr);gap:8px}.dw-stats>div{padding:13px}.dw-stats b{font-size:20px}.dw-two,.dw-meal-grid{grid-template-columns:1fr}.dw-list-head{flex-direction:column}.dw-list-head>input{max-width:none}.dw-balance-grid{grid-template-columns:repeat(2,1fr)}.dw-date-control{flex-direction:column;align-items:stretch}.dw-date-control label{width:auto}.dw-customer-main{gap:9px}.dw-customer-main p{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:230px}.dw-actions button{flex:1}.dw-admin-card{padding:15px;border-radius:15px}}
    `}</style>
  </div>;
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [orderForm, setOrderForm] = useState({ name: "", mobile: "", address: "" });
  const [orderError, setOrderError] = useState("");
  const location = useLocation();
  const navigate = useNavigate();

  if (location.pathname === "/admin") {
    return <AdminPanel />;
  }

  if (location.pathname === "/login") {
    return <Login />;
  }

  const scrollToMenu = () => {
    document.getElementById("plans")?.scrollIntoView({
      behavior: "smooth",
    });
  };

  const orderPlans = {
    trial: { name: "First Meal Trial", price: "₹65 one-time" },
    monthly: { name: "Monthly Subscription", price: "₹2,800 / month" },
  };

  const openOrderForm = (plan) => {
    if (!plan) return;

    // Close the plan selector first, then open the selected plan's order form.
    setShowPlans(false);
    setOrderError("");
    setOrderForm({ name: "", mobile: "", address: "" });
    setSelectedPlan(plan);
  };

  const closeOrderForm = () => {
    setSelectedPlan(null);
    setOrderError("");
  };

  const submitOrder = (e) => {
    e.preventDefault();

    const name = orderForm.name.trim();
    const mobile = orderForm.mobile.replace(/\D/g, "");
    const address = orderForm.address.trim();

    if (!name || !mobile || !address) {
      setOrderError("Please fill in all details.");
      return;
    }

    if (mobile.length !== 10) {
      setOrderError("Please enter a valid 10-digit mobile number.");
      return;
    }

    const message = [
      "🍱 *New Dabba Wala Order*",
      "",
      `*Plan:* ${selectedPlan.name}`,
      `*Price:* ${selectedPlan.price}`,
      `*Customer:* ${name}`,
      `*Mobile:* ${mobile}`,
      `*Address:* ${address}`,
      "",
      "*Meal:* Dal, Chawal, 4 Roti, Sabji, Aachar / Papad / Salad",
      "*Schedule:* Monday to Saturday + Sunday: 1 Time Meal Only",
    ].join("\n");

    window.open(
      `https://wa.me/917223050454?text=${encodeURIComponent(message)}`,
      "_blank"
    );

    closeOrderForm();
  };

  return (
    <div className="app">
      {/* Navbar */}
      <header className="navbar">
        <div className="container nav-inner">
          <div className="brand">
            <div className="brand-icon"><img className="dw-header-logo" src={logo} alt="Dabba Wala Logo" /></div>
            <div>
              <h2>Dabba Wala</h2>
              <span>Fresh • Homely • Healthy</span>
            </div>
          </div>

          <nav className={menuOpen ? "nav-links active" : "nav-links"}>
            <a href="#home" onClick={() => setMenuOpen(false)}>
              Home
            </a>
            <a href="#plans" onClick={() => setMenuOpen(false)}>
              Tiffin Plans
            </a>
            <a href="#why-us" onClick={() => setMenuOpen(false)}>
              Why Us
            </a>
            <a href="#contact" onClick={() => setMenuOpen(false)}>
              Contact
            </a>
          </nav>

          <div className="nav-actions">
            <button className="login-btn" onClick={() => navigate("/login")}>Login</button>
            <button className="order-btn" onClick={() => setShowPlans(true)}>
              Order Now
            </button>
          </div>

          <button
            className="menu-toggle"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            ☰
          </button>
        </div>
      </header>

      {/* Hero */}
      <main>
        <section className="hero" id="home">
          <div className="container hero-grid">
            <div className="hero-content">
              <div className="delivery-badge">
                🛵 Fresh Tiffin Delivered Daily
              </div>

              <h1>
                Ghar Jaisa Khana,
                <br />
                <span>Roz Aapke Ghar Tak.</span>
              </h1>

              <p>
                Freshly prepared homemade meals delivered to your doorstep.
                Simple, tasty and affordable tiffin service for everyday life.
              </p>

              <div className="hero-buttons">
                <button className="primary-btn" onClick={scrollToMenu}>
                  View Tiffin Plans →
                </button>

                <button className="secondary-btn">
                  📞 Call Us
                </button>
              </div>

              <div className="hero-features">
                <div>
                  <strong>✓</strong>
                  <span>Freshly Cooked</span>
                </div>
                <div>
                  <strong>✓</strong>
                  <span>Hygienic Kitchen</span>
                </div>
                <div>
                  <strong>✓</strong>
                  <span>Daily Delivery</span>
                </div>
              </div>
            </div>

            <div className="hero-food">
              <div className="food-circle">
                <div className="food-card">
                  <div className="food-emoji">🍛</div>
                  <div className="food-items">
                    <span>🍚</span>
                    <span>🥣</span>
                    <span>🫓</span>
                    <span>🥗</span>
                  </div>
                </div>
              </div>

              <div className="floating-card top-card">
                <span>⭐</span>
                <div>
                  <strong>Fresh & Tasty</strong>
                  <small>Made with love</small>
                </div>
              </div>

              <div className="floating-card bottom-card">
                <span>🛵</span>
                <div>
                  <strong>Daily Delivery</strong>
                  <small>On time at your doorstep</small>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="stats-section">
          <div className="container stats-grid">
            <div className="stat">
              <strong>100%</strong>
              <span>Homemade Food</span>
            </div>
            <div className="stat">
              <strong>Fresh</strong>
              <span>Daily Preparation</span>
            </div>
            <div className="stat">
              <strong>Easy</strong>
              <span>Online Ordering</span>
            </div>
            <div className="stat">
              <strong>Fast</strong>
              <span>Local Delivery</span>
            </div>
          </div>
        </section>

        {/* Plans */}
        <section className="plans-section" id="plans">
          <div className="container">
            <div className="section-heading">
              <span>OUR TIFFIN PLANS</span>
              <h2>Choose Your Perfect Meal</h2>
              <p>Fresh homemade meals with simple, convenient ordering.</p>
              <div className="service-schedule">
                <span>🗓️ Monday to Saturday</span>
                <strong>(Sunday: 1 Time Meal Only)</strong>
              </div>
            </div>

            <div className="plans-grid">
              <div className="plan-card">
                <div className="plan-icon">🍱</div>
                <h3>First Meal Trial</h3>
                <p className="plan-description">Try our tiffin once before choosing a monthly subscription.</p>
                <div className="price"><span>₹</span>65<small> one-time</small></div>
                <div className="trial-note">For first-time customers only</div>
                <ul>
                  <li>✓ Dal</li><li>✓ Chawal</li><li>✓ 4 Roti</li><li>✓ Seasonal Sabji</li><li>✓ Achar / Papad / Salad</li>
                </ul>
                <button className="plan-btn" onClick={() => openOrderForm(orderPlans.trial)}>Try for ₹65</button>
              </div>

              <div className="plan-card popular">
                <div className="popular-tag">RECOMMENDED</div>
                <div className="plan-icon">⭐</div>
                <h3>Monthly Subscription</h3>
                <p className="plan-description">Regular tiffin service for customers who want homemade meals.</p>
                <div className="price"><span>₹</span>2,800<small> / month</small></div>
                <div className="trial-note subscription-note">Monday to Saturday <strong>(Sunday: 1 Time Meal Only)</strong></div>
                <ul>
                  <li>✓ Dal</li><li>✓ Chawal</li><li>✓ 4 Roti</li><li>✓ Seasonal Sabji</li><li>✓ Achar / Papad / Salad</li>
                </ul>
                <button
  className="plan-btn"
  onClick={() => openOrderForm(orderPlans.monthly)}
>
  Subscribe Now
</button>
              </div>
            </div>
          </div>
        </section>

        {/* Why Us */}
        <section className="why-section" id="why-us">
          <div className="container">
            <div className="section-heading">
              <span>WHY DABBA WALA?</span>
              <h2>Food That Feels Like Home</h2>
            </div>

            <div className="why-grid">
              <div className="why-card">
                <div>🥘</div>
                <h3>Homemade Taste</h3>
                <p>
                  Simple Indian food prepared with the taste and comfort of
                  home.
                </p>
              </div>

              <div className="why-card">
                <div>🥬</div>
                <h3>Fresh Ingredients</h3>
                <p>
                  Fresh vegetables and quality ingredients used every day.
                </p>
              </div>

              <div className="why-card">
                <div>🧼</div>
                <h3>Hygienic</h3>
                <p>
                  Clean preparation and hygienic packaging for every order.
                </p>
              </div>

              <div className="why-card">
                <div>🛵</div>
                <h3>Local Delivery</h3>
                <p>
                  Reliable delivery across our available service areas.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Delivery Area */}
        <section className="area-section">
          <div className="container area-box">
            <div>
              <span>📍 DELIVERY AREAS</span>
              <h2>Currently Serving Your Area</h2>
              <p>
                Delivery available in selected areas of Raipur. More areas
                coming soon.
              </p>

              <div className="areas">
                <span>Kota</span>
                <span>DD Nagar</span>
                <span>Raipura Chowk</span>
                <span>Sundar Nagar</span>
              </div>
            </div>

            <div className="area-icon">📍</div>
          </div>
        </section>

        {/* CTA */}
        <section className="cta-section" id="contact">
          <div className="container cta-box">
            <div>
              <span>READY TO ORDER?</span>
              <h2>Ghar Ka Khana, Ab Bas Ek Click Door.</h2>
              <p>
                Create your account and start ordering your daily tiffin.
              </p>
            </div>

            <button className="cta-btn" onClick={scrollToMenu}>
              Start Ordering →
            </button>
          </div>
        </section>
      </main>

      {/* Order Plan Modal */}
      {showPlans && (
        <div className="plan-overlay" onClick={() => setShowPlans(false)}>
          <div className="plan-modal" onClick={(e) => e.stopPropagation()}>
            <button className="plan-close" onClick={() => setShowPlans(false)} aria-label="Close">×</button>
            <div className="plan-header">
              <span className="plan-tag">🍱 TIFFIN PLANS</span>
              <h2>Choose Your Tiffin Plan</h2>
              <p>Fresh homemade meals, made for your everyday routine.</p>
            </div>
            <div className="plan-grid">
              <div className="plan-card">
                <div className="plan-icon">🍱</div><h3>First Meal Trial</h3>
                <p className="plan-description">Try our tiffin once before starting a subscription.</p>
                <div className="plan-price">₹65 <span>one-time</span></div>
                <div className="trial-note">For first-time customers only</div><div className="plan-divider"></div>
                <ul><li>✓ Dal</li><li>✓ Chawal</li><li>✓ 4 Roti</li><li>✓ Seasonal Sabji</li><li>✓ Achar / Papad / Salad</li></ul>
                <button className="plan-btn" onClick={() => openOrderForm(orderPlans.trial)}>Try for ₹65</button>
              </div>
              <div className="plan-card popular-plan">
                <div className="popular-badge">RECOMMENDED</div><div className="plan-icon">⭐</div><h3>Monthly Subscription</h3>
                <p className="plan-description">Regular homemade tiffin service at a monthly price.</p>
                <div className="plan-price">₹2,800 <span>/ month</span></div>
<div className="trial-note subscription-note">
  Monday to Saturday <strong>(Sunday: 1 Time Meal Only)</strong>
</div>                <ul><li>✓ Dal</li><li>✓ Chawal</li><li>✓ 4 Roti</li><li>✓ Seasonal Sabji</li><li>✓ Achar / Papad / Salad</li></ul>
                <button className="plan-btn popular-btn" onClick={() => openOrderForm(orderPlans.monthly)}>Subscribe Now</button>
              </div>
            </div>
           <div className="service-schedule">
  🗓️ Monday to Saturday <strong>(Sunday: 1 Time Meal Only)</strong>
</div>
          </div>
        </div>
      )}

      {/* Customer Order Form */}
      {selectedPlan && (
        <div
          className="plan-overlay order-form-overlay"
          onClick={closeOrderForm}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflowY: "auto",
          }}
        >
          <div
            className="plan-modal order-form-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ position: "relative", zIndex: 100000 }}
          >
            <button className="plan-close" onClick={closeOrderForm} aria-label="Close">×</button>

            <div className="plan-header">
              <span className="plan-tag">📝 ORDER DETAILS</span>
              <h2>Complete Your Order</h2>
              <p>
                You selected <strong>{selectedPlan.name}</strong> — <strong>{selectedPlan.price}</strong>
              </p>
            </div>

            <div className="order-summary-box">
              <strong>{selectedPlan.name}</strong>
              <span>{selectedPlan.price}</span>
              <small>Dal • Chawal • 4 Roti • Sabji • Aachar / Papad / Salad</small>
              <small>Monday to Saturday + Sunday: 1 Time Meal Only</small>
            </div>

            <form className="order-form" onSubmit={submitOrder}>
              <label>
                Full Name
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={orderForm.name}
                  onChange={(e) => setOrderForm({ ...orderForm, name: e.target.value })}
                />
              </label>

              <label>
                Mobile Number
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength="10"
                  placeholder="Enter 10-digit mobile number"
                  value={orderForm.mobile}
                  onChange={(e) =>
                    setOrderForm({
                      ...orderForm,
                      mobile: e.target.value.replace(/\D/g, ""),
                    })
                  }
                />
              </label>

              <label>
                Delivery Address
                <textarea
                  rows="3"
                  placeholder="House / Room No., Street, Area"
                  value={orderForm.address}
                  onChange={(e) => setOrderForm({ ...orderForm, address: e.target.value })}
                />
              </label>

              {orderError && <div className="order-error">{orderError}</div>}

              <button type="submit" className="order-submit-btn">
                Confirm Order on WhatsApp →
              </button>

              <p className="order-whatsapp-note">
                Your order details will open in WhatsApp for confirmation.
              </p>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .order-form-overlay {
          background: rgba(30, 25, 20, 0.62);
          backdrop-filter: blur(3px);
          -webkit-backdrop-filter: blur(3px);
          padding: 20px;
        }

        .order-form-modal {
          max-width: 560px;
          width: min(560px, calc(100% - 32px));
          max-height: calc(100vh - 40px);
          overflow-y: auto;
          background: #fff;
          border-radius: 22px;
          padding: 28px;
          box-shadow: 0 24px 70px rgba(0,0,0,.25);
          border: 1px solid rgba(240,107,45,.12);
          box-sizing: border-box;
        }

        .order-form-modal .plan-header {
          margin: 0 0 18px;
          padding: 0;
          text-align: left;
        }

        .order-form-modal .plan-tag {
          display: inline-flex;
          align-items: center;
          padding: 7px 11px;
          border-radius: 999px;
          background: #fff2e8;
          color: #f06b2d;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: .4px;
        }

        .order-form-modal .plan-header h2 {
          margin: 10px 0 6px;
          font-size: 28px;
          line-height: 1.15;
        }

        .order-form-modal .plan-header p {
          margin: 0;
          color: #6b625c;
          line-height: 1.5;
        }

        .order-form-modal .plan-close {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1px solid #eadfd7;
          background: #fff;
          color: #5d554f;
          font-size: 22px;
          line-height: 1;
          cursor: pointer;
          z-index: 2;
        }

        .order-form-modal .plan-close:hover {
          background: #fff5ee;
          color: #f06b2d;
        }

        .order-summary-box {
          display: flex;
          flex-direction: column;
          gap: 7px;
          padding: 16px 18px;
          margin: 18px 0 20px;
          border: 1px solid #f2d7bd;
          border-radius: 16px;
          background: linear-gradient(135deg, #fff8ef, #fffdf9);
        }

        .order-summary-box strong { font-size: 17px; color: #292524; }
        .order-summary-box span { color: #f06b2d; font-size: 21px; font-weight: 800; }
        .order-summary-box small { color: #666; line-height: 1.5; }

        .order-form {
          display: flex;
          flex-direction: column;
          gap: 15px;
          text-align: left;
        }

        .order-form label {
          display: flex;
          flex-direction: column;
          gap: 7px;
          font-size: 14px;
          font-weight: 700;
          color: #292524;
        }

        .order-form input,
        .order-form textarea {
          width: 100%;
          padding: 13px 14px;
          border: 1px solid #ddd3cc;
          border-radius: 11px;
          background: #fff;
          color: #292524;
          font: inherit;
          outline: none;
          resize: vertical;
          box-sizing: border-box;
          transition: .2s ease;
        }

        .order-form input:focus,
        .order-form textarea:focus {
          border-color: #f06b2d;
          box-shadow: 0 0 0 3px rgba(240,107,45,.10);
        }

        .order-error {
          padding: 10px 12px;
          border-radius: 9px;
          background: #fff0f0;
          color: #c62828;
          font-size: 14px;
        }

        .order-submit-btn {
          width: 100%;
          border: none;
          border-radius: 11px;
          padding: 14px 18px;
          background: #25d366;
          color: #fff;
          font-weight: 800;
          font-size: 15px;
          cursor: pointer;
          box-shadow: 0 8px 18px rgba(37,211,102,.20);
          transition: transform .15s ease, box-shadow .15s ease;
        }

        .order-submit-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 11px 24px rgba(37,211,102,.27);
        }

        .order-whatsapp-note {
          margin: 0;
          text-align: center;
          color: #777;
          font-size: 12px;
        }
        .order-summary-box {
          display:flex; flex-direction:column; gap:6px; padding:16px; margin:18px 0;
          border:1px solid #f2d7bd; border-radius:14px; background:#fff8ef;
        }
        .order-summary-box strong { font-size:18px; }
        .order-summary-box span { color:#f06b2d; font-size:20px; font-weight:800; }
        .order-summary-box small { color:#666; line-height:1.5; }
        .order-form { display:flex; flex-direction:column; gap:14px; text-align:left; }
        .order-form label { display:flex; flex-direction:column; gap:7px; font-size:14px; font-weight:700; }
        .order-form input, .order-form textarea {
          width:100%; padding:13px 14px; border:1px solid #ddd; border-radius:10px;
          background:#fff; color:#292524; font:inherit; outline:none; resize:vertical;
        }
        .order-form input:focus, .order-form textarea:focus {
          border-color:#f06b2d; box-shadow:0 0 0 3px rgba(240,107,45,.1);
        }
        .order-error { padding:10px 12px; border-radius:9px; background:#fff0f0; color:#c62828; font-size:14px; }
        .order-submit-btn {
          width:100%; border:none; border-radius:10px; padding:14px 18px;
          background:#25d366; color:#fff; font-weight:800; font-size:15px; cursor:pointer;
        }
        .order-whatsapp-note { margin:0; text-align:center; color:#777; font-size:12px; }
        @media (max-width:600px) {
          .order-form-overlay { padding: 10px; }
          .order-form-modal {
            width: calc(100% - 20px);
            max-height: calc(100vh - 20px);
            padding: 22px 18px;
            border-radius: 18px;
          }
          .order-form-modal .plan-header h2 { font-size: 24px; }
        }
      `}</style>

      {/* Footer */}
      <footer className="footer">
        <div className="container footer-grid">
          <div className="footer-brand">
            <div className="brand">
              <div className="brand-icon"><img src={logo} alt="Dabba Wala Logo" /></div>
              <div>
                <h2>Dabba Wala</h2>
                <span>Fresh • Homely • Healthy</span>
              </div>
            </div>
            <p>
              Your everyday homemade tiffin service. Fresh food, simple
              ordering and reliable local delivery.
            </p>
          </div>

          <div>
            <h4>Quick Links</h4>
            <a href="#home">Home</a>
            <a href="#plans">Tiffin Plans</a>
            <a href="#why-us">Why Us</a>
            <a href="#contact">Contact</a>
          </div>

          <div>
            <h4>Contact</h4>
            <p>📞 +91 7223050454</p>
            <p>📍 Raipur, Chhattisgarh</p>
            <p>🕐 10 AM – 9 PM</p>
          </div>
        </div>

        <div className="footer-bottom">
          © 2026 Dabba Wala Tiffin Service. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

export default App;