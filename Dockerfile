FROM node:20 AS builder
WORKDIR /app
COPY package*.json yarn.lock ./
RUN mkdir -p -m 0700 ~/.ssh && ssh-keyscan github.com >> ~/.ssh/known_hosts
RUN yarn install
COPY . .
RUN npm run build

FROM node:20
WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/yarn.lock ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
CMD ["npm", "run", "start"]