import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Executa uma requisição e expõe carregando/erro/dados (RF-15, RF-16).
 *
 * Duas sutilezas que custaram correção:
 *
 * 1. O estado de carregamento é ajustado **durante a renderização**, não dentro
 *    do efeito. É o padrão do React para reagir a entradas que mudaram; feito
 *    no efeito, cada requisição custa uma segunda passada de renderização.
 *
 * 2. Respostas obsoletas são descartadas. Digitar rápido na busca deixa várias
 *    requisições em voo, e sem essa guarda a mais lenta sobrescreve a mais
 *    recente — a lista passa a mostrar o resultado de um termo que o usuário
 *    já nem está vendo.
 */
export function useRequisicao(executar, deps = []) {
  const assinatura = JSON.stringify(deps);

  const [chave, setChave] = useState(assinatura);
  const [gatilho, setGatilho] = useState(0);
  const [estado, setEstado] = useState({ dados: null, carregando: true, erro: null });

  if (chave !== assinatura) {
    setChave(assinatura);
    setEstado({ dados: null, carregando: true, erro: null });
  }

  // `executar` é um closure novo a cada renderização. Mantê-lo numa ref deixa
  // o efeito depender só do que de fato deve redisparar a requisição.
  const executarRef = useRef(executar);
  useEffect(() => {
    executarRef.current = executar;
  });

  useEffect(() => {
    let atual = true;
    executarRef
      .current()
      .then((dados) => atual && setEstado({ dados, carregando: false, erro: null }))
      .catch((erro) => atual && setEstado({ dados: null, carregando: false, erro }));
    return () => {
      atual = false;
    };
  }, [assinatura, gatilho]);

  return { ...estado, recarregar: useCallback(() => setGatilho((g) => g + 1), []) };
}

/** Requisição disparada por ação do usuário, não por renderização. */
export function useAcao(executar) {
  const [estado, setEstado] = useState({ carregando: false, erro: null });

  const executarRef = useRef(executar);
  useEffect(() => {
    executarRef.current = executar;
  });

  const disparar = useCallback(async (...args) => {
    setEstado({ carregando: true, erro: null });
    try {
      const resultado = await executarRef.current(...args);
      setEstado({ carregando: false, erro: null });
      return resultado;
    } catch (erro) {
      setEstado({ carregando: false, erro });
      return null;
    }
  }, []);

  return { ...estado, disparar };
}

/** Atrasa o valor para não disparar uma requisição por tecla digitada. */
export function useDebounce(valor, ms = 300) {
  const [atrasado, setAtrasado] = useState(valor);
  useEffect(() => {
    const id = setTimeout(() => setAtrasado(valor), ms);
    return () => clearTimeout(id);
  }, [valor, ms]);
  return atrasado;
}
