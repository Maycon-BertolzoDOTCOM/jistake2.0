# Licenças de Terceiros — Janus (JISTake2.0)

> **Regra**: Nenhum release sem este arquivo atualizado.
> CI falha se `license-checker` detectar GPL/AGPL em dependência de runtime.

---

## Dependências Python (janus/)

| Dependência | Versão | Licença | Copyright | Repositório |
|-------------|--------|---------|-----------|-------------|
| pyyaml | 6.0.x | MIT | Kirill Simonov | https://github.com/yaml/pyyaml |
| pytest | 8.x | MIT | Holger Krekel et al. | https://github.com/pytest-dev/pytest |
| pytest-asyncio | 0.23.x | Apache-2.0 | Timo Furrer et al. | https://github.com/pytest-dev/pytest-asyncio |
| httpx | 0.27.x | MIT | Tom Christie | https://github.com/encode/httpx |

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

# Consolidar (script Python abaixo)
python scripts/consolidate_licenses.py
```
