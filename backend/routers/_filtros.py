from routers._paises import pais_variantes, dominio_pais

def dividir_valores(texto: str) -> list[str]:
    """
    Divide uma string de valores usando '||' como separador.
    Usado porque nomes de autores podem conter vírgulas (ex: "Neves, F."),
    o que quebraria o split(',').
    """
    if not texto:
        return []
    return [v.strip() for v in texto.split('||') if v.strip()]

def category_norm_expr(col: str = "category") -> str:
    return f"""
    CASE
      WHEN UPPER({col}) ~ 'STANDARDS' THEN 'STANDARDS TRACK'
      WHEN UPPER({col}) ~ 'INFORMATIONAL' THEN 'INFORMATIONAL'
      WHEN UPPER({col}) ~ 'EXPERIMENTAL' THEN 'EXPERIMENTAL'
      WHEN UPPER({col}) ~ 'BEST CURRENT|BCP' THEN 'BEST CURRENT PRACTICE'
      WHEN UPPER({col}) ~ 'HISTORIC' THEN 'HISTORIC'
      ELSE 'OUTROS'
    END
    """

def in_clause(param_prefix, csv_value, params, column_expr):
    """
    Monta '<column_expr> IN (:p0, :p1, ...)' com bind parameters
    individuais (nunca concatena valor no texto do SQL).
    csv_value: 'STANDARDS TRACK||INFORMATIONAL' ou None/''.
    Retorna None quando não há filtro a aplicar (== Todos / nada selecionado).

    FIX UPPER: banco agora é todo uppercase, então compara os dois lados
    em UPPER pra não depender de case do frontend.
    """
    if not csv_value:
        return None
    valores = dividir_valores(csv_value)
    if not valores:
        return None
    placeholders = []
    for i, v in enumerate(valores):
        key = f"{param_prefix}{i}"
        params[key] = v
        placeholders.append(f"UPPER(:{key})")
    return f"UPPER({column_expr}) IN ({', '.join(placeholders)})"

def in_clause_pais(param_prefix, csv_value, params, column_expr):
    """
    Como in_clause, mas pra colunas de país que podem guardar um formato
    diferente do valor escolhido no filtro do sidebar. Ex: o sidebar manda
    'BR' (vem de attendee.country), mas draft_participacao.pais guarda
    'Brazil' (nome escrito por extenso pelo autor do draft). Expande cada
    valor escolhido pra todas as variantes conhecidas (sigla + nome, via
    pais_variantes de _paises.py) antes de montar o IN (...), comparando
    tudo em maiúsculo pra não depender de capitalização.
    """
    if not csv_value:
        return None
    valores_selecionados = dividir_valores(csv_value)
    if not valores_selecionados:
        return None

    todas_variantes = set()
    for v in valores_selecionados:
        # Ignora strings muito curtas ou vazias (lixo do banco)
        if len(v) > 1:
            todas_variantes |= pais_variantes(v)

    if not todas_variantes:
        return None

    placeholders = []
    for i, v in enumerate(sorted(todas_variantes)):
        key = f"{param_prefix}{i}"
        params[key] = v
        placeholders.append(f"UPPER(:{key})")
    return f"UPPER({column_expr}) IN ({', '.join(placeholders)})"

def rfc_pais_clause(csv_value, params, param_prefix="rpais"):
    """
    RFC não guarda país por autor, e as duas pontes óbvias (autor_id
    compartilhado com attendee ou com draft) não funcionam de verdade
    aqui: testamos direto no banco e as duas davam zero — o nome do
    autor no lado RFC (ex: 'F. Neves') não bate exatamente com o nome
    no lado draft/attendee ('Frederico Neves'), então nunca fundem no
    mesmo autor_id.

    O único dado de país que fica gravado DIRETO na própria RFC (via
    autor_email/email, populado na cópia da RFC, sem depender de
    fundir com outra tabela) é o e-mail do autor. Usamos o sufixo do
    domínio (ccTLD) como proxy de país: '.br' para Brasil, '.jp' para
    Japão, etc.

    LIMITAÇÃO (cobertura baixa e enviesada): só pega autor cujo e-mail
    termina no ccTLD do país dele — comum em países que usam o próprio
    domínio no dia a dia (.br, .jp, .de), bem mais raro nos EUA (maioria
    usa .com/.edu/.gov). Pra Brasil, testamos e deu 3 RFCs — abaixo do
    que sua consulta manual (e-mail + DDI + organização + nomes) achava,
    porque aqui só temos o e-mail à disposição. Dá pra combinar mais
    sinais depois se precisar de mais cobertura.
    """
    if not csv_value:
        return None
    valores = dividir_valores(csv_value)
    if not valores:
        return None

    condicoes = []
    for i, v in enumerate(valores):
        dominio = dominio_pais(v)
        if not dominio:
            continue
        key = f"{param_prefix}{i}"
        params[key] = f"%.{dominio}"
        condicoes.append(f"e.email ILIKE :{key}")

    if not condicoes:
        return None

    return f"""r.id IN (
        SELECT DISTINCT ra2.rfc_id
        FROM rfc_autor ra2
        JOIN autor_email ae ON ae.autor_id = ra2.autor_id
        JOIN email e ON e.id = ae.email_id
        WHERE {" OR ".join(condicoes)}
    )"""