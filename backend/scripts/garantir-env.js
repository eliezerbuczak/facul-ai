// Garante que ../.env exista antes do modo watch.
//
// `node --watch --env-file-if-exists=X` é uma combinação quebrada: a flag do
// env tolera o arquivo ausente, mas o watcher tenta vigiar o mesmo caminho e
// estoura ENOENT. `--watch-path` não ajuda — o caminho do env é vigiado de
// qualquer forma. Resultado: `npm run dev` falhava num clone limpo, que é
// exatamente o cenário do RNF-07.
//
// Copiar o .env.example resolve na origem e mantém o `cp` fora do roteiro do
// README. O arquivo é ignorado pelo git e contém só os padrões.
import { copyFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const env = resolve(raiz, '.env');

if (!existsSync(env)) {
  copyFileSync(resolve(raiz, '.env.example'), env);
  console.log('.env criado a partir de .env.example');
}
