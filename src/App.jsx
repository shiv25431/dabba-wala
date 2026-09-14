import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import logo from "./assets/dabba-wala-logo.png";
import "./App.css";


function AdminPanel() {
  const today = new Date().toISOString().slice(0, 10);
  const [loggedIn, setLoggedIn] = useState(() => localStorage.getItem("dw_admin_auth") === "1");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
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
  const [editCustomer, setEditCustomer] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [planDate, setPlanDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10);
  });
  const [planMeal, setPlanMeal] = useState("morning");
  const [mealPlans, setMealPlans] = useState(() => {
    try { return JSON.parse(localStorage.getItem("dw_meal_plans") || "{}"); } catch { return {}; }
  });
  const [planSearch, setPlanSearch] = useState("");
  const [bulkDate, setBulkDate] = useState(today);
  const [activeSection, setActiveSection] = useState("dashboard");

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
      setLoginError("");
      setLoggedIn(true); setPassword("");
    } else setLoginError("Incorrect admin PIN. Please try again.");
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

  const openEditCustomer = (c) => {
    setEditCustomer(c);
    setEditForm({
      name:c.name || "", mobile:c.mobile || "", address:c.address || "", area:c.area || "",
      plan:c.plan || "Monthly Subscription", ratePerTiffin:String(c.ratePerTiffin || 50),
      totalTiffins:String(c.totalTiffins || 0), totalAmount:String(c.totalAmount || 0),
      paidAmount:String(c.paidAmount || 0), startDate:c.startDate || today, notes:c.notes || ""
    });
  };

  const recalcEditAmount = (field, value) => {
    const next = { ...editForm, [field]: value };
    if (field === "ratePerTiffin" || field === "totalTiffins") {
      const rate = Number(field === "ratePerTiffin" ? value : editForm.ratePerTiffin) || 0;
      const qty = Number(field === "totalTiffins" ? value : editForm.totalTiffins) || 0;
      next.totalAmount = String(rate * qty);
    }
    setEditForm(next);
  };

  const saveEditedCustomer = (e) => {
    e.preventDefault();
    if (!editCustomer || !editForm) return;
    const mobile = editForm.mobile.replace(/\D/g, "");
    const rate = Number(editForm.ratePerTiffin), qty = Number(editForm.totalTiffins);
    const total = Number(editForm.totalAmount), paid = Math.min(Math.max(Number(editForm.paidAmount || 0),0), total);
    if (!editForm.name.trim() || mobile.length !== 10 || !editForm.address.trim() || !rate || !qty || !total || !editForm.startDate) {
      alert("Name, 10-digit mobile, address, rate, total tiffins and start date are required."); return;
    }
    const start = new Date(editForm.startDate + "T00:00:00");
    const end = new Date(start);
    if (editForm.plan === "Monthly Subscription") end.setDate(end.getDate() + 30);

    const next = customers.map(x => x.id === editCustomer.id ? {
      ...x, name:editForm.name.trim(), mobile, address:editForm.address.trim(), area:editForm.area.trim(),
      plan:editForm.plan, ratePerTiffin:rate, totalTiffins:qty, totalAmount:total, paidAmount:paid,
      paymentStatus:paymentStatus({...x,totalAmount:total,paidAmount:paid}), startDate:editForm.startDate,
      endDate:end.toISOString().slice(0,10), notes:editForm.notes.trim()
    } : x);
    saveCustomers(next);
    setSelectedCustomer(next.find(x => x.id === editCustomer.id) || null);
    if (selectedDate < editForm.startDate) setSelectedDate(editForm.startDate);
    setEditCustomer(null);
    setEditForm(null);
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
    if (date < c.startDate) { alert(`Daily entry cannot be added before the customer start date (${c.startDate}).`); return; }
    const day = c.dailyRecords?.[date] || {morning:"Not Updated",evening:"Not Updated"};
    const next = customers.map(x => x.id === c.id ? {
      ...x, dailyRecords:{...(x.dailyRecords||{}),[date]:{...day,[meal]:status}}
    } : x);
    saveCustomers(next);
    setSelectedCustomer(next.find(x => x.id === c.id) || null);
  };

  const fullDayOff = (c,date) => {
    if (date < c.startDate) { alert(`Daily entry cannot be added before the customer start date (${c.startDate}).`); return; }
    const next = customers.map(x => x.id === c.id ? {
      ...x,dailyRecords:{...(x.dailyRecords||{}),[date]:{morning:"OFF",evening:"OFF"}}
    } : x);
    saveCustomers(next);
    setSelectedCustomer(next.find(x => x.id === c.id) || null);
  };

  const eligibleCustomers = (date) => customers.filter(c => {
    const startOk = !c.startDate || date >= c.startDate;
    const endOk = !c.endDate || date <= c.endDate;
    return c.status === "Active" && startOk && endOk;
  });

  const planKey = `${planDate}_${planMeal}`;
  const plannedIds = mealPlans[planKey] || [];
  const setPlanned = (id, checked) => {
    const current = new Set(mealPlans[planKey] || []);
    if (checked) current.add(id); else current.delete(id);
    const next = {...mealPlans, [planKey]: Array.from(current)};
    setMealPlans(next);
    localStorage.setItem("dw_meal_plans", JSON.stringify(next));
  };
  const selectAllPlanned = () => {
    const ids = eligibleCustomers(planDate).filter(c => [c.name,c.mobile,c.area,c.address].join(" ").toLowerCase().includes(planSearch.toLowerCase())).map(c => c.id);
    const next = {...mealPlans, [planKey]: ids};
    setMealPlans(next); localStorage.setItem("dw_meal_plans", JSON.stringify(next));
  };
  const clearPlanned = () => {
    const next = {...mealPlans, [planKey]: []};
    setMealPlans(next); localStorage.setItem("dw_meal_plans", JSON.stringify(next));
  };
  const openDeliveryPrint = () => {
    const list = eligibleCustomers(planDate).filter(c => plannedIds.includes(c.id));
    if (!list.length) { alert("Please tick at least one customer first."); return; }
    const mealLabel = planMeal === "morning" ? "Morning Tiffin" : "Evening Tiffin";
    const rows = list.map((c,i) => `<tr><td>${i+1}</td><td><b>${String(c.name||"").replace(/</g,"&lt;")}</b><br><span>${String(c.area||"").replace(/</g,"&lt;")}</span></td><td>${c.mobile||""}</td><td>${String(c.address||"").replace(/</g,"&lt;")}</td><td class="deliver">☐ DELIVER</td></tr>`).join("");
    const win = window.open("", "_blank", "width=1000,height=800");
    if (!win) { alert("Please allow pop-ups for Dabba Wala admin to generate the PDF."); return; }
    win.document.write(`<!doctype html><html><head><title>Dabba Wala Delivery List</title><style>body{font-family:Arial,sans-serif;padding:28px;color:#222}h1{margin:0 0 4px;font-size:24px}p{margin:4px 0 18px;color:#666}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #ccc;padding:9px;text-align:left;vertical-align:top}th{background:#f5f5f5}.deliver{font-weight:800;white-space:nowrap}span{color:#777;font-size:10px}@media print{button{display:none}}</style></head><body><h1>🍱 Dabba Wala – Delivery List</h1><p><b>Date:</b> ${planDate} &nbsp; | &nbsp; <b>Meal:</b> ${mealLabel} &nbsp; | &nbsp; <b>Total:</b> ${list.length} Tiffin${list.length===1?"":"s"}</p><table><thead><tr><th>#</th><th>Customer</th><th>Contact</th><th>Delivery Address</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table><script>window.onload=()=>setTimeout(()=>window.print(),250)</script></body></html>`);
    win.document.close();
  };

  const quickDateFor = (meal) => {
    const d = new Date(); if (meal === "morning") d.setDate(d.getDate()+1); return d.toISOString().slice(0,10);
  };
  const openQuickPlan = (meal) => { setPlanMeal(meal); setPlanDate(quickDateFor(meal)); setPlanSearch(""); setActiveSection("planning"); };
  const setBulkMeal = (c, meal, status) => setMeal(c, bulkDate, meal, status);

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

  if (!loggedIn) return <div className="dw-login-page">
    <style>{`
      .dw-login-page{min-height:100vh;background:#fbf8f1;display:grid;grid-template-columns:1fr 1fr;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#163f2d;overflow:hidden}
      .dw-login-left{display:flex;flex-direction:column;justify-content:center;padding:56px clamp(28px,6vw,90px);position:relative;background:linear-gradient(145deg,#fffdf8 0%,#f8f5ec 100%)}
      .dw-login-left:before{content:"";position:absolute;width:420px;height:420px;border-radius:50%;background:rgba(229,239,218,.48);left:-210px;bottom:-180px}
      .dw-login-brand{display:flex;align-items:center;gap:14px;margin-bottom:44px;position:relative;z-index:1}
      .dw-login-brand img{width:68px;height:68px;object-fit:contain;border-radius:14px}
      .dw-login-brand strong{font-size:30px;line-height:1;font-weight:850;letter-spacing:-1.5px}.dw-login-brand strong span{color:#f26a22}.dw-login-brand small{display:block;margin-top:7px;color:#64716c;font-size:13px;font-weight:600;letter-spacing:.2px}
      .dw-login-copy{max-width:540px;position:relative;z-index:1}.dw-login-copy .eyebrow{display:inline-flex;align-items:center;gap:7px;background:#eaf4e5;color:#1c6a45;border-radius:999px;padding:8px 13px;font-size:12px;font-weight:800;margin-bottom:18px}.dw-login-copy h1{font-size:clamp(38px,4.3vw,60px);line-height:1.03;letter-spacing:-2.5px;margin:0 0 18px;color:#174b34}.dw-login-copy h1 span{color:#f26a22}.dw-login-copy p{font-size:17px;line-height:1.65;color:#65716d;max-width:490px;margin:0}.dw-login-features{display:flex;gap:24px;flex-wrap:wrap;margin-top:34px;position:relative;z-index:1}.dw-login-feature{display:flex;align-items:center;gap:9px;color:#41534b;font-size:13px;font-weight:750}.dw-login-feature b{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:#e6f1df;color:#237049}
      .dw-login-right{background:linear-gradient(145deg,#075b39 0%,#0c442f 100%);position:relative;display:flex;align-items:center;justify-content:center;padding:40px;overflow:hidden}.dw-login-right:before,.dw-login-right:after{content:"";position:absolute;border-radius:50%;border:1px solid rgba(255,255,255,.13)}.dw-login-right:before{width:520px;height:520px;right:-260px;top:-210px}.dw-login-right:after{width:420px;height:420px;left:-260px;bottom:-230px}
      .dw-login-panel{width:min(440px,100%);background:rgba(255,255,255,.98);border-radius:28px;padding:38px;box-shadow:0 28px 70px rgba(0,0,0,.24);position:relative;z-index:2}.dw-login-panel .panel-icon{width:58px;height:58px;border-radius:17px;background:#eaf5e8;display:grid;place-items:center;font-size:27px;margin-bottom:20px}.dw-login-panel h2{margin:0;color:#174b34;font-size:30px;letter-spacing:-.8px}.dw-login-panel .sub{margin:8px 0 28px;color:#77827d;font-size:13px;line-height:1.5}.dw-login-field{display:block;margin-bottom:17px}.dw-login-field span{display:block;font-size:12px;font-weight:800;color:#35443e;margin-bottom:7px}.dw-login-field input{width:100%;box-sizing:border-box;border:1px solid #d9e0db;border-radius:13px;padding:14px 15px;font-size:15px;outline:none;background:#fbfcfb;color:#20382d}.dw-login-field input:focus{border-color:#248052;box-shadow:0 0 0 4px rgba(36,128,82,.1)}.dw-login-submit{width:100%;border:0;border-radius:13px;padding:14px 18px;background:#087342;color:#fff;font-size:15px;font-weight:850;cursor:pointer;box-shadow:0 9px 20px rgba(8,115,66,.22);transition:.2s}.dw-login-submit:hover{background:#075e36;transform:translateY(-1px)}.dw-login-error{background:#fff0ed;color:#b53b2c;border:1px solid #ffd2ca;padding:10px 12px;border-radius:10px;font-size:12px;font-weight:700;margin:-5px 0 15px}.dw-login-secure{display:flex;align-items:center;justify-content:center;gap:7px;margin-top:20px;padding-top:17px;border-top:1px solid #edf0ed;color:#738078;font-size:11px;font-weight:700}.dw-login-right-brand{position:absolute;top:34px;right:42px;color:#fff;font-size:13px;font-weight:800;opacity:.9;z-index:1}.dw-login-tiffin{position:absolute;right:8%;bottom:4%;font-size:150px;filter:drop-shadow(0 18px 18px rgba(0,0,0,.2));transform:rotate(-7deg);opacity:.94;z-index:1}.dw-login-slogan{position:absolute;left:9%;bottom:9%;color:rgba(255,255,255,.88);font-size:18px;font-weight:800;line-height:1.35;z-index:1}.dw-login-slogan span{color:#ff8a42}
      @media(max-width:850px){.dw-login-page{grid-template-columns:1fr}.dw-login-right{min-height:560px;padding:24px}.dw-login-left{padding:38px 24px}.dw-login-copy h1{font-size:43px}.dw-login-brand{margin-bottom:34px}.dw-login-tiffin{font-size:100px;right:5%;bottom:3%}.dw-login-slogan{left:6%;bottom:7%;font-size:14px}.dw-login-right-brand{top:20px;right:22px}.dw-login-panel{padding:28px 22px;border-radius:22px}}
      @media(max-width:480px){.dw-login-left{padding:28px 20px}.dw-login-brand img{width:56px;height:56px}.dw-login-brand strong{font-size:25px}.dw-login-copy h1{font-size:36px}.dw-login-copy p{font-size:15px}.dw-login-features{gap:12px}.dw-login-feature{font-size:11px}.dw-login-right{min-height:520px}.dw-login-panel h2{font-size:26px}}
    `}</style>
    <section className="dw-login-left">
      <div className="dw-login-brand"><img src={logo} alt="Dabba Wala Logo"/><div><strong>Dabba<span>Wala</span></strong><small>Homely Food, Happier You</small></div></div>
      <div className="dw-login-copy">
        <div className="eyebrow">🔐 OWNER ACCESS</div>
        <h1>Manage your <span>Dabba Wala</span> business with ease.</h1>
        <p>Customers, daily deliveries, meal planning and payments — everything you need in one simple admin dashboard.</p>
      </div>
      <div className="dw-login-features"><div className="dw-login-feature"><b>✓</b>Customer Management</div><div className="dw-login-feature"><b>✓</b>Daily Delivery</div><div className="dw-login-feature"><b>✓</b>Payment Tracking</div></div>
    </section>
    <section className="dw-login-right">
      <div className="dw-login-right-brand">🛡️ Secure Admin Panel</div>
      <div className="dw-login-slogan">Good Food<br/><span>Builds Better Days</span></div>
      <div className="dw-login-tiffin">🍱</div>
      <div className="dw-login-panel">
        <div className="panel-icon">👤</div>
        <h2>Welcome back</h2>
        <p className="sub">Sign in to continue to your Dabba Wala owner dashboard.</p>
        {loginError && <div className="dw-login-error">{loginError}</div>}
        <form onSubmit={login}>
          <label className="dw-login-field"><span>ADMIN PIN</span><input type="password" placeholder="Enter your admin PIN" value={password} onChange={e=>setPassword(e.target.value)} autoFocus/></label>
          <button className="dw-login-submit" type="submit">Login to Admin&nbsp; →</button>
        </form>
        <div className="dw-login-secure">🔒 Owner access only &nbsp;•&nbsp; Protected dashboard</div>
      </div>
    </section>
  </div>;

  return <div className="dw-admin-page">
    <aside className="dw-sidebar">
      <div className="dw-side-brand">
        <img src={logo} alt="Dabba Wala Logo" />
        <div><strong>Dabba Wala</strong><span>OWNER DASHBOARD</span></div>
      </div>
      <nav className="dw-side-nav">
        <button className={activeSection==="dashboard" ? "active" : ""} onClick={()=>setActiveSection("dashboard")}>⌂ <span>Dashboard</span></button>
        <button className={activeSection==="add" ? "active" : ""} onClick={()=>setActiveSection("add")}>＋ <span>Add Customer</span></button>
        <button className={activeSection==="customers" ? "active" : ""} onClick={()=>setActiveSection("customers")}>♟ <span>Customers</span></button>
        <button className={activeSection==="planning" ? "active" : ""} onClick={()=>setActiveSection("planning")}>✓ <span>Meal Planning</span></button>
        <button className={activeSection==="daily" ? "active" : ""} onClick={()=>setActiveSection("daily")}>▣ <span>Daily Delivery</span></button>
        <button className={activeSection==="payments" ? "active" : ""} onClick={()=>setActiveSection("payments")}>₹ <span>Payments</span></button>
      </nav>
      <div className="dw-side-quote"><div>🍱</div><strong>Good Food<br/>Builds Better Days</strong><span>❤️</span></div>
      <div className="dw-side-foot">Dabba Wala<br/><small>Fresh • Homely • Healthy</small></div>
    </aside>

    <div className="dw-dashboard-shell">
      <header className="dw-admin-top">
        <div className="dw-head-title"><div className="dw-mobile-logo"><img src={logo} alt="Dabba Wala"/></div><div><h1>Owner Dashboard</h1><p>Customer, Tiffin & Payment Management</p></div></div>
        <div className="dw-mobile-nav">
          <button className={activeSection==="dashboard"?"active":""} onClick={()=>setActiveSection("dashboard")}>⌂</button>
          <button className={activeSection==="add"?"active":""} onClick={()=>setActiveSection("add")}>＋</button>
          <button className={activeSection==="customers"?"active":""} onClick={()=>setActiveSection("customers")}>♟</button>
          <button className={activeSection==="planning"?"active":""} onClick={()=>setActiveSection("planning")}>✓</button>
          <button className={activeSection==="daily"?"active":""} onClick={()=>setActiveSection("daily")}>▣</button>
          <button className={activeSection==="payments"?"active":""} onClick={()=>setActiveSection("payments")}>₹</button>
        </div>
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

      <main className="dw-admin-wrap">
        {activeSection === "dashboard" && <>
          <div className="dw-welcome"><div><span>Good day, Owner 👋</span><h2>Manage your Dabba Wala business</h2></div><small>Choose a section from the menu to manage your business.</small></div>
          <div className="dw-stats">
            <div className="stat-blue"><i>♟</i><div><b>{customers.length}</b><span>Total Customers</span><small>All registered customers</small></div></div>
            <div className="stat-green"><i>●</i><div><b>{active}</b><span>Active Subscriptions</span><small>Currently active</small></div></div>
            <div className="stat-orange"><i>▣</i><div><b>{totalRemaining}</b><span>Tiffins Remaining</span><small>Across all customers</small></div></div>
            <div className="stat-paid"><i>₹</i><div><b>₹{totalPaid.toLocaleString("en-IN")}</b><span>Total Paid</span><small>Amount received</small></div></div>
            <div className="stat-pending"><i>₹</i><div><b>₹{totalPending.toLocaleString("en-IN")}</b><span>Total Pending</span><small>Amount due</small></div></div>
          </div>
          <div className="dw-dashboard-actions">
            <button onClick={()=>setActiveSection("daily")}><span>▣</span><b>Daily Delivery</b><small>Update today's tiffins</small></button>
            <button onClick={()=>setActiveSection("add")}><span>＋</span><b>Add Customer</b><small>Register a new customer</small></button>
            <button onClick={()=>setActiveSection("customers")}><span>♟</span><b>Customers</b><small>View & manage customers</small></button>
            <button onClick={()=>setActiveSection("payments")}><span>₹</span><b>Payments</b><small>Track paid & pending</small></button>
          </div>
        </>}

        {activeSection === "planning" && <section className="dw-admin-card dw-planning-card" id="dw-planning">
          <div className="dw-section-title"><div className="dw-section-icon green">✓</div><div><h2>Meal Planning & Delivery List</h2><p>Raat ko next day aur shaam ko tonight ke customers tick karo, phir delivery PDF nikalo.</p></div></div>
          <div className="dw-plan-presets"><button onClick={()=>openQuickPlan("morning")}>🌙 Plan Tomorrow Morning</button><button onClick={()=>openQuickPlan("evening")}>☀️ Plan Today Evening</button></div>
          <div className="dw-plan-toolbar"><label>Date<input type="date" value={planDate} onChange={e=>setPlanDate(e.target.value)}/></label><label>Meal<select value={planMeal} onChange={e=>setPlanMeal(e.target.value)}><option value="morning">Morning Tiffin</option><option value="evening">Evening Tiffin</option></select></label><div className="dw-plan-search"><span>⌕</span><input placeholder="Search customer..." value={planSearch} onChange={e=>setPlanSearch(e.target.value)}/></div></div>
          <div className="dw-plan-actions"><button onClick={selectAllPlanned}>✓ Select All</button><button onClick={clearPlanned}>Clear</button><strong>{plannedIds.length} selected</strong><button className="dw-pdf-btn" onClick={openDeliveryPrint}>▣ Generate Delivery PDF</button></div>
          <div className="dw-plan-list">{eligibleCustomers(planDate).filter(c=>[c.name,c.mobile,c.area,c.address].join(" ").toLowerCase().includes(planSearch.toLowerCase())).map(c=>{const checked=plannedIds.includes(c.id);return <label className={`dw-plan-row ${checked?"checked":""}`} key={c.id}><input type="checkbox" checked={checked} onChange={e=>setPlanned(c.id,e.target.checked)}/><span className="dw-plan-check">{checked?"✓":""}</span><div><b>{c.name}</b><small>☎ {c.mobile} {c.area?`• ${c.area}`:""}</small><em>{c.address}</em></div><strong>{remaining(c)} left</strong></label>})}</div>
          {eligibleCustomers(planDate).filter(c=>[c.name,c.mobile,c.area,c.address].join(" ").toLowerCase().includes(planSearch.toLowerCase())).length===0 && <div className="dw-empty">No active customers eligible for this date.</div>}
        </section>} 

        {activeSection === "daily" && <section className="dw-admin-card dw-quick-daily-card" id="dw-quick-daily">
          <div className="dw-list-head"><div className="dw-section-title"><div className="dw-section-icon blue">▣</div><div><h2>Quick Daily Delivery</h2><p>Ek hi screen se sabhi customers ka Morning / Evening update karo.</p></div></div><label className="dw-bulk-date">Date<input type="date" value={bulkDate} onChange={e=>setBulkDate(e.target.value)}/></label></div>
          <div className="dw-bulk-list">{eligibleCustomers(bulkDate).map(c=>{const rec=c.dailyRecords?.[bulkDate]||{};return <div className="dw-bulk-row" key={c.id}><div className="dw-bulk-customer"><span>{(c.name||"C").slice(0,2).toUpperCase()}</span><div><b>{c.name}</b><small>☎ {c.mobile} • {remaining(c)} tiffins left</small></div></div><div className="dw-bulk-meal"><label>☀️ Morning <button className={rec.morning==="Delivered"?"active":""} onClick={()=>setBulkMeal(c,"morning","Delivered")}>✓</button><button className={rec.morning==="OFF"?"active off":""} onClick={()=>setBulkMeal(c,"morning","OFF")}>OFF</button></label><label>🌙 Evening <button className={rec.evening==="Delivered"?"active":""} onClick={()=>setBulkMeal(c,"evening","Delivered")}>✓</button><button className={rec.evening==="OFF"?"active off":""} onClick={()=>setBulkMeal(c,"evening","OFF")}>OFF</button></label></div></div>})}</div>
          {eligibleCustomers(bulkDate).length===0 && <div className="dw-empty">No active customers for this date.</div>}
        </section>}

        {activeSection === "add" && <section className="dw-admin-grid dw-single-grid">
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
        </section>}

        {activeSection === "customers" && <section className="dw-admin-card dw-customers-panel dw-full-panel" id="dw-customers">
            <div className="dw-list-head"><div className="dw-section-title"><div className="dw-section-icon orange">●●</div><div><h2>Customers</h2><p>Search and manage customer accounts.</p></div></div><div className="dw-search"><span>⌕</span><input placeholder="Search by name, mobile, area..." value={search} onChange={e=>setSearch(e.target.value)}/></div></div>
            {filtered.length===0 ? <div className="dw-empty">No customers found.<br/><small>Add your first customer from the form.</small></div> :
              <div className="dw-customer-cards">{filtered.map(c=>{
                const pay=paymentStatus(c), rem=remaining(c), total=Number(c.totalTiffins||0), percent=total?Math.round((rem/total)*100):0;
                return <div className="dw-customer-card" key={c.id}>
                  <div className="dw-customer-top"><div className="dw-avatar">{(c.name||"C").slice(0,2).toUpperCase()}</div><div className="dw-customer-info"><h3>{c.name}</h3><div className="dw-contact-line">☎ {c.mobile} <span>◉</span></div><div className="dw-location-line">⌖ {c.area||"Area not set"} <span>⌂ {c.address}</span></div></div><span className={`dw-status ${pay.toLowerCase().replace(" ","-")}`}>{pay}</span><button className="dw-more" title="Edit customer" onClick={()=>openEditCustomer(c)}>•••</button></div>
                  <div className="dw-customer-metrics">
                    <div><b>{c.totalTiffins}</b><span>Total Tiffins</span></div><div><b>{used(c)}</b><span>Used</span></div><div className="remaining-metric"><b>{rem}</b><span>Remaining</span><div className="dw-progress"><i style={{width:`${percent}%`}}></i></div><small>{percent}%</small></div><div><b>₹{c.ratePerTiffin}</b><span>Per Tiffin</span></div><div><b>₹{Number(c.totalAmount||0).toLocaleString("en-IN")}</b><span>Total Amount</span></div><div className="paid-metric"><b>₹{Number(c.paidAmount||0).toLocaleString("en-IN")}</b><span>Paid</span></div><div className="pending-metric"><b>₹{pending(c).toLocaleString("en-IN")}</b><span>Pending</span></div>
                  </div>
                  <div className="dw-actions"><button className="daily" onClick={()=>{setSelectedCustomer(c);setSelectedDate(selectedDate < c.startDate ? c.startDate : selectedDate);setActiveSection("daily")}}>▣ Daily Update</button><button className="payment" onClick={()=>setEditPayment(c)}>₹ Payment</button><button className="dw-edit" onClick={()=>openEditCustomer(c)}>✎ Edit</button><button className="dw-wa" onClick={()=>sendMessage(c)}>◉ WhatsApp</button><button className="dw-delete" onClick={()=>removeCustomer(c.id)}>♜ Delete</button></div>
                </div>;
              })}</div>}
        </section>}

        {activeSection === "payments" && <section className="dw-admin-card dw-payments-panel" id="dw-payments">
          <div className="dw-section-title"><div className="dw-section-icon green">₹</div><div><h2>Payments</h2><p>Track customer payments and pending balances.</p></div></div>
          <div className="dw-payment-list">
            {customers.length === 0 ? <div className="dw-empty">No customers found.</div> : customers.map(c => (
              <div className="dw-payment-row" key={c.id}>
                <div className="dw-payment-customer"><span className="dw-avatar">{(c.name||"C").slice(0,2).toUpperCase()}</span><div><b>{c.name}</b><small>☎ {c.mobile}</small></div></div>
                <div className="dw-payment-number"><small>Total</small><b>₹{Number(c.totalAmount||0).toLocaleString("en-IN")}</b></div>
                <div className="dw-payment-number paid"><small>Paid</small><b>₹{Number(c.paidAmount||0).toLocaleString("en-IN")}</b></div>
                <div className="dw-payment-number pending"><small>Pending</small><b>₹{pending(c).toLocaleString("en-IN")}</b></div>
                <span className={`dw-status ${paymentStatus(c).toLowerCase().replace(" ","-")}`}>{paymentStatus(c)}</span>
                <button className="payment" onClick={()=>setEditPayment(c)}>₹ Update Payment</button>
              </div>
            ))}
          </div>
        </section>}

        {selectedCustomer && activeSection === "daily" && <section className="dw-admin-card dw-daily-card" id="dw-daily">
          <div className="dw-daily-head"><div><div className="dw-section-title"><div className="dw-section-icon blue">▣</div><div><h2>Daily Tiffin Update</h2><p>{selectedCustomer.name} • {used(selectedCustomer)} used • <strong>{remaining(selectedCustomer)} remaining</strong></p></div></div></div><button className="dw-close-btn" onClick={()=>setSelectedCustomer(null)}>×</button></div>
          <div className="dw-date-control"><label>Select Date<input type="date" min={selectedCustomer.startDate} value={selectedDate < selectedCustomer.startDate ? selectedCustomer.startDate : selectedDate} onChange={e=>setSelectedDate(e.target.value)}/></label><button className="dw-off-btn" onClick={()=>fullDayOff(selectedCustomer,selectedDate)}>🟡 Mark Full Day OFF</button></div>
          <div className="dw-meal-grid">{["morning","evening"].map(meal=>{const status=selectedCustomer.dailyRecords?.[selectedDate]?.[meal]||"Not Updated";return <div className="dw-meal-card" key={meal}><div className="meal-icon">{meal==="morning"?"☀️":"🌙"}</div><div><h3>{meal==="morning"?"Morning Tiffin":"Evening Tiffin"}</h3><strong className={`meal-${status.toLowerCase().replace(" ","-")}`}>{status}</strong></div><div className="meal-actions"><button onClick={()=>setMeal(selectedCustomer,selectedDate,meal,"Delivered")}>✓ Delivered</button><button onClick={()=>setMeal(selectedCustomer,selectedDate,meal,"OFF")}>OFF</button></div></div>})}</div>
          <div className="dw-daily-note"><b>How it works:</b> Delivered = 1 tiffin used. OFF / Not Updated = balance does not decrease. Sunday can be used for one meal only according to the service schedule.</div>
        </section>}

        {editCustomer && editForm && <div className="dw-modal-overlay" onClick={()=>{setEditCustomer(null);setEditForm(null)}}><div className="dw-payment-modal dw-edit-customer-modal" onClick={e=>e.stopPropagation()}>
          <button className="dw-modal-close" onClick={()=>{setEditCustomer(null);setEditForm(null)}}>×</button><div className="dw-payment-icon">✎</div><h2>Edit Customer</h2><p>Update details for {editCustomer.name}</p>
          <form onSubmit={saveEditedCustomer} className="dw-edit-form">
            <div className="dw-two"><label>Customer Name *<input required value={editForm.name} onChange={e=>setEditForm({...editForm,name:e.target.value})}/></label><label>WhatsApp Mobile *<input required inputMode="numeric" maxLength="10" value={editForm.mobile} onChange={e=>setEditForm({...editForm,mobile:e.target.value.replace(/\D/g,"")})}/></label></div>
            <label>Delivery Address *<textarea required rows="2" value={editForm.address} onChange={e=>setEditForm({...editForm,address:e.target.value})}/></label>
            <div className="dw-two"><label>Area<input value={editForm.area} onChange={e=>setEditForm({...editForm,area:e.target.value})}/></label><label>Plan<select value={editForm.plan} onChange={e=>setEditForm({...editForm,plan:e.target.value})}><option>Monthly Subscription</option><option>Custom Subscription</option><option>First Meal Trial</option></select></label></div>
            <div className="dw-two"><label>Rate / Tiffin (₹) *<input type="number" min="1" value={editForm.ratePerTiffin} onChange={e=>recalcEditAmount("ratePerTiffin",e.target.value)}/></label><label>Total Tiffins *<input type="number" min="1" value={editForm.totalTiffins} onChange={e=>recalcEditAmount("totalTiffins",e.target.value)}/></label></div>
            <div className="dw-two"><label>Total Amount (₹)<input type="number" min="0" value={editForm.totalAmount} onChange={e=>setEditForm({...editForm,totalAmount:e.target.value})}/></label><label>Paid Amount (₹)<input type="number" min="0" value={editForm.paidAmount} onChange={e=>setEditForm({...editForm,paidAmount:e.target.value})}/></label></div>
            <div className="dw-two"><label>Start Date *<input type="date" value={editForm.startDate} onChange={e=>setEditForm({...editForm,startDate:e.target.value})}/></label><label>Notes<input value={editForm.notes} onChange={e=>setEditForm({...editForm,notes:e.target.value})}/></label></div>
            <div className="dw-live-summary"><b>Updated Subscription Summary</b><strong>{editForm.totalTiffins} tiffins × ₹{editForm.ratePerTiffin} = ₹{editForm.totalAmount}</strong><span>Paid ₹{editForm.paidAmount} • Pending ₹{Math.max(0,Number(editForm.totalAmount||0)-Number(editForm.paidAmount||0))}</span></div>
            <button className="dw-primary" type="submit">✓ Save Changes</button>
          </form>
        </div></div>}

        {editPayment && <div className="dw-modal-overlay" onClick={()=>setEditPayment(null)}><div className="dw-payment-modal" onClick={e=>e.stopPropagation()}>
          <button className="dw-modal-close" onClick={()=>setEditPayment(null)}>×</button><div className="dw-payment-icon">₹</div><h2>Update Payment</h2><p>{editPayment.name}</p>
          <label>Total Amount<input readOnly value={`₹${editPayment.totalAmount}`}/></label>
          <label>Paid Amount<input id="dw-paid-input" type="number" min="0" max={editPayment.totalAmount} defaultValue={editPayment.paidAmount}/></label>
          <div className="dw-payment-preview">Pending after update: <b>₹{pending(editPayment)}</b></div>
          <button className="dw-primary" onClick={()=>updatePayment(editPayment,document.getElementById("dw-paid-input")?.value)}>Save Payment</button>
        </div></div>}

        {activeSection === "dashboard" && <section className="dw-footer-banner"><span>🍃</span><div><strong>“Thank you for being a part of Dabba Wala ❤️”</strong><small>Nutritious Meals &nbsp; | &nbsp; Timely Delivery &nbsp; | &nbsp; Happy Customers</small></div><span>🍱</span></section>}
        <div className="dw-note">⚠️ Current version stores customer/tiffin/payment data in this browser only. To show the same live balance on the customer's phone, we need a shared database connected to Admin and Customer Login.</div>
      </main>
    </div>

    <style>{`
      .dw-admin-page{min-height:100vh;background:#f8f7f5;color:#172033;display:flex;font-family:Inter,Arial,Helvetica,sans-serif}.dw-sidebar{width:218px;min-width:218px;background:#fff;border-right:1px solid #e9e5e1;display:flex;flex-direction:column;padding:20px 14px;box-sizing:border-box;position:sticky;top:0;height:100vh}.dw-side-brand{display:flex;align-items:center;gap:9px;padding:2px 5px 23px;border-bottom:1px solid #eee9e5}.dw-side-brand img{width:48px;height:48px;object-fit:contain}.dw-side-brand strong{display:block;font-size:18px;color:#123f35}.dw-side-brand span{display:block;font-size:8px;color:#ef6425;font-weight:900;letter-spacing:.8px;margin-top:2px}.dw-side-nav{display:flex;flex-direction:column;gap:5px;margin-top:22px}.dw-side-nav button{border:0;background:transparent;text-align:left;border-radius:11px;padding:12px 13px;color:#384252;font-weight:700;font-size:13px;display:flex;align-items:center;gap:12px;cursor:pointer}.dw-side-nav button:first-letter{font-size:18px}.dw-side-nav button:hover{background:#fff2e9;color:#e95d20}.dw-side-nav button.active{background:linear-gradient(135deg,#ff741c,#f35f20);color:#fff;box-shadow:0 7px 18px rgba(240,95,32,.18)}.dw-side-nav button span{font-size:13px}.dw-side-quote{margin-top:auto;border-radius:12px;background:linear-gradient(145deg,#fff6e9,#fffaf5);padding:17px 10px;text-align:center;border:1px solid #f1e3d2;color:#8b3d1e;font-family:Georgia,serif}.dw-side-quote div{font-size:25px;margin-bottom:5px}.dw-side-quote strong{font-size:16px;line-height:1.25}.dw-side-quote span{font-size:16px}.dw-side-foot{font-size:11px;color:#777;padding:17px 7px 0;line-height:1.5}.dw-side-foot small{color:#aaa}.dw-dashboard-shell{min-width:0;flex:1}.dw-admin-top{height:78px;background:#fff;border-bottom:1px solid #e8e3df;display:flex;align-items:center;justify-content:space-between;padding:0 27px;gap:20px;position:sticky;top:0;z-index:50}.dw-head-title{display:flex;align-items:center;gap:12px}.dw-head-title h1{margin:0;font-size:22px;letter-spacing:-.4px}.dw-head-title p{margin:3px 0 0;color:#707781;font-size:12px}.dw-mobile-logo{display:none}.dw-admin-actions{display:flex;align-items:center;gap:10px}.dw-today-chip,.dw-admin-actions>button{height:40px;border:1px solid #e3ddd8;background:#fff;border-radius:10px;padding:0 13px;font-weight:800;color:#30343b}.dw-today-chip{display:flex;align-items:center;gap:8px;font-size:11px}.dw-wa-toggle.on{border-color:#bfe8cc;background:#f3fff6;color:#07833d}.dw-wa-toggle.off{color:#777}.dw-logout:hover{border-color:#ef6a2b;color:#ef6a2b}.dw-admin-wrap{max-width:1450px;margin:auto;padding:24px 27px 40px}.dw-welcome{display:flex;align-items:end;justify-content:space-between;margin:0 0 18px}.dw-welcome span{font-size:11px;color:#e35d22;font-weight:900}.dw-welcome h2{margin:3px 0 0;font-size:20px}.dw-welcome small{color:#85898f;font-size:11px}.dw-stats{display:grid;grid-template-columns:repeat(5,1fr);gap:13px;margin-bottom:19px}.dw-stats>div{background:#fff;border:1px solid #e7e1dc;border-radius:14px;padding:14px 13px;display:flex;gap:12px;align-items:center;min-width:0;box-shadow:0 5px 18px rgba(34,28,22,.035);transition:.18s}.dw-stats>div:hover{transform:translateY(-2px);box-shadow:0 9px 25px rgba(34,28,22,.07)}.dw-stats i{width:43px;height:43px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:20px;font-weight:900;flex:none}.stat-blue i{background:#e5f1ff;color:#1971d4}.stat-green i{background:#e2f8eb;color:#19934e}.stat-orange i{background:#fff0df;color:#ed7621}.stat-paid i{background:#e5f8ec;color:#148b45}.stat-pending i{background:#ffe8ed;color:#d83d56}.dw-stats b,.dw-stats span,.dw-stats small{display:block}.dw-stats b{font-size:23px;line-height:1.05}.dw-stats span{font-size:11px;font-weight:800;margin-top:4px}.dw-stats small{font-size:9px;color:#8b9098;margin-top:3px}.stat-pending span,.stat-pending b{color:#c62f47}.dw-admin-grid{display:grid;grid-template-columns:minmax(340px,425px) minmax(0,1fr);gap:17px;align-items:start}.dw-admin-card{background:#fff;border:1px solid #e6e0dc;border-radius:16px;padding:19px;box-shadow:0 6px 24px rgba(32,27,22,.035)}.dw-section-title{display:flex;align-items:flex-start;gap:10px}.dw-section-title h2{margin:0;font-size:19px;letter-spacing:-.2px}.dw-section-title p{margin:4px 0 0;color:#777f88;font-size:11px;line-height:1.4}.dw-section-icon{width:36px;height:36px;border-radius:10px;background:#fff0e5;color:#ed6420;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;flex:none}.dw-section-icon.orange{font-size:13px}.dw-section-icon.blue{background:#e8f2ff;color:#2874c8}.dw-add-card form{display:flex;flex-direction:column;gap:10px;margin-top:17px}.dw-add-card label,.dw-payment-modal label,.dw-date-control label{display:flex;flex-direction:column;gap:5px;font-size:11px;font-weight:800;color:#26303b}.dw-add-card label em{color:#e34e2c;font-style:normal}.dw-add-card input,.dw-add-card textarea,.dw-add-card select,.dw-search input,.dw-payment-modal input,.dw-date-control input{width:100%;box-sizing:border-box;border:1px solid #ddd8d4;border-radius:9px;padding:10px 11px;background:#fff;font:inherit;font-size:12px;color:#252a31;outline:none;transition:.18s}.dw-add-card textarea{resize:vertical}.dw-add-card input:focus,.dw-add-card textarea:focus,.dw-add-card select:focus,.dw-search input:focus,.dw-payment-modal input:focus,.dw-date-control input:focus{border-color:#f36a26;box-shadow:0 0 0 3px rgba(243,106,38,.08)}.dw-input-icon{position:relative}.dw-input-icon span{position:absolute;left:11px;top:10px;color:#1aa04e;font-size:14px}.dw-input-icon input{padding-left:30px}.dw-two{display:grid;grid-template-columns:1fr 1fr;gap:9px}.dw-primary{border:0;border-radius:9px;padding:12px 14px;background:linear-gradient(135deg,#ff741b,#f15e20);color:#fff;font-weight:900;cursor:pointer;box-shadow:0 8px 18px rgba(240,95,32,.18);font-size:12px}.dw-primary:hover{transform:translateY(-1px)}.dw-live-summary{background:#fff8ee;border:1px solid #f2dfc9;border-radius:10px;padding:10px 12px;display:flex;flex-direction:column;gap:3px}.dw-live-summary b{font-size:11px;color:#c75420}.dw-live-summary strong{font-size:14px}.dw-live-summary span{font-size:10px;color:#777}.dw-list-head{display:flex;justify-content:space-between;align-items:center;gap:15px;margin-bottom:15px}.dw-search{position:relative;width:270px}.dw-search span{position:absolute;left:11px;top:9px;color:#7c8289;font-size:18px}.dw-search input{padding-left:31px}.dw-customer-cards{display:flex;flex-direction:column;gap:10px}.dw-customer-card{border:1px solid #e6e1dd;border-radius:14px;padding:14px;background:#fff;transition:.18s}.dw-customer-card:hover{border-color:#efc4a8;box-shadow:0 7px 20px rgba(35,29,24,.06)}.dw-customer-top{display:flex;align-items:flex-start;gap:10px}.dw-avatar{width:44px;height:44px;border-radius:50%;background:#e6f0ff;color:#3479c9;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:14px;flex:none}.dw-customer-card:nth-child(2n) .dw-avatar{background:#ffecef;color:#d05c71}.dw-customer-info{min-width:0;flex:1}.dw-customer-info h3{margin:1px 0 4px;font-size:16px}.dw-contact-line{font-size:11px;color:#303740}.dw-contact-line span{color:#15a34a;margin-left:5px}.dw-location-line{font-size:10px;color:#727a83;margin-top:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dw-location-line span{margin-left:10px}.dw-status{border-radius:999px;padding:6px 10px;font-size:10px;font-weight:900;white-space:nowrap}.dw-status.paid{background:#e6f8ed;color:#168340}.dw-status.half-payment{background:#fff3d6;color:#9b6b00}.dw-status.pending{background:#ffecef;color:#c72d45}.dw-more{border:1px solid #ddd8d3;background:#fff;border-radius:8px;width:30px;height:30px;color:#6e747b;font-weight:900}.dw-customer-metrics{display:grid;grid-template-columns:1fr 1fr 1.35fr 1fr 1.15fr 1.05fr 1.05fr;margin-top:13px;border-radius:10px;background:#f9fafb;overflow:hidden}.dw-customer-metrics>div{padding:9px 8px;border-right:1px solid #ece9e6;min-width:0}.dw-customer-metrics>div:last-child{border-right:0}.dw-customer-metrics b,.dw-customer-metrics span{display:block}.dw-customer-metrics b{font-size:14px}.dw-customer-metrics span{font-size:9px;color:#777;margin-top:3px}.paid-metric b,.paid-metric span{color:#168340}.pending-metric b,.pending-metric span{color:#d22e43}.remaining-metric{position:relative}.remaining-metric small{position:absolute;right:8px;bottom:8px;font-size:8px;color:#555}.dw-progress{height:5px;background:#e5e9ed;border-radius:99px;margin-top:6px;overflow:hidden;width:85%}.dw-progress i{display:block;height:100%;background:#18a653;border-radius:99px}.dw-actions{display:flex;gap:7px;margin-top:11px;flex-wrap:wrap}.dw-actions button,.dw-off-btn{border:1px solid #ded8d3;background:#fff;border-radius:8px;padding:8px 11px;cursor:pointer;font-weight:800;font-size:10px}.dw-actions button:hover{transform:translateY(-1px)}.dw-actions .daily{color:#1671d0;border-color:#acd0ff;background:#f4f9ff}.dw-actions .payment{color:#df7a00;border-color:#f1c97c;background:#fffaf0}.dw-actions .dw-wa{background:#19b957;color:#fff;border-color:#19b957}.dw-delete{color:#c52e42!important;border-color:#f1aeb8!important;background:#fff7f8!important}.dw-empty{padding:55px 20px;text-align:center;color:#777;border:1px dashed #dcd5cf;border-radius:12px;background:#fcfbfa;font-size:13px}.dw-empty small{font-size:10px;color:#aaa}.dw-daily-card{margin-top:18px}.dw-daily-head{display:flex;justify-content:space-between;align-items:center}.dw-close-btn{width:34px;height:34px;border:1px solid #ddd7d2;background:#fff;border-radius:9px;font-size:21px;color:#777;cursor:pointer}.dw-date-control{display:flex;align-items:end;gap:12px;margin:17px 0}.dw-date-control label{width:210px}.dw-off-btn{background:#fff8e2;border-color:#ecd48b;color:#765d11}.dw-meal-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.dw-meal-card{border:1px solid #e7e1dc;border-radius:12px;padding:14px;display:flex;align-items:center;gap:12px;background:#fcfbfa}.meal-icon{width:40px;height:40px;border-radius:11px;background:#fff0dd;display:flex;align-items:center;justify-content:center;font-size:20px}.dw-meal-card h3{margin:0 0 5px;font-size:14px}.dw-meal-card strong{font-size:10px}.meal-delivered{color:#16803b}.meal-off{color:#9a6800}.meal-not-updated{color:#777}.meal-actions{margin-left:auto;display:flex;gap:6px}.meal-actions button{border:1px solid #ddd6d1;background:#fff;border-radius:7px;padding:7px 9px;font-size:10px;font-weight:800;cursor:pointer}.dw-daily-note{margin-top:13px;background:#f8f7f5;border-radius:9px;padding:10px;font-size:10px;color:#6d7278;line-height:1.5}.dw-modal-overlay{position:fixed;inset:0;background:rgba(20,23,28,.56);display:flex;align-items:center;justify-content:center;padding:20px;z-index:99999}.dw-payment-modal{width:min(410px,100%);background:#fff;border-radius:17px;padding:27px;position:relative;box-shadow:0 25px 80px rgba(0,0,0,.22)}.dw-payment-modal h2{margin:0 0 3px;font-size:20px}.dw-payment-modal>p{margin:0 0 17px;color:#777;font-size:12px}.dw-payment-modal label{margin-bottom:11px}.dw-payment-icon{width:42px;height:42px;border-radius:12px;background:#e9f8ed;color:#159348;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:20px;margin-bottom:10px}.dw-modal-close{position:absolute;right:12px;top:12px;border:1px solid #ddd8d3;background:#fff;border-radius:50%;width:31px;height:31px;font-size:19px;cursor:pointer}.dw-payment-preview{background:#fff7eb;border:1px solid #f1dfc9;border-radius:9px;padding:10px;margin-bottom:12px;font-size:11px}.dw-payment-modal>.dw-primary{width:100%}.dw-footer-banner{margin-top:18px;border:1px solid #f0ddc8;background:linear-gradient(100deg,#fff8ed,#fffdf9);border-radius:13px;padding:13px 20px;display:flex;align-items:center;justify-content:space-between;text-align:center;color:#9b4c27}.dw-footer-banner span{font-size:27px}.dw-footer-banner strong{display:block;font-family:Georgia,serif;font-size:15px}.dw-footer-banner small{display:block;color:#5d6269;font-size:10px;margin-top:5px}.dw-note{margin-top:13px;padding:11px 13px;background:#fff8e5;border:1px solid #f0d991;border-radius:10px;color:#715d1c;font-size:10px;line-height:1.5}.dw-admin-login{min-height:100vh;background:radial-gradient(circle at 50% 0,#fff7ef 0,#f7f3ef 48%,#eee8e2 100%);display:flex;align-items:center;justify-content:center;padding:20px}.dw-admin-card.dw-login-card{width:min(390px,100%);text-align:center;padding:34px 30px}.dw-login-card .dw-logo-img{width:150px;height:70px;object-fit:contain;margin:0 auto 6px}.dw-login-card h1{margin:4px 0}.dw-login-card p{margin:0 0 22px}.dw-login-card form{display:flex;flex-direction:column;gap:9px;text-align:left}.dw-login-card input{padding:12px;border:1px solid #ddd3cc;border-radius:10px;font:inherit}.dw-login-card button{margin-top:4px}.dw-login-card small{display:block;margin-top:16px;color:#999}
      .dw-planning-card,.dw-quick-daily-card{margin-top:18px}.dw-section-icon.green{background:#e8f8ee;color:#168c47}.dw-plan-presets{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}.dw-plan-presets button{border:1px solid #cfe7d7;background:#f4fbf6;color:#167c40;border-radius:9px;padding:9px 12px;font-weight:800;font-size:11px;cursor:pointer}.dw-plan-toolbar{display:grid;grid-template-columns:160px 180px 1fr;gap:10px;align-items:end}.dw-plan-toolbar label,.dw-bulk-date{font-size:10px;font-weight:800;color:#555}.dw-plan-toolbar input,.dw-plan-toolbar select,.dw-plan-search input,.dw-bulk-date input{display:block;width:100%;box-sizing:border-box;margin-top:5px;border:1px solid #ddd8d4;border-radius:9px;padding:10px;background:#fff;font:inherit;font-size:12px}.dw-plan-search{position:relative}.dw-plan-search span{position:absolute;left:10px;bottom:9px;color:#777}.dw-plan-search input{padding-left:28px}.dw-plan-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:12px 0}.dw-plan-actions button{border:1px solid #ddd8d3;background:#fff;border-radius:8px;padding:8px 11px;font-size:10px;font-weight:800;cursor:pointer}.dw-plan-actions strong{font-size:11px;color:#777;margin-right:auto}.dw-plan-actions .dw-pdf-btn{background:#f36a26;color:#fff;border-color:#f36a26}.dw-plan-list{display:flex;flex-direction:column;gap:7px;max-height:340px;overflow:auto;padding-right:3px}.dw-plan-row{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid #e7e1dc;border-radius:10px;background:#fcfbfa;cursor:pointer}.dw-plan-row.checked{background:#f0fbf4;border-color:#a9dcb9}.dw-plan-row input{position:absolute;opacity:0;pointer-events:none}.dw-plan-check{width:22px;height:22px;border:2px solid #cfc8c2;border-radius:6px;display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;flex:none}.dw-plan-row.checked .dw-plan-check{background:#18a653;border-color:#18a653}.dw-plan-row>div{min-width:0;flex:1}.dw-plan-row b,.dw-plan-row small,.dw-plan-row em{display:block}.dw-plan-row b{font-size:12px}.dw-plan-row small{font-size:9px;color:#168c47;margin-top:2px}.dw-plan-row em{font-size:9px;color:#777;font-style:normal;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dw-plan-row>strong{font-size:10px;color:#16803b;white-space:nowrap}.dw-quick-daily-card .dw-list-head{margin-bottom:10px}.dw-bulk-date{width:150px}.dw-bulk-list{display:flex;flex-direction:column;gap:7px}.dw-bulk-row{display:flex;align-items:center;justify-content:space-between;gap:15px;padding:10px 12px;border:1px solid #e7e1dc;border-radius:10px;background:#fff}.dw-bulk-customer{display:flex;align-items:center;gap:9px;min-width:230px}.dw-bulk-customer>span{width:34px;height:34px;border-radius:50%;background:#eef5ff;color:#3479c9;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900}.dw-bulk-customer b,.dw-bulk-customer small{display:block}.dw-bulk-customer b{font-size:12px}.dw-bulk-customer small{font-size:9px;color:#777;margin-top:2px}.dw-bulk-meal{display:flex;gap:10px}.dw-bulk-meal label{display:flex;align-items:center;gap:4px;font-size:10px;font-weight:800;color:#555}.dw-bulk-meal button{border:1px solid #dcd6d1;background:#fff;border-radius:6px;min-width:29px;height:27px;font-size:10px;font-weight:900;cursor:pointer}.dw-bulk-meal button.active{background:#e8f8ee;border-color:#9bd4ac;color:#16803b}.dw-bulk-meal button.active.off{background:#fff5d9;border-color:#e8cf85;color:#8a6900}.dw-mobile-logo{display:none}
      .dw-dashboard-actions{display:grid;grid-template-columns:repeat(4,1fr);gap:13px;margin-top:18px}.dw-dashboard-actions button{border:1px solid #e6e0dc;background:#fff;border-radius:14px;padding:18px;text-align:left;cursor:pointer;box-shadow:0 5px 18px rgba(34,28,22,.035);transition:.18s}.dw-dashboard-actions button:hover{transform:translateY(-2px);border-color:#efc4a8;box-shadow:0 9px 25px rgba(34,28,22,.07)}.dw-dashboard-actions span{display:flex;width:40px;height:40px;border-radius:11px;background:#fff0e5;color:#ed6420;align-items:center;justify-content:center;font-size:20px;font-weight:900;margin-bottom:12px}.dw-dashboard-actions b,.dw-dashboard-actions small{display:block}.dw-dashboard-actions b{font-size:13px;color:#202833}.dw-dashboard-actions small{font-size:10px;color:#85898f;margin-top:4px}.dw-single-grid{display:block}.dw-full-panel{margin-top:0}.dw-payments-panel{margin-top:0}.dw-payment-list{display:flex;flex-direction:column;gap:8px;margin-top:17px}.dw-payment-row{display:grid;grid-template-columns:minmax(200px,1.5fr) .7fr .7fr .7fr auto auto;align-items:center;gap:14px;padding:12px;border:1px solid #e7e1dc;border-radius:11px;background:#fcfbfa}.dw-payment-customer{display:flex;align-items:center;gap:9px;min-width:0}.dw-payment-customer b,.dw-payment-customer small{display:block}.dw-payment-customer b{font-size:12px}.dw-payment-customer small{font-size:9px;color:#777;margin-top:2px}.dw-payment-number small,.dw-payment-number b{display:block}.dw-payment-number small{font-size:9px;color:#888}.dw-payment-number b{font-size:13px;margin-top:2px}.dw-payment-number.paid b{color:#168340}.dw-payment-number.pending b{color:#c72d45}.dw-payment-row .payment{border:1px solid #f1c97c;background:#fffaf0;color:#df7a00;border-radius:8px;padding:8px 10px;cursor:pointer;font-weight:800;font-size:10px}.dw-mobile-nav{display:none}
      @media(max-width:1200px){.dw-sidebar{width:75px;min-width:75px;padding:18px 9px}.dw-side-brand{justify-content:center;border-bottom:0}.dw-side-brand img{width:48px}.dw-side-brand div,.dw-side-nav span,.dw-side-foot{display:none}.dw-side-quote{display:none}.dw-side-nav button{justify-content:center;padding:12px 5px;font-size:19px}.dw-stats{grid-template-columns:repeat(3,1fr)}.dw-customer-metrics{grid-template-columns:repeat(4,1fr)}.dw-customer-metrics>div:nth-child(n+5){display:none}}
      @media(max-width:900px){.dw-admin-top{height:auto;padding:13px 15px}.dw-today-chip{display:none}.dw-admin-wrap{padding:18px 15px 30px}.dw-admin-grid{grid-template-columns:1fr}.dw-add-card{order:2}.dw-customers-panel{order:1}.dw-welcome small{display:none}.dw-meal-grid{grid-template-columns:1fr}}
      @media(max-width:700px){.dw-dashboard-actions{grid-template-columns:1fr 1fr}.dw-payment-row{grid-template-columns:1fr 1fr}.dw-payment-row .dw-payment-customer{grid-column:1/-1}.dw-payment-row .dw-status{justify-self:start}.dw-payment-row .payment{justify-self:end}.dw-plan-toolbar{grid-template-columns:1fr 1fr}.dw-plan-search{grid-column:1/-1}.dw-bulk-row{align-items:flex-start;flex-direction:column}.dw-bulk-meal{width:100%;justify-content:space-between}}
      @media(max-width:650px){.dw-sidebar{display:none}.dw-mobile-nav{display:flex;align-items:center;gap:3px;margin-left:auto;margin-right:4px}.dw-mobile-nav button{width:29px;height:30px;border:1px solid #e2ddd8;background:#fff;border-radius:7px;font-weight:900;font-size:12px;color:#666;cursor:pointer}.dw-mobile-nav button.active{background:#f36a26;color:#fff;border-color:#f36a26}.dw-admin-top{align-items:flex-start}.dw-head-title h1{font-size:18px}.dw-head-title p{font-size:10px}.dw-mobile-logo{display:block}.dw-mobile-logo img{width:43px;height:43px;object-fit:contain}.dw-admin-actions{gap:5px}.dw-admin-actions>button{height:34px;padding:0 8px;font-size:9px}.dw-stats{grid-template-columns:1fr 1fr;gap:8px}.dw-stats>div{padding:11px 9px;gap:8px}.dw-stats i{width:35px;height:35px;font-size:16px}.dw-stats b{font-size:18px}.dw-stats small{display:none}.dw-welcome h2{font-size:16px}.dw-two{grid-template-columns:1fr}.dw-list-head{align-items:stretch;flex-direction:column}.dw-search{width:100%}.dw-customer-metrics{grid-template-columns:1fr 1fr}.dw-customer-metrics>div{display:block!important}.dw-customer-top{flex-wrap:wrap}.dw-status{margin-left:auto}.dw-more{display:none}.dw-location-line{white-space:normal}.dw-actions button{flex:1;min-width:44%}.dw-footer-banner{padding:12px}.dw-footer-banner span{display:none}.dw-footer-banner strong{font-size:12px}}
    `}</style>
  </div>;
}


