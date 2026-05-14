import { useState, useEffect } from 'react';
import styles from './PushToggle.module.css';

export default function PushToggle() {
  const [permission, setPermission] = useState('default');

  useEffect(() => {
    if (!('Notification' in window)) return;
    setPermission(Notification.permission);
  }, []);

  const handleToggle = async () => {
    if (!('Notification' in window)) return alert('Push notifications not supported.');
    
    if (permission === 'granted') {
      alert('Notifications are already enabled! To disable, change your browser settings.');
      return;
    }

    const res = await Notification.requestPermission();
    setPermission(res);

    if (res === 'granted') {
      new Notification('FanPulse 🏏', {
        body: 'You are now subscribed to live match alerts!',
        icon: '/icon-192.png'
      });
    }
  };

  if (!('Notification' in window)) return null;

  return (
    <div className={styles.card}>
      <div className={styles.info}>
        <div className={styles.icon}>🔔</div>
        <div>
          <div className={styles.title}>Live Match Alerts</div>
          <div className={styles.desc}>Get notified for wickets, milestones, and thrillers.</div>
        </div>
      </div>
      <button 
        className={`${styles.btn} ${permission === 'granted' ? styles.active : ''}`}
        onClick={handleToggle}
        disabled={permission === 'denied'}
      >
        {permission === 'granted' ? 'Enabled' : permission === 'denied' ? 'Blocked' : 'Enable'}
      </button>
    </div>
  );
}
