import React from 'react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import api from './api';

function getUser() {
  try { return JSON.parse(localStorage.getItem('foodshare_user') || 'null'); } catch { return null; }
}
function Header({ user, logout }) {
  return <header className="header"><Link className="brand" to="/">🍃 FoodShare</Link>
    <nav><NavLink to="/">Available food</NavLink>{user && <NavLink to="/dashboard">Dashboard</NavLink>}
      {!user ? <NavLink to="/login">Login</NavLink> : <button className="nav-button" onClick={logout}>Log out</button>}
    </nav></header>;
}
function Notice({ message, error }) { return message ? <div className={error ? 'notice error' : 'notice'}>{message}</div> : null; }

function Home({ user }) {
  const [items, setItems] = useState([]), [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(null);
  const load = () => api.get('/donations').then(r => setItems(r.data)).catch(() => setMessage('Could not load donations. Is the backend running?')).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  async function request(id) {
    if (!user) return setMessage('Please log in as a recipient to request food.');
    if (user.role !== 'recipient') return setMessage('Only recipient accounts can request donations.');
    setRequesting(id); setMessage('');
    try { const r = await api.post(`/requests/${id}`, {}); setMessage(r.data.message); }
    catch (e) { setMessage(e.response?.data?.message || 'Request failed.'); }
    finally { setRequesting(null); }
  }
  return <main><section className="hero"><div><p className="eyebrow">GOOD FOOD. GOOD COMMUNITY.</p><h1>Food that matters,<br/><span>shared with care.</span></h1>
    <p>Connect surplus food with people and organizations who can use it. Every donation can make a difference.</p>
    <div className="hero-actions"><a className="button" href="#donations">Explore donations</a>{user?.role === 'donor' && <Link className="button secondary" to="/dashboard">Post food</Link>}</div></div>
    <div className="hero-art" aria-hidden="true"><div className="plate">🥗</div><div className="leaf leaf1">🍃</div><div className="leaf leaf2">🌱</div></div></section>
    <section id="donations" className="section"><div className="section-head"><div><p className="eyebrow">COMMUNITY DONATIONS</p><h2>Available food</h2></div><span className="count">{items.length} listed</span></div>
    <Notice message={message} /><p className="muted">Choose a donation and send a request to the donor.</p>
    {loading ? <p>Loading donations…</p> : items.length === 0 ? <div className="empty"><div>🥕</div><h3>No donations right now</h3><p>Check back soon or sign in as a donor to share surplus food.</p></div> :
    <div className="cards">{items.map(item => <article className="food-card" key={item.id}><div className="food-icon">🥬</div><div className="food-card-body"><span className="tag">Available</span><h3>{item.food_name}</h3><p>{item.description || 'Fresh surplus food ready to be shared.'}</p><div className="details"><span>📦 {item.quantity}</span><span>📍 {item.pickup_location}</span><span>🕒 Until {new Date(item.available_until).toLocaleString()}</span></div><div className="card-footer"><span className="donor">By {item.donor_organization || item.donor_name}</span><button className="button small" disabled={requesting === item.id} onClick={() => request(item.id)}>{requesting === item.id ? 'Sending…' : 'Request food'}</button></div></div></article>)}</div>}
    </section><section className="impact"><div><p className="eyebrow">OUR PURPOSE</p><h2>Less waste.<br/>More nourishment.</h2></div><p>FoodShare makes it easier for donors and community organizations to coordinate safe, timely food redistribution.</p></section></main>;
}

function Auth({ mode, onLogin }) {
  const navigate = useNavigate(), register = mode === 'register';
  const [form, setForm] = useState({ name:'', email:'', password:'', role:'recipient', organization:'', phone:'' });
  const [message, setMessage] = useState(''), [error, setError] = useState(false), [busy, setBusy] = useState(false);
  const update = e => setForm({ ...form, [e.target.name]: e.target.value });
  async function submit(e) {
    e.preventDefault(); setBusy(true); setMessage(''); setError(false);
    try {
      if (register) { const r = await api.post('/auth/register', form); setMessage(r.data.message); setTimeout(() => navigate('/login'), 900); }
      else { const r = await api.post('/auth/login', { email: form.email, password: form.password }); onLogin(r.data); navigate('/dashboard'); }
    } catch (e) { setError(true); setMessage(e.response?.data?.message || 'Something went wrong. Check the backend connection.'); }
    finally { setBusy(false); }
  }
  return <main className="auth-wrap"><form className="auth-card" onSubmit={submit}><p className="eyebrow">{register ? 'JOIN THE COMMUNITY' : 'WELCOME BACK'}</p><h1>{register ? 'Create your account' : 'Sign in'}</h1><p className="muted">{register ? 'Start sharing food or helping your community.' : 'Continue making a difference.'}</p>
    <Notice message={message} error={error}/>
    {register && <><label>Full name<input name="name" value={form.name} onChange={update} required /></label><label>Account type<select name="role" value={form.role} onChange={update}><option value="recipient">Recipient / NGO</option><option value="donor">Food donor</option></select></label><label>Organization (optional)<input name="organization" value={form.organization} onChange={update} /></label><label>Phone (optional)<input name="phone" value={form.phone} onChange={update} /></label></>}
    <label>Email<input type="email" name="email" value={form.email} onChange={update} required /></label><label>Password<input type="password" name="password" value={form.password} onChange={update} minLength="6" required /></label>
    <button className="button full" disabled={busy}>{busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'}</button><p className="switch">{register ? 'Already have an account?' : 'New to FoodShare?'} <Link to={register ? '/login' : '/register'}>{register ? 'Sign in' : 'Create account'}</Link></p></form></main>;
}

function Dashboard({ user }) {
  const [donations, setDonations] = useState([]), [requests, setRequests] = useState([]), [message, setMessage] = useState('');
  const [form, setForm] = useState({ food_name:'', description:'', quantity:'', pickup_location:'', available_until:'' });
  const [busy, setBusy] = useState(false);
  const load = async () => {
    try {
      if (user.role === 'donor') { const [d,r] = await Promise.all([api.get('/donations/mine'), api.get('/requests/received')]); setDonations(d.data); setRequests(r.data); }
      else { const r = await api.get('/requests/mine'); setRequests(r.data); }
    } catch { setMessage('Could not load dashboard information.'); }
  };
  useEffect(() => { load(); }, []);
  const update = e => setForm({ ...form, [e.target.name]: e.target.value });
  async function postDonation(e) {
    e.preventDefault(); setBusy(true);
    try { const r = await api.post('/donations', form); setMessage(r.data.message); setForm({ food_name:'',description:'',quantity:'',pickup_location:'',available_until:'' }); load(); }
    catch (e) { setMessage(e.response?.data?.message || 'Could not post donation.'); }
    finally { setBusy(false); }
  }
  async function changeStatus(id, status) {
    try { const r = await api.patch(`/requests/${id}/status`, { status }); setMessage(r.data.message); load(); }
    catch (e) { setMessage(e.response?.data?.message || 'Could not update request.'); }
  }
  return <main className="section dashboard"><p className="eyebrow">YOUR FOODSHARE SPACE</p><h1>Hello, {user.name}!</h1><p className="muted">You are signed in as a {user.role}.</p><Notice message={message}/>
    {user.role === 'donor' && <><form className="panel" onSubmit={postDonation}><h2>Post a food donation</h2><div className="form-grid"><label>Food name<input name="food_name" value={form.food_name} onChange={update} required placeholder="e.g. Vegetable rice"/></label><label>Quantity<input name="quantity" value={form.quantity} onChange={update} required placeholder="e.g. 10 meal boxes"/></label><label>Pickup location<input name="pickup_location" value={form.pickup_location} onChange={update} required placeholder="Address or pickup point"/></label><label>Available until<input type="datetime-local" name="available_until" value={form.available_until} onChange={update} required min={new Date(Date.now()+60000).toISOString().slice(0,16)}/></label><label className="wide">Description<textarea name="description" value={form.description} onChange={update} placeholder="Food details, allergens, packaging…" rows="3"/></label></div><button className="button" disabled={busy}>{busy ? 'Posting…' : 'Publish donation'}</button></form>
    <h2 className="subheading">My donations</h2>{donations.length ? <div className="table-wrap"><table><thead><tr><th>Food</th><th>Quantity</th><th>Status</th><th>Pickup</th></tr></thead><tbody>{donations.map(d=><tr key={d.id}><td>{d.food_name}</td><td>{d.quantity}</td><td><span className="tag">{d.status}</span></td><td>{d.pickup_location}</td></tr>)}</tbody></table></div> : <p className="empty">You have not posted any donations yet.</p>}
    <h2 className="subheading">Requests from recipients</h2>{requests.length ? <div className="request-list">{requests.map(r=><article className="request" key={r.id}><div><h3>{r.food_name} · {r.recipient_name}</h3><p className="muted">{r.recipient_organization || 'Community recipient'} · {r.quantity}</p><span className="tag">{r.status}</span></div><div className="actions">{r.status==='pending' && <><button className="button small" onClick={()=>changeStatus(r.id,'approved')}>Approve</button><button className="button outline small" onClick={()=>changeStatus(r.id,'rejected')}>Reject</button></>}{r.status==='approved' && <button className="button small" onClick={()=>changeStatus(r.id,'completed')}>Mark completed</button>}</div></article>)}</div> : <p className="empty">No requests received yet.</p>}</>}
    {user.role === 'recipient' && <><h2 className="subheading">My food requests</h2>{requests.length ? <div className="request-list">{requests.map(r=><article className="request" key={r.id}><div><h3>{r.food_name}</h3><p className="muted">{r.quantity} · {r.pickup_location}</p><p className="muted">Donor: {r.donor_name}</p></div><span className="tag">{r.status}</span></article>)}</div> : <div className="empty"><h3>No requests yet</h3><p>Browse available food and request a donation.</p><Link className="button" to="/">Browse food</Link></div>}</>}
  </main>;
}

export default function App() {
  const [user, setUser] = useState(getUser);
  function login(data) { localStorage.setItem('foodshare_token', data.token); localStorage.setItem('foodshare_user', JSON.stringify(data.user)); setUser(data.user); }
  function logout() { localStorage.removeItem('foodshare_token'); localStorage.removeItem('foodshare_user'); setUser(null); }
  return <><Header user={user} logout={logout}/><Routes><Route path="/" element={<Home user={user}/>}/><Route path="/login" element={<Auth mode="login" onLogin={login}/>}/><Route path="/register" element={<Auth mode="register" onLogin={login}/>}/><Route path="/dashboard" element={user ? <Dashboard user={user}/> : <Auth mode="login" onLogin={login}/>}/><Route path="*" element={<main className="section"><h1>Page not found</h1><Link to="/">Go home</Link></main>}/></Routes><footer><span>🍃 FoodShare</span><span>Share surplus. Nourish communities.</span></footer></>;
}
