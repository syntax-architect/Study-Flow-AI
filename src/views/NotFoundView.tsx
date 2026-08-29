import React from 'react';
import { m } from 'motion/react';
import { SEO } from '../components/common/SEO';
import { SearchX, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const NotFoundView: React.FC = () => {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 text-center relative">
      <SEO title="Page Not Found" description="The page you are looking for does not exist." />
      
      <m.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center gap-6 max-w-md"
      >
        <div className="w-24 h-24 bg-rose-500/10 rounded-full flex items-center justify-center">
          <SearchX className="w-12 h-12 text-rose-500" />
        </div>
        
        <div>
          <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-zinc-800 to-zinc-400 dark:from-zinc-100 dark:to-zinc-600 mb-4">
            404
          </h1>
          <h2 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100 mb-3">
            Lost in the Void
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">
            We couldn't find the page you're looking for. It might have been moved, deleted, or never existed in this dimension.
          </p>
        </div>

        <Link 
          to="/"
          className="mt-4 px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full font-medium flex items-center gap-2 hover:opacity-90 transition-all active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          Return to Hub
        </Link>
      </m.div>
    </div>
  );
};
