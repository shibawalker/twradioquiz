"""Serve the exact public tree at both / and /radioquiz/ for Pages regression tests."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlsplit
class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory='public', **kwargs)
    def translate_path(self, path):
        if urlsplit(path).path.startswith('/radioquiz/'):
            path=path[len('/radioquiz'):]
        return super().translate_path(path)
ThreadingHTTPServer(('127.0.0.1',5181),Handler).serve_forever()
