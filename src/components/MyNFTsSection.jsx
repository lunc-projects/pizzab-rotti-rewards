import { useEffect, useState } from 'react';
import { isContractDeployed } from '../config.js';
import { loadOwnedNfts, useWalletCtx } from './hooks.js';
import { stakeNft } from '../lib/stakingClient.js';

export default function MyNFTsSection({ collections }) {
  const { address, getSigningClient } = useWalletCtx();
  const [owned, setOwned] = useState([]);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    let live = true;
    (async () => {
      if (!address || !collections.length) { setOwned([]); return; }
      const all = [];
      for (const c of collections) {
        const nfts = await loadOwnedNfts(c.cw721, address);
        nfts.forEach((n) => all.push({ ...n, collection: c.cw721 }));
      }
      if (live) setOwned(all);
    })();
    return () => { live = false; };
  }, [address, collections]);

  async function onStake(n) {
    setBusy(n.token_id); setMsg(null);
    try {
      const client = await getSigningClient();
      const res = await stakeNft(client, address, n.collection, n.token_id);
      setMsg(`Staked NFT #${n.token_id} — tx ${res.transactionHash}`);
    } catch (e) { setMsg(e.message); }
    setBusy('');
  }

  if (!address) return (<section><h2>My NFTs</h2><div className="empty"><p>Connect your wallet to see your NFTs from the registered collections.</p></div></section>);
  if (!collections.length) return (<section><h2>My NFTs</h2><div className="empty"><p>No collections are registered yet — your NFTs will show here once the first PIZZAB × ROTTI collection launches.</p></div></section>);

  return (
    <section>
      <h2>My NFTs</h2>
      {msg && <p className="notice">{msg}</p>}
      {!owned.length && <div className="empty"><p>No NFTs from the registered collections in this wallet yet.</p></div>}
      <div className="grid">
        {owned.map((n) => (
          <article className="card" key={`${n.collection}-${n.token_id}`}>
            {n.image ? <img className="cardimg" src={n.image} alt="" /> : <div className="cardimg placeholder">🍕🐾</div>}
            <h3>#{n.token_id}</h3>
            <button className="btn primary" disabled={!isContractDeployed() || busy === n.token_id} onClick={() => onStake(n)}>
              {isContractDeployed() ? (busy === n.token_id ? 'Staking…' : 'Stake') : 'Stake — contract coming soon'}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
