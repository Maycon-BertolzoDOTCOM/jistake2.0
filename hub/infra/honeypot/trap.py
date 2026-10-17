#!/usr/bin/env python3
"""
HUB Multi-Vertical — Honeypot Python
Gera XMLs sintéticos (stages, caminhos falsos, tokens aleatórios) para enganar scanners/agentes LLM.
Roda em 127.0.0.1:5001, User=nobody, NoNewPrivileges=true, ProtectSystem=strict
"""

import os
import sys
import json
import random
import string
import time
import logging
import asyncio
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict

from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.responses import PlainTextResponse, XMLResponse
from pydantic import BaseModel
import uvicorn

# Configuração de logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("/var/log/honeypot/honeypot.log"),
    ],
)
logger = logging.getLogger("honeypot")

# Diretório de stages
STAGES_DIR = Path("/opt/honeypot/stages")
STAGES_DIR.mkdir(parents=True, exist_ok=True)

# Tokens canários (formato: palavra-palavra-4chars)
CANARY_WORDS = [
    "alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf", "hotel",
    "india", "juliet", "kilo", "lima", "mike", "november", "oscar", "papa",
    "quebec", "romeo", "sierra", "tango", "uniform", "victor", "whiskey",
    "xray", "yankee", "zulu", "secure", "vault", "shield", "guard", "watch",
]


@dataclass
class Interaction:
    id: str
    timestamp: str
    source_ip: str
    user_agent: str
    stage: str
    path: str
    token: Optional[str] = None
    duration_ms: float = 0.0


class HoneypotState:
    def __init__(self):
        self.interactions: List[Interaction] = []
        self.start_time = time.time()
        self.stages_generated = 0
        self.tokens_served = 0

    def add_interaction(self, interaction: Interaction):
        self.interactions.append(interaction)
        if interaction.token:
            self.tokens_served += 1

    def get_metrics(self) -> Dict:
        return {
            "uptime": time.time() - self.start_time,
            "stages_generated": self.stages_generated,
            "tokens_served": self.tokens_served,
            "interactions": [asdict(i) for i in self.interactions[-100:]],
        }


state = HoneypotState()

app = FastAPI(
    title="HUB Honeypot",
    description="Synthetic XML generator for deception",
    version="1.0.0",
)


def generate_canary_token() -> str:
    """Gera token canário sintético: palavra-palavra-4chars"""
    w1 = random.choice(CANARY_WORDS)
    w2 = random.choice(CANARY_WORDS)
    chars = "".join(random.choices(string.ascii_lowercase + string.digits, k=4))
    return f"{w1}-{w2}-{chars}"


def generate_fake_xml(stage: str, token: Optional[str] = None) -> str:
    """Gera XML sintético baseado no stage"""
    timestamp = datetime.now(timezone.utc).isoformat()
    request_id = "".join(random.choices(string.ascii_hexdigits.lower(), k=32))

    templates = {
        "admin_panel": f"""<?xml version="1.0" encoding="UTF-8"?>
<adminPanel>
    <status>active</status>
    <version>2.4.1</version>
    <users>
        <user id="1" role="admin">admin</user>
        <user id="2" role="operator">operator</user>
    </users>
    <config>
        <debug>false</debug>
        <maintenance>false</maintenance>
    </config>
    <token>{token or generate_canary_token()}</token>
    <timestamp>{timestamp}</timestamp>
    <requestId>{request_id}</requestId>
</adminPanel>""",
        "config_backup": f"""<?xml version="1.0" encoding="UTF-8"?>
<configBackup>
    <database>
        <host>db.internal</host>
        <port>5432</port>
        <name>hub_prod</name>
        <user>hub_user</user>
        <password>REDACTED</password>
    </database>
    <redis>
        <host>redis.internal</host>
        <port>6379</port>
    </redis>
    <secrets>
        <apiKey>{generate_canary_token()}</apiKey>
        <jwtSecret>{generate_canary_token()}</jwtSecret>
    </secrets>
    <generated>{timestamp}</generated>
    <requestId>{request_id}</requestId>
</configBackup>""",
        "api_docs": f"""<?xml version="1.0" encoding="UTF-8"?>
<apiDocumentation>
    <version>1.0.0</version>
    <endpoints>
        <endpoint method="GET" path="/api/v1/users" auth="bearer"/>
        <endpoint method="POST" path="/api/v1/login" auth="none"/>
        <endpoint method="GET" path="/api/v1/admin/stats" auth="admin"/>
        <endpoint method="DELETE" path="/api/v1/admin/users/{{id}}" auth="admin"/>
    </endpoints>
    <auth>
        <type>JWT</type>
        <algorithm>RS256</algorithm>
        <publicKey>-----BEGIN PUBLIC KEY-----MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...</publicKey>
    </auth>
    <internalToken>{token or generate_canary_token()}</internalToken>
    <generated>{timestamp}</generated>
</apiDocumentation>""",
        "deployment_manifest": f"""<?xml version="1.0" encoding="UTF-8"?>
<deploymentManifest>
    <environment>production</environment>
    <version>1.2.3</version>
    <services>
        <service name="hub-api" replicas="3" image="hub/api:1.2.3"/>
        <service name="hub-worker" replicas="5" image="hub/worker:1.2.3"/>
        <service name="janus-runner" replicas="2" image="janus/runner:1.0.0"/>
    </services>
    <configMap>
        <key>JANUS_REGISTRY</key>
        <value>/etc/janus/registry.yaml</value>
    </configMap>
    <secrets>
        <secret name="DATABASE_URL" value="postgresql://..."/>
        <secret name="REDIS_URL" value="redis://..."/>
        <secret name="HONEYPOT_TOKEN" value="{token or generate_canary_token()}"/>
    </secrets>
    <deployedAt>{timestamp}</deployedAt>
    <requestId>{request_id}</requestId>
</deploymentManifest>""",
        "janus_registry": f"""<?xml version="1.0" encoding="UTF-8"?>
<janusRegistry>
    <gpts>
        <gpt id="jis-take-2.0" link="https://chatgpt.com/g/..." authorized="true" gate="pre-approved">
            <categories>cat1_direta,cat2_roleplay,cat8_output_embedding</categories>
            <authorization>sha256:placeholder</authorization>
        </gpt>
        <gpt id="isca-poc-002" link="https://chatgpt.com/g/..." authorized="true" gate="pre-approved">
            <categories>cat7_multiturno,cat8_output_embedding,cat11_lrl</categories>
            <authorization>sha256:placeholder</authorization>
        </gpt>
    </gpts>
    <canary>{token or generate_canary_token()}</canary>
    <generated>{timestamp}</generated>
</janusRegistry>""",
        "escapekit_build": f"""<?xml version="1.0" encoding="UTF-8"?>
<escapekitBuild>
    <id>build-{random.randint(1000,9999)}</id>
    <status>completed</status>
    <source>ai-studio</source>
    <target>/opt/deploy/hub-web</target>
    <artifacts>
        <artifact>dist/index.html</artifact>
        <artifact>dist/main.js</artifact>
        <artifact>dist/styles.css</artifact>
    </artifacts>
    <secrets>
        <deployKey>{generate_canary_token()}</deployKey>
        <accessToken>{generate_canary_token()}</accessToken>
    </secrets>
    <completedAt>{timestamp}</completedAt>
    <requestId>{request_id}</requestId>
</escapekitBuild>""",
    }

    return templates.get(stage, templates["admin_panel"])


