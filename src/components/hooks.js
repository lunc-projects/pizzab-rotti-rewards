import { useEffect, useState, createContext, useContext } from 'react';
import { COLLECTIONS, isContractDeployed } from '../config.js';
import { queryCollections, queryRewards } from '../lib/stakingClient.js';
import { cw721ContractInfo, cw721NumTokens, cw721TokensOf, cw721NftInfo, nftImage } from '../lib/lcd.js';

// Effective collection list = config fallback merged with on-chain registry (when live).
export function useCollections() {
  const [collections, setCollections] = useState(COLLECTIONS);
  useEffect(() => {
    let live = true;
    (async () => {
      if (!isContractDeployed()) return;
      try {
        const onchain = await queryCollections();
        if (live && onchain?.length) {
          const byAddr = new Map([...COLLECTIONS, ...onchain].map((c) => [c.cw721, c]));
          setCollections([...byAddr.values()]);
        }
      } catch { /* keep config fallback */ }
    })();
    return () => { live = false; };
  }, []);
  return collections;
}

// Enrich a collection with its CW721 info + sample image via LCD.
export function useCollectionMeta(cw721) {
  const [meta, setMeta] = useState(null);
  useEffect(() => {
    let live = true;
    (async () => {
      if (!cw721) return;
      const [ci, count] = await Promise.all([cw721ContractInfo(cw721), cw721NumTokens(cw721)]);
      let image = null;
      // Sample the first known token image if the owner-less enumeration is unavailable:
      // try token "1" as a best-effort cover (many LUNC collections start at 1).
      try { const n = await cw721NftInfo(cw721, '1'); image = nftImage(n); } catch { /* no cover */ }
      if (live) setMeta({ name: ci?.name, symbol: ci?.symbol, count, image });
    })();
    return () => { live = false; };
  }, [cw721]);
  return meta;
}

export function useRewards(cw721) {
  const [rewards, setRewards] = useState([]);
  useEffect(() => {
    let live = true;
    (async () => {
      if (!isContractDeployed() || !cw721) return;
      try { const r = await queryRewards(cw721); if (live) setRewards(r || []); } catch { /* none */ }
    })();
    return () => { live = false; };
  }, [cw721]);
  return rewards;
}

export const WalletCtx = createContext(null);
export const useWalletCtx = () => useContext(WalletCtx);

export async function loadOwnedNfts(cw721, owner) {
  const ids = await cw721TokensOf(cw721, owner);
  const out = [];
  for (const token_id of ids) {
    const info = await cw721NftInfo(cw721, token_id);
    out.push({ token_id, image: nftImage(info), info });
  }
  return out;
}
