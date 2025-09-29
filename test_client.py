import requests

data = {"prompt": "Hello LLaMA 3, how are you?"}
resp = requests.post("http://127.0.0.1:8000/ask", json=data)
print(resp.json())
