import http.server
import json
import os
import sys

PORT = 3000
DB_FILE = 'database.json'

class TruckLogHandler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/api/save':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                # ตรวจสอบว่าเป็น JSON ที่ถูกต้องก่อนเซฟ
                data = json.loads(post_data.decode('utf-8'))
                with open(DB_FILE, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=4, ensure_ascii=False)
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "success"}).encode())
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(str(e).encode())
                
    def do_GET(self):
        if self.path == '/api/load':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            if os.path.exists(DB_FILE):
                with open(DB_FILE, 'rb') as f:
                    self.wfile.write(f.read())
            else:
                # ถ้ายังไม่มีไฟล์ ให้ส่งค่าเริ่มต้นกลับไป
                initial_data = {
                    "settings": {},
                    "trips": [],
                    "ledger": [],
                    "trucks": [],
                    "drivers": [],
                    "fines": [],
                    "fuelLog": []
                }
                self.wfile.write(json.dumps(initial_data).encode())
        else:
            # สำหรับไฟล์ปกติ (html, css, js)
            return super().do_GET()

if __name__ == '__main__':
    print(f"--- TruckLog Pro Server ---")
    print(f"Running at http://localhost:{PORT}")
    print(f"Data will be saved to: {os.path.abspath(DB_FILE)}")
    print(f"Press Ctrl+C to stop.")
    
    server = http.server.HTTPServer(('', PORT), TruckLogHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        sys.exit(0)
