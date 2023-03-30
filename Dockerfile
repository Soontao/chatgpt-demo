ARG EV_OPENAI_API_KEY
ARG EV_SITE_PASSWORD
ARG EV_SERPER_KEY
ARG EV_OPENAI_API_MODEL

FROM node:alpine
WORKDIR /usr/src
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install
COPY . .
RUN node build_node_env.mjs
RUN pnpm run build
ENV HOST=0.0.0.0 PORT=3000 NODE_ENV=production
EXPOSE $PORT
CMD ["node", "dist/server/entry.mjs"]
