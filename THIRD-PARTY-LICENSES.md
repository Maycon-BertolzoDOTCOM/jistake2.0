# Licenças de Terceiros — Janus + HUB + escapekit-mcp

> **Regra**: Nenhum release sem este arquivo atualizado.
> CI falha se `license-checker` detectar GPL/AGPL em dependência de runtime.

---

## Dependências Python (janus/)

| Dependência | Versão | Licença | Copyright | Repositório |
|-------------|--------|---------|-----------|-------------|
| fastapi | 0.115.x | MIT | Sebastián Ramírez | https://github.com/fastapi/fastapi |
| pydantic | 2.10.x | MIT | Samuel Colvin | https://github.com/pydantic/pydantic |
| pyyaml | 6.0.x | MIT | Kirill Simonov | https://github.com/yaml/pyyaml |
| pytest | 8.x | MIT | Holger Krekel et al. | https://github.com/pytest-dev/pytest |
| pytest-asyncio | 0.23.x | Apache-2.0 | Timo Furrer et al. | https://github.com/pytest-dev/pytest-asyncio |
| httpx | 0.27.x | MIT | Tom Christie | https://github.com/encode/httpx |
| pyyaml | 6.0.x | MIT | Kirill Simonov | https://github.com/yaml/pyyaml |

---

## Dependências Node.js (hub-web/) — *a preencher quando hub-web for criado*

| Dependência | Versão | Licença | Copyright | Repositório |
|-------------|--------|---------|-----------|-------------|
| next | 14.x | MIT | Vercel | https://github.com/vercel/next.js |
| react | 18.x | MIT | Meta | https://github.com/facebook/react |
| next-auth | 4.x | ISC | Iain Collins | https://github.com/nextauthjs/next-auth |
| prisma | 5.x | Apache-2.0 | Prisma | https://github.com/prisma/prisma |
| tailwindcss | 3.x | MIT | Tailwind Labs | https://github.com/tailwindlabs/tailwindcss |
| zod | 3.x | MIT | Colin McDonnell | https://github.com/colinhacks/zod |

---

## Dependências Go (microrouter/) — *ecossistema Trama*

| Dependência | Versão | Licença | Copyright | Repositório |
|-------------|--------|---------|-----------|-------------|
| github.com/gin-gonic/gin | v1.9.x | MIT | Gin Contributors | https://github.com/gin-gonic/gin |
| github.com/lib/pq | v1.10.x | MIT | lib/pq Contributors | https://github.com/lib/pq |
| golang.org/x/crypto | v0.17.x | BSD-3-Clause | Go Authors | https://go.googlesource.com/crypto |

---

## Dependências Rust (janus-core/ futuro) — *a preencher*

| Dependência | Versão | Licença | Copyright | Repositório |
|-------------|--------|---------|-----------|-------------|
| serde | 1.0.x | MIT/Apache-2.0 | Serde Contributors | https://github.com/serde-rs/serde |
| tokio | 1.x | MIT | Tokio Contributors | https://github.com/tokio-rs/tokio |
| regex | 1.x | MIT/Apache-2.0 | Rust Regex Contributors | https://github.com/rust-lang/regex |
| clap | 4.x | MIT/Apache-2.0 | Clap Contributors | https://github.com/clap-rs/clap |

---

## escapekit-mcp (componente separado)

| Componente | Licença | Status |
|------------|---------|--------|
| escapekit-mcp | Apache-2.0 | **Definido** — ver escapekit-mcp/LICENSE |

> **Nota**: escapekit-mcp é componente separado com sua própria licença Apache-2.0.
> Ver escapekit-mcp/LICENSE e escapekit-mcp/NOTICE para detalhes.

---

## Licenças Proibidas em Runtime (CI falha se detectadas)

| Licença | Motivo |
|---------|--------|
| GPL-2.0 / GPL-3.0 | Efeito viral — contamina binário proprietário |
| AGPL-3.0 | Efeito viral + rede |
| LGPL-2.1/3.0 (link estático) | Requer linking dinâmico + permissão de troca |

> CI falha automaticamente se `license-checker` detectar qualquer uma acima em dependência de runtime.

---

## Como Atualizar Este Arquivo

```bash
# Python
pip install license-checker
license-checker --json > licenses-python.json

# Node (hub-web)
npx license-checker --json > licenses-node.json

# Go
go install github.com/google/go-licenses@latest
go-licenses report ./... --template=table > licenses-go.txt

# Rust
cargo install cargo-license
cargo license --json > licenses-rust.json

# Consolidar (script Python abaixo)
python scripts/consolidate_licenses.py
```

---

## Script de Consolidação (scripts/consolidate_licenses.py)

```python
#!/usr/bin/env python3
import json
import sys
from pathlib import Path

def load_json(path):
    if path.exists():
        return json.loads(path.read_text())
    return {}

def main():
    licenses = []

    # Python
    py = load_json(Path("licenses-python.json"))
    for name, info in py.items():
        licenses.append({
            "ecosystem": "Python",
            "name": name,
            "version": info.get("version", "?"),
            "license": info.get("licenses", "?"),
            "repository": info.get("repository", ""),
        })

    # Node
    node = load_json(Path("licenses-node.json"))
    for name, info in node.items():
        licenses.append({
            "ecosystem": "Node",
            "name": name,
            "version": info.get("version", "?"),
            "license": info.get("licenses", "?"),
            "repository": info.get("repositoryUrl", ""),
        })

    # Generate markdown
    out = ["# Licenças de Terceiros — Consolidado\n"]
    by_eco = {}
    for lic in licenses:
        by_eco.setdefault(lic["ecosystem"], []).append(lic)

    for eco, items in sorted(by_eco.items()):
        out.append(f"\n## {eco}\n")
        out.append("| Dependência | Versão | Licença | Repositório |")
        out.append("|-------------|--------|---------|-------------|")
        for item in sorted(items, key=lambda x: x["name"].lower()):
            out.append(f"| {item['name']} | {item['version']} | {item['license']} | {item['repository']} |")

    Path("THIRD-PARTY-LICENSES.md").write_text("\n".join(out))
    print(f"Gerado THIRD-PARTY-LICENSES.md com {len(licenses)} dependências")

if __name__ == "__main__":
    main()
```