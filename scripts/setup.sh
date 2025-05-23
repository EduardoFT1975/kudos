#!/bin/bash

# setup.sh
# Script para configurar el entorno de desarrollo de Kudos en Linux

# Configuración
PROJECT_NAME="kudos_project"
APP_NAME="kudos_app"
PROJECT_DIR="$(pwd)/$PROJECT_NAME"
VIRTUALENV_DIR="$PROJECT_DIR/venv"
REPO_URL="https://github.com/yourusername/$PROJECT_NAME.git"  # Reemplaza con tu URL de repositorio
BRANCH="main"
PYTHON="python3.10"  # Ajusta según tu versión de Python
DB_NAME="kudos_db"
DB_USER="kudos_user"
DB_PASSWORD="yourpassword"  # Cambia esto por una contraseña segura

# Colores para salida
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # Sin color

echo -e "${GREEN}=== Iniciando configuración de Kudos ===${NC}"

# Verificar requisitos básicos
echo -e "${YELLOW}Verificando requisitos básicos...${NC}"
for cmd in git $PYTHON curl; do
    if ! command -v $cmd &> /dev/null; then
        echo -e "${RED}Error: $cmd no está instalado. Instalando...${NC}"
        sudo apt update
        sudo apt install -y $cmd
    fi
done

# Instalar dependencias del sistema
echo -e "${YELLOW}Instalando dependencias del sistema...${NC}"
sudo apt install -y python3-pip python3-venv postgresql postgresql-contrib libpq-dev

# Configurar PostgreSQL
echo -e "${YELLOW}Configurando PostgreSQL...${NC}"
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || echo -e "${YELLOW}Base de datos $DB_NAME ya existe.${NC}"
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || echo -e "${YELLOW}Usuario $DB_USER ya existe.${NC}"
sudo -u postgres psql -c "ALTER ROLE $DB_USER SET client_encoding TO 'utf8';"
sudo -u postgres psql -c "ALTER ROLE $DB_USER SET default_transaction_isolation TO 'read committed';"
sudo -u postgres psql -c "ALTER ROLE $DB_USER SET timezone TO 'UTC';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"

# Clonar el repositorio
echo -e "${YELLOW}Clonando el repositorio...${NC}"
if [ -d "$PROJECT_DIR" ]; then
    echo -e "${YELLOW}Directorio $PROJECT_DIR ya existe. Actualizando...${NC}"
    cd $PROJECT_DIR
    git pull origin $BRANCH
else
    git clone $REPO_URL $PROJECT_DIR
    cd $PROJECT_DIR
    git checkout $BRANCH
fi

# Configurar entorno virtual
echo -e "${YELLOW}Configurando entorno virtual...${NC}"
if [ ! -d "$VIRTUALENV_DIR" ]; then
    $PYTHON -m venv $VIRTUALENV_DIR
fi
source $VIRTUALENV_DIR/bin/activate

# Instalar dependencias de Python
echo -e "${YELLOW}Instalando dependencias de Python...${NC}"
pip install --upgrade pip
pip install -r $PROJECT_DIR/requirements.txt || {
    echo -e "${RED}Error: No se encontró requirements.txt. Creando uno básico...${NC}"
    cat << EOF > $PROJECT_DIR/requirements.txt
django==4.2
psycopg2-binary==2.9.6
django-environ==0.10.0
openai==0.27.8
solana==0.30.2
EOF
    pip install -r $PROJECT_DIR/requirements.txt
}

# Configurar variables de entorno
echo -e "${YELLOW}Configurando variables de entorno...${NC}"
cat << EOF > $PROJECT_DIR/.env
DJANGO_SETTINGS_MODULE=$PROJECT_NAME.settings
SECRET_KEY='your-secret-key-here'  # Genera una clave segura
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=postgres://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME
OPENAI_API_KEY='your-openai-api-key'  # Reemplaza con tu clave
SOLANA_API_KEY='your-solana-api-key'  # Reemplaza con tu clave
EOF
chmod 600 $PROJECT_DIR/.env

# Migrar base de datos
echo -e "${YELLOW}Migrando base de datos...${NC}"
$VIRTUALENV_DIR/bin/python $PROJECT_DIR/manage.py makemigrations
$VIRTUALENV_DIR/bin/python $PROJECT_DIR/manage.py migrate

# Recopilar archivos estáticos
echo -e "${YELLOW}Recopilando archivos estáticos...${NC}"
$VIRTUALENV_DIR/bin/python $PROJECT_DIR/manage.py collectstatic --noinput

# Crear superusuario (opcional)
echo -e "${YELLOW}Creando superusuario (opcional)...${NC}"
$VIRTUALENV_DIR/bin/python $PROJECT_DIR/manage.py createsuperuser --noinput --username "admin" --email "admin@example.com" || {
    echo -e "${YELLOW}Superusuario ya existe o hubo un error. Configura manualmente si es necesario.${NC}"
}

echo -e "${GREEN}=== Configuración de Kudos completada ===${NC}"
echo -e "Para iniciar el servidor de desarrollo, ejecuta:"
echo -e "  cd $PROJECT_DIR"
echo -e "  source $VIRTUALENV_DIR/bin/activate"
echo -e "  python manage.py runserver"
echo -e "Accede en: http://localhost:8000"