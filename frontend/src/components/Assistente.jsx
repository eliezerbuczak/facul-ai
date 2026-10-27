import { Loader2, Send, Sparkles, X } from 'lucide-react';
import { useRef, useState } from 'react';

import { api } from '@/api/cliente';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useAcao } from '@/hooks/useRequisicao';
import { MensagemErro } from './MensagemErro';

const SUGESTOES = [
  'Quais alunos estão inadimplentes?',
  'Quantos alunos estão com matrícula ativa?',
];

export function Assistente({ alunoEmFoco, aoLimparFoco, modo }) {
  const [pergunta, setPergunta] = useState('');
  const [conversa, setConversa] = useState([]);
  const fim = useRef(null);

  const { carregando, erro, disparar } = useAcao((corpo) => api.perguntar(corpo));

  async function enviar(texto) {
    const limpa = (texto ?? pergunta).trim();
    if (limpa.length < 3 || carregando) return;

    setConversa((c) => [...c, { autor: 'voce', texto: limpa }]);
    setPergunta('');

    const resposta = await disparar({
      pergunta: limpa,
      ...(alunoEmFoco ? { alunoId: alunoEmFoco.id } : {}),
    });

    if (resposta) setConversa((c) => [...c, { autor: 'assistente', ...resposta }]);
    queueMicrotask(() => fim.current?.scrollIntoView({ behavior: 'smooth' }));
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <header className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold">
          <Sparkles className="size-4" /> Assistente
        </h2>
        {/* Atende "identifique claramente o que está implementado e o que está
            apenas demonstrado" em tempo de execução, não só no README. */}
        <Badge variant={modo === 'anthropic' ? 'default' : 'secondary'}>
          {modo === 'anthropic' ? 'IA real' : 'modo demonstrativo'}
        </Badge>
      </header>

      <ScrollArea className="min-h-48 flex-1 rounded-lg border bg-card p-3">
        {conversa.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Pergunte sobre os alunos e a situação financeira deles.
            </p>
            {SUGESTOES.map((s) => (
              <Button
                key={s}
                variant="outline"
                size="sm"
                className="h-auto w-full justify-start whitespace-normal text-left"
                onClick={() => enviar(s)}
              >
                {s}
              </Button>
            ))}
          </div>
        )}

        <ul className="space-y-3">
          {conversa.map((m, i) => (
            <li key={i} className={m.autor === 'voce' ? 'text-right' : ''}>
              <div
                className={
                  m.autor === 'voce'
                    ? 'inline-block max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground'
                    : 'inline-block max-w-[95%] rounded-lg bg-muted px-3 py-2 text-sm whitespace-pre-line'
                }
              >
                {m.texto ?? m.resposta}
              </div>
              {m.autor === 'assistente' && m.ferramentasUsadas?.length > 0 && (
                // Trilha de auditoria: dá para conferir a resposta contra o
                // endpoint que a originou (docs/05 §5, barreira 4).
                <p className="mt-1 text-xs text-muted-foreground">
                  consultou: {m.ferramentasUsadas.join(', ')}
                  {m.fontes?.length > 0 && ` · ${m.fontes.length} registro(s)`}
                </p>
              )}
            </li>
          ))}
        </ul>

        {carregando && (
          <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> consultando os dados…
          </p>
        )}
        {erro && (
          <div className="mt-3">
            <MensagemErro
              erro={erro}
              aoTentarDeNovo={() => enviar(conversa.at(-1)?.texto)}
            />
          </div>
        )}
        <div ref={fim} />
      </ScrollArea>

      {alunoEmFoco && (
        <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm">
          <span className="flex-1 truncate">
            Perguntando sobre <strong>{alunoEmFoco.nome}</strong>
          </span>
          <Button variant="ghost" size="icon" className="size-6" onClick={aoLimparFoco}>
            <X className="size-3.5" />
            <span className="sr-only">Remover aluno em foco</span>
          </Button>
        </div>
      )}

      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          enviar();
        }}
      >
        <Textarea
          value={pergunta}
          onChange={(e) => setPergunta(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              enviar();
            }
          }}
          placeholder="Pergunte alguma coisa…"
          rows={2}
          maxLength={500}
          className="resize-none"
        />
        <Button
          type="submit"
          size="icon"
          disabled={carregando || pergunta.trim().length < 3}
        >
          {carregando ? <Loader2 className="animate-spin" /> : <Send />}
          <span className="sr-only">Enviar</span>
        </Button>
      </form>
    </div>
  );
}
