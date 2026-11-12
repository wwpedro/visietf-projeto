from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from database import get_db
from routers._filtros import (
    category_norm_expr,
    in_clause,
    in_clause_pais,
    rfc_pais_clause,
    dividir_valores,
)

router = APIRouter()

LIMITE_MAXIMO = 500           # era 200 — 124 edições do IETF + folga
MAXIMO_DE_ATRIBUTOS = 3
MAXIMO_DE_LINHAS_RETORNADAS = 5000

# Dimensões ordinais: NÃO entram no CTE de Top N; ORDER BY ASC.
# "ano" já era; "edicao" passa a ser.
DIMENSOES_ORDINAIS = {"ano", "edicao"}

# Fase 6 — mesma normalização usada em routers/organizacoes.py.
EXPRESSAO_ORGANIZACAO_NORMALIZADA = (
    r"regexp_replace(UPPER(TRIM(o.nome)), "
    r"'\s+(SYSTEMS|TECHNOLOGIES|COMMUNICATIONS|NETWORKS?|LABS?|LABORATORIES|CORP(ORATION)?|INC\.?|LTD\.?|LLC\.?|GMBH|CO\.?)\.?\s*$', "
    r"'')"
)


# ---------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------

def _deduplicar_preservando_ordem(itens: List[str]) -> List[str]:
    """Remove duplicatas mantendo a ordem original.
    Usado em `condicoes` — duas dimensões podem, em tese, compartilhar a
    mesma `condicao_fixa`, e não queremos "A AND A" no WHERE."""
    vistos = set()
    resultado = []
    for item in itens:
        if item not in vistos:
            vistos.add(item)
            resultado.append(item)
    return resultado


def clausula_numeros_de_rfc(valor_csv: str, parametros_sql: Dict) -> Optional[str]:
    """Monta `r.numero IN (:filtro_numero_0, :filtro_numero_1, ...)`.
    Só aceita partes estritamente numéricas; qualquer lixo é descartado."""
    partes = dividir_valores(valor_csv)
    numeros_validos = [int(parte) for parte in partes if parte.isdigit()]
    if not numeros_validos:
        return None
    marcadores = []
    for posicao, numero in enumerate(numeros_validos):
        chave = f"filtro_numero_{posicao}"
        parametros_sql[chave] = numero
        marcadores.append(f":{chave}")
    return f"r.numero IN ({', '.join(marcadores)})"


def clausula_edicoes(valor_csv: str, parametros_sql: Dict) -> Optional[str]:
    """Monta `m.edition IN (:filtro_edicao_0, ...)`. Mesma regra acima."""
    partes = dividir_valores(valor_csv)
    edicoes_validas = [int(parte) for parte in partes if parte.isdigit()]
    if not edicoes_validas:
        return None
    marcadores = []
    for posicao, edicao in enumerate(edicoes_validas):
        chave = f"filtro_edicao_{posicao}"
        parametros_sql[chave] = edicao
        marcadores.append(f":{chave}")
    return f"m.edition IN ({', '.join(marcadores)})"


# ---------------------------------------------------------------
# Registro de fontes (whitelist de dimensões/filtros)
# ---------------------------------------------------------------

