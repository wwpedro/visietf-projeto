from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import rfcs, meetings, drafts, organizacoes, network, consulta

app = FastAPI(title="VIsIETF API")

# Permite o React (localhost:5173) chamar o backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(rfcs.router,           prefix="/rfcs",           tags=["RFCs"])
app.include_router(meetings.router,       prefix="/meetings",       tags=["Meetings"])
app.include_router(drafts.router,         prefix="/drafts",         tags=["Drafts"])
app.include_router(organizacoes.router,   prefix="/organizacoes",   tags=["Organizações"])
app.include_router(network.router,        prefix="/network",        tags=["Rede"])
app.include_router(consulta.router,       prefix="/consulta",       tags=["Consulta"])


@app.get("/")
def root():
    return {"status": "VIsIETF API online"}