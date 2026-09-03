const fs = require('fs');
let code = fs.readFileSync('src/components/chat/DualAiResponseView.tsx', 'utf8');

// 1. Add confetti import
if (!code.includes("import confetti from 'canvas-confetti';")) {
    code = code.replace(
        "import { useAuth } from '@clerk/clerk-react';",
        "import { useAuth } from '@clerk/clerk-react';\nimport confetti from 'canvas-confetti';"
    );
}

// 2. Add onSuggestionClick to Props
if (!code.includes("onSuggestionClick?:")) {
    code = code.replace(
        "onNotify?: (msg: string, type: 'success' | 'warning' | 'info') => void;",
        "onNotify?: (msg: string, type: 'success' | 'warning' | 'info') => void;\n  onSuggestionClick?: (suggestion: string) => void;"
    );
}

// 3. Add useEffect and Suggestion Chips rendering
// Find the start of the DualAiResponseView component
// It looks like `const DualAiResponseView = ({ data, preprocessMath, userId, chatId, messageId, onNotify }: Props) => {`
// Wait, the file actually doesn't show `DualAiResponseView` start because I only viewed line 1 to 100. Let's find it.

const startComp = "const DualAiResponseView = ({ data, preprocessMath, userId, chatId, messageId, onNotify }: Props) => {";
const newCompStart = "const DualAiResponseView = ({ data, preprocessMath, userId, chatId, messageId, onNotify, onSuggestionClick }: Props) => {\n  React.useEffect(() => {\n    if (data.studentMastery) {\n      confetti({\n        particleCount: 100,\n        spread: 70,\n        origin: { y: 0.6 }\n      });\n    }\n  }, [data.studentMastery]);\n";

if (code.includes(startComp)) {
    code = code.replace(startComp, newCompStart);
} else {
    // maybe it's export const DualAiResponseView = React.memo(...)
    const fallbackStart = "export const DualAiResponseView = React.memo(({ data, preprocessMath, userId, chatId, messageId, onNotify }: Props) => {";
    const newFallbackStart = "export const DualAiResponseView = React.memo(({ data, preprocessMath, userId, chatId, messageId, onNotify, onSuggestionClick }: Props) => {\n  React.useEffect(() => {\n    if (data.studentMastery) {\n      confetti({\n        particleCount: 100,\n        spread: 70,\n        origin: { y: 0.6 }\n      });\n    }\n  }, [data.studentMastery]);\n";
    if (code.includes(fallbackStart)) {
        code = code.replace(fallbackStart, newFallbackStart);
    } else {
        const defaultStart = "const DualAiResponseView = React.memo(({ data, preprocessMath, userId, chatId, messageId, onNotify }: Props) => {";
        const newDefaultStart = "const DualAiResponseView = React.memo(({ data, preprocessMath, userId, chatId, messageId, onNotify, onSuggestionClick }: Props) => {\n  React.useEffect(() => {\n    if (data.studentMastery) {\n      confetti({\n        particleCount: 100,\n        spread: 70,\n        origin: { y: 0.6 }\n      });\n    }\n  }, [data.studentMastery]);\n";
        code = code.replace(defaultStart, newDefaultStart);
    }
}

// 4. ELI5 Badge
const summaryStart = "{/* Summary */}\n      {/* Derivation Title */}\n      <h2 className=\"font-bold text-xl mb-3 pr-8 relative\">\n        {data.title || 'Solving...'}\n        {isStreaming && <span className=\"absolute ml-2 animate-pulse bg-white dark:bg-[#09090b] w-2 h-5 inline-block top-1\"></span>}\n      </h2>";
const summaryReplace = "{/* Summary */}\n      {/* Derivation Title */}\n      <div className=\"flex items-center gap-3 mb-3 pr-8 relative\">\n        <h2 className=\"font-bold text-xl\">\n          {data.title || 'Solving...'}\n        </h2>\n        {data.explanationComplexity === 'ELI5' && (\n          <span className=\"bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 border border-purple-200 dark:border-purple-800\">\n            🧠 ELI5 Mode\n          </span>\n        )}\n        {isStreaming && <span className=\"animate-pulse bg-white dark:bg-[#09090b] w-2 h-5 inline-block\"></span>}\n      </div>";

if (code.includes(summaryStart)) {
    code = code.replace(summaryStart, summaryReplace);
}

// 5. Suggestion Chips
const chipsString = `
      {/* Suggestion Chips */}
      {data.suggestedFollowUps && data.suggestedFollowUps.length > 0 && (
        <div className="mt-6 pt-4 border-t border-black/5 dark:border-white/5">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Suggested Next Questions</p>
          <div className="flex flex-wrap gap-2">
            {data.suggestedFollowUps.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => onSuggestionClick?.(suggestion)}
                className="text-left text-sm px-4 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-black/5 dark:border-white/5 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}`;

const finalEquationStr = `      {/* Final Equation */}
      {data.finalEquation && (
        <div className="mt-4 p-4 rounded-2xl bg-[#2563EB]/5 border border-[#2563EB]/20 text-center shadow-sm">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false }]]}
          >
            {preprocessMath(data.finalEquation)}
          </ReactMarkdown>
        </div>
      )}`;

// We need to insert the chipsString right after the finalEquation block.
// Wait, the component ends right after finalEquation.
const endOfCompStr = `      {data.finalEquation && (
        <div className="mt-4 p-4 rounded-2xl bg-[#2563EB]/5 border border-[#2563EB]/20 text-center shadow-sm">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false }]]}
          >
            {preprocessMath(data.finalEquation)}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}`;

if (code.includes(endOfCompStr)) {
    code = code.replace(endOfCompStr, endOfCompStr.replace('    </div>\n  );\n}', chipsString));
}

// 6. Fix React.memo dependency array if onSuggestionClick is added
if (code.includes('prevProps.onNotify === nextProps.onNotify &&')) {
    code = code.replace('prevProps.onNotify === nextProps.onNotify &&', 'prevProps.onNotify === nextProps.onNotify &&\n         prevProps.onSuggestionClick === nextProps.onSuggestionClick &&');
}

fs.writeFileSync('src/components/chat/DualAiResponseView.tsx', code);
console.log('DualAiResponseView updated.');
