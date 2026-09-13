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
    <aside className="dw-sidebar">
      <div className="dw-side-brand">
        <img src={logo} alt="Dabba Wala Logo" />
        <div><strong>Dabba Wala</strong><span>OWNER DASHBOARD</span></div>
      </div>
      <nav className="dw-side-nav">
        <button className="active" onClick={()=>document.getElementById("dw-dashboard")?.scrollIntoView({behavior:"smooth"})}>⌂ <span>Dashboard</span></button>
        <button onClick={()=>document.getElementById("dw-add")?.scrollIntoView({behavior:"smooth"})}>＋ <span>Add Customer</span></button>
        <button onClick={()=>document.getElementById("dw-customers")?.scrollIntoView({behavior:"smooth"})}>♟ <span>Customers</span></button>
        <button onClick={()=>document.getElementById("dw-daily")?.scrollIntoView({behavior:"smooth"})}>▣ <span>Daily Delivery</span></button>
        <button onClick={()=>document.getElementById("dw-payments")?.scrollIntoView({behavior:"smooth"})}>₹ <span>Payments</span></button>
      </nav>
      <div className="dw-side-quote"><div>🍱</div><strong>Good Food<br/>Builds Better Days</strong><span>❤️</span></div>
      <div className="dw-side-foot">Dabba Wala<br/><small>Fresh • Homely • Healthy</small></div>
    </aside>

    <div className="dw-dashboard-shell">
      <header className="dw-admin-top">
        <div className="dw-head-title"><div className="dw-mobile-logo"><img src={logo} alt="Dabba Wala"/></div><div><h1>Owner Dashboard</h1><p>Customer, Tiffin & Payment Management</p></div></div>
        <div className="dw-admin-actions">
          <div className="dw-today-chip">▣ <span>{new Date().toLocaleDateString("en-IN", {weekday:"long", day:"2-digit", month:"short", year:"numeric"})}</span></div>
          <button className={`dw-wa-toggle ${whatsappEnabled ? "on" : "off"}`} onClick={()=>{
            const next = !whatsappEnabled;
            setWhatsappEnabled(next);
            localStorage.setItem("dw_whatsapp_enabled", next ? "1" : "0");
          }}>{whatsappEnabled ? "🟢 WhatsApp ON" : "⚪ WhatsApp OFF"}</button>
          <button className="dw-logout" onClick={()=>{localStorage.removeItem("dw_admin_auth");setLoggedIn(false)}}>↪ Logout</button>
        </div>
      </header>

      <main className="dw-admin-wrap" id="dw-dashboard">
        <div className="dw-welcome"><div><span>Good day, Owner 👋</span><h2>Manage your Dabba Wala business</h2></div><small>Keep every customer's tiffin & payment record up to date.</small></div>

        <div className="dw-stats">
          <div className="stat-blue"><i>♟</i><div><b>{customers.length}</b><span>Total Customers</span><small>All registered customers</small></div></div>
          <div className="stat-green"><i>●</i><div><b>{active}</b><span>Active Subscriptions</span><small>Currently active</small></div></div>
          <div className="stat-orange"><i>▣</i><div><b>{totalRemaining}</b><span>Tiffins Remaining</span><small>Across all customers</small></div></div>
          <div className="stat-paid"><i>₹</i><div><b>₹{totalPaid.toLocaleString("en-IN")}</b><span>Total Paid</span><small>Amount received</small></div></div>
          <div className="stat-pending"><i>₹</i><div><b>₹{totalPending.toLocaleString("en-IN")}</b><span>Total Pending</span><small>Amount due</small></div></div>
        </div>

        <section className="dw-admin-grid">
          <div className="dw-admin-card dw-add-card" id="dw-add">
            <div className="dw-section-title"><div className="dw-section-icon">＋</div><div><h2>Add New Customer</h2><p>Set customer details, tiffin quota and payment information.</p></div></div>
            <form onSubmit={addCustomer}>
              <label>Customer Name <em>*</em><input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Full name"/></label>
              <label>WhatsApp Mobile <em>*</em><div className="dw-input-icon"><span>◉</span><input required inputMode="numeric" maxLength="10" value={form.mobile} onChange={e=>setForm({...form,mobile:e.target.value.replace(/\D/g,"")})} placeholder="10-digit mobile number"/></div></label>
              <label>Delivery Address <em>*</em><textarea required rows="3" value={form.address} onChange={e=>setForm({...form,address:e.target.value})} placeholder="House / Room / Street / Area"/></label>
              <label>Area<input value={form.area} onChange={e=>setForm({...form,area:e.target.value})} placeholder="e.g. Kota / DD Nagar"/></label>
              <div className="dw-two">
                <label>Plan<select value={form.plan} onChange={e=>setForm({...form,plan:e.target.value})}><option>Monthly Subscription</option><option>Custom Subscription</option><option>First Meal Trial</option></select></label>
                <label>Rate / Tiffin (₹) <em>*</em><input type="number" min="1" value={form.ratePerTiffin} onChange={e=>recalcAmount("ratePerTiffin",e.target.value)}/></label>
              </div>
              <div className="dw-two">
                <label>Total Tiffins <em>*</em><input type="number" min="1" value={form.totalTiffins} onChange={e=>recalcAmount("totalTiffins",e.target.value)}/></label>
                <label>Total Amount (₹)<input type="number" min="0" value={form.totalAmount} onChange={e=>setForm({...form,totalAmount:e.target.value})}/></label>
              </div>
              <div className="dw-two">
                <label>Paid Amount (₹)<input type="number" min="0" value={form.paidAmount} onChange={e=>setForm({...form,paidAmount:e.target.value})}/></label>
                <label>Pending Amount<input readOnly value={Math.max(0,Number(form.totalAmount||0)-Number(form.paidAmount||0))}/></label>
              </div>
              <div className="dw-two">
                <label>Start Date<input type="date" value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})}/></label>
                <label>Notes<input value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Special instruction..."/></label>
              </div>
              <div className="dw-live-summary"><b>Subscription Summary</b><strong>{form.totalTiffins} tiffins × ₹{form.ratePerTiffin} = ₹{form.totalAmount}</strong><span>Paid ₹{form.paidAmount} • Pending ₹{Math.max(0,Number(form.totalAmount||0)-Number(form.paidAmount||0))}</span></div>
              <button className="dw-primary">＋ Add Customer</button>
            </form>
          </div>

          <div className="dw-admin-card dw-customers-panel" id="dw-customers">
            <div className="dw-list-head"><div className="dw-section-title"><div className="dw-section-icon orange">●●</div><div><h2>Customers</h2><p>Search and manage customer accounts.</p></div></div><div className="dw-search"><span>⌕</span><input placeholder="Search by name, mobile, area..." value={search} onChange={e=>setSearch(e.target.value)}/></div></div>
            {filtered.length===0 ? <div className="dw-empty">No customers found.<br/><small>Add your first customer from the form.</small></div> :
              <div className="dw-customer-cards">{filtered.map(c=>{
                const pay=paymentStatus(c), rem=remaining(c), total=Number(c.totalTiffins||0), percent=total?Math.round((rem/total)*100):0;
                return <div className="dw-customer-card" key={c.id}>
                  <div className="dw-customer-top"><div className="dw-avatar">{(c.name||"C").slice(0,2).toUpperCase()}</div><div className="dw-customer-info"><h3>{c.name}</h3><div className="dw-contact-line">☎ {c.mobile} <span>◉</span></div><div className="dw-location-line">⌖ {c.area||"Area not set"} <span>⌂ {c.address}</span></div></div><span className={`dw-status ${pay.toLowerCase().replace(" ","-")}`}>{pay}</span><button className="dw-more">•••</button></div>
                  <div className="dw-customer-metrics">
                    <div><b>{c.totalTiffins}</b><span>Total Tiffins</span></div><div><b>{used(c)}</b><span>Used</span></div><div className="remaining-metric"><b>{rem}</b><span>Remaining</span><div className="dw-progress"><i style={{width:`${percent}%`}}></i></div><small>{percent}%</small></div><div><b>₹{c.ratePerTiffin}</b><span>Per Tiffin</span></div><div><b>₹{Number(c.totalAmount||0).toLocaleString("en-IN")}</b><span>Total Amount</span></div><div className="paid-metric"><b>₹{Number(c.paidAmount||0).toLocaleString("en-IN")}</b><span>Paid</span></div><div className="pending-metric"><b>₹{pending(c).toLocaleString("en-IN")}</b><span>Pending</span></div>
                  </div>
                  <div className="dw-actions"><button className="daily" onClick={()=>{setSelectedCustomer(c);setTimeout(()=>document.getElementById("dw-daily")?.scrollIntoView({behavior:"smooth"}),50)}}>▣ Daily Update</button><button className="payment" onClick={()=>setEditPayment(c)}>₹ Payment</button><button className="dw-wa" onClick={()=>sendMessage(c)}>◉ WhatsApp</button><button className="dw-delete" onClick={()=>removeCustomer(c.id)}>♜ Delete</button></div>
                </div>;
              })}</div>}
          </div>
        </section>

        {selectedCustomer && <section className="dw-admin-card dw-daily-card" id="dw-daily">
          <div className="dw-daily-head"><div><div className="dw-section-title"><div className="dw-section-icon blue">▣</div><div><h2>Daily Tiffin Update</h2><p>{selectedCustomer.name} • {used(selectedCustomer)} used • <strong>{remaining(selectedCustomer)} remaining</strong></p></div></div></div><button className="dw-close-btn" onClick={()=>setSelectedCustomer(null)}>×</button></div>
          <div className="dw-date-control"><label>Select Date<input type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)}/></label><button className="dw-off-btn" onClick={()=>fullDayOff(selectedCustomer,selectedDate)}>🟡 Mark Full Day OFF</button></div>
          <div className="dw-meal-grid">{["morning","evening"].map(meal=>{const status=selectedCustomer.dailyRecords?.[selectedDate]?.[meal]||"Not Updated";return <div className="dw-meal-card" key={meal}><div className="meal-icon">{meal==="morning"?"☀️":"🌙"}</div><div><h3>{meal==="morning"?"Morning Tiffin":"Evening Tiffin"}</h3><strong className={`meal-${status.toLowerCase().replace(" ","-")}`}>{status}</strong></div><div className="meal-actions"><button onClick={()=>setMeal(selectedCustomer,selectedDate,meal,"Delivered")}>✓ Delivered</button><button onClick={()=>setMeal(selectedCustomer,selectedDate,meal,"OFF")}>OFF</button></div></div>})}</div>
          <div className="dw-daily-note"><b>How it works:</b> Delivered = 1 tiffin used. OFF / Not Updated = balance does not decrease. Sunday can be used for one meal only according to the service schedule.</div>
        </section>}

        {editPayment && <div className="dw-modal-overlay" onClick={()=>setEditPayment(null)}><div className="dw-payment-modal" onClick={e=>e.stopPropagation()}>
          <button className="dw-modal-close" onClick={()=>setEditPayment(null)}>×</button><div className="dw-payment-icon">₹</div><h2>Update Payment</h2><p>{editPayment.name}</p>
          <label>Total Amount<input readOnly value={`₹${editPayment.totalAmount}`}/></label>
          <label>Paid Amount<input id="dw-paid-input" type="number" min="0" max={editPayment.totalAmount} defaultValue={editPayment.paidAmount}/></label>
          <div className="dw-payment-preview">Pending after update: <b>₹{pending(editPayment)}</b></div>
          <button className="dw-primary" onClick={()=>updatePayment(editPayment,document.getElementById("dw-paid-input")?.value)}>Save Payment</button>
        </div></div>}

        <section className="dw-footer-banner" id="dw-payments"><span>🍃</span><div><strong>“Thank you for being a part of Dabba Wala ❤️”</strong><small>Nutritious Meals &nbsp; | &nbsp; Timely Delivery &nbsp; | &nbsp; Happy Customers</small></div><span>🍱</span></section>
        <div className="dw-note">⚠️ Current version stores customer/tiffin/payment data in this browser only. To show the same live balance on the customer's phone, we need a shared database connected to Admin and Customer Login.</div>
      </main>
    </div>

    <style>{`
      .dw-admin-page{min-height:100vh;background:#f8f7f5;color:#172033;display:flex;font-family:Inter,Arial,Helvetica,sans-serif}.dw-sidebar{width:218px;min-width:218px;background:#fff;border-right:1px solid #e9e5e1;display:flex;flex-direction:column;padding:20px 14px;box-sizing:border-box;position:sticky;top:0;height:100vh}.dw-side-brand{display:flex;align-items:center;gap:9px;padding:2px 5px 23px;border-bottom:1px solid #eee9e5}.dw-side-brand img{width:48px;height:48px;object-fit:contain}.dw-side-brand strong{display:block;font-size:18px;color:#123f35}.dw-side-brand span{display:block;font-size:8px;color:#ef6425;font-weight:900;letter-spacing:.8px;margin-top:2px}.dw-side-nav{display:flex;flex-direction:column;gap:5px;margin-top:22px}.dw-side-nav button{border:0;background:transparent;text-align:left;border-radius:11px;padding:12px 13px;color:#384252;font-weight:700;font-size:13px;display:flex;align-items:center;gap:12px;cursor:pointer}.dw-side-nav button:first-letter{font-size:18px}.dw-side-nav button:hover{background:#fff2e9;color:#e95d20}.dw-side-nav button.active{background:linear-gradient(135deg,#ff741c,#f35f20);color:#fff;box-shadow:0 7px 18px rgba(240,95,32,.18)}.dw-side-nav button span{font-size:13px}.dw-side-quote{margin-top:auto;border-radius:12px;background:linear-gradient(145deg,#fff6e9,#fffaf5);padding:17px 10px;text-align:center;border:1px solid #f1e3d2;color:#8b3d1e;font-family:Georgia,serif}.dw-side-quote div{font-size:25px;margin-bottom:5px}.dw-side-quote strong{font-size:16px;line-height:1.25}.dw-side-quote span{font-size:16px}.dw-side-foot{font-size:11px;color:#777;padding:17px 7px 0;line-height:1.5}.dw-side-foot small{color:#aaa}.dw-dashboard-shell{min-width:0;flex:1}.dw-admin-top{height:78px;background:#fff;border-bottom:1px solid #e8e3df;display:flex;align-items:center;justify-content:space-between;padding:0 27px;gap:20px;position:sticky;top:0;z-index:50}.dw-head-title{display:flex;align-items:center;gap:12px}.dw-head-title h1{margin:0;font-size:22px;letter-spacing:-.4px}.dw-head-title p{margin:3px 0 0;color:#707781;font-size:12px}.dw-mobile-logo{display:none}.dw-admin-actions{display:flex;align-items:center;gap:10px}.dw-today-chip,.dw-admin-actions>button{height:40px;border:1px solid #e3ddd8;background:#fff;border-radius:10px;padding:0 13px;font-weight:800;color:#30343b}.dw-today-chip{display:flex;align-items:center;gap:8px;font-size:11px}.dw-wa-toggle.on{border-color:#bfe8cc;background:#f3fff6;color:#07833d}.dw-wa-toggle.off{color:#777}.dw-logout:hover{border-color:#ef6a2b;color:#ef6a2b}.dw-admin-wrap{max-width:1450px;margin:auto;padding:24px 27px 40px}.dw-welcome{display:flex;align-items:end;justify-content:space-between;margin:0 0 18px}.dw-welcome span{font-size:11px;color:#e35d22;font-weight:900}.dw-welcome h2{margin:3px 0 0;font-size:20px}.dw-welcome small{color:#85898f;font-size:11px}.dw-stats{display:grid;grid-template-columns:repeat(5,1fr);gap:13px;margin-bottom:19px}.dw-stats>div{background:#fff;border:1px solid #e7e1dc;border-radius:14px;padding:14px 13px;display:flex;gap:12px;align-items:center;min-width:0;box-shadow:0 5px 18px rgba(34,28,22,.035);transition:.18s}.dw-stats>div:hover{transform:translateY(-2px);box-shadow:0 9px 25px rgba(34,28,22,.07)}.dw-stats i{width:43px;height:43px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:20px;font-weight:900;flex:none}.stat-blue i{background:#e5f1ff;color:#1971d4}.stat-green i{background:#e2f8eb;color:#19934e}.stat-orange i{background:#fff0df;color:#ed7621}.stat-paid i{background:#e5f8ec;color:#148b45}.stat-pending i{background:#ffe8ed;color:#d83d56}.dw-stats b,.dw-stats span,.dw-stats small{display:block}.dw-stats b{font-size:23px;line-height:1.05}.dw-stats span{font-size:11px;font-weight:800;margin-top:4px}.dw-stats small{font-size:9px;color:#8b9098;margin-top:3px}.stat-pending span,.stat-pending b{color:#c62f47}.dw-admin-grid{display:grid;grid-template-columns:minmax(340px,425px) minmax(0,1fr);gap:17px;align-items:start}.dw-admin-card{background:#fff;border:1px solid #e6e0dc;border-radius:16px;padding:19px;box-shadow:0 6px 24px rgba(32,27,22,.035)}.dw-section-title{display:flex;align-items:flex-start;gap:10px}.dw-section-title h2{margin:0;font-size:19px;letter-spacing:-.2px}.dw-section-title p{margin:4px 0 0;color:#777f88;font-size:11px;line-height:1.4}.dw-section-icon{width:36px;height:36px;border-radius:10px;background:#fff0e5;color:#ed6420;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;flex:none}.dw-section-icon.orange{font-size:13px}.dw-section-icon.blue{background:#e8f2ff;color:#2874c8}.dw-add-card form{display:flex;flex-direction:column;gap:10px;margin-top:17px}.dw-add-card label,.dw-payment-modal label,.dw-date-control label{display:flex;flex-direction:column;gap:5px;font-size:11px;font-weight:800;color:#26303b}.dw-add-card label em{color:#e34e2c;font-style:normal}.dw-add-card input,.dw-add-card textarea,.dw-add-card select,.dw-search input,.dw-payment-modal input,.dw-date-control input{width:100%;box-sizing:border-box;border:1px solid #ddd8d4;border-radius:9px;padding:10px 11px;background:#fff;font:inherit;font-size:12px;color:#252a31;outline:none;transition:.18s}.dw-add-card textarea{resize:vertical}.dw-add-card input:focus,.dw-add-card textarea:focus,.dw-add-card select:focus,.dw-search input:focus,.dw-payment-modal input:focus,.dw-date-control input:focus{border-color:#f36a26;box-shadow:0 0 0 3px rgba(243,106,38,.08)}.dw-input-icon{position:relative}.dw-input-icon span{position:absolute;left:11px;top:10px;color:#1aa04e;font-size:14px}.dw-input-icon input{padding-left:30px}.dw-two{display:grid;grid-template-columns:1fr 1fr;gap:9px}.dw-primary{border:0;border-radius:9px;padding:12px 14px;background:linear-gradient(135deg,#ff741b,#f15e20);color:#fff;font-weight:900;cursor:pointer;box-shadow:0 8px 18px rgba(240,95,32,.18);font-size:12px}.dw-primary:hover{transform:translateY(-1px)}.dw-live-summary{background:#fff8ee;border:1px solid #f2dfc9;border-radius:10px;padding:10px 12px;display:flex;flex-direction:column;gap:3px}.dw-live-summary b{font-size:11px;color:#c75420}.dw-live-summary strong{font-size:14px}.dw-live-summary span{font-size:10px;color:#777}.dw-list-head{display:flex;justify-content:space-between;align-items:center;gap:15px;margin-bottom:15px}.dw-search{position:relative;width:270px}.dw-search span{position:absolute;left:11px;top:9px;color:#7c8289;font-size:18px}.dw-search input{padding-left:31px}.dw-customer-cards{display:flex;flex-direction:column;gap:10px}.dw-customer-card{border:1px solid #e6e1dd;border-radius:14px;padding:14px;background:#fff;transition:.18s}.dw-customer-card:hover{border-color:#efc4a8;box-shadow:0 7px 20px rgba(35,29,24,.06)}.dw-customer-top{display:flex;align-items:flex-start;gap:10px}.dw-avatar{width:44px;height:44px;border-radius:50%;background:#e6f0ff;color:#3479c9;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:14px;flex:none}.dw-customer-card:nth-child(2n) .dw-avatar{background:#ffecef;color:#d05c71}.dw-customer-info{min-width:0;flex:1}.dw-customer-info h3{margin:1px 0 4px;font-size:16px}.dw-contact-line{font-size:11px;color:#303740}.dw-contact-line span{color:#15a34a;margin-left:5px}.dw-location-line{font-size:10px;color:#727a83;margin-top:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dw-location-line span{margin-left:10px}.dw-status{border-radius:999px;padding:6px 10px;font-size:10px;font-weight:900;white-space:nowrap}.dw-status.paid{background:#e6f8ed;color:#168340}.dw-status.half-payment{background:#fff3d6;color:#9b6b00}.dw-status.pending{background:#ffecef;color:#c72d45}.dw-more{border:1px solid #ddd8d3;background:#fff;border-radius:8px;width:30px;height:30px;color:#6e747b;font-weight:900}.dw-customer-metrics{display:grid;grid-template-columns:1fr 1fr 1.35fr 1fr 1.15fr 1.05fr 1.05fr;margin-top:13px;border-radius:10px;background:#f9fafb;overflow:hidden}.dw-customer-metrics>div{padding:9px 8px;border-right:1px solid #ece9e6;min-width:0}.dw-customer-metrics>div:last-child{border-right:0}.dw-customer-metrics b,.dw-customer-metrics span{display:block}.dw-customer-metrics b{font-size:14px}.dw-customer-metrics span{font-size:9px;color:#777;margin-top:3px}.paid-metric b,.paid-metric span{color:#168340}.pending-metric b,.pending-metric span{color:#d22e43}.remaining-metric{position:relative}.remaining-metric small{position:absolute;right:8px;bottom:8px;font-size:8px;color:#555}.dw-progress{height:5px;background:#e5e9ed;border-radius:99px;margin-top:6px;overflow:hidden;width:85%}.dw-progress i{display:block;height:100%;background:#18a653;border-radius:99px}.dw-actions{display:flex;gap:7px;margin-top:11px;flex-wrap:wrap}.dw-actions button,.dw-off-btn{border:1px solid #ded8d3;background:#fff;border-radius:8px;padding:8px 11px;cursor:pointer;font-weight:800;font-size:10px}.dw-actions button:hover{transform:translateY(-1px)}.dw-actions .daily{color:#1671d0;border-color:#acd0ff;background:#f4f9ff}.dw-actions .payment{color:#df7a00;border-color:#f1c97c;background:#fffaf0}.dw-actions .dw-wa{background:#19b957;color:#fff;border-color:#19b957}.dw-delete{color:#c52e42!important;border-color:#f1aeb8!important;background:#fff7f8!important}.dw-empty{padding:55px 20px;text-align:center;color:#777;border:1px dashed #dcd5cf;border-radius:12px;background:#fcfbfa;font-size:13px}.dw-empty small{font-size:10px;color:#aaa}.dw-daily-card{margin-top:18px}.dw-daily-head{display:flex;justify-content:space-between;align-items:center}.dw-close-btn{width:34px;height:34px;border:1px solid #ddd7d2;background:#fff;border-radius:9px;font-size:21px;color:#777;cursor:pointer}.dw-date-control{display:flex;align-items:end;gap:12px;margin:17px 0}.dw-date-control label{width:210px}.dw-off-btn{background:#fff8e2;border-color:#ecd48b;color:#765d11}.dw-meal-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.dw-meal-card{border:1px solid #e7e1dc;border-radius:12px;padding:14px;display:flex;align-items:center;gap:12px;background:#fcfbfa}.meal-icon{width:40px;height:40px;border-radius:11px;background:#fff0dd;display:flex;align-items:center;justify-content:center;font-size:20px}.dw-meal-card h3{margin:0 0 5px;font-size:14px}.dw-meal-card strong{font-size:10px}.meal-delivered{color:#16803b}.meal-off{color:#9a6800}.meal-not-updated{color:#777}.meal-actions{margin-left:auto;display:flex;gap:6px}.meal-actions button{border:1px solid #ddd6d1;background:#fff;border-radius:7px;padding:7px 9px;font-size:10px;font-weight:800;cursor:pointer}.dw-daily-note{margin-top:13px;background:#f8f7f5;border-radius:9px;padding:10px;font-size:10px;color:#6d7278;line-height:1.5}.dw-modal-overlay{position:fixed;inset:0;background:rgba(20,23,28,.56);display:flex;align-items:center;justify-content:center;padding:20px;z-index:99999}.dw-payment-modal{width:min(410px,100%);background:#fff;border-radius:17px;padding:27px;position:relative;box-shadow:0 25px 80px rgba(0,0,0,.22)}.dw-payment-modal h2{margin:0 0 3px;font-size:20px}.dw-payment-modal>p{margin:0 0 17px;color:#777;font-size:12px}.dw-payment-modal label{margin-bottom:11px}.dw-payment-icon{width:42px;height:42px;border-radius:12px;background:#e9f8ed;color:#159348;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:20px;margin-bottom:10px}.dw-modal-close{position:absolute;right:12px;top:12px;border:1px solid #ddd8d3;background:#fff;border-radius:50%;width:31px;height:31px;font-size:19px;cursor:pointer}.dw-payment-preview{background:#fff7eb;border:1px solid #f1dfc9;border-radius:9px;padding:10px;margin-bottom:12px;font-size:11px}.dw-payment-modal>.dw-primary{width:100%}.dw-footer-banner{margin-top:18px;border:1px solid #f0ddc8;background:linear-gradient(100deg,#fff8ed,#fffdf9);border-radius:13px;padding:13px 20px;display:flex;align-items:center;justify-content:space-between;text-align:center;color:#9b4c27}.dw-footer-banner span{font-size:27px}.dw-footer-banner strong{display:block;font-family:Georgia,serif;font-size:15px}.dw-footer-banner small{display:block;color:#5d6269;font-size:10px;margin-top:5px}.dw-note{margin-top:13px;padding:11px 13px;background:#fff8e5;border:1px solid #f0d991;border-radius:10px;color:#715d1c;font-size:10px;line-height:1.5}.dw-admin-login{min-height:100vh;background:radial-gradient(circle at 50% 0,#fff7ef 0,#f7f3ef 48%,#eee8e2 100%);display:flex;align-items:center;justify-content:center;padding:20px}.dw-admin-card.dw-login-card{width:min(390px,100%);text-align:center;padding:34px 30px}.dw-login-card .dw-logo-img{width:150px;height:70px;object-fit:contain;margin:0 auto 6px}.dw-login-card h1{margin:4px 0}.dw-login-card p{margin:0 0 22px}.dw-login-card form{display:flex;flex-direction:column;gap:9px;text-align:left}.dw-login-card input{padding:12px;border:1px solid #ddd3cc;border-radius:10px;font:inherit}.dw-login-card button{margin-top:4px}.dw-login-card small{display:block;margin-top:16px;color:#999}
      @media(max-width:1200px){.dw-sidebar{width:75px;min-width:75px;padding:18px 9px}.dw-side-brand{justify-content:center;border-bottom:0}.dw-side-brand img{width:48px}.dw-side-brand div,.dw-side-nav span,.dw-side-foot{display:none}.dw-side-quote{display:none}.dw-side-nav button{justify-content:center;padding:12px 5px;font-size:19px}.dw-stats{grid-template-columns:repeat(3,1fr)}.dw-customer-metrics{grid-template-columns:repeat(4,1fr)}.dw-customer-metrics>div:nth-child(n+5){display:none}}
      @media(max-width:900px){.dw-admin-top{height:auto;padding:13px 15px}.dw-today-chip{display:none}.dw-admin-wrap{padding:18px 15px 30px}.dw-admin-grid{grid-template-columns:1fr}.dw-add-card{order:2}.dw-customers-panel{order:1}.dw-welcome small{display:none}.dw-meal-grid{grid-template-columns:1fr}}
      @media(max-width:650px){.dw-sidebar{display:none}.dw-admin-top{align-items:flex-start}.dw-head-title h1{font-size:18px}.dw-head-title p{font-size:10px}.dw-mobile-logo{display:block}.dw-mobile-logo img{width:43px;height:43px;object-fit:contain}.dw-admin-actions{gap:5px}.dw-admin-actions>button{height:34px;padding:0 8px;font-size:9px}.dw-stats{grid-template-columns:1fr 1fr;gap:8px}.dw-stats>div{padding:11px 9px;gap:8px}.dw-stats i{width:35px;height:35px;font-size:16px}.dw-stats b{font-size:18px}.dw-stats small{display:none}.dw-welcome h2{font-size:16px}.dw-two{grid-template-columns:1fr}.dw-list-head{align-items:stretch;flex-direction:column}.dw-search{width:100%}.dw-customer-metrics{grid-template-columns:1fr 1fr}.dw-customer-metrics>div{display:block!important}.dw-customer-top{flex-wrap:wrap}.dw-status{margin-left:auto}.dw-more{display:none}.dw-location-line{white-space:normal}.dw-actions button{flex:1;min-width:44%}.dw-footer-banner{padding:12px}.dw-footer-banner span{display:none}.dw-footer-banner strong{font-size:12px}}
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