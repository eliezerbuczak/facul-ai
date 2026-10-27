import { useState } from 'react';

import { api } from '@/api/cliente';
import { Assistente } from '@/components/Assistente';
import { ListaAlunos } from '@/components/ListaAlunos';
import { MensagemErro } from '@/components/MensagemErro';
import { SheetAluno } from '@/components/SheetAluno';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDebounce, useRequisicao } from '@/hooks/useRequisicao';

const TODOS = 'TODOS';
const STATUS = ['ATIVO', 'TRANCADO', 'CANCELADO', 'FORMADO'];

export default function App() {
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState(TODOS);
  const [selecionado, setSelecionado] = useState(null);
  const [sheetAberto, setSheetAberto] = useState(false);
  const [alunoEmFoco, setAlunoEmFoco] = useState(null);

  const buscaAtrasada = useDebounce(busca);

  const saude = useRequisicao(() => api.health(), []);
  const lista = useRequisicao(
    () =>
      api.listarAlunos({
        busca: buscaAtrasada || undefined,
        status: status === TODOS ? undefined : status,
        limite: 50,
      }),
    [buscaAtrasada, status],
  );

  const alunos = lista.dados?.dados ?? [];
  const total = lista.dados?.paginacao?.total ?? 0;

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-4 p-4 md:p-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b pb-3">
        <h1 className="text-xl font-semibold">Gestão Acadêmica</h1>
        <p className="text-sm text-muted-foreground">
          {lista.carregando ? 'carregando…' : `${total} aluno(s)`}
        </p>
      </header>

      <div className="grid flex-1 gap-6 md:grid-cols-[1fr_380px]">
        <section className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome ou matrícula…"
              aria-label="Buscar por nome ou matrícula"
            />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-40" aria-label="Filtrar por status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todos</SelectItem>
                {STATUS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {lista.erro ? (
            <MensagemErro erro={lista.erro} aoTentarDeNovo={lista.recarregar} />
          ) : (
            <ListaAlunos
              alunos={alunos}
              carregando={lista.carregando}
              selecionadoId={selecionado?.id}
              aoSelecionar={(aluno) => {
                setSelecionado(aluno);
                setSheetAberto(true);
              }}
            />
          )}
        </section>

        <aside className="md:sticky md:top-6 md:h-[calc(100vh-8rem)]">
          <Assistente
            modo={saude.dados?.assistente?.modo}
            alunoEmFoco={alunoEmFoco}
            aoLimparFoco={() => setAlunoEmFoco(null)}
          />
        </aside>
      </div>

      <SheetAluno
        aluno={selecionado}
        aberto={sheetAberto}
        aoFechar={() => setSheetAberto(false)}
        aoPerguntarSobre={(aluno) => {
          setAlunoEmFoco(aluno);
          setSheetAberto(false);
        }}
      />
    </div>
  );
}
