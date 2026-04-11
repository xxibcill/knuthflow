interface CrashBannerProps {
  crashMessage?: string;
  onDismiss: () => void;
}

export function CrashBanner({ crashMessage, onDismiss }: CrashBannerProps) {
  if (!crashMessage) {
    return null;
  }

  return (
    <div className="flex items-center justify-between mt-1 px-2 py-1 bg-red-900 rounded text-xs">
      <span className="text-red-300">
        <span className="font-medium">Session crashed:</span> {crashMessage}
      </span>
      <button
        onClick={onDismiss}
        className="text-red-400 hover:text-red-200 underline ml-2"
      >
        Dismiss
      </button>
    </div>
  );
}
