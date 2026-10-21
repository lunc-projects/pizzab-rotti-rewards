import { useEffect, useState, useCallback } from 'react';
import { REWARD_TOKENS } from '../config.js';
import { cw20TokenInfo } from '../lib/lcd.js';
import { formatAmount, shortAddr } from '../lib/format.js';

export default function TokenCards() {
  const [info, setInfo] = useState({});   // symbol -> token_info
  const [failed, setFailed] = useState({}); // symbol -> true

  const load = useCallback(async (t) => {
    try {
      const ti = await cw20TokenInfo(t.address);
      setInfo((p) => ({ ...p, [t.symbol]: ti }));
      setFailed((p) => ({ ...p, [t.symbol]: false }));
    } catch {
      setFailed((p) => ({ ...p, [t.symbol]: true }));
    }
  }, []);

  useEffect(() => { REWARD_TOKENS.forEach(load); }, [load]);

  return (
    <div className="tokengrid">
      {REWARD_TOKENS.map((t) => {
        const ti = info[t.symbol];
        return (
          <article className="tokencard" key={t.symbol}>
            <img src={t.art} alt={`${t.symbol} art`} />
            <div>
              <h3>{ti?.name || t.name} <span className="sym">${t.symbol}</span></h3>
              <p className="muted">Total supply</p>
              {ti ? (
                <p className="supply">{formatAmount(ti.total_supply, ti.decimals ?? t.decimals)} {t.symbol}</p>
              ) : failed[t.symbol] ? (
                <p className="supply">Couldn't load <button className="btn ghost sm" onClick={() => load(t)}>Retry</button></p>
              ) : (
                <p className="supply">Loading from chain…</p>
              )}
              <p className="addr-sm" title={t.address}>{shortAddr(t.address)}</p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
