// Règles métier : ouverte -> en_cours -> resolue
const STATUSES = ['ouverte', 'en_cours', 'resolue'];
const TRANSITIONS = { ouverte: ['en_cours'], en_cours: ['resolue'], resolue: [] };

function isValidStatus(status) {
  return STATUSES.includes(status);
}

function canTransition(from, to) {
  return (TRANSITIONS[from] || []).includes(to);
}

module.exports = { STATUSES, isValidStatus, canTransition };
