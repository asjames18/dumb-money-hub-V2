#!/usr/bin/env python3
"""DUMB/DAMP top-50 holder contract audit on PulseChain (read-only)."""
import json, time, urllib.request

RPC = "https://rpc.pulsechain.com"
SCAN = "https://api.scan.pulsechain.com/api/v2"
DUMB = "0xe65112d2f120c8cb23ADC80D8E8122c0c8b7fF8D"
DAMP = "0x8357aA9070dc7d8d154Da74561CEc58cA30c41C3"
DEAD = "0x000000000000000000000000000000000000dEaD"
PULSEX_FACTORY = "0x1715a3d97ee4d560cf2b939640e2c19c48932171b"

SEL_TOKEN0 = "0x0dfe1681"
SEL_TOKEN1 = "0xd21220a7"
SEL_GETPAIR = "0xe6a43905"  # getPair(address,address)

def rpc_batch(calls):
    payload = [{"jsonrpc": "2.0", "id": i, "method": m, "params": p}
               for i, (m, p) in enumerate(calls)]
    req = urllib.request.Request(RPC, data=json.dumps(payload).encode(),
                                 headers={"Content-Type": "application/json",
                                          "User-Agent": "Mozilla/5.0 (research; holder-scan)"})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                resp = json.loads(r.read())
            if isinstance(resp, dict):
                return [None] * len(calls)
            out = [None] * len(calls)
            for item in resp:
                out[item["id"]] = item.get("result")
            return out
        except Exception as e:
            print(f"rpc_batch attempt {attempt} failed: {e}", flush=True)
            time.sleep(3)
    return [None] * len(calls)

def http_get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (research; holder-scan)"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.loads(r.read())
        except Exception as e:
            print(f"GET attempt {attempt} failed for {url[:80]}: {e}", flush=True)
            time.sleep(3)
    return None

def get_holders(token, limit=50):
    holders = []
    params = None
    while len(holders) < limit:
        url = f"{SCAN}/tokens/{token}/holders"
        if params:
            url += f"?{params}"
        data = http_get(url)
        if not data or not data.get("items"):
            break
        for it in data["items"]:
            holders.append({
                "address": it["address"]["hash"],
                "value_wei": it["value"],
            })
        np = data.get("next_page_params")
        if not np or len(holders) >= limit:
            break
        params = "&".join(f"{k}={v}" for k, v in np.items())
        time.sleep(0.5)
    return holders[:limit]

def decode_addr(result):
    if not result or len(result) < 42:
        return None
    h = result[2:].rjust(64, "0")
    return "0x" + h[-40:]

def main():
    report = {"generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
              "chain": "PulseChain (369)", "tokens": {}}
    for sym, token in (("DUMB", DUMB), ("DAMP", DAMP)):
        print(f"=== {sym} holders ===", flush=True)
        holders = get_holders(token, 50)
        print(f"got {len(holders)} holders", flush=True)
        addrs = list({h["address"] for h in holders})
        codes = rpc_batch([("eth_getCode", [a, "latest"]) for a in addrs])
        is_contract = {a: (c not in (None, "0x", "0x0")) for a, c in zip(addrs, codes)}
        caddrs = [a for a in addrs if is_contract[a]]
        t0 = rpc_batch([("eth_call", [{"to": a, "data": SEL_TOKEN0}, "latest"]) for a in caddrs])
        t1 = rpc_batch([("eth_call", [{"to": a, "data": SEL_TOKEN1}, "latest"]) for a in caddrs])
        pair_info = {}
        for a, r0, r1 in zip(caddrs, t0, t1):
            pair_info[a] = {"token0": decode_addr(r0), "token1": decode_addr(r1)}
        to_confirm = [(a, i["token0"], i["token1"]) for a, i in pair_info.items()
                      if i["token0"] and i["token1"]]
        if to_confirm:
            gp_calls = [("eth_call", [{"to": PULSEX_FACTORY,
                                      "data": SEL_GETPAIR + x[2:].rjust(64, "0") + y[2:].rjust(64, "0")}, "latest"])
                        for _, x, y in to_confirm]
            gp = rpc_batch(gp_calls)
            for (a, x, y), r in zip(to_confirm, gp):
                gp_addr = decode_addr(r)
                pair_info[a]["pulsex_factory_getPair"] = gp_addr
                pair_info[a]["is_pulsex_pair"] = (gp_addr or "").lower() == a.lower()
        for a in caddrs:
            d = http_get(f"{SCAN}/addresses/{a}")
            time.sleep(0.3)
            if d:
                pair_info[a]["scan_name"] = d.get("name")
                pair_info[a]["is_verified"] = d.get("is_verified")
            else:
                pair_info[a]["scan_name"] = None
                pair_info[a]["is_verified"] = None
        ts = rpc_batch([("eth_call", [{"to": token, "data": "0x18160ddd"}, "latest"])])[0]
        total = int(ts, 16) if ts else None
        token_hex = token.lower()
        entries = []
        for h in holders:
            a = h["address"]
            al = a.lower()
            cls = {"address": a, "balance_wei": h["value_wei"],
                   "is_contract": is_contract[a]}
            if al == DEAD.lower():
                cls["category"] = "dead_address"
                cls["note"] = "Burn address (user-known)"
            elif al == token_hex:
                cls["category"] = "token_contract_self"
                cls["note"] = "Token contract itself: holds tax buckets + reflection accounting"
            elif not is_contract[a]:
                cls["category"] = "eoa"
            else:
                pi = pair_info.get(a, {})
                t0a, t1a = pi.get("token0"), pi.get("token1")
                involves = (t0a and t0a.lower() == token_hex) or (t1a and t1a.lower() == token_hex)
                if involves and pi.get("is_pulsex_pair"):
                    cls["category"] = "dex_pair_pulsex"
                    cls["token0"] = t0a; cls["token1"] = t1a
                    cls["note"] = "PulseX V2 pair (confirmed via factory getPair)"
                elif involves:
                    cls["category"] = "dex_pair_unconfirmed"
                    cls["token0"] = t0a; cls["token1"] = t1a
                    cls["note"] = "Has token0/token1 of the token but NOT confirmed on PulseX factory"
                else:
                    cls["category"] = "unknown_contract"
                    cls["scan_name"] = pi.get("scan_name")
                    cls["is_verified"] = pi.get("is_verified")
                    nm = pi.get("scan_name")
                    cls["note"] = (f"Contract, blockscout name: {nm}" if nm
                                   else "Contract, no verified name on blockscout")
            if total:
                cls["pct_of_supply"] = int(h["value_wei"]) / total * 100
            entries.append(cls)
        report["tokens"][sym] = {"token": token, "total_supply_wei": str(total),
                                 "top50": entries}
    return report

if __name__ == "__main__":
    rep = main()
    with open("/tmp/holder_scan_raw.json", "w") as f:
        json.dump(rep, f, indent=2)
    print("saved /tmp/holder_scan_raw.json")
