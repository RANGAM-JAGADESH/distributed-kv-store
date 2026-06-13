import sys
import os
import uvicorn

node_id = sys.argv[1]
port = int(sys.argv[2])

os.environ["NODE_ID"] = node_id

uvicorn.run(
    "app.main:app",
    host="127.0.0.1",
    port=port,
    reload=False
)

print(f"Node ID: {node_id}")
print(f"Port: {port}")