import pandas as pd
import numpy as np
import os
import random

# ══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ══════════════════════════════════════════════════════════════════════════════
NUM_SKUS      = 5
NUM_DCS       = 5
HORIZON_WEEKS = 12

_BASE      = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(_BASE, "generated_data")

FACTORY_ID = "F1"
DC_IDS     = [f"DC{i}" for i in range(1, NUM_DCS + 1)]

SITE_DESC = {
    "F1":  "Midwest Manufacturing Hub - Detroit",
    "DC1": "Northeast Regional DC - New York",
    "DC2": "West Coast Distribution Center - LA",
    "DC3": "South Central Logistics Hub - Dallas",
    "DC4": "Northwest Fulfillment Center - Seattle",
    "DC5": "Southeast Distribution Center - Miami",
}

SITE_LOCATIONS = {
    "F1":  {"Location": "Detroit",     "Region": "Midwest",   "Lat": 42.3314, "Long": -83.0458},
    "DC1": {"Location": "New York",    "Region": "Northeast", "Lat": 40.7128, "Long": -74.0060},
    "DC2": {"Location": "Los Angeles", "Region": "West",      "Lat": 34.0522, "Long": -118.2437},
    "DC3": {"Location": "Dallas",      "Region": "South",     "Lat": 32.7767, "Long": -96.7970},
    "DC4": {"Location": "Seattle",     "Region": "Northwest", "Lat": 47.6062, "Long": -122.3321},
    "DC5": {"Location": "Miami",       "Region": "Southeast", "Lat": 25.7617, "Long": -80.1918},
}

BU_CATEGORY = {
    "MDS": "Medical Devices & Diagnostics",
    "SM":  "Surgical & Mechanical",
}


# ══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def _dc_params(ss, ms, lt):
    """Derive day/cycle stock fields from core DC policy params."""
    avg_wk  = ss * 0.25
    avg_day = avg_wk / 7

    rand = np.random.rand()
    if rand < 0.28:
        # Shortage scenario: starts below SS
        on_hand = int(np.random.randint(0, max(1, int(ss * 0.9))))
    elif rand < 0.55:
        # Excess scenario: starts above Max Stock
        on_hand = int(np.random.randint(int(ms * 0.9), int(ms * 1.2)))
    elif rand < 0.65:
        # Near-SS scenario: starts at 110–130% of SS
        # With avg demand (25% SS) and zero supply, closing ≈ 85–105% SS
        # → produces Low MSTN flag (90–99% SS) in early within-LT weeks
        on_hand = int(np.random.randint(int(ss * 1.10), int(ss * 1.30)))
    else:
        # Healthy scenario: comfortable inventory
        on_hand = int(np.random.randint(int(ss * 1.5), max(int(ss * 1.6), int(ms * 0.8))))

    return {
        "ss": ss, "ms": ms, "lt": lt,
        "avg_wk":   avg_wk,
        "on_hand":  on_hand,
        "ss_days":  int(round(ss / avg_day)) if avg_day > 0 else 0,
        "cs_units": int(round(lt * avg_wk)),
        "cs_days":  lt * 7,
        "ms_days":  int(round(ms / avg_day)) if avg_day > 0 else 0,
    }


def _weekly_supply(avg_wk, confirmed_low=1.5, confirmed_high=3.0,
                   bulk_low=4.0, bulk_high=8.0,
                   prob_confirmed=0.25, prob_bulk=0.10):
    """Randomly decide confirmed and planned supply for one week."""
    roll = np.random.rand()
    if roll < prob_confirmed:
        confirmed = int(avg_wk * np.random.uniform(confirmed_low, confirmed_high))
    elif roll < prob_confirmed + prob_bulk:
        confirmed = int(avg_wk * np.random.uniform(bulk_low, bulk_high))
    else:
        confirmed = 0

    planned = (
        int(avg_wk * np.random.uniform(1.0, 3.0))
        if confirmed == 0 and np.random.rand() < 0.30
        else 0
    )
    return confirmed, planned


def _base_row(sku, bu, sku_cat, site_id, site_type, p):
    """Return fixed (non-weekly) fields shared across all weeks for a site."""
    importance_map = {"A": 3, "B": 2, "C": 1}
    return {
        "Material / SKU ID":                        sku,
        "Material description":                     f"Medical Device for {sku}",
        "Business Unit":                            bu,
        "SKU Category":                             sku_cat,
        "SKU Importance":                           importance_map.get(sku_cat, 1),
        "Site ID":                                  site_id,
        "Category":                                 BU_CATEGORY.get(bu, "General"),
        "Safety Stock (SS)":                        p["ss"],
        "Maximum Stock (Max)":                      p["ms"],
        "Replenishment / transportation lead time": p["lt"],
        "Current on-hand inventory quantity":       p["on_hand"],
        "Safety Stock (Days)":                      p["ss_days"],
        "Cycle Stock (Units)":                      p["cs_units"],
        "Cycle Stock (Days)":                       p["cs_days"],
        "Maximum Stock (Days)":                     p["ms_days"],
    }


