# Enfy.ia
Aplicativo de prontuário inteligente com preenchimento por áudio.

## Requisitos
- Node.js 20+
- pnpm 8+
- Docker e Docker Compose

## Configuração
1. Copie `.env.example` para `.env` e ajuste as variáveis conforme necessário.
2. Instale as dependências do projeto:
   ```bash
   pnpm install
   ```
3. Prepare o banco de dados e os seeds:
   ```bash
   pnpm db:push
   pnpm db:seed
   ```
4. Suba a stack local com banco PostgreSQL, MinIO e aplicação:
   ```bash
   docker compose up
   ```
5. Acesse o app em http://localhost:3000.

## Atalhos de teclado
- `Ctrl + S`: salva a avaliação e cria uma nova versão.
- `Ctrl + J`: exporta a avaliação atual em JSON.
- `Ctrl + P`: exporta a avaliação atual em PDF.

## MinIO
- Console administrativo disponível em http://localhost:9001.
- Credenciais padrão: `minioadmin` / `minioadmin`.
- Configure o bucket definido em `S3_BUCKET` (padrão `enfy`).

## Versionamento e comparação
- A lista de versões fica no topo da página de avaliação (`/avaliacoes/[id]`).
- Use "Comparar com versão anterior" para evidenciar as diferenças (campos destacados em azul).
- A ação "Duplicar para nova versão" abre uma nova avaliação pré-preenchida para o mesmo paciente.

## Autenticação
O seed cria o usuário `admin@enfy.local` com senha `admin123`.

## Variáveis de ambiente
Veja `.env.example` para:
- `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
- `DATABASE_URL`
- `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_REGION`

## Testes
- Testes unitários:
  ```bash
  pnpm test
  ```
- Playwright (fluxo crítico):
  ```bash
  pnpm test:e2e
  ```
