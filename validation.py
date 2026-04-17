import pandas as pd
import re

def validate_data(df):
    """
    Executes a detailed inventory population and risk audit.
    Supports both Tabular and Pivoted formats.
    """
    if df.empty:
        return ["Data source is empty - no validation performed."]
        
    available_cols = df.columns.tolist()
    
    def find_col(possible_names):
        for col in available_cols:
            if str(col).strip().lower() in [n.lower() for n in possible_names]:
                return col
        return None

    # ≡ƒƒó Smart Mapping
    sku_col = find_col(['SKU', 'Material / SKU ID', 'Material'])
    site_col = find_col(['Site', 'Site ID', 'Location'])
    week_col = find_col(['Week_Index', 'Week', 'Week Index', 'Week Number'])
    figure_col = find_col(['Figure Name', 'Metric', 'Indicator'])
    
    forecast_col = find_col(['Forecast quantity', 'Total Forecast/Order', 'Forecast', 'Total Demand'])
    ss_col = find_col(['Safety Stock (SS)', 'Target Safety Stock (in Days)', 'Target Safety Stock (in Units)', 'Safety Stock'])
    lt_col = find_col(['Lead_Time', 'Lead Time', 'LT', 'LeadTime'])
    
    # ≡ƒƒó Format Detection
    date_headers = [c for c in available_cols if re.match(r'\d{4}-\d{2}-\d{2}', str(c))]
    is_pivoted = len(date_headers) > 1
    
    results = []
    
    # 1. 12-Week Time Horizon Check (REMOVED per user request)

    # 2. Duplicate Records Check (REMOVED per user request - now in KPI card)

    # 3. Forecast Validation (Smart: Supports Tabular and Pivoted)
    forecast_found = False
    if is_pivoted and figure_col:
        # Check by row value in figure_col
        f_rows = df[df[figure_col].astype(str).str.strip().lower().isin(['forecast quantity', 'forecast', 'total forecast/order'])]
        if not f_rows.empty:
            forecast_found = True
            # Sum all date columns
            total_forecast = f_rows[date_headers].sum().sum()
            if total_forecast == 0:
                results.append("Forecast alert: Total forecast volume across the horizon is zero.")
            else:
                results.append("All SKUs have non-zero forecast across the horizon.")
    else:
        # Tabular check by column
        if forecast_col and sku_col:
            forecast_found = True
            sku_f_sum = df.groupby(sku_col)[forecast_col].sum()
            if (sku_f_sum == 0).any():
                results.append("Zero forecast detected for some active SKUs. Check demand loading.")
            else:
                results.append("All SKUs have non-zero forecast across the horizon.")
    
    if not forecast_found:
        results.append("Forecast check skipped: Could not identify Forecast column/metric.")

    # 4. Safety Stock Validation (Smart: Supports Tabular and Pivoted)
    ss_found = False
    if is_pivoted and figure_col:
        # Check by row value in figure_col
        ss_rows = df[df[figure_col].astype(str).str.strip().lower().isin(['safety stock (ss)', 'safety stock', 'target safety stock (in days)', 'target safety stock (in units)'])]
        if not ss_rows.empty:
            ss_found = True
            # Check if all values in date columns are 0
            if (ss_rows[date_headers] == 0).all().all():
                results.append("Safety Stock = 0 alert: The whole horizon has no buffer stock.")
            else:
                results.append("No zero safety stock values found.")
    else:
        # Tabular check by column
        if ss_col:
            ss_found = True
            if (df[ss_col] == 0).any():
                results.append("Safety Stock = 0 alert: Some SKUs have no buffer stock.")
            else:
                results.append("No zero safety stock values found.")
    
    if not ss_found:
        results.append("Safety Stock check skipped: Could not identify Safety Stock column/metric.")

    # 5. Lead Time Validation (Smart: Supports Tabular and Pivoted)
    lt_found = False
    if is_pivoted and figure_col:
        lt_rows = df[df[figure_col].astype(str).str.strip().lower().isin(['lead_time', 'lead time', 'lt', 'leadtime'])]
        if not lt_rows.empty:
            lt_found = True
            if (lt_rows[date_headers] == 0).all().all():
                results.append("Zero lead time found: All SKUs have 0 lead time across the horizon.")
            else:
                results.append("No zero lead time values found.")
    else:
        if lt_col:
            lt_found = True
            if (df[lt_col] == 0).any():
                results.append("Zero lead time detected for some SKUs. Please verify LT data.")
            else:
                results.append("No zero lead time values found.")
    
    if not lt_found:
        results.append("Lead Time check skipped: Could not identify Lead Time column/metric.")

    return results
