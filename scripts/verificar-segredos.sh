#!/usr/bin/env bash
# Falha se uma chave de API com aparência de real estiver versionada.
# Varre apenas arquivos rastreados pelo git — .env local nunca entra na busca.
# Ver docs/05-assistente-ia.md §7.
set -uo pipefail

PADRAO='sk-ant-[A-Za-z0-9_-]{20,}'

# O próprio script contém o padrão; excluí-lo evita o falso positivo.
ACHADOS=$(git grep -nIE "$PADRAO" -- ':(exclude)scripts/verificar-segredos.sh' || true)

if [ -n "$ACHADOS" ]; then
  echo "ERRO: chave de API encontrada em arquivo versionado:" >&2
  echo "$ACHADOS" >&2
  echo >&2
  echo "Remova o valor, rotacione a chave na console da Anthropic e refaça o commit." >&2
  exit 1
fi

echo "Nenhuma chave de API versionada."
