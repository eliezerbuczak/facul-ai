import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const VARIANTE_STATUS = {
  ATIVO: 'default',
  TRANCADO: 'secondary',
  CANCELADO: 'outline',
  FORMADO: 'secondary',
};

export function ListaAlunos({ alunos, carregando, aoSelecionar, selecionadoId }) {
  if (carregando) {
    return (
      <ul className="space-y-2" aria-busy="true" aria-label="Carregando alunos">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i} className="rounded-lg border bg-card p-3">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="mt-2 h-3 w-64" />
          </li>
        ))}
      </ul>
    );
  }

  if (alunos.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        Nenhum aluno encontrado para esse filtro.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {alunos.map((aluno) => (
        <li key={aluno.id}>
          <button
            type="button"
            onClick={() => aoSelecionar(aluno)}
            aria-current={aluno.id === selecionadoId ? 'true' : undefined}
            className="w-full rounded-lg border bg-card p-3 text-left shadow-xs transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none aria-[current]:border-primary aria-[current]:bg-accent"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="font-medium">{aluno.nome}</span>
              <Badge variant={VARIANTE_STATUS[aluno.status] ?? 'outline'}>
                {aluno.status}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {aluno.matricula} · {aluno.curso}
            </p>
          </button>
        </li>
      ))}
    </ul>
  );
}
