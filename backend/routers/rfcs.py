# routers/rfcs.py (trecho atualizado com o novo endpoint)
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db
from typing import Optional
from routers._filtros import category_norm_expr, in_clause, rfc_pais_clause

router = APIRouter()

@router.get("/por-ano")
def rfcs_por_ano(
    year_min: int = Query(1969),
    year_max: int = Query(2026), # Atualizado para 2026
    category: Optional[str] = Query(None, description="CSV de categorias canônicas"),
    wg: Optional[str] = Query(None, description="CSV de group_name"),
    autor: Optional[str] = Query(None),
    numero: Optional[str] = Query(None),
    pais: Optional[str] = Query(None, description="CSV de países (attendee.country)"),
    db: Session = Depends(get_db)
):
    params = {"y1": year_min, "y2": year_max}
    clauses = ["r.year BETWEEN :y1 AND :y2"]
    join_autor = ""

    cat_clause = in_clause("cat", category, params, f"({category_norm_expr('r.category')})")
    if cat_clause:
        clauses.append(cat_clause)

    wg_clause = in_clause("wg", wg, params, "r.group_name")
    if wg_clause:
        clauses.append(wg_clause)

    if numero:
        numeros_validos = []
        for n in numero.split(','):
            n = n.strip()
            if n.isdigit():
                numeros_validos.append(int(n))
        if numeros_validos:
            placeholders = []
            for i, n in enumerate(numeros_validos):
                key = f"num{i}"
                params[key] = n
                placeholders.append(f":{key}")
            clauses.append(f"r.numero IN ({', '.join(placeholders)})")

    if autor:
        join_autor = "JOIN rfc_autor ra ON ra.rfc_id = r.id JOIN autor a ON a.id = ra.autor_id"
        autor_clause = in_clause("aut", autor, params, "a.nome")
        if autor_clause:
            clauses.append(autor_clause)

    pais_clause = rfc_pais_clause(pais, params)
    if pais_clause:
        clauses.append(pais_clause)

    where = " AND ".join(clauses)
    rows = db.execute(text(f"""
        SELECT r.year, COUNT(DISTINCT r.id) as total
        FROM rfc r
        {join_autor}
        WHERE {where}
        GROUP BY r.year
        ORDER BY r.year
    """), params).fetchall()
    return [{"year": r.year, "total": r.total} for r in rows]

@router.get("/categorias")
def categorias(
    year_min: int = Query(1969),
    year_max: int = Query(2026), # Atualizado para 2026
    category: Optional[str] = Query(None),
    wg: Optional[str] = Query(None),
    pais: Optional[str] = Query(None, description="CSV de países (attendee.country)"),
    db: Session = Depends(get_db)
):
    params = {"y1": year_min, "y2": year_max}
    clauses = ["year BETWEEN :y1 AND :y2", "category IS NOT NULL"]

    cat_clause = in_clause("cat", category, params, f"({category_norm_expr('category')})")
    if cat_clause:
        clauses.append(cat_clause)

    wg_clause = in_clause("wg", wg, params, "group_name")
    if wg_clause:
        clauses.append(wg_clause)

    pais_clause = rfc_pais_clause(pais, params)
    if pais_clause:
        clauses.append(pais_clause.replace("r.id", "id"))

    where = " AND ".join(clauses)
    rows = db.execute(text(f"""
        SELECT {category_norm_expr('category')} as category, COUNT(*) as total
        FROM rfc
        WHERE {where}
        GROUP BY 1
        ORDER BY total DESC
    """), params).fetchall()
    return [{"category": r.category, "total": r.total} for r in rows]

@router.get("/top-autores")
def top_autores(
    year_min: int = Query(1969),
    year_max: int = Query(2026), # Atualizado para 2026
    category: Optional[str] = Query(None),
    wg: Optional[str] = Query(None),
    pais: Optional[str] = Query(None, description="CSV de países (attendee.country)"),
    limit: int = Query(20),
    db: Session = Depends(get_db)
):
    params = {"y1": year_min, "y2": year_max, "lim": limit}
    clauses = ["r.year BETWEEN :y1 AND :y2", "a.valido = true"]

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
        SELECT a.nome, COUNT(*) as total
        FROM rfc_autor ra
        JOIN autor a ON a.id = ra.autor_id
        JOIN rfc r ON r.id = ra.rfc_id
        WHERE {where}
        GROUP BY a.nome
        ORDER BY total DESC
        LIMIT :lim
    """), params).fetchall()

    return [{"x": r.nome, "y": r.total, "autor": r.nome, "total": r.total} for r in rows]

@router.get("/grupos")
def grupos(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT wg, COUNT(*) as total
        FROM draft
        WHERE wg IS NOT NULL AND wg != ''
        GROUP BY wg
        ORDER BY total DESC
        LIMIT 50
    """)).fetchall()
    return [{"grupo": r.wg, "total": r.total} for r in rows]

