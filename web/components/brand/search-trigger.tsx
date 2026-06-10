"use client";

export function SearchTrigger() {
  return (
    <button
      onClick={() =>
        window.dispatchEvent(
          new KeyboardEvent("keydown", { key: "f", ctrlKey: true }),
        )
      }
      className="hidden sm:flex cursor-pointer text-xs text-chrome-500 hover:text-chrome-300 border border-chrome-500/20 rounded px-2 py-1"
    >
      Search… Ctrl+F
    </button>
  );
}
