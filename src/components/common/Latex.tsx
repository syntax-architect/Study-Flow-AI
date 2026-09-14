import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface LatexProps {
  children: string;
  block?: boolean;
}

export const Latex: React.FC<LatexProps> = ({ children, block = false }) => {
  const renderMath = (text: string) => {
    if (!text) return null;

    // Check if it has any standard latex delimiters.
    // If not, we'll try to just render the whole string as math if it looks like math (has \\ or _ or ^),
    // but honestly it's safer to just render the whole thing as block math if the block flag is set.
    if (!text.includes('$') && !text.includes('\\[')) {
      try {
        return (
          <span
            dangerouslySetInnerHTML={{
              __html: katex.renderToString(text, { displayMode: block, throwOnError: false }),
            }}
          />
        );
      } catch (e) {
        return <span>{text}</span>;
      }
    }

    // Split by $$...$$ or $...$ or \[...\] or \(...\)
    const parts = text.split(/(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$[\s\S]*?\$|\\\([\s\S]*?\\\))/g);

    return (
      <>
        {parts.map((part, index) => {
          if (part.startsWith('$$') && part.endsWith('$$')) {
            const math = part.slice(2, -2);
            return (
              <span
                key={index}
                dangerouslySetInnerHTML={{
                  __html: katex.renderToString(math, { displayMode: true, throwOnError: false }),
                }}
              />
            );
          }
          if (part.startsWith('\\[') && part.endsWith('\\]')) {
            const math = part.slice(2, -2);
            return (
              <span
                key={index}
                dangerouslySetInnerHTML={{
                  __html: katex.renderToString(math, { displayMode: true, throwOnError: false }),
                }}
              />
            );
          }
          if (part.startsWith('$') && part.endsWith('$')) {
            const math = part.slice(1, -1);
            return (
              <span
                key={index}
                dangerouslySetInnerHTML={{
                  __html: katex.renderToString(math, { displayMode: false, throwOnError: false }),
                }}
              />
            );
          }
          if (part.startsWith('\\(') && part.endsWith('\\)')) {
            const math = part.slice(2, -2);
            return (
              <span
                key={index}
                dangerouslySetInnerHTML={{
                  __html: katex.renderToString(math, { displayMode: false, throwOnError: false }),
                }}
              />
            );
          }
          // Regular text
          return <span key={index}>{part}</span>;
        })}
      </>
    );
  };

  return <span className={block ? 'block overflow-x-auto py-2' : ''}>{renderMath(children)}</span>;
};
