import sys
import uvicorn

port = int(sys.argv[1])

uvicorn.run(
    "app.main:app",
    host="127.0.0.1",
    port=port,
    reload=False
)