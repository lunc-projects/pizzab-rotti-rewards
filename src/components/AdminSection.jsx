import { useEffect, useState } from 'react';
import { PIZZAB, ROTTI, isContractDeployed } from '../config.js';
import { useWalletCtx } from './hooks.js';
import { queryConfig, adminRegisterCollection, adminAddReward, adminSetRewardRate, adminSetStakeFee, adminSetLockPeriod, adminPauseReward, adminUnpauseReward, fundPool, adminTransferAdmin, chainUpdateAdmin } from '../lib/stakingClient.js';
import { cw721ContractInfo, lcdContractInfo } from '../lib/lcd.js';
import { isValidTerraAddress, toBaseUnits } from '../lib/format.js';

const TOKENS = { PIZZAB, ROTTI };

export default function AdminSection({ collections }) {
  const { address, getSigningClient } = useWalletCtx();
  const [config, setConfig] = useState(null);
  const [msg, setMsg] = useState(null);
  // form state
  const [newCw721, setNewCw721] = useState('');
  const [verify, setVerify] = useState(null);
  const [coll, setColl] = useState('');
  const [tokenSym, setTokenSym] = useState('PIZZAB');
  const [rate, setRate] = useState('');
  const [fundAmt, setFundAmt] = useState('');
  const [feeLunc, setFeeLunc] = useState('');
  const [lockDays, setLockDays] = useState('');
  // transfer admin state
  const [newAdmin, setNewAdmin] = useState('');
  const [confirmArm, setConfirmArm] = useState(false);
  const [transferBusy, setTransferBusy] = useState(false);
  const [transferMsg, setTransferMsg] = useState(null);
  const [chainPending, setChainPending] = useState(null); // target addr if app admin moved but chain upgrade admin did not
  const [lastTransfer, setLastTransfer] = useState(null); // { target, appTx, chainTx } after a full transfer

  useEffect(() => { (async () => { try { setConfig(await queryConfig()); } catch { setConfig(null); } })(); }, []);
  const adminAddr = config?.admin || config?.owner || null;
  const isAdmin = Boolean(address && adminAddr && address === adminAddr);
  const deployed = isContractDeployed();
  const activeColl = coll || collections[0]?.cw721 || '';
  const token = TOKENS[tokenSym];

  async function run(label, fn) {
    setMsg(null);
    try { const client = await getSigningClient(); const res = await fn(client); setMsg(`${label} — tx ${res.transactionHash}`); }
    catch (e) { setMsg(e.message); }
  }

  async function runTransfer() {
    const target = newAdmin.trim();
    if (!isValidTerraAddress(target) || target === adminAddr || transferBusy) return;
    if (!confirmArm) { setConfirmArm(true); return; }
    setTransferBusy(true); setTransferMsg(null);
    try {
      const client = await getSigningClient();
      // Step 1: the contract's own admin (controls everything in this app)
      const r1 = await adminTransferAdmin(client, address, target);
      setTransferMsg(`Step 1 done — app admin is now ${target} (tx ${r1.transactionHash}). Now moving the contract's upgrade admin…`);
      // Step 2: the chain-level admin (migration / upgrade rights), signed by the current chain admin
      try {
        const r2 = await chainUpdateAdmin(client, address, target);
        setLastTransfer({ target, appTx: r1.transactionHash, chainTx: r2.transactionHash });
        setChainPending(null);
        setTransferMsg(`✅ Admin fully transferred to ${target}. App admin tx ${r1.transactionHash} · Upgrade admin tx ${r2.transactionHash}.`);
        try { setConfig(await queryConfig()); } catch { /* panel locks on next load either way */ }
      } catch (e2) {
        setChainPending(target);
        setTransferMsg(`⚠️ App admin moved to ${target} (tx ${r1.transactionHash}), but the contract's upgrade admin did NOT move: ${e2.message} — this wallet still holds upgrade rights. Use the retry button below to finish the handover.`);
      }
    } catch (e) {
      setTransferMsg(`Transfer failed — nothing changed: ${e.message}`);
    }
    setTransferBusy(false); setConfirmArm(false);
  }

  async function retryChainSync() {
    if (!chainPending || transferBusy) return;
    setTransferBusy(true);
    try {
      const client = await getSigningClient();
      const r2 = await chainUpdateAdmin(client, address, chainPending);
      setLastTransfer({ target: chainPending, appTx: lastTransfer?.appTx || '(earlier)', chainTx: r2.transactionHash });
      setTransferMsg(`✅ Upgrade admin moved to ${chainPending} (tx ${r2.transactionHash}). Admin handover is now complete.`);
      setChainPending(null);
      try { setConfig(await queryConfig()); } catch { /* ignore */ }
    } catch (e) { setTransferMsg(`Retry failed: ${e.message}`); }
    setTransferBusy(false);
  }

  async function verifyCollection() {
    setVerify(null);
    if (!isValidTerraAddress(newCw721)) { setVerify({ err: 'That does not look like a valid terra1… contract address.' }); return; }
    try {
      const ci = await cw721ContractInfo(newCw721);
      const meta = await lcdContractInfo(newCw721).catch(() => null);
      setVerify({ name: ci?.name, symbol: ci?.symbol, codeId: meta?.code_id });
    } catch { setVerify({ err: 'Could not read that contract on-chain — check the address.' }); }
  }

  if (!deployed) {
    return (
      <section>
        <h2>Admin</h2>
        <div className="empty">
          <p className="big">🔒 Admin unlocks at deployment</p>
          <p>The admin panel is controlled by <strong>one owner wallet only</strong> — no governance, no voting. Once the staking contract is deployed and its address is set in the app config, the wallet that deployed it will see: Add Collection, Add PIZZAB / ROTTI Rewards, Set Rates, Fund Pools, Stake Fee, Lock Period, and Pause / Resume.</p>
          {/* Render the collection verify tool now — it works purely from the LCD. */}
          <div className="form">
            <label>Preview a future collection (CW721 address)
              <input value={newCw721} onChange={(e) => setNewCw721(e.target.value)} placeholder="terra1…" />
            </label>
            <button className="btn" onClick={verifyCollection}>Verify on-chain</button>
            {verify && <p className="notice">{verify.err || `Found: ${verify.name || '—'} (${verify.symbol || '—'})${verify.codeId ? ` · code_id ${verify.codeId}` : ''}`}</p>}
          </div>
        </div>
      </section>
    );
  }

  if (!address) return (<section><h2>Admin</h2><div className="empty"><p>Connect the owner wallet to use the admin panel.</p></div></section>);
  if (adminAddr && !isAdmin) return (
    <section><h2>Admin</h2>
      <div className="empty"><p>🔒 This wallet is not the admin for this app. Admin: {adminAddr}</p>
      {lastTransfer && <p className="notice">✅ You transferred admin to {lastTransfer.target}. App admin tx {lastTransfer.appTx} · Upgrade admin tx {lastTransfer.chainTx}. Connect the new admin wallet to manage the app.</p>}
      {chainPending && <>
        <p className="notice">⚠️ One step is unfinished: the contract's upgrade admin has not moved to {chainPending} yet, and this wallet still holds it. Finish the handover:</p>
        <button className="btn primary" disabled={transferBusy} onClick={retryChainSync}>{transferBusy ? 'Working…' : 'Retry upgrade-admin transfer'}</button>
        {transferMsg && <p className="notice">{transferMsg}</p>}
      </>}
      </div>
    </section>);

  return (
    <section>
      <h2>Admin</h2>
      {msg && <p className="notice">{msg}</p>}
      <div className="form card wide">
        <h3>Add Collection</h3>
        <label>CW721 address <input value={newCw721} onChange={(e) => setNewCw721(e.target.value)} placeholder="terra1…" /></label>
        <div className="row">
          <button className="btn" onClick={verifyCollection}>Verify on-chain</button>
          <button className="btn primary" disabled={!isValidTerraAddress(newCw721)} onClick={() => run('Collection registered', (c) => adminRegisterCollection(c, address, newCw721.trim()))}>Register Collection</button>
        </div>
        {verify && <p className="notice">{verify.err || `Found: ${verify.name || '—'} (${verify.symbol || '—'})`}</p>}
      </div>

      <div className="form card wide">
        <h3>Rewards — {tokenSym}</h3>
        <label>Collection
          <select value={activeColl} onChange={(e) => setColl(e.target.value)}>
            {collections.map((c) => <option key={c.cw721} value={c.cw721}>{c.name || c.cw721}</option>)}
          </select>
        </label>
        <label>Reward token
          <select value={tokenSym} onChange={(e) => setTokenSym(e.target.value)}><option>PIZZAB</option><option>ROTTI</option></select>
        </label>
        <div className="row">
          <button className="btn" onClick={() => run(`${tokenSym} reward added`, (c) => adminAddReward(c, address, activeColl, token.address))}>Add {tokenSym} Reward</button>
          <button className="btn ghost" onClick={() => run('Reward paused', (c) => adminPauseReward(c, address, activeColl, token.address))}>Pause</button>
          <button className="btn ghost" onClick={() => run('Reward resumed', (c) => adminUnpauseReward(c, address, activeColl, token.address))}>Resume</button>
        </div>
        <label>Rate per NFT per day ({tokenSym}) <input inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="e.g. 100" /></label>
        <button className="btn primary" disabled={!rate} onClick={() => run('Rate set', (c) => adminSetRewardRate(c, address, activeColl, token.address, toBaseUnits(rate, token.decimals)))}>Set Rate</button>
        <label>Fund pool amount ({tokenSym}) <input inputMode="decimal" value={fundAmt} onChange={(e) => setFundAmt(e.target.value)} placeholder="e.g. 1000000" /></label>
        <button className="btn primary" disabled={!fundAmt} onClick={() => run('Pool funded', (c) => fundPool(c, address, token.address, toBaseUnits(fundAmt, token.decimals), activeColl))}>Fund Pool</button>
      </div>

      <div className="form card wide">
        <h3>Settings</h3>
        <label>Stake fee (LUNC) <input inputMode="decimal" value={feeLunc} onChange={(e) => setFeeLunc(e.target.value)} placeholder="0" /></label>
        <button className="btn" disabled={feeLunc === ''} onClick={() => run('Stake fee set', (c) => adminSetStakeFee(c, address, toBaseUnits(feeLunc, 6)))}>Set Stake Fee</button>
        <label>Lock period (days) <input inputMode="numeric" value={lockDays} onChange={(e) => setLockDays(e.target.value)} placeholder="0 = unstake anytime" /></label>
        <button className="btn" disabled={lockDays === ''} onClick={() => run('Lock period set', (c) => adminSetLockPeriod(c, address, Number(lockDays) * 86400))}>Set Lock Period</button>
      </div>

      <div className="form card wide">
        <h3>Transfer Admin</h3>
        <p>Current admin: <strong>{adminAddr}</strong></p>
        <p>Hand the app over to a different wallet, any time. This moves <strong>both</strong> the app admin (collections, rewards, rates, fees — everything in this panel) <strong>and</strong> the contract's on-chain upgrade admin, in two signed steps. The new wallet becomes admin immediately and this wallet loses admin — it can't be undone by this wallet afterwards, so double-check the address.</p>
        <label>New admin wallet <input value={newAdmin} onChange={(e) => { setNewAdmin(e.target.value); setConfirmArm(false); }} placeholder="terra1…" /></label>
        {transferMsg && <p className="notice">{transferMsg}</p>}
        {chainPending && <button className="btn primary" disabled={transferBusy} onClick={retryChainSync}>{transferBusy ? 'Working…' : `Retry upgrade-admin transfer to ${chainPending.slice(0, 12)}…`}</button>}
        <button className="btn" disabled={!isValidTerraAddress(newAdmin.trim()) || newAdmin.trim() === adminAddr || transferBusy}
          onClick={runTransfer}>
          {transferBusy ? 'Working…' : confirmArm ? `⚠️ Click again to confirm — transfer admin to ${newAdmin.trim().slice(0, 12)}…` : 'Transfer Admin'}
        </button>
      </div>
    </section>
  );
}
