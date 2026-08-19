FROM node:22-slim

WORKDIR /app

COPY . .

RUN npm install -g corepack@latest \
    && corepack pnpm install --frozen-lockfile \
    && corepack pnpm run build \
    && rm -rf /root/.cache /root/.local/share/pnpm/store

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/index.js"]
