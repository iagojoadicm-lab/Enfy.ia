# Enfy.ia
Aplicativo de prontuário inteligente com preenchimento por áudio.

## Requisitos

- Node.js 20+
- Docker e Docker Compose

## Configuração

1. Copie o arquivo `.env.example` para `.env` e ajuste as variáveis, se necessário.
2. Instale as dependências:

   ```bash
   npm install
   ```

3. Execute as migrações e seed:

   ```bash
   npx prisma migrate dev
   npm run prisma:seed
   ```

4. Inicie o ambiente com Docker Compose:

   ```bash
   docker compose up
   ```

O usuário padrão criado pelo seed é `admin@enfy.local` com senha `admin123`.
