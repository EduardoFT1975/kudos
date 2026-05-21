# kudos_app/utils/blockchain_utils.py

"""
Módulo utilitario para gestionar operaciones de blockchain en Kudos.
Proporciona funciones para preservar cápsulas, manejar transacciones y verificar datos.
"""

import json
import base64
from solana.rpc.api import Client
from solana.keypair import Keypair
from solana.transaction import Transaction
from solana.system_program import TransferParams, transfer
from django.conf import settings
from kudos_app.models import SettingsConfig
from datetime import datetime

# Cliente de Solana (configurado desde settings.py o SettingsConfig)
def get_blockchain_client():
    """
    Obtiene el cliente de blockchain configurado (Solana por defecto).
    """
    config = SettingsConfig.objects.get_or_create(key="blockchain_settings")[0]
    network = config.parameters.get("blockchain_network", "https://api.devnet.solana.com")  # Default: Solana Devnet
    return Client(network)

# Clave privada del sistema (simulada para desarrollo; en producción usar bóveda segura)
def get_system_keypair():
    """
    Obtiene el par de claves del sistema para firmar transacciones.
    En producción, usar un sistema seguro como AWS KMS o una bóveda.
    """
    config = SettingsConfig.objects.get_or_create(key="blockchain_settings")[0]
    private_key = config.parameters.get("system_private_key")
    if not private_key:
        # Generar una clave para desarrollo si no está configurada
        keypair = Keypair()
        config.parameters["system_private_key"] = base64.b64encode(keypair.secret_key).decode('utf-8')
        config.save()
        return keypair
    return Keypair.from_secret_key(base64.b64decode(private_key))

def preserve_capsule(capsule):
    """
    Preserva una cápsula en la blockchain como un dato permanente.

    Args:
        capsule (Capsule): La cápsula a preservar.

    Returns:
        str: Hash de la transacción en la blockchain.
    """
    client = get_blockchain_client()
    system_keypair = get_system_keypair()

    # Serializar datos de la cápsula
    capsule_data = {
        'uid': capsule.uid,
        'usuario': capsule.usuario.uid,
        'contenido': capsule.contenido,
        'ubicacion': {'lat': capsule.ubicacion.y, 'lon': capsule.ubicacion.x},
        'fecha': capsule.fecha.isoformat(),
        'temas': capsule.temas,
        'parameters': capsule.parameters,
        'variables': capsule.variables,
        'timestamp': datetime.now().isoformat()
    }
    data_str = json.dumps(capsule_data)

    # Crear una transacción simple para almacenar el hash del contenido
    # En producción, usar un programa personalizado en Solana para almacenamiento
    tx = Transaction().add(
        transfer(
            TransferParams(
                from_pubkey=system_keypair.public_key,
                to_pubkey=system_keypair.public_key,  # Autotransferencia simbólica
                lamports=1000  # Costo simbólico
            )
        )
    )
    tx.add_instruction({"memo": data_str[:80]})  # Limitar memo a 80 caracteres; usar IPFS para datos completos

    # Firmar y enviar la transacción
    response = client.send_transaction(tx, system_keypair)
    tx_hash = response.get('result')
    
    # Actualizar la cápsula con el hash de la transacción
    capsule.parameters['blockchain_tx_hash'] = tx_hash
    capsule.save()

    return tx_hash

def verify_capsule_integrity(capsule):
    """
    Verifica la integridad de una cápsula comparando su contenido con el registro en blockchain.

    Args:
        capsule (Capsule): La cápsula a verificar.

    Returns:
        bool: True si el contenido coincide con el registro en blockchain, False si no.
    """
    client = get_blockchain_client()
    tx_hash = capsule.parameters.get('blockchain_tx_hash')
    if not tx_hash:
        return False

    try:
        tx_details = client.get_transaction(tx_hash)
        memo = tx_details['result']['transaction']['message']['instructions'][1]['data']  # Memo está en la segunda instrucción
        memo_decoded = base64.b64decode(memo).decode('utf-8')

        # Comparar con el contenido actual (simplificado; en producción usar hash completo con IPFS)
        capsule_data = {
            'uid': capsule.uid,
            'contenido': capsule.contenido
        }
        return memo_decoded.startswith(json.dumps(capsule_data)[:80])
    except Exception as e:
        print(f"Error verifying capsule: {e}")
        return False

def process_blockchain_transaction(sender, receiver, amount, description=""):
    """
    Procesa una transacción en la blockchain entre dos usuarios.

    Args:
        sender (User): Usuario que envía el monto.
        receiver (User): Usuario que recibe el monto.
        amount (float): Cantidad en tokens (convertida a lamports).
        description (str, optional): Descripción de la transacción.

    Returns:
        str: Hash de la transacción.
    """
    client = get_blockchain_client()
    system_keypair = get_system_keypair()

    # Convertir cantidad a lamports (1 SOL = 1,000,000,000 lamports)
    lamports = int(amount * 1_000_000_000)

    tx = Transaction().add(
        transfer(
            TransferParams(
                from_pubkey=system_keypair.public_key,  # Simulación: usa clave del sistema
                to_pubkey=system_keypair.public_key,    # En producción, usar claves de usuarios
                lamports=lamports
            )
        )
    )
    tx.add_instruction({"memo": f"Transaction: {description[:80]}"})

    response = client.send_transaction(tx, system_keypair)
    tx_hash = response.get('result')
    return tx_hash

def get_blockchain_balance():
    """
    Obtiene el balance de la cuenta del sistema en la blockchain.

    Returns:
        float: Balance en SOL.
    """
    client = get_blockchain_client()
    system_keypair = get_system_keypair()
    balance = client.get_balance(system_keypair.public_key)['result']['value']
    return balance / 1_000_000_000  # Convertir lamports a SOL