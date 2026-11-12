"""
routers/_autores.py
Helper de validação de nomes de autores.
Filtra lixo (países, empresas, frases, termos técnicos) que veio da raspagem original.

Uso:
    from routers._autores import nome_valido
    
    if nome_valido("Abhay Roy"):
        # nome válido
    
    if not nome_valido("South Korea"):
        # nome inválido
"""

import re

# ============================================================
# 1. BLACKLIST EXATA
# Nomes/strings que sempre devem ser rejeitados (já normalizados em lowercase)
# ============================================================
_BLACKLIST_EXATA = {
    # --- Países ---
    "south korea", "korea", "usa", "united states", "united states of america",
    "united kingdom", "the netherlands", "australia usa", "czech republic",
    "russian federation", "new zealand", "republic of korea",
    
    # --- Empresas ---
    "disney", "spotify ab", "aaa-sec ab", "telecom italia", "telecom paris",
    "telecom paristech", "telecom paristech", "nexus technology",
    "ip infusion", "full frontal nerdity industries",
    "bolt beranek and newman laboratories", "actalis s.p.a.",
    
    # --- Organizações ---
    "national bureau of standards", "national ict australia",
    "national research council", "national science foundation",
    "iab advisory committee", "iab and iesg", "iesg", "ietf secretariat",
    "smf design team", "global standards and strategy team",
    "mobile development team", "the ect forum",
    
    # --- Cabeçalhos ---
    "normative references", "textual convention", "method template",
    "editors' notes",
    
    # --- Termos técnicos ---
    "standard time", "state refresh capable", "bearer capability",
    "bi-directional lsp", "ipsec extended community.",
    "ip forwarding table mib", "ism internet standard multicast",
    "dscp name buffer", "dsp domain specific part", "dst next-hop",
    "ce customer-edge device", "ac attachment circuit", "coo rtp ie fixed",
    "icw internet call waiting", "uid variable universal identifier",
    "ipsec over the mpls infrastructure.", "if-mib and ospf-mib mibs.",
    "discovery of gmpls signalling capability",
    
    # --- Frases (lixo de scraping) ---
    "unknown tlv bit.", "ucesopsn may be disabled.", "ucesopsn pws.",
    "this implies that utc timestamps", "the parameters may be null.",
    "the lsp is torn down.", "if sstr is empty then",
    "if bob is an engineer...", "not currently rendered to html.",
    "updated following mib doctor review.",
    "extraneous whitespace removed from bnf", "changed to result codes.",
    "changes from previous drafts", "changes from previous versions",
    "annex a - implementation considerations", "a. example entries",
    "a. example exchange.", "a device that implements ip.",
    "constraint specification.", "continuity test using new tone.",
    "digital twin are specified in", "mobile ip handoff in advance.",
    "model and ldap operation behaviour.",
    "method body part identifi recommendation",
    "added required ipr boilerplate", "from if-mib",
    "from upperbounds upperbounds", "desc 'a jpeg image'",
    "desc 'slp scope'",
    
    # --- Palavras-chave técnicas ---
    "with syntax caseignorestring", "with syntax encryptedprivatekeyinfo",
    "with syntax set of attribute", "with syntax signerinfo",
    
    # --- Endereços ---
    "zone des champs blancs", "singapore science park ii",
    "exora business park", "australian technology park",
    "new century park", "northern ireland science park",
}

# ============================================================
# 2. PREFIXOS PROIBIDOS
# Se o nome começar com qualquer um desses, é lixo.
# ============================================================
_PREFIXOS_PROIBIDOS = (
    "syntax",
    "rtt",
    "route",
    "one configuration",
    "ipr",
    "district",
)

# ============================================================
# 3. PADRÕES REGEX
# ============================================================

# Símbolos técnicos (números e caracteres que nunca aparecem em nomes)
_SYMBOL_PATTERN = re.compile(r'[0-9@#$%&*+=<>/\\|{}\[\]()"]')

# Só iniciais (ex: "A B C", "A. B. C.")
_INITIALS_PATTERN = re.compile(r'^([A-Z]\.?\s*)+$')

# Palavras técnicas que, se aparecerem isoladas, indicam lixo
# FIX: era \y (word boundary do PostgreSQL) — inválido no re do Python.
# Em Python (re) o word boundary é \b. Quebrava na importação no 3.12+.
_TECH_PATTERN = re.compile(
    r'\b('
    r'ALTERNATIVE|APPROVAL|PROCESS|ROUTING|ALARM|FLAG|ENTITY|ACCEPTOR|'
    r'PROTOCOL|SESSION|HEADER|TABLES|CONTACT INFORMATION|AUDIO PACKAGE|'
    r'CEO MOBIVATION|NORMATIVE REFERENCES|STANDARD TIME|BEARER CAPABILITY|'
    r'DSCP NAME BUFFER|DST NEXT-HOP|ISM INTERNET|UNKNOWN TLV|UCESOPSN|'
    r'EDITORS|FROM IF-MIB|FROM UPPERBOUNDS|DESC|WITH SYNTAX'
    r')\b'
)


def nome_valido(nome: str) -> bool:
    """
    Retorna True se o nome parece ser de uma pessoa real, False se for lixo.
    
    Regras aplicadas (na ordem, do mais rápido ao mais lento):
    1. Nome não pode ser nulo/vazio
    2. Tamanho entre 3 e 50 caracteres
    3. Não pode conter símbolos/números
    4. Não pode ter mais de 5 palavras
    5. Não pode ser só iniciais (A B C)
    6. Não pode conter palavras técnicas
    7. Não pode estar na blacklist exata
    8. Não pode começar com prefixo proibido
    """
    if not nome or not isinstance(nome, str):
        return False

    n = nome.strip()
    if not n:
        return False

    # 1. Tamanho
    if len(n) < 3 or len(n) > 50:
        return False

    # 2. Símbolos técnicos
    if _SYMBOL_PATTERN.search(n):
        return False

    # 3. Mais de 5 palavras = frase, não nome
    if len(n.split()) > 5:
        return False

    # 4. Só iniciais
    if _INITIALS_PATTERN.match(n):
        return False

    n_upper = n.upper()

    # 5. Palavras técnicas no meio
    if _TECH_PATTERN.search(n_upper):
        return False

    # 6. Blacklist exata (comparação em lowercase)
    if n.lower() in _BLACKLIST_EXATA:
        return False

    # 7. Prefixo proibido (comparação em lowercase)
    n_lower = n.lower()
    for prefixo in _PREFIXOS_PROIBIDOS:
        if n_lower.startswith(prefixo):
            return False

    return True