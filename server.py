#!/usr/bin/env python3
"""
ShuttleAI - Badminton Assistant Server
A simple, lightweight server for serving the web app and streaming responses from Groq API.
"""

import http.server
import socketserver
import json
import os
import ssl
import urllib.request
import urllib.error
from urllib.parse import urlparse

PORT = int(os.environ.get("PORT", 8000))
BASE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public")
ENV_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")

# Create SSL context suitable for macOS Python installations
try:
    ssl_context = ssl._create_unverified_context()
except AttributeError:
    ssl_context = ssl.create_default_context()

def get_groq_api_key():
    # Read dynamically from .env so user edits take effect immediately
    if os.path.exists(ENV_FILE):
        with open(ENV_FILE, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    if k.strip() == "GROQ_API_KEY":
                        val = v.strip().strip('"').strip("'")
                        if val:
                            return val
    return os.environ.get("GROQ_API_KEY", "").strip()

class ShuttleAIHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/status":
            api_key = get_groq_api_key()
            data = {
                "configured": bool(api_key),
                "model": "openai/gpt-oss-120b"
            }
            body = json.dumps(data).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(body)
            return

        super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/chat":
            content_length = int(self.headers.get("Content-Length", 0))
            req_body = self.rfile.read(content_length)
            try:
                payload = json.loads(req_body.decode("utf-8"))
            except Exception as e:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(json.dumps({"error": f"Invalid JSON: {str(e)}"}).encode())
                return

            api_key = get_groq_api_key()
            if not api_key:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({
                    "error": "Groq API Key not found. Please set GROQ_API_KEY in the .env file."
                }).encode("utf-8"))
                return

            groq_payload = {
                "model": "qwen/qwen3.8-27b",
                "messages": payload.get("messages", []),
                "temperature": 0.7,
                "stream": True
            }

            groq_req = urllib.request.Request(
                "https://api.groq.com/openai/v1/chat/completions",
                data=json.dumps(groq_payload).encode("utf-8"),
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)"
                }
            )

            try:
                with urllib.request.urlopen(groq_req, context=ssl_context, timeout=60) as resp:
                    self.send_response(resp.status)
                    self.send_header("Content-Type", "text/event-stream")
                    self.send_header("Cache-Control", "no-cache")
                    self.send_header("Connection", "keep-alive")
                    self.send_header("Access-Control-Allow-Origin", "*")
                    self.end_headers()

                    while True:
                        chunk = resp.read(1024)
                        if not chunk:
                            break
                        self.wfile.write(chunk)
                        self.wfile.flush()
            except (BrokenPipeError, ConnectionResetError):
                # Client closed connection / tab
                return
            except urllib.error.HTTPError as e:
                err_content = e.read().decode("utf-8", errors="ignore")
                self.send_response(e.code)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(err_content.encode("utf-8"))
            except Exception as e:
                try:
                    self.send_response(500)
                    self.send_header("Content-Type", "application/json")
                    self.send_header("Access-Control-Allow-Origin", "*")
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
                except Exception:
                    pass
            return

        self.send_response(404)
        self.end_headers()

def run():
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), ShuttleAIHandler) as httpd:
        print(f"🏸 ShuttleAI Server running at http://localhost:{PORT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server...")

if __name__ == "__main__":
    run()
