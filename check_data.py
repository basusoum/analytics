import pandas as pd
df = pd.read_csv("backend/generated_data/final_projection_results__aligned.csv")
sku3_dc5 = df[(df["SKU"] == "SKU_0003") & (df["Site"] == "DC_05")].sort_values("Week_Index").head(5)
with open("debug_output_utf8.txt", "w", encoding="utf-8") as f:
    for _, r in sku3_dc5.iterrows():
        f.write(f"W{r['Week_Index']}: OP={r['Start Inventory']} + SUP={r['Total Supply']} - DEM={r['Total Demand']} => CLS={r['End. Inventory']}, BO={r['End. Backorder']}\n")
