FROM mcr.microsoft.com/playwright:v1.63.0-noble

ARG PNPM_VERSION=11.9.0
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .

ENV CI=1
CMD ["pnpm", "run", "test:e2e:payments"]
