import re

# ============================================================
# 1. BLACKLIST EXATA (comparação em lowercase)
# ============================================================
_BLACKLIST_EXATA = {
    "none", "null", "unknown", "n/a", "na", "n.a.",
    "the same", "the same as", "as described", "according to",
    "ip", "mpls", "sip", "http", "tcp", "udp", "ipv4", "ipv6",
    "not available", "not applicable", "not specified",
    "undefined", "unspecified", "invalid", "anonymous", "private",
}

# ============================================================
# 2. WHITELIST DE MARCAS CONHECIDAS (lowcase)
#    Cobrem o que na base não tem sufixo (Cisco, Huawei, etc.)
# ============================================================
_WHITELIST_MARCAS = {
    # Grandes empresas
    "cisco", "cisco systems", "huawei", "ericsson", "nokia",
    "alcatel", "alcatel-lucent", "google", "microsoft", "apple",
    "amazon", "facebook", "meta", "twitter", "ibm", "intel",
    "samsung", "lg", "zte", "fujitsu", "nec", "hitachi", "toshiba",
    "panasonic", "sony", "motorola", "qualcomm", "broadcom",
    "juniper", "arista", "ciena", "infinera", "adva", "dell",
    "hp", "hpe", "vmware", "oracle", "cloudflare", "akamai",
    "fastly", "verisign", "godaddy", "comcast", "verizon",
    "at&t", "at&t labs", "at&t bell labs", "bell labs",
    "at&t bell laboratories", "bt", "vodafone", "orange",
    "telefonica", "ntt", "ntt docomo", "kddi", "docomo", "softbank",
    "yandex", "nortel", "nortel networks", "lucent",
    "lucent technologies", "avaya", "polycom", "sonus",
    "redback", "foundry", "force10", "extreme", "f5", "riverbed",
    "siemens", "bosch", "philips", "thomson", "3com", "3m",
    "3ware", "3gpp", "3gpp2", "2wire",
    # Standards bodies
    "ietf", "ieee", "icann", "iana", "w3c", "isoc", "itu",
    "etsi", "gsma", "nist", "ansi", "iso", "arin",
    "ripe", "apnic", "lacnic", "afrinic", "ripe ncc",
    # Universidades / pesquisa
    "mit", "stanford", "harvard", "oxford", "cambridge",
    "princeton", "yale", "columbia", "berkeley", "ucla", "usc",
    "cmu", "cern", "nasa", "sri international", "bbn technologies",
    "raytheon", "boeing", "lockheed martin", "northrop grumman",
    "mitre", "rand", "usenix", "acm", "ibm research",
    "microsoft research", "google research",
    "phone.com", "excite@home", "@home", "@home network",
}

# ============================================================
# 3. MARCADORES DE QUE É UMA ORGANIZAÇÃO
#    Basta 1 pra aceitar (desde que não caia nos filtros abaixo)
# ============================================================
_MARCADORES_ORG = re.compile(
    r"\b("
    r"Inc|Corp|Corporation|Ltd|Limited|LLC|LLP|"
    r"GmbH|AG|SA|SAS|SARL|BV|NV|Oy|OyJ|AB|PLC|Pty|Pte|"
    r"K\.?K\.?|S\.?p\.?A|S\.?A\.?|"
    r"University|Universidade|Universitat|Universite|"
    r"Institute|Institut|Foundation|Fundacao|"
    r"Association|Associacao|Consortium|College|School|"
    r"Department|Ministry|Agency|Authority|Commission|"
    r"Center|Centre|Laboratories|Laboratory|Labs?|"
    r"Systems?|Networks?|Technologies|Communications?|"
    r"Telecommunications?|Solutions?|Services?|Software|Telecom|"
    r"Mobile|Bank|Company|Holdings?|Enterprises?|Ventures?|"
    r"Partners?|Consulting|Society|Organization|Organisation|"
    r"Group|Grupo|"
    r"d/b/a"
    r")\b",
    re.IGNORECASE,
)

