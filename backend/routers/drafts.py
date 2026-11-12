from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db
from typing import Optional
from routers._filtros import in_clause, in_clause_pais

router = APIRouter()


@router.get("/por-ano")
def drafts_por_ano(
    year_min: int = Query(1969),
    year_max: int = Query(2025),
    wg: Optional[str] = Query(None),
    pais: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    params = {"y1": year_min, "y2": year_max}
    clauses = ["dv.year BETWEEN :y1 AND :y2"]
    join_pais = ""

    wg_clause = in_clause("wg", wg, params, "d.wg")
    if wg_clause:
        clauses.append(wg_clause)

    if pais:
        join_pais = "JOIN draft_participacao dp ON dp.draft_versao_id = dv.id"
        pais_clause = in_clause_pais("pais", pais, params, "dp.pais")
        if pais_clause:
            clauses.append(pais_clause)

    where = " AND ".join(clauses)
    rows = db.execute(text(f"""
        SELECT dv.year, COUNT(DISTINCT d.id) as total
        FROM draft d
        JOIN draft_versao dv ON dv.draft_id = d.id
        {join_pais}
        WHERE {where}
        GROUP BY dv.year
        ORDER BY dv.year
    """), params).fetchall()
    return [{"year": r.year, "total": r.total} for r in rows]


@router.get("/por-pais")
def drafts_por_pais(
    year_min: int = Query(1969),
    year_max: int = Query(2025),
    wg: Optional[str] = Query(None),
    pais: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    params = {"y1": year_min, "y2": year_max}
    clauses = ["dp.pais IS NOT NULL", "dv.year BETWEEN :y1 AND :y2"]
    join_wg = ""

    pais_clause = in_clause_pais("pais", pais, params, "dp.pais")
    if pais_clause:
        clauses.append(pais_clause)

    if wg:
        join_wg = "JOIN draft d ON d.id = dv.draft_id"
        wg_clause = in_clause("wg", wg, params, "d.wg")
        if wg_clause:
            clauses.append(wg_clause)

    where = " AND ".join(clauses)
    rows = db.execute(text(f"""
        SELECT dp.pais as country, COUNT(DISTINCT dv.draft_id) as total
        FROM draft_participacao dp
        JOIN draft_versao dv ON dv.id = dp.draft_versao_id
        {join_wg}
        WHERE {where}
        GROUP BY dp.pais
        ORDER BY total DESC
        LIMIT 30
    """), params).fetchall()
    return [{"country": r.country, "total": r.total} for r in rows]


@router.get("/keywords")
def drafts_keywords(
    year_min: int = Query(1969),
    year_max: int = Query(2025),
    wg: Optional[str] = Query(None),
    pais: Optional[str] = Query(None),
    limit: int = Query(20),
    db: Session = Depends(get_db)
):
    params = {"y1": year_min, "y2": year_max, "lim": limit}
    clauses = ["dv.year BETWEEN :y1 AND :y2"]
    join_wg = ""
    join_pais = ""

    if wg:
        join_wg = "JOIN draft d ON d.id = dv.draft_id"
        wg_clause = in_clause("wg", wg, params, "d.wg")
        if wg_clause:
            clauses.append(wg_clause)

    if pais:
        join_pais = "JOIN draft_participacao dp ON dp.draft_versao_id = dv.id"
        pais_clause = in_clause_pais("pais", pais, params, "dp.pais")
        if pais_clause:
            clauses.append(pais_clause)

    where = " AND ".join(clauses)
    # FIX: antes era COUNT(*) — com filtro de país ativo, cada keyword
    # era multiplicada pelo nº de autores daquele país no draft. Agora
    # conta versões distintas que usam a keyword.
    rows = db.execute(text(f"""
        SELECT dk.keyword, COUNT(DISTINCT dk.draft_versao_id) as total
        FROM draft_keyword dk
        JOIN draft_versao dv ON dv.id = dk.draft_versao_id
        {join_wg}
        {join_pais}
        WHERE {where}
        GROUP BY dk.keyword
        ORDER BY total DESC
        LIMIT :lim
    """), params).fetchall()
    return [{"keyword": r.keyword, "total": r.total} for r in rows]


@router.get("/status")
def drafts_status(
    year_min: int = Query(1969),
    year_max: int = Query(2025),
    wg: Optional[str] = Query(None),
    pais: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    # status_final (draft) está 100% nula no banco atual (confirmamos no pgAdmin).
    # Usamos intended_status (draft_versao), que vem do cabeçalho do draft.
    params = {"y1": year_min, "y2": year_max}
    clauses = ["dv.year BETWEEN :y1 AND :y2"]
    join_wg = ""
    join_pais = ""

    if wg:
        join_wg = "JOIN draft d ON d.id = dv.draft_id"
        wg_clause = in_clause("wg", wg, params, "d.wg")
        if wg_clause:
            clauses.append(wg_clause)

    if pais:
        join_pais = "JOIN draft_participacao dp ON dp.draft_versao_id = dv.id"
        pais_clause = in_clause_pais("pais", pais, params, "dp.pais")
        if pais_clause:
            clauses.append(pais_clause)

    where = " AND ".join(clauses)
    rows = db.execute(text(f"""
        SELECT COALESCE(dv.intended_status, 'Desconhecido') as status, COUNT(DISTINCT dv.draft_id) as total
        FROM draft_versao dv
        {join_wg}
        {join_pais}
        WHERE {where}
        GROUP BY dv.intended_status
        ORDER BY total DESC
    """), params).fetchall()
    return [{"status": r.status, "total": r.total} for r in rows]


@router.get("/por-wg")
def drafts_por_wg(
    year_min: int = Query(1969),
    year_max: int = Query(2025),
    pais: Optional[str] = Query(None),
    wg: Optional[str] = Query(None),
    limit: int = Query(20),
    db: Session = Depends(get_db)
):
    params = {"y1": year_min, "y2": year_max, "lim": limit}
    clauses = ["d.wg IS NOT NULL", "d.wg != ''", "dv.year BETWEEN :y1 AND :y2"]
    join_pais = ""

    wg_clause = in_clause("wg", wg, params, "d.wg")
    if wg_clause:
        clauses.append(wg_clause)

    if pais:
        join_pais = "JOIN draft_participacao dp ON dp.draft_versao_id = dv.id"
        pais_clause = in_clause_pais("pais", pais, params, "dp.pais")
        if pais_clause:
            clauses.append(pais_clause)

    where = " AND ".join(clauses)
    rows = db.execute(text(f"""
        SELECT d.wg, COUNT(DISTINCT d.id) as total
        FROM draft d
        JOIN draft_versao dv ON dv.draft_id = d.id
        {join_pais}
        WHERE {where}
        GROUP BY d.wg
        ORDER BY total DESC
        LIMIT :lim
    """), params).fetchall()
    return [{"wg": r.wg, "total": r.total} for r in rows]


@router.get("/versoes-por-draft")
def versoes_por_draft(
    year_min: int = Query(1969),
    year_max: int = Query(2025),
    wg: Optional[str] = Query(None),
    pais: Optional[str] = Query(None),
    limit: int = Query(20),
    db: Session = Depends(get_db)
):
    params = {"y1": year_min, "y2": year_max, "lim": limit}
    clauses = ["dv.year BETWEEN :y1 AND :y2"]
    join_pais = ""

    wg_clause = in_clause("wg", wg, params, "d.wg")
    if wg_clause:
        clauses.append(wg_clause)

    if pais:
        join_pais = "JOIN draft_participacao dp ON dp.draft_versao_id = dv.id"
        pais_clause = in_clause_pais("pais", pais, params, "dp.pais")
        if pais_clause:
            clauses.append(pais_clause)

    where = " AND ".join(clauses)
    # FIX: antes era COUNT(dv.id) — com filtro de país ativo, uma versão
    # com N autores do país era contada N vezes. Agora conta versões DISTINTAS.
    rows = db.execute(text(f"""
        SELECT d.nome_base, COUNT(DISTINCT dv.id) as total_versoes
        FROM draft d
        JOIN draft_versao dv ON dv.draft_id = d.id
        {join_pais}
        WHERE {where}
        GROUP BY d.nome_base
        ORDER BY total_versoes DESC
        LIMIT :lim
    """), params).fetchall()
    return [{"draft": r.nome_base, "total": r.total_versoes} for r in rows]

@router.get("/lista")
def drafts_lista(limit: int = Query(300), db: Session = Depends(get_db)):
    """Lista de nomes de drafts pro filtro 'Drafts' do sidebar.

    Padrão espelhado de /rfcs/autores-lista: retorna os mais frequentes
    primeiro, sem tentar filtrar por autor (não há ligação no schema).
    """
    rows = db.execute(text("""
        SELECT d.nome_base, COUNT(DISTINCT d.id) AS total
        FROM draft d
        WHERE d.nome_base IS NOT NULL AND d.nome_base != ''
        GROUP BY d.nome_base
        ORDER BY total DESC
        LIMIT :lim
    """), {"lim": limit}).fetchall()
    return [{"draft": r.nome_base} for r in rows]