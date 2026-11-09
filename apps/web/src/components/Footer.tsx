import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from './Icon';
import { InfoDialog, type InfoTopic } from './Modal';
import { t } from '../i18n';

export function Footer() {
  const [topic, setTopic] = useState<InfoTopic | null>(null);

  return (
    <footer className="footer">
      <div className="in">
        <div>
          <div className="logo footer-logo">
            <span className="logo-mark">
              <Icon name="home" />
            </span>
            <span>{t('UR-CST Housing')}</span>
          </div>
          <p className="footer-about">
            {t(
              'A pilot platform that helps University of Rwanda, College of Science and Technology students find accommodation near campus.',
            )}
          </p>
        </div>
        <div>
          <h2 className="footer-h">{t('Platform')}</h2>
          <button type="button" onClick={() => setTopic('about')}>
            {t('About the platform')}
          </button>
          <Link to="/how-it-works">{t('How it works')}</Link>
          <Link to="/search">{t('Find housing')}</Link>
        </div>
        <div>
          <h2 className="footer-h">{t('Support')}</h2>
          <Link to="/help">{t('Help & FAQ')}</Link>
          <Link to="/help">{t('Contact support')}</Link>
        </div>
        <div>
          <h2 className="footer-h">{t('Legal')}</h2>
          <button type="button" onClick={() => setTopic('privacy')}>
            {t('Privacy')}
          </button>
          <button type="button" onClick={() => setTopic('terms')}>
            {t('Terms')}
          </button>
        </div>
      </div>
      <div className="bottom">
        {t(
          'Human-Centered Design pilot prototype · UR-CST, Kigali · All listings are demonstration data and are not real offers.',
        )}
      </div>
      {topic && <InfoDialog topic={topic} onClose={() => setTopic(null)} />}
    </footer>
  );
}