# Carrega stages disponíveis
AVAILABLE_STAGES = list({
    "admin_panel",
    "config_backup",
    "api_docs",
    "deployment_manifest",
    "janus_registry",
    "escapekit_build",
})

# Gera arquivos de stage no disco
for stage in AVAILABLE_STAGES:
    stage_file = STAGES_DIR / f"{stage}.xml"
    if not stage_file.exists():
        stage_file.write_text(generate_fake_xml(stage))
        state.stages_generated += 1


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    response = await call_next(request)

    duration = (time.time() - start) * 1000
    logger.info(
        f"{client_ip} - {request.method} {request.url.path} - {response.status_code} - {duration:.1f}ms - {user_agent}"
    )

    return response


@app.get("/")
async def root(request: Request):
    """Endpoint principal — retorna stage aleatório"""
    stage = random.choice(AVAILABLE_STAGES)
    token = generate_canary_token()
    xml = generate_fake_xml(stage, token)

    interaction = Interaction(
        id="".join(random.choices(string.ascii_hexdigits.lower(), k=16)),
        timestamp=datetime.now(timezone.utc).isoformat(),
        source_ip=request.client.host if request.client else "unknown",
        user_agent=request.headers.get("user-agent", "unknown"),
        stage=stage,
        path="/",
        token=token,
        duration_ms=0,
    )
    state.add_interaction(interaction)

    return XMLResponse(content=xml, media_type="application/xml")


@app.get("/{stage}")
async def get_stage(stage: str, request: Request):
    """Endpoint para stage específico"""
    if stage not in AVAILABLE_STAGES:
        # Retorna 404 mas loga a tentativa
        logger.warning(f"Stage não encontrado: {stage} from {request.client.host}")
        raise HTTPException(status_code=404, detail="Stage not found")

    token = generate_canary_token()
    xml = generate_fake_xml(stage, token)

    interaction = Interaction(
        id="".join(random.choices(string.ascii_hexdigits.lower(), k=16)),
        timestamp=datetime.now(timezone.utc).isoformat(),
        source_ip=request.client.host if request.client else "unknown",
        user_agent=request.headers.get("user-agent", "unknown"),
        stage=stage,
        path=f"/{stage}",
        token=token,
        duration_ms=0,
    )
    state.add_interaction(interaction)

    return XMLResponse(content=xml, media_type="application/xml")


@app.get("/metrics")
async def metrics():
    """Métricas para Prometheus/Deception Console"""
    return state.get_metrics()


@app.get("/health")
async def health():
    return {"status": "healthy", "uptime": time.time() - state.start_time}


@app.get("/stages")
async def list_stages():
    return {"stages": AVAILABLE_STAGES, "count": len(AVAILABLE_STAGES)}


def main():
    # Drop privileges se rodando como root
    if os.getuid() == 0:
        try:
            import pwd
            nobody = pwd.getpwnam("nobody")
            os.setgid(nobody.pw_gid)
            os.setuid(nobody.pw_uid)
            logger.info("Dropped privileges to nobody")
        except Exception as e:
            logger.warning(f"Could not drop privileges: {e}")

    # Configuração do servidor
    config = uvicorn.Config(
        app,
        host="127.0.0.1",
        port=5001,
        log_level="info",
        access_log=True,
        loop="asyncio",
    )
    server = uvicorn.Server(config)

    logger.info("Starting HUB Honeypot on 127.0.0.1:5001")
    asyncio.run(server.serve())


if __name__ == "__main__":
    main()