FONTES = {
    "rfc": {
        "rotulo": "RFCs",
        "tabela_base": "rfc r",
        "medida_de_contagem": "COUNT(DISTINCT r.id)",
        "coluna_de_ano": "r.year",
        "juncoes_do_ano": [],
        "juncoes": {
            "rfc_autor":   "JOIN rfc_autor ra ON ra.rfc_id = r.id",
            "autor":       "JOIN autor a ON a.id = ra.autor_id",
            "afiliacao":   "JOIN afiliacao af ON af.autor_id = ra.autor_id",
            "organizacao": "JOIN organizacao o ON o.id = af.organizacao_id",
        },
        "dimensoes": {
            "ano":       {"rotulo": "Ano",         "expressao": "r.year",       "juncoes": []},
            "categoria": {"rotulo": "Categoria",   "expressao": f"({category_norm_expr('r.category')})", "juncoes": []},
            "grupo":     {"rotulo": "Grupo (WG)",  "expressao": "r.group_name", "juncoes": []},
            "autor":     {"rotulo": "Autor",       "expressao": "a.nome",       "juncoes": ["rfc_autor", "autor"],
                          "condicao_fixa": "a.valido = true"},
            "organizacao": {"rotulo": "Organização", "expressao": EXPRESSAO_ORGANIZACAO_NORMALIZADA,
                            "juncoes": ["rfc_autor", "afiliacao", "organizacao"],
                            "condicao_fixa": "o.valido = true"},
        },
        "filtros": {
            "category": {"juncoes": [], "montar": lambda valor, parametros_sql:
                         in_clause("filtro_categoria", valor, parametros_sql, f"({category_norm_expr('r.category')})")},
            "wg":       {"juncoes": [], "montar": lambda valor, parametros_sql:
                         in_clause("filtro_grupo", valor, parametros_sql, "r.group_name")},
            "autor":    {"juncoes": ["rfc_autor", "autor"], "montar": lambda valor, parametros_sql:
                         in_clause("filtro_autor", valor, parametros_sql, "a.nome")},
            "numero":   {"juncoes": [], "montar": clausula_numeros_de_rfc},
            "pais":     {"juncoes": [], "montar": lambda valor, parametros_sql:
                         rfc_pais_clause(valor, parametros_sql),
                         "aviso": "País em RFC é inferido pelo domínio do e-mail do autor (cobertura baixa e enviesada)."},
        },
    },

    "draft": {
        "rotulo": "Drafts",
        "tabela_base": "draft d",
        "medida_de_contagem": "COUNT(DISTINCT d.id)",
        "coluna_de_ano": "dv.year",
        "juncoes_do_ano": ["draft_versao"],
        "juncoes": {
            "draft_versao":       "JOIN draft_versao dv ON dv.draft_id = d.id",
            "draft_participacao": "JOIN draft_participacao dp ON dp.draft_versao_id = dv.id",
            "draft_keyword":      "JOIN draft_keyword dk ON dk.draft_versao_id = dv.id",
            "organizacao":        "JOIN organizacao o ON o.id = dp.organizacao_id",
            "autor":              "JOIN autor a ON a.id = dp.autor_id",
        },
        "dimensoes": {
            "ano":     {"rotulo": "Ano",       "expressao": "dv.year",          "juncoes": ["draft_versao"]},
            "grupo":   {"rotulo": "Grupo (WG)", "expressao": "d.wg",            "juncoes": []},
            "pais":    {"rotulo": "País",      "expressao": "dp.pais",          "juncoes": ["draft_versao", "draft_participacao"]},
            "keyword": {"rotulo": "Palavra-chave", "expressao": "dk.keyword",   "juncoes": ["draft_versao", "draft_keyword"]},
            "status":  {"rotulo": "Status pretendido", "expressao": "dv.intended_status", "juncoes": ["draft_versao"]},
            "organizacao": {"rotulo": "Organização", "expressao": EXPRESSAO_ORGANIZACAO_NORMALIZADA,
                            "juncoes": ["draft_versao", "draft_participacao", "organizacao"],
                            "condicao_fixa": "o.valido = true"},
            "autor":   {"rotulo": "Autor", "expressao": "a.nome",
                        "juncoes": ["draft_versao", "draft_participacao", "autor"],
                        "condicao_fixa": "a.valido = true"},
        },
        "filtros": {
            "wg":   {"juncoes": [], "montar": lambda valor, parametros_sql:
                     in_clause("filtro_grupo", valor, parametros_sql, "d.wg")},
            "pais": {"juncoes": ["draft_versao", "draft_participacao"], "montar": lambda valor, parametros_sql:
                     in_clause_pais("filtro_pais", valor, parametros_sql, "dp.pais")},
            "draft": {"juncoes": [], "montar": lambda valor, parametros_sql:
                      in_clause("filtro_draft", valor, parametros_sql, "d.nome_base")},
            "autor": {"juncoes": ["draft_versao", "draft_participacao", "autor"],
                      "montar": lambda valor, parametros_sql:
                          in_clause("filtro_autor", valor, parametros_sql, "a.nome")},
        },
    },

    "meeting": {
        "rotulo": "Meetings",
        "tabela_base": "attendee a",
        "medida_de_contagem": "COUNT(*)",
        "coluna_de_ano": "m.year",
        "juncoes_do_ano": ["meeting"],
        "juncoes": {
            "meeting": "JOIN meeting m ON m.id = a.meeting_id",
        },
        "dimensoes": {
            "ano":    {"rotulo": "Ano",    "expressao": "m.year",    "juncoes": ["meeting"]},
            "edicao": {"rotulo": "Edição", "expressao": "m.edition", "juncoes": ["meeting"]},
            "pais":   {"rotulo": "País (participante)", "expressao": "a.country", "juncoes": []},
            "local":  {"rotulo": "Local da reunião", "expressao": "m.location", "juncoes": ["meeting"]}, # NOVO
            "tipo_credenciamento": {
                "rotulo": "Tipo de credenciamento",
                "expressao": (
                    "CASE "
                    "WHEN a.reg_type IS NULL OR TRIM(a.reg_type) = '' THEN 'Não informado' "
                    "WHEN UPPER(a.reg_type) LIKE '%REMOTE%' THEN 'Remote' "
                    "WHEN UPPER(a.reg_type) LIKE '%ONSITE%' THEN 'Onsite' "
                    "WHEN UPPER(a.reg_type) LIKE '%IN-PERSON%' THEN 'In-Person' "
                    "WHEN UPPER(a.reg_type) LIKE '%VIRTUAL%' THEN 'Virtual' "
                    "ELSE INITCAP(LOWER(TRIM(a.reg_type))) "
                    "END"
                ),
                "juncoes": [],
            },
        },
        "filtros": {
            "pais":    {"juncoes": [], "montar": lambda valor, parametros_sql:
                        in_clause("filtro_pais", valor, parametros_sql, "a.country")},
            "local":   {"juncoes": [], "montar": lambda valor, parametros_sql: # NOVO
                        f"m.location ILIKE '%{valor}%'"}, # Simples, mas seguro o suficiente para ILIKE
            "edition": {"juncoes": ["meeting"], "montar": clausula_edicoes},
        },
    },
}


