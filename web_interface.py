#!/usr/bin/env python3

from flask import Flask, render_template_string, request, jsonify
from flask_cors import CORS
import requests
import json

# Create Flask app
app = Flask(__name__)
CORS(app)

# HTML template for the web interface
HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IPO Tracker - Data Refresh</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: #333;
        }
        .container {
            background: white;
            border-radius: 15px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        h1 {
            text-align: center;
            color: #2c3e50;
            margin-bottom: 30px;
        }
        .status {
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
            font-weight: bold;
        }
        .status.success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .status.error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        .status.info {
            background: #d1ecf1;
            color: #0c5460;
            border: 1px solid #bee5eb;
        }
        .button {
            background: linear-gradient(45deg, #667eea, #764ba2);
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
            margin: 10px;
            transition: transform 0.2s;
        }
        .button:hover {
            transform: translateY(-2px);
        }
        .button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }
        .button-container {
            text-align: center;
            margin: 30px 0;
        }
        .api-status {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
        }
        .loading {
            display: none;
            text-align: center;
            margin: 20px 0;
        }
        .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #667eea;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 IPO Tracker - Data Refresh</h1>
        
        <div class="api-status">
            <h3>📡 API Server Status</h3>
            <div id="api-status">Checking...</div>
        </div>
        
        <div class="button-container">
            <button class="button" onclick="refreshData()">🔄 Refresh Data</button>
            <button class="button" onclick="forceRefreshData()">⚡ Force Refresh</button>
        </div>
        
        <div class="loading" id="loading">
            <div class="spinner"></div>
            <p>Processing request...</p>
        </div>
        
        <div id="result"></div>
    </div>

    <script>
        const API_BASE = 'http://localhost:3001';
        
        // Check API server status on page load
        window.onload = function() {
            checkApiStatus();
        };
        
        async function checkApiStatus() {
            try {
                const response = await fetch(`${API_BASE}/health`);
                const data = await response.json();
                document.getElementById('api-status').innerHTML = 
                    `<span style="color: green;">✅ ${data.message}</span>`;
            } catch (error) {
                document.getElementById('api-status').innerHTML = 
                    `<span style="color: red;">❌ API Server not responding</span>`;
            }
        }
        
        async function refreshData() {
            showLoading(true);
            clearResult();
            
            try {
                const response = await fetch(`${API_BASE}/api/refresh-investorgain`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                const result = await response.json();
                showResult(result, 'success');
                
            } catch (error) {
                showResult({
                    success: false,
                    error: `Failed to refresh data: ${error.message}`
                }, 'error');
            } finally {
                showLoading(false);
            }
        }
        
        async function forceRefreshData() {
            showLoading(true);
            clearResult();
            
            try {
                const response = await fetch(`${API_BASE}/api/force-refresh-investorgain`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                const result = await response.json();
                showResult(result, 'success');
                
            } catch (error) {
                showResult({
                    success: false,
                    error: `Failed to force refresh data: ${error.message}`
                }, 'error');
            } finally {
                showLoading(false);
            }
        }
        
        function showLoading(show) {
            document.getElementById('loading').style.display = show ? 'block' : 'none';
        }
        
        function clearResult() {
            document.getElementById('result').innerHTML = '';
        }
        
        function showResult(result, type) {
            const resultDiv = document.getElementById('result');
            let html = '';
            
            if (result.success) {
                html = `
                    <div class="status success">
                        <h3>✅ Success!</h3>
                        <p><strong>Message:</strong> ${result.message}</p>
                        <p><strong>IPOs Updated:</strong> ${result.count}</p>
                    </div>
                `;
            } else {
                html = `
                    <div class="status error">
                        <h3>❌ Error</h3>
                        <p><strong>Message:</strong> ${result.error || result.message}</p>
                    </div>
                `;
            }
            
            resultDiv.innerHTML = html;
        }
    </script>
</body>
</html>
"""

@app.route('/')
def index():
    """Serve the web interface"""
    return render_template_string(HTML_TEMPLATE)

@app.route('/api/status')
def api_status():
    """Check API server status"""
    try:
        response = requests.get('http://localhost:3001/health', timeout=5)
        return jsonify({
            'api_server_running': True,
            'status': response.json()
        })
    except:
        return jsonify({
            'api_server_running': False,
            'status': 'API server not responding'
        })

if __name__ == '__main__':
    print("🌐 Starting IPO Tracker Web Interface...")
    print("📱 Web interface: http://localhost:8082")
    print("🔗 API server: http://localhost:3001")
    print("✅ Both servers need to be running for full functionality")
    
    app.run(host='0.0.0.0', port=8082, debug=True)
