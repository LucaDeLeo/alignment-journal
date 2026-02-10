import * as React from 'react'

/**
 * Renders extracted plain text as paragraphs.
 * Double newlines create paragraph breaks. Single newlines create <br />.
 */
export function ExtractedTextContent({ text }: { text: string }) {
  const paragraphs = text.split(/\n\n+/)

  return (
    <>
      {paragraphs.map((paragraph, i) => {
        const lines = paragraph.split('\n')
        return (
          <p key={i} className="mb-4 last:mb-0">
            {lines.map((line, j) => (
              <React.Fragment key={j}>
                {j > 0 && <br />}
                {line}
              </React.Fragment>
            ))}
          </p>
        )
      })}
    </>
  )
}
