// @ts-check
import { lerConfig } from './platform/config.js';
import { montarCasosDeUso } from './platform/dependencias.js';
import { criarServidor } from './platform/servidor.js';

const config = lerConfig();
const app = await criarServidor({ config, casosDeUso: montarCasosDeUso(config) });

for (const sinal of ['SIGINT', 'SIGTERM']) {
  process.on(sinal, () => {
    app.log.info(`${sinal} recebido, encerrando`);
    app.close().then(() => process.exit(0));
  });
}

try {
  await app.listen({ port: config.porta, host: '0.0.0.0' });
  app.log.info(
    `persistência: ${config.persistencia} | assistente: ${config.modoAssistente}`,
  );
} catch (erro) {
  app.log.error(erro);
  process.exit(1);
}
