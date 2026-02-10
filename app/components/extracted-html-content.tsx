import DOMPurify from 'dompurify'
import * as React from 'react'

interface ExtractedHtmlContentProps {
  html: string
}

/**
 * Renders sanitized HTML (from ar5iv) with Tailwind Typography prose classes.
 * Uses DOMPurify to prevent XSS before dangerouslySetInnerHTML.
 * Client-only: returns null during SSR since DOMPurify requires a DOM.
 */
export function ExtractedHtmlContent({ html }: ExtractedHtmlContentProps) {
  const [sanitized, setSanitized] = React.useState<string | null>(null)

  React.useEffect(() => {
    setSanitized(DOMPurify.sanitize(html))
  }, [html])

  if (sanitized === null) return null

  return (
    <div
      className="prose prose-lg max-w-none font-serif"
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  )
}
