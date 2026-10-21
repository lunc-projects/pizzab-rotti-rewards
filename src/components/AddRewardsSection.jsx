import { useEffect, useState } from 'react';
import { REWARD_TOKENS, isContractDeployed } from '../config.js';
import { useRewards } from './hooks.js';
import { queryPoolBalances, queryStakes } from '../lib/stakingClient.js';
import { formatAmount, runwayDays } from '../lib/format.js';
import { useWalletCtx } from './hooks.js';

function RewardRow({ collection, token, pools, stakedCount }) {
  const rewards = useRewards(collection);
  const r = rewards.find((x) => (x.reward_token || x.token) === token.address);
  const pool = (pools || []).find((p) => (p.reward_token || p.token) === token.address && (!p.collection || p.collection === collection));
  const rate = r?.rate_per_nft_per_day ?? r?.rate ?? null;
  const balance = pool?.balance ?? pool?.amount ?? r?.pool_balance ?? null;
  const runway = runwayDays(balance, stakedCount, rate);
  return (
    <div className="rewardrow">
      <strong>{token.symbol === 'PIZZAB' ? '🍕' : '🐾'} {token.symbol}</strong>
      <span>Rate: {rate != null ? `${formatAmount(rate, token.decimals)} / NFT / day` : '—'}</span>
      <span>Pool: {balance != null ? `${formatAmount(balance, token.decimals)} ${token.symbol}` : '—'}</span>
      <span>Runway: {runway != null ? `~${runway.toFixed(1)} days` : '—'}</span>
      <span className="muted">{r?.paused ? 'Paused' : r ? 'Active' : 'Not added yet'}</span>
    </div>
  );
}

export default function AddRewardsSection({ collections }) {
  const { address } = useWalletCtx();
  const [pools, setPools] = useState([]);
  const [stakedCount, setStakedCount] = useState(0);

  useEffect(() => {
    (async () => {
      if (!isContractDeployed()) return;
      try { setPools(await queryPoolBalances()); } catch { /* none */ }
      if (address) { try { const s = await queryStakes(address); setStakedCount((s || []).length); } catch { /* none */ } }
    })();
  }, [address]);

  if (!collections.length) {
    return (
      <section>
        <h2>Add Rewards</h2>
        <div className="empty">
          <p className="big">Two rewards, per collection 🍕🐾</p>
          <p>Every collection in this app can carry <strong>a PIZZAB reward and a ROTTI reward</strong> — each with its own rate per NFT per day, its own funded pool, and its own runway. When the first collection is registered, its two reward rows will appear here.</p>
          <div className="rewardrow preview"><strong>🍕 PIZZAB</strong><span>Rate: — / NFT / day</span><span>Pool: —</span><span>Runway: —</span></div>
          <div className="rewardrow preview"><strong>🐾 ROTTI</strong><span>Rate: — / NFT / day</span><span>Pool: —</span><span>Runway: —</span></div>
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2>Add Rewards</h2>
      <p className="muted">Multiple rewards, two tokens only: each collection can earn PIZZAB, ROTTI, or both. Rates are adjustable by the admin at any time — see the Admin tab.</p>
      {collections.map((c) => (
        <div className="card wide" key={c.cw721}>
          <h3>{c.name || c.cw721}</h3>
          {REWARD_TOKENS.map((t) => <RewardRow key={t.symbol} collection={c.cw721} token={t} pools={pools} stakedCount={stakedCount} />)}
        </div>
      ))}
    </section>
  );
}
