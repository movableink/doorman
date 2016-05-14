var conf = {
  // port to listen on
  port: process.env.DOORMAN_LISTEN_PORT,

  securePort: process.env.DOORMAN_SECURE_PORT,
  forceTLS: process.env.DOORMAN_FORCE_TLS,

  // URL for OAuth callbacks, default autodetect
  hostname: process.env.DOORMAN_HOSTNAME,

  proxyTo: {
    host: process.env.DOORMAN_PROXY_HOST,
    port: process.env.DOORMAN_PROXY_PORT
  },

  // Session cookie options, see: https://github.com/expressjs/cookie-session
  sessionCookie: {
    name: '__doorman',
    maxage: process.env.DOORMAN_MAXAGE, // milliseconds until expiration (or "false" to not expire)
    secret: process.env.DOORMAN_SECRET || require('crypto').randomBytes(64).toString('hex') // if secret isn't supplied, generate a new one every start
  },

  // Paths that bypass doorman and do not need any authentication.  Matches on the
  // beginning of paths; for example '/about' matches '/about/me'.  Regexes are not supported from environment variables.
  // example: DOORMAN_PUBLIC_PATHS="/about/,/robots.txt"
  publicPaths: process.env.DOORMAN_PUBLIC_PATHS && process.env.DOORMAN_PUBLIC_PATHS.split(','),

  modules: {} // populated individually below
};

if(conf.securePort) {
  conf.ssl = {
    keyFile: process.env.DOORMAN_SSL_KEYFILE,
    certFile: process.env.DOORMAN_SSL_CERTFILE,
    caFile: process.env.DOORMAN_SSL_CAFILE
  };
}

var modules = process.env.DOORMAN_MODULES;
if(!modules) {
  console.log("must specify comma-separated DOORMAN_MODULES environment variable");
  process.exit(1);
}

modules = modules.split(',');

if(modules.indexOf('github') >= 0) {
  // Register a new oauth app on Github at
  // https://github.com/account/applications/new
  conf.modules.github = {
    appId: process.env.DOORMAN_GITHUB_APPID,
    appSecret: process.env.DOORMAN_GITHUB_APPSECRET,
    entryPath: '/oauth/github',
    callbackPath: '/oauth/github/callback',

    // List of github email addresses that can authenticate, comma-separated
    // example: DOORMAN_GITHUB_REQUIRED_EMAIL="user1@example.com,user2@example.com"
    requiredEmail: process.env.DOORMAN_GITHUB_REQUIRED_EMAIL && process.env.DOORMAN_GITHUB_REQUIRED_EMAIL.split(','),

    // Only users with this organization name can authenticate. If an array is
    // listed, user may authenticate as a member of ANY of the domains.
    requiredOrganization: process.env.DOORMAN_GITHUB_REQUIRED_ORGANIZATION // short organization name
  };
}

if(modules.indexOf('password') >= 0) {
  // Simple password login, make sure you choose a very secure password.
  conf.modules.password = {
    token: process.env.DOORMAN_PASSWORD_TOKEN // any user that knows this can log in
  };
}

if(modules.indexOf('google') >= 0) {
  // Register a new oauth app on Google Apps at
  // https://code.google.com/apis/console
  conf.modules.google = {
    appId: process.env.DOORMAN_GOOGLE_APPID,
    appSecret: process.env.DOORMAN_GOOGLE_APPSECRET,

    // If uncommented, user must authenticate with an account associated with one of
    // the emails in the comma-separated list.
    // example: DOORMAN_GOOGLE_REQUIRED_EMAIL="user1@gmail.com,user2@gmail.com"
    requiredEmail: process.env.DOORMAN_GOOGLE_REQUIRED_EMAIL && process.env.DOORMAN_GOOGLE_REQUIRED_EMAIL.split(','),

    // User must be a member of this domain to successfully authenticate. If an array
    // is listed, user may authenticate as a member of ANY of the domains.
    requiredDomain: process.env.DOORMAN_GOOGLE_REQUIRED_DOMAIN && process.env.DOORMAN_GOOGLE_REQUIRED_DOMAIN.split(',')
  };
}

module.exports = conf;
