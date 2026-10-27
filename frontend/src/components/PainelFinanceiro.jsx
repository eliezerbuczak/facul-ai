import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { formatarData, formatarReais, rotuloSituacao } from '@/lib/formato';
import { MensagemErro } from './MensagemErro';

const VARIANTE_PARCELA = {
  PAGA: 'secondary',
  VENCIDA: 'destructive',
  A_VENCER: 'outline',
};
const CLASSE_PARCELA = { PAGA: 'bg-sucesso/15 text-sucesso border-transparent' };

function Linha({ rotulo, valor, destaque }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{rotulo}</span>
      <span className={destaque ? 'font-semibold tabular-nums' : 'tabular-nums'}>
        {valor}
      </span>
    </div>
  );
}

export function PainelFinanceiro({ financeiro, carregando, erro, aoTentarDeNovo }) {
  if (carregando) return <Skeleton className="h-64 w-full" />;
  if (erro) return <MensagemErro erro={erro} aoTentarDeNovo={aoTentarDeNovo} />;
  if (!financeiro) return null;

  const { situacao, referencia, resumo, parcelas } = financeiro;
  const inadimplente = situacao === 'INADIMPLENTE';

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Badge
          variant={inadimplente ? 'destructive' : 'default'}
          className={
            inadimplente ? 'text-sm' : 'bg-sucesso text-sucesso-foreground text-sm'
          }
        >
          {situacao}
        </Badge>
        {/* A data de referência fica visível: a situação é função de uma data,
            e mostrá-la torna o veredito conferível (docs/04 §5). */}
        <span className="text-xs text-muted-foreground">
          calculado em {formatarData(referencia)}
        </span>
      </div>

      <div className="space-y-1.5 rounded-lg border bg-card p-3">
        <Linha rotulo="Parcelas" valor={resumo.totalParcelas} />
        <Linha rotulo="Pagas" valor={resumo.parcelasPagas} />
        <Linha rotulo="Vencidas" valor={resumo.parcelasVencidas} />
        <Linha rotulo="A vencer" valor={resumo.parcelasAVencer} />
        <Separator className="my-2" />
        <Linha
          rotulo="Em aberto"
          valor={formatarReais(resumo.totalEmAbertoCentavos)}
          destaque
        />
        <Linha
          rotulo="Já vencido"
          valor={formatarReais(resumo.totalVencidoCentavos)}
          destaque
        />
      </div>

      {parcelas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma parcela registrada.</p>
      ) : (
        <div>
          {/* A evidência ao lado do veredito: uma interface que mostra só
              "ADIMPLENTE" é a que esconde o bug do item 4 (RF-13). */}
          <h3 className="mb-2 text-sm font-medium">Parcelas</h3>
          <ul className="divide-y rounded-lg border bg-card">
            {parcelas.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 p-2.5 text-sm"
              >
                <span className="tabular-nums">{formatarData(p.vencimento)}</span>
                <Badge
                  variant={VARIANTE_PARCELA[p.situacao] ?? 'outline'}
                  className={CLASSE_PARCELA[p.situacao]}
                >
                  {rotuloSituacao(p.situacao)}
                </Badge>
                <span className="tabular-nums">{formatarReais(p.valorCentavos)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
