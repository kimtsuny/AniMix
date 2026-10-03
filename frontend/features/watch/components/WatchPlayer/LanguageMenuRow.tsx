"use client";

import { Check } from "lucide-react";

export interface LanguageMenuRowProps {
  label: string;
  language?: string;
  isSelected: boolean;
  onClick: () => void;
}

/**
 * Cleans the raw description extracted from a label while preserving inner parentheses.
 * e.g. "(- PORTUGUESE(BRASIL))" -> "PORTUGUESE(BRASIL)"
 *      "(- SPANISH(ESPAÑOL(ESPAÑA)))" -> "SPANISH(ESPAÑOL(ESPAÑA))"
 */
function cleanDescription(rawDesc: string): string {
  let desc = rawDesc.trim();
  // Strip leading delimiters like "(- ", "- ", "(", "["
  desc = desc.replace(/^[\(\[\s\-–—]+/, "");

  // Balance closing parentheses if outer opening was stripped
  let openCount = (desc.match(/\(/g) || []).length;
  let closeCount = (desc.match(/\)/g) || []).length;
  while (closeCount > openCount && desc.endsWith(")")) {
    desc = desc.slice(0, -1).trim();
    closeCount--;
  }

  // Balance closing brackets if outer opening was stripped
  let openBracket = (desc.match(/\[/g) || []).length;
  let closeBracket = (desc.match(/\]/g) || []).length;
  while (closeBracket > openBracket && desc.endsWith("]")) {
    desc = desc.slice(0, -1).trim();
    closeBracket--;
  }

  return desc.trim();
}

/**
 * Parses subtitle/audio labels to separate the primary language name from any
 * detailed metadata/description.
 *
 * Examples:
 * - "Portuguese (- PORTUGUESE(BRASIL))" -> name: "Portuguese", description: "PORTUGUESE(BRASIL)"
 * - "Spanish (- SPANISH(ESPAÑOL(ESPAÑA)))" -> name: "Spanish", description: "SPANISH(ESPAÑOL(ESPAÑA))"
 * - "English" (with language: "ENGLISH") -> name: "English", description: "ENGLISH"
 * - "Portuguese" (with language: "PT-BR") -> name: "Portuguese", description: "PT-BR"
 */
export function parseLanguageEntry(
  label: string,
  language?: string
): { name: string; description?: string } {
  if (!label) {
    return { name: language || "Unknown" };
  }

  const trimmed = label.trim();

  // If label contains parentheses or dashes separating language and description
  // e.g. "Portuguese (- PORTUGUESE(BRASIL))", "Spanish - ESPAÑOL", "English (Forced)"
  const splitIdx = trimmed.search(/\s*[\(\[\-–—]/);
  if (splitIdx > 0) {
    const name = trimmed.slice(0, splitIdx).trim();
    const rawDesc = trimmed.slice(splitIdx).trim();
    const cleaned = cleanDescription(rawDesc);

    return {
      name,
      description: cleaned || language?.trim() || undefined,
    };
  }

  // If label is a clean name like "English" or "Portuguese", use language as description
  const cleanLang = language?.trim();
  return {
    name: trimmed,
    description: cleanLang || undefined,
  };
}

/**
 * Reusable language-selection row for Subtitles, Audio tracks, etc.
 * Guarantees that the PRIMARY LANGUAGE NAME is never squeezed out by long descriptions.
 *
 * Layout rules:
 * 1. Checkmark: Left aligned (16px fixed).
 * 2. Primary Language Name: High priority, flexible, min-width: 0 protected, always visible.
 * 3. Description: Secondary, max-width: 45%, overflow: hidden, text-overflow: ellipsis,
 *    white-space: nowrap (Tailwind truncate).
 */
export function LanguageMenuRow({
  label,
  language,
  isSelected,
  onClick,
}: LanguageMenuRowProps) {
  const { name, description } = parseLanguageEntry(label, language);

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-colors duration-150 text-left group ${
        isSelected
          ? "bg-[#e63946]/12 text-white font-medium"
          : "text-white/80 hover:bg-white/[0.08] hover:text-white"
      }`}
    >
      {/* Primary Language Name + Checkmark area */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
        {isSelected ? (
          <Check className="size-4 text-[#e63946] flex-shrink-0" />
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}
        <span
          className={`text-[13px] font-medium truncate min-w-0 ${
            isSelected ? "text-[#e63946]" : "text-white/90 group-hover:text-white"
          }`}
        >
          {name}
        </span>
      </div>

      {/* Description / Metadata (Secondary, protected max-width 45%, smoothly truncated with ellipsis) */}
      {description && (
        <span
          title={description}
          className="text-[11px] text-white/45 group-hover:text-white/60 uppercase font-mono max-w-[45%] truncate text-right flex-shrink-1 ml-auto"
        >
          {description}
        </span>
      )}
    </button>
  );
}
