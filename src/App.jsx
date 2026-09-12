import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Login from "./pages/Login";
import logo from "./assets/dabba-wala-logo.png";
import "./App.css";


function AdminPanel() {
  const [loggedIn, setLoggedIn] = useState(() => localStorage.getItem("dw_admin_auth") === "1");
  const [password, setPassword] = useState("");
  const [customers, setCustomers] = useState(() => {
    try { return JSON.parse(localStorage.getItem("dw_customers") || "[]"); } catch { return []; }
  });
  const [form, setForm] = useState({ name:"", mobile:"", address:"", plan:"Monthly Subscription", amount:"2800", startDate:new Date().toISOString().slice(0,10), notes:"" });
  const [search, setSearch] = useState("");

  const saveCustomers = (next) => {
    setCustomers(next);
    localStorage.setItem("dw_customers", JSON.stringify(next));
  };

  const login = (e) => {
    e.preventDefault();
    // Change this PIN before sharing the admin URL.
    if (password === "7223") {
      localStorage.setItem("dw_admin_auth", "1");
      setLoggedIn(true);
      setPassword("");
    } else alert("Wrong admin PIN");
  };

  const addCustomer = (e) => {
    e.preventDefault();
    const mobile = form.mobile.replace(/\D/g, "");
    if (!form.name.trim() || mobile.length !== 10 || !form.address.trim() || !form.amount) {
      alert("Name, 10-digit mobile, address and amount are required."); return;
    }
    const start = new Date(form.startDate + "T00:00:00");
    const end = new Date(start);
    if (form.plan === "Monthly Subscription") end.setDate(end.getDate() + 30);
    const customer = {
      id: Date.now(), name: form.name.trim(), mobile, address: form.address.trim(),
      plan: form.plan, amount: Number(form.amount), startDate: form.startDate,
      endDate: end.toISOString().slice(0,10), notes: form.notes.trim(), status: "Active"
    };
    const next = [customer, ...customers];
    saveCustomers(next);
    const message = [
      "🍱 *Dabba Wala – Subscription Started*", "", `Hello ${customer.name} 👋`,
      "Your tiffin subscription has been successfully started.", "",
      `*Plan:* ${customer.plan}`, `*Amount:* ₹${customer.amount}`,
      `*Start Date:* ${customer.startDate}`, `*Valid Till:* ${customer.endDate}`,
      `*Delivery Address:* ${customer.address}`,
      "*Meal:* Dal, Chawal, 4 Roti, Sabji, Aachar / Papad / Salad",
      "*Schedule:* Monday to Saturday + Sunday: 1 Time Meal Only", "",
      "Thank you for choosing *Dabba Wala* ❤️"
    ].join("\n");
    window.open(`https://wa.me/91${mobile}?text=${encodeURIComponent(message)}`, "_blank");
    setForm({ name:"", mobile:"", address:"", plan:"Monthly Subscription", amount:"2800", startDate:new Date().toISOString().slice(0,10), notes:"" });
  };

  const removeCustomer = (id) => saveCustomers(customers.filter(c => c.id !== id));
  const sendMessage = (c) => {
    const message = `🍱 *Dabba Wala – Subscription Update*\\n\\nHello ${c.name} 👋\\nYour ${c.plan} is active.\\nAmount: ₹${c.amount}\\nStart Date: ${c.startDate}\\nValid Till: ${c.endDate}\\n\\nThank you for choosing Dabba Wala ❤️`;
    window.open(`https://wa.me/91${c.mobile}?text=${encodeURIComponent(message)}`, "_blank");
  };

  if (!loggedIn) return <div className="dw-admin-login"><div className="dw-admin-card"><img className="dw-logo-img" src={logo} alt="Dabba Wala Logo" /><h1>Dabba Wala</h1><p>Owner Admin Panel</p><form onSubmit={login}><input type="password" placeholder="Admin PIN" value={password} onChange={e=>setPassword(e.target.value)} autoFocus/><button>Login to Admin</button></form><small>Owner access only</small></div></div>;

  const filtered = customers.filter(c => [c.name,c.mobile,c.plan,c.address].join(" ").toLowerCase().includes(search.toLowerCase()));
  const active = customers.filter(c => c.status === "Active").length;
  const revenue = customers.reduce((s,c)=>s+Number(c.amount||0),0);

  return <div className="dw-admin-page">
    <header className="dw-admin-top"><div><div className="dw-admin-brand"><img src={logo} alt="Dabba Wala Logo" /> Dabba Wala <span>OWNER ADMIN</span></div><small>Customer & Subscription Management</small></div><button onClick={()=>{localStorage.removeItem("dw_admin_auth");setLoggedIn(false)}}>Logout</button></header>
    <main className="dw-admin-wrap">
      <div className="dw-stats"><div><b>{customers.length}</b><span>Total Customers</span></div><div><b>{active}</b><span>Active Subscriptions</span></div><div><b>₹{revenue.toLocaleString("en-IN")}</b><span>Total Recorded</span></div></div>
      <section className="dw-admin-grid">
        <div className="dw-admin-card dw-add-card"><h2>➕ Add Customer</h2><p>Add customers who ordered by phone or in person.</p><form onSubmit={addCustomer}>
          <label>Customer Name<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Full name"/></label>
          <label>WhatsApp Mobile<input required inputMode="numeric" maxLength="10" value={form.mobile} onChange={e=>setForm({...form,mobile:e.target.value.replace(/\D/g,"")})} placeholder="10-digit mobile"/></label>
          <label>Delivery Address<textarea required rows="3" value={form.address} onChange={e=>setForm({...form,address:e.target.value})} placeholder="House / Room / Street / Area"/></label>
          <div className="dw-two"><label>Plan<select value={form.plan} onChange={e=>setForm({...form,plan:e.target.value,amount:e.target.value==="Monthly Subscription"?"2800":"65"})}><option>Monthly Subscription</option><option>First Meal Trial</option></select></label><label>Amount (₹)<input type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></label></div>
          <label>Start Date<input type="date" value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})}/></label>
          <label>Notes (optional)<textarea rows="2" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Meal timing, instructions, etc."/></label>
          <button className="dw-primary">Save Customer + Open WhatsApp →</button>
        </form></div>
        <div className="dw-admin-card"><div className="dw-list-head"><div><h2>👥 Customers</h2><p>Saved on this admin browser.</p></div><input placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
          {filtered.length===0 ? <div className="dw-empty">No customers added yet.</div> : <div className="dw-table-wrap"><table><thead><tr><th>Customer</th><th>Plan</th><th>Amount</th><th>Validity</th><th>Action</th></tr></thead><tbody>{filtered.map(c=><tr key={c.id}><td><b>{c.name}</b><small>{c.mobile}<br/>{c.address}</small></td><td>{c.plan}</td><td>₹{Number(c.amount).toLocaleString("en-IN")}</td><td>{c.startDate}<br/>to {c.endDate}</td><td><button className="dw-wa" onClick={()=>sendMessage(c)}>WhatsApp</button><button className="dw-delete" onClick={()=>removeCustomer(c.id)}>Delete</button></td></tr>)}</tbody></table></div>}
        </div>
      </section>
      <div className="dw-note">⚠️ This first version stores admin data in this browser only. For data to sync across phones/computers and for truly automatic WhatsApp messages, the next step is a database + WhatsApp Business API.</div>
    </main>
    <style>{`
.dw-admin-page{min-height:100vh;background:#f7f3ef;color:#292524;font-family:inherit}
.dw-admin-top{background:#fff;border-bottom:1px solid #eadfd7;padding:14px 22px;display:flex;align-items:center;justify-content:space-between}
.dw-admin-brand{display:flex;align-items:center;gap:9px}
.dw-admin-brand img{width:38px;height:38px;object-fit:contain;border-radius:9px}
.brand-icon img{width:100%;height:100%;object-fit:contain;border-radius:10px}
.dw-logo-img{width:76px;height:76px;object-fit:contain;display:block;margin:0 auto 8px}
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
            <div className="brand-icon"><img src={logo} alt="Dabba Wala Logo" /></div>
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