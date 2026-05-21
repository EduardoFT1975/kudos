#!/bin/bash

# deploy.sh
# Script para desplegar Kudos en un servidor Linux con Nginx y Gunicorn

# Configuración
PROJECT_NAME="kudos_project"
APP_NAME="kudos_app"
PROJECT_DIR="/var/www/$PROJECT_NAME"
VIRTUALENV_DIR="$PROJECT_DIR/venv"
REPO_URL="https://github.com/yourusername/$PROJECT_NAME.git"  # Reemplaza con tu URL de repositorio
BRANCH="main"
NGINX_CONFIG="/etc/nginx/sites-available/$PROJECT_NAME"
NGINX_LINK="/etc/nginx/sites-enabled/$PROJECT_NAME"
GUNICORN_SOCKET="/run/gunicorn.sock"
GUNICORN_PID="/run/gunicorn.pid"
USER="www-data"  # Usuario típico para servidores web
LOG_DIR="/var/log/$PROJECT_NAME"
PYTHON="python3.10"  # Ajusta según tu versión de Python

# Colores para salida
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # Sin color

echo -e "${GREEN}=== Iniciando despliegue de Kudos ===${NC}"

# Verificar requisitos
echo -e "${YELLOW}Verificando requisitos...${NC}"
for cmd in git $PYTHON nginx gunicorn; do
    if ! command -v $cmd &> /dev/null; then
        echo -e "${RED}Error: $cmd no está instalado. Instálalo primero.${NC}"
        exit 1
    fi
done

# Crear directorios necesarios
echo -e "${YELLOW}Configurando directorios...${NC}"
sudo mkdir -p $PROJECT_DIR $LOG_DIR
sudo chown $USER:$USER $PROJECT_DIR $LOG_DIR

# Clonar o actualizar el repositorio
if [ -d "$PROJECT_DIR/.git" ]; then
    echo -e "${YELLOW}Actualizando repositorio existente...${NC}"
    cd $PROJECT_DIR
    git fetch origin
    git reset --hard origin/$BRANCH
else
    echo -e "${YELLOW}Clonando repositorio...${NC}"
    sudo git clone $REPO_URL $PROJECT_DIR
    cd $PROJECT_DIR
    sudo git checkout $BRANCH
fi
sudo chown -R $USER:$USER $PROJECT_DIR

# Configurar entorno virtual
echo -e "${YELLOW}Configurando entorno virtual...${NC}"
if [ ! -d "$VIRTUALENV_DIR" ]; then
    sudo $PYTHON -m venv $VIRTUALENV_DIR
fi
source $VIRTUALENV_DIR/bin/activate

# Instalar dependencias
echo -e "${YELLOW}Instalando dependencias...${NC}"
pip install --upgrade pip
pip install -r $PROJECT_DIR/requirements.txt

# Configurar variables de entorno (ajusta según tus claves)
echo -e "${YELLOW}Configurando variables de entorno...${NC}"
cat << EOF > $PROJECT_DIR/.env
DJANGO_SETTINGS_MODULE=$PROJECT_NAME.settings
SECRET_KEY='your-secret-key-here'
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,localhost,127.0.0.1
DATABASE_URL=postgres://user:password@localhost:5432/kudos_db
OPENAI_API_KEY='your-openai-api-key'
SOLANA_API_KEY='your-solana-api-key'
EOF
sudo chown $USER:$USER $PROJECT_DIR/.env
sudo chmod 600 $PROJECT_DIR/.env

# Migrar base de datos
echo -e "${YELLOW}Migrando base de datos...${NC}"
$VIRTUALENV_DIR/bin/python $PROJECT_DIR/manage.py makemigrations
$VIRTUALENV_DIR/bin/python $PROJECT_DIR/manage.py migrate

# Recopilar archivos estáticos
echo -e "${YELLOW}Recopilando archivos estáticos...${NC}"
$VIRTUALENV_DIR/bin/python $PROJECT_DIR/manage.py collectstatic --noinput

# Configurar Gunicorn
echo -e "${YELLOW}Configurando Gunicorn...${NC}"
sudo tee /etc/systemd/system/gunicorn-$PROJECT_NAME.service > /dev/null << EOF
[Unit]
Description=Gunicorn instance for $PROJECT_NAME
After=network.target

[Service]
User=$USER
Group=$USER
WorkingDirectory=$PROJECT_DIR
Environment="PATH=$VIRTUALENV_DIR/bin"
ExecStart=$VIRTUALENV_DIR/bin/gunicorn --workers 3 --bind unix:$GUNICORN_SOCKET $PROJECT_NAME.wsgi:application
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Configurar Nginx
echo -e "${YELLOW}Configurando Nginx...${NC}"
sudo tee $NGINX_CONFIG > /dev/null << EOF
server {
    listen 80;
    server_name yourdomain.com;  # Reemplaza con tu dominio

    location / {
        proxy_pass http://unix:$GUNICORN_SOCKET;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /static/ {
        alias $PROJECT_DIR/static/;
    }
}
EOF

# Habilitar y reiniciar servicios
echo -e "${YELLOW}Habilitando y reiniciando servicios...${NC}"
sudo ln -sf $NGINX_CONFIG $NGINX_LINK
sudo systemctl daemon-reload
sudo systemctl enable gunicorn-$PROJECT_NAME
sudo systemctl restart gunicorn-$PROJECT_NAME
sudo systemctl restart nginx

# Verificar estado
echo -e "${YELLOW}Verificando estado...${NC}"
sudo systemctl status gunicorn-$PROJECT_NAME --no-pager
sudo nginx -t

echo -e "${GREEN}=== Despliegue de Kudos completado ===${NC}"
echo -e "Accede a tu aplicación en: http://yourdomain.com"