function CustomerPortal() {
  const today = new Date().toISOString().slice(0, 10);
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [customer, setCustomer] = useState(() => {
    const id = localStorage.getItem("dw_customer_auth");
    if (!id) return null;
    try {
      const list = JSON.parse(localStorage.getItem("dw_customers") || "[]");
      return list.find(c => String(c.id) === String(id)) || null;
    } catch { return null; }
  });
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(today);

  const used = (c) => Object.values(c?.dailyRecords || {}).reduce(
    (n, d) => n + (d?.morning === "Delivered" ? 1 : 0) + (d?.evening === "Delivered" ? 1 : 0), 0
  );

  const remaining = (c) => Math.max(0, Number(c?.totalTiffins || 0) - used(c));

  const paymentStatus = (c) => {
    const total = Number(c?.totalAmount || 0);
    const paid = Number(c?.paidAmount || 0);
    if (paid >= total && total > 0) return "Paid";
    if (paid > 0) return "Half Payment";
    return "Pending";
  };

  const subscriptionStatus = (c) => {
    if (!c?.endDate) return "Active";
    const end = new Date(c.endDate + "T23:59:59");
    return end >= new Date() && c.status !== "Expired" ? "Active" : "Expired";
  };

  const login = (e) => {
    e.preventDefault();
    setError("");
    const cleanMobile = mobile.replace(/\D/g, "");
    let list = [];
    try { list = JSON.parse(localStorage.getItem("dw_customers") || "[]"); } catch {}
    const found = list.find(c => c.mobile === cleanMobile && cleanMobile.length === 10);
    if (!found || password !== cleanMobile) {
      setError("Invalid mobile number or password.");
      return;
    }
    localStorage.setItem("dw_customer_auth", String(found.id));
    setCustomer(found);
    setPassword("");
  };

  const logout = () => {
    localStorage.removeItem("dw_customer_auth");
    setCustomer(null);
    setMobile("");
    setPassword("");
  };

  if (!customer) return (
    <div className="dw-customer-login-page">
      <div className="dw-login-decoration leaf-one">🌿</div>
      <div className="dw-login-decoration leaf-two">🍃</div>

      <div className="dw-login-layout">
        <section className="dw-login-showcase">
          <div className="dw-showcase-brand">
            <img src={logo} alt="Dabba Wala Logo" />
          </div>
          <div className="dw-showcase-content">
            <span className="dw-showcase-kicker">YOUR DAILY TIFFIN PARTNER</span>
            <h1>Fresh Homemade<br/><span>Meals, Every Day</span></h1>
            <p>Ghar jaisa khana, simple service aur timely delivery — made especially for your everyday routine.</p>

            <div className="dw-login-benefits">
              <div><b>🌿</b><span>Healthy<br/>Meals</span></div>
              <div><b>🏠</b><span>Homely<br/>Taste</span></div>
              <div><b>🛵</b><span>On-Time<br/>Delivery</span></div>
              <div><b>❤️</b><span>Made with<br/>Care</span></div>
            </div>
          </div>

          <div className="dw-food-visual">
            <div className="dw-food-plate">
              <div className="dw-food-bowl bowl-dal">🥣</div>
              <div className="dw-food-bowl bowl-rice">🍚</div>
              <div className="dw-food-bowl bowl-sabji">🍛</div>
              <div className="dw-food-bowl bowl-roti">🫓</div>
              <div className="dw-food-bowl bowl-salad">🥗</div>
            </div>
          </div>

          <div className="dw-showcase-quote">“Ghar jaisa khana,<br/>har din aapke liye.” <span>♥</span></div>
        </section>

        <section className="dw-login-panel">
          <div className="dw-customer-login-card">
            <div className="dw-login-user-icon">👤</div>
            <span className="dw-customer-login-tag">CUSTOMER LOGIN</span>
            <h2>Welcome to Dabba Wala</h2>
            <p>Check your tiffin subscription and payment status</p>

            <form onSubmit={login}>
              <label>
                Mobile Number
                <div className="dw-login-input-wrap">
                  <span>☎</span>
                  <input type="tel" inputMode="numeric" maxLength="10" placeholder="Enter your 10-digit mobile number" value={mobile} onChange={e => setMobile(e.target.value.replace(/\D/g, ""))} autoFocus />
                </div>
              </label>

              <label>
                Password
                <div className="dw-login-input-wrap">
                  <span>🔒</span>
                  <input type={showPassword ? "text" : "password"} inputMode="numeric" maxLength="10" placeholder="Your mobile number" value={password} onChange={e => setPassword(e.target.value.replace(/\D/g, ""))} />
                  <button type="button" className="dw-password-eye" onClick={() => setShowPassword(v => !v)} aria-label="Show password">{showPassword ? "🙈" : "👁"}</button>
                </div>
              </label>

              {error && <div className="dw-customer-login-error">⚠ {error}</div>}

              <button type="submit" className="dw-customer-login-submit">Login to My Account <span>→</span></button>
            </form>

            <div className="dw-login-divider"><span>OR</span></div>
            <button className="dw-back-home" onClick={() => window.location.href = "/"}>⌂ &nbsp; Back to Home</button>

            <div className="dw-login-safe">
              <span>✓</span>
              <div><strong>Your information is safe with us.</strong><small>For any help, contact us on WhatsApp.</small></div>
            </div>
          </div>
        </section>
      </div>

      <style>{`
        .dw-customer-login-page{min-height:100vh;background:linear-gradient(135deg,#fffdf9 0%,#fbf6ef 48%,#f5eee5 100%);display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;font-family:Inter,Arial,sans-serif;color:#172033;position:relative;overflow:hidden}
        .dw-login-layout{width:min(1240px,100%);min-height:720px;display:grid;grid-template-columns:1.05fr .95fr;background:rgba(255,255,255,.72);border:1px solid #eadfd4;border-radius:30px;box-shadow:0 25px 80px rgba(68,49,31,.12);overflow:hidden;position:relative;z-index:2}
        .dw-login-showcase{position:relative;padding:42px 54px 38px;overflow:hidden;background:radial-gradient(circle at 76% 68%,#fff1df 0,#fff7ed 27%,rgba(255,248,239,.3) 48%,transparent 70%)}
        .dw-showcase-brand img{width:245px;height:82px;object-fit:contain;object-position:left center}
        .dw-showcase-content{position:relative;z-index:2;margin-top:58px;max-width:590px}
        .dw-showcase-kicker{display:inline-block;font-size:11px;font-weight:900;letter-spacing:1.7px;color:#ef6420;background:#fff0e4;padding:8px 12px;border-radius:999px}
        .dw-showcase-content h1{font-size:52px;line-height:1.02;letter-spacing:-1.7px;margin:18px 0 15px;color:#0d4d36}.dw-showcase-content h1 span{color:#f06b1f}.dw-showcase-content p{font-size:16px;line-height:1.65;color:#68716e;max-width:520px;margin:0}
        .dw-login-benefits{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:34px;max-width:560px}.dw-login-benefits>div{background:rgba(255,255,255,.78);border:1px solid #eadfd3;border-radius:15px;padding:13px 8px;text-align:center;box-shadow:0 6px 18px rgba(55,40,25,.04)}.dw-login-benefits b{width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:auto;background:#e9f6e8;font-size:20px}.dw-login-benefits>div:nth-child(2n) b{background:#fff0e4}.dw-login-benefits span{display:block;font-size:11px;font-weight:800;line-height:1.3;margin-top:8px;color:#33403b}
        .dw-food-visual{position:absolute;right:28px;bottom:-45px;width:520px;height:310px;z-index:1}.dw-food-plate{position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle,#fff 0 45%,#e9e0d6 46% 51%,#c8b9aa 52% 56%,#f3eee8 57% 100%);box-shadow:0 22px 45px rgba(69,45,24,.16);transform:rotate(-8deg)}.dw-food-bowl{position:absolute;width:112px;height:112px;border-radius:50%;background:linear-gradient(145deg,#fff,#cfc8c0);border:7px solid #a69f97;display:flex;align-items:center;justify-content:center;font-size:47px;box-shadow:0 12px 20px rgba(40,30,20,.18)}.bowl-dal{left:70px;top:72px}.bowl-rice{right:72px;top:55px}.bowl-sabji{left:190px;top:112px}.bowl-roti{left:72px;bottom:20px}.bowl-salad{right:72px;bottom:18px}
        .dw-showcase-quote{position:absolute;left:55px;bottom:38px;font-family:Georgia,serif;font-style:italic;font-size:19px;line-height:1.35;color:#176044;z-index:3;transform:rotate(-3deg)}.dw-showcase-quote span{color:#f0641d;font-size:26px}
        .dw-login-panel{display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.6);padding:45px}
        .dw-customer-login-card{width:min(470px,100%);background:#fff;border:1px solid #e9e0d8;border-radius:24px;padding:38px 40px;box-sizing:border-box;box-shadow:0 18px 55px rgba(46,35,25,.10);text-align:center}.dw-login-user-icon{width:60px;height:60px;border-radius:50%;background:#e8f5e9;display:flex;align-items:center;justify-content:center;margin:0 auto 14px;font-size:27px}.dw-customer-login-tag{display:inline-block;background:#fff0e5;color:#ed6420;border-radius:999px;padding:7px 12px;font-size:10px;font-weight:900;letter-spacing:1px}.dw-customer-login-card h2{font-size:29px;letter-spacing:-.6px;margin:14px 0 6px;color:#101b31}.dw-customer-login-card>p{font-size:13px;color:#707b8a;margin:0 0 28px}
        .dw-customer-login-card form{text-align:left;display:flex;flex-direction:column;gap:17px}.dw-customer-login-card label{font-size:13px;font-weight:900;display:flex;flex-direction:column;gap:8px;color:#1d2938}.dw-login-input-wrap{position:relative}.dw-login-input-wrap>span{position:absolute;left:14px;top:13px;font-size:17px;color:#59706a;z-index:1}.dw-login-input-wrap input{width:100%;height:52px;box-sizing:border-box;border:1px solid #d9dfe3;border-radius:11px;padding:0 43px;background:#fff;font:inherit;font-size:13px;color:#202a35;outline:none;transition:.2s}.dw-login-input-wrap input:focus{border-color:#f06b2d;box-shadow:0 0 0 4px rgba(240,107,45,.09)}.dw-password-eye{position:absolute;right:8px;top:7px;width:38px;height:38px;border:0;background:transparent;cursor:pointer;font-size:17px;border-radius:8px}.dw-password-eye:hover{background:#f7f3ee}
        .dw-customer-login-error{background:#fff1f2;color:#c52e42;border:1px solid #f0c8ce;border-radius:9px;padding:10px 12px;font-size:11px}.dw-customer-login-submit{height:52px;border:0;border-radius:11px;background:linear-gradient(135deg,#0c6743,#0d5138);color:#fff;font-size:14px;font-weight:900;cursor:pointer;box-shadow:0 10px 22px rgba(13,81,56,.18);transition:.18s}.dw-customer-login-submit:hover{transform:translateY(-1px);box-shadow:0 13px 27px rgba(13,81,56,.24)}.dw-customer-login-submit span{font-size:18px;margin-left:8px}.dw-login-divider{display:flex;align-items:center;gap:12px;margin:23px 0 14px;color:#9aa1a7;font-size:11px;font-weight:800}.dw-login-divider:before,.dw-login-divider:after{content:"";height:1px;background:#e5e2df;flex:1}.dw-back-home{width:100%;height:48px;border:1px solid #d9eadc;background:#eef8ef;color:#12633f;border-radius:10px;font-weight:900;font-size:13px;cursor:pointer}.dw-back-home:hover{background:#e5f5e7}.dw-login-safe{display:flex;align-items:center;gap:11px;text-align:left;margin-top:25px;padding-top:20px;border-top:1px solid #eee9e5}.dw-login-safe>span{width:34px;height:34px;border-radius:50%;background:#e7f5e9;color:#168348;display:flex;align-items:center;justify-content:center;font-weight:900}.dw-login-safe strong,.dw-login-safe small{display:block}.dw-login-safe strong{font-size:11px;color:#15583c}.dw-login-safe small{font-size:10px;color:#7d858d;margin-top:3px}.dw-login-decoration{position:absolute;z-index:1;opacity:.25;font-size:75px}.leaf-one{left:-15px;top:30px;transform:rotate(-30deg)}.leaf-two{right:-10px;bottom:10px;transform:rotate(25deg)}
        @media(max-width:1050px){.dw-login-layout{grid-template-columns:1fr;max-width:600px;min-height:auto}.dw-login-showcase{min-height:350px;padding:30px 35px}.dw-showcase-content{margin-top:28px}.dw-showcase-content h1{font-size:40px}.dw-food-visual{opacity:.5;right:-70px;bottom:-120px;transform:scale(.8)}.dw-showcase-quote{bottom:25px;left:35px}.dw-login-panel{padding:30px 20px}.dw-showcase-brand img{width:200px}}
        @media(max-width:600px){.dw-customer-login-page{padding:10px}.dw-login-layout{border-radius:20px}.dw-login-showcase{min-height:285px;padding:23px 20px}.dw-showcase-brand img{width:175px;height:62px}.dw-showcase-content{margin-top:15px}.dw-showcase-kicker{font-size:8px;padding:6px 9px}.dw-showcase-content h1{font-size:31px;margin:11px 0 8px}.dw-showcase-content p{font-size:11px;line-height:1.45;max-width:320px}.dw-login-benefits{gap:6px;margin-top:16px}.dw-login-benefits>div{padding:8px 4px}.dw-login-benefits b{width:31px;height:31px;font-size:15px}.dw-login-benefits span{font-size:8px;margin-top:4px}.dw-food-visual{display:none}.dw-showcase-quote{font-size:12px;left:20px;bottom:12px}.dw-login-panel{padding:18px 10px}.dw-customer-login-card{padding:28px 20px;border-radius:18px}.dw-customer-login-card h2{font-size:23px}.dw-customer-login-card>p{font-size:11px;margin-bottom:22px}.dw-customer-login-card form{gap:14px}.dw-login-safe{margin-top:20px}}
      `}</style>
    </div>
  );

  let latestCustomer = customer;
  try {
    const list = JSON.parse(localStorage.getItem("dw_customers") || "[]");
    latestCustomer = list.find(c => c.id === customer.id) || customer;
  } catch {}

  const subStatus = subscriptionStatus(latestCustomer);
  const payStatus = paymentStatus(latestCustomer);
  const day = latestCustomer.dailyRecords?.[selectedDate] || {};
  const remainingTiffins = remaining(latestCustomer);

  return (
    <div className="dw-customer-page">
      <header className="dw-customer-header">
        <div className="dw-customer-brand"><img src={logo} alt="Dabba Wala Logo" /><div><strong>Dabba Wala</strong><span>MY TIFFIN ACCOUNT</span></div></div>
        <button onClick={logout}>↪ Logout</button>
      </header>
      <main className="dw-customer-main">
        <div className="dw-customer-welcome"><div><span>WELCOME BACK 👋</span><h1>Hello, {latestCustomer.name}</h1><p>Here is your current Dabba Wala subscription status.</p></div><div className="dw-customer-mobile">📱 {latestCustomer.mobile}</div></div>
        <div className="dw-customer-status-grid">
          <div className="dw-c-status-card subscription"><span>SUBSCRIPTION</span><strong>{subStatus}</strong><small>{latestCustomer.startDate} → {latestCustomer.endDate}</small></div>
          <div className={`dw-c-status-card payment ${payStatus.toLowerCase().replace(" ", "-")}`}><span>PAYMENT STATUS</span><strong>{payStatus}</strong><small>Your payment status</small></div>
          <div className="dw-c-status-card tiffin"><span>TIFFINS REMAINING</span><strong>{remainingTiffins}</strong><small>Your remaining tiffins</small></div>
        </div>
        <section className="dw-customer-card-box"><div className="dw-c-box-head"><div><span className="dw-c-label">MY ACCOUNT</span><h2>My Subscription</h2></div><span className={`dw-c-pill ${subStatus.toLowerCase()}`}>{subStatus}</span></div><div className="dw-c-info-grid"><div><span>Plan</span><b>{latestCustomer.plan}</b></div><div><span>Valid Till</span><b>{latestCustomer.endDate}</b></div><div><span>Delivery Area</span><b>{latestCustomer.area || "—"}</b></div><div><span>Delivery Address</span><b>{latestCustomer.address}</b></div></div></section>
        <section className="dw-customer-card-box"><div className="dw-c-box-head"><div><span className="dw-c-label">DAILY SERVICE</span><h2>My Tiffin Status</h2></div><input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} /></div><div className="dw-c-meals"><div><span>☀️ Morning Tiffin</span><b className={day.morning === "Delivered" ? "delivered" : day.morning === "OFF" ? "off" : "not-updated"}>{day.morning || "Not Updated"}</b></div><div><span>🌙 Evening Tiffin</span><b className={day.evening === "Delivered" ? "delivered" : day.evening === "OFF" ? "off" : "not-updated"}>{day.evening || "Not Updated"}</b></div></div><p className="dw-c-note">Your daily delivery status is updated by Dabba Wala.</p></section>
        <div className="dw-customer-help"><div><strong>Need help?</strong><span>Contact Dabba Wala for any subscription or delivery query.</span></div><a href="https://wa.me/917223050454" target="_blank" rel="noreferrer">💬 WhatsApp Us</a></div>
      </main>
      <style>{`
        .dw-customer-page{min-height:100vh;background:#f8f7f5;color:#172033;font-family:Inter,Arial,sans-serif}.dw-customer-header{height:76px;background:#fff;border-bottom:1px solid #e8e2dd;padding:0 6%;display:flex;align-items:center;justify-content:space-between;box-sizing:border-box}.dw-customer-brand{display:flex;align-items:center;gap:10px}.dw-customer-brand img{width:48px;height:48px;object-fit:contain}.dw-customer-brand strong{display:block;font-size:19px;color:#123f35}.dw-customer-brand span{display:block;font-size:8px;letter-spacing:.8px;color:#ef6425;font-weight:900;margin-top:2px}.dw-customer-header button{border:1px solid #e0d9d3;background:#fff;border-radius:9px;padding:10px 14px;font-weight:800;cursor:pointer}.dw-customer-header button:hover{border-color:#ef6a2b;color:#ef6a2b}.dw-customer-main{max-width:1050px;margin:auto;padding:35px 22px 55px}.dw-customer-welcome{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:22px}.dw-customer-welcome span,.dw-c-label{font-size:10px;color:#e35d22;font-weight:900;letter-spacing:.5px}.dw-customer-welcome h1{margin:4px 0;font-size:29px;letter-spacing:-.5px}.dw-customer-welcome p{margin:0;color:#747b83;font-size:12px}.dw-customer-mobile{background:#fff;border:1px solid #e4ded9;border-radius:999px;padding:10px 14px;color:#525a62;font-size:11px;font-weight:800}.dw-customer-status-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:17px}.dw-c-status-card{background:#fff;border:1px solid #e6e0db;border-radius:15px;padding:17px;box-shadow:0 5px 20px rgba(30,25,20,.035)}.dw-c-status-card span{display:block;font-size:9px;font-weight:900;color:#777}.dw-c-status-card strong{display:block;font-size:24px;margin:7px 0 3px}.dw-c-status-card small{font-size:10px;color:#8a8f95}.dw-c-status-card.subscription strong{color:#188d4b}.dw-c-status-card.payment.paid strong{color:#188d4b}.dw-c-status-card.payment.pending strong{color:#c92e45}.dw-c-status-card.payment.half-payment strong{color:#9b6b00}.dw-c-status-card.tiffin strong{color:#ed7621}.dw-customer-card-box{background:#fff;border:1px solid #e6e0db;border-radius:16px;padding:20px;margin-top:14px;box-shadow:0 5px 20px rgba(30,25,20,.035)}.dw-c-box-head{display:flex;align-items:center;justify-content:space-between;gap:15px;border-bottom:1px solid #eee9e5;padding-bottom:14px}.dw-c-box-head h2{margin:3px 0 0;font-size:18px}.dw-c-box-head input{border:1px solid #ddd7d2;border-radius:8px;padding:9px;font:inherit;font-size:11px}.dw-c-pill{padding:6px 10px;border-radius:999px;font-size:9px;font-weight:900}.dw-c-pill.active{background:#e6f8ed;color:#168340}.dw-c-pill.expired{background:#ffecef;color:#c72d45}.dw-c-info-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:0}.dw-c-info-grid>div{padding:14px 10px 3px 0}.dw-c-info-grid span{display:block;color:#8a8f95;font-size:10px;margin-bottom:4px}.dw-c-info-grid b{font-size:12px;line-height:1.4}.dw-c-meals{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:17px}.dw-c-meals>div{background:#faf9f7;border:1px solid #ebe5df;border-radius:12px;padding:15px;display:flex;align-items:center;justify-content:space-between;gap:12px}.dw-c-meals span{font-size:12px;font-weight:800}.dw-c-meals b{font-size:10px;border-radius:999px;padding:6px 9px}.dw-c-meals .delivered{background:#e6f8ed;color:#168340}.dw-c-meals .off{background:#fff3d6;color:#9b6b00}.dw-c-meals .not-updated{background:#eef0f2;color:#69717a}.dw-c-note{font-size:10px;color:#8b9095;margin:12px 0 0}.dw-customer-help{margin-top:17px;background:linear-gradient(100deg,#fff7eb,#fffdf9);border:1px solid #f0ddc8;border-radius:14px;padding:15px 17px;display:flex;align-items:center;justify-content:space-between;gap:15px}.dw-customer-help strong{display:block;font-size:12px}.dw-customer-help span{display:block;color:#777;font-size:10px;margin-top:3px}.dw-customer-help a{background:#19b957;color:#fff;text-decoration:none;border-radius:9px;padding:9px 12px;font-size:10px;font-weight:900;white-space:nowrap}@media(max-width:650px){.dw-customer-header{padding:0 15px}.dw-customer-main{padding:25px 14px 40px}.dw-customer-welcome{align-items:flex-start;flex-direction:column}.dw-customer-welcome h1{font-size:24px}.dw-customer-mobile{font-size:10px}.dw-customer-status-grid{grid-template-columns:1fr}.dw-c-info-grid{grid-template-columns:1fr}.dw-c-meals{grid-template-columns:1fr}.dw-customer-help{align-items:flex-start;flex-direction:column}.dw-customer-help a{width:100%;text-align:center;box-sizing:border-box}.dw-c-box-head{align-items:flex-start}.dw-c-box-head input{max-width:135px}}
      `}</style>
    </div>
  );
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
    return <CustomerPortal />;
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
      .dw-actions .dw-edit{color:#7048b8;border-color:#d7c7f1;background:#faf7ff}.dw-edit-customer-modal{width:min(680px,100%);max-height:90vh;overflow:auto}.dw-edit-form{display:flex;flex-direction:column;gap:10px}.dw-edit-form label{display:flex;flex-direction:column;gap:5px;font-size:11px;font-weight:800;color:#26303b}.dw-edit-form input,.dw-edit-form textarea,.dw-edit-form select{width:100%;box-sizing:border-box;border:1px solid #ddd8d4;border-radius:9px;padding:10px 11px;background:#fff;font:inherit;font-size:12px;color:#252a31;outline:none}.dw-edit-form input:focus,.dw-edit-form textarea:focus,.dw-edit-form select:focus{border-color:#f36a26;box-shadow:0 0 0 3px rgba(243,106,38,.08)}.dw-more{border:1px solid #e1dbd6;background:#fff;border-radius:8px;padding:6px 8px;cursor:pointer;color:#777}.dw-more:hover{border-color:#ef6a2b;color:#ef6a2b}
      `}
</style>

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