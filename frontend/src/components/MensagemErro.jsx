import { AlertCircle, RefreshCw } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

/**
 * Erro apresentável, com nova tentativa quando faz sentido (RF-16).
 *
 * Falha do serviço de IA e falha de conexão são transitórias — ofereça
 * repetir. Um 404 ou um 400 não melhoram repetindo.
 */
export function MensagemErro({ erro, aoTentarDeNovo }) {
  const transitorio = erro?.ehDeIa || erro?.codigo === 'SEM_CONEXAO';

  return (
    <Alert variant="destructive">
      <AlertCircle />
      <AlertTitle>Não deu para carregar</AlertTitle>
      <AlertDescription className="flex-col items-start gap-2">
        <span>{erro?.message ?? 'Erro inesperado.'}</span>
        {transitorio && aoTentarDeNovo && (
          <Button variant="outline" size="sm" onClick={aoTentarDeNovo}>
            <RefreshCw /> Tentar de novo
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
