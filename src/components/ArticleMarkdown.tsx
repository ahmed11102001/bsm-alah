"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";

interface ArticleMarkdownProps {
  content: string;
  className?: string;
}

/**
 * Validates that a link URL is safe to render to prevent XSS (e.g., javascript:, data: protocols).
 */
function sanitizeUrl(url?: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (
    trimmed.startsWith("/") ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("tel:")
  ) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return trimmed;
    }
  } catch {
    // If it's a relative URL without leading slash (e.g., "strategies/abandoned-cart"), allow as relative
    if (!trimmed.includes(":") && !trimmed.startsWith("//")) {
      return `/${trimmed}`;
    }
  }

  return null;
}

/**
 * Checks if a given URL is internal to Wani.
 */
function isInternalUrl(url: string): boolean {
  if (url.startsWith("/") || url.startsWith("#")) return true;
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === "aiwni.com" ||
      parsed.hostname === "www.aiwni.com" ||
      parsed.hostname === "localhost"
    );
  } catch {
    return true;
  }
}

/**
 * Normalizes internal domain links to clean relative paths (e.g., https://aiwni.com/strategies -> /strategies).
 */
function normalizeInternalHref(url: string): string {
  try {
    if (url.startsWith("/") || url.startsWith("#")) return url;
    const parsed = new URL(url);
    if (
      parsed.hostname === "aiwni.com" ||
      parsed.hostname === "www.aiwni.com" ||
      parsed.hostname === "localhost"
    ) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}` || "/";
    }
  } catch {
    // Return original if parsing fails
  }
  return url;
}

export default function ArticleMarkdown({ content, className = "" }: ArticleMarkdownProps) {
  if (!content) return null;

  return (
    <div
      className={`article-markdown-body text-gray-800 dark:text-gray-200 leading-relaxed ${className}`}
      dir="rtl"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // ── Links (Internal & External) ──────────────────────────────────
          a({ href, children, ...props }) {
            const safeHref = sanitizeUrl(href);
            if (!safeHref) {
              return <span>{children}</span>;
            }

            const isInternal = isInternalUrl(safeHref);
            const normalizedHref = isInternal ? normalizeInternalHref(safeHref) : safeHref;

            if (isInternal) {
              return (
                <Link
                  href={normalizedHref}
                  className="text-[#25D366] hover:text-[#1da851] dark:text-[#25D366] dark:hover:text-[#4ee686] underline font-semibold transition-colors duration-150"
                  {...props}
                >
                  {children}
                </Link>
              );
            }

            return (
              <a
                href={normalizedHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#25D366] hover:text-[#1da851] dark:text-[#25D366] dark:hover:text-[#4ee686] underline font-semibold transition-colors duration-150"
                {...props}
              >
                {children}
              </a>
            );
          },

          // ── Headings ─────────────────────────────────────────────────────
          h1({ children }) {
            return (
              <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mt-10 mb-4 pb-2 border-b border-gray-100 dark:border-gray-800 leading-tight">
                {children}
              </h2>
            );
          },
          h2({ children }) {
            return (
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4 border-r-4 border-[#25D366] pr-3 leading-snug">
                {children}
              </h2>
            );
          },
          h3({ children }) {
            return (
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mt-6 mb-3 leading-snug">
                {children}
              </h3>
            );
          },
          h4({ children }) {
            return (
              <h4 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mt-5 mb-2">
                {children}
              </h4>
            );
          },

          // ── Paragraphs ───────────────────────────────────────────────────
          p({ children }) {
            return (
              <p className="text-base sm:text-lg text-gray-700 dark:text-gray-300 leading-relaxed mb-5">
                {children}
              </p>
            );
          },

          // ── Lists ────────────────────────────────────────────────────────
          ul({ children }) {
            return (
              <ul className="list-disc list-outside pr-6 space-y-2.5 mb-6 text-gray-700 dark:text-gray-300">
                {children}
              </ul>
            );
          },
          ol({ children }) {
            return (
              <ol className="list-decimal list-outside pr-6 space-y-2.5 mb-6 text-gray-700 dark:text-gray-300">
                {children}
              </ol>
            );
          },
          li({ children }) {
            return <li className="leading-relaxed text-base sm:text-lg">{children}</li>;
          },

          // ── Blockquotes ──────────────────────────────────────────────────
          blockquote({ children }) {
            return (
              <blockquote className="border-r-4 border-[#25D366] bg-green-50/50 dark:bg-green-950/20 pr-4 py-3 pl-3 rounded-l-xl my-6 text-gray-700 dark:text-gray-300 italic">
                {children}
              </blockquote>
            );
          },

          // ── Code ─────────────────────────────────────────────────────────
          code({ className, children, ...props }) {
            const isCodeBlock = className && className.includes("language-");
            if (isCodeBlock) {
              return (
                <code
                  className="block font-mono text-sm text-gray-100 bg-gray-900 p-4 rounded-xl overflow-x-auto my-4 direction-ltr"
                  dir="ltr"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code
                className="bg-gray-100 dark:bg-gray-800 text-[#128C7E] dark:text-[#25D366] px-1.5 py-0.5 rounded font-mono text-sm"
                dir="ltr"
                {...props}
              >
                {children}
              </code>
            );
          },

          // ── Pre / Code Block container ───────────────────────────────────
          pre({ children }) {
            return <pre className="not-prose my-4">{children}</pre>;
          },

          // ── Tables ───────────────────────────────────────────────────────
          table({ children }) {
            return (
              <div className="overflow-x-auto my-6 rounded-xl border border-gray-200 dark:border-gray-700">
                <table className="w-full text-right border-collapse text-sm sm:text-base">
                  {children}
                </table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700">{children}</thead>;
          },
          tbody({ children }) {
            return <tbody className="divide-y divide-gray-200 dark:divide-gray-700">{children}</tbody>;
          },
          tr({ children }) {
            return <tr className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">{children}</tr>;
          },
          th({ children }) {
            return (
              <th className="p-3.5 font-bold text-gray-900 dark:text-white">
                {children}
              </th>
            );
          },
          td({ children }) {
            return <td className="p-3.5 text-gray-700 dark:text-gray-300">{children}</td>;
          },

          // ── Divider ──────────────────────────────────────────────────────
          hr() {
            return <hr className="border-gray-200 dark:border-gray-800 my-8" />;
          },

          // ── Images ───────────────────────────────────────────────────────
          img({ src, alt }) {
            return (
              <span className="block my-6">
                <img
                  src={src}
                  alt={alt || "مقال وني"}
                  className="rounded-2xl max-w-full h-auto mx-auto shadow-md border border-gray-100 dark:border-gray-800"
                  loading="lazy"
                />
                {alt && (
                  <span className="block text-center text-xs text-gray-400 mt-2">
                    {alt}
                  </span>
                )}
              </span>
            );
          },

          // ── Strong / Emphasis ────────────────────────────────────────────
          strong({ children }) {
            return <strong className="font-bold text-gray-900 dark:text-white">{children}</strong>;
          },
          em({ children }) {
            return <em className="italic text-gray-800 dark:text-gray-200">{children}</em>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
