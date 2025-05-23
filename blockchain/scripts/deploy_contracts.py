#!/usr/bin/env python3

# kudos_project/scripts/deploy_contracts.py

import os
import subprocess
import json
from pathlib import Path
import argparse
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Directorios y configuraciones
BASE_DIR = Path(__file__).resolve().parent.parent
CONTRACTS_DIR = BASE_DIR / "contracts"
OUTPUT_DIR = BASE_DIR / "build"
SOLANA_KEYPAIR = os.getenv("SOLANA_KEYPAIR", "~/.config/solana/id.json")  # Ajusta según tu keypair
SOLANA_NETWORK = "devnet"  # Cambia a "mainnet-beta" para producción
SOLANG_PATH = "solang"  # Asegúrate de que Solang esté en tu PATH
SOLANA_CLI = "solana"

# Contratos a desplegar
CONTRACTS = [
    "CapsuleNFT.sol",
    "Transaction.sol"
]

def check_requirements():
    """Verifica que las herramientas necesarias estén instaladas."""
    for cmd in [SOLANG_PATH, SOLANA_CLI]:
        try:
            subprocess.run([cmd, "--version"], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            logger.info(f"{cmd} está instalado.")
        except subprocess.CalledProcessError:
            logger.error(f"{cmd} no está instalado o no se encuentra en PATH.")
            raise SystemExit(1)

def compile_contract(contract_file):
    """Compila un contrato Solidity a bytecode compatible con Solana usando Solang."""
    contract_path = CONTRACTS_DIR / contract_file
    output_file = OUTPUT_DIR / f"{contract_file.replace('.sol', '.so')}"

    if not contract_path.exists():
        logger.error(f"Contrato {contract_file} no encontrado en {CONTRACTS_DIR}")
        raise FileNotFoundError(f"{contract_file} no existe")

    logger.info(f"Compilando {contract_file}...")
    cmd = [
        SOLANG_PATH,
        "compile",
        str(contract_path),
        "--target",
        "solana",
        "-o",
        str(output_file)
    ]
    try:
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        logger.info(f"Compilación exitosa: {output_file}")
        return output_file
    except subprocess.CalledProcessError as e:
        logger.error(f"Error al compilar {contract_file}: {e.stderr.decode()}")
        raise

def deploy_contract(compiled_file, keypair_path):
    """Despliega un contrato compilado en Solana."""
    logger.info(f"Desplegando {compiled_file} en la red {SOLANA_NETWORK}...")
    cmd = [
        SOLANA_CLI,
        "program",
        "deploy",
        str(compiled_file),
        "--keypair",
        keypair_path,
        "--url",
        SOLANA_NETWORK
    ]
    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        program_id = extract_program_id(result.stdout)
        logger.info(f"Contrato desplegado exitosamente. Program ID: {program_id}")
        return program_id
    except subprocess.CalledProcessError as e:
        logger.error(f"Error al desplegar {compiled_file}: {e.stderr}")
        raise

def extract_program_id(output):
    """Extrae el Program ID de la salida del comando solana program deploy."""
    for line in output.splitlines():
        if "Program Id:" in line:
            return line.split("Program Id:")[1].strip()
    return "Unknown"

def save_deployment_info(deployments):
    """Guarda la información de los contratos desplegados en un archivo JSON."""
    output_file = OUTPUT_DIR / "deployments.json"
    with open(output_file, 'w') as f:
        json.dump(deployments, f, indent=4)
    logger.info(f"Información de despliegue guardada en {output_file}")

def main():
    """Función principal para compilar y desplegar contratos."""
    parser = argparse.ArgumentParser(description="Despliega smart contracts de Kudos en Solana.")
    parser.add_argument("--keypair", default=SOLANA_KEYPAIR, help="Ruta al keypair de Solana")
    parser.add_argument("--network", default=SOLANA_NETWORK, help="Red de Solana (devnet, mainnet-beta)")
    args = parser.parse_args()

    global SOLANA_NETWORK
    SOLANA_NETWORK = args.network
    keypair_path = os.path.expanduser(args.keypair)

    # Verificar requisitos
    check_requirements()

    # Crear directorio de salida si no existe
    OUTPUT_DIR.mkdir(exist_ok=True)

    # Desplegar contratos
    deployments = {}
    for contract in CONTRACTS:
        try:
            compiled_file = compile_contract(contract)
            program_id = deploy_contract(compiled_file, keypair_path)
            deployments[contract] = {
                "compiled_file": str(compiled_file),
                "program_id": program_id,
                "network": SOLANA_NETWORK,
                "timestamp": timezone.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Fallo al procesar {contract}: {str(e)}")
            continue

    # Guardar información de despliegue
    if deployments:
        save_deployment_info(deployments)

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        logger.error(f"Error en el despliegue: {str(e)}")
        exit(1)