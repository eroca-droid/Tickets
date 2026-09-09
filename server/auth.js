'use strict';

const crypto = require('node:crypto');
const { promisify } = require('node:util');
const config = require('./config');

const scrypt = promisify(crypto.scrypt);
const SCRYPT_OPTIONS = Object.freeze({ N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
const KEY_LENGTH = 64;

function parseCookies(header = '') {
    return Object.fromEntries(
        header
            .split(';')
            .map(part => part.trim())
            .filter(Boolean)
            .map(part => {
                const separator = part.indexOf('=');
                const key = separator >= 0 ? part.slice(0, separator) : part;
                const value = separator >= 0 ? part.slice(separator + 1) : '';
                return [decodeURIComponent(key), decodeURIComponent(value)];
            })
    );
}

function sessionHash(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

async function hashPassword(password) {
    const salt = crypto.randomBytes(16);
    const derivedKey = await scrypt(password, salt, KEY_LENGTH, SCRYPT_OPTIONS);
    return `scrypt$${SCRYPT_OPTIONS.N}$${SCRYPT_OPTIONS.r}$${SCRYPT_OPTIONS.p}$${salt.toString('base64')}$${derivedKey.toString('base64')}`;
}

async function verifyPassword(password, encodedHash) {
    try {
        const [algorithm, n, r, p, salt64, key64] = String(encodedHash).split('$');
        if (algorithm !== 'scrypt') return false;

        const expected = Buffer.from(key64, 'base64');
        const actual = await scrypt(password, Buffer.from(salt64, 'base64'), expected.length, {
            N: Number(n),
            r: Number(r),
            p: Number(p),
            maxmem: 64 * 1024 * 1024
        });

        return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
    } catch {
        return false;
    }
}

function createSessionToken() {
    return crypto.randomBytes(32).toString('base64url');
}

function setSessionCookie(response, token, expiresAt) {
    response.cookie(config.sessionCookie, token, {
        httpOnly: true,
        sameSite: 'strict',
        secure: config.secureCookie,
        path: '/',
        expires: expiresAt
    });
}

function clearSessionCookie(response) {
    response.clearCookie(config.sessionCookie, {
        httpOnly: true,
        sameSite: 'strict',
        secure: config.secureCookie,
        path: '/'
    });
}

function authMiddleware(pool) {
    return async (request, response, next) => {
        try {
            const token = parseCookies(request.headers.cookie)[config.sessionCookie];
            if (!token) return response.status(401).json({ error: 'Sesión no válida.' });

            const result = await pool.query(
                `select p.id, p.email, p.full_name, p.role, p.department, p.coordinator_id,
                        p.password_change_required
                 from sessions s
                 join profiles p on p.id = s.user_id
                 where s.token_hash = $1 and s.expires_at > now() and p.active = true`,
                [sessionHash(token)]
            );

            if (!result.rows[0]) {
                clearSessionCookie(response);
                return response.status(401).json({ error: 'La sesión expiró.' });
            }

            request.user = result.rows[0];
            request.sessionTokenHash = sessionHash(token);
            next();
        } catch (error) {
            next(error);
        }
    };
}

module.exports = {
    authMiddleware,
    clearSessionCookie,
    createSessionToken,
    hashPassword,
    parseCookies,
    sessionHash,
    setSessionCookie,
    verifyPassword
};