def _generate_site_metadata(sku_ids, dc_ids, factory_id):
    """
    Creates a metadata table with location and unit price per SKU-Site.
    This fulfills the requirement of a separate function for joining.
    """
    meta_rows = []
    all_sites = dc_ids + [factory_id]
    
    for sku in sku_ids:
        for site in all_sites:
            loc = SITE_LOCATIONS.get(site, {"Location": "N/A", "Region": "N/A", "Lat": 0.0, "Long": 0.0})
            price = round(float(np.random.uniform(10.0, 40.0)), 2)
            
            meta_rows.append({
                "Material / SKU ID": sku,
                "Site ID":           site,
                "Site":              "Factory" if site == factory_id else "DC",
                "Factory ID":        factory_id,
                "Site Description":  SITE_DESC.get(site, "N/A"),
                "Location":          loc["Location"],
                "Region":            loc["Region"],
                "Lat":               loc["Lat"],
                "Long":              loc["Long"],
                "Latitude":          loc["Lat"],
                "Longitude":         loc["Long"],
                "Unit Price":        price,
            })
    return pd.DataFrame(meta_rows)


# ══════════════════════════════════════════════════════════════════════════════
# MAIN GENERATOR
# ══════════════════════════════════════════════════════════════════════════════

def generate_mass_data():
    """
    Generates synthetic data for 5 SKUs × (1 Factory + 5 DCs) = 30 SKU-Site
    combos × 12 weeks = 360 rows.

    Factory structure:
      - Forecast  = sum of all DC forecasts per week (pull demand)
      - SS / MS   = sum of DC SS / MS (network-level thresholds)
      - Lead time = production lead time (4–7 weeks, longer than DC transport)
      - Location type = "Factory"

    DC structure:
      - Each DC has its own SS, MS, LT, demand, supply
      - Location type = "DC"

    Output: generated_data/synthetic_data.csv
    """
    total_combos = NUM_SKUS * (1 + NUM_DCS)
    total_rows   = total_combos * HORIZON_WEEKS
    print(
        f"Generating data for {NUM_SKUS} SKUs × (1 Factory + {NUM_DCS} DCs) "
        f"= {total_combos} SKU-Site combos × {HORIZON_WEEKS} weeks = {total_rows} rows..."
    )

    sku_ids = [f"SKU_{str(i).zfill(4)}" for i in range(1, NUM_SKUS + 1)]
    weeks   = [f"Week_{i + 1}" for i in range(HORIZON_WEEKS)]

    np.random.seed(42)
    random.seed(42)

    sku_bu  = {sku: random.choice(["MDS", "SM"]) for sku in sku_ids}
    sku_cat = {sku: np.random.choice(["A", "B", "C"], p=[0.2, 0.3, 0.5]) for sku in sku_ids}
    rows    = []

    for sku in sku_ids:
        bu = sku_bu[sku]

        # ── DC parameters ─────────────────────────────────────────────────────
        dc_params        = {}
        dc_weekly_demand = {dc: {} for dc in DC_IDS}

        for dc in DC_IDS:
            ss = int(np.random.randint(50, 500))
            ms = int(ss * np.random.uniform(2.0, 4.0))
            lt = int(np.random.randint(2, 5))
            dc_params[dc] = _dc_params(ss, ms, lt)

        # ── DC rows ───────────────────────────────────────────────────────────
        dc_planned_receipts = {dc: {} for dc in DC_IDS}   # track DC receipts for factory pull-demand

        for dc in DC_IDS:
            p      = dc_params[dc]
            base   = _base_row(sku, bu, sku_cat[sku], dc, "DC", p)
            avg_wk = p["avg_wk"]

            for wk_idx, week_name in enumerate(weeks):
                demand    = int(max(0, np.random.normal(avg_wk, avg_wk * 0.20)))
                confirmed, planned = _weekly_supply(avg_wk)
                dc_weekly_demand[dc][week_name]    = demand
                dc_planned_receipts[dc][week_name] = confirmed   # Dist. Receipt Planned

                rows.append({
                    **base,
                    "Week":                        week_name,
                    "Week_Index":                  wk_idx + 1,
                    "Forecast quantity":           demand,
                    "Confirmed supply quantities": confirmed,
                    "Planned supply quantities":   planned,
                    "Supply status":               "Confirmed" if confirmed > 0 else "None",
                })

        # ── Factory parameters (aggregated from DCs) ─────────────────────────
        total_ss   = sum(dc_params[dc]["ss"]     for dc in DC_IDS)
        total_ms   = sum(dc_params[dc]["ms"]     for dc in DC_IDS)
        fac_avg_wk = sum(dc_params[dc]["avg_wk"] for dc in DC_IDS)
        fac_avg_day = fac_avg_wk / 7
        fac_lt     = int(np.random.randint(4, 8))
        fac_oh     = sum(dc_params[dc]["on_hand"] for dc in DC_IDS)

        fac_p = {
            "ss":      total_ss,
            "ms":      total_ms,
            "lt":      fac_lt,
            "on_hand": fac_oh,
            "avg_wk":  fac_avg_wk,
            "ss_days":  int(round(total_ss / fac_avg_day)) if fac_avg_day > 0 else 0,
            "cs_units": int(round(fac_lt * fac_avg_wk)),
            "cs_days":  fac_lt * 7,
            "ms_days":  int(round(total_ms / fac_avg_day)) if fac_avg_day > 0 else 0,
        }
        fac_base = _base_row(sku, bu, sku_cat[sku], FACTORY_ID, "Factory", fac_p)

        # ── Factory rows ──────────────────────────────────────────────────────
        for wk_idx, week_name in enumerate(weeks):
            # Pull-demand: factory demand = sum of DC planned receipts for NEXT week
            next_week_name = weeks[wk_idx + 1] if wk_idx + 1 < len(weeks) else None
            fac_demand = sum(dc_planned_receipts[dc].get(next_week_name, 0) for dc in DC_IDS)
            confirmed, planned = _weekly_supply(
                fac_avg_wk,
                confirmed_low=2.0, confirmed_high=4.0,
                bulk_low=6.0,      bulk_high=10.0,
                prob_confirmed=0.40, prob_bulk=0.15,
            )

            rows.append({
                **fac_base,
                "Week":                        week_name,
                "Week_Index":                  wk_idx + 1,
                "Forecast quantity":           fac_demand,
                "Confirmed supply quantities": confirmed,
                "Planned supply quantities":   planned,
                "Supply status":               "Confirmed" if confirmed > 0 else "None",
            })

    # ── Guarantee edge-case coverage: Low MSTN flag + Within Lead Time ────────
    # Patch SKU_0001 / DC_01:
    #   on_hand = 120% of SS  →  after avg demand (25% SS) with zero supply,
    #   closing ≈ 95% SS  →  Low MSTN flag in Week_1 (always within any LT ≥ 1)
    df_proj = pd.DataFrame(rows)

    # ── Relational Join: Combine Projection rows with Site Metadata ──────────
    print(f"Applying relational join for Location and Unit Price...")
    df_meta = _generate_site_metadata(sku_ids, DC_IDS, FACTORY_ID)
    df = pd.merge(df_proj, df_meta, on=["Material / SKU ID", "Site ID"], how="left")

    # ── Guarantee edge-case coverage: Low MSTN flag + Within Lead Time ────────
    # Patch SKU_0001 / DC_01
    g_sku = sorted(df['Material / SKU ID'].unique())[0]
    g_dc  = sorted(df[(df['Material / SKU ID'] == g_sku) & 
                      (df['Site'] == 'DC')]['Site ID'].unique())[0]
    g_ss  = df[(df['Material / SKU ID'] == g_sku) & 
               (df['Site ID'] == g_dc)]['Safety Stock (SS)'].iloc[0]
    mask_combo = (df['Material / SKU ID'] == g_sku) & (df['Site ID'] == g_dc)
    mask_wk1   = mask_combo & (df['Week'] == 'Week_1')
    df.loc[mask_combo, 'Current on-hand inventory quantity'] = int(g_ss * 1.20)
    df.loc[mask_wk1,   'Confirmed supply quantities']        = 0   # ensure Low (not High) flag

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    out_path = os.path.join(OUTPUT_DIR, "synthetic_data.csv")
    df.to_csv(out_path, index=False, encoding="utf-8-sig")

    print(f"\nSUCCESS: {len(df):,} rows saved to: {out_path}")
    print(
        f"SKUs: {df['Material / SKU ID'].nunique()} | "
        f"Sites: {df['Site ID'].nunique()} | "
        f"Weeks: {df['Week'].nunique()}"
    )
    print(f"\nSite breakdown:")
    print(df.groupby("Site")["Site ID"].nunique().to_string())
    print(
        f"\nSample (Factory rows):\n"
        f"{df[df['Site'] == 'Factory'][['Material / SKU ID', 'Site ID', 'Week', 'Forecast quantity', 'Confirmed supply quantities']].head(3).to_string(index=False)}"
    )


if __name__ == "__main__":
    generate_mass_data()