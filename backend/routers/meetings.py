from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db
from typing import Optional
from routers._filtros import in_clause

router = APIRouter()

@router.get("/por-edicao")
def por_edicao(
    year_min: int = Query(1969),
    year_max: int = Query(2025),
    edition: Optional[int] = Query(None),
    pais: Optional[str] = Query(None, description="Nacionalidade do participante (a.country)"),
    local: Optional[str] = Query(None, description="Local da reunião (m.location)"),
    db: Session = Depends(get_db)
):
    params = {"y1": year_min, "y2": year_max}
    clauses = ["m.year BETWEEN :y1 AND :y2"]

    if edition:
        clauses.append("m.edition = :ed")
        params["ed"] = edition

    # Filtro por nacionalidade do participante
    pais_clause = in_clause("pais", pais, params, "a.country")
    if pais_clause:
        clauses.append(pais_clause)

    # Filtro por local da reunião (usa ILIKE para pegar parte do texto)
    if local:
        clauses.append("m.location ILIKE :local")
        params["local"] = f"%{local}%"

    where = " AND ".join(clauses)
    rows = db.execute(text(f"""
        SELECT m.edition, COUNT(*) as total
        FROM attendee a
        JOIN meeting m ON m.id = a.meeting_id
        WHERE {where}
        GROUP BY m.edition
        ORDER BY m.edition
    """), params).fetchall()
    return [{"edition": r.edition, "total": r.total} for r in rows]


@router.get("/por-pais")
def por_pais(
    year_min: int = Query(1969),
    year_max: int = Query(2025),
    edition: Optional[int] = Query(None),
    pais: Optional[str] = Query(None, description="Nacionalidade do participante (a.country)"),
    local: Optional[str] = Query(None, description="Local da reunião (m.location)"),
    db: Session = Depends(get_db)
):
    params = {"y1": year_min, "y2": year_max}
    clauses = ["m.year BETWEEN :y1 AND :y2"]

    if edition:
        clauses.append("m.edition = :ed")
        params["ed"] = edition

    pais_clause = in_clause("pais", pais, params, "a.country")
    if pais_clause:
        clauses.append(pais_clause)

    if local:
        clauses.append("m.location ILIKE :local")
        params["local"] = f"%{local}%"

    where = " AND ".join(clauses)
    rows = db.execute(text(f"""
        SELECT a.country, COUNT(*) as total
        FROM attendee a
        JOIN meeting m ON m.id = a.meeting_id
        WHERE {where}
        GROUP BY a.country
        ORDER BY total DESC
        LIMIT 30
    """), params).fetchall()
    return [{"country": r.country, "total": r.total} for r in rows]


@router.get("/edicoes")
def edicoes(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT edition, year FROM meeting ORDER BY edition
    """)).fetchall()
    return [{"edition": r.edition, "year": r.year} for r in rows]


@router.get("/reg-type")
def reg_type(
    year_min: int = Query(1969),
    year_max: int = Query(2025),
    edition: Optional[int] = Query(None),
    pais: Optional[str] = Query(None, description="Nacionalidade do participante (a.country)"),
    local: Optional[str] = Query(None, description="Local da reunião (m.location)"),
    db: Session = Depends(get_db)
):
    params = {"y1": year_min, "y2": year_max}
    clauses = ["m.year BETWEEN :y1 AND :y2"]

    if edition:
        clauses.append("m.edition = :ed")
        params["ed"] = edition

    pais_clause = in_clause("pais", pais, params, "a.country")
    if pais_clause:
        clauses.append(pais_clause)

    if local:
        clauses.append("m.location ILIKE :local")
        params["local"] = f"%{local}%"

    where = " AND ".join(clauses)
    rows = db.execute(text(f"""
        SELECT
            CASE
                WHEN a.reg_type IS NULL OR TRIM(a.reg_type) = '' THEN 'Não informado'
                WHEN UPPER(a.reg_type) LIKE '%REMOTE%' THEN 'Remote'
                WHEN UPPER(a.reg_type) LIKE '%ONSITE%' THEN 'Onsite'
                WHEN UPPER(a.reg_type) LIKE '%IN-PERSON%' THEN 'In-Person'
                WHEN UPPER(a.reg_type) LIKE '%VIRTUAL%' THEN 'Virtual'
                ELSE INITCAP(LOWER(TRIM(a.reg_type)))
            END as tipo,
            COUNT(*) as total
        FROM attendee a
        JOIN meeting m ON m.id = a.meeting_id
        WHERE {where}
        GROUP BY 1
        ORDER BY total DESC
    """), params).fetchall()
    return [{"tipo": r.tipo, "total": r.total} for r in rows]


# NOVO ENDPOINT: Extrai os locais únicos da coluna location
@router.get("/locais")
def locais(db: Session = Depends(get_db)):
    """
    Extrai o país da coluna location (ex: 'Vienna, Austria & Online; Hosted by Cisco' -> 'Austria').
    Usa uma expressão SQL para pegar o texto após a última vírgula ou antes de '&'.
    """
    rows = db.execute(text("""
        SELECT DISTINCT
            TRIM(
                SPLIT_PART(
                    SPLIT_PART(location, '&', 1), 
                    ',', 
                    -1
                )
            ) AS local
        FROM meeting
        WHERE location IS NOT NULL AND location != ''
        ORDER BY local
    """)).fetchall()
    # Limpa strings muito curtas ou que não são países (ex: "Online")
    return [{"local": r.local} for r in rows if r.local and len(r.local) > 2]