# Tarefa 7: Novo endpoint para listar os grupos de RFC
@router.get("/grupos-rfc")
def grupos_rfc(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT group_name, COUNT(*) as total
        FROM rfc
        WHERE group_name IS NOT NULL AND group_name != ''
        GROUP BY group_name
        ORDER BY total DESC
        LIMIT 50
    """)).fetchall()
    return [{"grupo": r.group_name, "total": r.total} for r in rows]

@router.get("/heatmap-categoria-ano")
def heatmap_categoria_ano(
    year_min: int = Query(1969),
    year_max: int = Query(2026), # Atualizado para 2026
    wg: Optional[str] = Query(None),
    pais: Optional[str] = Query(None, description="CSV de países (attendee.country)"),
    db: Session = Depends(get_db)
):
    params = {"y1": year_min, "y2": year_max}
    clauses = ["year BETWEEN :y1 AND :y2", "category IS NOT NULL"]

    wg_clause = in_clause("wg", wg, params, "group_name")
    if wg_clause:
        clauses.append(wg_clause)

    pais_clause = rfc_pais_clause(pais, params)
    if pais_clause:
        clauses.append(pais_clause.replace("r.id", "id"))

    where = " AND ".join(clauses)
    rows = db.execute(text(f"""
        SELECT year, {category_norm_expr('category')} as category, COUNT(*) as total
        FROM rfc
        WHERE {where}
        GROUP BY year, 2
        ORDER BY year
    """), params).fetchall()
    return [{"year": r.year, "category": r.category, "total": r.total} for r in rows]

@router.get("/autores-lista")
def autores_lista(limit: int = Query(300), db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT a.nome, COUNT(*) as total
        FROM rfc_autor ra
        JOIN autor a ON a.id = ra.autor_id
        WHERE a.valido = true
        GROUP BY a.nome
        ORDER BY total DESC
        LIMIT :lim
    """), {"lim": limit}).fetchall()

    return [{"autor": r.nome} for r in rows]

@router.get("/numeros-lista")
def numeros_lista(limit: int = Query(300), db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT numero FROM rfc
        WHERE numero IS NOT NULL
        ORDER BY numero DESC
        LIMIT :lim
    """), {"lim": limit}).fetchall()
    return [{"numero": r.numero} for r in rows]

@router.get("/autores-todos")
def autores_todos(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT DISTINCT a.nome
        FROM autor a
        WHERE a.valido = true
        ORDER BY a.nome ASC
    """)).fetchall()

    return [{"autor": r.nome} for r in rows]

# ... (código anterior)

@router.get("/grupos")
def grupos(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT wg, COUNT(*) as total
        FROM draft
        WHERE wg IS NOT NULL AND wg != ''
        GROUP BY wg
        ORDER BY total DESC
        LIMIT 50
    """)).fetchall()
    return [{"grupo": r.wg, "total": r.total} for r in rows]

# NOVO: Endpoint que une os grupos de RFC e Draft para o sidebar
@router.get("/grupos-unificados")
def grupos_unificados(db: Session = Depends(get_db)):
    # Pega os grupos de RFC
    rfc_groups = db.execute(text("""
        SELECT group_name AS grupo FROM rfc WHERE group_name IS NOT NULL AND group_name != ''
    """)).fetchall()
    
    # Pega os grupos de Draft
    draft_groups = db.execute(text("""
        SELECT wg AS grupo FROM draft WHERE wg IS NOT NULL AND wg != ''
    """)).fetchall()
    
    # Junta tudo e remove duplicatas
    todos = set()
    for r in rfc_groups:
        todos.add(r.grupo)
    for r in draft_groups:
        todos.add(r.grupo)
        
    return [{"grupo": g} for g in sorted(todos)]