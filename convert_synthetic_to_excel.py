import pandas as pd
import os

csv_path = os.path.join('generated_data', 'synthetic_data.csv')
xlsx_path = os.path.join('generated_data', 'synthetic_data.xlsx')

df = pd.read_csv(csv_path)
df.to_excel(xlsx_path, index=False)
print('Excel file saved to:', os.path.abspath(xlsx_path))
