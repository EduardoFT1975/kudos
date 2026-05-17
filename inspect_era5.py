# inspect_era5.py
import netCDF4 as nc

file_path = "C:/Users/efert/kudos_project/data/d2793ab40c06f53eb28118920ea778b8.nc"
dataset = nc.Dataset(file_path)

print("Variables disponibles en el archivo NetCDF:")
for var in dataset.variables:
    print(f"- {var}: {dataset.variables[var].dimensions}")

dataset.close()