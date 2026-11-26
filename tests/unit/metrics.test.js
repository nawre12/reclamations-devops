const metrics = require('../../src/metrics');

function fakeResponse(statusCode) {
  return {
    statusCode,
    handlers: {},
    on(event, callback) {
      this.handlers[event] = callback;
    },
    finish() {
      this.handlers.finish();
    },
  };
}

beforeEach(() => metrics.reset());

describe('indicateurs techniques', () => {
  test('compte les requêtes réussies', () => {
    const res = fakeResponse(200);
    const next = jest.fn();
    metrics.middleware({}, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    res.finish();

    const snapshot = metrics.snapshot();
    expect(snapshot.requests).toBe(1);
    expect(snapshot.errors).toBe(0);
    expect(snapshot.byStatus['200']).toBe(1);
    expect(snapshot.averageResponseMs).toBeGreaterThanOrEqual(0);
  });

  test('compte les erreurs serveur', () => {
    const res = fakeResponse(500);
    metrics.middleware({}, res, jest.fn());
    res.finish();

    const snapshot = metrics.snapshot();
    expect(snapshot.requests).toBe(1);
    expect(snapshot.errors).toBe(1);
    expect(snapshot.byStatus['500']).toBe(1);
  });

  test('réinitialise les compteurs', () => {
    const res = fakeResponse(404);
    metrics.middleware({}, res, jest.fn());
    res.finish();
    metrics.reset();

    expect(metrics.snapshot().requests).toBe(0);
    expect(metrics.snapshot().byStatus).toEqual({});
  });
});