# ---------------------------------------------------------------
# Validação do agrupar_por
# ---------------------------------------------------------------

def validar_agrupar_por(fonte: str, agrupar_por_csv: str) -> List[str]:
    """Valida o CSV de dimensões contra a whitelist da fonte.
    Levanta HTTPException(422) com mensagem clara se algo estiver fora."""
    if not agrupar_por_csv:
        raise HTTPException(422, detail="agrupar_por é obrigatório")

    dimensoes = [item.strip() for item in agrupar_por_csv.split(",") if item.strip()]

    if len(dimensoes) < 1 or len(dimensoes) > MAXIMO_DE_ATRIBUTOS:
        raise HTTPException(
            422,
            detail=f"agrupar_por deve ter entre 1 e {MAXIMO_DE_ATRIBUTOS} itens; recebido: {len(dimensoes)}",
        )
    if len(set(dimensoes)) != len(dimensoes):
        raise HTTPException(422, detail="agrupar_por não pode ter itens repetidos")

    dimensoes_disponiveis = FONTES[fonte]["dimensoes"]
    invalidas = [d for d in dimensoes if d not in dimensoes_disponiveis]
    if invalidas:
        raise HTTPException(
            422,
            detail=f"Dimensões inválidas para fonte '{fonte}': {invalidas}. Válidas: {list(dimensoes_disponiveis)}",
        )
    return dimensoes


# ---------------------------------------------------------------
# Endpoint principal
# ---------------------------------------------------------------

