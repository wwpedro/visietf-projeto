# =========================================================
# ETAPA 1: BUILD DO FRONTEND (React/Vite)
# =========================================================
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .

# A URL da API será relativa (/api), o Nginx resolve isso depois
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# =========================================================
# ETAPA 2: IMAGEM FINAL (Python + Nginx)
# =========================================================
# Usamos a imagem slim do Python para evitar problemas com bibliotecas (como psycopg2)
FROM python:3.11-slim

# Instala o Nginx e dependências do sistema
RUN apt-get update && apt-get install -y nginx libpq-dev gcc && rm -rf /var/lib/apt/lists/*

# Configura o diretório do Backend
WORKDIR /app/backend

# Instala as dependências do Python
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia o código do Backend
COPY backend/ .

# Copia o Frontend compilado (da Etapa 1) para a pasta do Nginx
COPY --from=frontend-build /app/frontend/dist /usr/share/nginx/html

# Copia a configuração do Nginx
COPY nginx.conf /etc/nginx/sites-available/default

# Cria o script de inicialização com monitoramento de processos
RUN printf '#!/bin/sh\nuvicorn main:app --host 0.0.0.0 --port 8000 &\nUVICORN_PID=$!\nnginx -g "daemon off;" &\nNGINX_PID=$!\nwait -n "$UVICORN_PID" "$NGINX_PID"\nEXIT_CODE=$?\nkill "$UVICORN_PID" "$NGINX_PID" 2>/dev/null || true\nexit "$EXIT_CODE"\n' > /app/start.sh && chmod +x /app/start.sh

# Expõe apenas a porta 80 (do Nginx)
EXPOSE 80

CMD ["/app/start.sh"]