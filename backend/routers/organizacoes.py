from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db
from typing import Optional
from routers._filtros import in_clause, in_clause_pais, category_norm_expr, rfc_pais_clause


router = APIRouter()


@router.get("/ranking")
def organizacoes_ranking(
    year_min: int = Query(1969),
    year_max: int = Query(2025),
    category: Optional[str] = Query(None),
    wg: Optional[str] = Query(None),
    pais: Optional[str] = Query(None),
    limit: int = Query(20),
    db: Session = Depends(get_db)
):
    # Filtro `o.valido = true` direto no SQL (coluna indexada).
    # Não precisa mais buscar `limit * 10` e filtrar em Python.
    params = {"y1": year_min, "y2": year_max, "lim": limit}
    clauses = ["r.year BETWEEN :y1 AND :y2", "o.valido = true"]

    cat_clause = in_clause("cat", category, params, f"({category_norm_expr('r.category')})")
    if cat_clause:
        clauses.append(cat_clause)

    wg_clause = in_clause("wg", wg, params, "r.group_name")
    if wg_clause:
        clauses.append(wg_clause)

    pais_clause = rfc_pais_clause(pais, params)
    if pais_clause:
        clauses.append(pais_clause)

    where = " AND ".join(clauses)
    rows = db.execute(text(f"""
        WITH normalizado AS (
          SELECT o.id,
            regexp_replace(
              UPPER(TRIM(o.nome)),
              '\s+(SYSTEMS|TECHNOLOGIES|COMMUNICATIONS|NETWORKS?|LABS?|LABORATORIES|CORP(ORATION)?|INC\.?|LTD\.?|LLC\.?|GMBH|CO\.?)\.?\s*$',
              ''
            ) as nome_norm
          FROM organizacao o
        )
        SELECT
          MODE() WITHIN GROUP (ORDER BY o.nome) as nome,
          COUNT(DISTINCT r.id) as total
        FROM normalizado n
        JOIN organizacao o ON o.id = n.id
        JOIN afiliacao af ON af.organizacao_id = o.id
        JOIN rfc_autor ra ON ra.autor_id = af.autor_id
        JOIN rfc r ON r.id = ra.rfc_id
        WHERE {where}
        GROUP BY n.nome_norm
        ORDER BY total DESC
        LIMIT :lim
    """), params).fetchall()

    return [{"organizacao": r.nome, "total": r.total} for r in rows]


@router.get("/ranking-drafts")
def organizacoes_ranking_drafts(
    year_min: int = Query(1969),
    year_max: int = Query(2025),
    wg: Optional[str] = Query(None),
    pais: Optional[str] = Query(None),
    limit: int = Query(20),
    db: Session = Depends(get_db)
):
    # Filtro `o.valido = true` direto no SQL (coluna indexada).
    # Não precisa mais buscar `limit * 10` e filtrar em Python.
    params = {"y1": year_min, "y2": year_max, "lim": limit}
    clauses = ["dv.year BETWEEN :y1 AND :y2", "o.valido = true"]
    join_wg = ""

    if wg:
        join_wg = "JOIN draft d ON d.id = dv.draft_id"
        wg_clause = in_clause("wg", wg, params, "d.wg")
        if wg_clause:
            clauses.append(wg_clause)

    pais_clause = in_clause_pais("pais", pais, params, "dp.pais")
    if pais_clause:
        clauses.append(pais_clause)

    where = " AND ".join(clauses)
    rows = db.execute(text(f"""
        WITH normalizado AS (
          SELECT o.id,
            regexp_replace(
              UPPER(TRIM(o.nome)),
              '\s+(SYSTEMS|TECHNOLOGIES|COMMUNICATIONS|NETWORKS?|LABS?|LABORATORIES|CORP(ORATION)?|INC\.?|LTD\.?|LLC\.?|GMBH|CO\.?)\.?\s*$',
              ''
            ) as nome_norm
          FROM organizacao o
        )
        SELECT
          MODE() WITHIN GROUP (ORDER BY o.nome) as nome,
          COUNT(DISTINCT dp.draft_versao_id) as total
        FROM normalizado n
        JOIN organizacao o ON o.id = n.id
        JOIN draft_participacao dp ON dp.organizacao_id = o.id
        JOIN draft_versao dv ON dv.id = dp.draft_versao_id
        {join_wg}
        WHERE {where}
        GROUP BY n.nome_norm
        ORDER BY total DESC
        LIMIT :lim
    """), params).fetchall()

    return [{"organizacao": r.nome, "total": r.total} for r in rows]


@router.get("/organizacoes-em-ambos")
def organizacoes_em_ambos(limit: int = Query(20), db: Session = Depends(get_db)):
    """Organizações que aparecem tanto publicando RFC quanto em meetings.

    Filtro `o.valido = true` direto no SQL (coluna indexada).
    """
    rows = db.execute(text("""
        SELECT o.nome,
          COUNT(DISTINCT ra.rfc_id) as total_rfcs,
          COUNT(DISTINCT att.id) as total_participacoes
        FROM organizacao o
        LEFT JOIN afiliacao af ON af.organizacao_id = o.id
        LEFT JOIN rfc_autor ra ON ra.autor_id = af.autor_id
        LEFT JOIN attendee att ON att.organizacao_id = o.id
        WHERE o.valido = true
        GROUP BY o.nome
        HAVING COUNT(DISTINCT ra.rfc_id) > 0
           AND COUNT(DISTINCT att.id) > 0
        ORDER BY total_rfcs DESC
        LIMIT :lim
    """), {"lim": limit}).fetchall()

    return [
        {
            "organizacao": r.nome,
            "rfcs": r.total_rfcs,
            "participacoes": r.total_participacoes,
        }
        for r in rows
    ]