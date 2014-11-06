module.exports = {
  // port to listen on
  port: 8085,

  proxyTo: {
    host: 'localhost',
    port: 8080
  },

  sessionSecret: 'AeV8Thaieel0Oor6shainu6OUfoh3ohwZaemohC0Ahn3guowieth2eiCkohhohG4', // change me
  sessionCookieMaxAge: 4 * 24 * 60 * 60 * 1000, // milliseconds until session cookie expires (or "false" to not expire)
  // sessionSecureProxy: true, // optional secureProxy to set cookie only over HTTPS, defaut is not set
  // sessionCookieDomain: '.example.com', // optional cookie domain, default is not set

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
      requiredDomain: 'yourdomain.com'
    }
  }
};
