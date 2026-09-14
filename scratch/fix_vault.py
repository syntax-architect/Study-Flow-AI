import sys

def main():
    path = "src/views/VaultView.tsx"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Imports
    import_replace = """  HelpCircle,
  Layers,
  Sparkles,
  BookOpen,
  MessageSquare,
  Copy,
} from 'lucide-react';
import { m, AnimatePresence } from 'motion/react';
import { playSound } from '../utils/sound';
import { useAuth } from '@clerk/clerk-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remarkGfm';
import remarkMath from 'remarkMath';
import rehypeKatex from 'rehypeKatex';
import { ChatMessage } from '../types';"""
    content = content.replace("""  HelpCircle,
  Layers,
  Sparkles,
} from 'lucide-react';
import { m, AnimatePresence } from 'motion/react';
import { playSound } from '../utils/sound';""", import_replace)

    # 2. State
    state_replace = """  // Flashcard Flip State
  const [isFlipped, setIsFlipped] = useState(false);

  // Vault Tabs
  const [activeTab, setActiveTab] = useState<'simulations' | 'gems'>('gems');
  const [vaultGems, setVaultGems] = useState<ChatMessage[]>([]);
  const [gemsLoading, setGemsLoading] = useState(true);
  const { getToken, userId } = useAuth();

  React.useEffect(() => {
    if (!userId) return;
    const fetchGems = async () => {
      setGemsLoading(true);
      try {
        const token = await getToken();
        const res = await fetch(`/api/db/vault/user/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setVaultGems(data);
        }
      } catch (err) {
        console.error('Failed to fetch vault gems', err);
      } finally {
        setGemsLoading(false);
      }
    };
    fetchGems();
  }, [userId, getToken]);"""
    content = content.replace("  // Flashcard Flip State\n  const [isFlipped, setIsFlipped] = useState(false);", state_replace)

    # 3. Tabs
    tabs_replace = """      <SEO title="Vault" description="Your saved problems and simulations vault." />
      <div className="flex items-center gap-2 mb-2 p-1 bg-zinc-100 dark:bg-[#1E1F20] rounded-xl w-fit">
        <button
          onClick={() => {
            playSound('click', soundEnabled);
            setActiveTab('gems');
          }}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'gems'
              ? 'bg-white dark:bg-[#27272A] text-[#2563EB] shadow-sm'
              : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" /> Study Gems
          </div>
        </button>
        <button
          onClick={() => {
            playSound('click', soundEnabled);
            setActiveTab('simulations');
          }}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'simulations'
              ? 'bg-white dark:bg-[#27272A] text-[#2563EB] shadow-sm'
              : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" /> Interactive Simulations
          </div>
        </button>
      </div>

      <AnimatePresence mode="wait">
      {activeTab === 'simulations' ? (
        <m.div 
          key="simulations"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="space-y-6"
        >"""
    content = content.replace("""      <SEO title="Vault" description="Your saved problems and simulations vault." />""", tabs_replace)

    # 4. Closing tags and second tab
    end_replace = """      </m.div>
      ) : (
        <m.div
          key="gems"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="space-y-6"
        >
          {gemsLoading ? (
            <div className="flex justify-center p-12">
              <div className="w-8 h-8 rounded-full border-4 border-t-[#2563EB] border-black/10 dark:border-white/10 animate-spin" />
            </div>
          ) : vaultGems.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center border border-black/5 dark:border-white/5 rounded-3xl bg-zinc-50 dark:bg-[#121214]">
              <BookOpen className="w-12 h-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-500">No Study Gems Yet</h3>
              <p className="text-gray-400 max-w-sm mt-2 text-sm">Save your favorite AI responses from the Chat to your Vault to review them later.</p>
            </div>
          ) : (
            <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6 mt-4">
              {vaultGems.map((gem) => (
                <div key={gem.id} className="break-inside-avoid bg-white dark:bg-[#09090b] border border-black/5 dark:border-white/5 shadow-sm rounded-3xl p-5 hover:border-blue-500/50 transition-colors">
                  <div className="flex items-center gap-2 mb-3 pb-3 border-b border-black/5 dark:border-white/5">
                    <MessageSquare className="w-4 h-4 text-blue-500" />
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      Study Gem
                    </span>
                  </div>
                  <div className="prose dark:prose-invert prose-sm prose-zinc max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkMath]}
                      rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false }]]}
                    >
                      {gem.content}
                    </ReactMarkdown>
                  </div>
                </div>
              ))}
            </div>
          )}
        </m.div>
      )}
      </AnimatePresence>
    </div>
  );
};
"""
    content = content.replace("    </div>\n  );\n};\n", end_replace)

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    
    print("Done")

if __name__ == "__main__":
    main()
