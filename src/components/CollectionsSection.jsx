import { REWARD_TOKENS, isContractDeployed } from '../config.js';
import { useCollectionMeta, useRewards } from './hooks.js';
import { formatAmount } from '../lib/format.js';

function CollectionCard({ c }) {
  const meta = useCollectionMeta(c.cw721);
  const rewards = useRewards(c.cw721);
  const rateFor = (addr) => {
    const r = rewards.find((x) => (x.reward_token || x.token) === addr);
    return r ? r.rate_per_nft_per_day ?? r.rate : null;
  };
  return (
    <article className="card">
      {meta?.image ? <img className="cardimg" src={meta.image} alt="" /> : <div className="cardimg placeholder">🍕🐾</div>}
      <h3>{c.name || meta?.name || 'Collection'}</h3>
      <p className="muted">{meta?.symbol ? `$${meta.symbol} · ` : ''}{meta?.count != null ? `${meta.count} NFTs` : 'On Terra Classic'}</p>
      <div className="badges">
        {REWARD_TOKENS.map((t) => {
          const rate = rateFor(t.address);
          return <span className="badge" key={t.symbol}>{rate != null ? `${formatAmount(rate, t.decimals)} ${t.symbol}/day` : `${t.symbol} rewards`}</span>;
        })}
      </div>
      <p className="addr-sm">{c.cw721}</p>
    </article>
  );
}

export default function CollectionsSection({ collections }) {
  if (!collections.length) {
    return (
      <section>
        <h2>Collections</h2>
        <div className="empty">
          <p className="big">No collections yet — the first PIZZAB × ROTTI collection is coming 🍕</p>
          <p>Collections created on <strong>Miata</strong> or <strong>Garuda</strong> will appear here once they're registered. Connect a collection, stake its NFTs, and earn PIZZAB and ROTTI every day.</p>
          {!isContractDeployed() && <p className="muted">The rewards contract is being deployed now — this gallery goes live with it.</p>}
        </div>
      </section>
    );
  }
  return (
    <section>
      <h2>Collections</h2>
      <div className="grid">{collections.map((c) => <CollectionCard key={c.cw721} c={c} />)}</div>
    </section>
  );
}
