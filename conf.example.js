module.exports = {
  // port to listen on
  port: 8085,

  // URL for OAuth callbacks, default autodetect
  // hostname: 'http://myhostname.example.com',

  proxyTo: {
    host: 'localhost',
    port: 8080
  },

  // Session cookie options, see: https://github.com/expressjs/cookie-session
  sessionCookie: {
    name: '__doorman',
    maxage: 4 * 24 * 60 * 60 * 1000, // milliseconds until expiration (or "false" to not expire)
    secret: 'AeV8Thaieel0Oor6shainu6OUfoh3ohwZaemohC0Ahn3guowieth2eiCkohhohG4' // change me
  },

  // Optionally configure logging. By default logs will be sent to ./log/${NODE_ENV}.log
  // If $NODE_ENV is "development", logs will also be sent to the console.
  // log: {
  //  file: "/path/to/file.log", // false to disable
  //  console: true              // true/false
  // },

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
      appId: 'YOUR-GITHUB-APP-ID',
      appSecret: 'YOUR-GITHUB-APP-SECRET',
      entryPath: '/oauth/github',
      callbackPath: '/oauth/github/callback',

      // List of github email addresses that can authenticate
      // requiredEmail: ['user1@gmail.com', 'user2@yahoo.com'],

      // Only users with this organization name can authenticate. If an array is
      // listed, user may authenticate as a member of ANY of the domains.
      requiredOrganization: 'YOUR-ORGANIZATION-NAME' // short organization name
    },

    // Simple password login, make sure you choose a very secure password.
    // password: {
    //  token: "YOUR-PASSWORD" // any user that knows this can log in
    // },

    // Register a new oauth app on Google Apps at
    // https://code.google.com/apis/console
    google: {
      appId: 'YOUR-GOOGLE-CLIENT-ID',
      appSecret: 'YOUR-GOOGLE-CLIENT-SECRET',

      // If uncommented, user must authenticate with an account associated with one of
      // the emails in the list.
      // requiredEmail: ['user1@gmail.com', 'user2@gmail.com'],

      // User must be a member of this domain to successfully authenticate. If an array
      // is listed, user may authenticate as a member of ANY of the domains.
      requiredDomain: 'yourdomain.com'
    }
  }
};
