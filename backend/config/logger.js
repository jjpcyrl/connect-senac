// backend/config/logger.js
// Sistema de logging estruturado (JSON em produção / Formatado em desenvolvimento)

const isProduction = process.env.NODE_ENV === 'production';

function formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    if (isProduction) {
        return JSON.stringify({
            timestamp,
            level,
            message,
            ...meta
        });
    }
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
}

const logger = {
    info: (message, meta) => {
        console.log(formatMessage('info', message, meta));
    },
    warn: (message, meta) => {
        console.warn(formatMessage('warn', message, meta));
    },
    error: (message, meta) => {
        console.error(formatMessage('error', message, meta));
    },
    debug: (message, meta) => {
        if (process.env.DEBUG || !isProduction) {
            console.log(formatMessage('debug', message, meta));
        }
    }
};

module.exports = logger;