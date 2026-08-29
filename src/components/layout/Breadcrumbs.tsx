import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  // Don't show breadcrumbs on waitlist, chat, or 404/login
  if (location.pathname === '/' || location.pathname === '/waitlist' || location.pathname === '/chat') {
    return null;
  }

  const formatSegment = (segment: string) => {
    return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
  };

  return (
    <nav className="flex items-center text-xs text-zinc-500 dark:text-zinc-400 mb-6 font-medium tracking-wide">
      <Link to="/" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors flex items-center gap-1.5">
        <Home className="w-3.5 h-3.5" />
        Hub
      </Link>
      
      {pathnames.map((value, index) => {
        const isLast = index === pathnames.length - 1;
        const to = `/${pathnames.slice(0, index + 1).join('/')}`;

        return (
          <React.Fragment key={to}>
            <ChevronRight className="w-3.5 h-3.5 mx-1.5 opacity-50" />
            {isLast ? (
              <span className="text-zinc-900 dark:text-zinc-100">{formatSegment(value)}</span>
            ) : (
              <Link to={to} className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                {formatSegment(value)}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