# ============================================================
# 4. SÍMBOLOS / SEQUÊNCIAS QUE NUNCA APARECEM EM NOME REAL
# FIX UPPER: banco agora é todo uppercase. Adicionado re.IGNORECASE
# pra continuar pegando https://, www., ftp://, #include, #define,
# BEGIN PRIVATE KEY e <tag> em strings que chegam em MAIÚSCULO.
# ============================================================
_SIMBOLOS_LIXO = re.compile(
    r"::=|"                      # ASN.1
    r"->|<-|=>|<=|\.\.\.|"        # setas, reticências
    r"\[\s*\w+\s*\]|"            # [1], [API]
    r"\{\s*\w+\s*\}|"            # { mib-2 }
    r"^\s*[-=]{2,}|"             # -- comment, ====
    r"\s[-=]{3,}\s|"             # miolo " --- "
    r"^\s*[#*;/%&`^~]|"          # # * ; / % & ` ^ ~ no começo
    r"^\s*\.\w|"                 # .LESS, .berlin
    r"^\s*\d{1,2}:\d{2}|"        # 04:00 (horário)
    r"[\w.]+@[\w.]+|"            # email
    r"https?://|www\.|ftp://|"    # URL
    r"^#include|^#define|"       # código C
    r"BEGIN\s+(PRIVATE|PUBLIC)\s+KEY|"
    r"<[A-Za-z:/]|"              # <tag>, <?xml
    r"^\d{6,}",                  # 1044566229... (timestamps)
    re.IGNORECASE,               # ← ADICIONADO
)

# ============================================================
# 5. FRASES TÉCNICAS / DESCrições
# ============================================================
_FRASES_TECNICAS = re.compile(
    r"(?i)\b("
    r"MUST|SHOULD|MAY|REQUIRED|OPTIONAL|"
    r"the same|such as|in order to|for example|according to|"
    r"if the|when the|when a|if a|if an|"
    r"this is|this should|this may|these are|"
    r"OBJECT-TYPE|NOTIFICATION-TYPE|TEXTUAL-CONVENTION|"
    r"MODULE-IDENTITY|OCTET\s+STRING|SEQUENCE\s+OF|"
    r"AVP|TLV|PDU|OID|MIB|"
    r"WARRANTY|LIABILITY|COPYRIGHT|INCLUDING|LIMITATION"
    r")\b"
)

# ============================================================
# 6. ENDEREÇO DE RUA
# ============================================================
_ENDERECO_PATTERN = re.compile(
    r"(?i)\b("
    r"\d{2,}\s+(N|S|E|W|North|South|East|West)\b|"
    r"\b(Road|Street|Avenue|Ave|Boulevard|Blvd|Lane|"
    r"Suite|Floor|Bldg|Building)\s+\d|"
    r"\bP\.?\s*O\.?\s*Box\b|"
    r"\bBox\s+\d{3,}\b|"
    r"\b\d{4,5}\s+[A-Z][a-z]+"   # 2480 Sand, 12345 Main
    r")"
)

# ============================================================
# 7. PREFIXOS QUE INDICAM DESCRIÇÃO, NÃO NOME PRÓPRIO
# ============================================================
_PREFIXOS_FRASE = re.compile(
    r"(?i)^("
    r"Description|Note\b|Note:|Figure|Table|Section\b|Chapter|"
    r"If\b|When\b|While\b|After\b|Before\b|During\b|"
    r"The\b|This\b|These\b|That\b|Those\b|It\b|According\b|"
    r"Usually\b|Typically\b|Generally\b|Normally\b|Currently\b|"
    r"However\b|Therefore\b|Thus\b|Hence\b|Also\b|Additionally\b|"
    r"For\b|From\b|With\b|Without\b|Within\b|"
    r"Each\b|Every\b|All\b|Some\b|Any\b|Many\b|Most\b|"
    r"A\b|An\b|One\b|Two\b|Three\b|Both\b|"
    r"Content-|Message-|MIME-|HTTP|FTP-|TCP-|UDP-|"
    r"Phone:|Fax:|Mobile:|Tel:|"
    r"Address:|E-mail:|Email:"
    r")"
)


def organizacao_valida(nome: str) -> bool:
    """True se parece ser uma organização real. False se é lixo."""
    if not nome or not isinstance(nome, str):
        return False

    n = nome.strip()
    if not n or len(n) < 2 or len(n) > 80:
        return False

    # Mais de 8 palavras = frase, não nome
    if len(n.split()) > 8:
        return False

    if n.lower() in _BLACKLIST_EXATA:
        return False
    if n.lower() in _WHITELIST_MARCAS:
        return True

    if _SIMBOLOS_LIXO.search(n):
        return False
    if _FRASES_TECNICAS.search(n):
        return False
    if _ENDERECO_PATTERN.search(n):
        return False
    if _PREFIXOS_FRASE.match(n):
        return False

    if _MARCADORES_ORG.search(n):
        return True

    # Sobrou: 1-3 palavras, capitalizado, SEM marcador.
    # Pode ser empresa pequena (ACME Packet) ou pessoa (John Smith).
    # Sem contexto não dá pra saber — rejeitamos (whitelist cobre as grandes).
    return False