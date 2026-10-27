import { MessageSquareText } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { api } from '@/api/cliente';
import { useRequisicao } from '@/hooks/useRequisicao';
import { formatarData } from '@/lib/formato';
import { PainelFinanceiro } from './PainelFinanceiro';

export function SheetAluno({ aluno, aberto, aoFechar, aoPerguntarSobre }) {
  const id = aluno?.id;
  const { dados, carregando, erro, recarregar } = useRequisicao(
    () => (id ? api.obterFinanceiro(id) : Promise.resolve(null)),
    [id],
  );

  return (
    <Sheet open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <SheetContent className="w-full gap-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{aluno?.nome ?? ''}</SheetTitle>
          <SheetDescription>
            {aluno && (
              <>
                {aluno.matricula} · {aluno.curso}
                <br />
                Ingresso em {formatarData(aluno.ingressoEm)}
              </>
            )}
          </SheetDescription>
          {aluno && (
            <Badge variant="outline" className="w-fit">
              {aluno.status}
            </Badge>
          )}
        </SheetHeader>

        <ScrollArea className="flex-1 px-4">
          <PainelFinanceiro
            financeiro={dados}
            carregando={carregando}
            erro={erro}
            aoTentarDeNovo={recarregar}
          />
        </ScrollArea>

        <SheetFooter>
          {/* Liga as duas metades da tela: é o que faz a pergunta de exemplo
              "resuma a situação financeira do aluno selecionado" funcionar. */}
          <Button variant="secondary" onClick={() => aoPerguntarSobre(aluno)}>
            <MessageSquareText /> Perguntar sobre este aluno
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
