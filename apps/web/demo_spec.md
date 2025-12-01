<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SnapBack Interactive Demo</title>

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">

    <!-- Highlight.js for syntax highlighting -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/typescript.min.js"></script>

    <style>
        /* ============================================
           CSS Variables - SnapBack Design System
           ============================================ */
        :root {
            /* Brand Colors */
            --snapback-green: #10B981;
            --snapback-green-light: #34D399;
            --snapback-green-dark: #059669;
            --snapback-green-glow: rgba(16, 185, 129, 0.4);

            /* Accent Colors */
            --snapback-orange: #F97316;
            --snapback-orange-light: #FB923C;

            /* Semantic Colors */
            --status-success: #22C55E;
            --status-warning: #EAB308;
            --status-error: #EF4444;
            --status-info: #3B82F6;
            --status-ai: #A855F7;

            /* Neutral Palette */
            --bg-primary: #000000;
            --bg-secondary: #0A0A0A;
            --bg-tertiary: #111111;
            --bg-quaternary: #171717;
            --bg-code: #0D1117;

            --border-subtle: #1F1F1F;
            --border-default: #262626;
            --border-strong: #404040;

            --text-primary: #FAFAFA;
            --text-secondary: #A1A1AA;
            --text-tertiary: #71717A;
            --text-muted: #52525B;

            /* Animation */
            --ease-out: cubic-bezier(0, 0, 0.2, 1);
            --ease-in: cubic-bezier(0.4, 0, 1, 1);
            --ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
            --ease-snap: cubic-bezier(0.68, -0.55, 0.265, 1.55);

            /* Shadows */
            --shadow-lg: 0 10px 40px rgba(0, 0, 0, 0.5);
            --shadow-glow-green: 0 0 30px rgba(16, 185, 129, 0.3);
            --shadow-glow-orange: 0 0 20px rgba(249, 115, 22, 0.3);
        }

        /* ============================================
           Base Styles
           ============================================ */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px 20px;
        }

        /* ============================================
           Container
           ============================================ */
        .demo-container {
            width: 100%;
            max-width: 900px;
        }

        /* ============================================
           Window Chrome
           ============================================ */
        .window {
            background: var(--bg-tertiary);
            border: 1px solid var(--border-default);
            border-radius: 12px;
            overflow: hidden;
            box-shadow: var(--shadow-lg);
            transition: border-color 0.3s ease, box-shadow 0.3s ease;
        }

        .window.state-ai {
            border-color: var(--status-ai);
            box-shadow: 0 0 30px rgba(168, 85, 247, 0.2);
        }

        .window.state-error {
            border-color: var(--status-error);
            box-shadow: 0 0 30px rgba(239, 68, 68, 0.2);
            animation: shake 0.4s ease-in-out;
        }

        .window.state-restored {
            border-color: var(--snapback-green);
            box-shadow: var(--shadow-glow-green);
        }

        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            20% { transform: translateX(-4px); }
            40% { transform: translateX(4px); }
            60% { transform: translateX(-4px); }
            80% { transform: translateX(4px); }
        }

        /* Title Bar */
        .title-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            background: var(--bg-quaternary);
            border-bottom: 1px solid var(--border-subtle);
        }

        .traffic-lights {
            display: flex;
            gap: 8px;
        }

        .traffic-light {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            transition: transform 0.2s ease;
        }

        .traffic-light:hover {
            transform: scale(1.1);
        }

        .traffic-light.red { background: #FF5F56; }
        .traffic-light.yellow { background: #FFBD2E; }
        .traffic-light.green { background: #27CA40; }

        .title-bar-text {
            font-size: 13px;
            font-weight: 500;
            color: var(--text-secondary);
            font-family: 'JetBrains Mono', monospace;
        }

        .title-bar-file {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .file-status {
            font-size: 11px;
            padding: 2px 8px;
            border-radius: 4px;
            font-weight: 500;
        }

        .file-status.modified {
            background: rgba(234, 179, 8, 0.2);
            color: var(--status-warning);
        }

        .file-status.error {
            background: rgba(239, 68, 68, 0.2);
            color: var(--status-error);
        }

        .file-status.saved {
            background: rgba(34, 197, 94, 0.2);
            color: var(--status-success);
        }

        /* ============================================
           Main Content Layout
           ============================================ */
        .content {
            display: grid;
            grid-template-columns: 1fr 280px;
            min-height: 400px;
        }

        @media (max-width: 768px) {
            .content {
                grid-template-columns: 1fr;
            }
        }

        /* ============================================
           Code Editor Panel
           ============================================ */
        .editor-panel {
            position: relative;
            background: var(--bg-code);
            border-right: 1px solid var(--border-subtle);
            overflow: hidden;
        }

        .editor-content {
            padding: 20px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 14px;
            line-height: 1.6;
            overflow: auto;
            height: 100%;
        }

        .editor-content pre {
            margin: 0;
            background: transparent !important;
            padding: 0 !important;
        }

        .editor-content code {
            font-family: 'JetBrains Mono', monospace !important;
            font-size: 14px !important;
            background: transparent !important;
        }

        /* Line numbers */
        .line-numbers {
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 40px;
            background: var(--bg-tertiary);
            border-right: 1px solid var(--border-subtle);
            padding: 20px 8px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 13px;
            color: var(--text-muted);
            text-align: right;
            line-height: 1.6;
            user-select: none;
        }

        .editor-content-wrapper {
            margin-left: 40px;
        }

        /* Cursor animation */
        .cursor {
            display: inline-block;
            width: 2px;
            height: 18px;
            background: var(--snapback-green);
            animation: blink 1s step-end infinite;
            vertical-align: text-bottom;
            margin-left: 2px;
        }

        .cursor.typing {
            animation: none;
            opacity: 1;
        }

        @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
        }

        /* AI typing indicator */
        .ai-typing-indicator {
            position: absolute;
            top: 12px;
            right: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 6px 12px;
            background: rgba(168, 85, 247, 0.15);
            border: 1px solid rgba(168, 85, 247, 0.3);
            border-radius: 6px;
            font-size: 12px;
            color: var(--status-ai);
            opacity: 0;
            transform: translateY(-10px);
            transition: all 0.3s ease;
        }

        .ai-typing-indicator.visible {
            opacity: 1;
            transform: translateY(0);
        }

        .ai-typing-indicator .dots {
            display: flex;
            gap: 3px;
        }

        .ai-typing-indicator .dot {
            width: 4px;
            height: 4px;
            background: var(--status-ai);
            border-radius: 50%;
            animation: typingDot 1.4s infinite;
        }

        .ai-typing-indicator .dot:nth-child(2) { animation-delay: 0.2s; }
        .ai-typing-indicator .dot:nth-child(3) { animation-delay: 0.4s; }

        @keyframes typingDot {
            0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
            30% { transform: translateY(-4px); opacity: 1; }
        }

        /* Error overlay */
        .error-overlay {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            padding: 12px 20px;
            background: rgba(239, 68, 68, 0.1);
            border-top: 1px solid rgba(239, 68, 68, 0.3);
            font-family: 'JetBrains Mono', monospace;
            font-size: 13px;
            color: var(--status-error);
            transform: translateY(100%);
            transition: transform 0.3s ease;
        }

        .error-overlay.visible {
            transform: translateY(0);
        }

        /* Restored badge */
        .restored-badge {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0);
            padding: 16px 32px;
            background: var(--snapback-green);
            border-radius: 12px;
            font-size: 18px;
            font-weight: 600;
            color: #000;
            opacity: 0;
            z-index: 10;
        }

        .restored-badge.visible {
            animation: snapBadge 0.8s var(--ease-snap) forwards;
        }

        @keyframes snapBadge {
            0% {
                transform: translate(-50%, -50%) scale(0);
                opacity: 0;
            }
            50% {
                transform: translate(-50%, -50%) scale(1.1);
                opacity: 1;
            }
            70% {
                transform: translate(-50%, -50%) scale(0.95);
            }
            100% {
                transform: translate(-50%, -50%) scale(1);
                opacity: 1;
            }
        }

        /* Flash effect on restore */
        .editor-panel.flash::after {
            content: '';
            position: absolute;
            inset: 0;
            background: var(--snapback-green);
            opacity: 0;
            animation: flashGreen 0.4s ease-out;
            pointer-events: none;
        }

        @keyframes flashGreen {
            0% { opacity: 0.3; }
            100% { opacity: 0; }
        }

        /* ============================================
           Timeline Panel
           ============================================ */
        .timeline-panel {
            background: var(--bg-secondary);
            display: flex;
            flex-direction: column;
        }

        .timeline-header {
            padding: 16px;
            font-size: 13px;
            font-weight: 600;
            color: var(--text-secondary);
            border-bottom: 1px solid var(--border-subtle);
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .timeline-header::before {
            content: '🕐';
        }

        .timeline-list {
            flex: 1;
            overflow-y: auto;
            padding: 8px;
        }

        /* Custom scrollbar */
        .timeline-list::-webkit-scrollbar {
            width: 6px;
        }

        .timeline-list::-webkit-scrollbar-track {
            background: transparent;
        }

        .timeline-list::-webkit-scrollbar-thumb {
            background: var(--border-default);
            border-radius: 3px;
        }

        .timeline-list::-webkit-scrollbar-thumb:hover {
            background: var(--border-strong);
        }

        /* Timeline Entry */
        .timeline-entry {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            padding: 12px;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s ease;
            position: relative;
        }

        .timeline-entry:hover {
            background: var(--bg-quaternary);
        }

        .timeline-entry.selected {
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .timeline-entry.new {
            animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateX(-20px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }

        /* Timeline dot */
        .timeline-dot {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            flex-shrink: 0;
            transition: transform 0.2s ease;
        }

        .timeline-entry:hover .timeline-dot {
            transform: scale(1.1);
        }

        .timeline-dot.manual {
            background: rgba(16, 185, 129, 0.2);
            color: var(--snapback-green);
        }

        .timeline-dot.auto {
            background: var(--bg-quaternary);
            color: var(--text-tertiary);
        }

        .timeline-dot.ai {
            background: rgba(168, 85, 247, 0.2);
            color: var(--status-ai);
        }

        .timeline-dot.error {
            background: rgba(239, 68, 68, 0.2);
            color: var(--status-error);
        }

        .timeline-dot.restored {
            background: rgba(16, 185, 129, 0.2);
            color: var(--snapback-green);
            animation: pulse 0.5s ease;
        }

        @keyframes pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
            50% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0.2); }
        }

        /* Timeline info */
        .timeline-info {
            flex: 1;
            min-width: 0;
        }

        .timeline-time {
            font-size: 11px;
            font-family: 'JetBrains Mono', monospace;
            color: var(--text-muted);
            margin-bottom: 2px;
        }

        .timeline-description {
            font-size: 13px;
            color: var(--text-secondary);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .timeline-entry.error .timeline-description {
            color: var(--status-error);
        }

        .timeline-entry.ai .timeline-description {
            color: var(--status-ai);
        }

        /* Restore button */
        .btn-restore {
            position: absolute;
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            padding: 4px 10px;
            font-size: 11px;
            font-weight: 500;
            background: var(--snapback-green);
            color: #000;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            opacity: 0;
            transition: all 0.2s ease;
        }

        .timeline-entry:hover .btn-restore {
            opacity: 1;
        }

        .btn-restore:hover {
            background: var(--snapback-green-light);
        }

        /* ============================================
           Status Bar
           ============================================ */
        .status-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 16px;
            background: var(--bg-quaternary);
            border-top: 1px solid var(--border-subtle);
        }

        .status-left {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .status-indicator {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            transition: background 0.3s ease, box-shadow 0.3s ease;
        }

        .status-indicator.idle {
            background: var(--snapback-green);
        }

        .status-indicator.ai {
            background: var(--status-ai);
            box-shadow: 0 0 8px var(--status-ai);
            animation: statusPulse 1s infinite;
        }

        .status-indicator.error {
            background: var(--status-error);
            box-shadow: 0 0 8px var(--status-error);
        }

        .status-indicator.success {
            background: var(--status-success);
            box-shadow: 0 0 8px var(--status-success);
        }

        @keyframes statusPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        .status-text {
            font-size: 12px;
            font-weight: 500;
            color: var(--text-secondary);
            transition: color 0.3s ease;
        }

        .status-text.ai { color: var(--status-ai); }
        .status-text.error { color: var(--status-error); }
        .status-text.success { color: var(--status-success); }

        /* Status bar button */
        .btn-snapshot {
            padding: 6px 14px;
            font-size: 12px;
            font-weight: 500;
            background: transparent;
            color: var(--text-secondary);
            border: 1px solid var(--border-default);
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .btn-snapshot:hover {
            background: var(--bg-tertiary);
            border-color: var(--border-strong);
            color: var(--text-primary);
        }

        /* ============================================
           Demo Controls
           ============================================ */
        .demo-controls {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-top: 16px;
            padding: 0 4px;
        }

        .btn-demo {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 20px;
            font-size: 14px;
            font-weight: 500;
            background: var(--bg-tertiary);
            color: var(--text-primary);
            border: 1px solid var(--border-default);
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .btn-demo:hover {
            background: var(--bg-quaternary);
            border-color: var(--border-strong);
        }

        .btn-demo.playing {
            background: rgba(16, 185, 129, 0.1);
            border-color: rgba(16, 185, 129, 0.3);
            color: var(--snapback-green);
        }

        .demo-hint {
            font-size: 12px;
            color: var(--text-muted);
        }

        /* ============================================
           Toast Notifications
           ============================================ */
        .toast-container {
            position: fixed;
            bottom: 24px;
            right: 24px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            z-index: 1000;
        }

        .toast {
            padding: 12px 16px;
            background: var(--bg-tertiary);
            border: 1px solid var(--border-default);
            border-radius: 8px;
            font-size: 13px;
            color: var(--text-primary);
            box-shadow: var(--shadow-lg);
            display: flex;
            align-items: center;
            gap: 10px;
            animation: toastIn 0.3s var(--ease-out);
        }

        .toast.exiting {
            animation: toastOut 0.2s var(--ease-in) forwards;
        }

        .toast.success {
            border-left: 3px solid var(--status-success);
        }

        .toast.warning {
            border-left: 3px solid var(--status-warning);
        }

        .toast.error {
            border-left: 3px solid var(--status-error);
        }

        @keyframes toastIn {
            from {
                opacity: 0;
                transform: translateX(20px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }

        @keyframes toastOut {
            to {
                opacity: 0;
                transform: translateX(20px);
            }
        }

        /* ============================================
           Reduced Motion
           ============================================ */
        @media (prefers-reduced-motion: reduce) {
            *,
            *::before,
            *::after {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
            }
        }
    </style>
</head>
<body>
    <div class="demo-container">
        <!-- Main Window -->
        <div class="window" id="window">
            <!-- Title Bar -->
            <div class="title-bar">
                <div class="traffic-lights">
                    <div class="traffic-light red"></div>
                    <div class="traffic-light yellow"></div>
                    <div class="traffic-light green"></div>
                </div>
                <div class="title-bar-file">
                    <span class="title-bar-text">config.ts</span>
                    <span class="file-status saved" id="fileStatus">Saved</span>
                </div>
                <div style="width: 52px;"></div>
            </div>

            <!-- Content -->
            <div class="content">
                <!-- Editor Panel -->
                <div class="editor-panel" id="editorPanel">
                    <div class="line-numbers" id="lineNumbers">1
2
3
4
5</div>
                    <div class="editor-content">
                        <div class="editor-content-wrapper">
                            <pre><code class="language-typescript" id="codeContent"></code><span class="cursor" id="cursor"></span></pre>
                        </div>
                    </div>

                    <!-- AI Typing Indicator -->
                    <div class="ai-typing-indicator" id="aiIndicator">
                        <span>🤖 AI editing</span>
                        <div class="dots">
                            <div class="dot"></div>
                            <div class="dot"></div>
                            <div class="dot"></div>
                        </div>
                    </div>

                    <!-- Error Overlay -->
                    <div class="error-overlay" id="errorOverlay">
                        <strong>Error:</strong> Cannot find name 'getDbUrl'. Did you mean 'getDB'?
                    </div>

                    <!-- Restored Badge -->
                    <div class="restored-badge" id="restoredBadge">✓ Restored</div>
                </div>

                <!-- Timeline Panel -->
                <div class="timeline-panel">
                    <div class="timeline-header">SnapBack Timeline</div>
                    <div class="timeline-list" id="timeline"></div>
                </div>
            </div>

            <!-- Status Bar -->
            <div class="status-bar">
                <div class="status-left">
                    <div class="status-indicator idle" id="statusIndicator"></div>
                    <span class="status-text" id="statusText">Protected</span>
                </div>
                <button class="btn-snapshot" id="snapshotBtn">
                    <span>📸</span> Create Snapshot
                </button>
            </div>
        </div>

        <!-- Demo Controls -->
        <div class="demo-controls">
            <button class="btn-demo playing" id="demoBtn">
                <span id="demoBtnIcon">⏸</span>
                <span id="demoBtnText">Pause Demo</span>
            </button>
            <span class="demo-hint">Click any timeline entry to restore</span>
        </div>
    </div>

    <!-- Toast Container -->
    <div class="toast-container" id="toastContainer"></div>

    <script>
        // ============================================
        // Configuration
        // ============================================
        const CODE_STATES = {
            INITIAL: `export const config = {
  database: "postgres://localhost:5432/myapp",
  apiKey: process.env.API_KEY,
  debug: false,
  timeout: 30000
}`,
            AI_MODIFIED: `export const config = {
  // Refactored for better modularity
  database: getDbUrl(),
  apiKey: "sk-1234567890abcdef",
  debug: true,
  timeout: 5000,
  logging: {
    level: "verbose",
    format: "json"
  }
}`
        };

        const STATES = {
            IDLE: 'idle',
            AI_EDITING: 'ai_editing',
            ERROR: 'error',
            RESTORED: 'restored'
        };

        // ============================================
        // State Management
        // ============================================
        let state = {
            current: STATES.IDLE,
            code: CODE_STATES.INITIAL,
            timeline: [],
            selectedIndex: null,
            isPlaying: true,
            demoTimeout: null
        };

        // ============================================
        // DOM Elements
        // ============================================
        const elements = {
            window: document.getElementById('window'),
            editorPanel: document.getElementById('editorPanel'),
            codeContent: document.getElementById('codeContent'),
            cursor: document.getElementById('cursor'),
            lineNumbers: document.getElementById('lineNumbers'),
            fileStatus: document.getElementById('fileStatus'),
            aiIndicator: document.getElementById('aiIndicator'),
            errorOverlay: document.getElementById('errorOverlay'),
            restoredBadge: document.getElementById('restoredBadge'),
            timeline: document.getElementById('timeline'),
            statusIndicator: document.getElementById('statusIndicator'),
            statusText: document.getElementById('statusText'),
            snapshotBtn: document.getElementById('snapshotBtn'),
            demoBtn: document.getElementById('demoBtn'),
            demoBtnIcon: document.getElementById('demoBtnIcon'),
            demoBtnText: document.getElementById('demoBtnText'),
            toastContainer: document.getElementById('toastContainer')
        };

        // ============================================
        // Utility Functions
        // ============================================
        function formatTime(date = new Date()) {
            return date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            });
        }

        function updateLineNumbers(code) {
            const lines = code.split('\n').length;
            elements.lineNumbers.textContent = Array.from(
                { length: lines },
                (_, i) => i + 1
            ).join('\n');
        }

        function displayCode(code, highlight = true) {
            elements.codeContent.textContent = code;
            if (highlight) {
                hljs.highlightElement(elements.codeContent);
            }
            updateLineNumbers(code);
        }

        // ============================================
        // Toast Notifications
        // ============================================
        function showToast(message, type = 'success') {
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.textContent = message;
            elements.toastContainer.appendChild(toast);

            setTimeout(() => {
                toast.classList.add('exiting');
                setTimeout(() => toast.remove(), 200);
            }, 2000);
        }

        // ============================================
        // Timeline Management
        // ============================================
        function initTimeline() {
            const now = Date.now();
            state.timeline = [
                {
                    id: 1,
                    time: formatTime(new Date(now - 120000)),
                    description: 'Session started',
                    type: 'manual',
                    code: CODE_STATES.INITIAL,
                    icon: '●'
                },
                {
                    id: 2,
                    time: formatTime(new Date(now - 60000)),
                    description: 'Auto-snapshot',
                    type: 'auto',
                    code: CODE_STATES.INITIAL,
                    icon: '○'
                },
                {
                    id: 3,
                    time: formatTime(new Date(now - 30000)),
                    description: 'Auto-snapshot',
                    type: 'auto',
                    code: CODE_STATES.INITIAL,
                    icon: '○'
                }
            ];
            renderTimeline();
        }

        function addTimelineEntry(entry, animate = true) {
            const id = Date.now();
            state.timeline.unshift({
                id,
                time: formatTime(),
                ...entry
            });

            // Keep timeline manageable (max 8 entries for demo)
            if (state.timeline.length > 8) {
                state.timeline = state.timeline.slice(0, 8);
            }

            renderTimeline(animate ? id : null);
        }

        function renderTimeline(animateId = null) {
            elements.timeline.innerHTML = '';

            state.timeline.forEach((entry, index) => {
                const el = document.createElement('div');
                el.className = `timeline-entry ${entry.type}`;
                if (index === state.selectedIndex) el.classList.add('selected');
                if (entry.id === animateId) el.classList.add('new');

                el.innerHTML = `
                    <div class="timeline-dot ${entry.type}">${entry.icon}</div>
                    <div class="timeline-info">
                        <div class="timeline-time">${entry.time}</div>
                        <div class="timeline-description">${entry.description}</div>
                    </div>
                    <button class="btn-restore">Restore</button>
                `;

                el.addEventListener('click', () => handleRestore(index));
                elements.timeline.appendChild(el);
            });
        }

        // ============================================
        // State Transitions
        // ============================================
        function setState(newState) {
            state.current = newState;

            // Update window classes
            elements.window.classList.remove('state-ai', 'state-error', 'state-restored');

            // Update status indicator
            elements.statusIndicator.classList.remove('idle', 'ai', 'error', 'success');
            elements.statusText.classList.remove('ai', 'error', 'success');

            switch (newState) {
                case STATES.IDLE:
                    elements.statusIndicator.classList.add('idle');
                    elements.statusText.textContent = 'Protected';
                    elements.fileStatus.textContent = 'Saved';
                    elements.fileStatus.className = 'file-status saved';
                    elements.aiIndicator.classList.remove('visible');
                    elements.errorOverlay.classList.remove('visible');
                    break;

                case STATES.AI_EDITING:
                    elements.window.classList.add('state-ai');
                    elements.statusIndicator.classList.add('ai');
                    elements.statusText.classList.add('ai');
                    elements.statusText.textContent = '🤖 AI editing detected';
                    elements.fileStatus.textContent = 'Modified';
                    elements.fileStatus.className = 'file-status modified';
                    elements.aiIndicator.classList.add('visible');
                    break;

                case STATES.ERROR:
                    elements.window.classList.add('state-error');
                    elements.statusIndicator.classList.add('error');
                    elements.statusText.classList.add('error');
                    elements.statusText.textContent = '❌ Build failed';
                    elements.fileStatus.textContent = 'Error';
                    elements.fileStatus.className = 'file-status error';
                    elements.aiIndicator.classList.remove('visible');
                    elements.errorOverlay.classList.add('visible');
                    break;

                case STATES.RESTORED:
                    elements.window.classList.add('state-restored');
                    elements.statusIndicator.classList.add('success');
                    elements.statusText.classList.add('success');
                    elements.statusText.textContent = '✓ Restored in 47ms';
                    elements.fileStatus.textContent = 'Saved';
                    elements.fileStatus.className = 'file-status saved';
                    elements.errorOverlay.classList.remove('visible');
                    break;
            }
        }

        // ============================================
        // Animations
        // ============================================
        async function typewriterEffect(targetCode) {
            elements.cursor.classList.add('typing');

            const startCode = state.code;
            const chars = targetCode.split('');
            let currentIndex = 0;

            return new Promise((resolve) => {
                // First, quickly "delete" by showing empty, then type new code
                displayCode('', false);

                const typeInterval = setInterval(() => {
                    if (!state.isPlaying) {
                        clearInterval(typeInterval);
                        resolve();
                        return;
                    }

                    currentIndex++;
                    const partial = chars.slice(0, currentIndex).join('');
                    displayCode(partial, false);

                    if (currentIndex >= chars.length) {
                        clearInterval(typeInterval);
                        elements.cursor.classList.remove('typing');
                        state.code = targetCode;
                        hljs.highlightElement(elements.codeContent);
                        resolve();
                    }
                }, 15); // Faster for demo purposes
            });
        }

        function showRestoredBadge() {
            elements.restoredBadge.classList.add('visible');
            elements.editorPanel.classList.add('flash');

            setTimeout(() => {
                elements.restoredBadge.classList.remove('visible');
                elements.editorPanel.classList.remove('flash');
            }, 1200);
        }

        // ============================================
        // Demo Flow
        // ============================================
        async function runDemoStep() {
            if (!state.isPlaying) return;

            // Step 1: AI starts editing
            setState(STATES.AI_EDITING);

            addTimelineEntry({
                description: '🤖 AI editing...',
                type: 'ai',
                code: state.code,
                icon: '🤖'
            });

            // Create auto-snapshot
            setTimeout(() => {
                if (!state.isPlaying) return;
                addTimelineEntry({
                    description: 'Auto-snapshot',
                    type: 'auto',
                    code: state.code,
                    icon: '○'
                });
                showToast('📸 Snapshot created', 'success');
            }, 500);

            // Typewriter effect
            await typewriterEffect(CODE_STATES.AI_MODIFIED);

            if (!state.isPlaying) return;
            await sleep(800);

            // Step 2: Error state
            if (!state.isPlaying) return;
            setState(STATES.ERROR);

            addTimelineEntry({
                description: '❌ Build failed',
                type: 'error',
                code: CODE_STATES.AI_MODIFIED,
                icon: '❌'
            });

            showToast('Build failed - click to restore', 'error');

            // Wait before auto-restore
            await sleep(3000);

            // Step 3: Auto-restore for demo
            if (!state.isPlaying) return;
            handleRestore(state.timeline.length - 1); // Restore to oldest safe state
        }

        function handleRestore(index) {
            const entry = state.timeline[index];
            if (!entry) return;

            state.selectedIndex = index;
            state.code = entry.code;

            setState(STATES.RESTORED);
            displayCode(entry.code);
            showRestoredBadge();
            showToast('✓ Restored successfully', 'success');

            renderTimeline();

            // Return to idle after restore animation
            setTimeout(() => {
                if (!state.isPlaying) return;
                setState(STATES.IDLE);
                state.selectedIndex = null;
                renderTimeline();

                // Continue demo loop
                if (state.isPlaying) {
                    state.demoTimeout = setTimeout(runDemoStep, 3000);
                }
            }, 2500);
        }

        function sleep(ms) {
            return new Promise(resolve => {
                state.demoTimeout = setTimeout(resolve, ms);
            });
        }

        // ============================================
        // Event Handlers
        // ============================================
        elements.snapshotBtn.addEventListener('click', () => {
            addTimelineEntry({
                description: 'Manual snapshot',
                type: 'manual',
                code: state.code,
                icon: '●'
            });
            showToast('📸 Snapshot created', 'success');
        });

        elements.demoBtn.addEventListener('click', () => {
            state.isPlaying = !state.isPlaying;

            if (state.isPlaying) {
                elements.demoBtn.classList.add('playing');
                elements.demoBtnIcon.textContent = '⏸';
                elements.demoBtnText.textContent = 'Pause Demo';
                runDemoStep();
            } else {
                elements.demoBtn.classList.remove('playing');
                elements.demoBtnIcon.textContent = '▶';
                elements.demoBtnText.textContent = 'Play Demo';
                clearTimeout(state.demoTimeout);
            }
        });

        // ============================================
        // Initialize
        // ============================================
        function init() {
            displayCode(CODE_STATES.INITIAL);
            initTimeline();

            // Start demo after short delay
            setTimeout(() => {
                if (state.isPlaying) {
                    runDemoStep();
                }
            }, 2000);
        }

        init();
    </script>
</body>
</html>
