#!/bin/bash
# HUB Multi-Vertical — iptables Stateful Firewall
# DROP default, conntrack ESTABLISHED/RELATED, SSH restrito, anti-SYN, anti-brute force
# Execute como root na VM Oracle ARM

set -euo pipefail

# Configurações
ADMIN_IP="${ADMIN_IP:-203.0.113.0/24}"  # SUBSTITUA PELO SEU IP REAL
SSH_PORT="${SSH_PORT:-22}"
WEB_PORTS="80,443"
APP_PORT="8080"
HONEYPOT_PORT="5001"
LOOPBACK_IF="lo"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[IPTABLES]${NC} $*"; }
warn() { echo -e "${YELLOW}[IPTABLES]${NC} $*"; }
err() { echo -e "${RED}[IPTABLES]${NC} $*" >&2; }

# Verifica root
if [[ $EUID -ne 0 ]]; then
    err "Este script deve ser executado como root"
    exit 1
fi

# Backup das regras atuais
BACKUP_FILE="/etc/iptables/rules.v4.backup.$(date +%Y%m%d_%H%M%S)"
mkdir -p /etc/iptables
iptables-save > "$BACKUP_FILE"
log "Backup salvo em $BACKUP_FILE"

# Limpa regras existentes
log "Limpando regras existentes..."
iptables -F
iptables -X
iptables -t nat -F
iptables -t nat -X
iptables -t mangle -F
iptables -t mangle -X

# Políticas padrão: DROP tudo
log "Definindo políticas padrão DROP..."
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT DROP

# Chain customizada para logging
iptables -N LOGGING
iptables -A LOGGING -m limit --limit 2/min -j LOG --log-prefix "[IPTABLES-DROP] " --log-level 4
iptables -A LOGGING -j DROP

# ============================================================
# LOOPBACK — tráfego local ilimitado
# ============================================================
log "Configurando loopback..."
iptables -A INPUT -i "$LOOPBACK_IF" -j ACCEPT
iptables -A OUTPUT -o "$LOOPBACK_IF" -j ACCEPT

# ============================================================
# ESTABLISHED/RELATED — stateful tracking
# ============================================================
log "Permitindo tráfego estabelecido e relacionado..."
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
iptables -A OUTPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
iptables -A FORWARD -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# ============================================================
# INVALID packets — drop silencioso
# ============================================================
log "Dropando pacotes INVALID..."
iptables -A INPUT -m conntrack --ctstate INVALID -j DROP
iptables -A OUTPUT -m conntrack --ctstate INVALID -j DROP
iptables -A FORWARD -m conntrack --ctstate INVALID -j DROP

# ============================================================
# ICMP — permitir tipos essenciais, rate limited
# ============================================================
log "Configurando ICMP..."
iptables -A INPUT -p icmp --icmp-type echo-request -m limit --limit 1/s --limit-burst 5 -j ACCEPT
iptables -A INPUT -p icmp --icmp-type destination-unreachable -j ACCEPT
iptables -A INPUT -p icmp --icmp-type time-exceeded -j ACCEPT
iptables -A INPUT -p icmp --icmp-type parameter-problem -j ACCEPT
iptables -A OUTPUT -p icmp -j ACCEPT

# ============================================================
# SSH — restrito ao IP admin com anti-brute force (recent)
# ============================================================
log "Configurando SSH (porta $SSH_PORT) para $ADMIN_IP com anti-brute force..."

# Chain para SSH
iptables -N SSH_PROTECT

# Registra nova conexão SSH
iptables -A SSH_PROTECT -m recent --name ssh_attack --set --rsource

# Bloqueia se mais de 3 tentativas em 60 segundos
iptables -A SSH_PROTECT -m recent --name ssh_attack --update --seconds 60 --hitcount 4 --rsource -j LOGGING

# Permite se passou no rate limit
iptables -A SSH_PROTECT -j ACCEPT

# Aplica proteção SSH apenas para IP admin
iptables -A INPUT -p tcp --dport "$SSH_PORT" -s "$ADMIN_IP" -m conntrack --ctstate NEW -j SSH_PROTECT

# Log tentativas de SSH de outros IPs
iptables -A INPUT -p tcp --dport "$SSH_PORT" ! -s "$ADMIN_IP" -m conntrack --ctstate NEW -j LOG --log-prefix "[SSH-BLOCKED] " --log-level 4
iptables -A INPUT -p tcp --dport "$SSH_PORT" ! -s "$ADMIN_IP" -m conntrack --ctstate NEW -j DROP

# ============================================================
# HTTP/HTTPS — frontend (Nginx)
# ============================================================
log "Abrindo portas web ($WEB_PORTS)..."
iptables -A INPUT -p tcp -m multiport --dports "$WEB_PORTS" -m conntrack --ctstate NEW -j ACCEPT

