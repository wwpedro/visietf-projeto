SIGLA_PARA_NOME = {
    "US": "United States", "GB": "United Kingdom", "UK": "United Kingdom",
    "DE": "Germany", "FR": "France", "JP": "Japan", "CN": "China",
    "BR": "Brazil", "IN": "India", "CA": "Canada", "AU": "Australia",
    "NL": "Netherlands", "SE": "Sweden", "FI": "Finland", "NO": "Norway",
    "DK": "Denmark", "IT": "Italy", "ES": "Spain", "CH": "Switzerland",
    "KR": "South Korea", "RU": "Russia", "IE": "Ireland", "BE": "Belgium",
    "AT": "Austria", "PL": "Poland", "CZ": "Czech Republic", "IL": "Israel",
    "ZA": "South Africa", "MX": "Mexico", "AR": "Argentina", "PT": "Portugal",
    "GR": "Greece", "HU": "Hungary", "RO": "Romania", "TR": "Turkey",
    "SG": "Singapore", "TW": "Taiwan", "HK": "Hong Kong", "TH": "Thailand",
    "MY": "Malaysia", "ID": "Indonesia", "VN": "Vietnam", "PH": "Philippines",
    "NZ": "New Zealand", "NG": "Nigeria", "EG": "Egypt", "SA": "Saudi Arabia",
    "AE": "United Arab Emirates", "PK": "Pakistan", "BD": "Bangladesh",
}


def pais_variantes(valor: str) -> set:
    """Dado 'BR' ou 'Brazil', devolve {'BR', 'Brazil'} — todas as grafias
    equivalentes conhecidas, pra casar os dois formatos do banco."""
    v = (valor or "").strip()
    if not v:
        return set()
    variantes = {v}
    upper = v.upper()
    if upper in SIGLA_PARA_NOME:
        variantes.add(SIGLA_PARA_NOME[upper])
    nome_lower = v.lower()
    for sigla, nome in SIGLA_PARA_NOME.items():
        if nome.lower() == nome_lower:
            variantes.add(sigla)
    return variantes


# Exceções onde a sigla ISO-2 do país NÃO é o mesmo sufixo usado no
# domínio de e-mail (ccTLD). Todo país que não está aqui usa a própria
# sigla em minúsculo como domínio (ex: 'BR' -> '.br', 'JP' -> '.jp').
SIGLA_PARA_DOMINIO_PAIS = {
    "GB": "uk", "UK": "uk",
}


def dominio_pais(valor: str) -> str:
    """Dado 'BR', 'Brazil' ou 'br', devolve o sufixo de domínio de e-mail
    esperado pra esse país (ex: 'br'). Aceita sigla ou nome por extenso."""
    v = (valor or "").strip().upper()
    if not v:
        return ""
    if v in SIGLA_PARA_DOMINIO_PAIS:
        return SIGLA_PARA_DOMINIO_PAIS[v]
    if v in SIGLA_PARA_NOME:
        return v.lower()
    # pode ter vindo o nome por extenso ('Brazil') em vez da sigla —
    # acha a sigla correspondente antes de decidir o domínio
    for sigla, nome in SIGLA_PARA_NOME.items():
        if nome.upper() == v:
            return SIGLA_PARA_DOMINIO_PAIS.get(sigla, sigla.lower())
    return v.lower()