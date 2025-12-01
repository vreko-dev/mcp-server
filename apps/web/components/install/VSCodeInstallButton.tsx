'use client';

import { useCallback, useState } from 'react';

interface VSCodeInstallButtonProps {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  editor?: 'vscode' | 'cursor' | 'all';
}

export function VSCodeInstallButton({
  variant = 'primary',
  size = 'md',
  editor = 'all',
}: VSCodeInstallButtonProps) {
  const [showFallback, setShowFallback] = useState(false);
  const [selectedEditor, setSelectedEditor] = useState<string>('');

  const tryProtocol = useCallback(
    async (protocol: string): Promise<boolean> => {
      return new Promise((resolve) => {
        // Create hidden iframe to test protocol
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';

        // If window loses focus, protocol worked (editor opened)
        const handleBlur = () => {
          cleanup();
          resolve(true);
        };

        // Timeout = protocol failed
        const timeout = setTimeout(() => {
          cleanup();
          resolve(false);
        }, 2000);

        const cleanup = () => {
          window.removeEventListener('blur', handleBlur);
          clearTimeout(timeout);
          if (iframe.parentElement) {
            iframe.parentElement.removeChild(iframe);
          }
        };

        window.addEventListener('blur', handleBlur);
        document.body.appendChild(iframe);

        try {
          if (iframe.contentWindow) {
            iframe.contentWindow.location.replace(protocol);
          }
        } catch (err) {
          cleanup();
          resolve(false);
        }
      });
    },
    []
  );

  const handleClick = useCallback(async () => {
    const protocols: Array<[string, string]> = [];

    if (editor === 'vscode' || editor === 'all') {
      protocols.push([
        'vscode:extension/marcellelabs.snapback',
        'VS Code',
      ]);
    }

    if (editor === 'cursor' || editor === 'all') {
      protocols.push([
        'cursor://extensions/marcellelabs.snapback',
        'Cursor',
      ]);
    }

    // Try protocols
    for (const [protocol] of protocols) {
      const success = await tryProtocol(protocol);
      if (success) {
        return;
      }
    }

    // If all protocols failed, show fallback
    setSelectedEditor(editor === 'vscode' ? 'VS Code' : editor === 'cursor' ? 'Cursor' : 'VS Code');
    setShowFallback(true);
  }, [editor, tryProtocol]);

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  const variantClasses = {
    primary:
      'bg-[#10B981] text-black hover:bg-[#34D399] font-semibold',
    secondary:
      'bg-transparent text-[#10B981] border border-[#10B981] hover:bg-[#10B981]/10',
  };

  return (
    <>
      <button
        onClick={handleClick}
        className={`
          rounded-lg transition-all duration-200 font-medium
          ${sizeClasses[size]}
          ${variantClasses[variant]}
        `}
      >
        Install {editor === 'vscode' ? 'VS Code' : editor === 'cursor' ? 'Cursor' : 'Extension'}
      </button>

      {/* Fallback Modal */}
      {showFallback && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowFallback(false)}
        >
          <div
            className="bg-[#111111] border border-[#262626] rounded-xl p-6 max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-white mb-2">
              {selectedEditor} Not Found
            </h3>
            <p className="text-[#A0A0A0] mb-6">
              {selectedEditor} doesn't appear to be installed. Here are a few ways to get SnapBack:
            </p>

            <div className="space-y-3">
              {/* VS Code Extension Marketplace */}
              <div>
                <p className="text-sm text-[#71717A] mb-2 font-medium">Option 1: Extension Marketplace</p>
                <a
                  href="https://marketplace.visualstudio.com/items?itemName=marcellelabs.snapback"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-[#10B981] text-black text-center px-4 py-2 rounded-lg hover:bg-[#34D399] font-medium transition-colors"
                >
                  Open in VS Code Marketplace
                </a>
              </div>

              {/* Manual Install Command */}
              <div>
                <p className="text-sm text-[#71717A] mb-2 font-medium">Option 2: Manual Install</p>
                <div className="bg-[#0A0A0A] border border-[#262626] rounded-lg p-3 font-mono text-sm text-[#A0A0A0]">
                  ext install marcellelabs.snapback
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText('ext install marcellelabs.snapback');
                  }}
                  className="mt-2 w-full text-[#10B981] hover:text-[#34D399] text-sm font-medium"
                >
                  Copy Command
                </button>
              </div>

              {/* GitHub Link */}
              <div>
                <p className="text-sm text-[#71717A] mb-2 font-medium">Option 3: Build from Source</p>
                <a
                  href="https://github.com/marcellelabs/snapback"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-[#262626] text-[#A0A0A0] text-center px-4 py-2 rounded-lg hover:bg-[#404040] font-medium transition-colors"
                >
                  View on GitHub
                </a>
              </div>
            </div>

            <button
              onClick={() => setShowFallback(false)}
              className="mt-6 w-full text-[#A0A0A0] hover:text-white text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
