import { useState, useEffect, useCallback } from "react";

// ─── Firebase Config (user fills in their own credentials) ─────────────────
import { db, auth } from "./firebase";
import { doc, setDoc, getDoc, updateDoc, collection, addDoc, onSnapshot } from "firebase/firestore";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";

// ─── Mock DB (replaces Firebase in demo) ──────────────────────────────────
const mockDB = {
  users: {
    "user-1": { uid: "user-1", name: "Ali Hassan", email: "ali@demo.com", balance: 5000, totalWon: 12000, totalLost: 7000, gamesPlayed: 45, role: "user" },
    "user-2": { uid: "user-2", name: "Sara Khan", email: "sara@demo.com", balance: 8750, totalWon: 21000, totalLost: 12250, gamesPlayed: 78, role: "user" },
    "admin-1": { uid: "admin-1", name: "Admin", email: "admin@tictacwin.com", balance: 99999, totalWon: 0, totalLost: 0, gamesPlayed: 0, role: "admin" },
  },
  transactions: [
    { id: "t1", uid: "user-1", type: "deposit", method: "easypaisa", amount: 2000, status: "approved", ts: Date.now() - 86400000, phone: "0300-1234567" },
    { id: "t2", uid: "user-2", type: "withdraw", method: "jazzcash", amount: 1500, status: "pending", ts: Date.now() - 3600000, phone: "0321-7654321" },
    { id: "t3", uid: "user-1", type: "game_win", amount: 800, status: "completed", ts: Date.now() - 7200000 },
    { id: "t4", uid: "user-2", type: "game_loss", amount: -500, status: "completed", ts: Date.now() - 10800000 },
  ],
  gameHistory: [
    { id: "g1", player: "user-1", opponent: "Bot", bet: 500, result: "win", ts: Date.now() - 3600000 },
    { id: "g2", player: "user-1", opponent: "Bot", bet: 300, result: "loss", ts: Date.now() - 7200000 },
    { id: "g3", player: "user-2", opponent: "Bot", bet: 1000, result: "win", ts: Date.now() - 14400000 },
  ]
};

// ─── Winning Combos ────────────────────────────────────────────────────────
const WIN_COMBOS = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

function checkWinner(board) {
  for (const [a,b,c] of WIN_COMBOS) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return { winner: board[a], combo: [a,b,c] };
  }
  if (board.every(Boolean)) return { winner: "draw", combo: [] };
  return null;
}

function getBotMove(board) {
  const empty = board.map((v,i) => v ? null : i).filter(i => i !== null);
  // Try to win
  for (const i of empty) {
    const b = [...board]; b[i] = "O";
    if (checkWinner(b)?.winner === "O") return i;
  }
  // Block player
  for (const i of empty) {
    const b = [...board]; b[i] = "X";
    if (checkWinner(b)?.winner === "X") return i;
  }
  if (board[4] === null) return 4;
  return empty[Math.floor(Math.random() * empty.length)];
}

// ─── Main App ──────────────────────────────────────────────────────────────
export default function TicTacWin() {
  const [screen, setScreen] = useState("login");
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState(mockDB.users);
  const [transactions, setTransactions] = useState(mockDB.transactions);
  const [gameHistory, setGameHistory] = useState(mockDB.gameHistory);
  const [notification, setNotification] = useState(null);

  const notify = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const updateUser = async (uid, updates) => {
  await updateDoc(doc(db, "users", uid), updates);
  setCurrentUser(prev => ({ ...prev, ...updates }));
};
  const addTransaction = async (tx) => {
  const newTx = { ts: Date.now(), status: "completed", ...tx };
  await addDoc(collection(db, "transactions"), newTx);
  return newTx;
};

  // REGISTER new user
const register = async (email, password, name) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await setDoc(doc(db, "users", cred.user.uid), {
    uid: cred.user.uid,
    name,
    email,
    balance: 0,
    totalWon: 0,
    totalLost: 0,
    gamesPlayed: 0,
    role: "user"
  });
};

