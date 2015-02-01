module.exports = {
  // port to listen on
  port: process.env.DOORMAN_LISTEN_PORT,

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
    secret: process.env.DOORMAN_SECRET
  },

  // Paths that bypass doorman and do not need any authentication.  Matches on the
  // beginning of paths; for example '/about' matches '/about/me'.  Regexes are also supported.
  // publicPaths: [
  //   '/about/',
  //   '/robots.txt',
  //   /(.*?).png$/
  // ],

  modules: {
    // Register a new oauth app on Github at
    // https://github.com/account/applications/new
    github: {
      appId: process.env.DOORMAN_GITHUB_APPID,
      appSecret: process.env.DOORMAN_GITHUB_APPSECRET,
      entryPath: '/oauth/github',
      callbackPath: '/oauth/github/callback',

      // List of github email addresses that can authenticate
      // requiredEmail: ['user1@gmail.com', 'user2@yahoo.com'],

      // Only users with this organization name can authenticate. If an array is
      // listed, user may authenticate as a member of ANY of the domains.
      requiredOrganization: process.env.DOORMAN_GITHUB_REQUIRED_ORGANIZATION // short organization name
    },

    // Simple password login, make sure you choose a very secure password.
    // password: {
    //  token: "YOUR-PASSWORD" // any user that knows this can log in
    // },

    // Register a new oauth app on Google Apps at
    // https://code.google.com/apis/console
    google: {
      appId: process.env.DOORMAN_GOOGLE_APPID,
      appSecret: process.env.DOORMAN_GOOGLE_APPSECRET,

      // If uncommented, user must authenticate with an account associated with one of
      // the emails in the list.
      // requiredEmail: ['user1@gmail.com', 'user2@gmail.com'],

      // User must be a member of this domain to successfully authenticate. If an array
      // is listed, user may authenticate as a member of ANY of the domains.
      requiredDomain: process.env.DOORMAN_GOOGLE_REQUIRED_DOMAIN
    }
  }
};
