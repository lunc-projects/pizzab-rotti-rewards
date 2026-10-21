import { useEffect, useState } from 'react';
import { PIZZAB, ROTTI, isContractDeployed } from '../config.js';
import { useWalletCtx } from './hooks.js';
import { queryStakes, queryPendingRewards, claim, claimAll, unstake } from '../lib/stakingClient.js';
import { formatAmount } from '../lib/format.js';

// PendingRewards responses can vary in shape across contract versions;
// normalise to { PIZZAB: raw, ROTTI: raw } using the two token addresses.
function pendingFor(pending) {
  if (!pending) return { PIZZAB: null, ROTTI: null };
  if (Array.isArray(pending.rewards)) {
    const by = Object.fromEntries(pending.rewards.map((r) => [r.token || r.reward_token, r.amount]));
    return { PIZZAB: by[PIZZAB.address] ?? null, ROTTI: by[ROTTI.address] ?? null };
  }
  return {
    PIZZAB: pending.pizzab ?? pending.pizzab_amount ?? null,
    ROTTI: pending.rotti ?? pending.rotti_amount ?? null,
  };
}

export default function StakedSection() {
  const { address, getSigningClient } = useWalletCtx();
  const [stakes, setStakes] = useState([]);
  const [pending, setPending] = useState({});
  const [msg, setMsg] = useState(null);

  async function refresh() {
    if (!address || !isContractDeployed()) { setStakes([]); return; }
    const s = await queryStakes(address);
    setStakes(s || []);
    const p = {};
    for (const st of s || []) {
      try { p[`${st.collection}-${st.token_id}`] = pendingFor(await queryPendingRewards(address, st.collection, st.token_id)); } catch { /* skip */ }
    }
    setPending(p);
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [address]);

  async function act(fn, label) {
    setMsg(null);
    try { const client = await getSigningClient(); const res = await fn(client); setMsg(`${label} — tx ${res.transactionHash}`); refresh(); }
    catch (e) { setMsg(e.message); }
  }

  if (!isContractDeployed()) {
    return (<section><h2>Staked / Rewards</h2><div className="empty">
      <p className="big">Rewards open when the contract goes live 🍕</p>
      <p>Once deployed, NFTs you stake will earn <strong>PIZZAB</strong> and <strong>ROTTI</strong> here — pending amounts for each token, Claim All, and Unstake.</p>
    </div></section>);
  }
  if (!address) return (<section><h2>Staked / Rewards</h2><div className="empty"><p>Connect your wallet to see your staked NFTs and pending rewards.</p></div></section>);

  const totals = stakes.reduce((acc, st) => {
    const p = pending[`${st.collection}-${st.token_id}`] || {};
    if (p.PIZZAB != null) acc.PIZZAB = (BigInt(acc.PIZZAB || 0) + BigInt(p.PIZZAB)).toString();
    if (p.ROTTI != null) acc.ROTTI = (BigInt(acc.ROTTI || 0) + BigInt(p.ROTTI)).toString();
    return acc;
  }, {});

  return (
    <section>
      <h2>Staked / Rewards</h2>
      {msg && <p className="notice">{msg}</p>}
      <div className="totals">
        <div className="totalbox"><span>Pending PIZZAB</span><strong>{formatAmount(totals.PIZZAB, 6)} 🍕</strong></div>
        <div className="totalbox"><span>Pending ROTTI</span><strong>{formatAmount(totals.ROTTI, 6)} 🐾</strong></div>
        <button className="btn primary" disabled={!stakes.length} onClick={() => act((c) => claimAll(c, address), 'Claimed all')}>Claim All</button>
      </div>
      {!stakes.length && <div className="empty"><p>Nothing staked yet — stake an NFT from the My NFTs tab.</p></div>}
      <div className="grid">
        {stakes.map((st) => {
          const p = pending[`${st.collection}-${st.token_id}`] || {};
          return (
            <article className="card" key={`${st.collection}-${st.token_id}`}>
              <h3>#{st.token_id}</h3>
              <p>🍕 {formatAmount(p.PIZZAB, 6)} PIZZAB pending</p>
              <p>🐾 {formatAmount(p.ROTTI, 6)} ROTTI pending</p>
              <div className="row">
                <button className="btn" onClick={() => act((c) => claim(c, address, st.collection, st.token_id), 'Claimed')}>Claim</button>
                <button className="btn ghost" onClick={() => act((c) => unstake(c, address, st.collection, st.token_id), 'Unstaked')}>Unstake</button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
