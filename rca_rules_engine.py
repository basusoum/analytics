"""
RCA Rules Engine — Opening + Supply vs Demand format.
"""


def compute_rca(
    alert,
    opening, supply, demand, closing,
    ss, ms, lt, week_idx,
    mstn_pct=None, estn_pct=None,
    avg_demand=None,
):
    is_shortage = "Stockout" in str(alert) or "Shortage" in str(alert)
    is_excess   = "Excess"   in str(alert)

    if is_shortage:
        return _shortage_rca(opening, supply, demand, ss, lt, week_idx, avg_demand)
    elif is_excess:
        return _excess_rca(opening, supply, demand, ms, avg_demand)
    return ""


def _shortage_rca(opening, supply, demand, ss, lt, week_idx, avg_demand):
    avg = int(avg_demand) if avg_demand else 0

    if opening <= 0 and supply == 0:
        rca = f"Zero Opening Stock + Zero Inbound Supply vs Demand of {demand:,}."

    elif supply == 0:
        rca = f"Opening Stock ({opening:,}) + Zero Inbound Supply cannot meet Demand ({demand:,})."

    elif avg > 0 and demand > avg * 1.25:
        rca = f"Opening Stock ({opening:,}) + Supply ({supply:,}) overwhelmed by Demand Surge ({demand:,} vs avg {avg:,})."

    elif opening < ss:
        rca = f"Low Opening Stock ({opening:,} vs SS {ss:,}) + Supply ({supply:,}) cannot meet Demand ({demand:,})."

    else:
        rca = f"Opening Stock ({opening:,}) + Insufficient Supply ({supply:,}) cannot meet Demand ({demand:,})."

    if week_idx <= lt:
        rca += f" Week {week_idx} within {lt}-week lead time."

    return rca


def _excess_rca(opening, supply, demand, ms, avg_demand):
    avg = int(avg_demand) if avg_demand else 0

    if demand == 0 and supply == 0:
        return f"High Opening Stock ({opening:,}) + Supply (0) vs Zero Demand."

    if demand == 0 and supply > 0:
        return f"Opening Stock ({opening:,}) + Inbound Supply ({supply:,}) vs Zero Demand, exceeds Max Stock ({ms:,})."

    if opening > ms:
        return f"High Opening Stock ({opening:,}) + Supply ({supply:,}) exceeds Max Stock ({ms:,}) vs Demand ({demand:,})."

    if supply > demand * 1.5:
        return f"Opening Stock ({opening:,}) + Aggressive Supply ({supply:,}) exceeds Forecast ({demand:,})."

    if avg > 0 and demand < avg * 0.75:
        return f"Opening Stock ({opening:,}) + Supply ({supply:,}) vs Low Demand ({demand:,}, avg {avg:,})."

    if supply > 0:
        return f"Opening Stock ({opening:,}) + Supply ({supply:,}) vs Demand ({demand:,}), exceeds Max Stock ({ms:,})."

    return f"Opening Stock ({opening:,}) vs Low Demand ({demand:,})."
