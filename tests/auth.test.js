'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
    createSessionToken,
    hashPassword,
    parseCookies,
    sessionHash,
    verifyPassword
} = require('../server/auth');

test('hashPassword genera hashes verificables sin guardar la contraseña', async () => {
    const password = 'una-clave-segura-123';
    const encoded = await hashPassword(password);

    assert.match(encoded, /^scrypt\$/);
    assert.equal(encoded.includes(password), false);
    assert.equal(await verifyPassword(password, encoded), true);
    assert.equal(await verifyPassword('clave-incorrecta', encoded), false);
});

test('los tokens de sesión son aleatorios y se almacenan mediante hash', () => {
    const first = createSessionToken();
    const second = createSessionToken();

    assert.notEqual(first, second);
    assert.match(sessionHash(first), /^[a-f0-9]{64}$/);
    assert.equal(sessionHash(first), sessionHash(first));
});

test('parseCookies interpreta varias cookies', () => {
    assert.deepEqual(parseCookies('theme=dark; turnoclaro_session=abc%20123'), {
        theme: 'dark',
        turnoclaro_session: 'abc 123'
    });
});
