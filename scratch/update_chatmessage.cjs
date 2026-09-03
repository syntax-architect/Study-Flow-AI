const fs = require('fs');
let code = fs.readFileSync('src/components/chat/ChatMessageItem.tsx', 'utf8');

if (!code.includes('onSuggestionClick?:')) {
    code = code.replace(
        '  onEditMessage?: (msgId: string, newContent: string) => void;',
        '  onEditMessage?: (msgId: string, newContent: string) => void;\n  onSuggestionClick?: (suggestion: string) => void;'
    );
}

if (!code.includes(', onSuggestionClick }:')) {
    code = code.replace(
        'export const ChatMessageItem = React.memo(({ msg, onTogglePin, userId, activeChatId, onNotify, onEditMessage }: ChatMessageItemProps) => {',
        'export const ChatMessageItem = React.memo(({ msg, onTogglePin, userId, activeChatId, onNotify, onEditMessage, onSuggestionClick }: ChatMessageItemProps) => {'
    );
}

const dualAiStart = `        <DualAiResponseView 
          data={data} 
          preprocessMath={preprocessMath} 
          userId={userId} 
          chatId={activeChatId} 
          messageId={msg.id}
          onNotify={onNotify}
        />`;
const dualAiReplace = `        <DualAiResponseView 
          data={data} 
          preprocessMath={preprocessMath} 
          userId={userId} 
          chatId={activeChatId} 
          messageId={msg.id}
          onNotify={onNotify}
          onSuggestionClick={onSuggestionClick}
        />`;

if (code.includes(dualAiStart)) {
    code = code.replace(dualAiStart, dualAiReplace);
}

if (code.includes('prevProps.onNotify === nextProps.onNotify;')) {
    code = code.replace('prevProps.onNotify === nextProps.onNotify;', 'prevProps.onNotify === nextProps.onNotify &&\n         prevProps.onSuggestionClick === nextProps.onSuggestionClick;');
}

fs.writeFileSync('src/components/chat/ChatMessageItem.tsx', code);
console.log('ChatMessageItem updated.');
