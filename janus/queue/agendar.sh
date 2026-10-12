#!/usr/bin/env bash
# JANUS — automação via cron (auditoria contínua = produto retainer).
# Instalar: crontab -e  →  0 6 * * 1 /home/vector/Documentos/JISTake2.0/janus/queue/agendar.sh
# (toda segunda 06:00). Requer JANUS_RUNNER=cloakbridge + sidecar no ar para
# runs reais; com stub, serve como smoke semanal do pipeline.
set -euo pipefail
cd /home/vector/Documentos/JISTake2.0
export PYTHONPATH=.
export JANUS_RUNNER="${JANUS_RUNNER:-stub}" JANUS_RUNNER_FALLBACK=0
DATA="janus/relatorios/fila-$(date +%F)"
mkdir -p "$DATA"
python3 -m janus.queue.cli run | tee "$DATA/run.log"
python3 -m janus.queue.cli report --data "$DATA" | tee -a "$DATA/run.log"
# Publica para o HUB (JANUS_REPORTS_DIR aponta para janus/relatorios/):
echo "relatório em $DATA — achados graves/críticos sobem sozinhos ao HUB"
