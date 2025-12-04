import { useState, useEffect, ReactElement } from 'react';
import { Button, Tooltip } from '@fluentui/react-components';
import {
  Home24Regular,
  Home24Filled,
  ArrowDownload24Regular,
  ArrowDownload24Filled,
  Settings24Regular,
  Settings24Filled,
  History24Regular,
  History24Filled,
  Heart24Regular,
  Heart24Filled,
  Library24Regular,
  Library24Filled,
  Album24Regular,
  Album24Filled,
  Person24Regular,
  Person24Filled,
  MusicNote224Regular,
  MusicNote224Filled,
  Navigation24Regular,
  Dismiss24Regular,
  Wrench24Regular,
  Wrench24Filled,
} from '@fluentui/react-icons';
import './Sidebar.css';

export type ViewType = 'home' | 'library' | 'albums' | 'artists' | 'playlists' | 'downloads' | 'history' | 'favorites' | 'tools' | 'settings';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

const navItems: { id: ViewType; label: string; icon: ReactElement; activeIcon: ReactElement }[] = [
  { id: 'home', label: 'בית', icon: <Home24Regular />, activeIcon: <Home24Filled /> },
  { id: 'library', label: 'ספרייה', icon: <Library24Regular />, activeIcon: <Library24Filled /> },
  { id: 'albums', label: 'אלבומים', icon: <Album24Regular />, activeIcon: <Album24Filled /> },
  { id: 'artists', label: 'אמנים', icon: <Person24Regular />, activeIcon: <Person24Filled /> },
  { id: 'playlists', label: 'רשימות השמעה', icon: <MusicNote224Regular />, activeIcon: <MusicNote224Filled /> },
  { id: 'downloads', label: 'הורדות', icon: <ArrowDownload24Regular />, activeIcon: <ArrowDownload24Filled /> },
  { id: 'history', label: 'היסטוריה', icon: <History24Regular />, activeIcon: <History24Filled /> },
  { id: 'favorites', label: 'מועדפים', icon: <Heart24Regular />, activeIcon: <Heart24Filled /> },
  { id: 'tools', label: 'כלים', icon: <Wrench24Regular />, activeIcon: <Wrench24Filled /> },
];

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setIsOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleNavClick = (view: ViewType) => {
    onViewChange(view);
    if (isMobile) {
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Menu Button */}
      {isMobile && (
        <button
          className="sidebar__mobile-toggle"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? 'סגור תפריט' : 'פתח תפריט'}
        >
          {isOpen ? <Dismiss24Regular /> : <Navigation24Regular />}
        </button>
      )}

      {/* Overlay for mobile */}
      {isMobile && isOpen && (
        <div className="sidebar__overlay" onClick={() => setIsOpen(false)} />
      )}

      <aside className={`sidebar ${isMobile ? 'sidebar--mobile' : ''} ${isOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar__logo">
          <img src="/icon.png" alt="Smart Player" className="sidebar__logo-img" />
          <span className="sidebar__logo-text">Smart Player</span>
        </div>

        <nav className="sidebar__nav">
          {navItems.map(item => (
            <Tooltip key={item.id} content={item.label} relationship="label" positioning="after">
              <Button
                appearance="subtle"
                className={`sidebar__nav-item ${currentView === item.id ? 'sidebar__nav-item--active' : ''}`}
                icon={currentView === item.id ? item.activeIcon : item.icon}
                onClick={() => handleNavClick(item.id)}
              >
                <span className="sidebar__nav-label">{item.label}</span>
              </Button>
            </Tooltip>
          ))}
        </nav>

        <div className="sidebar__footer">
          <Tooltip content="הגדרות" relationship="label" positioning="after">
            <Button
              appearance="subtle"
              className={`sidebar__nav-item ${currentView === 'settings' ? 'sidebar__nav-item--active' : ''}`}
              icon={currentView === 'settings' ? <Settings24Filled /> : <Settings24Regular />}
              onClick={() => handleNavClick('settings')}
            >
              <span className="sidebar__nav-label">הגדרות</span>
            </Button>
          </Tooltip>
        </div>
      </aside>
    </>
  );
}
