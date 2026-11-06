import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from './Icon';
import { InfoDialog, type InfoTopic } from './Modal';

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
            <span>UR-CST Housing</span>
          </div>
          <p className="footer-about">
            A pilot platform that helps University of Rwanda, College of Science and Technology
            students find accommodation near campus.
          </p>
        </div>
        <div>
          <h2 className="footer-h">Platform</h2>
          <button type="button" onClick={() => setTopic('about')}>
            About the platform
          </button>
          <Link to="/how-it-works">How it works</Link>
          <Link to="/search">Find housing</Link>
        </div>
        <div>
          <h2 className="footer-h">Support</h2>
          <Link to="/help">Help &amp; FAQ</Link>
          <Link to="/help">Contact support</Link>
        </div>
        <div>
          <h2 className="footer-h">Legal</h2>
          <button type="button" onClick={() => setTopic('privacy')}>
            Privacy
          </button>
          <button type="button" onClick={() => setTopic('terms')}>
            Terms
          </button>
        </div>
      </div>
      <div className="bottom">
        Human-Centered Design pilot prototype · UR-CST, Kigali · All listings are demonstration data
        and are not real offers.
      </div>
      {topic && <InfoDialog topic={topic} onClose={() => setTopic(null)} />}
    </footer>
  );
}