# ============================================================
# APP PORT — backend local apenas (não exposto externamente)
# ============================================================
log "Porta app ($APP_PORT) apenas localhost..."
iptables -A INPUT -p tcp --dport "$APP_PORT" -s 127.0.0.1 -m conntrack --ctstate NEW -j ACCEPT
iptables -A INPUT -p tcp --dport "$APP_PORT" ! -s 127.0.0.1 -j DROP

# ============================================================
# HONEYPOT PORT — apenas localhost (Nginx faz proxy)
# ============================================================
log "Porta honeypot ($HONEYPOT_PORT) apenas localhost..."
iptables -A INPUT -p tcp --dport "$HONEYPOT_PORT" -s 127.0.0.1 -m conntrack --ctstate NEW -j ACCEPT
iptables -A INPUT -p tcp --dport "$HONEYPOT_PORT" ! -s 127.0.0.1 -j DROP

# ============================================================
# DNS — resolver externo (necessário para API Gateway, updates)
# ============================================================
log "Permitindo DNS outbound..."
iptables -A OUTPUT -p udp --dport 53 -m conntrack --ctstate NEW -j ACCEPT
iptables -A OUTPUT -p tcp --dport 53 -m conntrack --ctstate NEW -j ACCEPT

# ============================================================
# NTP — sincronização de tempo
# ============================================================
log "Permitindo NTP outbound..."
iptables -A OUTPUT -p udp --dport 123 -m conntrack --ctstate NEW -j ACCEPT

# ============================================================
# APT/Updates — apenas para mirrors Ubuntu/Oracle
# ============================================================
log "Permitindo updates do sistema..."
iptables -A OUTPUT -p tcp -d 91.189.91.38 --dport 80 -m conntrack --ctstate NEW -j ACCEPT  # archive.ubuntu.com
iptables -A OUTPUT -p tcp -d 91.189.91.39 --dport 80 -m conntrack --ctstate NEW -j ACCEPT  # security.ubuntu.com
iptables -A OUTPUT -p tcp -d 138.197.64.0/24 --dport 80 -m conntrack --ctstate NEW -j ACCEPT  # Oracle mirrors (exemplo)

# ============================================================
# ANTI-SYN FLOOD — syn cookies + limit
# ============================================================
log "Configurando anti-SYN flood..."
echo 1 > /proc/sys/net/ipv4/tcp_syncookies
echo 1 > /proc/sys/net/ipv4/tcp_synack_retries
echo 2 > /proc/sys/net/ipv4/tcp_syn_retries

# Limita SYN novos por segundo
iptables -A INPUT -p tcp --syn -m limit --limit 50/s --limit-burst 100 -j ACCEPT
iptables -A INPUT -p tcp --syn -j DROP

# ============================================================
# ANTI-PORT SCAN — detecta varredura de portas
# ============================================================
log "Configurando anti-port scan..."
iptables -N PORT_SCAN
iptables -A PORT_SCAN -m recent --name port_scan --set --rsource
iptables -A PORT_SCAN -m recent --name port_scan --update --seconds 60 --hitcount 10 --rsource -j LOGGING

# Aplica em portas comuns de scan (exceto web/ssh já protegidas)
for port in 21 23 25 53 110 135 139 143 445 465 587 993 995 1433 1521 3306 3389 5432 5900 6379 8080 8443 9000 9200 27017; do
    iptables -A INPUT -p tcp --dport "$port" -m conntrack --ctstate NEW -j PORT_SCAN
done

# ============================================================
# OUTPUT — tráfego de saída controlado
# ============================================================
log "Configurando OUTPUT policy..."
# Já temos ESTABLISHED/RELATED + DNS + NTP + APT acima
# Bloqueia resto por padrão (policy DROP)

# Permite saída para API Gateway health checks se necessário
iptables -A OUTPUT -p tcp -d 10.0.0.0/8 -m conntrack --ctstate NEW -j ACCEPT  # VCN interna

# ============================================================
# FORWARD — não fazemos forward (não somos router)
# ============================================================
# Policy DROP já definida

# ============================================================
# SALVAR REGRAS
# ============================================================
log "Salvando regras..."
iptables-save > /etc/iptables/rules.v4

# Instala iptables-persistent se não tiver
if ! command -v netfilter-persistent >/dev/null 2>&1; then
    warn "netfilter-persistent não instalado. Instalando..."
    DEBIAN_FRONTEND=noninteractive apt-get update && apt-get install -y netfilter-persistent iptables-persistent
fi

netfilter-persistent save

log "Regras aplicadas e persistidas com sucesso!"
log "Teste: sudo iptables -L -v -n"
log "Backup anterior em: $BACKUP_FILE"