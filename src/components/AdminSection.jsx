import { useEffect, useState } from 'react';
import { PIZZAB, ROTTI, isContractDeployed } from '../config.js';
import { useWalletCtx } from './hooks.js';
import { queryConfig, adminRegisterCollection, adminAddReward, adminSetRewardRate, adminSetStakeFee, adminSetLockPeriod, adminPauseReward, adminUnpauseReward, fundPool } from '../lib/stakingClient.js';
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
  if (adminAddr && !isAdmin) return (<section><h2>Admin</h2><div className="empty"><p>🔒 This wallet is not the admin for this app. Admin: {adminAddr}</p></div></section>);

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
    </section>
  );
}
