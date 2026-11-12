from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db
from typing import Optional
from routers._filtros import in_clause, category_norm_expr, rfc_pais_clause


router = APIRouter()


@router.get("/coautoria")
def coautoria(
    year_min: int = Query(1969),
    year_max: int = Query(2025),
    category: Optional[str] = Query(None),
    wg: Optional[str] = Query(None),
    pais: Optional[str] = Query(None),
    min_colaboracoes: int = Query(2),
    limit: int = Query(150),
    db: Session = Depends(get_db)
):
    # Filtro a1.valido/a2.valido direto no SQL (colunas indexadas).
    # Não precisa mais buscar `limit * 5` e filtrar em Python.
    params = {
        "y1": year_min,
        "y2": year_max,
        "min": min_colaboracoes,
        "lim": limit,
    }
    clauses = [
        "r.year BETWEEN :y1 AND :y2",
        "a1.valido = true",
        "a2.valido = true",
    ]

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
        SELECT a1.nome as autor1, a2.nome as autor2, COUNT(*) as colaboracoes
        FROM rfc_autor ra1
        JOIN rfc_autor ra2 ON ra1.rfc_id = ra2.rfc_id AND ra1.autor_id < ra2.autor_id
        JOIN rfc r ON r.id = ra1.rfc_id
        JOIN autor a1 ON a1.id = ra1.autor_id
        JOIN autor a2 ON a2.id = ra2.autor_id
        WHERE {where}
        GROUP BY a1.nome, a2.nome
        HAVING COUNT(*) >= :min
        ORDER BY colaboracoes DESC
        LIMIT :lim
    """), params).fetchall()

    edges = [
        {"source": r.autor1, "target": r.autor2, "weight": r.colaboracoes}
        for r in rows
    ]
    nomes = sorted({n for e in edges for n in (e["source"], e["target"])})
    return {"nodes": [{"id": n} for n in nomes], "edges": edges}