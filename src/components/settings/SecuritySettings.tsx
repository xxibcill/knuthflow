export function SecuritySettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-3">Secure Storage</h3>
        <div className="bg-gray-700 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-300">Storage Backend</p>
              <p className="text-xs text-gray-500 mt-1">Where sensitive data is stored</p>
            </div>
            <span className="px-3 py-1 bg-green-600 text-white text-sm rounded">
              {navigator.platform === 'darwin' ? 'macOS Keychain' : 'Encrypted File'}
            </span>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-3">Sensitive Data</h3>
        <div className="bg-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-400 mb-3">
            Sensitive values like API keys and tokens are stored securely using OS-level encryption.
            They are never stored in plaintext or in the session database.
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Your secrets are encrypted and protected by your OS</span>
          </div>
        </div>
      </div>
    </div>
  );
}
