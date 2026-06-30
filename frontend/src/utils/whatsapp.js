export const sendMockWhatsapp = (text) => {
  const detail = {
    text,
    timestamp: Date.now(),
    id: Math.random().toString(36).substring(7)
  };
  const saved = JSON.parse(localStorage.getItem('whatsapp_simulator_messages') || '[]');
  saved.push(detail);
  localStorage.setItem('whatsapp_simulator_messages', JSON.stringify(saved.slice(-25)));
  window.dispatchEvent(new CustomEvent('whatsapp-message', { detail }));
};