// LOGIN existing user
const login = async (email, password) => {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const snap = await getDoc(doc(db, "users", cred.user.uid));
  setCurrentUser(snap.data());
  setScreen("home");
};

  const logout = () => { setCurrentUser(null); setScreen("login"); };

  return (
    <div style={{ fontFamily: "'Rajdhani', sans-serif", minHeight: "100vh", background: "#0a0a0f", color: "#fff", position: "relative", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Orbitron:wght@400;700;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0a0a0f; }
        ::-webkit-scrollbar-thumb { background: #00ff88; border-radius: 2px; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes slideIn { from{transform:translateY(-20px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes glow { 0%,100%{box-shadow:0 0 10px #00ff88,0 0 20px #00ff88} 50%{box-shadow:0 0 20px #00ff88,0 0 40px #00ff88,0 0 60px #00ff88} }
        @keyframes winning { 0%,100%{background:#00ff88;color:#000} 50%{background:#ffd700;color:#000} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes scanline { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
        @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-5px)} 75%{transform:translateX(5px)} }
        @keyframes spinSlow { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes coinSpin { 0%,100%{transform:rotateY(0deg)} 50%{transform:rotateY(180deg)} }
        @keyframes gradientShift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes borderPulse { 0%,100%{border-color:rgba(0,255,136,0.2)} 50%{border-color:rgba(0,255,136,0.6)} }
        @keyframes logoReveal { 0%{opacity:0;transform:scale(0.7) rotate(-10deg)} 60%{transform:scale(1.05) rotate(2deg)} 100%{opacity:1;transform:scale(1) rotate(0deg)} }
        @keyframes tickerText { 0%{transform:translateX(100%)} 100%{transform:translateX(-100%)} }
        .btn { cursor:pointer; border:none; transition:all 0.2s; }
        .btn:hover { transform:translateY(-2px); }
        .btn:active { transform:translateY(0); }
        .card { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:16px; backdrop-filter:blur(10px); }
        .input { background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:8px; color:#fff; padding:12px 16px; width:100%; font-family:inherit; font-size:15px; transition:all 0.2s; outline:none; }
        .input:focus { border-color:#00ff88; box-shadow:0 0 0 3px rgba(0,255,136,0.15); }
        .label { font-size:12px; font-weight:600; letter-spacing:1px; color:#666; text-transform:uppercase; margin-bottom:6px; display:block; }
        .tab { cursor:pointer; padding:8px 16px; border-radius:8px; font-weight:600; font-size:13px; transition:all 0.2s; letter-spacing:0.5px; }
        .tab.active { background:rgba(0,255,136,0.15); color:#00ff88; border:1px solid rgba(0,255,136,0.3); }
        .tab:not(.active) { color:#555; border:1px solid transparent; }
        .tab:not(.active):hover { color:#888; border-color:rgba(255,255,255,0.1); }
        .badge { display:inline-block; padding:2px 10px; border-radius:20px; font-size:11px; font-weight:700; letter-spacing:0.5px; text-transform:uppercase; }
        .badge-success { background:rgba(0,255,136,0.15); color:#00ff88; border:1px solid rgba(0,255,136,0.3); }
        .badge-warning { background:rgba(255,200,0,0.15); color:#ffc800; border:1px solid rgba(255,200,0,0.3); }
        .badge-danger { background:rgba(255,60,60,0.15); color:#ff3c3c; border:1px solid rgba(255,60,60,0.3); }
        .badge-info { background:rgba(60,120,255,0.15); color:#3c78ff; border:1px solid rgba(60,120,255,0.3); }
        .logo-svg { animation:logoReveal 0.8s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .hex-ring { animation:spinSlow 12s linear infinite; transform-origin:60px 60px; }
        .coin-badge { animation:float 2s ease infinite 0.5s; }
      `}</style>

      {/* Background grid */}
      <div style={{ position:"fixed", inset:0, backgroundImage:"linear-gradient(rgba(0,255,136,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,136,0.03) 1px,transparent 1px)", backgroundSize:"40px 40px", pointerEvents:"none" }} />
      
      {/* Scanline */}
      <div style={{ position:"fixed", top:0, left:0, right:0, height:"2px", background:"linear-gradient(transparent,rgba(0,255,136,0.3),transparent)", animation:"scanline 4s linear infinite", pointerEvents:"none", zIndex:9999 }} />

      {/* Notification */}
      {notification && (
        <div style={{ position:"fixed", top:20, right:20, zIndex:10000, animation:"slideIn 0.3s ease", background: notification.type==="success" ? "rgba(0,255,136,0.15)" : "rgba(255,60,60,0.15)", border:`1px solid ${notification.type==="success"?"rgba(0,255,136,0.4)":"rgba(255,60,60,0.4)"}`, borderRadius:12, padding:"12px 20px", color: notification.type==="success" ? "#00ff88" : "#ff3c3c", fontWeight:600, backdropFilter:"blur(10px)", maxWidth:300 }}>
          {notification.type === "success" ? "✓" : "✗"} {notification.msg}
        </div>
      )}

      {/* Screens */}
      {screen === "login" && <LoginScreen users={users} login={login} />}
      {screen === "home" && <HomeScreen user={currentUser} setScreen={setScreen} logout={logout} />}
      {screen === "game" && <GameScreen user={currentUser} users={users} updateUser={updateUser} addTransaction={addTransaction} setGameHistory={setGameHistory} setScreen={setScreen} notify={notify} />}
      {screen === "wallet" && <WalletScreen user={currentUser} users={users} transactions={transactions} setScreen={setScreen} notify={notify} />}
      {screen === "deposit" && <DepositScreen user={currentUser} updateUser={updateUser} addTransaction={addTransaction} setScreen={setScreen} notify={notify} />}
      {screen === "withdraw" && <WithdrawScreen user={currentUser} updateUser={updateUser} addTransaction={addTransaction} setScreen={setScreen} notify={notify} />}
      {screen === "history" && <HistoryScreen user={currentUser} transactions={transactions} gameHistory={gameHistory} setScreen={setScreen} />}
      {screen === "admin" && <AdminScreen users={users} transactions={transactions} gameHistory={gameHistory} updateUser={updateUser} setTransactions={setTransactions} setScreen={setScreen} notify={notify} logout={logout} />}
    </div>
  );
}

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────
function LoginScreen({ users, login }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
useEffect(() => {
  if (!user?.uid) return;
  const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
    if (snap.exists()) setCurrentUser(snap.data());
  });
  return () => unsub();
}, [user?.uid]);
  const accounts = [
    { label: "👤 User: Ali", uid: "user-1", hint: "Balance: ₨5,000" },
    { label: "👤 User: Sara", uid: "user-2", hint: "Balance: ₨8,750" },
    { label: "🛡️ Admin Panel", uid: "admin-1", hint: "Full Access" },
  ];

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ width:"100%", maxWidth:420, animation:"slideIn 0.5s ease" }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:40 }}>
          {/* Animated SVG Logo */}
          <div style={{ display:"inline-block", position:"relative", marginBottom:16 }}>
            <svg width="120" height="120" viewBox="0 0 120 120" className="logo-svg" style={{ filter:"drop-shadow(0 0 24px rgba(0,255,136,0.6))", animation:"float 3s ease infinite 0.8s" }}>
              {/* Outer hexagon glow ring - spinning */}
              <polygon className="hex-ring" points="60,6 108,33 108,87 60,114 12,87 12,33" fill="none" stroke="rgba(0,255,136,0.2)" strokeWidth="1" />
              <polygon points="60,12 102,36 102,84 60,108 18,84 18,36" fill="none" stroke="rgba(0,255,136,0.4)" strokeWidth="1.5" />
              {/* Inner circle */}
              <circle cx="60" cy="60" r="42" fill="rgba(0,255,136,0.06)" stroke="rgba(0,255,136,0.3)" strokeWidth="1" />
              {/* Tic Tac Toe grid lines */}
              <line x1="42" y1="36" x2="42" y2="84" stroke="#00ff88" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="78" y1="36" x2="78" y2="84" stroke="#00ff88" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="36" y1="50" x2="84" y2="50" stroke="#00ff88" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="36" y1="70" x2="84" y2="70" stroke="#00ff88" strokeWidth="2.5" strokeLinecap="round" />
              {/* X in top-left cell */}
              <line x1="30" y1="30" x2="40" y2="48" stroke="#00ff88" strokeWidth="3" strokeLinecap="round" />
              <line x1="40" y1="30" x2="30" y2="48" stroke="#00ff88" strokeWidth="3" strokeLinecap="round" />
              {/* O in center cell */}
              <circle cx="60" cy="60" r="7" fill="none" stroke="#ffd700" strokeWidth="3" />
              {/* X in bottom-right cell */}
              <line x1="80" y1="72" x2="90" y2="90" stroke="#00ff88" strokeWidth="3" strokeLinecap="round" />
              <line x1="90" y1="72" x2="80" y2="90" stroke="#00ff88" strokeWidth="3" strokeLinecap="round" />
              {/* Win line diagonal */}
              <line x1="30" y1="30" x2="90" y2="90" stroke="rgba(255,215,0,0.5)" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 3" />
              {/* Rupee coin top-right */}
              <circle cx="92" cy="28" r="14" fill="rgba(255,215,0,0.12)" stroke="#ffd700" strokeWidth="1.5" />
              <text x="92" y="33" textAnchor="middle" fill="#ffd700" fontSize="13" fontWeight="900" fontFamily="serif">₨</text>
              {/* Corner accents */}
              <circle cx="12" cy="33" r="2" fill="#00ff88" opacity="0.6" />
              <circle cx="108" cy="33" r="2" fill="#00ff88" opacity="0.6" />
              <circle cx="12" cy="87" r="2" fill="#00ff88" opacity="0.6" />
              <circle cx="108" cy="87" r="2" fill="#00ff88" opacity="0.6" />
              <circle cx="60" cy="6" r="2" fill="#ffd700" opacity="0.8" />
              <circle cx="60" cy="114" r="2" fill="#ffd700" opacity="0.8" />
            </svg>
          </div>
          <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:36, fontWeight:900, letterSpacing:4, lineHeight:1 }}>
            <span style={{ color:"#00ff88", textShadow:"0 0 20px rgba(0,255,136,0.6)" }}>TIC</span>
            <span style={{ color:"#ffd700", textShadow:"0 0 20px rgba(255,215,0,0.6)" }}>TAC</span>
            <span style={{ color:"#fff", textShadow:"0 0 20px rgba(255,255,255,0.3)" }}>WIN</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginTop:8 }}>
            <div style={{ width:24, height:1, background:"linear-gradient(90deg,transparent,#00ff88)" }} />
            <div style={{ color:"#999", fontSize:11, letterSpacing:4 }}>INVEST · PLAY · WIN</div>
            <div style={{ width:24, height:1, background:"linear-gradient(90deg,#ffd700,transparent)" }} />
          </div>
        </div>

        <div className="card" style={{ padding:28 }}>
          <div style={{ color:"#888", fontSize:13, marginBottom:20, textAlign:"center" }}>Demo: Select an account to login</div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {accounts.map(acc => (
              <button key={acc.uid} className="btn" onClick={() => login(acc.uid)} style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, padding:"14px 18px", color:"#fff", display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:15, fontFamily:"inherit" }}>
                <span style={{ fontWeight:600 }}>{acc.label}</span>
                <span style={{ color:"#00ff88", fontSize:12, fontWeight:600 }}>{acc.hint}</span>
              </button>
            ))}
          </div>
          <div style={{ marginTop:24, padding:14, background:"rgba(0,255,136,0.05)", borderRadius:10, border:"1px solid rgba(0,255,136,0.15)", fontSize:12, color:"#aaa", lineHeight:1.6 }}>
            <strong style={{ color:"#00ff88" }}>Firebase Integration:</strong> Replace <code style={{ color:"#ffd700" }}>FIREBASE_CONFIG_PLACEHOLDER</code> with your Firebase config and add Firestore + Auth SDK to enable real authentication, real-time data sync, and persistent storage.
          </div>
        </div>

        {/* Features preview */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginTop:16 }}>
          {[["🎮","Game"], ["💰","Wallet"], ["🛡️","Admin"]].map(([icon, label]) => (
            <div key={label} className="card" style={{ padding:14, textAlign:"center" }}>
              <div style={{ fontSize:22 }}>{icon}</div>
              <div style={{ fontSize:11, color:"#999", marginTop:4, letterSpacing:1 }}>{label.toUpperCase()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── HOME SCREEN ──────────────────────────────────────────────────────────
function HomeScreen({ user, setScreen, logout }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);

  const stats = [
    { label: "Balance", value: `₨${user.balance.toLocaleString()}`, color: "#00ff88", icon: "💎" },
    { label: "Total Won", value: `₨${user.totalWon.toLocaleString()}`, color: "#ffd700", icon: "🏆" },
    { label: "Games", value: user.gamesPlayed, color: "#3c78ff", icon: "🎮" },
    { label: "Win Rate", value: `${user.gamesPlayed ? Math.round((user.totalWon/(user.totalWon+user.totalLost))*100) : 0}%`, color: "#ff6b35", icon: "📈" },
  ];

  const menus = [
    { icon: "🎮", label: "Play Game", sub: "Invest & Win Big", screen: "game", color: "#00ff88", featured: true },
    { icon: "💰", label: "My Wallet", sub: `₨${user.balance.toLocaleString()}`, screen: "wallet", color: "#ffd700" },
    { icon: "📥", label: "Deposit", sub: "EasyPaisa / JazzCash", screen: "deposit", color: "#3c78ff" },
    { icon: "📤", label: "Withdraw", sub: "Fast Transfer", screen: "withdraw", color: "#ff6b35" },
    { icon: "📊", label: "History", sub: "All Transactions", screen: "history", color: "#9b59b6" },
  ];

  return (
    <div style={{ minHeight:"100vh", padding:20, maxWidth:480, margin:"0 auto" }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          {/* Mini logo */}
          <div style={{ position:"relative", flexShrink:0 }}>
            <svg width="44" height="44" viewBox="0 0 44 44" style={{ filter:"drop-shadow(0 0 8px rgba(0,255,136,0.5))" }}>
              <circle cx="22" cy="22" r="20" fill="rgba(0,255,136,0.07)" stroke="rgba(0,255,136,0.35)" strokeWidth="1.2" />
              {/* Grid */}
              <line x1="16" y1="12" x2="16" y2="32" stroke="#00ff88" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="28" y1="12" x2="28" y2="32" stroke="#00ff88" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="12" y1="18" x2="32" y2="18" stroke="#00ff88" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="12" y1="26" x2="32" y2="26" stroke="#00ff88" strokeWidth="1.5" strokeLinecap="round" />
              {/* X top-left */}
              <line x1="10" y1="10" x2="14" y2="16" stroke="#00ff88" strokeWidth="1.8" strokeLinecap="round" />
              <line x1="14" y1="10" x2="10" y2="16" stroke="#00ff88" strokeWidth="1.8" strokeLinecap="round" />
              {/* O center */}
              <circle cx="22" cy="22" r="3" fill="none" stroke="#ffd700" strokeWidth="1.8" />
              {/* X bottom-right */}
              <line x1="30" y1="28" x2="34" y2="34" stroke="#00ff88" strokeWidth="1.8" strokeLinecap="round" />
              <line x1="34" y1="28" x2="30" y2="34" stroke="#00ff88" strokeWidth="1.8" strokeLinecap="round" />
              {/* ₨ badge */}
              <circle cx="36" cy="8" r="6" fill="rgba(255,215,0,0.15)" stroke="#ffd700" strokeWidth="1" />
              <text x="36" y="11" textAnchor="middle" fill="#ffd700" fontSize="6" fontWeight="900" fontFamily="serif">₨</text>
            </svg>
          </div>
          <div>
            <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:16, fontWeight:900, letterSpacing:2, lineHeight:1.1 }}>
              <span style={{ color:"#00ff88" }}>TIC</span><span style={{ color:"#ffd700" }}>TAC</span><span style={{ color:"#fff" }}>WIN</span>
            </div>
            <div style={{ fontSize:10, color:"#888", letterSpacing:2, marginTop:1 }}>{time.toLocaleTimeString()}</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:13, fontWeight:700 }}>{user.name}</div>
            <div style={{ fontSize:11, color:"#00ff88" }}>PLAYER</div>
          </div>
          <button className="btn" onClick={logout} style={{ background:"rgba(255,60,60,0.1)", border:"1px solid rgba(255,60,60,0.2)", borderRadius:8, padding:"6px 12px", color:"#ff3c3c", fontSize:12, fontFamily:"inherit", fontWeight:600 }}>Logout</button>
        </div>
      </div>

      {/* Balance Card */}
      <div className="card" style={{ padding:24, marginBottom:16, background:"linear-gradient(135deg,rgba(0,255,136,0.1),rgba(0,20,10,0.8))", borderColor:"rgba(0,255,136,0.25)", position:"relative", overflow:"hidden", animation:"borderPulse 3s ease infinite" }}>
        {/* Background orbs */}
        <div style={{ position:"absolute", top:-30, right:-30, width:140, height:140, borderRadius:"50%", background:"radial-gradient(circle,rgba(0,255,136,0.08),transparent)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:-20, left:-20, width:80, height:80, borderRadius:"50%", background:"radial-gradient(circle,rgba(255,215,0,0.06),transparent)", pointerEvents:"none" }} />
        {/* Live dot */}
        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10 }}>
          <div style={{ width:6, height:6, borderRadius:"50%", background:"#00ff88", animation:"pulse 1.5s ease infinite" }} />
          <div style={{ fontSize:10, color:"#888", letterSpacing:2, textTransform:"uppercase" }}>Live Balance</div>
        </div>
        <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:34, fontWeight:900, color:"#00ff88", textShadow:"0 0 20px rgba(0,255,136,0.4)", animation:"float 3s ease infinite", letterSpacing:1 }}>
          ₨{user.balance.toLocaleString()}
        </div>
        <div style={{ marginTop:10, fontSize:12, color:"#888", display:"flex", alignItems:"center", gap:8 }}>
          <span>Available for games & withdrawals</span>
          <span style={{ marginLeft:"auto", background:"rgba(0,255,136,0.1)", border:"1px solid rgba(0,255,136,0.2)", borderRadius:20, padding:"2px 10px", fontSize:10, color:"#00ff88", fontWeight:700 }}>ACTIVE</span>
        </div>
        {/* Scrolling ticker */}
        <div style={{ marginTop:12, overflow:"hidden", borderTop:"1px solid rgba(255,255,255,0.05)", paddingTop:8 }}>
          <div style={{ display:"flex", gap:20, animation:"tickerText 12s linear infinite", whiteSpace:"nowrap", fontSize:10, color:"#777" }}>
            <span>🟢 Min Bet: ₨5</span>
            <span>•</span>
            <span>📥 Min Deposit: ₨10</span>
            <span>•</span>
            <span>📤 Min Withdraw: ₨50</span>
            <span>•</span>
            <span>🏆 Win Multiplier: 1.8×</span>
            <span>•</span>
            <span>🟢 Min Bet: ₨5</span>
            <span>•</span>
            <span>📥 Min Deposit: ₨10</span>
            <span>•</span>
            <span>📤 Min Withdraw: ₨50</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
        {stats.map(s => (
          <div key={s.label} className="card" style={{ padding:16 }}>
            <div style={{ fontSize:20 }}>{s.icon}</div>
            <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:20, fontWeight:700, color:s.color, marginTop:6 }}>{s.value}</div>
            <div style={{ fontSize:11, color:"#888", marginTop:2, letterSpacing:1 }}>{s.label.toUpperCase()}</div>
          </div>
        ))}
      </div>

      {/* Menu */}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {menus.map(m => (
          <button key={m.screen} className="btn" onClick={() => setScreen(m.screen)} style={{ background: m.featured ? `linear-gradient(135deg,rgba(0,255,136,0.15),rgba(0,255,136,0.05))` : "rgba(255,255,255,0.03)", border:`1px solid ${m.featured ? "rgba(0,255,136,0.3)" : "rgba(255,255,255,0.08)"}`, borderRadius:12, padding:"16px 20px", color:"#fff", display:"flex", alignItems:"center", gap:16, fontFamily:"inherit", cursor:"pointer", transition:"all 0.2s", textAlign:"left" }}>
            <div style={{ fontSize:28, width:44, height:44, background:`rgba(255,255,255,0.05)`, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center" }}>{m.icon}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:16, color: m.featured ? "#00ff88" : "#fff" }}>{m.label}</div>
              <div style={{ fontSize:12, color:"#999", marginTop:2 }}>{m.sub}</div>
            </div>
            <div style={{ color:"#777", fontSize:18 }}>›</div>
          </button>
        ))}
      </div>

      {/* Firebase hint */}
      <div style={{ marginTop:20, padding:12, background:"rgba(0,0,0,0.3)", borderRadius:10, border:"1px solid rgba(255,255,255,0.05)", fontSize:11, color:"#888", textAlign:"center" }}>
        🔥 Connect Firebase to enable real-time multiplayer, live balance sync & push notifications
      </div>
    </div>
  );
}

// ─── GAME SCREEN ──────────────────────────────────────────────────────────
function GameScreen({ user, users, updateUser, addTransaction, setGameHistory, setScreen, notify }) {
  const [bet, setBet] = useState(5);
  const [board, setBoard] = useState(Array(9).fill(null));
  const [phase, setPhase] = useState("betting"); // betting | playing | result
  const [current, setCurrent] = useState("X");
  const [result, setResult] = useState(null);
  const [winCombo, setWinCombo] = useState([]);
  const [botThinking, setBotThinking] = useState(false);
  const [shakeCell, setShakeCell] = useState(null);

  const betOptions = [5, 10, 20, 50, 100, 500];

  const startGame = () => {
    if (bet > user.balance) { notify("Insufficient balance!", "error"); return; }
    if (bet < 5) { notify("Minimum bet is ₨5", "error"); return; }
    setBoard(Array(9).fill(null));
    setCurrent("X");
    setResult(null);
    setWinCombo([]);
    setPhase("playing");
  };

  const handleClick = useCallback((idx) => {
    if (phase !== "playing" || board[idx] || current !== "X" || botThinking) return;
    const newBoard = [...board];
    newBoard[idx] = "X";
    setBoard(newBoard);
    const r = checkWinner(newBoard);
    if (r) { endGame(r, newBoard); return; }
    setCurrent("O");
    setBotThinking(true);
    setTimeout(() => {
      const botIdx = getBotMove(newBoard);
      const b2 = [...newBoard]; b2[botIdx] = "O";
      setBoard(b2);
      const r2 = checkWinner(b2);
      if (r2) { endGame(r2, b2); }
      else { setCurrent("X"); }
      setBotThinking(false);
    }, 600);
  }, [phase, board, current, botThinking]);

  const endGame = (r, finalBoard) => {
    setWinCombo(r.combo);
    setResult(r.winner);
    setPhase("result");
    const isWin = r.winner === "X";
    const isDraw = r.winner === "draw";
    let balanceDelta = 0;
    if (isWin) { balanceDelta = Math.floor(bet * 1.8); }
    else if (!isDraw) { balanceDelta = -bet; }
    const newBalance = user.balance + balanceDelta;
    updateUser(user.uid, {
      balance: newBalance,
      totalWon: isWin ? user.totalWon + Math.floor(bet * 1.8) : user.totalWon,
      totalLost: !isWin && !isDraw ? user.totalLost + bet : user.totalLost,
      gamesPlayed: user.gamesPlayed + 1,
    });
    if (balanceDelta !== 0) {
      addTransaction({ uid: user.uid, type: isWin ? "game_win" : "game_loss", amount: balanceDelta });
    }
    setGameHistory(prev => [{ id: `g${Date.now()}`, player: user.uid, opponent: "Bot", bet, result: r.winner === "X" ? "win" : r.winner === "draw" ? "draw" : "loss", ts: Date.now() }, ...prev]);
    if (isWin) notify(`🏆 You won ₨${Math.floor(bet*1.8).toLocaleString()}!`);
    else if (isDraw) notify("🤝 Draw! Bet returned.");
    else notify(`💸 Lost ₨${bet.toLocaleString()}`, "error");
  };

  const cellStyle = (idx) => {
    const isWin = winCombo.includes(idx);
    const val = board[idx];
    return {
      width:"100%", aspectRatio:"1", display:"flex", alignItems:"center", justifyContent:"center",
      fontSize: 48, fontWeight:900, fontFamily:"'Orbitron',sans-serif",
      background: isWin ? "rgba(0,255,136,0.15)" : "rgba(255,255,255,0.03)",
      border: `2px solid ${isWin ? "#00ff88" : val === "X" ? "rgba(0,255,136,0.3)" : val === "O" ? "rgba(255,60,60,0.3)" : "rgba(255,255,255,0.08)"}`,
      borderRadius: 16,
      cursor: phase === "playing" && !board[idx] && current === "X" && !botThinking ? "pointer" : "default",
      color: val === "X" ? "#00ff88" : val === "O" ? "#ff3c3c" : "#333",
      animation: isWin ? "glow 1s ease infinite" : shakeCell === idx ? "shake 0.3s ease" : "none",
      transition: "all 0.2s",
    };
  };

  return (
    <div style={{ minHeight:"100vh", padding:20, maxWidth:480, margin:"0 auto" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24 }}>
        <button className="btn" onClick={() => setScreen("home")} style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"8px 14px", color:"#888", fontFamily:"inherit" }}>‹ Back</button>
        <div>
          <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:20, fontWeight:900, color:"#00ff88" }}>GAME</div>
          <div style={{ fontSize:11, color:"#888", letterSpacing:2 }}>VS BOT</div>
        </div>
        <div style={{ marginLeft:"auto", textAlign:"right" }}>
          <div style={{ fontSize:12, color:"#999" }}>Balance</div>
          <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:16, color:"#00ff88", fontWeight:700 }}>₨{user.balance.toLocaleString()}</div>
        </div>
      </div>

      {phase === "betting" && (
        <div style={{ animation:"slideIn 0.4s ease" }}>
          <div className="card" style={{ padding:24, marginBottom:16, textAlign:"center" }}>
            <div style={{ fontSize:13, color:"#999", letterSpacing:2, marginBottom:20 }}>SELECT YOUR BET</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:20 }}>
              {betOptions.map(b => (
                <button key={b} className="btn" onClick={() => setBet(b)} style={{ padding:"14px 10px", background: bet===b ? "rgba(0,255,136,0.15)" : "rgba(255,255,255,0.03)", border:`1px solid ${bet===b ? "rgba(0,255,136,0.4)" : "rgba(255,255,255,0.08)"}`, borderRadius:10, color: bet===b ? "#00ff88" : "#888", fontFamily:"'Orbitron',sans-serif", fontSize:14, fontWeight:700 }}>
                  ₨{b.toLocaleString()}
                </button>
              ))}
            </div>
            <div style={{ marginBottom:16 }}>
              <label className="label">Custom Amount</label>
              <input className="input" type="number" value={bet} onChange={e => setBet(+e.target.value)} min="5" max={user.balance} />
            </div>
            <div className="card" style={{ padding:14, marginBottom:16, borderColor:"rgba(0,255,136,0.15)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                <span style={{ color:"#999", fontSize:13 }}>Bet Amount:</span>
                <span style={{ fontWeight:700, color:"#fff" }}>₨{bet.toLocaleString()}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                <span style={{ color:"#999", fontSize:13 }}>Win Multiplier:</span>
                <span style={{ color:"#00ff88", fontWeight:700 }}>1.8x</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                <span style={{ color:"#999", fontSize:13 }}>Potential Win:</span>
                <span style={{ fontFamily:"'Orbitron',sans-serif", color:"#ffd700", fontWeight:700 }}>₨{Math.floor(bet*1.8).toLocaleString()}</span>
              </div>
              <div style={{ borderTop:"1px solid rgba(255,255,255,0.05)", paddingTop:8, display:"flex", justifyContent:"space-between" }}>
                <span style={{ color:"#888", fontSize:11 }}>Min Bet:</span>
                <span style={{ color:"#999", fontSize:11, fontWeight:600 }}>₨5</span>
              </div>
            </div>
            <button className="btn" onClick={startGame} disabled={bet > user.balance || bet < 5} style={{ width:"100%", padding:"16px", background: bet > user.balance || bet < 5 ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg,#00ff88,#00cc6a)", border:"none", borderRadius:12, color: bet > user.balance || bet < 5 ? "#444" : "#000", fontFamily:"'Orbitron',sans-serif", fontWeight:900, fontSize:16, letterSpacing:2, cursor: bet > user.balance || bet < 5 ? "not-allowed" : "pointer" }}>
              {bet > user.balance ? "INSUFFICIENT BALANCE" : bet < 5 ? "MIN BET IS ₨5" : "START GAME"}
            </button>
          </div>
        </div>
      )}

      {(phase === "playing" || phase === "result") && (
        <div style={{ animation:"slideIn 0.4s ease" }}>
          {/* Status */}
          <div className="card" style={{ padding:14, marginBottom:16, textAlign:"center", borderColor: phase==="result" ? (result==="X" ? "rgba(0,255,136,0.3)" : result==="draw" ? "rgba(255,200,0,0.3)" : "rgba(255,60,60,0.3)") : "rgba(255,255,255,0.08)" }}>
            {phase === "playing" && (
              <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
                <div style={{ width:10, height:10, borderRadius:"50%", background: current==="X"?"#00ff88":"#ff3c3c", animation:"pulse 1s infinite" }} />
                <span style={{ fontWeight:700, color: current==="X"?"#00ff88":"#ff3c3c" }}>
                  {botThinking ? "Bot is thinking..." : current==="X" ? "Your turn (X)" : "Bot's turn (O)"}
                </span>
              </div>
            )}
            {phase === "result" && (
              <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:20, fontWeight:900, color: result==="X"?"#00ff88":result==="draw"?"#ffd700":"#ff3c3c" }}>
                {result==="X" ? `🏆 WIN! +₨${Math.floor(bet*1.8).toLocaleString()}` : result==="draw" ? "🤝 DRAW!" : `💸 LOSS -₨${bet.toLocaleString()}`}
              </div>
            )}
          </div>

          {/* Board */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:16 }}>
            {board.map((cell, idx) => (
              <div key={idx} style={cellStyle(idx)} onClick={() => handleClick(idx)}>
                {cell}
              </div>
            ))}
          </div>

          {/* Bet info */}
          <div style={{ display:"flex", gap:10, marginBottom:16 }}>
            <div className="card" style={{ flex:1, padding:12, textAlign:"center" }}>
              <div style={{ fontSize:11, color:"#888", letterSpacing:1 }}>BET</div>
              <div style={{ fontFamily:"'Orbitron',sans-serif", fontWeight:700, color:"#fff", marginTop:4 }}>₨{bet.toLocaleString()}</div>
            </div>
            <div className="card" style={{ flex:1, padding:12, textAlign:"center" }}>
              <div style={{ fontSize:11, color:"#888", letterSpacing:1 }}>WIN</div>
              <div style={{ fontFamily:"'Orbitron',sans-serif", fontWeight:700, color:"#00ff88", marginTop:4 }}>₨{Math.floor(bet*1.8).toLocaleString()}</div>
            </div>
            <div className="card" style={{ flex:1, padding:12, textAlign:"center" }}>
              <div style={{ fontSize:11, color:"#888", letterSpacing:1 }}>YOU</div>
              <div style={{ fontFamily:"'Orbitron',sans-serif", fontWeight:700, color:"#00ff88", marginTop:4 }}>X</div>
            </div>
          </div>

          {phase === "result" && (
            <div style={{ display:"flex", gap:10 }}>
              <button className="btn" onClick={() => setPhase("betting")} style={{ flex:1, padding:"14px", background:"rgba(0,255,136,0.1)", border:"1px solid rgba(0,255,136,0.3)", borderRadius:12, color:"#00ff88", fontFamily:"'Orbitron',sans-serif", fontWeight:700, fontSize:14 }}>
                PLAY AGAIN
              </button>
              <button className="btn" onClick={() => setScreen("home")} style={{ flex:1, padding:"14px", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:12, color:"#888", fontFamily:"inherit", fontWeight:700 }}>
                HOME
              </button>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div style={{ display:"flex", gap:16, justifyContent:"center", marginTop:20 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:12 }}>
          <span style={{ color:"#00ff88", fontWeight:700 }}>X</span>
          <span style={{ color:"#888" }}>You</span>
        </div>
        <div style={{ width:1, background:"#222" }} />
        <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:12 }}>
          <span style={{ color:"#ff3c3c", fontWeight:700 }}>O</span>
          <span style={{ color:"#888" }}>Bot</span>
        </div>
      </div>
    </div>
  );
}

// ─── WALLET SCREEN ────────────────────────────────────────────────────────
function WalletScreen({ user, users, transactions, setScreen, notify }) {
  const myTxns = transactions.filter(t => t.uid === user.uid).slice(0, 10);

  const txIcon = (type) => ({ deposit:"📥", withdraw:"📤", game_win:"🏆", game_loss:"💸" }[type] || "💳");
  const txColor = (type) => ({ deposit:"#00ff88", withdraw:"#ff6b35", game_win:"#ffd700", game_loss:"#ff3c3c" }[type] || "#888");
  const txLabel = (type) => ({ deposit:"Deposit", withdraw:"Withdrawal", game_win:"Game Win", game_loss:"Game Loss" }[type] || type);

  return (
    <div style={{ minHeight:"100vh", padding:20, maxWidth:480, margin:"0 auto" }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24 }}>
        <button className="btn" onClick={() => setScreen("home")} style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"8px 14px", color:"#888", fontFamily:"inherit" }}>‹</button>
        <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:18, fontWeight:900, color:"#ffd700" }}>WALLET</div>
      </div>

      {/* Balance Card */}
      <div className="card" style={{ padding:28, marginBottom:16, background:"linear-gradient(135deg,rgba(255,215,0,0.1),rgba(255,215,0,0.03))", borderColor:"rgba(255,215,0,0.25)", textAlign:"center", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, backgroundImage:"radial-gradient(circle at 50% 0%, rgba(255,215,0,0.1), transparent 60%)", pointerEvents:"none" }} />
        <div style={{ fontSize:13, color:"#aaa", letterSpacing:2, marginBottom:10 }}>AVAILABLE BALANCE</div>
        <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:44, fontWeight:900, color:"#ffd700", textShadow:"0 0 30px rgba(255,215,0,0.4)" }}>₨{user.balance.toLocaleString()}</div>
        <div style={{ fontSize:12, color:"#888", marginTop:8 }}>Pakistani Rupees</div>
      </div>

      {/* Quick Actions */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:20 }}>
        <button className="btn" onClick={() => setScreen("deposit")} style={{ padding:"16px", background:"rgba(0,255,136,0.08)", border:"1px solid rgba(0,255,136,0.2)", borderRadius:12, color:"#00ff88", fontFamily:"inherit", fontWeight:700 }}>
          <div style={{ fontSize:24, marginBottom:4 }}>📥</div>
          <div>Deposit</div>
        </button>
        <button className="btn" onClick={() => setScreen("withdraw")} style={{ padding:"16px", background:"rgba(255,107,53,0.08)", border:"1px solid rgba(255,107,53,0.2)", borderRadius:12, color:"#ff6b35", fontFamily:"inherit", fontWeight:700 }}>
          <div style={{ fontSize:24, marginBottom:4 }}>📤</div>
          <div>Withdraw</div>
        </button>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:20 }}>
        {[
          { label:"Won", value:`₨${user.totalWon.toLocaleString()}`, color:"#00ff88" },
          { label:"Lost", value:`₨${user.totalLost.toLocaleString()}`, color:"#ff3c3c" },
          { label:"Net", value:`₨${(user.totalWon-user.totalLost).toLocaleString()}`, color: (user.totalWon-user.totalLost)>=0?"#ffd700":"#ff3c3c" },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding:12, textAlign:"center" }}>
            <div style={{ fontSize:11, color:"#888", letterSpacing:1 }}>{s.label.toUpperCase()}</div>
            <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:14, fontWeight:700, color:s.color, marginTop:4 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Recent Transactions */}
      <div style={{ fontSize:13, color:"#999", letterSpacing:2, marginBottom:12 }}>RECENT TRANSACTIONS</div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {myTxns.length === 0 && <div className="card" style={{ padding:20, textAlign:"center", color:"#888" }}>No transactions yet</div>}
        {myTxns.map(tx => (
          <div key={tx.id} className="card" style={{ padding:14, display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ width:40, height:40, borderRadius:10, background:`rgba(255,255,255,0.05)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>{txIcon(tx.type)}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:600, fontSize:14 }}>{txLabel(tx.type)}</div>
              <div style={{ fontSize:11, color:"#888", marginTop:2 }}>{new Date(tx.ts).toLocaleDateString()} {tx.method ? `• ${tx.method}` : ""}</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontFamily:"'Orbitron',sans-serif", fontWeight:700, color:txColor(tx.type), fontSize:14 }}>
                {tx.amount > 0 ? "+" : ""}₨{Math.abs(tx.amount).toLocaleString()}
              </div>
              {tx.status && <div style={{ marginTop:4 }}><span className={`badge badge-${tx.status==="approved"||tx.status==="completed"?"success":tx.status==="pending"?"warning":"danger"}`}>{tx.status}</span></div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── DEPOSIT SCREEN ───────────────────────────────────────────────────────
function DepositScreen({ user, updateUser, addTransaction, setScreen, notify }) {
  const [method, setMethod] = useState("easypaisa");
  const [amount, setAmount] = useState(10);
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState("form"); // form | confirm | pending
  const [txId, setTxId] = useState("");

  const quickAmounts = [10, 50, 100, 500, 1000, 5000];

  const submit = () => {
    if (!phone || phone.length < 11) { notify("Enter valid phone number", "error"); return; }
    if (amount < 10) { notify("Minimum deposit is ₨10", "error"); return; }
    setStep("confirm");
  };

  const confirm = () => {
    const id = `TXN${Date.now()}`;
    setTxId(id);
    addTransaction({ uid: user.uid, type: "deposit", method, amount, phone, status: "pending" });
    // Simulate approval
    setTimeout(() => {
      updateUser(user.uid, { balance: user.balance + amount });
      addTransaction({ uid: user.uid, type: "deposit", method, amount, phone, status: "approved" });
      notify(`₨${amount.toLocaleString()} deposited successfully!`);
    }, 3000);
    setStep("pending");
  };

  const methodInfo = {
    easypaisa: { name: "EasyPaisa", color: "#00a651", icon: "🟢", number: "0300-EASYPAISA", logo: "EP" },
    jazzcash: { name: "JazzCash", color: "#ee1c24", icon: "🔴", number: "0308-JAZZCASH", logo: "JC" },
  };
  const m = methodInfo[method];

  return (
    <div style={{ minHeight:"100vh", padding:20, maxWidth:480, margin:"0 auto" }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24 }}>
        <button className="btn" onClick={() => step==="form" ? setScreen("wallet") : setStep("form")} style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"8px 14px", color:"#888", fontFamily:"inherit" }}>‹</button>
        <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:18, fontWeight:900, color:"#00ff88" }}>DEPOSIT</div>
      </div>

      {step === "form" && (
        <div style={{ animation:"slideIn 0.4s ease" }}>
          {/* Method Select */}
          <div style={{ fontSize:12, color:"#999", letterSpacing:2, marginBottom:10 }}>PAYMENT METHOD</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:20 }}>
            {Object.entries(methodInfo).map(([key, info]) => (
              <button key={key} className="btn" onClick={() => setMethod(key)} style={{ padding:"18px 14px", background: method===key ? `rgba(${key==="easypaisa"?"0,166,81":"238,28,36"},0.1)` : "rgba(255,255,255,0.03)", border:`2px solid ${method===key ? info.color : "rgba(255,255,255,0.08)"}`, borderRadius:12, color:"#fff", fontFamily:"inherit", textAlign:"left" }}>
                <div style={{ fontSize:28, marginBottom:6 }}>{info.icon}</div>
                <div style={{ fontWeight:700, fontSize:15, color: method===key ? info.color : "#888" }}>{info.name}</div>
                <div style={{ fontSize:11, color:"#888", marginTop:2 }}>Mobile Wallet</div>
              </button>
            ))}
          </div>

          {/* Amount */}
          <div style={{ fontSize:12, color:"#999", letterSpacing:2, marginBottom:10 }}>AMOUNT</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:8, marginBottom:12 }}>
            {quickAmounts.map(a => (
              <button key={a} className="btn" onClick={() => setAmount(a)} style={{ padding:"10px 4px", background: amount===a ? "rgba(0,255,136,0.12)" : "rgba(255,255,255,0.03)", border:`1px solid ${amount===a ? "rgba(0,255,136,0.4)" : "rgba(255,255,255,0.08)"}`, borderRadius:8, color: amount===a ? "#00ff88" : "#666", fontFamily:"inherit", fontSize:12, fontWeight:600 }}>
                {a>=1000?`${a/1000}K`:a}
              </button>
            ))}
          </div>
          <input className="input" type="number" value={amount} onChange={e => setAmount(+e.target.value)} placeholder="Custom amount" style={{ marginBottom:16 }} />

          {/* Phone */}
          <label className="label">Your {m.name} Number</label>
          <input className="input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="03XX-XXXXXXX" style={{ marginBottom:20 }} />

          {/* Summary */}
          <div className="card" style={{ padding:16, marginBottom:20, borderColor:`${m.color}33` }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
              <span style={{ color:"#999", fontSize:13 }}>Method:</span>
              <span style={{ fontWeight:700, color:m.color }}>{m.name}</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
              <span style={{ color:"#999", fontSize:13 }}>Amount:</span>
              <span style={{ fontWeight:700 }}>₨{amount.toLocaleString()}</span>
            </div>
            <div style={{ borderTop:"1px solid rgba(255,255,255,0.05)", paddingTop:8, display:"flex", justifyContent:"space-between" }}>
              <span style={{ color:"#999", fontSize:13 }}>Credit to wallet:</span>
              <span style={{ fontFamily:"'Orbitron',sans-serif", color:"#00ff88", fontWeight:700 }}>₨{amount.toLocaleString()}</span>
            </div>
            <div style={{ borderTop:"1px solid rgba(255,255,255,0.05)", paddingTop:8, marginTop:8, display:"flex", justifyContent:"space-between" }}>
              <span style={{ color:"#888", fontSize:11 }}>Min Deposit:</span>
              <span style={{ color:"#999", fontSize:11, fontWeight:600 }}>₨10</span>
            </div>
          </div>

          <button className="btn" onClick={submit} style={{ width:"100%", padding:"16px", background:"linear-gradient(135deg,#00ff88,#00cc6a)", border:"none", borderRadius:12, color:"#000", fontFamily:"'Orbitron',sans-serif", fontWeight:900, fontSize:15, letterSpacing:2 }}>
            PROCEED TO DEPOSIT
          </button>
        </div>
      )}

      {step === "confirm" && (
        <div style={{ animation:"slideIn 0.4s ease" }}>
          <div className="card" style={{ padding:24, textAlign:"center", borderColor:`${m.color}44` }}>
            <div style={{ width:70, height:70, borderRadius:"50%", background:`${m.color}22`, border:`2px solid ${m.color}`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px", fontSize:32 }}>{m.icon}</div>
            <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:22, fontWeight:900, color:m.color, marginBottom:6 }}>Send via {m.name}</div>
            <div style={{ color:"#999", fontSize:13, marginBottom:24 }}>Transfer money to our account</div>

            <div style={{ background:"rgba(255,255,255,0.03)", borderRadius:12, padding:20, marginBottom:20, textAlign:"left" }}>
              {[
                ["Send To:", m.number],
                ["Account:", m.logo + " Business Account"],
                ["Amount:", `₨${amount.toLocaleString()}`],
                ["Your Number:", phone],
              ].map(([k,v]) => (
                <div key={k} style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                  <span style={{ color:"#999", fontSize:13 }}>{k}</span>
                  <span style={{ fontWeight:700, color:k==="Amount:" ? "#00ff88" : "#fff", fontFamily: k==="Amount:" ? "'Orbitron',sans-serif" : "inherit" }}>{v}</span>
                </div>
              ))}
            </div>

            <div style={{ background:"rgba(255,200,0,0.08)", border:"1px solid rgba(255,200,0,0.2)", borderRadius:10, padding:12, marginBottom:20, fontSize:12, color:"#ffc800", lineHeight:1.6 }}>
              ⚠️ After sending, click Confirm. Your balance will be updated within 5 minutes after admin approval.
            </div>

            <div style={{ display:"flex", gap:10 }}>
              <button className="btn" onClick={() => setStep("form")} style={{ flex:1, padding:"13px", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, color:"#888", fontFamily:"inherit", fontWeight:600 }}>Back</button>
              <button className="btn" onClick={confirm} style={{ flex:2, padding:"13px", background:`linear-gradient(135deg,${m.color},${m.color}cc)`, border:"none", borderRadius:10, color:"#fff", fontFamily:"'Orbitron',sans-serif", fontWeight:700, fontSize:13 }}>I'VE SENT IT ✓</button>
            </div>
          </div>
        </div>
      )}

      {step === "pending" && (
        <div style={{ animation:"slideIn 0.4s ease", textAlign:"center" }}>
          <div className="card" style={{ padding:32 }}>
            <div style={{ fontSize:60, marginBottom:16, animation:"float 2s ease infinite" }}>⏳</div>
            <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:20, fontWeight:900, color:"#ffd700", marginBottom:8 }}>PROCESSING</div>
            <div style={{ color:"#999", fontSize:13, marginBottom:20 }}>Your deposit is being verified</div>
            <div className="card" style={{ padding:14, marginBottom:20, background:"rgba(0,255,136,0.05)", borderColor:"rgba(0,255,136,0.15)" }}>
              <div style={{ fontSize:11, color:"#888", letterSpacing:1, marginBottom:6 }}>TRANSACTION ID</div>
              <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:14, color:"#00ff88", fontWeight:700 }}>{txId}</div>
            </div>
            <div style={{ display:"flex", gap:4, justifyContent:"center", marginBottom:20 }}>
              {[0,1,2].map(i => <div key={i} style={{ width:8, height:8, borderRadius:"50%", background:"#00ff88", animation:`pulse 1s ease infinite`, animationDelay:`${i*0.2}s` }} />)}
            </div>
            <button className="btn" onClick={() => setScreen("home")} style={{ width:"100%", padding:"14px", background:"rgba(0,255,136,0.1)", border:"1px solid rgba(0,255,136,0.2)", borderRadius:10, color:"#00ff88", fontFamily:"inherit", fontWeight:700 }}>
              Go to Home
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── WITHDRAW SCREEN ──────────────────────────────────────────────────────
function WithdrawScreen({ user, updateUser, addTransaction, setScreen, notify }) {
  const [method, setMethod] = useState("jazzcash");
  const [amount, setAmount] = useState(50);
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submit = () => {
    if (!phone || phone.length < 11) { notify("Enter valid phone number", "error"); return; }
    if (amount < 50) { notify("Minimum withdrawal is ₨50", "error"); return; }
    if (amount > user.balance) { notify("Insufficient balance", "error"); return; }
    updateUser(user.uid, { balance: user.balance - amount });
    addTransaction({ uid: user.uid, type: "withdraw", method, amount: -amount, phone, status: "pending" });
    notify("Withdrawal request submitted!");
    setSubmitted(true);
  };

  const methodInfo = {
    jazzcash: { name: "JazzCash", color: "#ee1c24", icon: "🔴" },
    easypaisa: { name: "EasyPaisa", color: "#00a651", icon: "🟢" },
  };

  if (submitted) return (
    <div style={{ minHeight:"100vh", padding:20, maxWidth:480, margin:"0 auto", display:"flex", flexDirection:"column", justifyContent:"center", alignItems:"center" }}>
      <div className="card" style={{ padding:32, textAlign:"center", width:"100%" }}>
        <div style={{ fontSize:60, marginBottom:16 }}>✅</div>
        <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:22, fontWeight:900, color:"#00ff88", marginBottom:8 }}>SUBMITTED!</div>
        <div style={{ color:"#999", marginBottom:8 }}>Your withdrawal of</div>
        <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:28, color:"#ffd700", fontWeight:900, marginBottom:8 }}>₨{amount.toLocaleString()}</div>
        <div style={{ color:"#999", fontSize:13, marginBottom:24 }}>will arrive within 2-6 hours</div>
        <button className="btn" onClick={() => setScreen("home")} style={{ width:"100%", padding:"14px", background:"linear-gradient(135deg,#00ff88,#00cc6a)", border:"none", borderRadius:10, color:"#000", fontFamily:"'Orbitron',sans-serif", fontWeight:700 }}>DONE</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", padding:20, maxWidth:480, margin:"0 auto" }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24 }}>
        <button className="btn" onClick={() => setScreen("wallet")} style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"8px 14px", color:"#888", fontFamily:"inherit" }}>‹</button>
        <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:18, fontWeight:900, color:"#ff6b35" }}>WITHDRAW</div>
        <div style={{ marginLeft:"auto" }}>
          <div style={{ fontSize:11, color:"#888" }}>Available</div>
          <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:14, color:"#00ff88", fontWeight:700 }}>₨{user.balance.toLocaleString()}</div>
        </div>
      </div>

      <div style={{ fontSize:12, color:"#999", letterSpacing:2, marginBottom:10 }}>RECEIVE VIA</div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:20 }}>
        {Object.entries(methodInfo).map(([key, info]) => (
          <button key={key} className="btn" onClick={() => setMethod(key)} style={{ padding:"18px 14px", background: method===key ? `rgba(${key==="easypaisa"?"0,166,81":"238,28,36"},0.1)` : "rgba(255,255,255,0.03)", border:`2px solid ${method===key ? info.color : "rgba(255,255,255,0.08)"}`, borderRadius:12, color:"#fff", fontFamily:"inherit", textAlign:"left" }}>
            <div style={{ fontSize:28, marginBottom:6 }}>{info.icon}</div>
            <div style={{ fontWeight:700, fontSize:15, color: method===key ? info.color : "#888" }}>{info.name}</div>
          </button>
        ))}
      </div>

      <label className="label">Withdrawal Amount (₨)</label>
      <input className="input" type="number" value={amount} onChange={e => setAmount(+e.target.value)} min="200" max={user.balance} style={{ marginBottom:16 }} />

      <label className="label">Your {methodInfo[method].name} Number</label>
      <input className="input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="03XX-XXXXXXX" style={{ marginBottom:20 }} />

      <div className="card" style={{ padding:16, marginBottom:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
          <span style={{ color:"#999", fontSize:13 }}>Withdrawal:</span>
          <span style={{ fontWeight:700 }}>₨{amount.toLocaleString()}</span>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
          <span style={{ color:"#999", fontSize:13 }}>Fee:</span>
          <span style={{ color:"#00ff88", fontWeight:600 }}>Free</span>
        </div>
        <div style={{ borderTop:"1px solid rgba(255,255,255,0.05)", paddingTop:8, display:"flex", justifyContent:"space-between" }}>
          <span style={{ color:"#999", fontSize:13 }}>You receive:</span>
          <span style={{ fontFamily:"'Orbitron',sans-serif", color:"#00ff88", fontWeight:700 }}>₨{amount.toLocaleString()}</span>
        </div>
        <div style={{ borderTop:"1px solid rgba(255,255,255,0.05)", paddingTop:8, marginTop:8, display:"flex", justifyContent:"space-between" }}>
          <span style={{ color:"#888", fontSize:11 }}>Min Withdrawal:</span>
          <span style={{ color:"#999", fontSize:11, fontWeight:600 }}>₨50</span>
        </div>
      </div>

      <button className="btn" onClick={submit} disabled={amount > user.balance || amount < 50} style={{ width:"100%", padding:"16px", background: amount>user.balance || amount<50 ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg,#ff6b35,#ff3c3c)", border:"none", borderRadius:12, color: amount>user.balance || amount<50 ? "#444" : "#fff", fontFamily:"'Orbitron',sans-serif", fontWeight:900, fontSize:15, letterSpacing:2, cursor: amount>user.balance || amount<50 ? "not-allowed" : "pointer" }}>
        {amount > user.balance ? "INSUFFICIENT BALANCE" : amount < 50 ? "MIN WITHDRAWAL ₨50" : "REQUEST WITHDRAWAL"}
      </button>
    </div>
  );
}

// ─── HISTORY SCREEN ───────────────────────────────────────────────────────
function HistoryScreen({ user, transactions, gameHistory, setScreen }) {
  const [tab, setTab] = useState("transactions");
  const myTxns = transactions.filter(t => t.uid === user.uid);
  const myGames = gameHistory.filter(g => g.player === user.uid);

  return (
    <div style={{ minHeight:"100vh", padding:20, maxWidth:480, margin:"0 auto" }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24 }}>
        <button className="btn" onClick={() => setScreen("home")} style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"8px 14px", color:"#888", fontFamily:"inherit" }}>‹</button>
        <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:18, fontWeight:900, color:"#9b59b6" }}>HISTORY</div>
      </div>

      <div style={{ display:"flex", gap:8, marginBottom:20, background:"rgba(255,255,255,0.03)", padding:4, borderRadius:10 }}>
        {["transactions","games"].map(t => (
          <button key={t} className={`tab ${tab===t?"active":""}`} onClick={() => setTab(t)} style={{ flex:1, textAlign:"center" }}>
            {t === "transactions" ? "💳 Transactions" : "🎮 Games"}
          </button>
        ))}
      </div>

      {tab === "transactions" && (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {myTxns.length === 0 && <div className="card" style={{ padding:20, textAlign:"center", color:"#888" }}>No transactions</div>}
          {myTxns.map(tx => (
            <div key={tx.id} className="card" style={{ padding:14, display:"flex", alignItems:"center", gap:14 }}>
              <div style={{ fontSize:22 }}>{{ deposit:"📥", withdraw:"📤", game_win:"🏆", game_loss:"💸" }[tx.type] || "💳"}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:14 }}>{{ deposit:"Deposit", withdraw:"Withdrawal", game_win:"Game Win", game_loss:"Game Loss" }[tx.type] || tx.type}</div>
                <div style={{ fontSize:11, color:"#888", marginTop:2 }}>{new Date(tx.ts).toLocaleString()}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontWeight:700, color:{ deposit:"#00ff88", withdraw:"#ff6b35", game_win:"#ffd700", game_loss:"#ff3c3c" }[tx.type] || "#888" }}>
                  {tx.amount > 0 ? "+" : ""}₨{Math.abs(tx.amount).toLocaleString()}
                </div>
                <div style={{ marginTop:4 }}><span className={`badge badge-${tx.status==="approved"||tx.status==="completed"?"success":tx.status==="pending"?"warning":"danger"}`}>{tx.status}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "games" && (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {myGames.length === 0 && <div className="card" style={{ padding:20, textAlign:"center", color:"#888" }}>No games played</div>}
          {myGames.map(g => (
            <div key={g.id} className="card" style={{ padding:14, display:"flex", alignItems:"center", gap:14 }}>
              <div style={{ fontSize:22 }}>{{ win:"🏆", loss:"💸", draw:"🤝" }[g.result]}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:14 }}>vs {g.opponent}</div>
                <div style={{ fontSize:11, color:"#888", marginTop:2 }}>{new Date(g.ts).toLocaleString()}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontFamily:"'Orbitron',sans-serif", fontWeight:700, color:{ win:"#00ff88", loss:"#ff3c3c", draw:"#ffd700" }[g.result] }}>
                  {g.result==="win" ? `+₨${Math.floor(g.bet*1.8).toLocaleString()}` : g.result==="draw" ? "₨0" : `-₨${g.bet.toLocaleString()}`}
                </div>
                <div style={{ marginTop:4 }}><span className={`badge badge-${g.result==="win"?"success":g.result==="draw"?"warning":"danger"}`}>{g.result.toUpperCase()}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ADMIN SCREEN ─────────────────────────────────────────────────────────
function AdminScreen({ users, transactions, gameHistory, updateUser, setTransactions, setScreen, notify, logout }) {
  const [tab, setTab] = useState("dashboard");

  const totalUsers = Object.keys(users).filter(k => users[k].role !== "admin").length;
  const totalDeposits = transactions.filter(t => t.type==="deposit" && t.status==="approved").reduce((s,t) => s+t.amount, 0);
  const totalWithdrawals = transactions.filter(t => t.type==="withdraw").reduce((s,t) => s+Math.abs(t.amount), 0);
  const pendingTxns = transactions.filter(t => t.status==="pending");
  const totalRevenue = transactions.filter(t => t.type==="game_loss").reduce((s,t) => s+Math.abs(t.amount), 0);

  const approveWithdraw = (txId) => {
    setTransactions(prev => prev.map(t => t.id===txId ? {...t, status:"approved"} : t));
    notify("Withdrawal approved!");
  };

  const rejectWithdraw = (txId) => {
    setTransactions(prev => prev.map(t => t.id===txId ? {...t, status:"rejected"} : t));
    notify("Transaction rejected", "error");
  };

  const approveDeposit = (tx) => {
    setTransactions(prev => prev.map(t => t.id===tx.id ? {...t, status:"approved"} : t));
    updateUser(tx.uid, { balance: (users[tx.uid]?.balance || 0) + tx.amount });
    notify("Deposit approved & credited!");
  };

  const tabs = ["dashboard","users","transactions","settings"];

  return (
    <div style={{ minHeight:"100vh", padding:20, maxWidth:520, margin:"0 auto" }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <div>
          <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:18, fontWeight:900, color:"#3c78ff", letterSpacing:2 }}>ADMIN PANEL</div>
          <div style={{ fontSize:11, color:"#888", letterSpacing:1 }}>TicTacWin Control Center</div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {pendingTxns.length > 0 && <div style={{ background:"rgba(255,200,0,0.15)", border:"1px solid rgba(255,200,0,0.3)", borderRadius:20, padding:"4px 12px", fontSize:12, color:"#ffc800", fontWeight:700 }}>⚡ {pendingTxns.length} Pending</div>}
          <button className="btn" onClick={logout} style={{ background:"rgba(255,60,60,0.1)", border:"1px solid rgba(255,60,60,0.2)", borderRadius:8, padding:"6px 12px", color:"#ff3c3c", fontSize:12, fontFamily:"inherit", fontWeight:600 }}>Logout</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:6, marginBottom:20, overflowX:"auto", background:"rgba(255,255,255,0.02)", padding:4, borderRadius:10 }}>
        {tabs.map(t => (
          <button key={t} className={`tab ${tab===t?"active":""}`} onClick={() => setTab(t)} style={{ whiteSpace:"nowrap", textTransform:"capitalize" }}>
            {{"dashboard":"📊","users":"👥","transactions":"💳","settings":"⚙️"}[t]} {t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "dashboard" && (
        <div style={{ animation:"slideIn 0.4s ease" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
            {[
              { label:"Total Users", value:totalUsers, icon:"👥", color:"#3c78ff" },
              { label:"Revenue", value:`₨${totalRevenue.toLocaleString()}`, icon:"💎", color:"#00ff88" },
              { label:"Deposits", value:`₨${totalDeposits.toLocaleString()}`, icon:"📥", color:"#ffd700" },
              { label:"Withdrawals", value:`₨${totalWithdrawals.toLocaleString()}`, icon:"📤", color:"#ff6b35" },
            ].map(s => (
              <div key={s.label} className="card" style={{ padding:16 }}>
                <div style={{ fontSize:22 }}>{s.icon}</div>
                <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:18, fontWeight:700, color:s.color, marginTop:6 }}>{s.value}</div>
                <div style={{ fontSize:11, color:"#888", marginTop:2, letterSpacing:1 }}>{s.label.toUpperCase()}</div>
              </div>
            ))}
          </div>

          {/* Pending actions */}
          <div style={{ fontSize:12, color:"#999", letterSpacing:2, marginBottom:10 }}>PENDING APPROVALS</div>
          {pendingTxns.length === 0 && <div className="card" style={{ padding:20, textAlign:"center", color:"#888" }}>No pending transactions ✓</div>}
          {pendingTxns.map(tx => (
            <div key={tx.id} className="card" style={{ padding:14, marginBottom:8, borderColor:"rgba(255,200,0,0.2)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:14, textTransform:"capitalize" }}>{tx.type} via {tx.method}</div>
                  <div style={{ fontSize:11, color:"#888", marginTop:2 }}>{users[tx.uid]?.name} • {tx.phone}</div>
                </div>
                <div style={{ fontFamily:"'Orbitron',sans-serif", fontWeight:700, color: tx.type==="deposit"?"#00ff88":"#ff6b35", fontSize:16 }}>
                  ₨{Math.abs(tx.amount).toLocaleString()}
                </div>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button className="btn" onClick={() => tx.type==="deposit" ? approveDeposit(tx) : approveWithdraw(tx.id)} style={{ flex:1, padding:"8px", background:"rgba(0,255,136,0.1)", border:"1px solid rgba(0,255,136,0.3)", borderRadius:8, color:"#00ff88", fontFamily:"inherit", fontWeight:600, fontSize:12 }}>
                  ✓ Approve
                </button>
                <button className="btn" onClick={() => rejectWithdraw(tx.id)} style={{ flex:1, padding:"8px", background:"rgba(255,60,60,0.1)", border:"1px solid rgba(255,60,60,0.3)", borderRadius:8, color:"#ff3c3c", fontFamily:"inherit", fontWeight:600, fontSize:12 }}>
                  ✗ Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "users" && (
        <div style={{ animation:"slideIn 0.4s ease" }}>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {Object.values(users).filter(u => u.role !== "admin").map(u => (
              <div key={u.uid} className="card" style={{ padding:16 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:15 }}>{u.name}</div>
                    <div style={{ fontSize:11, color:"#999", marginTop:2 }}>{u.email}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:16, color:"#00ff88", fontWeight:700 }}>₨{u.balance.toLocaleString()}</div>
                    <div style={{ fontSize:11, color:"#888", marginTop:2 }}>{u.gamesPlayed} games</div>
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, fontSize:11 }}>
                  <div style={{ background:"rgba(0,255,136,0.05)", borderRadius:6, padding:8, textAlign:"center" }}>
                    <div style={{ color:"#888" }}>WON</div>
                    <div style={{ color:"#00ff88", fontWeight:700 }}>₨{u.totalWon.toLocaleString()}</div>
                  </div>
                  <div style={{ background:"rgba(255,60,60,0.05)", borderRadius:6, padding:8, textAlign:"center" }}>
                    <div style={{ color:"#888" }}>LOST</div>
                    <div style={{ color:"#ff3c3c", fontWeight:700 }}>₨{u.totalLost.toLocaleString()}</div>
                  </div>
                  <div style={{ background:"rgba(60,120,255,0.05)", borderRadius:6, padding:8, textAlign:"center" }}>
                    <div style={{ color:"#888" }}>W/R</div>
                    <div style={{ color:"#3c78ff", fontWeight:700 }}>{u.gamesPlayed ? Math.round((u.totalWon/(u.totalWon+u.totalLost))*100) : 0}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "transactions" && (
        <div style={{ animation:"slideIn 0.4s ease" }}>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {transactions.map(tx => (
              <div key={tx.id} className="card" style={{ padding:14, display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ fontSize:20 }}>{{ deposit:"📥", withdraw:"📤", game_win:"🏆", game_loss:"💸" }[tx.type] || "💳"}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:13 }}>{users[tx.uid]?.name || tx.uid}</div>
                  <div style={{ fontSize:11, color:"#888" }}>{tx.type} {tx.method ? `• ${tx.method}` : ""}</div>
                  <div style={{ fontSize:10, color:"#777", marginTop:2 }}>{new Date(tx.ts).toLocaleString()}</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontWeight:700, color:{ deposit:"#00ff88", withdraw:"#ff6b35", game_win:"#ffd700", game_loss:"#ff3c3c" }[tx.type] || "#888", fontSize:14 }}>
                    {tx.amount > 0 ? "+" : ""}₨{Math.abs(tx.amount).toLocaleString()}
                  </div>
                  <div style={{ marginTop:4 }}>
                    <span className={`badge badge-${tx.status==="approved"||tx.status==="completed"?"success":tx.status==="pending"?"warning":"danger"}`} style={{ fontSize:10 }}>{tx.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "settings" && (
        <div style={{ animation:"slideIn 0.4s ease" }}>
          <div className="card" style={{ padding:20, marginBottom:12 }}>
            <div style={{ fontWeight:700, marginBottom:16, color:"#3c78ff", letterSpacing:1 }}>🔥 Firebase Config</div>
            <div style={{ fontSize:12, color:"#999", lineHeight:1.8, fontFamily:"monospace", background:"rgba(0,0,0,0.3)", padding:14, borderRadius:8, overflowX:"auto" }}>
              {`const firebaseConfig = {\n  apiKey: "YOUR_API_KEY",\n  authDomain: "YOUR_PROJECT.firebaseapp.com",\n  projectId: "YOUR_PROJECT_ID",\n  storageBucket: "YOUR_PROJECT.appspot.com",\n  messagingSenderId: "YOUR_SENDER_ID",\n  appId: "YOUR_APP_ID"\n};`}
            </div>
            <div style={{ marginTop:12, fontSize:12, color:"#888", lineHeight:1.6 }}>
              Replace with your Firebase credentials. Add Firestore rules to protect user data.
            </div>
          </div>

          <div className="card" style={{ padding:20, marginBottom:12 }}>
            <div style={{ fontWeight:700, marginBottom:12, color:"#00a651", letterSpacing:1 }}>🟢 EasyPaisa Integration</div>
            <div style={{ fontSize:12, color:"#999", lineHeight:1.8 }}>
              • Use <strong style={{ color:"#fff" }}>EasyPaisa Payment Gateway API</strong><br/>
              • Merchant ID + Hash Key required<br/>
              • Webhook URL: <code style={{ color:"#00ff88" }}>/api/easypaisa/webhook</code>
            </div>
          </div>

          <div className="card" style={{ padding:20, marginBottom:12 }}>
            <div style={{ fontWeight:700, marginBottom:12, color:"#ee1c24", letterSpacing:1 }}>🔴 JazzCash Integration</div>
            <div style={{ fontSize:12, color:"#999", lineHeight:1.8 }}>
              • Use <strong style={{ color:"#fff" }}>JazzCash REST API</strong><br/>
              • Merchant ID + Password + IntegrityKey required<br/>
              • Webhook URL: <code style={{ color:"#ff3c3c" }}>/api/jazzcash/webhook</code>
            </div>
          </div>

          <div className="card" style={{ padding:20 }}>
            <div style={{ fontWeight:700, marginBottom:12, color:"#ffd700", letterSpacing:1 }}>⚙️ Game Settings</div>
            {[["Win Multiplier", "1.8x"], ["Min Bet", "₨5"], ["Min Deposit", "₨10"], ["Min Withdraw", "₨50"], ["Platform Fee", "0%"]].map(([k,v]) => (
              <div key={k} style={{ display:"flex", justifyContent:"space-between", marginBottom:10, paddingBottom:10, borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                <span style={{ fontSize:13, color:"#999" }}>{k}</span>
                <span style={{ fontWeight:700, color:"#fff" }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
