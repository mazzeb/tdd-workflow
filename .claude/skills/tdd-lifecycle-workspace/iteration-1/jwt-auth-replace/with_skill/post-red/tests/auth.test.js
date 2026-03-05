const jwt = require('jsonwebtoken');
const { authenticate } = require('../src/middleware/auth');

const TEST_SECRET = 'test-secret';

// Helper to create mock Express req/res/next
function createMocks({ authorization } = {}) {
  const req = {
    headers: {},
  };
  if (authorization !== undefined) {
    req.headers.authorization = authorization;
  }

  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };

  const next = jest.fn();

  return { req, res, next };
}

// AC1: Given a request with a valid JWT Bearer token (signed with the app secret,
// not expired), when the authenticate middleware runs, then req.user is set to
// { id: <userId> } and next() is called
describe('authenticate middleware', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = TEST_SECRET;
  });

  afterAll(() => {
    delete process.env.JWT_SECRET;
  });

  test('sets req.user and calls next() for a valid JWT token', () => {
    const token = jwt.sign({ sub: 42 }, TEST_SECRET, { expiresIn: '15m' });
    const { req, res, next } = createMocks({
      authorization: `Bearer ${token}`,
    });

    authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({ id: 42 });
  });

  // AC2: Given a request with an expired JWT token, when the authenticate
  // middleware runs, then the response is 401 with
  // { error: { code: 'TOKEN_EXPIRED', message: 'Token has expired' } }
  test('returns 401 TOKEN_EXPIRED for an expired JWT token', () => {
    const token = jwt.sign({ sub: 1 }, TEST_SECRET, { expiresIn: '-1s' });
    const { req, res, next } = createMocks({
      authorization: `Bearer ${token}`,
    });

    authenticate(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
      error: { code: 'TOKEN_EXPIRED', message: 'Token has expired' },
    });
  });

  // AC3: Given a request with a JWT token signed with the wrong secret, when the
  // authenticate middleware runs, then the response is 401 with
  // { error: { code: 'UNAUTHORIZED', message: 'Invalid token' } }
  test('returns 401 UNAUTHORIZED for a token signed with wrong secret', () => {
    const token = jwt.sign({ sub: 1 }, 'wrong-secret', { expiresIn: '15m' });
    const { req, res, next } = createMocks({
      authorization: `Bearer ${token}`,
    });

    authenticate(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
      error: { code: 'UNAUTHORIZED', message: 'Invalid token' },
    });
  });

  // AC4: Given a request with a malformed token (not valid JWT), when the
  // authenticate middleware runs, then the response is 401 with
  // { error: { code: 'UNAUTHORIZED', message: 'Invalid token' } }
  test('returns 401 UNAUTHORIZED for a malformed (non-JWT) token', () => {
    const { req, res, next } = createMocks({
      authorization: 'Bearer not-a-valid-jwt-token',
    });

    authenticate(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
      error: { code: 'UNAUTHORIZED', message: 'Invalid token' },
    });
  });

  // AC5: Given a request with no Authorization header, when the authenticate
  // middleware runs, then the response is 401 with
  // { error: { code: 'UNAUTHORIZED', message: 'Missing or invalid token' } }
  test('returns 401 UNAUTHORIZED when Authorization header is missing', () => {
    const { req, res, next } = createMocks();

    authenticate(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
      error: { code: 'UNAUTHORIZED', message: 'Missing or invalid token' },
    });
  });
});
