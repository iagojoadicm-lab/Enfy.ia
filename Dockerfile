FROM node:20-alpine AS base
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=base /app .
EXPOSE 3000
CMD ["npm", "run", "start"]
