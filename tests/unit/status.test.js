const { isValidStatus, canTransition } = require('../../src/status');

describe('règles de statut', () => {
  test('statuts valides', () => {
    expect(isValidStatus('ouverte')).toBe(true);
    expect(isValidStatus('nimporte')).toBe(false);
  });

  test('transitions autorisées', () => {
    expect(canTransition('ouverte', 'en_cours')).toBe(true);
    expect(canTransition('en_cours', 'resolue')).toBe(true);
  });

  test('transitions interdites', () => {
    expect(canTransition('ouverte', 'resolue')).toBe(false);
    expect(canTransition('resolue', 'ouverte')).toBe(false);
  });
});
