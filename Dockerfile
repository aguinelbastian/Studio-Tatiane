FROM node:22-alpine

# Instalar dependências do sistema
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev

# Definir diretório de trabalho
WORKDIR /home/node/.n8n

# Instalar n8n globalmente
RUN npm install -g n8n

# Criar diretório de dados
RUN mkdir -p /home/node/.n8n && \
    chown -R node:node /home/node

# Trocar para usuário node (segurança)
USER node

# Expor porta
EXPOSE 5678

# Comando de inicialização
CMD ["n8n", "start"]