@router.get("")
def consulta(
    fonte: str = Query(..., description="Fonte de dados: rfc, draft ou meeting"),
    agrupar_por: str = Query(..., description="CSV de dimensões (1 a 3), ex.: 'ano,categoria'"),
    year_min: Optional[int] = Query(None, description="Ano mínimo (opcional; ausência = ignorar tempo)"),
    year_max: Optional[int] = Query(None, description="Ano máximo (opcional; ausência = ignorar tempo)"),
    limite: int = Query(20, ge=1, le=LIMITE_MAXIMO, description="Top N da primeira dimensão NÃO-ORDINAL"),
    category: Optional[str] = Query(None),
    wg: Optional[str] = Query(None),
    pais: Optional[str] = Query(None),
    autor: Optional[str] = Query(None),
    numero: Optional[str] = Query(None),
    edition: Optional[str] = Query(None),
    draft: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Monta uma consulta agregada a partir de 1 a 3 dimensões da fonte escolhida.

    Retorno:
        {
          "fonte": "rfc",
          "dimensoes": ["ano", "categoria"],
          "linhas": [{"ano": 2001, "categoria": "INFORMATIONAL", "total": 31}, ...],
          "avisos": ["..."]
        }
    """
    if fonte not in FONTES:
        raise HTTPException(422, detail=f"Fonte inválida: '{fonte}'. Válidas: {list(FONTES)}")

    fonte_config = FONTES[fonte]
    avisos: List[str] = []

    dimensoes = validar_agrupar_por(fonte, agrupar_por)

    parametros_sql: Dict = {}
    juncoes_necessarias: List[str] = []
    condicoes: List[str] = []

    # 1) Dimensões de agrupamento: expressão + IS NOT NULL + condicao_fixa + joins
    expressoes_select: List[str] = []
    for posicao, dimensao_id in enumerate(dimensoes):
        config_dimensao = fonte_config["dimensoes"][dimensao_id]
        expressao = config_dimensao["expressao"]
        expressoes_select.append(f"{expressao} AS dimensao_{posicao}")
        condicoes.append(f"{expressao} IS NOT NULL")
        if config_dimensao.get("condicao_fixa"):
            condicoes.append(config_dimensao["condicao_fixa"])
        for nome_juncao in config_dimensao.get("juncoes", []):
            if nome_juncao not in juncoes_necessarias:
                juncoes_necessarias.append(nome_juncao)

    # 2) Filtro de ano (opcional — ausência = ignorar tempo)
    if year_min is not None:
        condicoes.append(f"{fonte_config['coluna_de_ano']} >= :ano_minimo")
        parametros_sql["ano_minimo"] = year_min
        for nome_juncao in fonte_config.get("juncoes_do_ano", []):
            if nome_juncao not in juncoes_necessarias:
                juncoes_necessarias.append(nome_juncao)
    if year_max is not None:
        condicoes.append(f"{fonte_config['coluna_de_ano']} <= :ano_maximo")
        parametros_sql["ano_maximo"] = year_max
        for nome_juncao in fonte_config.get("juncoes_do_ano", []):
            if nome_juncao not in juncoes_necessarias:
                juncoes_necessarias.append(nome_juncao)

    # 3) Filtros categoriais (cada um sabe se precisa de join)
    filtros_recebidos = {
        "category": category,
        "wg": wg,
        "pais": pais,
        "autor": autor,
        "numero": numero,
        "edition": edition,
        "draft": draft,
    }
    for nome_filtro, valor in filtros_recebidos.items():
        if not valor:
            continue
        if nome_filtro not in fonte_config["filtros"]:
            avisos.append(f"Filtro '{nome_filtro}' não se aplica à fonte '{fonte}'; ignorado.")
            continue
        config_filtro = fonte_config["filtros"][nome_filtro]
        clausula = config_filtro["montar"](valor, parametros_sql)
        if clausula:
            condicoes.append(clausula)
            for nome_juncao in config_filtro.get("juncoes", []):
                if nome_juncao not in juncoes_necessarias:
                    juncoes_necessarias.append(nome_juncao)
            if config_filtro.get("aviso"):
                avisos.append(config_filtro["aviso"])

    # 3.5) Deduplica condições (defensivo — evita "A AND A" em casos raros)
    condicoes = _deduplicar_preservando_ordem(condicoes)

    # 4) FROM + JOINs, na ordem declarada em fonte_config["juncoes"]
    juncoes_sql = " ".join(
        fonte_config["juncoes"][nome_juncao]
        for nome_juncao in fonte_config["juncoes"]
        if nome_juncao in juncoes_necessarias
    )

    onde = " AND ".join(condicoes) if condicoes else "1=1"
    tabela_base = fonte_config["tabela_base"]
    medida = fonte_config["medida_de_contagem"]

    # 5) SELECT final — ⚠️ USA `expressoes_select` (cada item já é "<expr> AS dimensao_N").
    #    NUNCA usar "dimensao_0, dimensao_1, ..." diretamente: esses nomes só
    #    existem como alias DENTRO do SELECT, não como colunas da tabela.
    colunas_select_final = ", ".join(expressoes_select) + f", {medida} AS total"
    posicoes_group_by = ", ".join(str(i + 1) for i in range(len(dimensoes)))

    # 6) Ordenação: dimensões ordinais (ano, edicao) vêm ASC primeiro
    if "ano" in dimensoes:
        posicao_ano = dimensoes.index("ano")
        ordenacao = f"dimensao_{posicao_ano} ASC, total DESC"
    elif "edicao" in dimensoes:
        posicao_edicao = dimensoes.index("edicao")
        ordenacao = f"dimensao_{posicao_edicao} ASC, total DESC"
    else:
        ordenacao = "total DESC"

    # 7) Top N da primeira dimensão NÃO-ORDINAL via CTE (se existir).
    #    `ano` e `edicao` ficam de fora do CTE: queremos a linha do tempo
    #    completa (ex.: 124 edições do IETF, ~56 anos de RFC).
    primeira_dimensao_nao_ordinal = next(
        (d for d in dimensoes if d not in DIMENSOES_ORDINAIS),
        None,
    )

    if primeira_dimensao_nao_ordinal:
        expressao_principal = fonte_config["dimensoes"][primeira_dimensao_nao_ordinal]["expressao"]
        parametros_sql["limite_principal"] = limite
        sql = f"""
            WITH principais AS (
                SELECT {expressao_principal} AS valor
                FROM {tabela_base} {juncoes_sql}
                WHERE {onde}
                GROUP BY 1
                ORDER BY {medida} DESC
                LIMIT :limite_principal
            )
            SELECT {colunas_select_final}
            FROM {tabela_base} {juncoes_sql}
            WHERE {onde}
              AND {expressao_principal} IN (SELECT valor FROM principais)
            GROUP BY {posicoes_group_by}
            ORDER BY {ordenacao}
            LIMIT {MAXIMO_DE_LINHAS_RETORNADAS}
        """
    else:
        # Só dimensões ordinais (ex.: agrupar_por=edicao) — sem CTE,
        # retorna TODAS as linhas em ordem.
        sql = f"""
            SELECT {colunas_select_final}
            FROM {tabela_base} {juncoes_sql}
            WHERE {onde}
            GROUP BY {posicoes_group_by}
            ORDER BY {ordenacao}
            LIMIT {MAXIMO_DE_LINHAS_RETORNADAS}
        """

    linhas_brutas = db.execute(text(sql), parametros_sql).fetchall()

    # 8) Monta resposta com o id da dimensão como chave (não dimensao_0)
    linhas: List[Dict] = []
    for linha_bruta in linhas_brutas:
        item = {}
        for posicao, dimensao_id in enumerate(dimensoes):
            item[dimensao_id] = getattr(linha_bruta, f"dimensao_{posicao}")
        item["total"] = linha_bruta.total
        linhas.append(item)

    if len(linhas) >= MAXIMO_DE_LINHAS_RETORNADAS:
        avisos.append(f"Resultado truncado em {MAXIMO_DE_LINHAS_RETORNADAS} linhas.")

    return {
        "fonte": fonte,
        "dimensoes": dimensoes,
        "linhas": linhas,
        "avisos": avisos,
    }


# ---------------------------------------------------------------
# Capacidades (para o front montar os seletores dinamicamente)
# ---------------------------------------------------------------

@router.get("/capacidades")
def capacidades():
    return {
        identificador: {
            "rotulo": definicao["rotulo"],
            "dimensoes": [
                {"id": dimensao_id, "rotulo": dimensao["rotulo"]}
                for dimensao_id, dimensao in definicao["dimensoes"].items()
            ],
            "filtros": {
                nome: filtro.get("aviso")
                for nome, filtro in definicao["filtros"].items()
            },
        }
        for identificador, definicao in FONTES.items()
    }